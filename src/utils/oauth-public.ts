/**
 * MS12 회의 플랫폼 — 공식 도메인·OAuth 콜백 (mindstory·LMS 분리)
 */
import { Context } from 'hono'

export const SITE_PUBLIC_ORIGIN = 'https://ms12.org'

/**
 * 카카오 Redirect URI — /auth/kakao/callback (콘솔·Meeting·KOE006 안내와 동일).
 * /api/auth/kakao/callback 은 구버전 호환용으로 auth-kakao 에서 별도 허용.
 */
export const KAKAO_OAUTH_REDIRECT_URI = `${SITE_PUBLIC_ORIGIN}/auth/kakao/callback`

export const GOOGLE_OAUTH_REDIRECT_URI = `${SITE_PUBLIC_ORIGIN}/api/auth/google/callback`

export const OAUTH_SUCCESS_LANDING_URL = `${SITE_PUBLIC_ORIGIN}/app?oauth_sync=1`

/** 구 mslms Pages 북마크 — 필요 시 308(미들웨어) */
export const LEGACY_PAGES_HOSTNAMES: readonly string[] = [
  'mslms.pages.dev',
  'www.mslms.pages.dev',
  'main.mslms.pages.dev',
]

/** ms12.org, ms12.pages.dev, www.ms12.org */
export function isMs12Hostname(hostname: string): boolean {
  const h = (hostname || '').toLowerCase()
  if (h === 'ms12.org' || h === 'www.ms12.org') return true
  if (h.endsWith('.ms12.org') && h.length > 9) return true
  if (h === 'ms12.pages.dev' || h.endsWith('.ms12.pages.dev')) return true
  return false
}

/**
 * 프로덕션: 카카오 redirect_uri 1줄 고정(콘솔·코드 일치) — www도 apex URI 사용
 */
export function kakaoFixedRedirectUriForProductionHost(hostname: string): string | null {
  const h = (hostname || '').toLowerCase()
  if (h === 'ms12.org' || h === 'www.ms12.org' || h.endsWith('.ms12.org')) {
    return KAKAO_OAUTH_REDIRECT_URI
  }
  return null
}

export function requestHostname(c: Context): string {
  const raw =
    c.req.header('x-forwarded-host') ||
    c.req.header('host') ||
    new URL(c.req.url).host
  return raw.split(',')[0].trim().split(':')[0]
}

export function getRequestPublicOrigin(c: Context): string {
  const reqUrl = new URL(c.req.url)
  const protoRaw = c.req.header('x-forwarded-proto') || reqUrl.protocol.replace(':', '') || 'https'
  const proto = (protoRaw.split(',')[0] ?? 'https').trim() || 'https'
  const hostRaw = c.req.header('x-forwarded-host') || c.req.header('host') || reqUrl.host
  const fromHeaders = (hostRaw.split(',')[0] ?? '').trim()
  const host = fromHeaders || reqUrl.host || (reqUrl.hostname ? `${reqUrl.hostname}${reqUrl.port ? `:${reqUrl.port}` : ''}` : '')
  if (host) {
    return `${proto}://${host}`
  }
  return reqUrl.origin
}

/**
 * 302 Location·script redirect용 — 호스트 누락(예: `https://` 단독)으로 about:blank 로 이어지는 것 방지
 */
export function getSafeRequestOrigin(c: Context): string {
  let raw: string
  try {
    raw = getRequestPublicOrigin(c)
    const u = new URL(raw)
    if (u.hostname) return u.origin
  } catch {
    // fall through
  }
  try {
    const u2 = new URL(c.req.url)
    if (u2.hostname) return u2.origin
  } catch {
    // fall through
  }
  const h = requestHostname(c)
  if (h) {
    return h === 'localhost' || h === '127.0.0.1' ? `http://${h}` : `https://${h}`
  }
  return SITE_PUBLIC_ORIGIN.replace(/\/$/, '') || 'https://ms12.org'
}

/** OAuth 콜백 직후 — Zoom 스타일 시작화면 /app */
export function oauthSuccessLandingUrl(c: Context): string {
  return `${getSafeRequestOrigin(c)}/app?oauth_sync=1`
}

export function isLocalDevHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

export function isCloudflarePagesPreviewHost(hostname: string): boolean {
  const x = (hostname || '').toLowerCase()
  return !!x && x.endsWith('.pages.dev')
}

export function isPrivateLanHostname(hostname: string): boolean {
  const h0 = (hostname || '').replace(/^\[|\]$/g, '')
  if (!h0) return false
  const h = h0.toLowerCase()
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return true
  const parts = h.split('.').map((s) => parseInt(s, 10))
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return false
  }
  const [a, b] = [parts[0]!, parts[1]!]
  if (a === 10) return true
  if (a === 192 && b === 168) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  return false
}

export function envRedirectUriHostname(envVal: string | undefined): string | null {
  const t = (envVal || '').trim()
  if (!t) return null
  try {
    return new URL(t).hostname
  } catch {
    return '(invalid-url)'
  }
}
