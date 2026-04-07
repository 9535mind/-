/**
 * POST /api/forest-results — JTT-Kinder(어린이 4계절 Temperament TEST) 집단 결과(기관·반, 점수 JSON) D1 저장
 * 인증 없음(공개 도구); 레이트 리밋은 index에서 적용.
 */

import { Hono } from 'hono'
import type { Bindings } from '../types/database'

const MAX_SCORES_BYTES = 512 * 1024

const forestResults = new Hono<{ Bindings: Bindings }>()

forestResults.post('/', async (c) => {
  const { DB } = c.env
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
  const institution_name = String(b.institution_name ?? '').trim()
  if (!institution_name) {
    return c.json(
      { success: false, error: 'institution_name is required', message: 'institution_name is required' },
      400
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
      400
    )
  }
  if (scoresJson.length > MAX_SCORES_BYTES) {
    return c.json({ success: false, error: 'scores too large', message: 'scores too large' }, 400)
  }

  const id = crypto.randomUUID()
  const created_at = new Date().toISOString()

  try {
    await DB.prepare(
      `INSERT INTO forest_group_results (id, institution_name, group_name, test_type, scores, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(id, institution_name, group_name, test_type, scoresJson, created_at)
      .run()
  } catch (e) {
    console.error('[forest-results] insert', e)
    return c.json(
      { success: false, error: 'Failed to save', message: 'Failed to save' },
      500
    )
  }

  return c.json({ success: true, id, created_at })
})

export default forestResults
