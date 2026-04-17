/**
 * 마인드스토리 원격평생교육원 LMS 플랫폼
 * Ver.1.4 - 보안 강화 (Beta 준비)
 */

import { Hono, type Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveStatic } from 'hono/cloudflare-workers'
import { Bindings } from './types/database'
import { generalRateLimiter, strictRateLimiter, lenientRateLimiter, rateLimiter } from './middleware/rate-limiter'

// 라우트 임포트
import auth from './routes/auth'
import authKakao from './routes/auth-kakao'
import authGoogle from './routes/auth-google'
import courses from './routes/courses'
import enrollments from './routes/enrollments'
import payments from './routes/payments'  // 결제 API
import portoneOrders from './routes/portone-orders'
import certificateIssuance from './routes/certificate-issuance'
import paymentVerify from './routes/payment-verify'
import certificates from './routes/certificates'  // Phase 4: 수료증 시스템
import admin from './routes/admin'
import landing from './routes/landing'  // 신규 랜딩 페이지
import landingSignatureApi from './routes/landing-signature-api'
import pages from './routes/pages'
import pagesMy from './routes/pages-my'
import pagesAbout from './routes/pages-about'
import pagesAdmin from './routes/pages-admin'
import pagesPayment from './routes/pages-payment'  // 결제 페이지
import popups from './routes/popups'
import notices from './routes/notices'
import posts from './routes/posts'
import videos from './routes/videos'
import progress from './routes/progress'
// Removed: certifications (Phase 2 cleanup)
import upload from './routes/upload'
import ai from './routes/ai'
import aiChat from './routes/ai-chat'
import reviews from './routes/reviews'  // Phase 2: 수강평/별점
// Removed: external video APIs (Phase 2 cleanup - YouTube only)
import aiBulkLessons from './routes/ai-bulk-lessons'
import pagesStudent from './routes/pages-student'
import pagesLearn from './routes/pages-learn'
import analytics from './routes/analytics'
import pagesAnalytics from './routes/pages-analytics'
import pagesCourseDetail from './routes/pages-course-detail'
import pagesCertificateIssue from './routes/pages-certificate-issue'
import pagesCompany from './routes/pages-company'
import pagesCommunity from './routes/pages-community'
import pagesLegal from './routes/pages-legal'
import pagesCertificates from './routes/pages-certificates'
import pagesEnrollment from './routes/pages-enrollment'  // 수강신청 페이지
import pagesBrandCatalog from './routes/pages-brand-catalog'
import digitalBooks from './routes/digital-books'
import forestResults from './routes/forest-results'
import forestGasReport from './routes/forest-gas-report'
import forestGasReportPublic from './routes/forest-gas-report-public'
import forestGasWebhook from './routes/forest-gas-webhook'
import youtubeProxy from './routes/youtube-proxy'
import security from './routes/security'
import { FOOTER_HTML_REVISION } from './utils/site-footer-legal'
import { LEGACY_PAGES_HOSTNAMES, SITE_PUBLIC_ORIGIN } from './utils/oauth-public'
import { ENTERPRISE_HTML_HEAD_INJECT } from './utils/enterprise-client-head'

const app = new Hono<{ Bindings: Bindings }>()

// 미들웨어
app.use('*', logger())

// 구 Pages 호스트·www → 공식 apex (세션 쿠키 Domain=mindstory.kr 과 방문 호스트 통일)
// - Chrome fetch/XHR: 302 리다이렉트 시 POST→GET 으로 바뀌어 로그인 등이 깨질 수 있음 → API(/api/*)는 리다이렉트하지 않음
// - CORS preflight(OPTIONS)가 302/308 을 타면 브라우저마다 실패하기 쉬움 → /api/* 는 호스트 그대로 처리
// - 페이지·정적 리다이렉트는 308(메서드·본문 유지)로 통일 (Edge는 관대해도 Chrome 정합성)
app.use('*', async (c, next) => {
  const raw = c.req.header('x-forwarded-host') || c.req.header('host') || ''
  const host = raw.split(',')[0].trim().split(':')[0]
  const url = new URL(c.req.url)
  const isApi = url.pathname.startsWith('/api/')

  if (LEGACY_PAGES_HOSTNAMES.includes(host)) {
    if (isApi) {
      await next()
      return
    }
    return c.redirect(`${SITE_PUBLIC_ORIGIN}${url.pathname}${url.search}`, 308)
  }
  if (host === 'www.mindstory.kr') {
    if (isApi) {
      await next()
      return
    }
    return c.redirect(`${SITE_PUBLIC_ORIGIN}${url.pathname}${url.search}`, 308)
  }
  await next()
})

