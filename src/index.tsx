/**
 * MS12 — 회의 플랫폼 (Hono on Cloudflare Pages)
 * 라우트: /app*, /api/auth*, /api/ms12* 및 정적·OAuth 콜백.
 */
// deploy trigger
import { Hono, type Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveStatic } from 'hono/cloudflare-workers'
import { Bindings } from './types/database'
import { strictRateLimiter, lenientRateLimiter } from './middleware/rate-limiter'

import auth from './routes/auth'
import authKakao from './routes/auth-kakao'
import authGoogle from './routes/auth-google'
import apiMs12 from './routes/api-ms12'
import apiMs12Documents from './routes/api-ms12-documents'
import apiMs12MeetingRecords from './routes/api-ms12-meeting-records'
import apiMs12Announcements from './routes/api-ms12-announcements'
import ms12Pages, { renderEntryPage } from './routes/ms12-pages'
import { FOOTER_HTML_REVISION } from './utils/site-footer-legal'
import {
  LEGACY_PAGES_HOSTNAMES,
  isMs12Hostname,
  isCloudflarePagesPreviewHost,
} from './utils/oauth-public'

/** /app·/app/ 일치(메인이 strict true면 /app/ 만 404로 떨어질 수 있음) */
const app = new Hono<{ Bindings: Bindings }>({ strict: false })

app.use('*', logger())

// 구 mslms Pages 호스트 → ms12.org 로 통일(세션·쿠키) — /api/* 는 리다이렉트 금지
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
    return c.redirect(`https://ms12.org${url.pathname}${url.search}`, 308)
  }
  if (host === 'www.ms12.org' && !isApi) {
    return c.redirect(`https://ms12.org${url.pathname}${url.search}`, 308)
  }
  await next()
})

// HTML: 캐시 금지(로그인·OAuth)
app.use('*', async (c, next) => {
  await next()
  const ct = c.res.headers.get('Content-Type') || ''
  if (!ct.includes('text/html')) return
  const res = c.res
  const headers = new Headers(res.headers)
  headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate')
  c.res = new Response(res.body, { status: res.status, statusText: res.statusText, headers })
})

app.use('/api/auth/kakao/*', async (c, next) => {
  await next()
  c.res.headers.set('Cache-Control', 'private, no-store, must-revalidate')
})
app.use('/auth/kakao/*', async (c, next) => {
  await next()
  c.res.headers.set('Cache-Control', 'private, no-store, must-revalidate')
})
app.use('/api/auth/google/*', async (c, next) => {
  await next()
  c.res.headers.set('Cache-Control', 'private, no-store, must-revalidate')
})

function corsResolveOrigin(origin: string, c: Context): string | null {
  if (origin) {
    try {
      const u = new URL(origin)
      if (u.protocol !== 'https:') return null
      const h = u.hostname
      if (isMs12Hostname(h)) return origin
      if (h === 'localhost' || h === '127.0.0.1') return null
      return null
    } catch {
      return null
    }
  }
  const raw = c.req.header('x-forwarded-host') || c.req.header('host') || ''
  const host = raw.split(',')[0].trim().split(':')[0]
  if (isMs12Hostname(host)) return `https://${host}`
  if (isCloudflarePagesPreviewHost(host)) return `https://${host}`
  return null
}

app.use(
  '/api/*',
  cors({
    origin: corsResolveOrigin,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length', 'X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 600,
    credentials: true,
  })
)

app.use('/api/auth/login', strictRateLimiter)
app.use('/api/auth/register', strictRateLimiter)
app.use('/api/auth/reset-password', strictRateLimiter)
app.use('/api/auth/me', lenientRateLimiter)
app.use('/api/health', lenientRateLimiter)
app.use('/api/ms12', lenientRateLimiter)

app.use('/static/*', serveStatic({ manifest: {} }))
app.use('/uploads/*', serveStatic({ manifest: {} }))

// /api/auth 보다 구체적 경로를 먼저 등록(그렇지 않으면 /api/auth/* 가 /api/auth/google/start 를 가로채 404·잘못된 응답 가능)
app.route('/api/auth/google', authGoogle)
app.route('/api/auth/kakao', authKakao)
/** Kakao 콘솔·KOE006: `https://ms12.org/auth/kakao/callback` — /api 가 아닌 짧은 경로 */
app.route('/auth/kakao', authKakao)
app.route('/api/auth', auth)
const apiMs12All = new Hono<{ Bindings: Bindings }>()
apiMs12All.route('/', apiMs12)
apiMs12All.route('/', apiMs12Documents)
apiMs12All.route('/', apiMs12MeetingRecords)
apiMs12All.route('/', apiMs12Announcements)
app.route('/api/ms12', apiMs12All)

// 공통 헬스(배포 확인) — HTML 라우트보다 먼저 등록, 엣지·브라우저 캐시로 HTML이 섞이지 않게
app.get('/api/health', (c) => {
  c.header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  c.header('Pragma', 'no-cache')
  c.header('X-Content-Type-Options', 'nosniff')
  return c.json({
    status: 'ok',
    product: 'ms12',
    timestamp: new Date().toISOString(),
    footerRevision: FOOTER_HTML_REVISION,
    r2Bound: !!c.env.R2,
    d1Bound: !!c.env.DB,
  })
})

// 루트 → /app. 첫 화면은 `app.route('/app',…)`의 서브 `/`에만 의존하지 않고 get 으로 직접 등록(Worker/Pages 루트 매칭 누락 방지)
app.get('/join/:code', (c) => {
  const raw = c.req.param('code') || ''
  const alnum = raw.replace(/[^A-Za-z0-9]/g, '')
  if (alnum.length < 4) {
    return c.text('Not Found', 404)
  }
  return c.redirect('/app/join?code=' + encodeURIComponent(alnum.toUpperCase()), 302)
})
app.get('/', (c) => c.redirect('/app' + (new URL(c.req.url).search || ''), 302))
app.get('/app', (c) => renderEntryPage(c))
app.get('/app/', (c) => renderEntryPage(c))
app.route('/app', ms12Pages)

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
  return c.text('Not Found', 404)
})

export default app
