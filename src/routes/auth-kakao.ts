/**
 * 카카오 소셜 로그인 API
 * /api/auth/kakao/*
 */

import { Context, Hono } from 'hono'
import { Bindings, User } from '../types/database'
import { 
  successResponse, 
  errorResponse, 
  generateSessionToken,
  addDays,
  SQL_SESSION_EXPIRED,
  formatSessionExpiresAtForDb,
} from '../utils/helpers'
import { applySessionCookie } from '../utils/session-cookie'
import { ensureListedAdminRole } from '../utils/admin-emails'
import {
  envRedirectUriHostname,
  getRequestPublicOrigin,
  isCloudflarePagesPreviewHost,
  isPrivateLanHostname,
  kakaoFixedRedirectUriForProductionHost,
  KAKAO_OAUTH_REDIRECT_URI,
  requestHostname,
  SITE_PUBLIC_ORIGIN,
  isMs12Hostname,
  isLocalDevHostname,
} from '../utils/oauth-public'
import { redirectAfterOAuthOrDefault, setPostLoginPathCookie } from '../utils/oauth-post-login'
import { getKakaoClientId } from '../utils/kakao-client-id'

/** kapi /v2/user/me — profile·닉네임은 동의·설정에 따라 없을 수 있음 */
type KakaoMeResponse = {
  id: number
  kakao_account?: {
    profile?: {
      nickname?: string
      profile_image_url?: string
    }
    email?: string
  }
}

const KAKAO_DISPLAY_NAME_FALLBACK = '카카오사용자' as const

/**
 * 1) 카카오 닉네임 → 2) 이메일 @ 앞 → 3) 고정 문구
 */
function resolveKakaoDisplayName(kakaoUser: KakaoMeResponse, emailForFallback: string): string {
  const nick = kakaoUser.kakao_account?.profile?.nickname?.trim()
  if (nick) return nick
  const local = (emailForFallback || '').split('@')[0]?.trim()
  if (local) return local
  return KAKAO_DISPLAY_NAME_FALLBACK
}

const authKakao = new Hono<{ Bindings: Bindings }>()

/** D1 `.run().meta` — google 콜백과 동일 (lastRowId 변형 대비) */
function d1LastInsertUserId(
  meta: { last_row_id?: number; lastRowId?: number } | null | undefined,
): number {
  const raw = meta?.last_row_id ?? meta?.lastRowId
  if (raw == null) return 0
  const n = typeof raw === 'bigint' ? Number(raw) : Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0
}

/** 콜백·오류 후 이동 — MS12 회의 앱 로그인 */
function kakaoErrorLandingPath(c: Context<{ Bindings: Bindings }>): string {
  const h = requestHostname(c)
  if (h === 'localhost' || h === '127.0.0.1') return '/app?kakao_err=1'
  if (isCloudflarePagesPreviewHost(h)) return '/app?kakao_err=1'
  if (isMs12Hostname(h)) return '/app?kakao_err=1'
  return '/app?kakao_err=1'
}

function getRequestOrigin(c: Context<{ Bindings: Bindings }>): string {
  return getRequestPublicOrigin(c)
}

function kakaoEscHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 브라우저에 보여 주는 실패/안내용 HTML (API JSON 대신) */
function kakaoGuideBodyStyle(): string {
  return 'font-family: system-ui, -apple-system, "Segoe UI", sans-serif; max-width: 640px; margin: 0 auto; padding: 28px 20px; color: #1e293b; line-height: 1.65;'
}

/** soft delete — deleted_at 이 없는 스키마에선 undefined 만 오므로 false */
function isUserSoftDeleted(u: User | null | undefined): boolean {
  if (!u) return false
  const d = u.deleted_at
  if (d == null) return false
  return String(d).trim() !== ''
}

