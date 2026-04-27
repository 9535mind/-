/**
 * /api/ms12/* — MS12 회의방 (ms12_rooms, ms12_room_participants)
 * AUTH_MODE=optional 일 때 guest actor + ms12_guest 쿠키, required 일 때만 로그인 강제
 */
import { Context, Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { Bindings } from '../types/database'
import { ms12Access } from '../middleware/ms12-access'
import { FOOTER_HTML_REVISION } from '../utils/site-footer-legal'
import { successResponse, errorResponse, getCurrentUser } from '../utils/helpers'
import type { AppActor } from '../utils/actor'
import { participantKey } from '../utils/actor'
import { assertIsRoomParticipant } from '../utils/ms12-room-participant-check'
import { getAuthMode } from '../utils/auth-mode'
import { generateTextGeminiOrOpenAI } from '../utils/ai-text-generation'
import { getUserMs12Plan, getMs12Capabilities, type Ms12Plan } from '../utils/ms12-plan'
import type { Ms12Capabilities } from '../lib/ms12-plan'
import { assertRoomOpenForMutations } from '../lib/ms12-room-mutation-guard'

type Ctx = Context<{ Bindings: Bindings; Variables: { actor: AppActor } }>

const api = new Hono<{ Bindings: Bindings; Variables: { actor: AppActor } }>()

api.use(async (c, next) => {
  const p = c.req.path
  const segs = p.split('/').filter(Boolean)
  if (segs[segs.length - 1] === 'health') {
    return next()
  }
  if (!c.env?.DB) {
    // 대시보드 읽기 전용: D1 미바인딩·엣지 이슈에도 503(서버다운 느낌) 대신 빈 목록(200)
    const pathOnly = (p || '').split('?')[0] || p
    if (c.req.method === 'GET' && pathOnly.includes('open-action-items')) {
      return c.json(successResponse({ items: [] as unknown[] }))
    }
    return c.json(
      errorResponse(
        'DB 연결 없음. Cloudflare Pages → ms12 → Settings → D1 `DB` → ms12-production 바인딩을 확인하세요.',
      ),
      503,
    )
  }
  return next()
})

const CODE_ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomId(): string {
  const u = new Uint8Array(9)
  crypto.getRandomValues(u)
  return Array.from(u, (b) => b.toString(16).padStart(2, '0')).join('')
}

function randomMeetingCode(len: number): string {
  const u = new Uint8Array(len)
  crypto.getRandomValues(u)
  let s = ''
  for (let i = 0; i < len; i++) {
    s += CODE_ALPH[u[i]! % CODE_ALPH.length]
  }
  return s
}

function nowIso(): string {
  return new Date().toISOString()
}

function ms12LogPlanEnabled(c: Ctx): boolean {
  const v = c.env?.MS12_LOG_PLAN
  return v === '1' || (typeof v === 'string' && v.toLowerCase() === 'true')
}

function logMs12PlanIf(c: Ctx, plan: Ms12Plan, cap: Ms12Capabilities) {
  if (ms12LogPlanEnabled(c)) {
    console.log('[MS12 PLAN]', plan, cap)
  }
}

/** 보고서·AI 요약·콘텐츠 초안 — Pro 전용(무료는 수동 메모·기본 저장) */
async function requireProPlan(c: Ctx, actor: AppActor) {
  if (actor.type !== 'user') {
    return c.json(errorResponse('이 기능을 사용하려면 로그인이 필요합니다.'), 403)
  }
  const plan: Ms12Plan = await getUserMs12Plan(c, parseInt(actor.id, 10))
  const cap = getMs12Capabilities(plan)
  if (!cap.canUseAI) {
    return c.json(errorResponse('Pro 플랜에서 이용할 수 있는 기능입니다.'), 403)
  }
  return null
}

function userDisplayNameRow(u: { name?: string | null; email?: string | null }): string {
  const n = (u.name || '').trim()
  if (n) return n
  const e = (u.email || '').trim()
  if (e) return e.split('@')[0] || e
  return '사용자'
}

async function displayNameFor(actor: AppActor, body: { displayName?: string }, c: Ctx): Promise<string> {
  if (actor.type === 'user') {
    const u = await getCurrentUser(c)
    return u ? userDisplayNameRow(u) : '사용자'
  }
  return String(body.displayName || '').trim() || '게스트'
}

async function requireRoomParticipant(
  c: { env: { DB: D1Database } },
  meetingId: string,
  actor: AppActor
): Promise<void> {
  await assertIsRoomParticipant(c.env.DB, meetingId, actor)
}

/** 내가 참가한 회의의 미완료(open) 실행 항목 — 시작 화면 대시보드용 */
api.get('/my/open-action-items', ms12Access, async (c) => {
  const actor = c.get('actor')
  if (actor.type !== 'user') {
    return c.json(successResponse({ items: [] as unknown[] }))
  }
  const k = participantKey(actor)
  const limit = Math.min(40, Math.max(1, parseInt(c.req.query('limit') || '20', 10) || 20))
  try {
    const res = await c.env.DB.prepare(
      `SELECT ai.id, ai.meeting_id, ai.title, ai.assignee, ai.due_at, ai.status,
              r.title AS room_title, r.meeting_code AS room_code
       FROM ms12_action_items ai
       INNER JOIN ms12_room_participants p
         ON p.meeting_id = ai.meeting_id AND p.participant_key = ? AND p.left_at IS NULL
       INNER JOIN ms12_rooms r ON r.id = ai.meeting_id
       WHERE ai.status = 'open'
       ORDER BY (ai.due_at IS NULL), ai.due_at ASC, ai.id DESC
       LIMIT ?`
    )
      .bind(k, limit)
      .all()
    const items = (res.results || []).map((row: Record<string, unknown>) => ({
      id: row.id,
      meetingId: String(row.meeting_id),
      title: row.title,
      assignee: row.assignee,
      dueAt: row.due_at,
      status: row.status,
      roomTitle: row.room_title,
      roomCode: row.room_code,
    }))
    return c.json(successResponse({ items }))
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e)
    if (/no such table|no such column/i.test(m)) {
      return c.json(
        successResponse({ items: [] as unknown[] }),
      )
    }
    console.error('[ms12] my/open-action-items', m.slice(0, 200))
    return c.json(errorResponse('목록을 불러올 수 없습니다.'), 500)
  }
})

