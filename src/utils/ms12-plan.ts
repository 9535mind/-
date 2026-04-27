import type { D1Database } from '@cloudflare/workers-types'

import type { Ms12Plan } from '../lib/ms12-plan'

export type { Ms12Plan } from '../lib/ms12-plan'
export { getMs12Capabilities } from '../lib/ms12-plan'

/**
 * D1 `users.ms12_plan` (0083). 컬럼이 없는 환경이면 free 로 간주.
 */
export async function getUserMs12Plan(
  c: { env: { DB: D1Database } },
  userId: number,
): Promise<Ms12Plan> {
  try {
    const row = await c.env.DB.prepare('SELECT ms12_plan AS p FROM users WHERE id = ? LIMIT 1')
      .bind(userId)
      .first<{ p?: string | null }>()
    const p = (row?.p || 'free').toString().trim().toLowerCase()
    return p === 'pro' ? 'pro' : 'free'
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e)
    if (/no such column[:\s].*ms12_plan|SQLITE_ERROR.*\bms12_plan/i.test(m)) {
      return 'free'
    }
    throw e
  }
}
