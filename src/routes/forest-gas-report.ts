/**
 * GET /api/forest-gas-report?id=REQUEST_ID
 * 브라우저 → 동일 출처 → Worker → Google Apps Script doGet (?view=report&id=)
 * (script.google.com 직접 fetch 는 CORS 로 실패할 수 있어 프록시 필요)
 */

import { Hono } from 'hono'
import type { Bindings } from '../types/database'

const forestGasReport = new Hono<{ Bindings: Bindings }>()

forestGasReport.get('/', async (c) => {
  const id = (c.req.query('id') || '').trim()
  if (!id) {
    return c.json({ success: false, error: 'id is required' }, 400)
  }
  const base = (c.env.FOREST_GAS_WEBHOOK_URL || '').trim()
  if (!base) {
    return c.json({ success: false, error: 'FOREST_GAS_WEBHOOK_URL not configured' }, 503)
  }
  let url: URL
  try {
    url = new URL(base)
  } catch {
    return c.json({ success: false, error: 'invalid FOREST_GAS_WEBHOOK_URL' }, 503)
  }
  url.searchParams.set('id', id)
  url.searchParams.set('view', 'report')
  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
      headers: { Accept: 'application/json,text/plain,*/*' }
    })
    const text = await res.text()
    if (!res.ok) {
      return c.json(
        { success: false, error: 'upstream', status: res.status, body: text.slice(0, 500) },
        502
      )
    }
    let parsed: unknown
    try {
      parsed = text ? JSON.parse(text) : null
    } catch {
      return c.json({ success: false, error: 'upstream returned non-json' }, 502)
    }
    return c.json(parsed)
  } catch (e) {
    console.error('[forest-gas-report]', e)
    return c.json({ success: false, error: String(e) }, 502)
  }
})

export default forestGasReport
