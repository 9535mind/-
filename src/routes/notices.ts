/**
 * 학생용 공개 공지 API — GET /api/notices, GET /api/notices/:id
 */

import { Hono } from 'hono'
import { Bindings, User } from '../types/database'
import { successResponse, errorResponse } from '../utils/helpers'
import { optionalAuth } from '../middleware/auth'

const notices = new Hono<{ Bindings: Bindings; Variables: { user?: User } }>()

/** B2B 소속 학생: 전체(target_org_id IS NULL) + 소속 기관 전용. 비로그인·미소속: 전체만 */
function visibilityFragment(orgId: number | null | undefined): {
  sql: string
  listBinds: number[]
  detailBinds: (id: number) => number[]
} {
  if (orgId != null && Number.isFinite(Number(orgId))) {
    const oid = Number(orgId)
    return {
      sql: '(target_org_id IS NULL OR target_org_id = ?)',
      listBinds: [oid],
      detailBinds: (id: number) => [id, oid],
    }
  }
  return {
    sql: 'target_org_id IS NULL',
    listBinds: [],
    detailBinds: (id: number) => [id],
  }
}

notices.get('/', optionalAuth, async (c) => {
  const { DB } = c.env
  const user = c.get('user') as User | undefined
  const orgId = user?.org_id

  const { sql: vis, listBinds } = visibilityFragment(orgId)

  try {
    const result = await DB.prepare(
      `
      SELECT id, title, is_pinned, created_at, updated_at, view_count
      FROM notices
      WHERE is_published = 1 AND ${vis}
      ORDER BY is_pinned DESC, datetime(created_at) DESC
    `,
    )
      .bind(...listBinds)
      .all()

    return c.json(successResponse(result.results ?? []))
  } catch (e) {
    console.error('[notices] list:', e)
    return c.json(errorResponse('공지 목록을 불러오지 못했습니다.'), 500)
  }
})

notices.get('/:id', optionalAuth, async (c) => {
  const { DB } = c.env
  const id = parseInt(c.req.param('id'), 10)
  if (!Number.isFinite(id)) return c.json(errorResponse('잘못된 ID입니다.'), 400)

  const user = c.get('user') as User | undefined
  const { sql: vis, detailBinds } = visibilityFragment(user?.org_id)
  const binds = detailBinds(id)

  try {
    await DB.prepare(
      `
      UPDATE notices
      SET view_count = COALESCE(view_count, 0) + 1
      WHERE id = ? AND is_published = 1 AND ${vis}
    `,
    )
      .bind(...binds)
      .run()

    const row = await DB.prepare(
      `
      SELECT id, title, content, is_pinned, created_at, updated_at, view_count
      FROM notices
      WHERE id = ? AND is_published = 1 AND ${vis}
    `,
    )
      .bind(...binds)
      .first()

    if (!row) return c.json(errorResponse('공지를 찾을 수 없습니다.'), 404)
    return c.json(successResponse(row))
  } catch (e) {
    console.error('[notices] detail:', e)
    return c.json(errorResponse('공지를 불러오지 못했습니다.'), 500)
  }
})

export default notices
