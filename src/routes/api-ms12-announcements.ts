/**
 * /api/ms12/announcements* — 구조화 공고 자산, 검색, 회의·제안서 연계
 */
import { Hono } from 'hono'
import { Bindings } from '../types/database'
import { ms12Access } from '../middleware/ms12-access'
import { successResponse, errorResponse } from '../utils/helpers'
import type { AppActor } from '../utils/actor'
import { assertIsRoomParticipant } from '../utils/ms12-room-participant-check'
import { generateTextGeminiOrOpenAI } from '../utils/ai-text-generation'

type Ctx = { Bindings: Bindings; Variables: { actor: AppActor } }
const a = new Hono<Ctx>()

const SOURCES = ['mohw', 'moe', 'mogef', 'chest', 'lottery', 'other'] as const
type Source = (typeof SOURCES)[number]

a.use(async (c, next) => {
  if (!c.env?.DB) {
    return c.json(errorResponse('DB 연결 없음. D1 바인딩을 확인하세요.'), 503)
  }
  return next()
})

function nowIso() {
  return new Date().toISOString()
}

const CODE_ALPH = 'abcdef0123456789'
function randomAnnId() {
  const u = new Uint8Array(9)
  crypto.getRandomValues(u)
  return 'an' + Array.from(u, (b) => b.toString(16).padStart(2, '0')).join('')
}

function rowOut(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    title: row.title,
    organization: row.organization,
    budgetMaxWon: row.budget_max_won,
    budgetNote: row.budget_note,
    supportAmount: row.support_amount,
    targetAudience: row.target_audience,
    deadline: row.deadline,
    region: row.region,
    category: row.category,
    keywords: row.keywords,
    sourceUrl: row.source_url,
    source: row.source,
    rawExcerpt: row.raw_excerpt,
    bodyText: row.body_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function requireRoomParticipant(
  c: { env: { DB: D1Database } },
  meetingId: string,
  actor: AppActor
): Promise<void> {
  await assertIsRoomParticipant(c.env.DB, meetingId, actor)
}

/** 구조화 목록 + 필터 */
a.get('/announcements/collect/status', ms12Access, (c) =>
  c.json(
    successResponse({
      message:
        '수집은 API·RSS·허용된 크롤 중 선택합니다. 배치/워크플로에서 /announcements/ingest 로 구조화하세요. 이 엔드포인트는 경로·정책만 안내합니다.',
      sources: [...SOURCES],
    })
  )
)

a.get('/announcements', ms12Access, async (c) => {
  const q = (c.req.query('q') || '').trim()
  const source = (c.req.query('source') || '').trim() as Source
  const region = (c.req.query('region') || '').trim()
  const category = (c.req.query('category') || '').trim()
  const budgetMaxWon = c.req.query('budgetMaxWon') ? parseInt(c.req.query('budgetMaxWon') || '', 10) : null
  const deadlineBefore = (c.req.query('deadlineBefore') || '').trim()
  const deadlineAfter = (c.req.query('deadlineAfter') || '').trim()
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '30', 10) || 30))
  const offset = Math.max(0, parseInt(c.req.query('offset') || '0', 10) || 0)
  const conds: string[] = ['1=1']
  const binds: (string | number)[] = []
  if (q) {
    const like = `%${q.replace(/[%_]/g, (m) => '\\' + m)}%`
    conds.push(
      `(title LIKE ? ESCAPE '\\' OR IFNULL(organization,"") LIKE ? ESCAPE '\\' OR IFNULL(keywords,"") LIKE ? ESCAPE '\\' OR IFNULL(target_audience,"") LIKE ? ESCAPE '\\' OR IFNULL(raw_excerpt,"") LIKE ? ESCAPE '\\' OR IFNULL(region,"") LIKE ? ESCAPE '\\' OR IFNULL(category,"") LIKE ? ESCAPE '\\')`
    )
    for (let i = 0; i < 7; i++) binds.push(like)
  }
  if (source && SOURCES.includes(source as Source)) {
    conds.push('source = ?')
    binds.push(source)
  }
  if (region) {
    const like = `%${region.replace(/[%_]/g, (m) => '\\' + m)}%`
    conds.push('IFNULL(region,"") LIKE ? ESCAPE \'\\\'')
    binds.push(like)
  }
  if (category) {
    const like = `%${category.replace(/[%_]/g, (m) => '\\' + m)}%`
    conds.push('IFNULL(category,"") LIKE ? ESCAPE \'\\\'')
    binds.push(like)
  }
  if (budgetMaxWon != null && !Number.isNaN(budgetMaxWon)) {
    conds.push('(budget_max_won IS NULL OR budget_max_won <= ?)')
    binds.push(budgetMaxWon)
  }
  if (deadlineAfter) {
    conds.push('(deadline IS NULL OR date(deadline) >= date(?))')
    binds.push(deadlineAfter.slice(0, 10))
  }
  if (deadlineBefore) {
    conds.push('(deadline IS NULL OR date(deadline) <= date(?))')
    binds.push(deadlineBefore.slice(0, 10))
  }
  const order = (c.req.query('sort') || 'deadline_asc') === 'updated_desc' ? 'updated_at DESC' : 'date(deadline) ASC, updated_at DESC'
  const sql = `SELECT * FROM ms12_announcements WHERE ${conds.join(' AND ')} ORDER BY ${order} LIMIT ? OFFSET ?`
  binds.push(limit, offset)
  try {
    const res = await c.env.DB.prepare(sql)
      .bind(...binds)
      .all()
    const list = (res.results || []).map((r) => rowOut(r as Record<string, unknown>))
    return c.json(successResponse({ items: list, count: list.length }))
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e)
    if (/no such table/i.test(m)) {
      return c.json(errorResponse('공고 테이블이 없습니다. D1 마이그레이션 0081을 적용하세요.'), 503)
    }
    console.error('[ms12] announcements list', m.slice(0, 200))
    return c.json(errorResponse('목록을 불러올 수 없습니다.'), 500)
  }
})

