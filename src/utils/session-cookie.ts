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

export function sessionCookieDomain(c: Context): string | undefined {
  const h = requestHostname(c)
  if (h === 'ms12.org' || h === 'www.ms12.org' || h.endsWith('.ms12.org')) {
    return 'ms12.org'
  }
  if (h === 'ms12.pages.dev' || h.endsWith('.ms12.pages.dev')) {
    return 'ms12.pages.dev'
  }
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
  const domain = sessionCookieDomain(c)
  const secure = isSecureCookieRequest(c)
  deleteCookie(c, 'session_token', {
    path: '/',
    secure,
    sameSite: 'Lax',
    ...(domain ? { domain } : {}),
  })
}
