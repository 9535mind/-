/**
 * 커뮤니티 일반 게시글 — GET/POST /api/posts, GET /api/posts/:id
 */

import { Hono } from 'hono'
import { Bindings, User } from '../types/database'
import { successResponse, errorResponse } from '../utils/helpers'
import { optionalAuth, requireAuth } from '../middleware/auth'

const ALLOWED_CATEGORIES = new Set(['qna', 'review', 'general'])

function sanitizePostContent(html: string): string {
  return String(html || '').replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
}

const posts = new Hono<{ Bindings: Bindings; Variables: { user?: User } }>()

posts.get('/', optionalAuth, async (c) => {
  const { DB } = c.env
  try {
    const result = await DB.prepare(
      `
      SELECT id, title, author, category, created_at, updated_at, view_count
      FROM posts
      WHERE is_published = 1
      ORDER BY datetime(created_at) DESC
      LIMIT 200
    `,
    ).all()
    return c.json(successResponse(result.results ?? []))
  } catch (e) {
    console.error('[posts] list:', e)
    return c.json(errorResponse('게시글 목록을 불러오지 못했습니다.'), 500)
  }
})

posts.get('/:id', optionalAuth, async (c) => {
  const { DB } = c.env
  const id = parseInt(c.req.param('id'), 10)
  if (!Number.isFinite(id)) return c.json(errorResponse('잘못된 ID입니다.'), 400)

  try {
    await DB.prepare(
      `
      UPDATE posts
      SET view_count = COALESCE(view_count, 0) + 1
      WHERE id = ? AND is_published = 1
    `,
    )
      .bind(id)
      .run()

    const row = await DB.prepare(
      `
      SELECT id, title, content, author, category, created_at, updated_at, view_count
      FROM posts
      WHERE id = ? AND is_published = 1
    `,
    )
      .bind(id)
      .first()

    if (!row) return c.json(errorResponse('게시글을 찾을 수 없습니다.'), 404)
    return c.json(successResponse(row))
  } catch (e) {
    console.error('[posts] detail:', e)
    return c.json(errorResponse('게시글을 불러오지 못했습니다.'), 500)
  }
})

posts.post('/', requireAuth, async (c) => {
  const { DB } = c.env
  const user = c.get('user') as User
  if (!user || user.status === 'withdrawn' || user.deleted_at) {
    return c.json(errorResponse('게시할 수 없는 계정입니다.'), 403)
  }

  try {
    const body = (await c.req.json()) as {
      title?: string
      content?: string | null
      category?: string
    }
    const title = String(body.title || '').trim()
    if (!title) return c.json(errorResponse('제목을 입력해 주세요.'), 400)
    const rawCat = String(body.category || 'general').toLowerCase()
    const category = ALLOWED_CATEGORIES.has(rawCat) ? rawCat : 'general'
    const content = sanitizePostContent(body.content != null ? String(body.content) : '')
    const author = String(user.name || user.email || '회원').trim() || '회원'

    let lastId: number | undefined
    try {
      const result = await DB.prepare(
        `
        INSERT INTO posts (title, content, author, category, is_published, view_count, user_id)
        VALUES (?, ?, ?, ?, 1, 0, ?)
      `,
      )
        .bind(title, content || null, author, category, user.id)
        .run()
      lastId = result.meta.last_row_id as number
    } catch {
      const result = await DB.prepare(
        `
        INSERT INTO posts (title, content, author, category, is_published, view_count)
        VALUES (?, ?, ?, ?, 1, 0)
      `,
      )
        .bind(title, content || null, author, category)
        .run()
      lastId = result.meta.last_row_id as number
    }

    return c.json(successResponse({ id: lastId }, '등록되었습니다.'))
  } catch (e) {
    console.error('[posts] create:', e)
    return c.json(errorResponse('게시글 등록에 실패했습니다.'), 500)
  }
})

export default posts
