/**
 * OAuth 콜백 직후: 세션 set 후 /app/meeting 으로 이동.
 * Set-Cookie + 302 를 한 응답에 넣을 때 일부 환경에서 쿠키가 버려지는 경우가 있어,
 * 동일 응답은 200 HTML(클라이언트 location.replace)으로 이동한다.
 * session 쿠키 문자열은 `applySessionCookie` 가 반환한 값을 그대로 넣는다(헤더 재수집 없음).
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

/** OAuth 콜백 동일 응답: 상대 경로로 이동 + Set-Cookie (applySessionCookie 반환 문자열) */
export function redirectAfterOAuthOrDefault(c: Context, sessionCookie?: string) {
  const target = '/app/meeting'
  const secure = isSecureCookieRequest(c)

  const body = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"/><title>MS12</title></head><body><script>location.replace(${JSON.stringify(target)})</script></body></html>`

  const headers = new Headers()
  headers.set('Content-Type', 'text/html; charset=UTF-8')
  headers.set('Cache-Control', 'no-store, must-revalidate, private')
  headers.set('Pragma', 'no-cache')

  if (sessionCookie) {
    headers.append('Set-Cookie', sessionCookie)
  }

  headers.append(
    'Set-Cookie',
    `${OAUTH_POST_LOGIN_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`,
  )

  if (secure) {
    headers.append(
      'Set-Cookie',
      `${OAUTH_POST_LOGIN_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=None; Secure`,
    )
  }

  return new Response(body, { status: 200, headers })
}
