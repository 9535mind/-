/**
 * HttpOnly 세션 쿠키 — MS12 (ms12.org, ms12.pages.dev)
 */
import { Context } from 'hono'
import { deleteCookie, setCookie } from 'hono/cookie'
import { isLocalDevHostname, isMs12Hostname, requestHostname } from './oauth-public'

function isPublicHttpsHost(hostname: string): boolean {
  if (!hostname) return false
  if (isMs12Hostname(hostname)) return true
  return false
}

export function isSecureCookieRequest(c: Context): boolean {
  const host = requestHostname(c)
  if (isLocalDevHostname(host)) return false
  const fwd = (c.req.header('x-forwarded-proto') || '').split(',')[0].trim().toLowerCase()
  if (fwd === 'https') return true
  if (fwd === 'http') return false
  if (isPublicHttpsHost(host)) return true
  return new URL(c.req.url).protocol === 'https:'
}

export function sessionCookieDomain(_c: Context): string | undefined {
  /** Domain 미지정(호스트 전용) — Domain=… 지정 시 리다이렉트 직후 세션이 누락되는 사례 완화 */
  return undefined
}

export function applySessionCookie(c: Context, token: string, maxAgeSeconds: number) {
  const domain = sessionCookieDomain(c)
  const secure = isSecureCookieRequest(c)
  setCookie(c, 'session_token', token, {
    path: '/',
    httpOnly: true,
    secure,
    sameSite: 'Lax',
    maxAge: Math.floor(maxAgeSeconds),
    ...(domain ? { domain } : {}),
  })
}

export function clearSessionCookie(c: Context) {
  const secure = isSecureCookieRequest(c)
  const base = { path: '/', secure, sameSite: 'Lax' as const }
  deleteCookie(c, 'session_token', base)
  deleteCookie(c, 'session_token', { ...base, domain: 'ms12.org' })
  deleteCookie(c, 'session_token', { ...base, domain: 'ms12.pages.dev' })
}
