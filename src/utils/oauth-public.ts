/**
 * 공식 도메인·OAuth 콜백 URL 단일 출처 (환경 변수와 무관하게 동일 문자열 유지)
 */
import { Context } from 'hono'

export const SITE_PUBLIC_ORIGIN = 'https://mindstory.kr'

/** 구 Cloudflare Pages 기본 호스트 북마크 → 공식 도메인으로 302 */
export const LEGACY_PAGES_HOSTNAMES: readonly string[] = [
  'mslms.pages.dev',
  'www.mslms.pages.dev',
  'main.mslms.pages.dev',
]

export const KAKAO_OAUTH_REDIRECT_URI = `${SITE_PUBLIC_ORIGIN}/api/auth/kakao/callback`
export const GOOGLE_OAUTH_REDIRECT_URI = `${SITE_PUBLIC_ORIGIN}/api/auth/google/callback`

export function requestHostname(c: Context): string {
  const raw =
    c.req.header('x-forwarded-host') ||
    c.req.header('host') ||
    new URL(c.req.url).host
  return raw.split(',')[0].trim().split(':')[0]
}

/** 로컬 wrangler / vite 만 — origin 문자열 includes 검사는 오탐 가능해 사용하지 않음 */
export function isLocalDevHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

/** 디버그용: 시크릿에 들어 있는 Redirect URI의 호스트만 노출 */
export function envRedirectUriHostname(envVal: string | undefined): string | null {
  const t = (envVal || '').trim()
  if (!t) return null
  try {
    return new URL(t).hostname
  } catch {
    return '(invalid-url)'
  }
}