// HTML: 캐시 금지 + Enterprise Chrome 유령 SW·옛 <head> 대응(등록된 SW unregister, meta 힌트)
app.use('*', async (c, next) => {
  await next()
  const ct = c.res.headers.get('Content-Type') || ''
  if (!ct.includes('text/html')) return

  const res = c.res
  const headers = new Headers(res.headers)
  headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate')

  let body: string
  try {
    body = await res.clone().text()
  } catch {
    c.res = new Response(res.body, { status: res.status, statusText: res.statusText, headers })
    return
  }

  if (/<head[\s>]/i.test(body)) {
    body = body.replace(/<head(\s[^>]*)?>/i, (m) => `${m}\n${ENTERPRISE_HTML_HEAD_INJECT}\n`)
    headers.delete('Content-Length')
  }

  c.res = new Response(body, { status: res.status, statusText: res.statusText, headers })
})

// OAuth(리다이렉트·디버그 JSON) 에지 캐시 방지 — 옛 redirectUri·진단 값 혼선 방지
app.use('/api/auth/kakao/*', async (c, next) => {
  await next()
  c.res.headers.set('Cache-Control', 'private, no-store, must-revalidate')
})
app.use('/api/auth/google/*', async (c, next) => {
  await next()
  c.res.headers.set('Cache-Control', 'private, no-store, must-revalidate')
})

// CORS: 공식 도메인 + Cloudflare Pages 프리뷰(https)에서 API + 쿠키
// Origin 헤더가 없는 일부 클라이언트는 Host 로 동일 출처 ACAO 를 맞춰야 credentialed 응답이 안정적
function corsResolveOrigin(origin: string, c: Context): string | null {
  if (origin) {
    try {
      const u = new URL(origin)
      if (u.protocol !== 'https:') return null
      const h = u.hostname
      if (h === 'mindstory.kr' || h.endsWith('.mindstory.kr')) return origin
      if (h === 'mslms.pages.dev' || h.endsWith('.mslms.pages.dev')) return origin
      return null
    } catch {
      return null
    }
  }
  const raw = c.req.header('x-forwarded-host') || c.req.header('host') || ''
  const host = raw.split(',')[0].trim().split(':')[0]
  if (host === 'mindstory.kr' || host.endsWith('.mindstory.kr')) return `https://${host}`
  if (host === 'mslms.pages.dev' || host.endsWith('.mslms.pages.dev')) return `https://${host}`
  return null
}
app.use('/api/*', cors({
  origin: corsResolveOrigin,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 600,
  credentials: true,  // 쿠키 전송 허용
}))

// Rate Limiting 적용
// 엄격한 제한: 로그인, 회원가입, 비밀번호 재설정 (1분에 10회)
app.use('/api/auth/login', strictRateLimiter)
app.use('/api/auth/register', strictRateLimiter)
app.use('/api/auth/reset-password', strictRateLimiter)

// 일반 제한: 대부분의 API (1분에 100회)
app.use('/api/courses', generalRateLimiter)
app.use('/api/enrollments', generalRateLimiter)
app.use('/api/payments-v2', generalRateLimiter)
app.use('/api/portone', generalRateLimiter)
app.use('/api/certificate-issuance', generalRateLimiter)
app.use('/api/payment', generalRateLimiter)
app.use('/api/admin', generalRateLimiter)
app.use('/api/popups', generalRateLimiter)
app.use('/api/notices', generalRateLimiter)
app.use('/api/posts', generalRateLimiter)
app.use('/api/upload', generalRateLimiter)
app.use('/api/forest-results', generalRateLimiter)
app.use('/api/forest-gas-report', generalRateLimiter)
app.use('/api/forest-gas-report-public', generalRateLimiter)
app.use('/api/forest-gas-webhook', generalRateLimiter)

// 관대한 제한: 읽기 전용 API (1분에 200회)
app.use('/api/auth/me', lenientRateLimiter)
app.use('/api/health', lenientRateLimiter)
app.use('/api/landing', lenientRateLimiter)

// AI 비서(OpenAI): 토큰·비용 보호 — 경로별 레이트 리밋
app.use(
  '/api/chat',
  rateLimiter({
    bucket: 'ai-chat',
    windowMs: 60000,
    max: 18,
    message: 'AI 비서 요청이 많습니다. 잠시 후 다시 시도해 주세요.'
  })
)

// 정적 파일 서빙 (Cloudflare Pages용 - root 제거)
app.use('/static/*', serveStatic({ manifest: {} }))
app.use('/uploads/*', serveStatic({ manifest: {} }))

