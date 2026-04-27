/**
 * HttpOnly 세션 쿠키 — MS12 (Cloudflare Workers / Pages)
 * 크로스 사이트(OAuth) 이후에도 전송되도록 SameSite=None; Secure 고정.
 */
import { Context } from 'hono'
import { deleteCookie, generateCookie } from 'hono/cookie'
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

/** apex·www·하위호스트 쿠키 공유 — `Domain=.ms12.org` (점 포함)로 고정 */
export const MS12_SESSION_COOKIE_DOMAIN = '.ms12.org'

function sessionTokenDomainForSetCookie(c: Context): string | null {
  const h = (requestHostname(c) || '').toLowerCase()
  if (isLocalDevHostname(h)) return null
  if (h.includes('pages.dev')) return null
  if (h === 'ms12.org' || h === 'www.ms12.org' || h.endsWith('.ms12.org')) {
    return MS12_SESSION_COOKIE_DOMAIN
  }
  return null
}

/**
 * Path=/, HttpOnly, Secure, SameSite=None — 프로덕션은 Domain=.ms12.org (sessionTokenDomainForSetCookie).
 */
export function applySessionCookie(
  c: Context,
  token: string,
  maxAgeSeconds: number,
): string {
  const domain = sessionTokenDomainForSetCookie(c)
  const line = generateCookie('session_token', token, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    domain: domain || undefined,
    maxAge: Math.floor(maxAgeSeconds),
  })
  c.header('Set-Cookie', line, { append: true })
  return line
}

export function clearSessionCookie(c: Context): void {
  const secure = isSecureCookieRequest(c)
  const sameSiteLax = { path: '/', secure, sameSite: 'Lax' as const }
  const sameSiteNone = { path: '/', secure, sameSite: 'None' as const }
  const domainOpts = [undefined, 'ms12.org', 'ms12.pages.dev', '.ms12.org'] as const
  for (const base of [sameSiteLax, sameSiteNone]) {
    for (const domain of domainOpts) {
      deleteCookie(c, 'session_token', domain ? { ...base, domain } : base)
    }
  }
  if (secure) {
    const domain = sessionTokenDomainForSetCookie(c)
    const clearVal = 'session_token=; Path=/; HttpOnly; Max-Age=0'
    const domPart = domain ? `; Domain=${domain}` : ''
    c.header(
      'Set-Cookie',
      `${clearVal}${domPart}; SameSite=None; Secure`,
      { append: true },
    )
  } else {
    c.header('Set-Cookie', 'session_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax', {
      append: true,
    })
  }
}
