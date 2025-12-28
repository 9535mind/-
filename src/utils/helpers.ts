/**
 * 유틸리티 헬퍼 함수들
 */

import { Context } from 'hono'
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
 * 비밀번호 해시 (간단 구현 - 실제로는 bcrypt 등 사용)
 * Cloudflare Workers에서는 bcrypt 사용 불가, Web Crypto API 사용
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

/**
 * 비밀번호 검증
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password)
  return passwordHash === hash
}

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
  const cookieHeader = c.req.header('Cookie')
  let cookieToken = null
  if (cookieHeader) {
    const match = cookieHeader.match(/session_token=([^;]+)/)
    if (match) cookieToken = match[1]
  }
  const sessionToken = authHeader?.replace('Bearer ', '') || cookieToken
  
  if (!sessionToken) {
    return null
  }

  const env = c.env as { DB: D1Database }
  
  // 세션 조회
  const session = await env.DB.prepare(`
    SELECT s.*, u.* 
    FROM user_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.session_token = ? 
      AND s.is_active = 1 
      AND s.expires_at > datetime('now')
  `).bind(sessionToken).first()
  
  if (!session) {
    return null
  }
  
  // 세션 활동 시간 업데이트
  await env.DB.prepare(`
    UPDATE user_sessions 
    SET last_activity_at = datetime('now')
    WHERE session_token = ?
  `).bind(sessionToken).run()
  
  return session
}

/**
 * 관리자 권한 체크
 */
export async function isAdmin(c: Context): Promise<boolean> {
  const user = await getCurrentUser(c)
  return user?.role === 'admin'
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
