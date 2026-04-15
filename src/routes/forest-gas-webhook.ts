/**
 * POST /api/forest-gas-webhook
 * 브라우저 → 동일 출처 → Worker → Google Apps Script doPost (본문 JSON)
 * (forest.html 이 script.google.com 에 직접 POST 하면 opaque·차단으로 실패하는 경우가 있어 프록시)
 * Upstream: POST body = JSON 문자열, Content-Type application/json (GAS doPost·JSON.parse 와 정합); redirect: 'follow'.
 * FOREST_GAS_WEBHOOK_URL: Pages Secret 권장. 미설정 시 v52 웹앱 /exec 폴백.
 */

import { Hono } from 'hono'
import type { Bindings } from '../types/database'

const MAX_BODY = 2_000_000

/** v52 GAS 웹앱 — Secret 미바인딩 시 프록시 upstream 폴백 (public/forest.html FOREST_SHEETS_WEBHOOK_URL 과 동일) */
const FOREST_GAS_WEBHOOK_URL_FALLBACK =
  'https://script.google.com/macros/s/AKfycbzIhdMS_0n2djgQaAaJqJm21dfl47bKPkhTK-7HylErEn9KQ8fnJ7kJAyTtIL_wJGtX/exec'

const forestGasWebhook = new Hono<{ Bindings: Bindings }>()

forestGasWebhook.post('/', async (c) => {
  const fromEnv = (c.env.FOREST_GAS_WEBHOOK_URL || '').trim()
  const base = fromEnv || FOREST_GAS_WEBHOOK_URL_FALLBACK
  let gasUrl: URL
  try {
    gasUrl = new URL(base)
  } catch {
    console.error('[forest-gas-webhook] webhook URL is not a valid URL', base)
    return c.json({ success: false, error: 'invalid FOREST_GAS_WEBHOOK_URL' }, 500)
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

  const contentType = (c.req.header('content-type') || '').toLowerCase()
  if (!contentType.includes('application/json')) {
    return c.json(
      {
        success: false,
        error: 'invalid_content_type',
        message: 'Content-Type must be application/json;charset=utf-8',
      },
      415,
    )
  }

  try {
    JSON.parse(raw)
  } catch (e) {
    return c.json({ success: false, error: 'body must be valid JSON: ' + String(e) }, 400)
  }

  try {
    const res = await fetch(gasUrl.toString(), {
      method: 'POST',
      redirect: 'follow',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        Accept: 'application/json,text/plain,*/*',
      },
      body: raw,
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
    let parsed: unknown
    try {
      parsed = text ? JSON.parse(text) : null
    } catch {
      const head = (text || '').slice(0, 12).trimStart()
      if (head.startsWith('<')) {
        console.error('[forest-gas-webhook] upstream returned HTML (wrong URL·로그인 페이지·배포 오류 의심)', text.slice(0, 300))
        return c.json(
          {
            success: false,
            error: 'upstream_html',
            message: 'GAS가 JSON 대신 HTML을 반환했습니다. 웹앱 /exec URL·배포(모든 사용자)를 확인하세요.',
            body: text.slice(0, 800)
          },
          502
        )
      }
      return c.text(text || '', 200, { 'Content-Type': 'text/plain;charset=utf-8' })
    }
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed !== null &&
      'success' in parsed &&
      (parsed as { success?: boolean }).success === false
    ) {
      const p = parsed as { success: false; error?: string; message?: string }
      console.error('[forest-gas-webhook] GAS doPost 실패(시트 미반영)', p)
      const gasMsg = String(p.error || p.message || 'GAS success:false').trim()
      return c.json(
        {
          success: false,
          error: gasMsg || 'gas_script',
          message: gasMsg,
          gas: p
        },
        502
      )
    }
    return c.json(parsed)
  } catch (e) {
    console.error('[forest-gas-webhook]', e)
    return c.json({ success: false, error: String(e) }, 502)
  }
})

export default forestGasWebhook
