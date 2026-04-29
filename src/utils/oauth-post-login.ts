/**
 * OAuth 콜백 직후: 호출 전에 `applySessionCookie` 로 세션을 컨텍스트에 넣은 뒤
 * 본 함수에서 `oauth_post_login` 만 지우고 Hono `c.redirect(302)` 로 이동한다.
 * (구현: `new Response` 직조립 대신 Hono 가 Set-Cookie + Location 을 한 응답으로 합친다.)
 */
import { setCookie } from 'hono/cookie'
import type { Context } from 'hono'
import { isSecureCookieRequest } from './session-cookie'

export const OAUTH_POST_LOGIN_COOKIE = 'oauth_post_login'

export function sanitizeLmsPostLoginPath(p: string | null | undefined): string | null {
  if (p == null || typeof p !== 'string') return null
  let t = p.trim()
  if (!t) return null
  try {
    t = decodeURIComponent(t)
  } catch {
    return null
  }
  if (t.includes('..') || t.includes('://') || t.includes('\\') || t.startsWith('//')) return null
  if (t.includes('#')) t = t.split('#')[0] || ''
  if (t.length > 2048) return null
  if (!t.startsWith('/')) return null
  const pathOnly = (t.split('?')[0] || '').replace(/\/+$/, '') || '/'
  const inAppShell = pathOnly === '/app' || pathOnly.startsWith('/app/')
  if (inAppShell) {
    if (
      pathOnly === '/app' ||
      pathOnly === '/app/home' ||
      pathOnly === '/app/desk' ||
      pathOnly === '/app/hub' ||
      pathOnly === '/app/login' ||
      pathOnly === '/app/meeting' ||
      pathOnly === '/app/meeting/new'
    ) {
      return t
    }
    if (pathOnly === '/app/join' || pathOnly === '/app/records' || pathOnly === '/app/meeting/new') {
      return t
    }
    if (pathOnly.startsWith('/app/meeting/') && pathOnly.length > '/app/meeting/'.length) {
      const rest = pathOnly.slice('/app/meeting/'.length)
      if (rest && !rest.includes('..') && !rest.includes('//') && !rest.startsWith('.')) {
        return t
      }
    }
    if (pathOnly.startsWith('/app/room/') && pathOnly.length > '/app/room/'.length) {
      const rest = pathOnly.slice('/app/room/'.length)
      if (rest && !rest.includes('..') && !rest.includes('//') && !rest.startsWith('.')) {
        return t
      }
    }
    if (pathOnly.startsWith('/app/record/') && pathOnly.length > '/app/record/'.length) {
      const rest = pathOnly.slice('/app/record/'.length)
      if (rest && !rest.includes('..') && !rest.includes('//') && !rest.startsWith('.')) {
        return t
      }
    }
    return null
  }
  return t
}

export function setPostLoginPathCookie(c: Context, pathWithQuery: string) {
  const s = sanitizeLmsPostLoginPath(pathWithQuery)
  if (!s) return
  setCookie(c, OAUTH_POST_LOGIN_COOKIE, s, {
    path: '/',
    maxAge: 600,
    httpOnly: true,
    sameSite: 'Lax',
    secure: isSecureCookieRequest(c),
  })
}

/** oauth_post_login 안내 쿠키만 만료 — 세션은 호출부에서 이미 applySessionCookie 로 설정됨 */
export function clearOAuthPostLoginCookies(c: Context): void {
  const secure = isSecureCookieRequest(c)
  setCookie(c, OAUTH_POST_LOGIN_COOKIE, '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'Lax',
    secure,
  })
  if (secure) {
    setCookie(c, OAUTH_POST_LOGIN_COOKIE, '', {
      path: '/',
      maxAge: 0,
      httpOnly: true,
      sameSite: 'None',
      secure: true,
    })
  }
}

/**
 * OAuth 성공 후 기본 랜딩. `_legacySessionCookie` 는 예전 호환용(무시).
 */
export function redirectAfterOAuthOrDefault(c: Context, _legacySessionCookie?: string) {
  void _legacySessionCookie
  clearOAuthPostLoginCookies(c)
  return c.redirect('/app', 302)
}
