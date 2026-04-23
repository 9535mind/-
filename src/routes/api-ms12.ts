/**
 * /api/ms12/* — MS12 회의방(라이브) API (ms12_rooms, ms12_room_participants)
 */
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { Bindings } from '../types/database'
import { requireAuth } from '../middleware/auth'
import { FOOTER_HTML_REVISION } from '../utils/site-footer-legal'
import { successResponse, errorResponse } from '../utils/helpers'

const api = new Hono<{ Bindings: Bindings }>()

api.get('/health', (c) =>
  c.json({
    ok: true,
    product: 'ms12',
    buildRef: FOOTER_HTML_REVISION,
    ts: new Date().toISOString(),
  })
)

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

type AuthUser = { id: number; name?: string | null; email?: string | null }

async function requireRoomParticipant(
  c: { env: { DB: D1Database } },
  meetingId: string,
  userId: number
): Promise<void> {
  const row = await c.env.DB.prepare(
    `SELECT 1 AS ok FROM ms12_room_participants WHERE meeting_id = ? AND user_id = ? AND left_at IS NULL`
  )
    .bind(meetingId, userId)
    .first()
  if (row) return
  throw new HTTPException(403, { message: '이 회의에 입장한 참석자만 볼 수 있습니다.' })
}

/** 목록(내 회의) — :id보다 먼저 등록 */
api.get('/meetings/my', requireAuth, async (c) => {
  const u = c.get('user') as AuthUser
  const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20', 10) || 20))
  const rows = await c.env.DB.prepare(
    `SELECT
      r.id, r.title, r.host_user_id, r.meeting_code, r.status, r.created_at, r.updated_at,
      p.role AS my_role, p.joined_at AS my_joined_at
    FROM ms12_rooms r
    INNER JOIN ms12_room_participants p ON p.meeting_id = r.id
    WHERE p.user_id = ?
    ORDER BY r.updated_at DESC
    LIMIT ?`
  )
    .bind(u.id, limit)
    .all()
  return c.json(
    successResponse(
      (rows.results || []).map((row: Record<string, unknown>) => ({
        id: String(row.id),
        title: row.title,
        hostUserId: row.host_user_id,
        meetingCode: row.meeting_code,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        myRole: row.my_role,
        myJoinedAt: row.my_joined_at,
      }))
    )
  )
})

api.get('/meetings/:id/participants', requireAuth, async (c) => {
  const u = c.get('user') as AuthUser
  const meetingId = c.req.param('id')
  await requireRoomParticipant(c, meetingId, u.id)
  const rows = await c.env.DB.prepare(
    `SELECT
      p.user_id, p.display_name, p.role, p.joined_at, p.left_at, p.attendance_status
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
    displayName: row.display_name,
    role: row.role,
    joinedAt: row.joined_at,
    leftAt: row.left_at,
    attendanceStatus: row.attendance_status,
    isPresent: row.left_at == null,
  }))
  return c.json(successResponse({ meetingId, participants: list, count: list.filter((p) => p.isPresent).length }))
})

api.get('/meetings/:id', requireAuth, async (c) => {
  const u = c.get('user') as AuthUser
  const meetingId = c.req.param('id')
  await requireRoomParticipant(c, meetingId, u.id)
  const r = await c.env.DB.prepare(
    `SELECT id, host_user_id, title, meeting_code, status, created_at, updated_at FROM ms12_rooms WHERE id = ?`
  )
    .bind(meetingId)
    .first<Record<string, unknown>>()
  if (!r) {
    return c.json(errorResponse('회의를 찾을 수 없습니다.'), 404)
  }
  return c.json(
    successResponse({
      id: String(r.id),
      hostUserId: r.host_user_id,
      title: r.title,
      meetingCode: r.meeting_code,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })
  )
})

api.post('/meetings', requireAuth, async (c) => {
  const u = c.get('user') as AuthUser
  let body: { title?: string } = {}
  try {
    body = (await c.req.json()) as { title?: string }
  } catch {
    return c.json(errorResponse('JSON 본문이 필요합니다.'), 400)
  }
  const title = String(body.title || '').trim()
  if (!title) {
    return c.json(errorResponse('회의 제목을 입력하세요.'), 400)
  }
  const dname = userDisplayNameRow(u)
  const t = nowIso()
  for (let attempt = 0; attempt < 12; attempt++) {
    const id = randomId()
    const code = randomMeetingCode(8)
    try {
      await c.env.DB.batch([
        c.env.DB.prepare(
          `INSERT INTO ms12_rooms (id, host_user_id, title, meeting_code, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'open', ?, ?)`
        ).bind(id, u.id, title, code, t, t),
        c.env.DB.prepare(
          `INSERT INTO ms12_room_participants
           (meeting_id, user_id, display_name, role, joined_at, left_at, attendance_status)
           VALUES (?, ?, ?, 'host', ?, NULL, 'in')`
        ).bind(id, u.id, dname, t),
      ])
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
      return c.json(errorResponse('회의를 만들 수 없습니다.'), 500)
    }
  }
  return c.json(errorResponse('회의 코드 충돌 — 잠시 후 다시 시도하세요.'), 500)
})

api.post('/meetings/join', requireAuth, async (c) => {
  const u = c.get('user') as AuthUser
  let body: { meetingCode?: string } = {}
  try {
    body = (await c.req.json()) as { meetingCode?: string }
  } catch {
    return c.json(errorResponse('JSON 본문이 필요합니다.'), 400)
  }
  const raw = String(body.meetingCode || '').trim().replace(/[\s-]/g, '').toUpperCase()
  if (raw.length < 4) {
    return c.json(errorResponse('회의 코드를 입력하세요.'), 400)
  }
  const room = await c.env.DB.prepare(
    `SELECT id, title, host_user_id, meeting_code, status FROM ms12_rooms
     WHERE UPPER(meeting_code) = UPPER(?)`
  )
    .bind(raw)
    .first<Record<string, unknown>>()
  if (!room || (room.status as string) === 'ended') {
    return c.json(errorResponse('해당 코드의 회의를 찾을 수 없습니다.'), 404)
  }
  const id = String(room.id)
  const t = nowIso()
  const dname = userDisplayNameRow(u)
  const hostId = room.host_user_id as number
  const role: 'host' | 'participant' = u.id === hostId ? 'host' : 'participant'
  try {
    await c.env.DB.prepare(
      `INSERT INTO ms12_room_participants
       (meeting_id, user_id, display_name, role, joined_at, left_at, attendance_status)
       VALUES (?, ?, ?, ?, ?, NULL, 'in')
       ON CONFLICT(meeting_id, user_id) DO UPDATE SET
         display_name = excluded.display_name,
         role = excluded.role,
         joined_at = excluded.joined_at,
         left_at = NULL,
         attendance_status = 'in'`
    )
      .bind(id, u.id, dname, role, t)
      .run()
  } catch (e) {
    console.error('[ms12] join', e)
    return c.json(errorResponse('입장에 실패했습니다.'), 500)
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
