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
import landing from './routes/landing'
import ms12Pages, { renderEntryPage } from './routes/ms12-pages'
import { FOOTER_HTML_REVISION } from './utils/site-footer-legal'
import {
  isCloudflarePagesPreviewHost,
  isForestProductHost,
  isLifelongLmsProductHost,
  isMs12Hostname,
  normalizeOauthRequestHostname,
  requestHostname,
} from './utils/oauth-public'

/** /app·/app/ 일치(메인이 strict true면 /app/ 만 404로 떨어질 수 있음) */
const app = new Hono<{ Bindings: Bindings }>({ strict: false })

app.use('*', logger())

// www.ms12.org → apex(공식)만 308. mslms·mindstory·mindstory-lms 는 이 블록을 타지 않음(forest 등 절대 ms12.org로 보내지 않음).
app.use('*', async (c, next) => {
  const raw = c.req.header('x-forwarded-host') || c.req.header('host') || ''
  const host = normalizeOauthRequestHostname(raw.split(',')[0].trim().split(':')[0])
  const url = new URL(c.req.url)
  const isApi = url.pathname.startsWith('/api/')
  if (isForestProductHost(host) || isLifelongLmsProductHost(host)) {
    await next()
    return
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
    exposeHeaders: [
      'Content-Length',
      'X-Request-Id',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-MS12-OAuth-Start-Handler',
    ],
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

// JTT 유아숲 — 별칭(북마크·구 URL)
app.get('/forest_v9.html', (c) => c.redirect('/forest.html', 302))
app.get('/forest_v9', (c) => c.redirect('/forest.html', 302))
app.get('/forest', (c) => c.redirect('/forest.html', 302))

// 루트: Host 별 (1) mindstory-lms → 평생교육원 (2) mslms / mindstory.kr → 유아숲 (3) ms12.org·ms12.pages.dev → MS12 /app
app.get('/join/:code', (c) => {
  const raw = c.req.param('code') || ''
  const alnum = raw.replace(/[^A-Za-z0-9]/g, '')
  if (alnum.length < 4) {
    return c.text('Not Found', 404)
  }
  return c.redirect('/app/join?code=' + encodeURIComponent(alnum.toUpperCase()), 302)
})
app.get('/', (c) => {
  const h = requestHostname(c)
  const q = new URL(c.req.url).search || ''
  if (isForestProductHost(h)) {
    return c.redirect('/forest.html' + q, 302)
  }
  if (isLifelongLmsProductHost(h)) {
    return c.redirect('/legacy/mindstory-landing' + q, 302)
  }
  return c.redirect('/app' + q, 302)
})
/** mindstory-lms(평생교육원) — /legacy/mindstory-landing (GET / 는 Host 로 위에서 분기) */
app.route('/', landing)

app.get('/app', (c) => renderEntryPage(c))
app.get('/app/', (c) => renderEntryPage(c))
app.route('/app', ms12Pages)

/**
 * Cloudflare Pages `_worker.js` advanced: Worker가 먼저 요청을 받는다. `dist`에 있는 정적 파일(예: /forest.html)은
 * Hono에 라우트가 없으면 텍스트 404로 끝난다. Pages가 주입하는 `ASSETS`로 배포 정적 자산에 위임한다.
 * @see https://developers.cloudflare.com/pages/functions/advanced-mode/
 */
app.notFound(async (c) => {
  if (c.req.path.startsWith('/api/')) {
    return c.json(
      { success: false, error: 'Not Found', message: 'Not Found' },
      404
    )
  }
  if ((c.req.method === 'GET' || c.req.method === 'HEAD') && c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw)
  }
  return c.text('Not Found', 404)
})

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
