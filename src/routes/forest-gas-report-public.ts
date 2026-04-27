/**
 * ═══ FOREST ZONE (FROZEN) ═══ 임의 수정·MS12 병합·리팩터 금지. docs/FOREST-FROZEN.md
 *
 * GET /api/forest-gas-report-public?id=REQUEST_ID
 * 로그인 없이 GAS doGet(?view=report&id=) 스냅샷만 프록시 — 시트·구글 드라이브 링크를 연 관리자 PC 등
 * (기존 /api/forest-gas-report 는 로그인·소유권 검사용)
 */

import { Hono } from 'hono'
import type { Bindings } from '../types/database'

/** FROZEN: forest-gas-webhook / forest.html GET URL 과 동기 */
const FOREST_GAS_WEBHOOK_URL_FALLBACK =
  'https://script.google.com/macros/s/AKfycbyKAgk_MEojQZvEeV1b7lSoaLjNAO-KaoUU5odf3i4f38xzqxYk4iWhluKW9HpeJQXC/exec'

const forestGasReportPublic = new Hono<{ Bindings: Bindings }>()

forestGasReportPublic.get('/', async (c) => {
  const id = (c.req.query('id') || '').trim()
  if (!id) {
    return c.json({ success: false, error: 'id is required' }, 400)
  }

  const fromEnv = (c.env.FOREST_GAS_WEBHOOK_URL || '').trim()
  const base = fromEnv || FOREST_GAS_WEBHOOK_URL_FALLBACK
  let url: URL
  try {
    url = new URL(base)
  } catch {
    console.error('[forest-gas-report-public] webhook URL is not a valid URL', base)
    return c.json({ success: false, error: 'invalid FOREST_GAS_WEBHOOK_URL' }, 500)
  }
  url.searchParams.set('id', id)
  url.searchParams.set('view', 'report')
  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
      headers: { Accept: 'application/json,text/plain,*/*' },
    })
    const text = await res.text()
    if (!res.ok) {
      return c.json(
        { success: false, error: 'upstream', status: res.status, body: text.slice(0, 500) },
        502,
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
    console.error('[forest-gas-report-public]', e)
    return c.json({ success: false, error: String(e) }, 502)
  }
})

export default forestGasReportPublic
