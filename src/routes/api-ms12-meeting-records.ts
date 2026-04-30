/**
 * /api/ms12/meeting-records — 회의 저장/불러오기(스냅샷)
 */
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { Bindings } from '../types/database'
import { ms12Access } from '../middleware/ms12-access'
import { successResponse, errorResponse } from '../utils/helpers'
import { generateTextGeminiOrOpenAI } from '../utils/ai-text-generation'
import type { AppActor } from '../utils/actor'
import { participantKey } from '../utils/actor'
import { assertIsRoomParticipant } from '../utils/ms12-room-participant-check'
import { getMs12Capabilities, type Ms12Plan } from '../utils/ms12-plan'
import type { Ms12Capabilities } from '../lib/ms12-plan'
import { assertRoomOpenForMutations } from '../lib/ms12-room-mutation-guard'

async function requireRoomParticipant(
  c: { env: { DB: D1Database } },
  meetingId: string,
  actor: AppActor
): Promise<void> {
  await assertIsRoomParticipant(c.env.DB, meetingId, actor)
}

type Ctx = { Bindings: Bindings; Variables: { actor: AppActor } }
const r = new Hono<Ctx>()

r.use(async (c, next) => {
  if (c.req.path.split('/').filter(Boolean).pop() === 'health') {
    return next()
  }
  if (!c.env?.DB) {
    return c.json(errorResponse('DB 연결 없음.'), 503)
  }
  return next()
})

const VIS = ['public_internal', 'restricted', 'private_admin'] as const

function nowIso() {
  return new Date().toISOString()
}

function logMs12PlanIf(
  c: { env: { MS12_LOG_PLAN?: string } },
  plan: Ms12Plan,
  cap: Ms12Capabilities,
) {
  const v = c.env?.MS12_LOG_PLAN
  if (v === '1' || (typeof v === 'string' && v.toLowerCase() === 'true')) {
    console.log('[MS12 PLAN]', plan, cap)
  }
}

function randomId(): string {
  const u = new Uint8Array(9)
  crypto.getRandomValues(u)
  return Array.from(u, (b) => b.toString(16).padStart(2, '0')).join('')
}

const CONTEXT_MAX = 14_000

function clipContextMs12(s: string): string {
  const t = (s || '').trim()
  if (t.length <= CONTEXT_MAX) return t
  return t.slice(0, CONTEXT_MAX) + '\n…(이하 잘림)'
}

function aiAvailable(env: Bindings): boolean {
  return !!(env.GEMINI_API_KEY?.trim() || env.OPENAI_API_KEY?.trim())
}

