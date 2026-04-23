/**
 * 부트스트랩 관리자 이메일 — D1 마이그레이션과 목록을 맞출 것 (migrations/0025_promote_admin_emails.sql)
 */
export const ADMIN_EMAILS = ['9535mind@gmail.com', 'js94659535@gmail.com'] as const

export function isListedAdminEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false
  const n = email.trim().toLowerCase()
  return (ADMIN_EMAILS as readonly string[]).some((e) => e.toLowerCase() === n)
}

/** OAuth·비밀번호 로그인·가입 직후 idempotent — 마이그레이션 없이도 최신 배포로 승격 반영 */
export async function ensureListedAdminRole(
  db: D1Database,
  email: string | null | undefined,
  userId: number
): Promise<void> {
  if (!isListedAdminEmail(email)) return
  const runPlain = () =>
    db
      .prepare(
        `UPDATE users SET role = 'admin', updated_at = datetime('now') WHERE id = ?`,
      )
      .bind(userId)
      .run()
  try {
    const withDeleted = await db
      .prepare(
        `UPDATE users SET role = 'admin', updated_at = datetime('now') WHERE id = ? AND deleted_at IS NULL`,
      )
      .bind(userId)
      .run()
    if (withDeleted.success) return
    const err = String((withDeleted as { error?: string }).error || '')
    if (!/no such column[:\s].*deleted_at|D1_ERROR.*\bdeleted_at|SQLITE_ERROR.*\bdeleted_at/i.test(err)) {
      throw new Error(err || 'admin promote failed')
    }
    const plain = await runPlain()
    if (!plain.success) {
      throw new Error(
        String((plain as { error?: string }).error || 'admin promote failed'),
      )
    }
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e)
    if (!/no such column[:\s].*deleted_at|D1_ERROR.*\bdeleted_at|SQLITE_ERROR.*\bdeleted_at/i.test(m)) {
      throw e
    }
    const plain = await runPlain()
    if (!plain.success) {
      throw new Error(
        String((plain as { error?: string }).error || 'admin promote fail'),
      )
    }
  }
}