a.get('/announcements/:aid', ms12Access, async (c) => {
  const id = c.req.param('aid')
  if (!id) {
    return c.json(errorResponse('id가 없습니다.'), 400)
  }
  try {
    const row = await c.env.DB.prepare(`SELECT * FROM ms12_announcements WHERE id = ?`)
      .bind(id)
      .first<Record<string, unknown>>()
    if (!row) {
      return c.json(errorResponse('공고를 찾을 수 없습니다.'), 404)
    }
    return c.json(successResponse(rowOut(row)))
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e)
    if (/no such table/i.test(m)) {
      return c.json(errorResponse('공고 테이블이 없습니다.'), 503)
    }
    return c.json(errorResponse('불러오지 못했습니다.'), 500)
  }
})

/** 수집기·배치가 넣는 구조화 upsert(배치) */
a.post('/announcements/ingest', ms12Access, async (c) => {
  let body: { items?: Array<Record<string, unknown>> } = {}
  try {
    body = (await c.req.json()) as typeof body
  } catch {
    return c.json(errorResponse('JSON이 필요합니다.'), 400)
  }
  const items = Array.isArray(body.items) ? body.items : []
  if (items.length === 0) {
    return c.json(errorResponse('items가 비어 있습니다.'), 400)
  }
  if (items.length > 80) {
    return c.json(errorResponse('한 번에 80건 이하만 허용됩니다.'), 400)
  }
  const t = nowIso()
  let n = 0
  for (const it of items) {
    const id = it.id != null && String(it.id).trim() ? String(it.id).trim() : randomAnnId()
    const title = String(it.title || '').trim()
    const sourceUrl = String(it.sourceUrl || it.source_url || '').trim()
    const source0 = String(it.source || 'other').trim()
    if (!title || !sourceUrl) continue
    const source: Source = SOURCES.includes(source0 as Source) ? (source0 as Source) : 'other'
    const org = String(it.organization || '').trim()
    const budgetMax =
      it.budgetMaxWon != null && it.budgetMaxWon !== ''
        ? parseInt(String(it.budgetMaxWon), 10)
        : it.budget_max_won != null
          ? parseInt(String(it.budget_max_won), 10)
          : null
    await c.env.DB
      .prepare(
        `INSERT INTO ms12_announcements
        (id, title, organization, budget_max_won, budget_note, support_amount, target_audience, deadline, region, category, keywords, source_url, source, raw_excerpt, body_text, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET
          title=excluded.title,
          organization=excluded.organization,
          budget_max_won=excluded.budget_max_won,
          budget_note=excluded.budget_note,
          support_amount=excluded.support_amount,
          target_audience=excluded.target_audience,
          deadline=excluded.deadline,
          region=excluded.region,
          category=excluded.category,
          keywords=excluded.keywords,
          source_url=excluded.source_url,
          source=excluded.source,
          raw_excerpt=excluded.raw_excerpt,
          body_text=excluded.body_text,
          updated_at=excluded.updated_at`
      )
      .bind(
        id,
        title,
        org,
        Number.isNaN(budgetMax as number) ? null : budgetMax,
        it.budgetNote != null ? String(it.budgetNote) : it.budget_note != null ? String(it.budget_note) : null,
        it.supportAmount != null ? String(it.supportAmount) : it.support_amount != null ? String(it.support_amount) : null,
        it.targetAudience != null
          ? String(it.targetAudience)
          : it.target_audience != null
            ? String(it.target_audience)
            : null,
        it.deadline != null ? String(it.deadline).slice(0, 10) : null,
        it.region != null ? String(it.region) : null,
        it.category != null ? String(it.category) : null,
        it.keywords != null ? String(it.keywords) : null,
        sourceUrl,
        source,
        it.rawExcerpt != null ? String(it.rawExcerpt) : it.raw_excerpt != null ? String(it.raw_excerpt) : null,
        it.bodyText != null ? String(it.bodyText) : it.body_text != null ? String(it.body_text) : null,
        t,
        t
      )
      .run()
    n++
  }
  return c.json(successResponse({ ingested: n }))
})