api.get('/health', (c) =>
  c.json({
    ok: true,
    product: 'ms12',
    authMode: getAuthMode(c),
    buildRef: FOOTER_HTML_REVISION,
    ts: new Date().toISOString(),
  })
)

api.get('/meetings/my', ms12Access, async (c) => {
  const actor = c.get('actor')
  const k = participantKey(actor)
  const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20', 10) || 20))
  let list: Array<Record<string, unknown> & { id: string }> = []
  try {
    const rows = await c.env.DB.prepare(
      `SELECT
      r.id, r.title, r.host_user_id, r.host_guest_id, r.host_actor_type,
      r.meeting_code, r.status, r.created_at, r.updated_at,
      p.role AS my_role, p.joined_at AS my_joined_at
    FROM ms12_rooms r
    INNER JOIN ms12_room_participants p ON p.meeting_id = r.id
    WHERE p.participant_key = ?
    ORDER BY r.updated_at DESC
    LIMIT ?`
    )
      .bind(k, limit)
      .all()
    list = (rows.results || []).map((row: Record<string, unknown>) => ({
      id: String(row.id),
      title: row.title,
      hostUserId: row.host_user_id,
      hostGuestId: row.host_guest_id,
      hostActorType: row.host_actor_type,
      meetingCode: row.meeting_code,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      myRole: row.my_role,
      myJoinedAt: row.my_joined_at,
    }))
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e)
    console.error('[ms12] meetings/my', m.slice(0, 300))
    list = []
  }
  return c.json(successResponse(list))
})

api.get('/meetings/:id/participants', ms12Access, async (c) => {
  const actor = c.get('actor')
  const meetingId = c.req.param('id')
  await requireRoomParticipant(c, meetingId, actor)
  const rows = await c.env.DB.prepare(
    `SELECT
      p.user_id, p.guest_id, p.display_name, p.role, p.joined_at, p.left_at, p.attendance_status, p.participant_key
     FROM ms12_room_participants p
     WHERE p.meeting_id = ?
     ORDER BY
       CASE WHEN p.role = 'host' THEN 0 ELSE 1 END,
       p.joined_at ASC`
  )
    .bind(meetingId)
    .all()
  const list = (rows.results || []).map((row: Record<string, unknown>) => ({
    userId: row.user_id,
    guestId: row.guest_id,
    displayName: row.display_name,
    role: row.role,
    joinedAt: row.joined_at,
    leftAt: row.left_at,
    attendanceStatus: row.attendance_status,
    isPresent: row.left_at == null,
  }))
  return c.json(
    successResponse({ meetingId, participants: list, count: list.filter((p) => p.isPresent).length })
  )
})

api.get('/meetings/:id', ms12Access, async (c) => {
  const actor = c.get('actor')
  const meetingId = c.req.param('id')
  await requireRoomParticipant(c, meetingId, actor)
  const selWithFree = `SELECT r.id, r.host_actor_type, r.host_user_id, r.host_guest_id, r.title, r.meeting_code, r.status, r.created_at, r.updated_at,
            r.free_end_at, r.linked_announcement_id, a.title AS ann_title, a.source_url AS ann_source_url, a.organization AS ann_organization
     FROM ms12_rooms r
     LEFT JOIN ms12_announcements a ON a.id = r.linked_announcement_id
     WHERE r.id = ?`
  const selNoFree = `SELECT r.id, r.host_actor_type, r.host_user_id, r.host_guest_id, r.title, r.meeting_code, r.status, r.created_at, r.updated_at,
            r.linked_announcement_id, a.title AS ann_title, a.source_url AS ann_source_url, a.organization AS ann_organization
     FROM ms12_rooms r
     LEFT JOIN ms12_announcements a ON a.id = r.linked_announcement_id
     WHERE r.id = ?`
  let r: Record<string, unknown> | null = null
  try {
    r = await c.env.DB.prepare(selWithFree).bind(meetingId).first<Record<string, unknown>>()
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e)
    if (!/no such column[:\s].*free_end_at|SQLITE_ERROR.*\bfree_end_at/i.test(m)) {
      throw e
    }
    r = await c.env.DB.prepare(selNoFree).bind(meetingId).first<Record<string, unknown>>()
  }
  if (!r) {
    return c.json(errorResponse('회의를 찾을 수 없습니다.'), 404)
  }
  let statusOut = String(r.status || 'open')
  const freeEndRaw = r.free_end_at != null ? String(r.free_end_at) : ''
  if (freeEndRaw && statusOut === 'open') {
    const endMs = Date.parse(freeEndRaw)
    if (!Number.isNaN(endMs) && Date.now() > endMs) {
      const t2 = nowIso()
      await c.env.DB.prepare(`UPDATE ms12_rooms SET status = 'ended', updated_at = ? WHERE id = ? AND status = 'open'`)
        .bind(t2, meetingId)
        .run()
      statusOut = 'ended'
    }
  }
  const hType = String(r.host_actor_type || '')
  const hUid = r.host_user_id
  const hGid = r.host_guest_id
  let isHost = false
  if (hType === 'user' && actor.type === 'user' && hUid != null && String(hUid) === actor.id) {
    isHost = true
  } else if (hType === 'guest' && actor.type === 'guest' && hGid != null && String(hGid) === actor.id) {
    isHost = true
  }
  return c.json(
    successResponse({
      id: String(r.id),
      hostActorType: r.host_actor_type,
      hostUserId: r.host_user_id,
      hostGuestId: r.host_guest_id,
      title: r.title,
      meetingCode: r.meeting_code,
      inviteCode: r.meeting_code,
      isHost,
      status: statusOut,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      freeEndAt: freeEndRaw || null,
      linkedAnnouncementId: r.linked_announcement_id || null,
      linkedAnnouncement:
        r.linked_announcement_id != null
          ? {
              id: String(r.linked_announcement_id),
              title: r.ann_title,
              organization: r.ann_organization,
              sourceUrl: r.ann_source_url,
            }
          : null,
    })
  )
})

