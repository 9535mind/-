/**
 * HttpOnly 세션 쿠키 — 프로덕션에서 apex ↔ 서브도메인 간 공유 (.mindstory.kr)
 * Cloudflare 등 프록시에서는 Host 대신 x-forwarded-host / x-forwarded-proto 를 반영해야
 * Domain·Secure 가 실제 공개 도메인과 맞고, API(/api/admin/*)에서 세션이 인식된다.
 */
import { Context } from 'hono'
import { deleteCookie, setCookie } from 'hono/cookie'
import { isLocalDevHostname, requestHostname } from './oauth-public'

export function isSecureCookieRequest(c: Context): boolean {
  const host = requestHostname(c)
  if (isLocalDevHostname(host)) return false
  const fwd = (c.req.header('x-forwarded-proto') || '').split(',')[0].trim().toLowerCase()
  if (fwd === 'https') return true
  if (fwd === 'http') return false
  return new URL(c.req.url).protocol === 'https:'
}

export function sessionCookieDomain(c: Context): string | undefined {
  const h = requestHostname(c)
  if (h === 'mindstory.kr' || h.endsWith('.mindstory.kr')) {
    return '.mindstory.kr'
  }
  return undefined
}

export function applySessionCookie(c: Context, token: string, maxAgeSeconds: number) {
  const domain = sessionCookieDomain(c)
  setCookie(c, 'session_token', token, {
    path: '/',
    httpOnly: true,
    secure: isSecureCookieRequest(c),
    sameSite: 'Lax',
    maxAge: maxAgeSeconds,
    ...(domain ? { domain } : {}),
  })
}

export function clearSessionCookie(c: Context) {
  const domain = sessionCookieDomain(c)
  deleteCookie(c, 'session_token', {
    path: '/',
    ...(domain ? { domain } : {}),
  })
}