/** 자연어 → JSON 필터(휴리스틱 + 선택적 AI) */
a.post('/announcements/parse-query', ms12Access, async (c) => {
  let body: { question?: string; useAi?: boolean } = {}
  try {
    body = (await c.req.json()) as typeof body
  } catch {
    return c.json(errorResponse('JSON이 필요합니다.'), 400)
  }
  const q0 = String(body.question || '').trim()
  if (!q0) {
    return c.json(errorResponse('question을 입력하세요.'), 400)
  }
  const heur = parseNlHeuristic(q0)
  if (!body.useAi) {
    return c.json(successResponse({ filters: heur, source: 'heuristic' as const }))
  }
  const system = `You extract search filters for Korean public grant/announcement listings. Output ONLY a compact JSON object with any of these keys (omit if unknown):
{"q":"string keyword","source":"mohw|moe|mogef|chest|lottery|other","region":"string","category":"string","budgetMaxWon":number or null}
Example: "예산 1천만원 이하" => budgetMaxWon: 10000000. No explanation.`
  try {
    const raw = await generateTextGeminiOrOpenAI(c.env, `질의: ${q0}`, system)
    const m = raw.match(/\{[\s\S]*\}/)
    if (m) {
      const j = JSON.parse(m[0]) as Record<string, unknown>
      return c.json(
        successResponse({
          filters: { ...heur, ...normalizeAiFilters(j) },
          source: 'ai' as const,
        })
      )
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === 'NO_AI_KEY') {
      return c.json(successResponse({ filters: heur, source: 'heuristic' as const, note: 'NO_AI_KEY' }))
    }
  }
  return c.json(successResponse({ filters: heur, source: 'heuristic' as const }))
})

function parseNlHeuristic(s: string): Record<string, unknown> {
  const out: Record<string, unknown> = { q: s }
  const mm = s.match(/(\d+)\s*천만/)
  if (mm) {
    out.budgetMaxWon = parseInt(mm[1]!, 10) * 10_000_000
  }
  const m2 = s.match(/(\d+)\s*억/)
  if (m2 && out.budgetMaxWon == null) {
    out.budgetMaxWon = parseInt(m2[1]!, 10) * 100_000_000
  }
  if (/광주/.test(s)) out.region = '광주'
  if (/서울/.test(s)) out.region = '서울'
  if (/부산/.test(s)) out.region = '부산'
  if (/초등/.test(s) || /초등학생/.test(s)) {
    out.q = '초등 ' + s
  }
  return out
}

function normalizeAiFilters(j: Record<string, unknown>) {
  const o: Record<string, unknown> = {}
  if (typeof j.q === 'string') o.q = j.q
  if (typeof j.region === 'string') o.region = j.region
  if (typeof j.category === 'string') o.category = j.category
  if (typeof j.source === 'string' && SOURCES.includes(j.source as Source)) o.source = j.source
  if (j.budgetMaxWon != null && !Number.isNaN(Number(j.budgetMaxWon))) o.budgetMaxWon = Number(j.budgetMaxWon)
  return o
}