function rowOut(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    roomId: row.room_id,
    title: row.title,
    meetingDate: row.meeting_date,
    category: row.category,
    participantsJson: row.participants_json,
    rawNotes: row.raw_notes,
    transcript: row.transcript,
    finalNotes: row.final_notes,
    summaryBasic: row.summary_basic,
    summaryAction: row.summary_action,
    summaryReport: row.summary_report,
    visibility: row.visibility,
    tags: row.tags,
    projectName: row.project_name,
    budgetRef: row.budget_ref,
    targetGroup: row.target_group,
    createdByKey: row.created_by_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function canReadRecord(row: Record<string, unknown>, byKey: string): boolean {
  if (row.created_by_key === byKey) return true
  if (row.visibility === 'public_internal') return true
  return false
}

r.get('/meeting-records', ms12Access, async (c) => {
  const by = participantKey(c.get('actor'))
  const q = (c.req.query('q') || '').trim()
  const category = (c.req.query('category') || '').trim()
  const tag = (c.req.query('tag') || '').trim()
  const dateFrom = (c.req.query('dateFrom') || '').trim()
  const dateTo = (c.req.query('dateTo') || '').trim()
  const sort = (c.req.query('sort') || 'updated_desc') as string
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '30', 10) || 30))
  const offset = Math.max(0, parseInt(c.req.query('offset') || '0', 10) || 0)
  const conds: string[] = ['(created_by_key = ? OR visibility = ?)']
  const binds: (string | number)[] = [by, 'public_internal']
  if (q) {
    const like = `%${q.replace(/[%_]/g, (x) => '\\' + x)}%`
    conds.push(
      '(title LIKE ? ESCAPE \'\\\' OR IFNULL(raw_notes,"") LIKE ? ESCAPE \'\\\' OR IFNULL(transcript,"") LIKE ? ESCAPE \'\\\' OR IFNULL(summary_basic,"") LIKE ? ESCAPE \'\\\' OR IFNULL(tags,"") LIKE ? ESCAPE \'\\\')',
    )
    binds.push(like, like, like, like, like)
  }
  if (category) {
    conds.push('category = ?')
    binds.push(category)
  }
  if (tag) {
    const like = `%${tag.replace(/[%_]/g, (x) => '\\' + x)}%`
    conds.push('IFNULL(tags,"") LIKE ? ESCAPE \'\\\'')
    binds.push(like)
  }
  if (dateFrom) {
    conds.push('meeting_date >= ?')
    binds.push(dateFrom)
  }
  if (dateTo) {
    conds.push('meeting_date <= ?')
    binds.push(dateTo)
  }
  let orderBy = 'updated_at DESC'
  if (sort === 'date_desc') orderBy = 'meeting_date DESC'
  if (sort === 'date_asc') orderBy = 'meeting_date ASC'
  if (sort === 'title_asc') orderBy = 'title COLLATE NOCASE ASC'
  if (sort === 'category_asc') orderBy = 'category COLLATE NOCASE ASC, meeting_date DESC'
  try {
    const sql = `SELECT * FROM ms12_meeting_records WHERE ${conds.join(' AND ')} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
    binds.push(limit, offset)
    const res = await c.env.DB.prepare(sql)
      .bind(...binds)
      .all()
    const items = (res.results || []).map((x) => rowOut(x as Record<string, unknown>))
    return c.json(successResponse({ items, count: items.length }))
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e)
    if (/no such table/i.test(m)) {
      return c.json(errorResponse('회의 기록 테이블이 없습니다. D1에 0079 마이그레이션을 적용하세요.'), 503)
    }
    console.error('[ms12] meeting-records list', m.slice(0, 200))
    return c.json(errorResponse('목록을 불러올 수 없습니다.'), 500)
  }
})

r.get('/meeting-records/:rid', ms12Access, async (c) => {
  const by = participantKey(c.get('actor'))
  const id = c.req.param('rid')
  if (!/^[a-f0-9]+$/i.test(id)) {
    return c.json(errorResponse('id가 올바르지 않습니다.'), 400)
  }
  const row = await c.env.DB.prepare(`SELECT * FROM ms12_meeting_records WHERE id = ?`)
    .bind(id)
    .first<Record<string, unknown>>()
  if (!row) {
    return c.json(errorResponse('회의를 찾을 수 없습니다.'), 404)
  }
  if (!canReadRecord(row, by)) {
    return c.json(errorResponse('열람 권한이 없습니다.'), 403)
  }
  return c.json(successResponse({ ...rowOut(row), aiAvailable: aiAvailable(c.env) }))
})

r.post('/meeting-records', ms12Access, async (c) => {
  const actor = c.get('actor')
  const by = participantKey(actor)
  let body: Record<string, unknown> = {}
  try {
    body = (await c.req.json()) as Record<string, unknown>
  } catch {
    return c.json(errorResponse('JSON 본문이 필요합니다.'), 400)
  }
  const title = String(body.title || '').trim()
  const meetingDate = String(body.meetingDate || body.meeting_date || '').trim()
  const rawNotes = String(body.rawNotes || body.raw_notes || '').trim()
  if (!title) {
    return c.json(errorResponse('회의 제목이 필요합니다.'), 400)
  }
  if (!meetingDate) {
    return c.json(errorResponse('회의 날짜가 필요합니다.'), 400)
  }
  if (!rawNotes) {
    return c.json(errorResponse('회의 메모(원문)가 필요합니다.'), 400)
  }
  const id = (body.id && String(body.id).trim()) || randomId()
  const t = nowIso()
  const visibility = (() => {
    const v = String(body.visibility || 'public_internal').trim()
    return VIS.includes(v as (typeof VIS)[number]) ? v : 'public_internal'
  })()
  const roomId = body.roomId != null && String(body.roomId).trim() ? String(body.roomId).trim() : null
  const category = String(body.category || '일반').trim() || '일반'
  const row = {
    id,
    room_id: roomId,
    title,
    meeting_date: meetingDate.slice(0, 10),
    category,
    participants_json: body.participantsJson != null ? String(body.participantsJson) : null,
    raw_notes: rawNotes,
    transcript: body.transcript != null ? String(body.transcript) : null,
    final_notes: body.finalNotes != null ? String(body.finalNotes) : null,
    summary_basic: body.summaryBasic != null ? String(body.summaryBasic) : null,
    summary_action: body.summaryAction != null ? String(body.summaryAction) : null,
    summary_report: body.summaryReport != null ? String(body.summaryReport) : null,
    visibility: visibility as (typeof VIS)[number],
    tags: body.tags != null ? String(body.tags) : null,
    project_name: body.projectName != null ? String(body.projectName) : null,
    budget_ref: body.budgetRef != null ? String(body.budgetRef) : null,
    target_group: body.targetGroup != null ? String(body.targetGroup) : null,
    created_by_key: by,
    created_at: t,
    updated_at: t,
  }
  if (roomId) {
    try {
      await requireRoomParticipant(c, roomId, actor)
    } catch (e) {
      if (e instanceof HTTPException) {
        if (e.status === 403) {
          return c.json(errorResponse('연결한 회의방에 입장한 참석자만 저장할 수 있습니다.'), 403)
        }
      }
      throw e
    }
    const roomGuard = await assertRoomOpenForMutations(c, roomId)
    if (roomGuard) return roomGuard
  }
  try {
    const exists = await c.env.DB.prepare(`SELECT 1 AS o FROM ms12_meeting_records WHERE id = ?`)
      .bind(id)
      .first()
    if (exists) {
      return c.json(errorResponse('이미 사용 중인 id 입니다. id를 생략하면 새로 발급됩니다.'), 409)
    }
    const plan: Ms12Plan = 'free'
    const cap = getMs12Capabilities(plan)
    logMs12PlanIf(c, plan, cap)
    if (cap.maxRecords !== Infinity) {
      const cnt = await c.env.DB.prepare(
        `SELECT COUNT(*) AS n FROM ms12_meeting_records WHERE created_by_key = ?`
      )
        .bind(by)
        .first<{ n: number }>()
      if ((cnt?.n ?? 0) >= cap.maxRecords) {
        const old = await c.env.DB.prepare(
          `SELECT id FROM ms12_meeting_records WHERE created_by_key = ? ORDER BY created_at ASC, id ASC LIMIT 1`
        )
          .bind(by)
          .first<{ id: string }>()
        if (old?.id) {
          await c.env.DB.prepare(`DELETE FROM ms12_meeting_records WHERE id = ?`).bind(old.id).run()
        }
      }
    }
    await c.env.DB.prepare(
      `INSERT INTO ms12_meeting_records
      (id, room_id, title, meeting_date, category, participants_json, raw_notes, transcript, final_notes, summary_basic, summary_action, summary_report, visibility, tags, project_name, budget_ref, target_group, created_by_key, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
      .bind(
        row.id,
        row.room_id,
        row.title,
        row.meeting_date,
        row.category,
        row.participants_json,
        row.raw_notes,
        row.transcript,
        row.final_notes,
        row.summary_basic,
        row.summary_action,
        row.summary_report,
        row.visibility,
        row.tags,
        row.project_name,
        row.budget_ref,
        row.target_group,
        row.created_by_key,
        row.created_at,
        row.updated_at,
      )
      .run()
    return c.json(successResponse(rowOut(row as unknown as Record<string, unknown>)))
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e)
    if (/no such table/i.test(m)) {
      return c.json(errorResponse('회의 기록 테이블이 없습니다.'), 503)
    }
    console.error('[ms12] meeting-records post', m.slice(0, 200))
    return c.json(errorResponse('저장에 실패했습니다.'), 500)
  }
})