api.post('/meetings', ms12Access, async (c) => {
  const actor = c.get('actor')
  let body: { title?: string; displayName?: string; announcementId?: string; type?: string } = {}
  try {
    body = (await c.req.json()) as {
      title?: string
      displayName?: string
      announcementId?: string
      type?: string
    }
  } catch {
    return c.json(errorResponse('JSON 본문이 필요합니다.'), 400)
  }
  const title = String(body.title || '').trim()
  if (!title) {
    return c.json(errorResponse('회의 제목을 입력하세요.'), 400)
  }
  let annLink: string | null = null
  if (body.announcementId) {
    const raw = String(body.announcementId).trim()
    if (raw) {
      const ar = await c.env.DB.prepare(`SELECT 1 AS o FROM ms12_announcements WHERE id = ?`)
        .bind(raw)
        .first()
      if (!ar) {
        return c.json(errorResponse('연결한 공고를 찾을 수 없습니다.'), 400)
      }
      annLink = raw
    }
  }
  if (actor.type === 'guest') {
    return c.json(errorResponse('회의를 개설하려면 로그인이 필요합니다.'), 403)
  }
  const uid = parseInt(actor.id, 10)
  if (!Number.isFinite(uid)) {
    return c.json(errorResponse('사용자 정보를 확인할 수 없습니다.'), 400)
  }
  const dname = await displayNameFor(actor, body, c)
  const t = nowIso()
  const plan = await getUserMs12Plan(c, uid)
  const cap = getMs12Capabilities(plan)
  logMs12PlanIf(c, plan, cap)
  const freeEndAt =
    cap.meetingDurationSec !== null
      ? new Date(Date.now() + cap.meetingDurationSec * 1000).toISOString()
      : null
  for (let attempt = 0; attempt < 12; attempt++) {
    const id = randomId()
    const code = randomMeetingCode(8)
    try {
      const runIns = async (withFree: boolean) => {
        if (withFree) {
          await c.env.DB.batch([
            c.env.DB.prepare(
              `INSERT INTO ms12_rooms (id, host_actor_type, host_user_id, host_guest_id, title, meeting_code, status, created_at, updated_at, linked_announcement_id, free_end_at)
             VALUES (?, 'user', ?, NULL, ?, ?, 'open', ?, ?, ?, ?)`
            ).bind(id, uid, title, code, t, t, annLink, freeEndAt),
            c.env.DB.prepare(
              `INSERT INTO ms12_room_participants
             (meeting_id, participant_key, actor_type, user_id, guest_id, display_name, role, joined_at, left_at, attendance_status)
             VALUES (?, ?, 'user', ?, NULL, ?, 'host', ?, NULL, 'in')`
            ).bind(id, `u:${uid}`, uid, dname, t),
          ])
        } else {
          await c.env.DB.batch([
            c.env.DB.prepare(
              `INSERT INTO ms12_rooms (id, host_actor_type, host_user_id, host_guest_id, title, meeting_code, status, created_at, updated_at, linked_announcement_id)
             VALUES (?, 'user', ?, NULL, ?, ?, 'open', ?, ?, ?)`
            ).bind(id, uid, title, code, t, t, annLink),
            c.env.DB.prepare(
              `INSERT INTO ms12_room_participants
             (meeting_id, participant_key, actor_type, user_id, guest_id, display_name, role, joined_at, left_at, attendance_status)
             VALUES (?, ?, 'user', ?, NULL, ?, 'host', ?, NULL, 'in')`
            ).bind(id, `u:${uid}`, uid, dname, t),
          ])
        }
      }
      try {
        await runIns(true)
      } catch (e0) {
        const m0 = e0 instanceof Error ? e0.message : String(e0)
        if (!/no such column[:\s].*free_end_at|SQLITE_ERROR.*\bfree_end_at/i.test(m0)) {
          throw e0
        }
        await runIns(false)
      }
      return c.json(
        successResponse({
          id,
          title,
          meetingCode: code,
          status: 'open',
          createdAt: t,
          role: 'host',
          linkedAnnouncementId: annLink,
          ms12Plan: plan,
          freeEndAt: freeEndAt,
        })
      )
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e)
      if (/UNIQUE|unique|constraint|SQLITE_CONSTRAINT/i.test(m)) continue
      console.error('[ms12] create meeting', e)
      const detail = /no such (table|column)/i.test(m)
        ? 'D1에 ms12·0083 마이그레이션이 적용됐는지 확인하세요.'
        : '회의를 만들 수 없습니다.'
      return c.json(
        { success: false, error: detail, message: m.slice(0, 300) } as { success: false; error: string; message: string },
        500,
      )
    }
  }
  return c.json(errorResponse('회의 코드 충돌 — 잠시 후 다시 시도하세요.'), 500)
})

