/**
 * 팝업 API — 공개 노출(/active) + 관리자 CRUD(/)
 * 사이트 스크립트는 이미지·링크 중심으로만 사용하고, content(HTML)는 공개 응답에서 제외합니다.
 */

import { Hono, type Context } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { Bindings } from '../types/database'
import { successResponse, errorResponse } from '../utils/helpers'
import { requireAdmin, optionalAuth } from '../middleware/auth'

type UpsertResult =
  | { ok: true; id: number }
  | { ok: false; body: ReturnType<typeof errorResponse>; status: number }

const popups = new Hono<{ Bindings: Bindings }>()

function normalizeStartDate(s: string): string {
  const t = String(s || '').trim()
  if (!t) return t
  if (t.includes('T')) return t.replace('Z', '').slice(0, 19).replace('T', ' ')
  return `${t.slice(0, 10)} 00:00:00`
}

function normalizeEndDate(s: string): string {
  const t = String(s || '').trim()
  if (!t) return t
  if (t.includes('T')) return t.replace('Z', '').slice(0, 19).replace('T', ' ')
  return `${t.slice(0, 10)} 23:59:59`
}

/** 공개: 활성 팝업 (이미지·링크만) */
popups.get('/active', optionalAuth, async (c) => {
  const { DB } = c.env
  const user = c.get('user') as { id?: number } | undefined
  const uid = user?.id

  const hiddenPopupsStr = getCookie(c, 'hidden_popups') || '[]'
  let hiddenPopups: number[] = []
  try {
    hiddenPopups = JSON.parse(hiddenPopupsStr)
    if (!Array.isArray(hiddenPopups)) hiddenPopups = []
  } catch {
    hiddenPopups = []
  }

  try {
    let sql: string
    let binds: (string | number)[] = []

    if (!uid) {
      sql = `
        SELECT id, title, image_url, link_url, link_text, display_type, priority, start_date, end_date
        FROM popups
        WHERE is_active = 1
          AND datetime('now') BETWEEN start_date AND end_date
          AND IFNULL(target_audience, 'all') = 'all'
        ORDER BY priority ASC, created_at DESC
        LIMIT 10
      `
    } else {
      sql = `
        SELECT p.id, p.title, p.image_url, p.link_url, p.link_text, p.display_type, p.priority, p.start_date, p.end_date
        FROM popups p
        WHERE p.is_active = 1
          AND datetime('now') BETWEEN p.start_date AND p.end_date
          AND (
            IFNULL(p.target_audience, 'all') = 'all'
            OR (
              p.target_audience = 'b2b'
              AND EXISTS (
                SELECT 1 FROM users u
                WHERE u.id = ?
                  AND u.deleted_at IS NULL
                  AND u.org_id IS NOT NULL
                  AND (p.org_id IS NULL OR p.org_id = u.org_id)
              )
            )
          )
        ORDER BY p.priority ASC, p.created_at DESC
        LIMIT 10
      `
      binds = [uid]
    }

    const result = await DB.prepare(sql).bind(...binds).all()
    const rows = (result.results ?? []) as Record<string, unknown>[]
    const filtered = rows.filter((r) => !hiddenPopups.includes(Number(r.id)))

    return c.json(successResponse(filtered))
  } catch (error) {
    console.error('Get active popups error:', error)
    return c.json(errorResponse('팝업을 불러오는데 실패했습니다.'), 500)
  }
})

popups.post('/:id/view', async (c) => {
  const { DB } = c.env
  const popupId = parseInt(c.req.param('id'), 10)
  if (!Number.isFinite(popupId)) return c.json(errorResponse('잘못된 ID입니다.'), 400)
  try {
    await DB.prepare(`UPDATE popups SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ?`)
      .bind(popupId)
      .run()
  } catch (e) {
    console.warn('[popups] view increment:', e)
  }
  return c.json(successResponse(null, 'ok'))
})

popups.post('/:id/click', async (c) => {
  const { DB } = c.env
  const popupId = parseInt(c.req.param('id'), 10)
  if (!Number.isFinite(popupId)) return c.json(errorResponse('잘못된 ID입니다.'), 400)
  try {
    await DB.prepare(`UPDATE popups SET click_count = COALESCE(click_count, 0) + 1 WHERE id = ?`)
      .bind(popupId)
      .run()
  } catch (e) {
    console.warn('[popups] click increment:', e)
  }
  return c.json(successResponse(null, 'ok'))
})