r.patch('/meeting-records/:rid', ms12Access, async (c) => {
  const by = participantKey(c.get('actor'))
  const id = c.req.param('rid')
  if (!/^[a-f0-9]+$/i.test(id)) {
    return c.json(errorResponse('id가 올바르지 않습니다.'), 400)
  }
  const cur = await c.env.DB.prepare(`SELECT * FROM ms12_meeting_records WHERE id = ?`)
    .bind(id)
    .first<Record<string, unknown>>()
  if (!cur) {
    return c.json(errorResponse('회의를 찾을 수 없습니다.'), 404)
  }
  if (cur.created_by_key !== by) {
    return c.json(errorResponse('수정 권한이 없습니다.'), 403)
  }
  let body: Record<string, unknown> = {}
  try {
    body = (await c.req.json()) as Record<string, unknown>
  } catch {
    return c.json(errorResponse('JSON 본문이 필요합니다.'), 400)
  }
  const t = nowIso()
  const title = body.title != null ? String(body.title).trim() : String(cur.title)
  const meetingDate = body.meetingDate != null ? String(body.meetingDate).trim() : String(cur.meeting_date)
  const category = body.category != null ? String(body.category).trim() : String(cur.category)
  const rawNotes = body.rawNotes != null ? String(body.rawNotes) : String(cur.raw_notes || '')
  if (!title) {
    return c.json(errorResponse('제목이 비어 있습니다.'), 400)
  }
  if (!meetingDate) {
    return c.json(errorResponse('날짜가 비어 있습니다.'), 400)
  }
  if (!rawNotes.trim()) {
    return c.json(errorResponse('회의 메모(원문)가 필요합니다.'), 400)
  }
  const visibility = (() => {
    if (body.visibility == null) return String(cur.visibility)
    const v = String(body.visibility).trim()
    return VIS.includes(v as (typeof VIS)[number]) ? v : String(cur.visibility)
  })()
  const next: Record<string, unknown> = {
    ...cur,
    title,
    meeting_date: meetingDate.slice(0, 10),
    category,
    raw_notes: rawNotes,
    transcript: body.transcript != null ? String(body.transcript) : cur.transcript,
    final_notes: body.finalNotes != null ? String(body.finalNotes) : cur.final_notes,
    summary_basic: body.summaryBasic != null ? String(body.summaryBasic) : cur.summary_basic,
    summary_action: body.summaryAction != null ? String(body.summaryAction) : cur.summary_action,
    summary_report: body.summaryReport != null ? String(body.summaryReport) : cur.summary_report,
    participants_json: body.participantsJson != null ? String(body.participantsJson) : cur.participants_json,
    tags: body.tags != null ? String(body.tags) : cur.tags,
    project_name: body.projectName != null ? String(body.projectName) : cur.project_name,
    budget_ref: body.budgetRef != null ? String(body.budgetRef) : cur.budget_ref,
    target_group: body.targetGroup != null ? String(body.targetGroup) : cur.target_group,
    visibility,
    updated_at: t,
  }
  try {
    await c.env.DB.prepare(
      `UPDATE ms12_meeting_records SET
        title=?, meeting_date=?, category=?, participants_json=?, raw_notes=?, transcript=?, final_notes=?, summary_basic=?, summary_action=?, summary_report=?, visibility=?, tags=?, project_name=?, budget_ref=?, target_group=?, updated_at=?
        WHERE id=?`
    )
      .bind(
        next.title,
        next.meeting_date,
        next.category,
        next.participants_json,
        next.raw_notes,
        next.transcript,
        next.final_notes,
        next.summary_basic,
        next.summary_action,
        next.summary_report,
        next.visibility,
        next.tags,
        next.project_name,
        next.budget_ref,
        next.target_group,
        next.updated_at,
        id,
      )
      .run()
    const fresh = await c.env.DB.prepare(`SELECT * FROM ms12_meeting_records WHERE id = ?`)
      .bind(id)
      .first<Record<string, unknown>>()
    return c.json(successResponse(rowOut(fresh!)))
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e)
    if (/no such table/i.test(m)) {
      return c.json(errorResponse('회의 기록 테이블이 없습니다.'), 503)
    }
    return c.json(errorResponse('갱신에 실패했습니다.'), 500)
  }
})