function kakaoUserGuidePage(
  c: Context<{ Bindings: Bindings }>,
  title: string,
  lead: string,
  extraBlocks: string,
  backLabel = '이전으로 돌아가기',
): string {
  const back = kakaoErrorLandingPath(c)
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${kakaoEscHtml(title)}</title>
</head>
<body style="${kakaoGuideBodyStyle()}">
  <h1 style="font-size: 1.2rem; color: #0f172a; margin: 0 0 0.75rem;">${kakaoEscHtml(title)}</h1>
  <p style="margin: 0 0 1.25rem; color: #475569;">${lead}</p>
  ${extraBlocks}
  <p style="margin-top: 1.75rem;">
    <a href="${kakaoEscHtml(back)}" style="display: inline-block; background: #0f172a; color: #fff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-size: 0.95rem;">${kakaoEscHtml(backLabel)}</a>
  </p>
</body>
</html>`
}

function kakaoRedirectUriBlock(c: Context<{ Bindings: Bindings }>): string {
  const uri = kakaoEscHtml(resolveKakaoRedirectUri(c))
  const h = requestHostname(c)
  const siteDomain = kakaoEscHtml(
    isMs12Hostname(h) ? 'ms12.org' : (getRequestOrigin(c).replace(/\/$/, '').replace(/^https?:\/\//, '') || '(호스트)'),
  )
  return `<div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px; margin:1rem 0; font-size:0.9rem;">
    <p style="margin:0 0 0.5rem; font-weight:600; color:#0f172a;">이번 OAuth 요청에 사용한 Redirect URI (KOE006 방지: 콘솔에 <strong>이 한 줄</strong>과 동일)</p>
    <code style="word-break: break-all; color:#0c4a6e;">${uri}</code>
    <p style="margin:0.9rem 0 0.35rem; font-weight:600; color:#0f172a;">Web 플랫폼 · 사이트 도메인 (카카오 [플랫폼] Web, https·경로 없이)</p>
    <code style="word-break: break-all; color:#334155;">${siteDomain}</code>
  </div>`
}

function explainKakaoQueryError(
  error: string | undefined,
  errorDescription: string | undefined,
): { title: string; leadHtml: string } {
  const e = (error || '').toLowerCase()
  const d = (errorDescription || '').toLowerCase()
  if (e === 'access_denied') {
    return {
      title: '로그인이 취소되었습니다',
      leadHtml: '카카오 로그인 창에서 동의를 누르지 않고 돌아온 경우입니다. 다시 시도하려면 <strong>카카오로 로그인</strong>을 눌러 주세요.',
    }
  }
  if (d.includes('redirect') || d.includes('redirect_uri') || d.includes('invalid_request')) {
    return {
      title: 'Redirect URI가 일치하지 않습니다',
      leadHtml:
        '카카오에 등록한 주소와, 실제로 로그인에 사용한 주소가 다를 때 납니다. 아래 <strong>Redirect URI</strong>를 카카오 개발자 콘솔 [내 앱] → <strong>앱 키</strong> / <strong>플랫폼</strong> / <strong>Redirect URI</strong>에 <strong>한 글자도 다르지 않게</strong> 넣어 주세요.',
    }
  }
  if (e === 'koe006' || d.includes('koe006')) {
    return {
      title: 'KOE006 — Redirect URI 또는 Web 플랫폼 불일치',
      leadHtml:
        '콘솔에 운영: <code>https://ms12.org/auth/kakao/callback</code> + Web 도메인 <code>ms12.org</code> · 로컬: <code>http://localhost:3000/auth/kakao/callback</code> (Vite 포트에 맞출 것, <strong>/api/… 가 아닌 /auth/…</strong>)<br/><br/>' +
        '서버는 <code>www</code> 로 접속해도 redirect_uri 는 <strong>고정(apex)</strong>으로 맞춥니다. 콘솔에도 <strong>아래에 표시된 Redirect URI 한 줄</strong>을 그대로 등록하세요.',
    }
  }
  if (d.includes('koe') || (d.includes('client') && d.includes('invalid'))) {
    return {
      title: '카카오 앱 설정을 확인해 주세요',
      leadHtml: `원인: <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${kakaoEscHtml(error || '')}</code> / ${kakaoEscHtml(errorDescription || '—')}<br/><br/>REST API 키·Client Secret(사용 시)·Redirect URI·플랫폼 도메인이 모두 콘솔과 맞는지 확인해 주세요.`,
    }
  }
  return {
    title: '카카오에서 로그인을 완료하지 못했습니다',
    leadHtml: `오류 코드: <strong>${kakaoEscHtml(error || '—')}</strong><br/>설명: ${kakaoEscHtml(errorDescription || '자세한 설명이 없습니다.')}<br/><br/>카카오 개발자 콘솔에서 <strong>카카오 로그인</strong> 사용 설정, <strong>Redirect URI</strong>·<strong>사이트 도메인</strong>이 현재 사이트와 같은지 확인해 주세요.`,
  }
}

function userFacingTokenError(errMessage: string): { title: string; leadHtml: string } {
  const m = errMessage.toLowerCase()
  if (m.includes('redirect_uri_mismatch') || m.includes('invalid_grant') || m.includes('mismatch')) {
    return {
      title: 'Redirect URI가 맞지 않아 토큰을 받지 못했습니다',
      leadHtml:
        '로그인을 시작한 주소(도메인)와, 콘솔에 등록한 <strong>Redirect URI</strong>·<strong>웹 사이트 도메인</strong>이 정확히 일치하는지 다시 확인해 주세요. 프리뷰 URL과 실제 운영 도메인이 다르면 <strong>각각</strong> 콘솔에 넣어야 합니다.',
    }
  }
  if (m.includes('koe010') || m.includes('invalid_client')) {
    return {
      title: '앱 키(Client ID / Client Secret)를 확인해 주세요',
      leadHtml:
        '서버에 설정한 <strong>REST API 키</strong>나 <strong>Client Secret</strong>이 카카오 개발자 콘솔의 값과 다를 수 있습니다. Workers / Cloudflare .dev.vars 를 확인하세요.',
    }
  }
  if (m.includes('failed to get user info') || m.includes('kapi.kakao.com')) {
    return {
      title: '로그인은 되었으나 회원 정보를 읽을 수 없습니다',
      leadHtml: '잠시 후 다시 시도하거나, 카카오톡 앱·계정 권한(동의 항목)을 확인해 주세요.',
    }
  }
  return {
    title: '카카오 로그인 처리 중 오류가 났습니다',
    leadHtml: `기술 메시지: <code style="word-break: break-all; background:#f1f5f9; padding: 4px 8px; border-radius: 4px; font-size:0.85rem;">${kakaoEscHtml(errMessage)}</code>`,
  }
}

/**
 * *.pages.dev 등으로 OAuth를 시작하면 redirect_uri가 예전 호스트로 잡혀 KOE006이 난다.
 * 로컬 개발(localhost)은 그대로 둔다.
 */
function redirectKakaoOAuthToCanonicalOrigin(c: Context<{ Bindings: Bindings }>): Response | undefined {
  const raw =
    c.req.header('x-forwarded-host') ||
    c.req.header('host') ||
    new URL(c.req.url).host
  const h = raw.split(',')[0].trim().split(':')[0]
  if (!h || isMs12Hostname(h)) return undefined
  if (isPrivateLanHostname(h)) return undefined
  if (isCloudflarePagesPreviewHost(h)) return undefined
  const u = new URL(c.req.url)
  return c.redirect(`${SITE_PUBLIC_ORIGIN}${u.pathname}${u.search}`, 302)
}

function isAllowedKakaoRedirectUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
    const p = u.pathname.replace(/\/$/, '') || '/'
    const pathOk = p === '/auth/kakao/callback' || p === '/api/auth/kakao/callback'
    if (!pathOk) return false
    const h = u.hostname
    return (
      isMs12Hostname(h) ||
      isPrivateLanHostname(h) ||
      isCloudflarePagesPreviewHost(h)
    )
  } catch {
    return false
  }
}

/**
 * authorize·token 교환에 동일한 redirect_uri.
 * - 프로덕션 ms12.org: **고정 URL** (www 로 들어와도 KOE006 없이 콘솔 1줄과 일치)
 * - *.pages.dev / 사설 IP / 서브도메인: **요청 Origin** 기반
 */
function resolveKakaoRedirectUri(c: Context<{ Bindings: Bindings }>): string {
  const pathname = new URL(c.req.url).pathname.replace(/\/$/, '') || '/'
  /** 콜백 요청: 인가(authorize)에 넣은 redirect_uri와 **바이트 단위로 동일**하게 토큰 요청에 넣어야 함 */
  if (pathname === '/auth/kakao/callback' || pathname === '/api/auth/kakao/callback') {
    const origin = getRequestPublicOrigin(c).replace(/\/$/, '')
    return pathname === '/api/auth/kakao/callback' ? `${origin}/api/auth/kakao/callback` : `${origin}/auth/kakao/callback`
  }

  const h = requestHostname(c)
  /**
   * localhost: .env 의 KAKAO_REDIRECT_URI 가 예전 `/api/auth/kakao/callback` 이면 KOE006 유발.
   * 운영과 동일하게 항상 `/auth/kakao/callback` 만 쓴다. (콘솔에 `http://localhost:3000/auth/kakao/callback` 등록)
   */
  if (isLocalDevHostname(h)) {
    return `${getRequestPublicOrigin(c).replace(/\/$/, '')}/auth/kakao/callback`
  }
  if (isPrivateLanHostname(h)) {
    const fromEnv = (c.env.KAKAO_REDIRECT_URI || '').trim().replace(/\/$/, '')
    if (fromEnv && isAllowedKakaoRedirectUrl(fromEnv)) return fromEnv
    return `${getRequestPublicOrigin(c).replace(/\/$/, '')}/auth/kakao/callback`
  }
  if (isCloudflarePagesPreviewHost(h)) {
    return `${getRequestPublicOrigin(c).replace(/\/$/, '')}/auth/kakao/callback`
  }
  const fixed = kakaoFixedRedirectUriForProductionHost(h)
  if (fixed) return fixed
  const fromEnv = (c.env.KAKAO_REDIRECT_URI || '').trim().replace(/\/$/, '')
  if (fromEnv && fromEnv !== KAKAO_OAUTH_REDIRECT_URI) {
    console.warn('[KAKAO_REDIRECT] Production ignores KAKAO_REDIRECT_URI (use canonical KAKAO_OAUTH_REDIRECT_URI only):', fromEnv)
  }
  return KAKAO_OAUTH_REDIRECT_URI
}

