/**
 * OAuth 콜백 직후: next 쿠키(선택) → 안전한 내부 경로로만 복귀. 독립 도메인의 앱 경로는 사용하지 않음.
 */
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { Context } from 'hono'
import { getRequestPublicOrigin, oauthSuccessLandingUrl } from './oauth-public'
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
  // MS12: /app* 시작화면만 next 허용(과도한 open redirect 방지)
  const pathOnly = (t.split('?')[0] || '').replace(/\/+$/, '') || '/'
  const inAppShell = pathOnly === '/app' || pathOnly.startsWith('/app/')
  if (inAppShell) {
    if (pathOnly === '/app' || pathOnly === '/app/home' || pathOnly === '/app/login' || pathOnly === '/app/meeting') {
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

/**
 * Kakao·Google 콜백 성공 직후(세션 쿠키 set 이후) 호출.
 */
export function redirectAfterOAuthOrDefault(c: Context) {
  const raw = getCookie(c, OAUTH_POST_LOGIN_COOKIE)
  deleteCookie(c, OAUTH_POST_LOGIN_COOKIE, {
    path: '/',
    secure: isSecureCookieRequest(c),
    sameSite: 'Lax',
  })

  const path = sanitizeLmsPostLoginPath(raw || '')
  if (path) {
    const origin = getRequestPublicOrigin(c).replace(/\/$/, '')
    const hasQuery = path.includes('?')
    const sep = hasQuery ? '&' : '?'
    return c.redirect(`${origin}${path}${sep}oauth_sync=1`, 302)
  }

  return c.redirect(oauthSuccessLandingUrl(c), 302)
}