api.post('/meetings/join', ms12Access, async (c) => {
  const actor = c.get('actor')
  let body: { meetingCode?: string; displayName?: string } = {}
  try {
    body = (await c.req.json()) as { meetingCode?: string; displayName?: string }
  } catch {
    return c.json(errorResponse('JSON 본문이 필요합니다.'), 400)
  }
  const raw = String(body.meetingCode || '').trim().replace(/[\s-]/g, '').toUpperCase()
  if (raw.length < 4) {
    return c.json(errorResponse('회의 코드를 입력하세요.'), 400)
  }
  let room: Record<string, unknown> | null = null
  try {
    room = await c.env.DB
      .prepare(
        `SELECT id, title, host_actor_type, host_user_id, host_guest_id, meeting_code, status, free_end_at FROM ms12_rooms
     WHERE UPPER(meeting_code) = UPPER(?)`,
      )
      .bind(raw)
      .first<Record<string, unknown>>()
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e)
    if (!/no such column[:\s].*free_end_at|SQLITE_ERROR.*\bfree_end_at/i.test(m)) {
      throw e
    }
    room = await c.env.DB
      .prepare(
        `SELECT id, title, host_actor_type, host_user_id, host_guest_id, meeting_code, status FROM ms12_rooms
     WHERE UPPER(meeting_code) = UPPER(?)`,
      )
      .bind(raw)
      .first<Record<string, unknown>>()
  }
  if (!room) {
    return c.json(
      errorResponse('입장할 수 없는 회의입니다. 회의 개설자에게 새 링크를 요청해 주세요.'),
      404,
    )
  }
  if ((room.status as string) === 'ended') {
    return c.json(
      errorResponse('입장할 수 없는 회의입니다. (종료됨) 회의 개설자에게 새 링크를 요청해 주세요.'),
      404,
    )
  }
  const feJoin = room.free_end_at != null ? String(room.free_end_at) : ''
  if (feJoin) {
    const endMsJ = Date.parse(feJoin)
    if (!Number.isNaN(endMsJ) && Date.now() > endMsJ) {
      const tEnd = nowIso()
      const rid = String(room.id)
      await c.env.DB
        .prepare(`UPDATE ms12_rooms SET status = 'ended', updated_at = ? WHERE id = ? AND status = 'open'`)
        .bind(tEnd, rid)
        .run()
      return c.json(
        errorResponse('입장할 수 없는 회의입니다. (이용 시간 종료) 회의 개설자에게 새 링크를 요청해 주세요.'),
        404,
      )
    }
  }
  const id = String(room.id)
  const t = nowIso()
  const dname = await displayNameFor(actor, body, c)
  const hostType = room.host_actor_type as string
  const hostUserId = room.host_user_id as number | null
  const hostGuestId = room.host_guest_id as string | null
  let role: 'host' | 'participant' = 'participant'
  if (hostType === 'user' && actor.type === 'user' && String(hostUserId) === actor.id) {
    role = 'host'
  } else if (hostType === 'guest' && actor.type === 'guest' && hostGuestId === actor.id) {
    role = 'host'
  }
  const pk = participantKey(actor)
  if (actor.type === 'user') {
    const uid = parseInt(actor.id, 10)
    try {
      await c.env.DB.prepare(
        `INSERT INTO ms12_room_participants
         (meeting_id, participant_key, actor_type, user_id, guest_id, display_name, role, joined_at, left_at, attendance_status)
         VALUES (?, ?, 'user', ?, NULL, ?, ?, ?, NULL, 'in')
         ON CONFLICT(meeting_id, participant_key) DO UPDATE SET
           display_name = excluded.display_name,
           role = excluded.role,
           joined_at = excluded.joined_at,
           left_at = NULL,
           attendance_status = 'in'`
      )
        .bind(id, pk, uid, dname, role, t)
        .run()
    } catch (e) {
      console.error('[ms12] join', e)
      return c.json(errorResponse('입장에 실패했습니다.'), 500)
    }
  } else {
    const gid = actor.id
    try {
      await c.env.DB.prepare(
        `INSERT INTO ms12_room_participants
         (meeting_id, participant_key, actor_type, user_id, guest_id, display_name, role, joined_at, left_at, attendance_status)
         VALUES (?, ?, 'guest', NULL, ?, ?, ?, ?, NULL, 'in')
         ON CONFLICT(meeting_id, participant_key) DO UPDATE SET
           display_name = excluded.display_name,
           role = excluded.role,
           joined_at = excluded.joined_at,
           left_at = NULL,
           attendance_status = 'in'`
      )
        .bind(id, pk, gid, dname, role, t)
        .run()
    } catch (e) {
      console.error('[ms12] join', e)
      return c.json(errorResponse('입장에 실패했습니다.'), 500)
    }
  }
  await c.env.DB.prepare(`UPDATE ms12_rooms SET updated_at = ? WHERE id = ?`).bind(t, id).run()
  return c.json(
    successResponse({
      id,
      title: room.title,
      meetingCode: room.meeting_code,
      role,
    })
  )
})

const CONTEXT_MAX = 14_000

function clipContext(s: string): string {
  const t = (s || '').trim()
  if (t.length <= CONTEXT_MAX) return t
  return t.slice(0, CONTEXT_MAX) + '\n…(이하 잘림)'
}

