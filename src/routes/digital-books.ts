/**
 * Next 디지털 도서 / ISBN 출판 API
 * 라우트 순서: 구체적 경로(user/mine) → POST / → 동적 세그먼트
 */

import { Hono } from 'hono'
import { Bindings } from '../types/database'
import { requireAuth } from '../middleware/auth'
import { successResponse, errorResponse } from '../utils/helpers'
import { finalizeBookPublication } from '../services/publishService'
import { ean13Svg } from '../utils/ean13-svg'

const app = new Hono<{ Bindings: Bindings }>()

/** GET /api/digital-books/user/mine */
app.get('/user/mine', requireAuth, async (c) => {
  const user = c.get('user') as { id: number }
  const rows = await c.env.DB.prepare(
    `SELECT id, course_id, title, isbn_number, barcode_url, status, created_at, updated_at
     FROM digital_books WHERE user_id = ? ORDER BY updated_at DESC`,
  )
    .bind(user.id)
    .all()
  return c.json(successResponse(rows.results ?? []))
})

/** POST /api/digital-books — 초안 생성 */
app.post('/', requireAuth, async (c) => {
  const user = c.get('user') as { id: number }
  const body = await c.req.json<{ title?: string; course_id?: number; content_json?: unknown }>()
  const title = (body.title || '').trim()
  if (!title) return c.json(errorResponse('제목이 필요합니다'), 400)

  const content = JSON.stringify(body.content_json ?? {})
  const r = await c.env.DB.prepare(
    `INSERT INTO digital_books (user_id, course_id, title, content_json, status) VALUES (?, ?, ?, ?, 'draft')`,
  )
    .bind(user.id, body.course_id ?? null, title, content)
    .run()

  const id = r.meta.last_row_id
  return c.json(successResponse({ id, title, status: 'draft' }))
})

/** POST /api/digital-books/submissions — 출판 승인 대기열 제출 (PDF URL 등) */
app.post('/submissions', requireAuth, async (c) => {
  const user = c.get('user') as { id: number }
  const body = await c.req.json<{
    title?: string
    author_name?: string
    summary?: string
    manuscript_url?: string
    author_intent?: string
  }>()
  const title = (body.title || '').trim()
  const author_name = (body.author_name || '').trim()
  if (!title || !author_name) {
    return c.json(errorResponse('제목과 작가명은 필수입니다'), 400)
  }
  const summary = (body.summary || '').trim()
  const manuscript_url = (body.manuscript_url || '').trim()
  const author_intent = (body.author_intent || '').trim()
  if (!manuscript_url) {
    return c.json(errorResponse('원고 파일 URL(PDF)이 필요합니다'), 400)
  }
  try {
    const r = await c.env.DB.prepare(
      `INSERT INTO book_submissions (user_id, title, author_name, summary, manuscript_url, author_intent, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))`,
    )
      .bind(user.id, title, author_name, summary, manuscript_url, author_intent)
      .run()
    const id = r.meta.last_row_id
    return c.json(successResponse({ id, status: 'pending' }))
  } catch (e) {
    console.error('book_submissions insert:', e)
    return c.json(errorResponse('제출 저장 실패 (테이블 마이그레이션 여부 확인)'), 500)
  }
})

/** POST /api/digital-books/:id/publish */
app.post('/:id/publish', requireAuth, async (c) => {
  const user = c.get('user') as { id: number }
  const bookId = parseInt(c.req.param('id'), 10)
  if (Number.isNaN(bookId)) return c.json(errorResponse('잘못된 ID'), 400)

  const book = await c.env.DB.prepare(
    `SELECT db.*, c.isbn_enabled, c.category_group FROM digital_books db
     LEFT JOIN courses c ON c.id = db.course_id
     WHERE db.id = ? AND db.user_id = ?`,
  )
    .bind(bookId, user.id)
    .first<{
      id: number
      course_id: number | null
      isbn_enabled: number | null
      category_group: string | null
    }>()

  if (!book) return c.json(errorResponse('도서를 찾을 수 없습니다'), 404)

  const isNext = (book.category_group || '').toUpperCase() === 'NEXT'
  const isbnOn = isNext && Number(book.isbn_enabled) === 1

  const result = await finalizeBookPublication(c.env.DB, bookId, user.id, isbnOn)
  if ('skipped' in result && result.skipped) {
    return c.json(successResponse({ book_id: bookId, status: 'published', isbn: null }))
  }
  if (!result.ok) {
    return c.json(errorResponse(result.reason), 400)
  }
  return c.json(
    successResponse({
      book_id: bookId,
      status: 'published',
      isbn: result.isbn,
      barcode_url: result.barcodePath,
    }),
  )
})

/** GET /api/digital-books/:id/barcode.svg */
app.get('/:id/barcode.svg', async (c) => {
  const bookId = parseInt(c.req.param('id'), 10)
  if (Number.isNaN(bookId)) return c.text('Not found', 404)

  const row = await c.env.DB.prepare(`SELECT isbn_number FROM digital_books WHERE id = ?`)
    .bind(bookId)
    .first<{ isbn_number: string | null }>()

  if (!row?.isbn_number) return c.text('Not found', 404)

  const svg = ean13Svg(row.isbn_number)
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
})

/** GET /api/digital-books/:id/marc.json */
app.get('/:id/marc.json', requireAuth, async (c) => {
  const user = c.get('user') as { id: number }
  const bookId = parseInt(c.req.param('id'), 10)
  const row = await c.env.DB.prepare(
    `SELECT db.*, u.name as author_name FROM digital_books db
     JOIN users u ON u.id = db.user_id
     WHERE db.id = ? AND db.user_id = ?`,
  )
    .bind(bookId, user.id)
    .first<Record<string, unknown>>()

  if (!row) return c.json(errorResponse('없음'), 404)

  return c.json(
    successResponse({
      title: row.title,
      isbn13: row.isbn_number,
      author: row.author_name,
      status: row.status,
      updated_at: row.updated_at,
      note: '도서관 납본 XML은 추후 확장',
    }),
  )
})

export default app