// API 라우트
app.route('/api/auth', auth)
app.route('/api/auth/kakao', authKakao)  // 카카오 소셜 로그인
app.route('/api/auth/google', authGoogle)  // 구글 소셜 로그인
app.route('/api/courses', courses)
app.route('/api/courses', reviews)  // 수강평/별점 API (courses/:id/reviews)
app.route('/api/enrollments', enrollments)
app.route('/api/payments-v2', payments)  // 결제 API
app.route('/api/portone', portoneOrders)
app.route('/api/certificate-issuance', certificateIssuance)
app.route('/api/payment', paymentVerify)
app.route('/api', certificates)  // 수료증 API (courses/:id/certificate, my/certificates, certificates/:number)
app.route('/api/admin', admin)
app.route('/api', landingSignatureApi)
app.route('/api/popups', popups)
app.route('/api/notices', notices)
app.route('/api/posts', posts)
app.route('/api/videos', videos)  // 영상 관리
app.route('/api/progress', progress)  // 진도율 추적
// Removed certification routes
app.route('/api/upload', upload)  // 파일 업로드
app.route('/api', upload)  // 스토리지 파일 서빙
app.route('/api/ai', ai)  // AI 도우미
app.route('/api', aiChat) // POST /api/chat — LMS AI 비서
// Removed external video API routes (YouTube only)
app.route('/api/ai-bulk-lessons', aiBulkLessons)  // AI 일괄 차시 생성
app.route('/api/analytics', analytics)  // 학습 분석 통계
app.route('/api/youtube', youtubeProxy)  // YouTube oEmbed 프록시 (CORS 해결)
app.route('/api/security', security)  // 보안 이벤트 로깅
app.route('/api/digital-books', digitalBooks) // Next 디지털 도서·ISBN
app.route('/api/forest-results', forestResults) // 유아숲 4군자 집단 결과(기관·반)
app.route('/api/forest-gas-report', forestGasReport) // GAS 보고서 JSON 프록시(CORS 회피, 로그인·소유권)
app.route('/api/forest-gas-report-public', forestGasReportPublic) // GAS 보고서 JSON — 로그인 불필요(시트 링크·관리자 열람)
app.route('/api/forest-gas-webhook', forestGasWebhook) // GAS 시트 doPost 프록시(브라우저 직접 POST 실패 방지)

// 구버전 북마크(정적 파일·.html 링크 → Clean URL)
app.get('/admin-users.html', (c) => c.redirect('/admin/members', 302))
app.get('/admin-users', (c) => c.redirect('/admin/members', 302))
app.get('/pg-business-info.html', (c) => c.redirect('/pg-business-info', 302))

/** 구버전 북마크 → 현재 단일 소스 forest.html */
app.get('/forest_v9.html', (c) => c.redirect('/forest.html', 302))
app.get('/forest_v9', (c) => c.redirect('/forest.html', 302))

/**
 * /forest — 302 금지(대시보드 리다이렉트 규칙과 충돌 시 /forest.html ↔ /forest 루프 가능).
 * 정적 ASSETS 의 /forest.html 과 동일 바이트를 200으로 반환.
 */
app.get('/forest', async (c) => {
  const assets = c.env.ASSETS
  if (!assets) return c.text('Not Found', 404)
  const u = new URL(c.req.url)
  u.pathname = '/forest.html'
  return assets.fetch(new Request(u.toString(), { method: c.req.method, headers: c.req.raw.headers }))
})

/** 루트 favicon 미배치 시 브라우저 기본 요청으로 콘솔 404 방지 (정적 SVG 재사용) */
app.get('/favicon.ico', (c) => c.redirect('/static/images/course-placeholder.svg', 302))

// 페이지 라우트 (약관·개인정보·환불은 다른 / 라우터보다 먼저 등록)
app.route('/', landing)  // 신규 랜딩 페이지 (Phase 3)
app.route('/', pagesLegal) // /terms, /privacy, /refund
app.route('/', pagesCertificates) // /certificates, /certificates/:number
app.route('/', pagesCompany)
app.route('/', pagesCommunity) // /community — 공지 · FAQ
app.route('/', pagesBrandCatalog) // /courses/classic, /courses/next (/:id보다 우선)
app.route('/', pages)
app.route('/', pagesAbout)
app.route('/', pagesPayment)  // 결제 페이지 (/payment/checkout, /payment/success, /payment/fail)
app.route('/', pagesEnrollment)  // 수강신청 페이지 (/enrollment)
app.route('/', pagesStudent)  // 수강생 페이지
app.route('/', pagesMy)
app.route('/', pagesCourseDetail)  // 강좌 상세 페이지
app.route('/', pagesCertificateIssue) // 자격증 발급비 본인인증+결제
app.route('/', pagesLearn)    // 학습 페이지
app.route('/', pagesAnalytics)  // 분석 페이지
app.route('/admin', pagesAdmin)  // 관리자 페이지

// 홈페이지는 landing 라우터가 처리함 (app.get('/' ) 제거)

// 헬스체크 (배포된 Worker가 최신인지: footerRevision 이 코드와 같아야 함)
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    footerRevision: FOOTER_HTML_REVISION,
  })
})

// HTTPException 기본 응답이 평문이라 fetch().json() 이 깨지고 관리자 셸에서 "인증에 실패" 로만 보임 → /api 는 JSON 통일
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    if (c.req.path.startsWith('/api/')) {
      const msg = err.message || '요청을 처리할 수 없습니다.'
      return c.json({ success: false, error: msg, message: msg }, err.status)
    }
    return err.getResponse()
  }
  console.error('[onError]', err)
  if (c.req.path.startsWith('/api/')) {
    return c.json(
      { success: false, error: '서버 오류가 발생했습니다.', message: '서버 오류가 발생했습니다.' },
      500
    )
  }
  return c.text('Internal Server Error', 500)
})

export default app