api.get('/meetings/:id/action-items', ms12Access, async (c) => {
  const actor = c.get('actor')
  const meetingId = c.req.param('id')
  await requireRoomParticipant(c, meetingId, actor)
  let rows: Array<Record<string, unknown>> = []
  try {
    const res = await c.env.DB.prepare(
      `SELECT id, meeting_id, title, task_detail, assignee, due_at, status, result_note, priority, item_category, created_at, updated_at
       FROM ms12_action_items
       WHERE meeting_id = ?
       ORDER BY
         CASE WHEN status = 'open' THEN 0 ELSE 1 END,
         id DESC`
    )
      .bind(meetingId)
      .all()
    rows = (res.results || []) as Array<Record<string, unknown>>
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e)
    if (/no such table|no such column/i.test(m)) {
      return c.json(
        errorResponse('실행 항목 테이블이 없습니다. D1에 마이그레이션 0076을 적용해 주세요.'),
        503,
      )
    }
    console.error('[ms12] action-items list', m.slice(0, 200))
    return c.json(errorResponse('실행 항목을 불러올 수 없습니다.'), 500)
  }
  const list = rows.map((row) => ({
    id: row.id,
    meetingId: String(row.meeting_id),
    title: row.title,
    taskDetail: row.task_detail,
    assignee: row.assignee,
    dueAt: row.due_at,
    status: row.status,
    resultNote: row.result_note,
    priority: row.priority,
    itemCategory: row.item_category,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
  return c.json(successResponse({ meetingId, items: list }))
})

/** AI: 메모·전사(·요약)에서 실행 항목 후보 — 참가자가 편집·추가 API로 반영 */
api.post('/meetings/:id/action-items/ai-suggest', ms12Access, async (c) => {
  const actor = c.get('actor')
  const meetingId = c.req.param('id')
  await requireRoomParticipant(c, meetingId, actor)
  const roomBlock = await assertRoomOpenForMutations(c, meetingId)
  if (roomBlock) return roomBlock
  const proDeny = await requireProPlan(c, actor)
  if (proDeny) return proDeny
  let body: {
    notes?: string
    transcript?: string
    summaryBasic?: string
    summaryAction?: string
    summaryReport?: string
  } = {}
  try {
    body = (await c.req.json()) as typeof body
  } catch {
    return c.json(errorResponse('JSON 본문이 필요합니다.'), 400)
  }
  const notes = clipContext(String(body.notes || ''))
  const transcript = clipContext(String(body.transcript || ''))
  const b0 = String(body.summaryBasic || '').trim()
  const b1 = String(body.summaryAction || '').trim()
  const b2 = String(body.summaryReport || '').trim()
  if (![notes, transcript, b0, b1, b2].some((x) => x.length > 0)) {
    return c.json(
      errorResponse('메모·전사·요약 중 최소 한 가지는 보내 주세요. 먼저 3단 요약을 쓰거나 메모·전사를 입력하세요.'),
      400,
    )
  }
  const part = [b0 && `## 기본 요약\n${b0}`, b1 && `## 실행 요약\n${b1}`, b2 && `## 보고 요약\n${b2}`]
    .filter(Boolean)
    .join('\n\n')
  const block = [notes && `## 메모\n${notes}`, transcript && `## 전사\n${transcript}`, part]
    .filter(Boolean)
    .join('\n\n')
  const system = `You extract actionable follow-ups from a meeting. Output ONLY valid JSON, no markdown fences: {"items":[{"title":"(필수, 한국어, 한 줄)","taskDetail":"(선택, 짧게)","assignee":"(선택, 이름/역할)","dueAt":""}, ...]}. at most 20 items, each field string. If no clear action items, return {"items":[]}. dueAt only as YYYY-MM-DD when a date is clearly stated; else "".`
  try {
    const raw = await generateTextGeminiOrOpenAI(c.env, block, system)
    const t = raw.trim()
    const m = t.match(/\{[\s\S]*\}/)
    const j = m ? (JSON.parse(m[0]) as { items?: unknown }) : null
    const arr = j && Array.isArray(j.items) ? j.items : []
    const items: Array<{ title: string; taskDetail: string; assignee: string; dueAt: string }> = []
    for (const u of arr.slice(0, 20)) {
      if (!u || typeof u !== 'object') continue
      const o = u as Record<string, unknown>
      const title = String(o.title != null ? o.title : '').trim().slice(0, 500)
      if (!title) continue
      const taskDetail = String(o.taskDetail != null ? o.taskDetail : '').trim().slice(0, 2000)
      const assignee = String(o.assignee != null ? o.assignee : '').trim().slice(0, 120)
      let dueAt = String(o.dueAt != null ? o.dueAt : '').trim().slice(0, 20)
      if (dueAt && !/^\d{4}-\d{2}-\d{2}/.test(dueAt)) dueAt = ''
      items.push({ title, taskDetail, assignee, dueAt })
    }
    return c.json(successResponse({ meetingId, items }))
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === 'NO_AI_KEY') {
      return c.json(
        errorResponse('AI 키가 없습니다. GEMINI_API_KEY 또는 OPENAI_API_KEY를 설정하세요.'),
        503,
      )
    }
    console.error('[ms12] action-items ai-suggest', msg.slice(0, 200))
    return c.json(errorResponse('실행 항목 제안을 만들지 못했습니다.'), 502)
  }
})

api.post('/meetings/:id/action-items', ms12Access, async (c) => {
  const actor = c.get('actor')
  const meetingId = c.req.param('id')
  await requireRoomParticipant(c, meetingId, actor)
  const roomBlockAi = await assertRoomOpenForMutations(c, meetingId)
  if (roomBlockAi) return roomBlockAi
  let body: {
    title?: string
    taskDetail?: string
    assignee?: string
    dueAt?: string
    priority?: string
    itemCategory?: string
  } = {}
  try {
    body = (await c.req.json()) as typeof body
  } catch {
    return c.json(errorResponse('JSON 본문이 필요합니다.'), 400)
  }
  const title = String(body.title || '').trim()
  if (!title) {
    return c.json(errorResponse('제목을 입력하세요.'), 400)
  }
  const taskDetail = String(body.taskDetail || '').trim() || null
  const assignee = String(body.assignee || '').trim() || null
  const dueAt = String(body.dueAt || '').trim() || null
  const pr = (String(body.priority || 'normal').trim() || 'normal').slice(0, 20)
  const ic = (String(body.itemCategory || 'required').trim() || 'required').slice(0, 20)
  const t = nowIso()
  const byKey = participantKey(actor)
  try {
    const r = await c.env.DB.prepare(
      `INSERT INTO ms12_action_items (meeting_id, title, task_detail, assignee, due_at, status, priority, item_category, created_by_key, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?) RETURNING id`
    )
      .bind(meetingId, title, taskDetail, assignee, dueAt, pr, ic, byKey, t, t)
      .first<{ id: number }>()
    if (!r?.id) {
      return c.json(errorResponse('저장에 실패했습니다.'), 500)
    }
    await c.env.DB.prepare(`UPDATE ms12_rooms SET updated_at = ? WHERE id = ?`).bind(t, meetingId).run()
    return c.json(
      successResponse({
        id: r.id,
        meetingId,
        title,
        taskDetail: taskDetail || '',
        assignee: assignee || '',
        dueAt: dueAt || '',
        status: 'open',
        priority: pr,
        itemCategory: ic,
        createdAt: t,
        updatedAt: t,
      }),
    )
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e)
    if (/no such table|no such column/i.test(m)) {
      return c.json(
        errorResponse(
          '실행 항목 스키마를 확인하세요. D1에 0076·0080 마이그레이션을 적용해 주세요.',
        ),
        503,
      )
    }
    console.error('[ms12] action-items create', e)
    return c.json(errorResponse('저장에 실패했습니다.'), 500)
  }
})

