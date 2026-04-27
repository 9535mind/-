/**
 * 유틸리티 헬퍼 함수들
 */

import { Context } from 'hono'
import { getCookie } from 'hono/cookie'
import { ApiResponse } from '../types/database'

/**
 * 성공 응답 생성
 */
export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message
  }
}

/**
 * 에러 응답 생성
 */
export function errorResponse(error: string, message?: string): ApiResponse {
  return {
    success: false,
    error,
    message
  }
}

/**
 * 세션 만료 — datetime 파싱이 NULL 이 되는 저장 형식이 있으면 julianday 로 보완(로그인 직후 /me 실패 방지)
 */
export const SQL_SESSION_S_VALID = `(
  datetime(rtrim(replace(s.expires_at, 'T', ' '), 'Z')) > datetime('now')
  OR (julianday(s.expires_at) IS NOT NULL AND julianday(s.expires_at) > julianday('now'))
)`
export const SQL_SESSION_EXPIRED = `(
  datetime(rtrim(replace(expires_at, 'T', ' '), 'Z')) < datetime('now')
  OR (julianday(expires_at) IS NOT NULL AND julianday(expires_at) < julianday('now'))
)`

/** sessions.expires_at 저장용 UTC (SQLite datetime 과 직접 비교 안정) */
export function formatSessionExpiresAtForDb(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

export { hashPassword, verifyPassword } from './password'

/**
 * 세션 토큰 생성
 */
export function generateSessionToken(): string {
  return crypto.randomUUID()
}

/**
 * 주문번호 생성 (MS-YYYYMMDD-XXXX)
 */
export function generateOrderId(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `MS-${year}${month}${day}-${random}`
}

/**
 * 수료증 번호 생성 (MS-YYYY-XXXX)
 */
export async function generateCertificateNumber(db: D1Database): Promise<string> {
  const now = new Date()
  const year = now.getFullYear()
  
  // 올해 발급된 수료증 개수 조회
  const result = await db.prepare(`
    SELECT COUNT(*) as count 
    FROM certificates 
    WHERE strftime('%Y', issue_date) = ?
  `).bind(year.toString()).first<{ count: number }>()
  
  const count = (result?.count || 0) + 1
  const sequence = count.toString().padStart(4, '0')
  
  return `MS-${year}-${sequence}`
}

/**
 * 날짜 포맷팅 (YYYY-MM-DD)
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 날짜 계산 (일 단위 추가)
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * 이메일 유효성 검증
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 휴대폰 번호 유효성 검증 (한국)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/
  return phoneRegex.test(phone)
}

const SESSION_TOKEN_COOKIE = 'session_token'
const GUEST_ID_COOKIE = 'ms12_guest'

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function parseNamedCookieFromRawCookieHeader(
  cookieHeader: string | undefined,
  name: string,
): string | null {
  if (!cookieHeader) return null
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`(?:^|;)\\s*${esc}=([^;]*)`, 'i').exec(cookieHeader)
  if (!match) return null
  let v = (match[1] || '').trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1)
  }
  return v || null
}

/**
 * getCookie(파서)로 못 읽는 형태(따옴표·공백)도 `;`로 잘라 이름=값 직접 인식(한 쿠키만)
 */
function parseCookieValueByNameFromRawString(
  s: string | null | undefined,
  cookieName: string,
): string | null {
  if (!s || !s.trim()) return null
  const parts = s.split(';')
  const nLow = cookieName.toLowerCase()
  for (const part of parts) {
    const p = part.trim()
    const eq = p.indexOf('=')
    if (eq < 1) continue
    const rawName = p.slice(0, eq).trim()
    if (rawName.toLowerCase() !== nLow) continue
    return normalizeSessionTokenString(p.slice(eq + 1).trim())
  }
  return null
}

function parseLastResortSessionToken(s: string | null | undefined): string | null {
  return parseCookieValueByNameFromRawString(s, SESSION_TOKEN_COOKIE)
}

/**
 * `ms12_guest` — `session_token` 과 혼용 금지(이전: UUID 를 세션으로 조회 → 게스트 id 불일치·403)
 */
export function getMs12GuestIdFromRequest(c: Context): string | null {
  const cookieA = c.req.header('Cookie') || c.req.header('cookie') || ''
  const cookieB =
    typeof c.req.raw?.headers?.get === 'function'
      ? c.req.raw.headers.get('Cookie') || c.req.raw.headers.get('cookie') || ''
      : ''
  const merged = [cookieA, cookieB].filter((x) => x && x.trim()).join('; ')
  const fromHono = normalizeSessionTokenString(getCookie(c, GUEST_ID_COOKIE))
  if (fromHono && UUID_V4_RE.test(fromHono)) return fromHono
  const tryRaw = (raw: string) => {
    for (const cand of [
      parseNamedCookieFromRawCookieHeader(raw, GUEST_ID_COOKIE),
      parseCookieValueByNameFromRawString(raw, GUEST_ID_COOKIE),
    ]) {
      const t = normalizeSessionTokenString(cand)
      if (t && UUID_V4_RE.test(t)) return t
    }
    return null
  }
  for (const raw of [merged, cookieA, cookieB]) {
    if (!raw || !raw.trim()) continue
    const g = tryRaw(raw)
    if (g) return g
  }
  return null
}

/** `GET /me` 등 — Cookie 본문에서 `session_token` 만 추출 */
export function parseSessionTokenFromCookieHeaderString(
  header: string | null | undefined,
): string | null {
  if (!header || !String(header).trim()) return null
  return parseLastResortSessionToken(header)
}

export function normalizeSessionTokenString(raw: string | null | undefined): string | null {
  if (raw == null || raw === '') return null
  let sessionToken: string
  try {
    sessionToken = decodeURIComponent(raw)
  } catch {
    sessionToken = raw
  }
  const t = sessionToken.trim()
  return t || null
}

/**
 * Authorization · Cookie 에서 sessions.session_token 용 토큰 추출
 * (게스트 `ms12_guest` UUID는 D1에 없으면 null 사용자 — 세션 토큰으로만 겹쳤을 때만 로그인 인정)
 */
export function getSessionTokenFromRequest(c: Context): string | null {
  const authHeader = c.req.header('Authorization')
  const cookieA = c.req.header('Cookie') || c.req.header('cookie') || ''
  const cookieB =
    typeof c.req.raw?.headers?.get === 'function'
      ? c.req.raw.headers.get('Cookie') || c.req.raw.headers.get('cookie') || ''
      : ''
  const cookieHeader = [cookieA, cookieB].filter((x) => x && x.trim()).join('; ')

  if (authHeader) {
    const bearer = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : authHeader
    const t0 = normalizeSessionTokenString(bearer)
    if (t0) return t0
  }
  for (const name of [SESSION_TOKEN_COOKIE] as const) {
    const fromHono = getCookie(c, name) || null
    const fromRaw = parseNamedCookieFromRawCookieHeader(
      cookieHeader || undefined,
      name,
    )
    const v = fromHono || fromRaw
    const t = normalizeSessionTokenString(v)
    if (t) return t
  }
  const tLast = parseLastResortSessionToken(cookieHeader)
  if (tLast) return tLast
  return (
    parseLastResortSessionToken(cookieA) || parseLastResortSessionToken(cookieB)
  )
}

/**
 * 세션에서 사용자 정보 추출
 * @param preResolvedSessionToken /me 등에서 쿠키 헤더를 추가로 푼 뒤 넘기면, getCookie 실패·엣지 헤더에도 일치
 */
export async function getCurrentUser(
  c: Context,
  preResolvedSessionToken?: string | null,
) {
  let sessionToken: string | null = null
  if (preResolvedSessionToken != null && String(preResolvedSessionToken).trim() !== '') {
    sessionToken = normalizeSessionTokenString(String(preResolvedSessionToken).trim())
  }
  if (!sessionToken) {
    sessionToken = getSessionTokenFromRequest(c)
  }
  if (!sessionToken) {
    return null
  }

  const env = c.env as { DB: D1Database }
  if (!env?.DB) {
    return null
  }

  const selectUserSessionWithSoftDelete = `
      SELECT
        u.id, u.email, u.name, u.role, u.created_at, u.updated_at,
        u.company_name,
        u.phone, u.birth_date,
        u.terms_agreed, u.privacy_agreed, u.marketing_agreed,
        u.social_provider, u.social_id, u.profile_image_url,
        u.deleted_at, u.deletion_reason,
        s.session_token, s.expires_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_token = ?
        AND ${SQL_SESSION_S_VALID}
        AND u.deleted_at IS NULL
    `

  /** users.deleted_at 컬럼이 없는 D1: SQL 에서 soft-delete 조건/컬럼을 쓰지 않음(탈퇴 필터 생략) */
  const selectUserSessionWithoutDeletedColumn = `
      SELECT
        u.id, u.email, u.name, u.role, u.created_at, u.updated_at,
        u.company_name,
        u.phone, u.birth_date,
        u.terms_agreed, u.privacy_agreed, u.marketing_agreed,
        u.social_provider, u.social_id, u.profile_image_url,
        s.session_token, s.expires_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_token = ?
        AND ${SQL_SESSION_S_VALID}
    `

  let session: Record<string, unknown> | null = null
  try {
    session = await env.DB.prepare(selectUserSessionWithSoftDelete)
      .bind(sessionToken)
      .first()
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e)
    if (/no such table[:\s].*sessions|D1_ERROR.*\bsessions|SQLITE_ERROR.*\bsessions/i.test(m)) {
      console.warn('[getCurrentUser] sessions table missing — treat as no session')
      return null
    }
    if (!/no such column[:\s].*deleted_at|D1_ERROR.*\bdeleted_at|SQLITE_ERROR.*\bdeleted_at/i.test(m)) {
      console.warn('[getCurrentUser] session lookup error — treat as no session:', m.slice(0, 220))
      return null
    }
    console.warn(
      '[getCurrentUser] users.deleted_at 없음 — soft-delete 제외 쿼리로 세션 조회:',
      m.slice(0, 200),
    )
    try {
      session = await env.DB.prepare(selectUserSessionWithoutDeletedColumn)
        .bind(sessionToken)
        .first()
    } catch (e2) {
      const m2 = e2 instanceof Error ? e2.message : String(e2)
      console.warn('[getCurrentUser] fallback session query failed:', m2.slice(0, 220))
      return null
    }
  }

  if (!session) {
    // 세션 행은 있는데 users JOIN 실패(orphan user_id·스키마 불일치 등) 시 쿠키 정리 → /me 가 sessionFound+user_not_found 고착 방지
    try {
      const srow = await env.DB.prepare(
        `SELECT s.user_id FROM sessions s WHERE s.session_token = ? AND ${SQL_SESSION_S_VALID}`,
      )
        .bind(sessionToken)
        .first<{ user_id: number }>()
      if (srow && srow.user_id != null) {
        let ucheck: { x?: number; deleted_at?: string | null } | null = null
        try {
          ucheck = await env.DB.prepare('SELECT 1 AS x, deleted_at FROM users WHERE id = ?')
            .bind(srow.user_id)
            .first<{ x: number; deleted_at: string | null }>()
        } catch {
          try {
            ucheck = await env.DB.prepare('SELECT 1 AS x FROM users WHERE id = ?')
              .bind(srow.user_id)
              .first<{ x: number }>()
          } catch {
            ucheck = null
          }
        }
        const softDeleted =
          ucheck && 'deleted_at' in ucheck && ucheck.deleted_at != null && String(ucheck.deleted_at).trim() !== ''
        if (!ucheck || softDeleted) {
          await env.DB.prepare('DELETE FROM sessions WHERE session_token = ?')
            .bind(sessionToken)
            .run()
          console.warn(
            !ucheck
              ? '[getCurrentUser] removed orphan session (user_id not in users):'
              : '[getCurrentUser] removed session (soft-deleted user):',
            srow.user_id,
          )
        }
      }
    } catch (e) {
      const m0 = e instanceof Error ? e.message : String(e)
      if (!/no such table[:\s].*sessions/i.test(m0)) {
        console.warn('[getCurrentUser] orphan session cleanup skipped:', m0.slice(0, 160))
      }
    }
    return null
  }

  // 세션 활동 시간 업데이트
  // user_sessions 테이블이 없는 환경(또는 스키마 불일치)에서도 인증이 깨지지 않게 방어
  try {
    await env.DB.prepare(`
      UPDATE user_sessions 
      SET last_activity_at = datetime('now')
      WHERE session_token = ?
    `).bind(sessionToken).run()
  } catch (e) {
    // 세션은 sessions 테이블로 유효성 확인이 끝났으므로, 활동 기록 실패는 무시
    console.warn('[getCurrentUser] user_sessions update skipped:', e)
  }
  
  return session
}

/**
 * 관리자 권한 체크
 */
export async function isAdmin(c: Context): Promise<boolean> {
  const user = await getCurrentUser(c)
  return !!user && user.role === 'admin'
}

/**
 * 진도율 계산
 */
export function calculateProgressRate(completedLessons: number, totalLessons: number): number {
  if (totalLessons === 0) return 0
  return Math.round((completedLessons / totalLessons) * 100 * 100) / 100 // 소수점 2자리
}

/**
 * 시청 비율 계산
 */
export function calculateWatchPercentage(watchedSeconds: number, totalSeconds: number): number {
  if (totalSeconds === 0) return 0
  return Math.round((watchedSeconds / totalSeconds) * 100 * 100) / 100
}

/**
 * 수료 조건 체크
 */
export function isCompletionEligible(progressRate: number, requiredRate: number = 80): boolean {
  return progressRate >= requiredRate
}
