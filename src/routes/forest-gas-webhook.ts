/**
 * POST /api/forest-gas-webhook
 * 브라우저 → 동일 출처 → Worker → Google Apps Script doPost (본문 JSON)
 * (forest.html 이 script.google.com 에 직접 POST 하면 opaque·차단으로 실패하는 경우가 있어 프록시)
 */

import { Hono } from 'hono'
import type { Bindings } from '../types/database'

const MAX_BODY = 2_000_000

const forestGasWebhook = new Hono<{ Bindings: Bindings }>()

forestGasWebhook.post('/', async (c) => {
  const base = (c.env.FOREST_GAS_WEBHOOK_URL || '').trim()
  if (!base) {
    return c.json({ success: false, error: 'FOREST_GAS_WEBHOOK_URL not configured' }, 503)
  }
  let gasUrl: URL
  try {
    gasUrl = new URL(base)
  } catch {
    return c.json({ success: false, error: 'invalid FOREST_GAS_WEBHOOK_URL' }, 503)
  }

  let raw: string
  try {
    raw = await c.req.text()
  } catch (e) {
    return c.json({ success: false, error: 'read body failed: ' + String(e) }, 400)
  }
  if (raw.length > MAX_BODY) {
    return c.json({ success: false, error: 'body too large' }, 413)
  }
  if (!raw.trim()) {
    return c.json({ success: false, error: 'empty body' }, 400)
  }

  try {
    const res = await fetch(gasUrl.toString(), {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8', Accept: 'application/json,text/plain,*/*' },
      body: raw
    })
    const text = await res.text()
    if (!res.ok) {
      console.error('[forest-gas-webhook] upstream', res.status, text.slice(0, 400))
      return c.json(
        {
          success: false,
          error: 'upstream',
          status: res.status,
          body: text.slice(0, 800)
        },
        502
      )
    }
    try {
      const parsed = text ? JSON.parse(text) : null
      return c.json(parsed)
    } catch {
      return c.text(text || '', 200, { 'Content-Type': 'text/plain;charset=utf-8' })
    }
  } catch (e) {
    console.error('[forest-gas-webhook]', e)
    return c.json({ success: false, error: String(e) }, 502)
  }
})

export default forestGasWebhook