api.patch('/meetings/:id/action-items/:itemId', ms12Access, async (c) => {
  const actor = c.get('actor')
  const meetingId = c.req.param('id')
  const itemId = parseInt(c.req.param('itemId'), 10)
  if (!itemId) {
    return c.json(errorResponse('항목 id가 올바르지 않습니다.'), 400)
  }
  await requireRoomParticipant(c, meetingId, actor)
  const roomBlockPatch = await assertRoomOpenForMutations(c, meetingId)
  if (roomBlockPatch) return roomBlockPatch
  let body: {
    status?: string
    resultNote?: string | null
    taskDetail?: string | null
    priority?: string
    itemCategory?: string
    title?: string
    assignee?: string | null
    dueAt?: string | null
  } = {}
  try {
    body = (await c.req.json()) as typeof body
  } catch {
    return c.json(errorResponse('JSON 본문이 필요합니다.'), 400)
  }
  const hasStatus = body.status != null && String(body.status).trim() !== ''
  const hasResult = 'resultNote' in body
  const hasTask = 'taskDetail' in body
  const hasPr = body.priority != null && String(body.priority).trim() !== ''
  const hasIc = body.itemCategory != null && String(body.itemCategory).trim() !== ''
  const hasTitle = 'title' in body && String(body.title != null ? body.title : '').trim() !== ''
  const hasAssignee = 'assignee' in body
  const hasDueAt = 'dueAt' in body
  if (!hasStatus && !hasResult && !hasTask && !hasPr && !hasIc && !hasTitle && !hasAssignee && !hasDueAt) {
    return c.json(errorResponse('갱신할 필드를 지정하세요.'), 400)
  }
  if ('title' in body && !hasTitle) {
    return c.json(errorResponse('제목은 비울 수 없습니다.'), 400)
  }
  if (hasStatus) {
    const st = String(body.status || '').trim()
    if (st !== 'open' && st !== 'done') {
      return c.json(errorResponse('status는 open 또는 done이어야 합니다.'), 400)
    }
  }
  const t = nowIso()
  try {
    const setParts: string[] = []
    const bindVals: (string | number | null)[] = []
    if (hasStatus) {
      setParts.push('status = ?')
      bindVals.push(String(body.status).trim())
    }
    if (hasResult) {
      setParts.push('result_note = ?')
      const rn = body.resultNote
      bindVals.push(rn === null || rn === undefined ? null : String(rn).slice(0, 5000))
    }
    if (hasTask) {
      setParts.push('task_detail = ?')
      const td = body.taskDetail
      bindVals.push(td === null || td === undefined ? null : String(td).slice(0, 8000))
    }
    if (hasTitle) {
      setParts.push('title = ?')
      bindVals.push(String(body.title).trim().slice(0, 500))
    }
    if (hasAssignee) {
      setParts.push('assignee = ?')
      const a = body.assignee
      bindVals.push(
        a === null || a === undefined || String(a).trim() === ''
          ? null
          : String(a).trim().slice(0, 120),
      )
    }
    if (hasDueAt) {
      setParts.push('due_at = ?')
      const d = body.dueAt
      bindVals.push(
        d === null || d === undefined || String(d).trim() === ''
          ? null
          : String(d).trim().slice(0, 20),
      )
    }
    if (hasPr) {
      setParts.push('priority = ?')
      bindVals.push(String(body.priority).trim().slice(0, 20))
    }
    if (hasIc) {
      setParts.push('item_category = ?')
      bindVals.push(String(body.itemCategory).trim().slice(0, 20))
    }
    setParts.push('updated_at = ?')
    bindVals.push(t, itemId, meetingId)
    const r = await c.env.DB.prepare(
      `UPDATE ms12_action_items SET ${setParts.join(', ')} WHERE id = ? AND meeting_id = ?`
    )
      .bind(...bindVals)
      .run()
    if (r.meta.changes === 0) {
      return c.json(errorResponse('해당 항목을 찾을 수 없습니다.'), 404)
    }
    await c.env.DB.prepare(`UPDATE ms12_rooms SET updated_at = ? WHERE id = ?`).bind(t, meetingId).run()
    return c.json(
      successResponse({
        id: itemId,
        meetingId,
        status: hasStatus ? String(body.status).trim() : undefined,
        resultNote: hasResult ? body.resultNote : undefined,
        updatedAt: t,
      }),
    )
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e)
    if (/no such table|no such column/i.test(m)) {
      return c.json(
        errorResponse('실행 항목 테이블이 없습니다. D1에 마이그레이션 0076을 적용해 주세요.'),
        503,
      )
    }
    console.error('[ms12] action-items patch', e)
    return c.json(errorResponse('갱신에 실패했습니다.'), 500)
  }
})

api.post('/meetings/:id/ai-qa', ms12Access, async (c) => {
  const actor = c.get('actor')
  const meetingId = c.req.param('id')
  await requireRoomParticipant(c, meetingId, actor)
  const roomBlockQa = await assertRoomOpenForMutations(c, meetingId)
  if (roomBlockQa) return roomBlockQa
  const proDenyQa = await requireProPlan(c, actor)
  if (proDenyQa) return proDenyQa
  let body: { question?: string; notes?: string; transcript?: string; summary?: string } = {}
  try {
    body = (await c.req.json()) as {
      question?: string
      notes?: string
      transcript?: string
      summary?: string
    }
  } catch {
    return c.json(errorResponse('JSON 본문이 필요합니다.'), 400)
  }
  const question = String(body.question || '').trim()
  if (!question) {
    return c.json(errorResponse('질문을 입력하세요.'), 400)
  }
  if (question.length > 2000) {
    return c.json(errorResponse('질문이 너무 깁니다. (2000자 이하)'), 400)
  }
  const notes = clipContext(String(body.notes || ''))
  const transcript = clipContext(String(body.transcript || ''))
  const summary = clipContext(String(body.summary || ''))
  const contextBlock = [
    notes && `## 회의 메모\n${notes}`,
    transcript && `## 전사\n${transcript}`,
    summary && `## 요약\n${summary}`,
  ]
    .filter(Boolean)
    .join('\n\n')
  if (!contextBlock.trim()) {
    return c.json(errorResponse('참고할 메모·전사·요약이 비어 있습니다. 먼저 내용을 입력하세요.'), 400)
  }
  const system = `당신은 회의 진행을 돕는 어시스턴트입니다. 아래는 한 회의의 메모·전사·요약입니다. 사용자의 질문에 한국어로 간결하고 사실에 충실하게 답하세요. 제공된 텍스트에 없는 내용은 추측하지 말고, 근거가 없다고 말하세요.`
  const user = `${contextBlock}\n\n---\n## 질문\n${question}`
  try {
    const answer = await generateTextGeminiOrOpenAI(c.env, user, system)
    return c.json(successResponse({ meetingId, answer: answer.trim() }))
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === 'NO_AI_KEY') {
      return c.json(
        errorResponse(
          'AI 키가 없습니다. Cloudflare에 GEMINI_API_KEY 또는 OPENAI_API_KEY를 설정해 주세요.',
        ),
        503,
      )
    }
    console.error('[ms12] ai-qa', msg.slice(0, 200))
    return c.json(errorResponse('AI 응답을 만들지 못했습니다.'), 502)
  }
})

