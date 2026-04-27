/**
 * /api/ms12/meeting-records — 회의 저장/불러오기(스냅샷)
 */
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { Bindings } from '../types/database'
import { ms12Access } from '../middleware/ms12-access'
import { successResponse, errorResponse } from '../utils/helpers'
import type { AppActor } from '../utils/actor'
import { assertIsRoomParticipant } from '../utils/ms12-room-participant-check'
import { getUserMs12Plan, getMs12Capabilities, type Ms12Plan } from '../utils/ms12-plan'
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
  if (c.get('actor').type === 'guest') {
    return c.json(errorResponse('로그인한 뒤 회의 기록을 조회할 수 있습니다.'), 403)
  }
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
  return c.json(successResponse(rowOut(row)))
})

r.post('/meeting-records', ms12Access, async (c) => {
  const actor = c.get('actor')
  if (actor.type === 'guest') {
    return c.json(errorResponse('서버에 저장하려면 로그인이 필요합니다.'), 403)
  }
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
    if (actor.type === 'user') {
      const plan = await getUserMs12Plan(c, parseInt(actor.id, 10))
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
  if (c.get('actor').type === 'guest') {
    return c.json(errorResponse('로그인한 뒤 기록을 수정할 수 있습니다.'), 403)
  }
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

export default r