/**
 * GET /api/auth/kakao/ready
 * 클라이언트: REST 키 설정 여부만(값 없음)
 */
authKakao.get('/ready', (c) => {
  const id = getKakaoClientId(c)
  const ok = !!id && id !== 'your_kakao_rest_api_key'
  return c.json(
    successResponse({
      kakaoConfigured: ok,
      hint: ok
        ? null
        : '로컬: 루트 .env 또는 .dev.vars에 KAKAO_CLIENT_ID(REST) 후 dev 재시작. 자동 병합: npm run dev 전 ensure-kakao-dev-vars.mjs',
    }),
  )
})

/**
 * GET /api/auth/kakao/login
 * 카카오 로그인 시작 (카카오 인증 페이지로 리다이렉트)
 */
authKakao.get('/login', async (c) => {
  try {
    {
      const hostOnly = (c.req.header('host') || '').split(':')[0] || ''
      if (isPrivateLanHostname(hostOnly)) {
        const id = getKakaoClientId(c)
        // eslint-disable-next-line no-console
        console.log('[KAKAO_LOGIN] KAKAO_CLIENT_ID', id ? `set (len ${id.length})` : 'missing')
      }
    }
    const forceCanon = redirectKakaoOAuthToCanonicalOrigin(c)
    if (forceCanon) return forceCanon

    const nextParam = c.req.query('next')
    if (nextParam) setPostLoginPathCookie(c, nextParam)

    const clientId = getKakaoClientId(c)
    const redirectUri = resolveKakaoRedirectUri(c)

    if (!clientId || clientId === 'your_kakao_rest_api_key') {
      console.error('[KAKAO_LOGIN] KAKAO_CLIENT_ID 미설정 또는 플레이스홀더')
      return c.html(
        kakaoUserGuidePage(
          c,
          '서버에 카카오 REST API 키가 없습니다',
          '배포 환경(Cloudflare Workers 등)에 <strong>KAKAO_CLIENT_ID</strong>가 설정되어 있지 않습니다. 팀에서 발급한 <strong>REST API 키</strong>를 시크릿/환경 변수에 넣은 뒤 다시 시도해 주세요.',
          `<ul style="margin:0; padding-left:1.1rem; color:#475569;">
            <li>로컬: <code style="background:#f1f5f9;">.env</code>에 <code>KAKAO_CLIENT_ID=</code>(REST API 키) 한 줄을 넣으면, <code>npm run dev</code> / <code>dev:d1</code> 시 자동으로 <code>.dev.vars</code>에 병합됩니다(스크립트: <code>ensure-kakao-dev-vars.mjs</code>). 적용 후 서버를 다시 켜 주세요.</li>
            <li>운영(Cloudflare <strong>Pages</strong> 배포): <strong>Workers &amp; Pages</strong> → 해당 <strong>Pages</strong> 프로젝트 → <strong>Settings</strong> → <strong>Variables and Secrets</strong>에서 <code>KAKAO_CLIENT_ID</code> 추가(Production·Preview 각각 필요 시 둘 다).</li>
            <li>값이 <code>your_kakao_rest_api_key</code> 등 플레이스홀더면 실제 REST 키로 바꿔 주세요.</li>
          </ul>
          <p style="color:#64748b; font-size:0.92rem; margin:1rem 0 0;">(브라우저용 <strong>JavaScript 키</strong>와는 다른 값입니다. 서버 쪽은 REST API 키입니다.)</p>
          <p style="color:#334155; font-size:0.92rem; margin:1rem 0 0;">로컬에서 <code>npm run dev</code> 를 쓰는 경우: <code>.dev.vars</code> 는 <strong>package.json 이 있는 프로젝트 루트</strong>에 두어야 하며, 내용을 바꾼 뒤에는 <strong>개발 서버를 완전히 끄고 다시</strong> 켜 주세요(환경 캐시). 주입 여부는 터미널에서 <code>npm run verify:kakao-env</code> 로만 확인(값은 출력되지 않음)할 수 있습니다.</p>`,
          '앱으로 돌아가기',
        ),
        503,
      )
    }

    console.log('[KAKAO_LOGIN] Client ID prefix:', clientId.slice(0, 12) + '…')
    console.log('[KAKAO_LOGIN] Redirect URI:', redirectUri)
    console.log('[KAKAO_LOGIN] Request origin:', getRequestOrigin(c))
    
    // 카카오 인증 URL 생성
    const kakaoAuthUrl = new URL('https://kauth.kakao.com/oauth/authorize')
    kakaoAuthUrl.searchParams.set('client_id', clientId)
    kakaoAuthUrl.searchParams.set('redirect_uri', redirectUri)
    kakaoAuthUrl.searchParams.set('response_type', 'code')
    // [동의 항목]에 없는 scope 를 넣으면 invalid_scope(예: profile_image). 콘솔에서 닉/프로필을 켠 뒤 아래에 profile_nickname·profile_image 추가
    kakaoAuthUrl.searchParams.set('scope', 'account_email')

    const marketingParam = c.req.query('marketing')
    const marketing =
      marketingParam === '1' ||
      marketingParam === 'true' ||
      marketingParam === 'yes'
    kakaoAuthUrl.searchParams.set('state', marketing ? 'm1' : 'm0')

    console.log('[KAKAO_LOGIN] Full OAuth URL:', kakaoAuthUrl.toString())
    
    // 카카오 로그인 페이지로 리다이렉트
    return c.redirect(kakaoAuthUrl.toString())
    
  } catch (error) {
    console.error('Kakao login start error:', error)
    return c.json(errorResponse('카카오 로그인 시작에 실패했습니다.'), 500)
  }
})