/** 메모·전사 진행에 맞춰 3단 요약(기본/실행/보고) 제안 */
api.post('/meetings/:id/auto-summary', ms12Access, async (c) => {
  const actor = c.get('actor')
  const meetingId = c.req.param('id')
  await requireRoomParticipant(c, meetingId, actor)
  const roomBlockAs = await assertRoomOpenForMutations(c, meetingId)
  if (roomBlockAs) return roomBlockAs
  const proDenyAs = await requireProPlan(c, actor)
  if (proDenyAs) return proDenyAs
  let body: {
    notes?: string
    transcript?: string
    summaryBasic?: string
    summaryAction?: string
    summaryReport?: string
    focus?: 'basic' | 'action' | 'report'
  } = {}
  try {
    body = (await c.req.json()) as typeof body
  } catch {
    return c.json(errorResponse('JSON 본문이 필요합니다.'), 400)
  }
  const notes = clipContext(String(body.notes || ''))
  const transcript = clipContext(String(body.transcript || ''))
  if (![notes, transcript].some((x) => x.trim().length > 0)) {
    return c.json(errorResponse('메모·전사 중 최소 하나는 보내 주세요.'), 400)
  }
  const prevBasic = String(body.summaryBasic || '').trim()
  const prevAction = String(body.summaryAction || '').trim()
  const prevReport = String(body.summaryReport || '').trim()
  const prev = [prevBasic, prevAction, prevReport].filter(Boolean)
  const block = [
    notes && `## 현재 메모\n${notes}`,
    transcript && `## 현재 전사\n${transcript}`,
    prev.length
      ? `## 이전에 적어 둔 요약(참고·갱신)\n${prev.join('\n---\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n')
  const focus = body.focus
  const isFocus = focus === 'basic' || focus === 'action' || focus === 'report'

  if (isFocus) {
    const oneLine =
      focus === 'basic'
        ? '기본요약: 회의의 핵심 3~6문장(전체 흐름·논의 주제)으로 한국어로 정리하세요.'
        : focus === 'action'
          ? '실행요약: 결정·할 일·책임·일정이 드러나면 불릿으로, 없으면 1~3개 항목에 "검토 필요" 등으로 한국어로 정리하세요.'
          : '보고요약: 기관·대외 보고 톤으로 성과·과제·다음 단계 3~5문장(한국어)으로 정리하세요.'
    const system = `You are a Korean meeting assistant. Read the input and output ONLY a JSON object: {"text":"(your summary in Korean, markdown bullets allowed)"}. 
Task: ${oneLine}
If information is missing, use [미정] or brief placeholders. Be concise, no key other than "text".`
    try {
      const raw = await generateTextGeminiOrOpenAI(c.env, block, system)
      const t = raw.trim()
      const m = t.match(/\{[\s\S]*\}/)
      const j = m ? (JSON.parse(m[0]) as Record<string, unknown>) : null
      const text =
        j && typeof j.text === 'string'
          ? String(j.text).trim()
          : t.replace(/^```[\s\S]*?```/m, '').trim().slice(0, 4000)
      return c.json(
        successResponse({
          meetingId,
          focus,
          summaryBasic: focus === 'basic' ? text : '',
          summaryAction: focus === 'action' ? text : '',
          summaryReport: focus === 'report' ? text : '',
          source: 'json',
        }),
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg === 'NO_AI_KEY') {
        return c.json(
          errorResponse(
            'AI 키가 없습니다. Cloudflare에 GEMINI_API_KEY 또는 OPENAI_API_KEY를 설정하세요.',
          ),
          503,
        )
      }
      console.error('[ms12] auto-summary', msg.slice(0, 200))
      return c.json(errorResponse('자동 요약을 만들지 못했습니다.'), 502)
    }
  }

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
          meetingId,
          summaryBasic: String(j.summaryBasic).trim(),
          summaryAction: String(j.summaryAction != null ? j.summaryAction : '').trim(),
          summaryReport: String(j.summaryReport != null ? j.summaryReport : '').trim(),
          source: 'json',
        }),
      )
    }
    return c.json(
      successResponse({
        meetingId,
        summaryBasic: t.slice(0, 2000),
        summaryAction: '',
        summaryReport: '',
        source: 'fallback',
      }),
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === 'NO_AI_KEY') {
      return c.json(
        errorResponse(
          'AI 키가 없습니다. Cloudflare에 GEMINI_API_KEY 또는 OPENAI_API_KEY를 설정하세요.',
        ),
        503,
      )
    }
    console.error('[ms12] auto-summary', msg.slice(0, 200))
    return c.json(errorResponse('자동 요약을 만들지 못했습니다.'), 502)
  }
})

api.post('/meetings/:id/report-draft', ms12Access, async (c) => {
  const actor = c.get('actor')
  const meetingId = c.req.param('id')
  await requireRoomParticipant(c, meetingId, actor)
  const roomBlockRd = await assertRoomOpenForMutations(c, meetingId)
  if (roomBlockRd) return roomBlockRd
  const proDenyRd = await requireProPlan(c, actor)
  if (proDenyRd) return proDenyRd
  let body: { notes?: string; transcript?: string; summary?: string; kind?: string } = {}
  try {
    body = (await c.req.json()) as typeof body
  } catch {
    return c.json(errorResponse('JSON 본문이 필요합니다.'), 400)
  }
  const notes = clipContext(String(body.notes || ''))
  const transcript = clipContext(String(body.transcript || ''))
  const summary = clipContext(String(body.summary || ''))
  if (![notes, transcript, summary].some((x) => x.trim().length > 0)) {
    return c.json(errorResponse('메모·전사·요약을 요청 본문에 넣으세요.'), 400)
  }
  const kindRaw = String(body.kind || 'internal').trim()
  const kindLabel: Record<string, string> = {
    internal: '내부 운영·실적 보고서',
    external: '대외(상급기관·수요기관 제출용) 보고서',
    action_plan: '실행계획서',
    result_report: '결과보고서',
    proposal: '사업·프로그램 제안서',
  }
  const kind = kindLabel[kindRaw] || kindLabel.internal
  const user = [notes && `## 메모\n${notes}`, transcript && `## 전사\n${transcript}`, summary && `## 요약\n${summary}`]
    .filter(Boolean)
    .join('\n\n')
  const system =
    kindRaw === 'action_plan'
      ? `당신은 기관의 실행계획서 초안을 작성합니다. 한국어 마크다운으로 목표·추진 일정·담당·예산(알 수 있을 때)·리스크를 정리하되, 제시된 회의 텍스트에 없는 수치는 [확인 필요]로 표시하세요.`
      : kindRaw === 'result_report'
        ? `당신은 기관의 결과보고서 초안을 작성합니다. 한국어 마크다운으로 추진 배경·실적·성과·지표·향후 과제를 서술하되, 근거 없는 수치·인용은 쓰지 말고 [확인 필요]로 표시하세요.`
        : kindRaw === 'proposal'
          ? `당신은 기관의 사업·프로그램 제안서 초안을 작성합니다. 한국어 마크다운으로 필요성·목표·추진 방안·기대 효과를 정리하되, 제시된 회의 내용만 근거로 삼으세요.`
          : `당신은 기관의 ${kind} 초안을 작성합니다. 한국어 마크다운으로 표준 목차(배경, 추진현황, 성과, 향후계획 등)에 맞춰 서술하되, 제시된 회의 정보만 근거로 삼고 수치·실적·명칭이 없는 내용은 추정하지 말고 [확인 필요]로 표시하세요.`
  try {
    const draft = await generateTextGeminiOrOpenAI(c.env, user, system)
    return c.json(successResponse({ meetingId, kind, draft: draft.trim() }))
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === 'NO_AI_KEY') {
      return c.json(
        errorResponse('AI 키가 없습니다. Cloudflare에 GEMINI_API_KEY 또는 OPENAI_API_KEY를 설정해 주세요.'),
        503,
      )
    }
    console.error('[ms12] report-draft', msg.slice(0, 200))
    return c.json(errorResponse('보고서 초안을 만들지 못했습니다.'), 502)
  }
})

