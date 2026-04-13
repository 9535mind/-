/**
 * GET /api/forest-gas-report?id=REQUEST_ID
 * 브라우저 → Worker → Google Apps Script doGet (?view=report&id=)
 * 본인 소유(request_id → user_id) 또는 관리자만 GAS 프록시 허용.
 */

import { Hono } from 'hono'
import type { Bindings } from '../types/database'
import { getCurrentUser } from '../utils/helpers'
import { isForestAdminRole } from '../utils/forest-admin'

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