/**
 * GET /api/auth/kakao/debug
 * 운영 환경에서 실제로 사용 중인 설정을 "일부 마스킹"하여 확인
 */
authKakao.get('/debug', (c) => {
  const forceCanon = redirectKakaoOAuthToCanonicalOrigin(c)
  if (forceCanon) return forceCanon

  const clientId = getKakaoClientId(c)
  const clientSecret = (c.env.KAKAO_CLIENT_SECRET || '').trim()
  const h = requestHostname(c)
  const origin = getRequestOrigin(c)
  /** 비로컬 호스트에서는 JSON에 상수만 노출(에지 캐시·구 Worker 혼선 방지) */
  const redirectUri = resolveKakaoRedirectUri(c)

  return c.json(
    successResponse({
      origin,
      redirectUri,
      canonicalRedirectUri: KAKAO_OAUTH_REDIRECT_URI,
      kakaoFixedForThisHost: kakaoFixedRedirectUriForProductionHost(h),
      sitePublicOrigin: SITE_PUBLIC_ORIGIN,
      kakaoRedirectPolicy: 'prod-fixed-uri-for-apex-ms12',
      envKakaoRedirectUriPresent: !!(c.env.KAKAO_REDIRECT_URI || '').trim(),
      envKakaoRedirectHostname: envRedirectUriHostname(c.env.KAKAO_REDIRECT_URI),
      envNextPublicSiteUrl: (c.env.NEXT_PUBLIC_SITE_URL || '').trim() || null,
      clientIdPrefix: clientId ? clientId.slice(0, 8) : null,
      clientIdLength: clientId ? clientId.length : 0,
      hasClientSecret: !!clientSecret,
    })
  )
})