api.post('/meetings/:id/content-draft', ms12Access, async (c) => {
  const actor = c.get('actor')
  const meetingId = c.req.param('id')
  await requireRoomParticipant(c, meetingId, actor)
  const roomBlockCd = await assertRoomOpenForMutations(c, meetingId)
  if (roomBlockCd) return roomBlockCd
  const proDenyCd = await requireProPlan(c, actor)
  if (proDenyCd) return proDenyCd
  let body: { notes?: string; transcript?: string; summary?: string; channel?: string } = {}
  try {
    body = (await c.req.json()) as typeof body
  } catch {
    return c.json(errorResponse('JSON 본문이 필요합니다.'), 400)
  }
  const notes = clipContext(String(body.notes || ''))
  const transcript = clipContext(String(body.transcript || ''))
  const summary = clipContext(String(body.summary || ''))
  if (![notes, transcript, summary].some((x) => x.trim().length > 0)) {
    return c.json(errorResponse('메모·전사·요약을 요청 본문에 넣으세요.'), 400)
  }
  const chRaw = String(body.channel || 'blog').trim()
  const channelLabel: Record<string, string> = {
    press: '보도자료',
    blog: '블로그·뉴스형 홍보 글',
    social: 'SNS·짧은 홍보 카드',
  }
  const channel = channelLabel[chRaw] || channelLabel.blog
  const user = [notes && `## 메모\n${notes}`, transcript && `## 전사\n${transcript}`, summary && `## 요약\n${summary}`]
    .filter(Boolean)
    .join('\n\n')
  const system =
    chRaw === 'press'
      ? `다음은 기관이 진행한 회의/사업과 관련된 정보입니다. 보도자료 톤으로 리드·핵심·문의 3~4문단, 800~1500자 내외 한국어 초안을 쓰세요.`
      : chRaw === 'social'
        ? `다음 정보를 바탕으로 SNS·짧은 홍보용 문구(해시태그는 선택) 한국어 초안을 400자 내외로 쓰세요.`
        : `다음은 기관이 진행한 회의/사업과 관련된 정보입니다. ${channel} 톤으로 800~1500자 내외 한국어 초안을 쓰세요. 사실에 없는 수치·인용은 쓰지 말고, 전체를 긍정적이고 명확한 톤으로 정리하세요.`
  try {
    const draft = await generateTextGeminiOrOpenAI(c.env, user, system)
    return c.json(successResponse({ meetingId, channel: chRaw, label: channel, draft: draft.trim() }))
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === 'NO_AI_KEY') {
      return c.json(
        errorResponse('AI 키가 없습니다. Cloudflare에 GEMINI_API_KEY 또는 OPENAI_API_KEY를 설정해 주세요.'),
        503,
      )
    }
    console.error('[ms12] content-draft', msg.slice(0, 200))
    return c.json(errorResponse('콘텐츠 초안을 만들지 못했습니다.'), 502)
  }
})

export default api
