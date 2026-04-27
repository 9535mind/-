/**
 * ═══ FOREST ZONE (FROZEN) ═══ 임의 수정·MS12 API와 합치기·리팩터 금지. docs/FOREST-FROZEN.md
 *
 * POST /api/forest-results — JTT-Kinder 집단 결과 D1 저장 (로그인 필수, request_id·user_id 기록)
 * GET  /api/forest-results/:id — 단건 조회 (본인 또는 관리자)
 */

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { Bindings } from '../types/database'
import { getCurrentUser } from '../utils/helpers'
import { isForestAdminRole } from '../utils/forest-admin'
import { requireAuth } from '../middleware/auth'

const MAX_SCORES_BYTES = 512 * 1024
const MAX_REQUEST_ID_LEN = 200
const MAX_EXPERT_COMMENTARY_LEN = 12000

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
  const request_id = String(b.request_id ?? (b as { requestId?: unknown }).requestId ?? '').trim()
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

/**
 * GET /api/forest-results/commentary?request_id=
 * 본인 소유 행 또는 관리자만 expert_commentary 조회
 */
forestResults.get('/commentary', requireAuth, async (c) => {
  const { DB } = c.env
  const user = c.get('user') as { id: number; role?: string }
  const requestId = (c.req.query('request_id') || '').trim()
  if (!requestId) {
    return c.json({ success: false, error: 'request_id is required', message: 'request_id is required' }, 400)
  }
  if (requestId.length > MAX_REQUEST_ID_LEN) {
    return c.json({ success: false, error: 'request_id too long', message: 'request_id too long' }, 400)
  }
  if (!DB) {
    return c.json({ success: false, error: 'DB unavailable', message: 'DB unavailable' }, 503)
  }

  let row: { expert_commentary: string | null; user_id: number | null } | null = null
  try {
    row = (await DB.prepare(
      `SELECT expert_commentary, user_id FROM forest_group_results WHERE request_id = ? LIMIT 1`,
    )
      .bind(requestId)
      .first()) as { expert_commentary: string | null; user_id: number | null } | null
  } catch (e) {
    console.error('[forest-results] commentary get', e)
    return c.json({ success: false, error: 'lookup failed', message: 'lookup failed' }, 500)
  }

  if (!row) {
    return c.json({
      success: true,
      data: { expert_commentary: null as string | null, has_row: false },
    })
  }

  const uid = Number(user.id)
  const ownerId = row.user_id != null ? Number(row.user_id) : NaN
  const isAdmin = isForestAdminRole(user.role)
  if (!isAdmin && (Number.isNaN(ownerId) || ownerId !== uid)) {
    return c.json({ success: false, error: 'forbidden', message: '열람 권한이 없습니다.' }, 403)
  }

  return c.json({
    success: true,
    data: {
      expert_commentary: row.expert_commentary ?? null,
      has_row: true,
    },
  })
})

/**
 * PUT /api/forest-results/commentary
 * body: { request_id, expert_commentary } — 관리자만
 */
forestResults.put('/commentary', requireAuth, async (c) => {
  const { DB } = c.env
  const user = c.get('user') as { id: number; role?: string }
  if (!isForestAdminRole(user.role)) {
    return c.json(
      {
        success: false,
        error: 'forbidden',
        message: '관리자만 전문가 소견을 저장할 수 있습니다.',
      },
      403,
    )
  }
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
    return c.json({ success: false, error: 'Invalid body', message: 'Invalid body' }, 400)
  }
  const b = body as Record<string, unknown>
  const request_id = String(b.request_id ?? '').trim()
  if (!request_id || request_id.length > MAX_REQUEST_ID_LEN) {
    return c.json(
      { success: false, error: 'request_id is required', message: 'request_id is required' },
      400,
    )
  }
  if (b.expert_commentary === undefined || b.expert_commentary === null) {
    return c.json(
      { success: false, error: 'expert_commentary is required', message: 'expert_commentary is required' },
      400,
    )
  }
  const expert_commentary = String(b.expert_commentary)
  if (expert_commentary.length > MAX_EXPERT_COMMENTARY_LEN) {
    return c.json(
      {
        success: false,
        error: 'expert_commentary too long',
        message: `전문가 소견은 ${MAX_EXPERT_COMMENTARY_LEN}자 이하로 입력해 주세요.`,
      },
      400,
    )
  }

  try {
    const r = await DB.prepare(
      `UPDATE forest_group_results SET expert_commentary = ? WHERE request_id = ?`,
    )
      .bind(expert_commentary, request_id)
      .run()
    if (!r.meta.changes) {
      return c.json(
        {
          success: false,
          error: 'not_found',
          message: '해당 requestId로 저장된 검사 결과가 없습니다. 먼저 결과 전송이 완료되었는지 확인해 주세요.',
        },
        404,
      )
    }
  } catch (e) {
    console.error('[forest-results] commentary put', e)
    return c.json({ success: false, error: 'update failed', message: 'update failed' }, 500)
  }

  return c.json({ success: true, message: '저장되었습니다.' })
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
