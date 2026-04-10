/**
 * 관리자 — 전자책(e-book) 스토어 상품 메타데이터
 * GET/POST/PUT/DELETE /api/admin/ebook-store/products
 */

import { Hono } from 'hono'
import { Bindings } from '../types/database'
import { requireAdmin } from '../middleware/auth'
import { successResponse, errorResponse } from '../utils/helpers'

const adminEbookStore = new Hono<{ Bindings: Bindings }>()

function normalizeStatus(raw: unknown): 'draft' | 'published' | null {
  const s = String(raw ?? 'draft')
    .trim()
    .toLowerCase()
  if (s === 'draft' || s === 'published') return s
  return null
}

adminEbookStore.get('/ebook-store/products', requireAdmin, async (c) => {
  const { DB } = c.env
  try {
    const rows = await DB.prepare(
      `SELECT id, title, author, isbn, price, cover_image_url, description, pdf_object_key, status, created_at, updated_at
       FROM ebook_store_products ORDER BY updated_at DESC`,
    ).all()
    return c.json(successResponse(rows.results ?? []))
  } catch (e) {
    console.error('[admin/ebook-store/products] GET', e)
    return c.json(errorResponse('전자책 목록을 불러올 수 없습니다. (마이그레이션 0066 확인)'), 500)
  }
})

adminEbookStore.post('/ebook-store/products', requireAdmin, async (c) => {
  const { DB } = c.env
  try {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
    const title = String(body.title ?? '').trim()
    if (!title) return c.json(errorResponse('도서명(제목)은 필수입니다.'), 400)
    const author = String(body.author ?? '').trim()
    const isbn = body.isbn != null ? String(body.isbn).trim().slice(0, 32) : ''
    const price = Math.max(0, parseInt(String(body.price ?? '0'), 10) || 0)
    const cover_image_url =
      body.cover_image_url != null ? String(body.cover_image_url).trim().slice(0, 2000) : ''
    const description = body.description != null ? String(body.description).trim().slice(0, 8000) : ''
    const pdf_object_key =
      body.pdf_object_key != null ? String(body.pdf_object_key).trim().slice(0, 1024) : ''
    const st = normalizeStatus(body.status)
    if (!st) return c.json(errorResponse('상태는 draft 또는 published 여야 합니다.'), 400)

    const r = await DB.prepare(
      `INSERT INTO ebook_store_products (title, author, isbn, price, cover_image_url, description, pdf_object_key, status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
      .bind(title, author, isbn || null, price, cover_image_url || null, description || null, pdf_object_key || null, st)
      .run()

    const id = r.meta.last_row_id
    return c.json(successResponse({ id }))
  } catch (e) {
    console.error('[admin/ebook-store/products] POST', e)
    return c.json(errorResponse('저장에 실패했습니다.'), 500)
  }
})

adminEbookStore.put('/ebook-store/products/:id', requireAdmin, async (c) => {
  const { DB } = c.env
  const id = parseInt(c.req.param('id'), 10)
  if (!Number.isFinite(id) || id <= 0) return c.json(errorResponse('잘못된 ID'), 400)

  try {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
    const title = String(body.title ?? '').trim()
    if (!title) return c.json(errorResponse('도서명(제목)은 필수입니다.'), 400)
    const author = String(body.author ?? '').trim()
    const isbn = body.isbn != null ? String(body.isbn).trim().slice(0, 32) : ''
    const price = Math.max(0, parseInt(String(body.price ?? '0'), 10) || 0)
    const cover_image_url =
      body.cover_image_url != null ? String(body.cover_image_url).trim().slice(0, 2000) : ''
    const description = body.description != null ? String(body.description).trim().slice(0, 8000) : ''
    const pdf_object_key =
      body.pdf_object_key != null ? String(body.pdf_object_key).trim().slice(0, 1024) : ''
    const st = normalizeStatus(body.status)
    if (!st) return c.json(errorResponse('상태는 draft 또는 published 여야 합니다.'), 400)

    const result = await DB.prepare(
      `UPDATE ebook_store_products SET
        title = ?, author = ?, isbn = ?, price = ?, cover_image_url = ?, description = ?, pdf_object_key = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`,
    )
      .bind(title, author, isbn || null, price, cover_image_url || null, description || null, pdf_object_key || null, st, id)
      .run()

    if (result.meta.changes === 0) return c.json(errorResponse('해당 상품을 찾을 수 없습니다.'), 404)
    return c.json(successResponse({ id }))
  } catch (e) {
    console.error('[admin/ebook-store/products] PUT', e)
    return c.json(errorResponse('저장에 실패했습니다.'), 500)
  }
})

adminEbookStore.delete('/ebook-store/products/:id', requireAdmin, async (c) => {
  const { DB } = c.env
  const id = parseInt(c.req.param('id'), 10)
  if (!Number.isFinite(id) || id <= 0) return c.json(errorResponse('잘못된 ID'), 400)
  try {
    const result = await DB.prepare(`DELETE FROM ebook_store_products WHERE id = ?`).bind(id).run()
    if (result.meta.changes === 0) return c.json(errorResponse('해당 상품을 찾을 수 없습니다.'), 404)
    return c.json(successResponse({ id }))
  } catch (e) {
    console.error('[admin/ebook-store/products] DELETE', e)
    return c.json(errorResponse('삭제에 실패했습니다.'), 500)
  }
})

export default adminEbookStore
