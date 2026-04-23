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
import { getAuthMode } from '../utils/auth-mode'

type Ctx = Context<{ Bindings: Bindings; Variables: { actor: AppActor } }>

const api = new Hono<{ Bindings: Bindings; Variables: { actor: AppActor } }>()

api.use(async (c, next) => {
  const p = c.req.path
  const segs = p.split('/').filter(Boolean)
  if (segs[segs.length - 1] === 'health') {
    return next()
  }
  if (!c.env?.DB) {
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
  const k = participantKey(actor)
  const row = await c.env.DB.prepare(
    `SELECT 1 AS ok FROM ms12_room_participants
     WHERE meeting_id = ? AND participant_key = ? AND left_at IS NULL`
  )
    .bind(meetingId, k)
    .first()
  if (row) return
  throw new HTTPException(403, { message: '이 회의에 입장한 참석자만 볼 수 있습니다.' })
}

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
  const r = await c.env.DB.prepare(
    `SELECT id, host_actor_type, host_user_id, host_guest_id, title, meeting_code, status, created_at, updated_at
     FROM ms12_rooms WHERE id = ?`
  )
    .bind(meetingId)
    .first<Record<string, unknown>>()
  if (!r) {
    return c.json(errorResponse('회의를 찾을 수 없습니다.'), 404)
  }
  return c.json(
    successResponse({
      id: String(r.id),
      hostActorType: r.host_actor_type,
      hostUserId: r.host_user_id,
      hostGuestId: r.host_guest_id,
      title: r.title,
      meetingCode: r.meeting_code,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })
  )
})

api.post('/meetings', ms12Access, async (c) => {
  const actor = c.get('actor')
  let body: { title?: string; displayName?: string } = {}
  try {
    body = (await c.req.json()) as { title?: string; displayName?: string }
  } catch {
    return c.json(errorResponse('JSON 본문이 필요합니다.'), 400)
  }
  const title = String(body.title || '').trim()
  if (!title) {
    return c.json(errorResponse('회의 제목을 입력하세요.'), 400)
  }
  const dname = await displayNameFor(actor, body, c)
  const t = nowIso()
  for (let attempt = 0; attempt < 12; attempt++) {
    const id = randomId()
    const code = randomMeetingCode(8)
    try {
      if (actor.type === 'user') {
        const uid = parseInt(actor.id, 10)
        await c.env.DB.batch([
          c.env.DB.prepare(
            `INSERT INTO ms12_rooms (id, host_actor_type, host_user_id, host_guest_id, title, meeting_code, status, created_at, updated_at)
             VALUES (?, 'user', ?, NULL, ?, ?, 'open', ?, ?)`
          ).bind(id, uid, title, code, t, t),
          c.env.DB.prepare(
            `INSERT INTO ms12_room_participants
             (meeting_id, participant_key, actor_type, user_id, guest_id, display_name, role, joined_at, left_at, attendance_status)
             VALUES (?, ?, 'user', ?, NULL, ?, 'host', ?, NULL, 'in')`
          ).bind(id, `u:${uid}`, uid, dname, t),
        ])
      } else {
        const gid = actor.id
        await c.env.DB.batch([
          c.env.DB.prepare(
            `INSERT INTO ms12_rooms (id, host_actor_type, host_user_id, host_guest_id, title, meeting_code, status, created_at, updated_at)
             VALUES (?, 'guest', NULL, ?, ?, ?, 'open', ?, ?)`
          ).bind(id, gid, title, code, t, t),
          c.env.DB.prepare(
            `INSERT INTO ms12_room_participants
             (meeting_id, participant_key, actor_type, user_id, guest_id, display_name, role, joined_at, left_at, attendance_status)
             VALUES (?, ?, 'guest', NULL, ?, ?, 'host', ?, NULL, 'in')`
          ).bind(id, `g:${gid}`, gid, dname, t),
        ])
      }
      return c.json(
        successResponse({
          id,
          title,
          meetingCode: code,
          status: 'open',
          createdAt: t,
          role: 'host',
        })
      )
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e)
      if (/UNIQUE|unique|constraint|SQLITE_CONSTRAINT/i.test(m)) continue
      console.error('[ms12] create meeting', e)
      const detail = /no such (table|column)/i.test(m)
        ? 'D1에 ms12 마이그레이션(0074·0075)이 적용됐는지 확인하세요.'
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
  const room = await c.env.DB.prepare(
    `SELECT id, title, host_actor_type, host_user_id, host_guest_id, meeting_code, status FROM ms12_rooms
     WHERE UPPER(meeting_code) = UPPER(?)`
  )
    .bind(raw)
    .first<Record<string, unknown>>()
  if (!room || (room.status as string) === 'ended') {
    return c.json(errorResponse('해당 코드의 회의를 찾을 수 없습니다.'), 404)
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

export default api
