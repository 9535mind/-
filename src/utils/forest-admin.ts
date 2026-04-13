/**
 * Forest 보고서·GAS 프록시용 관리자 판별 (DB users.role 값 편차 흡수)
 */
export function isForestAdminRole(role: unknown): boolean {
  const r = String(role ?? '')
    .trim()
    .toLowerCase()
  if (!r) return false
  if (r === 'admin' || r === 'administrator' || r === 'superadmin') return true
  if (r === '관리자') return true
  return false
}
