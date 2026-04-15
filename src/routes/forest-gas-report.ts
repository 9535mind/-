/**
 * GET /api/forest-gas-report?id=REQUEST_ID
 * 브라우저 → Worker → Google Apps Script doGet (?view=report&id=)
 * 본인 소유(request_id → user_id) 또는 관리자만 GAS 프록시 허용.
 * FOREST_GAS_WEBHOOK_URL: Pages Secret 권장. 미설정 시 v52 웹앱 /exec 폴백 (forest-gas-webhook.ts 와 동일).
 */

import { Hono } from 'hono'
import type { Bindings } from '../types/database'
import { getCurrentUser } from '../utils/helpers'
import { isForestAdminRole } from '../utils/forest-admin'

/** v52 GAS 웹앱 — Secret 미바인딩 시 GET upstream 폴백 (public/forest.html FOREST_SHEETS_WEBHOOK_URL 과 동일) */
const FOREST_GAS_WEBHOOK_URL_FALLBACK =
  'https://script.google.com/macros/s/AKfycbzIhdMS_0n2djgQaAaJqJm21dfl47bKPkhTK-7HylErEn9KQ8fnJ7kJAyTtIL_wJGtX/exec'

const forestGasReport = new Hono<{ Bindings: Bindings }>()

forestGasReport.get('/', async (c) => {
  const id = (c.req.query('id') || '').trim()
  if (!id) {
    return c.json({ success: false, error: 'id is required' }, 400)
  }

  const user = await getCurrentUser(c)
  if (!user) {
    return c.json(
      {
        success: false,
        error: 'login_required',
        message: '로그인이 필요합니다.',
      },
      401,
    )
  }

  const uid = Number(user.id)
  const isAdmin = isForestAdminRole((user as { role?: unknown }).role)
  const { DB } = c.env

  if (isAdmin) {
    console.log('[forest-gas-report] admin bypass', {
      id,
      userId: uid,
      role: String((user as { role?: unknown }).role ?? ''),
    })
  }

  if (!isAdmin) {
    if (!DB) {
      return c.json({ success: false, error: 'DB unavailable', message: 'DB unavailable' }, 503)
    }
    let row: { user_id: number | null } | null = null
    try {
      row = (await DB.prepare(
        `SELECT user_id FROM forest_group_results WHERE request_id = ? LIMIT 1`,
      )
        .bind(id)
        .first()) as { user_id: number | null } | null
    } catch (e) {
      console.warn('[forest-gas-report] ownership lookup', e)
    }
    if (!row || row.user_id == null || Number(row.user_id) !== uid) {
      return c.json(
        {
          success: false,
          error: 'forbidden',
          message: '본인이 진행한 검사 보고서만 열람할 수 있습니다.',
        },
        403,
      )
    }
  }

  const fromEnv = (c.env.FOREST_GAS_WEBHOOK_URL || '').trim()
  const base = fromEnv || FOREST_GAS_WEBHOOK_URL_FALLBACK
  let url: URL
  try {
    url = new URL(base)
  } catch {
    console.error('[forest-gas-report] webhook URL is not a valid URL', base)
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
    console.error('[forest-gas-report]', e)
    return c.json({ success: false, error: String(e) }, 502)
  }
})

export default forestGasReport