/** 회의 기록 상세 화면용 — 전체 요약 3종 생성 (저장본 소유자만) */
r.post('/meeting-records/:rid/ai-summaries', ms12Access, async (c) => {
  const by = participantKey(c.get('actor'))
  const id = c.req.param('rid')
  if (!/^[a-f0-9]+$/i.test(id)) {
    return c.json(errorResponse('id가 올바르지 않습니다.'), 400)
  }
  if (!aiAvailable(c.env)) {
    return c.json(errorResponse('AI 키가 설정되어 있지 않습니다.'), 503)
  }
  const row = await c.env.DB.prepare(`SELECT * FROM ms12_meeting_records WHERE id = ?`)
    .bind(id)
    .first<Record<string, unknown>>()
  if (!row) {
    return c.json(errorResponse('회의를 찾을 수 없습니다.'), 404)
  }
  if (String(row.created_by_key) !== by) {
    return c.json(errorResponse('생성 권한이 없습니다.'), 403)
  }
  const notes = clipContextMs12(String(row.raw_notes || ''))
  const transcript = clipContextMs12(String(row.transcript || ''))
  if (!notes.trim() && !transcript.trim()) {
    return c.json(errorResponse('메모·회의록 내용이 비어 있습니다.'), 400)
  }
  const prevBasic = String(row.summary_basic || '').trim()
  const prevAction = String(row.summary_action || '').trim()
  const prevReport = String(row.summary_report || '').trim()
  const prev = [prevBasic, prevAction, prevReport].filter(Boolean)
  const block = [
    notes && `## 현재 메모\n${notes}`,
    transcript && `## 회의록 내용\n${transcript}`,
    prev.length ? `## 이전에 적어 둔 요약(참고·갱신)\n${prev.join('\n---\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
  const system = `You are a Korean meeting assistant. Read the input and output ONLY a single JSON object with exactly these string keys, no markdown fences:
{"summaryBasic":"(핵심 3~6문장, 전체 흐름)","summaryAction":"(할 일·책임·일정이 드러나면 불릿, 없으면 항목 1~3개 '검토 필요' 등)","summaryReport":"(기관·대외 보고 톤, 성과·과제 3~5문장)"}
If information is missing, use short placeholders like [미정] in Korean. Be concise.`
  try {
    const raw = await generateTextGeminiOrOpenAI(c.env, block, system)
    const t = raw.trim()
    const m = t.match(/\{[\s\S]*\}/)
    const j = m ? (JSON.parse(m[0]) as Record<string, unknown>) : null
    if (j && typeof j.summaryBasic === 'string') {
      return c.json(
        successResponse({
          summaryBasic: String(j.summaryBasic).trim(),
          summaryAction: String(j.summaryAction != null ? j.summaryAction : '').trim(),
          summaryReport: String(j.summaryReport != null ? j.summaryReport : '').trim(),
          source: 'json',
        }),
      )
    }
    return c.json(
      successResponse({
        summaryBasic: t.slice(0, 2000),
        summaryAction: '',
        summaryReport: '',
        source: 'fallback',
      }),
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === 'NO_AI_KEY') {
      return c.json(errorResponse('AI 키가 없습니다. GEMINI_API_KEY 또는 OPENAI_API_KEY를 설정하세요.'), 503)
    }
    console.error('[ms12] meeting-records ai-summaries', msg.slice(0, 200))
    return c.json(errorResponse('AI 요약을 만들지 못했습니다.'), 502)
  }
})

/** 보고서 초안 — 7개 절 상위 JSON (저장본 소유자만) */
r.post('/meeting-records/:rid/ai-report-sections', ms12Access, async (c) => {
  const by = participantKey(c.get('actor'))
  const id = c.req.param('rid')
  if (!/^[a-f0-9]+$/i.test(id)) {
    return c.json(errorResponse('id가 올바르지 않습니다.'), 400)
  }
  if (!aiAvailable(c.env)) {
    return c.json(errorResponse('AI 키가 설정되어 있지 않습니다.'), 503)
  }
  const row = await c.env.DB.prepare(`SELECT * FROM ms12_meeting_records WHERE id = ?`)
    .bind(id)
    .first<Record<string, unknown>>()
  if (!row) {
    return c.json(errorResponse('회의를 찾을 수 없습니다.'), 404)
  }
  if (String(row.created_by_key) !== by) {
    return c.json(errorResponse('생성 권한이 없습니다.'), 403)
  }
  const notes = clipContextMs12(String(row.raw_notes || ''))
  const transcript = clipContextMs12(String(row.transcript || ''))
  const sb = clipContextMs12(String(row.summary_basic || ''))
  const sa = clipContextMs12(String(row.summary_action || ''))
  const sr = clipContextMs12(String(row.summary_report || ''))
  if (![notes, transcript, sb, sa, sr].some((x) => x.trim().length > 0)) {
    return c.json(errorResponse('메모·회의록 내용·요약 중 최소 하나를 채운 뒤 생성해 주세요.'), 400)
  }
  const block = [
    notes && `## 회의 메모\n${notes}`,
    transcript && `## 회의록 내용\n${transcript}`,
    sb && `## 기본 요약\n${sb}`,
    sa && `## 실행 요약\n${sa}`,
    sr && `## 보고 요약\n${sr}`,
  ]
    .filter(Boolean)
    .join('\n\n')
  const system = `당신은 기관 회의 보고서 작성 보조입니다. 입력만 근거로 한국어 보고서 초안을 작성합니다.
출력은 반드시 다음 키만 가진 단일 JSON 객체이며, 마크다운 코드 펜스 없이 순수 JSON만 출력합니다:
{"overview":"","purpose":"","discussion":"","decisions":"","execution":"","schedule":"","conclusion":""}
각 값은 해당 제목의 본문(① 회의 개요 ~ ⑦ 종합 의견에 대응). 근거 없는 사실은 추측하지 말고 [확인 필요]로 표시하세요.`

  try {
    const raw = await generateTextGeminiOrOpenAI(c.env, block, system)
    const t = raw.trim()
    const m = t.match(/\{[\s\S]*\}/)
    const j = m ? (JSON.parse(m[0]) as Record<string, unknown>) : null
    const keys = ['overview', 'purpose', 'discussion', 'decisions', 'execution', 'schedule', 'conclusion'] as const
    const out: Record<string, string> = {}
    for (const k of keys) {
      out[k] = ''
    }
    if (j) {
      for (const k of keys) {
        const v = j[k]
        out[k] = typeof v === 'string' ? v.trim() : ''
      }
    }
    return c.json(successResponse({ sections: out, source: j ? 'json' : 'empty' }))
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === 'NO_AI_KEY') {
      return c.json(errorResponse('AI 키가 없습니다. GEMINI_API_KEY 또는 OPENAI_API_KEY를 설정하세요.'), 503)
    }
    console.error('[ms12] meeting-records ai-report-sections', msg.slice(0, 200))
    return c.json(errorResponse('보고서 초안을 만들지 못했습니다.'), 502)
  }
})

export default r
