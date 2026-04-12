/**
 * POST /api/forest-results — JTT-Kinder 집단 결과 D1 저장 (로그인 필수, request_id·user_id 기록)
 * GET  /api/forest-results/:id — 단건 조회 (본인 또는 관리자)
 */

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { Bindings } from '../types/database'
import { getCurrentUser } from '../utils/helpers'
import { requireAuth } from '../middleware/auth'

const MAX_SCORES_BYTES = 512 * 1024
const MAX_REQUEST_ID_LEN = 200

function isForestAdminRole(role: unknown): boolean {
  return String(role ?? '')
    .trim()
    .toLowerCase() === 'admin'
}

const forestResults = new Hono<{ Bindings: Bindings }>()

forestResults.post('/', requireAuth, async (c) => {
  const { DB } = c.env
  const user = c.get('user') as { id: number; role?: string }
  if (!DB) {
    return c.json({ success: false, error: 'DB unavailable', message: 'DB unavailable' }, 503)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'Invalid JSON', message: 'Invalid JSON' }, 400)
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return c.json({ success: false, error: 'Body must be a JSON object', message: 'Body must be a JSON object' }, 400)
  }

  const b = body as Record<string, unknown>
  const request_id = String(b.request_id ?? '').trim()
  if (!request_id) {
    return c.json(
      { success: false, error: 'request_id is required', message: 'request_id is required' },
      400,
    )
  }
  if (request_id.length > MAX_REQUEST_ID_LEN) {
    return c.json({ success: false, error: 'request_id too long', message: 'request_id too long' }, 400)
  }

  const institution_name = String(b.institution_name ?? '').trim()
  if (!institution_name) {
    return c.json(
      { success: false, error: 'institution_name is required', message: 'institution_name is required' },
      400,
    )
  }
  if (institution_name.length > 300) {
    return c.json({ success: false, error: 'institution_name too long', message: 'institution_name too long' }, 400)
  }

  const group_name = String(b.group_name ?? '').trim().slice(0, 200)
  const test_type = String(b.test_type ?? '').trim().slice(0, 64) || 'unspecified'

  const scoresVal = b.scores
  if (scoresVal === undefined || scoresVal === null) {
    return c.json({ success: false, error: 'scores is required', message: 'scores is required' }, 400)
  }

  /** 요청 본문 최상단 target_group 은 scores JSON 에 없을 때만 병합(D1 scores 컬럼에 보존). */
  let scoresForDb: unknown = scoresVal
  if (scoresVal !== null && typeof scoresVal === 'object' && !Array.isArray(scoresVal)) {
    const o = { ...(scoresVal as Record<string, unknown>) }
    const tgTop = typeof b.target_group === 'string' ? b.target_group.trim().slice(0, 32) : ''
    if (tgTop && o.target_group === undefined) o.target_group = tgTop
    const obsTop = typeof b.observation_stage === 'string' ? b.observation_stage.trim().slice(0, 16) : ''
    if (obsTop && o.observation_stage === undefined) o.observation_stage = obsTop
    const rawTop = b.rawInputs ?? b.raw_inputs
    if (rawTop !== null && typeof rawTop === 'object' && !Array.isArray(rawTop)) {
      o.rawInputs = rawTop
    }
    scoresForDb = o
  }

  let scoresJson: string
  try {
    scoresJson = JSON.stringify(scoresForDb)
  } catch {
    return c.json(
      { success: false, error: 'scores must be JSON-serializable', message: 'scores must be JSON-serializable' },
      400,
    )
  }
  if (scoresJson.length > MAX_SCORES_BYTES) {
    return c.json({ success: false, error: 'scores too large', message: 'scores too large' }, 400)
  }

  const id = crypto.randomUUID()
  const created_at = new Date().toISOString()
  const ownerId = Number(user.id)

  try {
    await DB.prepare(
      `INSERT INTO forest_group_results (id, institution_name, group_name, test_type, scores, created_at, user_id, request_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(id, institution_name, group_name, test_type, scoresJson, created_at, ownerId, request_id)
      .run()
  } catch (e: unknown) {
    const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : ''
    if (/UNIQUE constraint failed|constraint failed/i.test(msg)) {
      return c.json(
        { success: false, error: 'duplicate_request_id', message: '이미 등록된 보고서 요청 ID입니다.' },
        409,
      )
    }
    console.error('[forest-results] insert', e)
    return c.json({ success: false, error: 'Failed to save', message: 'Failed to save' }, 500)
  }

  return c.json({ success: true, id, created_at })
})

forestResults.get('/:id', requireAuth, async (c) => {
  const { DB } = c.env
  const user = c.get('user') as { id: number; role?: string }
  const rowId = (c.req.param('id') || '').trim()
  if (!rowId) {
    return c.json({ success: false, error: 'id is required', message: 'id is required' }, 400)
  }
  if (!DB) {
    return c.json({ success: false, error: 'DB unavailable', message: 'DB unavailable' }, 503)
  }

  let row: Record<string, unknown> | null = null
  try {
    row = (await DB.prepare(
      `SELECT id, institution_name, group_name, test_type, scores, created_at, user_id, request_id
       FROM forest_group_results WHERE id = ?`,
    )
      .bind(rowId)
      .first()) as Record<string, unknown> | null
  } catch (e) {
    console.error('[forest-results] get', e)
    return c.json({ success: false, error: 'lookup failed', message: 'lookup failed' }, 500)
  }

  if (!row) {
    return c.json({ success: false, error: 'not_found', message: '결과를 찾을 수 없습니다.' }, 404)
  }

  const uid = Number(user.id)
  const ownerId = row.user_id != null ? Number(row.user_id) : NaN
  const isAdmin = isForestAdminRole(user.role)
  if (!isAdmin && (Number.isNaN(ownerId) || ownerId !== uid)) {
    return c.json({ success: false, error: 'forbidden', message: '본인 검사 결과만 열람할 수 있습니다.' }, 403)
  }

  return c.json({ success: true, data: row })
})

export default forestResults
