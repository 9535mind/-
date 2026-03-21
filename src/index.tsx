/**
 * 마인드스토리 원격평생교육원 LMS 플랫폼
 * Ver.1.3 - MVP
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveStatic } from 'hono/cloudflare-workers'
import { Bindings } from './types/database'

// 라우트 임포트
import auth from './routes/auth'
import authKakao from './routes/auth-kakao'
import authGoogle from './routes/auth-google'
import courses from './routes/courses'
import enrollments from './routes/enrollments'
import payments from './routes/payments'  // 결제 API
import certificates from './routes/certificates'  // Phase 4: 수료증 시스템
import admin from './routes/admin'
import landing from './routes/landing'  // 신규 랜딩 페이지
import pages from './routes/pages'
import pagesMy from './routes/pages-my'
import pagesAbout from './routes/pages-about'
import pagesAdmin from './routes/pages-admin'
import pagesPayment from './routes/pages-payment'  // 결제 페이지
// Removed: popups (Phase 2 cleanup)
import videos from './routes/videos'
import progress from './routes/progress'
// Removed: certifications (Phase 2 cleanup)
import upload from './routes/upload'
import ai from './routes/ai'
import reviews from './routes/reviews'  // Phase 2: 수강평/별점
// Removed: external video APIs (Phase 2 cleanup - YouTube only)
import aiBulkLessons from './routes/ai-bulk-lessons'
import pagesStudent from './routes/pages-student'
import pagesLearn from './routes/pages-learn'
import analytics from './routes/analytics'
import pagesAnalytics from './routes/pages-analytics'
import pagesCourseDetail from './routes/pages-course-detail'
import pagesEnrollment from './routes/pages-enrollment'  // 수강신청 페이지
import youtubeProxy from './routes/youtube-proxy'

const app = new Hono<{ Bindings: Bindings }>()

// 미들웨어
app.use('*', logger())
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 600,
  credentials: false,
}))

// 정적 파일 서빙 (Cloudflare Pages용 - root 제거)
app.use('/static/*', serveStatic())
app.use('/uploads/*', serveStatic()) // 업로드된 파일 서빙

// API 라우트
app.route('/api/auth', auth)
app.route('/api/auth/kakao', authKakao)  // 카카오 소셜 로그인
app.route('/api/auth/google', authGoogle)  // 구글 소셜 로그인
app.route('/api/courses', courses)
app.route('/api/courses', reviews)  // 수강평/별점 API (courses/:id/reviews)
app.route('/api/enrollments', enrollments)
app.route('/api/payments-v2', payments)  // 결제 API
app.route('/api', certificates)  // 수료증 API (courses/:id/certificate, my/certificates, certificates/:number)
app.route('/api/admin', admin)
// Removed popups route
app.route('/api/videos', videos)  // 영상 관리
app.route('/api/progress', progress)  // 진도율 추적
// Removed certification routes
app.route('/api/upload', upload)  // 파일 업로드
app.route('/api', upload)  // 스토리지 파일 서빙
app.route('/api/ai', ai)  // AI 도우미
// Removed external video API routes (YouTube only)
app.route('/api/ai-bulk-lessons', aiBulkLessons)  // AI 일괄 차시 생성
app.route('/api/analytics', analytics)  // 학습 분석 통계
app.route('/api/youtube', youtubeProxy)  // YouTube oEmbed 프록시 (CORS 해결)

// 페이지 라우트
app.route('/', landing)  // 신규 랜딩 페이지 (Phase 3)
app.route('/', pages)
app.route('/', pagesMy)
app.route('/', pagesAbout)
app.route('/', pagesPayment)  // 결제 페이지 (/payment/checkout, /payment/success, /payment/fail)
app.route('/', pagesEnrollment)  // 수강신청 페이지 (/enrollment)
app.route('/', pagesStudent)  // 수강생 페이지
app.route('/', pagesCourseDetail)  // 강좌 상세 페이지
app.route('/', pagesLearn)    // 학습 페이지
app.route('/', pagesAnalytics)  // 분석 페이지
app.route('/admin', pagesAdmin)  // 관리자 페이지

// 홈페이지는 landing 라우터가 처리함 (app.get('/' ) 제거)

// 헬스체크
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

export default app
