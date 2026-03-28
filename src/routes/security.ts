/**
 * Security event logging routes
 * /api/security/*
 */

import { Hono } from 'hono'
import type { Bindings } from '../types/database'
import { optionalAuth } from '../middleware/auth'
import { successResponse, errorResponse } from '../utils/helpers'

const app = new Hono<{ Bindings: Bindings }>()

/**
 * POST /api/security/log
 * 클라이언트 보안 이벤트 기록 (로그인 여부 무관)
 */
app.post('/log', optionalAuth, async (c) => {
  try {
    const user = c.get('user') as { id?: number } | undefined
    const body = await c.req.json<{
      event_type?: string
      path?: string
      details?: unknown
    }>().catch(() => ({}))

    const eventType = (body.event_type || '').trim()
    if (!eventType) {
      return c.json(errorResponse('event_type is required'), 400)
    }

    const path = (body.path || c.req.path || '').slice(0, 512)
    const userAgent = (c.req.header('user-agent') || '').slice(0, 512)
    const ip = (c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '').slice(0, 128)
    const detailsJson = body.details ? JSON.stringify(body.details).slice(0, 4000) : null

    const { DB } = c.env
    await DB.prepare(`
      INSERT INTO security_events (user_id, event_type, path, user_agent, ip, details_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(user?.id || null, eventType, path || null, userAgent || null, ip || null, detailsJson).run()

    return c.json(successResponse(null))
  } catch (error) {
    console.error('Security log error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

export default app

