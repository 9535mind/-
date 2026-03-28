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

/** SQLite: expires_at 에 toISOString() 저장 시 datetime('now') 와 문자열 비교가 어긋날 수 있음 */
export const SQL_SESSION_S_VALID = `julianday(s.expires_at) > julianday('now')`
export const SQL_SESSION_EXPIRED = `julianday(expires_at) < julianday('now')`

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

/**
 * 세션에서 사용자 정보 추출
 */
export async function getCurrentUser(c: Context) {
  // 쿠키나 헤더에서 세션 토큰 추출
  const authHeader = c.req.header('Authorization')
  // Hono 내장 쿠키 파서 우선 사용 (Workers 환경에서 가장 안정적)
  const cookieToken = getCookie(c, 'session_token') || null
  // 구형/특수 환경 호환: Cookie 헤더 직접 파싱 fallback
  const cookieHeader = c.req.header('Cookie')
  let cookieTokenFallback: string | null = null
  if (!cookieToken && cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)session_token=([^;]+)/)
    if (match) cookieTokenFallback = match[1]
  }

  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : authHeader
  const rawToken = bearer || cookieToken || cookieTokenFallback
  let sessionToken = rawToken
  if (rawToken) {
    try {
      sessionToken = decodeURIComponent(rawToken)
    } catch {
      sessionToken = rawToken
    }
  }
  
  if (!sessionToken) {
    return null
  }

  const env = c.env as { DB: D1Database }
  
  // 세션 조회 (배포 환경의 users 스키마 차이 대비: 확장 컬럼 실패 시 최소 컬럼으로 폴백)
  let session: Record<string, unknown> | null = null
  try {
    session = await env.DB.prepare(`
      SELECT 
        u.id, u.email, u.name, u.role, u.created_at, u.updated_at,
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
    `).bind(sessionToken).first()
  } catch (e) {
    console.warn('[getCurrentUser] extended user columns unavailable, fallback query used:', e)
    session = await env.DB.prepare(`
      SELECT 
        u.id, u.email, u.name, u.role,
        u.created_at, u.updated_at, u.deleted_at,
        s.session_token, s.expires_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_token = ?
        AND ${SQL_SESSION_S_VALID}
        AND u.deleted_at IS NULL
    `).bind(sessionToken).first()
  }
  
  if (!session) {
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