/** 제안서 초안: 공고 + (선택) 회의·기록·문서 */
a.post('/announcements/:aid/proposal-draft', ms12Access, async (c) => {
  const actor = c.get('actor')
  const annId = c.req.param('aid')
  const row = await c.env.DB.prepare(`SELECT * FROM ms12_announcements WHERE id = ?`)
    .bind(annId)
    .first<Record<string, unknown>>()
  if (!row) {
    return c.json(errorResponse('공고를 찾을 수 없습니다.'), 404)
  }
  let body: {
    roomId?: string
    meetingRecordId?: string
    documentIds?: number[]
    extraNotes?: string
  } = {}
  try {
    body = (await c.req.json()) as typeof body
  } catch {
    body = {}
  }
  const parts: string[] = []
  parts.push(
    '## 선정한 공고\n' +
      [
        `사업명: ${row.title}`,
        `기관: ${row.organization}`,
        `예산(상한): ${row.budget_max_won != null ? String(row.budget_max_won) + '원' : '—'}`,
        `지원·예산 설명: ${row.budget_note || ''} / ${row.support_amount || ''}`,
        `대상: ${row.target_audience || '—'}`,
        `지역: ${row.region || '—'}`,
        `마감: ${row.deadline || '—'}`,
        `유형: ${row.category || '—'}`,
        `원문: ${row.source_url}`,
        row.raw_excerpt ? `요약: ${row.raw_excerpt}` : '',
      ]
        .filter(Boolean)
        .join('\n')
  )
  if (body.extraNotes) {
    parts.push('## 추가 메모(사용자)\n' + String(body.extraNotes).slice(0, 12000))
  }
  if (body.roomId) {
    const meetingId = String(body.roomId)
    await requireRoomParticipant(c, meetingId, actor)
    const room = await c.env.DB.prepare(
      `SELECT id, title, meeting_code, linked_announcement_id FROM ms12_rooms WHERE id = ?`
    )
      .bind(meetingId)
      .first<Record<string, unknown>>()
    if (room) {
      parts.push(`## 연결된 회의\n제목: ${room.title} · 코드: ${room.meeting_code}`)
    }
    const ar = await c.env.DB.prepare(
      `SELECT id, title, task_detail, assignee, due_at, status
       FROM ms12_action_items WHERE meeting_id = ? AND status = 'open' ORDER BY id DESC LIMIT 30`
    )
      .bind(meetingId)
      .all()
    const ai = (ar.results || []) as Array<Record<string, unknown>>
    if (ai.length) {
      parts.push(
        '## 실행 항목(진행 중)\n' +
          ai
            .map(
              (x) =>
                `- ${x.title} · 담당 ${x.assignee || '—'} · 기한 ${x.due_at || '—'}` +
                (x.task_detail ? ` (${String(x.task_detail).slice(0, 200)})` : '')
            )
            .join('\n')
      )
    }
  }
  if (body.meetingRecordId) {
    const rec = await c.env.DB.prepare(`SELECT * FROM ms12_meeting_records WHERE id = ?`)
      .bind(String(body.meetingRecordId))
      .first<Record<string, unknown>>()
    if (rec && rec.created_by_key === participantKey(actor)) {
      parts.push(
        '## 저장된 회의 기록(스냅샷)\n' +
          [rec.raw_notes, rec.transcript, rec.summary_basic, rec.summary_action, rec.summary_report]
            .map((x) => (x != null ? String(x) : ''))
            .filter(Boolean)
            .join('\n\n')
            .slice(0, 14000)
      )
    }
  }
  if (body.documentIds && body.documentIds.length) {
    const by = participantKey(actor)
    const idList = body.documentIds.filter((n) => n > 0).slice(0, 8)
    for (const did of idList) {
      const doc = await c.env.DB.prepare(
        `SELECT id, title, doc_type, outcome_summary, body_excerpt, keywords, created_by_key FROM ms12_document_assets WHERE id = ?`
      )
        .bind(did)
        .first<Record<string, unknown>>()
      if (doc && doc.created_by_key === by) {
        parts.push(
          `## 내부 문서 #${did}\n제목: ${doc.title} · ${doc.doc_type || ''}\n` +
            [doc.outcome_summary, doc.body_excerpt, doc.keywords]
              .map((x) => (x != null ? String(x) : ''))
              .filter(Boolean)
              .join(' · ')
              .slice(0, 4000)
        )
      }
    }
  }
  const user = parts.join('\n\n')
  if (!user.trim()) {
    return c.json(errorResponse('초안에 쓸 맥락이 없습니다.'), 400)
  }
  const system = `한국어로 기관·사회복지·교육 공모의 제안서 초안을 마크다운으로 작성하세요. 표준에 가깝게 (개요, 필요성, 사업 내용, 기대효과, 일정) 구성하되, 제공되지 않은 수치·실적은 [확인 필요]로 표기하세요.`
  try {
    const draft = await generateTextGeminiOrOpenAI(c.env, user, system)
    return c.json(successResponse({ announcementId: annId, draft: draft.trim() }))
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === 'NO_AI_KEY') {
      return c.json(
        errorResponse('AI 키가 없습니다. GEMINI_API_KEY 또는 OPENAI_API_KEY를 설정하세요.'),
        503
      )
    }
    return c.json(errorResponse('초안 생성에 실패했습니다.'), 502)
  }
})

export default a