/**
 * GET /auth/kakao/callback · GET /api/auth/kakao/callback — 카카오 로그인 콜백(동일 핸들러, 경로 2곳 마운트)
 */
export async function handleKakaoOAuthCallback(c: Context<{ Bindings: Bindings }>) {
  try {
    // 모든 쿼리 파라미터 로깅 (디버깅용)
    const allParams = c.req.url.split('?')[1] || 'no params'
    console.log('[KAKAO_CALLBACK] Full URL:', c.req.url)
    console.log('[KAKAO_CALLBACK] All params:', allParams)
    
    const code = c.req.query('code')
    const oauthState = c.req.query('state') || 'm0'
    const marketingForNewUser = oauthState === 'm1' ? 1 : 0
    const error = c.req.query('error')
    const errorDescription = c.req.query('error_description')
    
    console.log('[KAKAO_CALLBACK] code:', code || 'MISSING')
    console.log('[KAKAO_CALLBACK] error:', error || 'none')
    console.log('[KAKAO_CALLBACK] error_description:', errorDescription || 'none')
    
    // 에러 파라미터 확인
    if (error) {
      console.error('[KAKAO_CALLBACK] OAuth Error:', error, errorDescription)
      const ex = explainKakaoQueryError(error, errorDescription)
      return c.html(
        kakaoUserGuidePage(
          c,
          ex.title,
          ex.leadHtml,
          kakaoRedirectUriBlock(c),
        ),
      )
    }
    
    if (!code) {
      console.error('[KAKAO_CALLBACK] No authorization code - This means Kakao rejected the request')
      console.error('[KAKAO_CALLBACK] Possible reasons:')
      console.error('[KAKAO_CALLBACK] 1. Redirect URI mismatch in Kakao Developers Console')
      console.error('[KAKAO_CALLBACK] 2. Web platform domain not registered')
      console.error('[KAKAO_CALLBACK] 3. Kakao Login not activated')
      console.error('[KAKAO_CALLBACK] 4. Test user not registered (if app is in development mode)')

      const noCodeLead =
        '브라우저로 돌아온 URL에 <strong>code=</strong>가 없습니다. <strong>아래에 나온 Redirect URI</strong>를 카카오 콘솔에 <strong>그대로</strong> 등록했는지 확인하세요. 그 밖: <strong>1)</strong> Web Redirect URI 불일치 <strong>2)</strong> Web 플랫폼 <strong>사이트 도메인</strong> 없음(보통 <code>localhost:3000</code> 등) <strong>3)</strong> 앱이 개발/검수면 <strong>테스트 카카오 계정</strong> 등록'

      return c.html(
        kakaoUserGuidePage(
          c,
          '인증 코드(authorization code)를 받지 못했습니다',
          noCodeLead,
          `${kakaoRedirectUriBlock(c)}
          <p style="font-size:0.8rem; color:#94a3b8; margin-top:1.25rem; word-break:break-all;">기술용 참고 URL: ${kakaoEscHtml(c.req.url)}</p>`,
        ),
      )
    }
    
  const clientId = getKakaoClientId(c)
  const redirectUri = resolveKakaoRedirectUri(c)
  const clientSecret = c.env.KAKAO_CLIENT_SECRET?.trim()

    if (!clientId) {
      return c.html(
        kakaoUserGuidePage(
          c,
          '서버에 카카오 REST API 키가 없습니다',
          '로그인 화면까지는 왔지만, 토큰을 요청하는 서버에 <strong>KAKAO_CLIENT_ID</strong>가 비어 있습니다. 이미 인가 코드를 받은 뒤라도 키가 없으면 로그인을 끝낼 수 없습니다.',
          `<ul style="margin:0; padding-left:1.1rem; color:#475569;">
            <li>Cloudflare Workers / <code style="background:#f1f5f9;">.dev.vars</code> 에 <strong>REST API 키</strong>가 들어 있는지 확인</li>
            <li>배포 후에도 동일한지(프로덕션 시크릿 누락 여부)</li>
          </ul>`,
        ),
      )
    }

    console.log('[KAKAO_CALLBACK] Code received:', code.substring(0, 10) + '...')
    console.log('[KAKAO_CALLBACK] Using redirect_uri:', redirectUri)

    // 1. 액세스 토큰 요청 (실패 시 client_secret 없이 1회 재시도)
    console.log('[KAKAO_CALLBACK] Requesting access token...')

    async function requestToken(params: URLSearchParams) {
      return await fetch('https://kauth.kakao.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      })
    }

    const tokenParamsWithSecret = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code: code,
    })
    if (clientSecret) {
      tokenParamsWithSecret.set('client_secret', clientSecret)
    }

    const tokenParamsWithoutSecret = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code: code,
    })

    let tokenResponse = await requestToken(tokenParamsWithSecret)
    console.log('[KAKAO_CALLBACK] Token response status:', tokenResponse.status)

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('[KAKAO_CALLBACK] Token request failed:', errorText)

      const shouldRetryWithoutSecret =
        clientSecret &&
        (errorText.includes('KOE010') || errorText.includes('invalid_client'))

      if (shouldRetryWithoutSecret) {
        console.warn(
          '[KAKAO_CALLBACK] KOE010/invalid_client. Retrying token request without client_secret...'
        )
        const retryResponse = await requestToken(tokenParamsWithoutSecret)
        console.log('[KAKAO_CALLBACK] Retry token response status:', retryResponse.status)

        if (!retryResponse.ok) {
          const retryErrorText = await retryResponse.text().catch(() => '')
          console.error('[KAKAO_CALLBACK] Retry token request failed:', retryErrorText)
          throw new Error(
            `Failed to get access token: ${tokenResponse.status} - ${errorText} (retry: ${retryResponse.status} - ${retryErrorText})`
          )
        }

        tokenResponse = retryResponse
      } else {
        throw new Error(`Failed to get access token: ${tokenResponse.status} - ${errorText}`)
      }
    }

    const tokenData = await tokenResponse.json<{
      access_token: string
      token_type: string
      refresh_token: string
      expires_in: number
    }>()
    
    // 2. 사용자 정보 요청
    console.log('[KAKAO_CALLBACK] Requesting user info...')
    const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    })
    
    console.log('[KAKAO_CALLBACK] User info response status:', userResponse.status)
    
    if (!userResponse.ok) {
      const errorText = await userResponse.text()
      console.error('[KAKAO_CALLBACK] User info request failed:', errorText)
      throw new Error(`Failed to get user info: ${userResponse.status} - ${errorText}`)
    }
    
    const kakaoUser = await userResponse.json<KakaoMeResponse>()
    const kakaoEmail = (kakaoUser.kakao_account?.email || '').trim() || null
    
    const { DB } = c.env
    
    console.log('[KAKAO_CALLBACK] Kakao user ID:', kakaoUser.id)
    console.log(
      '[KAKAO_CALLBACK] Kakao nickname (raw):',
      kakaoUser.kakao_account?.profile?.nickname ?? '(none)',
    )
    console.log('[KAKAO_CALLBACK] Kakao email:', kakaoEmail || 'not provided')
    
    // 3. 기존 사용자 확인 (SQL 에서 deleted_at 를 쓰지 않음 — D1에 컬럼 없을 때 D1_ERROR 방지)
    const row = await DB.prepare(`
      SELECT * FROM users 
      WHERE social_provider = 'kakao' AND social_id = ?
    `).bind(kakaoUser.id.toString()).first<User>()

    if (row && isUserSoftDeleted(row)) {
      return c.html(
        kakaoUserGuidePage(
          c,
          '로그인할 수 없습니다',
          '탈퇴 처리된 계정입니다. 복구가 필요하면 관리자에게 문의하세요.',
          kakaoRedirectUriBlock(c),
        ),
        403,
      )
    }
    const existingUser = row
    const isNewUser = !existingUser
    console.log('[KAKAO_CALLBACK] isNewUser:', isNewUser)

    let userId: number
    let user: User

    if (existingUser) {
      // 기존 사용자 - 로그인 처리
      const uid = Number(existingUser.id)
      if (!Number.isFinite(uid) || uid < 1) {
        throw new Error('Invalid existing user id from database (Kakao)')
      }
      console.log('[KAKAO_CALLBACK] Existing user found, ID:', uid)
      userId = uid
      user = existingUser

      const displayName = resolveKakaoDisplayName(
        kakaoUser,
        existingUser.email || kakaoEmail || `kakao_${kakaoUser.id}@kakao.local`,
      )
      const profileImageUrl = kakaoUser.kakao_account?.profile?.profile_image_url ?? null
      
      // 프로필 업데이트 (이름, 이미지 변경 가능성)
      await DB.prepare(`
        UPDATE users 
        SET name = ?,
            profile_image_url = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).bind(
        displayName,
        profileImageUrl,
        userId
      ).run()
      
    } else {
      // 신규 사용자 - 회원가입 처리
      console.log('[KAKAO_CALLBACK] New user, creating account...')
      const email = kakaoEmail || `kakao_${kakaoUser.id}@kakao.local`
      const displayName = resolveKakaoDisplayName(kakaoUser, email)
      const profileImageUrl = kakaoUser.kakao_account?.profile?.profile_image_url ?? null
      console.log('[KAKAO_CALLBACK] Email for registration:', email)
      console.log('[KAKAO_CALLBACK] Resolved display name:', displayName)
      
      // 이메일 중복 체크
      const emailCheck = await DB.prepare(`
        SELECT id FROM users WHERE email = ?
      `).bind(email).first()
      
      if (emailCheck) {
        // 이메일은 있지만 카카오 연동 안 됨
        return c.html(`
          <html>
            <head>
              <script>
                alert('이미 가입된 이메일입니다. 기존 계정(비밀번호·다른 수단)으로 로그인하거나, 관리자에게 문의하세요.');
                window.location.href = ${JSON.stringify(kakaoErrorLandingPath(c))};
              </script>
            </head>
          </html>
        `)
      }
      
      // 신규 회원 가입 (간편가입: 약관·개인정보는 가입 절차에서 동의한 것으로 처리, 마케팅은 OAuth state 반영)
      try {
        const result = await DB.prepare(`
        INSERT INTO users (
          email, password_hash, name, social_provider, social_id, 
          profile_image_url, role, terms_agreed, privacy_agreed, marketing_agreed
        ) VALUES (?, '', ?, 'kakao', ?, ?, 'student', 1, 1, ?)
      `).bind(
        email,
        displayName,
        kakaoUser.id.toString(),
        profileImageUrl,
        marketingForNewUser
      ).run()
        if (!result.success) {
          throw new Error(
            String((result as { error?: string }).error || 'INSERT users (full) failed'),
          )
        }
        const lid = d1LastInsertUserId(result.meta)
        if (!lid) {
          throw new Error('D1 last_row_id missing after users INSERT (full, Kakao)')
        }
        userId = lid
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (
          !/terms_agreed|privacy_agreed|marketing_agreed|no such column|no column named|D1_ERROR/i.test(
            msg,
          )
        ) {
          throw e
        }
        const result = await DB.prepare(`
          INSERT INTO users (
            email, password_hash, name, social_provider, social_id, 
            profile_image_url, role
          ) VALUES (?, '', ?, 'kakao', ?, ?, 'student')
        `).bind(
          email,
          displayName,
          kakaoUser.id.toString(),
          profileImageUrl,
        ).run()
        if (!result.success) {
          throw new Error(
            String((result as { error?: string }).error) || msg,
          )
        }
        const lidFb = d1LastInsertUserId(result.meta)
        if (!lidFb) {
          throw new Error('D1 last_row_id missing after users INSERT (fallback, Kakao)')
        }
        userId = lidFb
        console.warn(
          '[KAKAO_CALLBACK] users 약관 컬럼 없음—폴백 INSERT. D1에 migrations/0072_users_terms_privacy_marketing.sql 적용 권장.',
        )
      }
      console.log('[KAKAO_CALLBACK] New user created, ID:', userId)
      
      // 생성된 사용자 정보 조회
      const newUser = await DB.prepare(`
        SELECT * FROM users WHERE id = ?
      `).bind(userId).first<User>()
      
      if (!newUser) {
        throw new Error('Failed to create user')
      }
      
      user = newUser
    }

    userId = Number(userId)
    if (!Number.isFinite(userId) || userId < 1) {
      throw new Error('Invalid user id before session (Kakao NaN/0)')
    }
    const userRowCheck = await DB.prepare('SELECT id FROM users WHERE id = ?')
      .bind(userId)
      .first<{ id: number }>()
    if (!userRowCheck) {
      throw new Error('User row not found for session (Kakao orphan id check)')
    }
    console.log(`[KAKAO USER UPSERT] userId=${userId}`)

    await ensureListedAdminRole(DB, user.email, userId)
    
    // 4. 기존 세션 삭제 (만료된 세션 정리)
    await DB.prepare(`
      DELETE FROM sessions 
      WHERE user_id = ? AND ${SQL_SESSION_EXPIRED}
    `).bind(userId).run()
    
    // 5. 새 세션 생성
    console.log('[KAKAO_CALLBACK] Creating session for user:', userId)
    const sessionToken = generateSessionToken()
    const expiresAt = addDays(new Date(), 7)
    
    const kakaoIns = await DB.prepare(`
      INSERT INTO sessions (
        user_id, session_token, expires_at
      ) VALUES (?, ?, ?)
    `).bind(userId, sessionToken, formatSessionExpiresAtForDb(expiresAt)).run()
    console.log(
      '[KAKAO_CALLBACK] sessionInsert: success=',
      kakaoIns.success,
      'last_row_id=',
      kakaoIns.meta?.last_row_id ?? '(n/a)',
    )
    if (!kakaoIns.success) {
      console.error('[KAKAO_CALLBACK] sessions INSERT failed:', kakaoIns)
      throw new Error('세션을 저장하지 못했습니다.')
    }

    const sessionPrefix = sessionToken.slice(0, 8)
    console.log('[KAKAO_CALLBACK] sessions INSERT ok', {
      success: kakaoIns.success,
      user_id: userId,
      session_prefix: sessionPrefix,
      last_row_id: kakaoIns.meta?.last_row_id ?? null,
    })

    // 6. 로그인 시간 업데이트는 생략 (컬럼 없음)

    // 7. HttpOnly 쿠키 설정 + 리다이렉트 (Domain 미지정 — session-cookie.ts)
    console.log('[KAKAO_CALLBACK] Login SUCCESS for user:', user.name)
    const maxAgeSec = 7 * 24 * 60 * 60
    const sessionCookie = applySessionCookie(c, sessionToken, maxAgeSec)
    console.log('[KAKAO_CALLBACK] Set-Cookie preview (first 140 chars):', sessionCookie.slice(0, 140))
    console.log('[KAKAO_CALLBACK] set-cookie-options', {
      session_prefix: sessionPrefix,
      Path: '/',
      HttpOnly: true,
      SameSite: 'None',
      Secure: true,
      Domain: '(unset or .ms12.org; see session-cookie)',
    })
    console.log(
      '[KAKAO_CALLBACK] next: 200 HTML + location.replace(/app/meeting) — Set-Cookie on same response as HTML body',
    )

    return redirectAfterOAuthOrDefault(c, sessionCookie)
    
  } catch (error) {
    console.error('[KAKAO_CALLBACK] ===== ERROR OCCURRED =====')
    console.error('[KAKAO_CALLBACK] Error type:', error?.constructor?.name)
    console.error('[KAKAO_CALLBACK] Error message:', error?.message)
    console.error('[KAKAO_CALLBACK] Full error:', error)

    const errMessage = error?.message ? String(error.message) : '알 수 없는 오류'
    const uf = userFacingTokenError(errMessage)
    return c.html(
      kakaoUserGuidePage(
        c,
        uf.title,
        uf.leadHtml,
        `${kakaoRedirectUriBlock(c)}`,
      ),
    )
  }
}

authKakao.get('/callback', handleKakaoOAuthCallback)

export default authKakao
