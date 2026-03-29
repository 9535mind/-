/**
 * Security event logging routes
 * POST /api/security/record — 권장
 * POST /api/security/log — 구버전·캐시 클라이언트 별칭 (동일 핸들러)
 *
 * DB/삽입 실패 시에도 UX 보호를 위해 로그만 남기고 200 응답 (비콘성 호출).
 * event_type 누락만 400.
 */

import type { Context } from 'hono'
import { Hono } from 'hono'
import type { Bindings } from '../types/database'
import { optionalAuth } from '../middleware/auth'
import { successResponse, errorResponse } from '../utils/helpers'

const app = new Hono<{ Bindings: Bindings }>()

type SecurityBody = {
  event_type?: string
  type?: string
  action?: string
  path?: string
  details?: unknown
}

function safeDetailsJson(details: unknown): string | null {
  if (details === undefined || details === null) return null
  try {
    const s = JSON.stringify(details)
    if (s === undefined) return null
    return s.length > 4000 ? s.slice(0, 4000) : s
  } catch {
    return null
  }
}

/** Content-Type 무관하게 본문에서 JSON 객체 파싱 시도 */
async function parseSecurityBody(c: Context): Promise<SecurityBody> {
  try {
    const ct = (c.req.header('content-type') || '').toLowerCase()
    if (ct.includes('application/json')) {
      return (await c.req.json()) as SecurityBody
    }
    const text = await c.req.text()
    if (!text || !text.trim()) return {}
    try {
      return JSON.parse(text) as SecurityBody
    } catch {
      return {}
    }
  } catch {
    return {}
  }
}

async function securityRecordHandler(c: Context<{ Bindings: Bindings }>) {
  try {
    const user = c.get('user') as { id?: number } | undefined
    const body = await parseSecurityBody(c)

    const eventType = String(body.event_type || body.type || body.action || '').trim()
    if (!eventType) {
      return c.json(errorResponse('event_type is required'), 400)
    }

    const path = String(body.path || c.req.path || '').slice(0, 512)
    const userAgent = (c.req.header('user-agent') || '').slice(0, 512)
    const ip = (c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '')
      .split(',')[0]
      .trim()
      .slice(0, 128)
    const detailsJson = safeDetailsJson(body.details)

    const DB = c.env.DB
    if (!DB) {
      console.warn('[security] DB binding 없음 — 기록 생략')
      return c.json(successResponse(null))
    }

    try {
      const result = await DB.prepare(`
        INSERT INTO security_events (user_id, event_type, path, user_agent, ip, details_json)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
        .bind(user?.id ?? null, eventType, path || null, userAgent || null, ip || null, detailsJson)
        .run()

      if (!result.success) {
        console.error('[security] INSERT 실패(result.success=false):', (result as { error?: string }).error, result)
      }
    } catch (dbErr) {
      console.error('[security] INSERT 예외 (테이블 없음·제약 등):', dbErr)
    }

    return c.json(successResponse(null))
  } catch (error) {
    console.error('[security] handler 예외:', error)
    return c.json(successResponse(null))
  }
}

app.post('/record', optionalAuth, securityRecordHandler)
app.post('/log', optionalAuth, securityRecordHandler)

export default app
