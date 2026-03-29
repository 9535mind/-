/**
 * 공개 페이지 헤더 SSR — 관리자 전용 알림(미처리 1:1 문의) 등
 */

import type { Context } from 'hono'
import type { User } from '../types/database'

export async function countOpenSupportInquiries(db: D1Database): Promise<number> {
  try {
    const row = await db
      .prepare(`SELECT COUNT(*) as c FROM support_inquiries WHERE status = 'open'`)
      .first<{ c: number }>()
    return Number(row?.c ?? 0)
  } catch {
    return 0
  }
}

/** 관리자 로그인이고 status=open 인 문의가 1건 이상이면 커맨드 센터 펄스 표시 */
export async function resolveAdminCommandPulse(c: Context): Promise<boolean> {
  const user = c.get('user') as User | undefined
  if (!user || user.role !== 'admin') return false
  const db = c.env?.DB as D1Database | undefined
  if (!db) return false
  const n = await countOpenSupportInquiries(db)
  return n > 0
}