popups.post('/:id/close', async (c) => {
  try {
    const popupId = parseInt(c.req.param('id'), 10)
    const body = await c.req.json().catch(() => ({}))
    const dontShowToday = Boolean((body as { dontShowToday?: boolean }).dontShowToday)

    if (dontShowToday && Number.isFinite(popupId)) {
      const hiddenPopupsStr = getCookie(c, 'hidden_popups') || '[]'
      let hiddenPopups: number[] = []
      try {
        hiddenPopups = JSON.parse(hiddenPopupsStr)
        if (!Array.isArray(hiddenPopups)) hiddenPopups = []
      } catch {
        hiddenPopups = []
      }
      if (!hiddenPopups.includes(popupId)) hiddenPopups.push(popupId)

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)

      setCookie(c, 'hidden_popups', JSON.stringify(hiddenPopups), {
        expires: tomorrow,
        path: '/',
        httpOnly: false,
        sameSite: 'Lax',
      })
    }

    return c.json(successResponse(null, '팝업이 닫혔습니다.'))
  } catch (error) {
    console.error('Close popup error:', error)
    return c.json(errorResponse('팝업 닫기에 실패했습니다.'), 500)
  }
})

/** 관리자: 목록 */
popups.get('/', requireAdmin, async (c) => {
  const { DB } = c.env
  try {
    const result = await DB.prepare(`
      SELECT
        p.id, p.title, p.content, p.image_url, p.link_url, p.link_text,
        p.start_date, p.end_date, p.priority, p.display_type, p.is_active,
        p.target_audience, p.org_id,
        COALESCE(p.view_count, 0) AS view_count,
        COALESCE(p.click_count, 0) AS click_count,
        o.name AS organization_name,
        p.created_at, p.updated_at
      FROM popups p
      LEFT JOIN organizations o ON o.id = p.org_id
      ORDER BY p.priority ASC, p.created_at DESC
    `).all()

    return c.json(successResponse(result.results ?? []))
  } catch (e) {
    console.warn('[popups] list with org join failed, fallback:', e)
    try {
      const result = await DB.prepare(`
        SELECT
          id, title, content, image_url, link_url, link_text,
          start_date, end_date, priority, display_type, is_active,
          target_audience, org_id,
          COALESCE(view_count, 0) AS view_count,
          COALESCE(click_count, 0) AS click_count,
          NULL AS organization_name,
          created_at, updated_at
        FROM popups
        ORDER BY priority ASC, created_at DESC
      `).all()
      return c.json(successResponse(result.results ?? []))
    } catch (error) {
      console.error('Get popups error:', error)
      return c.json(errorResponse('팝업 목록을 불러오는데 실패했습니다.'), 500)
    }
  }
})

/** 관리자: 단건 */
popups.get('/:id', requireAdmin, async (c) => {
  const { DB } = c.env
  const popupId = parseInt(c.req.param('id'), 10)
  if (!Number.isFinite(popupId)) {
    return c.json(errorResponse('잘못된 ID입니다.'), 400)
  }

  try {
    const row = await DB.prepare(`
      SELECT
        p.id, p.title, p.content, p.image_url, p.link_url, p.link_text,
        p.start_date, p.end_date, p.priority, p.display_type, p.is_active,
        p.target_audience, p.org_id,
        o.name AS organization_name,
        p.created_at, p.updated_at
      FROM popups p
      LEFT JOIN organizations o ON o.id = p.org_id
      WHERE p.id = ?
    `).bind(popupId).first()

    if (!row) return c.json(errorResponse('팝업을 찾을 수 없습니다.'), 404)
    return c.json(successResponse(row))
  } catch {
    try {
      const row = await DB.prepare(`
        SELECT id, title, content, image_url, link_url, link_text,
          start_date, end_date, priority, display_type, is_active,
          target_audience, org_id,
          COALESCE(view_count, 0) AS view_count,
          COALESCE(click_count, 0) AS click_count,
          created_at, updated_at
        FROM popups WHERE id = ?
      `).bind(popupId).first()
      if (!row) return c.json(errorResponse('팝업을 찾을 수 없습니다.'), 404)
      return c.json(successResponse(row))
    } catch (error) {
      console.error('Get popup error:', error)
      return c.json(errorResponse('팝업 조회에 실패했습니다.'), 500)
    }
  }
})

