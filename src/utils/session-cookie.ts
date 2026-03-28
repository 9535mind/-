/**
 * HttpOnly 세션 쿠키 — 프로덕션에서 apex ↔ 서브도메인 간 공유 (Domain=mindstory.kr)
 * Cloudflare 등 프록시에서는 Host 대신 x-forwarded-host / x-forwarded-proto 를 반영해야
 * Domain·Secure 가 실제 공개 도메인과 맞고, API(/api/admin/*)에서 세션이 인식된다.
 */
import { Context } from 'hono'
import { deleteCookie, setCookie } from 'hono/cookie'
import { isLocalDevHostname, requestHostname } from './oauth-public'

function isPublicHttpsHost(hostname: string): boolean {
  if (!hostname) return false
  if (hostname === 'mindstory.kr' || hostname.endsWith('.mindstory.kr')) return true
  if (hostname === 'mslms.pages.dev' || hostname.endsWith('.mslms.pages.dev')) return true
  return false
}

export function isSecureCookieRequest(c: Context): boolean {
  const host = requestHostname(c)
  if (isLocalDevHostname(host)) return false
  const fwd = (c.req.header('x-forwarded-proto') || '').split(',')[0].trim().toLowerCase()
  if (fwd === 'https') return true
  if (fwd === 'http') return false
  // Workers 요청 URL 이 http 인 경우가 많음 — 방문자는 HTTPS 인데 Secure 가 빠지면 브라우저이 쿠키를 버림
  if (isPublicHttpsHost(host)) return true
  return new URL(c.req.url).protocol === 'https:'
}

export function sessionCookieDomain(c: Context): string | undefined {
  const h = requestHostname(c)
  if (h === 'mindstory.kr' || h.endsWith('.mindstory.kr')) {
    // 선행 점(. ) 없이 등록 도메인만 — 일부 클라이언트/프록시 호환
    return 'mindstory.kr'
  }
  // Cloudflare Pages: {hash}.{project}.pages.dev — 호스트마다 쿠키가 갈라져 /api/auth/me 가 401 → 관제탑 깜빡임
  // project.pages.dev 로 Domain 을 맞추면 동일 프로젝트의 모든 프리뷰·프로덕션 별칭 호스트가 세션 공유
  if (h === 'mslms.pages.dev' || h.endsWith('.mslms.pages.dev')) {
    return 'mslms.pages.dev'
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