async function upsertPopupBody(c: Context<{ Bindings: Bindings }>, popupId: number | null): Promise<UpsertResult> {
  const { DB } = c.env
  const body = (await c.req.json()) as {
    title?: string
    content?: string | null
    image_url?: string | null
    link_url?: string | null
    link_text?: string | null
    start_date?: string
    end_date?: string
    priority?: number
    display_type?: string
    is_active?: number | boolean
    target_audience?: string
    org_id?: number | string | null
  }

  const title = String(body.title || '').trim()
  const startRaw = String(body.start_date || '').trim()
  const endRaw = String(body.end_date || '').trim()
  if (!title || !startRaw || !endRaw) {
    return { ok: false, body: errorResponse('제목·시작일·종료일은 필수입니다.'), status: 400 }
  }

  const start_date = normalizeStartDate(startRaw)
  const end_date = normalizeEndDate(endRaw)
  const content = body.content != null ? String(body.content) : null
  const image_url = body.image_url != null && String(body.image_url).trim() !== '' ? String(body.image_url).trim() : null
  const link_url = body.link_url != null && String(body.link_url).trim() !== '' ? String(body.link_url).trim() : null
  const link_text = body.link_text != null && String(body.link_text).trim() !== '' ? String(body.link_text).trim() : null
  const priority = Math.max(0, parseInt(String(body.priority ?? 0), 10) || 0)
  const display_type = String(body.display_type || 'modal').trim() || 'modal'
  const is_active = body.is_active != null ? (Number(body.is_active) ? 1 : 0) : 1

  let target_audience = String(body.target_audience || 'all').toLowerCase().trim()
  if (target_audience !== 'b2b') target_audience = 'all'

  let org_id: number | null = null
  if (target_audience === 'b2b' && body.org_id != null && String(body.org_id).trim() !== '') {
    const n = parseInt(String(body.org_id), 10)
    org_id = Number.isFinite(n) ? n : null
  }

  if (popupId == null) {
    const result = await DB.prepare(`
      INSERT INTO popups (
        title, content, image_url, link_url, link_text,
        start_date, end_date, priority, display_type, is_active,
        target_audience, org_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      title,
      content,
      image_url,
      link_url,
      link_text,
      start_date,
      end_date,
      priority,
      display_type,
      is_active,
      target_audience,
      org_id,
    ).run()
    return { ok: true, id: result.meta.last_row_id as number }
  }

  const existing = await DB.prepare(`SELECT id FROM popups WHERE id = ?`).bind(popupId).first()
  if (!existing) {
    return { ok: false, body: errorResponse('팝업을 찾을 수 없습니다.'), status: 404 }
  }

  await DB.prepare(`
    UPDATE popups SET
      title = ?,
      content = ?,
      image_url = ?,
      link_url = ?,
      link_text = ?,
      start_date = ?,
      end_date = ?,
      priority = ?,
      display_type = ?,
      is_active = ?,
      target_audience = ?,
      org_id = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    title,
    content,
    image_url,
    link_url,
    link_text,
    start_date,
    end_date,
    priority,
    display_type,
    is_active,
    target_audience,
    org_id,
    popupId,
  ).run()

  return { ok: true, id: popupId }
}

popups.post('/', requireAdmin, async (c) => {
  try {
    const out = await upsertPopupBody(c, null)
    if (!out.ok) return c.json(out.body, out.status)
    return c.json(successResponse({ id: out.id }, '팝업이 등록되었습니다.'))
  } catch (error) {
    console.error('Create popup error:', error)
    return c.json(errorResponse('팝업 등록에 실패했습니다.'), 500)
  }
})

popups.put('/:id', requireAdmin, async (c) => {
  const popupId = parseInt(c.req.param('id'), 10)
  if (!Number.isFinite(popupId)) return c.json(errorResponse('잘못된 ID입니다.'), 400)
  try {
    const out = await upsertPopupBody(c, popupId)
    if (!out.ok) return c.json(out.body, out.status)
    return c.json(successResponse({ id: out.id }, '팝업이 수정되었습니다.'))
  } catch (error) {
    console.error('Update popup error:', error)
    return c.json(errorResponse('팝업 수정에 실패했습니다.'), 500)
  }
})

popups.patch('/:id', requireAdmin, async (c) => {
  const popupId = parseInt(c.req.param('id'), 10)
  if (!Number.isFinite(popupId)) return c.json(errorResponse('잘못된 ID입니다.'), 400)
  try {
    const out = await upsertPopupBody(c, popupId)
    if (!out.ok) return c.json(out.body, out.status)
    return c.json(successResponse({ id: out.id }, '팝업이 수정되었습니다.'))
  } catch (error) {
    console.error('Patch popup error:', error)
    return c.json(errorResponse('팝업 수정에 실패했습니다.'), 500)
  }
})

popups.delete('/:id', requireAdmin, async (c) => {
  const { DB } = c.env
  const popupId = parseInt(c.req.param('id'), 10)
  if (!Number.isFinite(popupId)) return c.json(errorResponse('잘못된 ID입니다.'), 400)

  try {
    const existing = await DB.prepare(`SELECT id FROM popups WHERE id = ?`).bind(popupId).first()
    if (!existing) return c.json(errorResponse('팝업을 찾을 수 없습니다.'), 404)

    await DB.prepare(`DELETE FROM popups WHERE id = ?`).bind(popupId).run()
    return c.json(successResponse(null, '팝업이 삭제되었습니다.'))
  } catch (error) {
    console.error('Delete popup error:', error)
    return c.json(errorResponse('팝업 삭제에 실패했습니다.'), 500)
  }
})

export default popups
