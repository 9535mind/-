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
import payments from './routes/payments'
import paymentsV2 from './routes/payments-v2'
import pagesPayment from './routes/pages-payment'
import certificates from './routes/certificates'
import admin from './routes/admin'
import landing from './routes/landing'  // 신규 랜딩 페이지
import pages from './routes/pages'
import pagesMy from './routes/pages-my'
import pagesAbout from './routes/pages-about'
import pagesAdmin from './routes/pages-admin'
import popups from './routes/popups'
import videos from './routes/videos'
import progress from './routes/progress'
import certifications from './routes/certifications'
import adminCertifications from './routes/admin-certifications'
import upload from './routes/upload'
import ai from './routes/ai'
import reviews from './routes/reviews'
import videoExternal from './routes/video-external'
import videoApiVideo from './routes/video-apivideo'
import aiBulkLessons from './routes/ai-bulk-lessons'
import pagesStudent from './routes/pages-student'
import pagesLearn from './routes/pages-learn'
import analytics from './routes/analytics'
import pagesAnalytics from './routes/pages-analytics'
import pagesCourseDetail from './routes/pages-course-detail'

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
app.route('/api/courses', reviews)  // 강좌 리뷰
app.route('/api/enrollments', enrollments)
app.route('/api/payments', payments)
app.route('/api/payments-v2', paymentsV2)  // 토스페이먼츠 연동
app.route('/api/certificates', certificates)
app.route('/api/admin', admin)
app.route('/api/popups', popups)
app.route('/api/videos', videos)  // 영상 관리
app.route('/api/progress', progress)  // 진도율 추적
app.route('/api/certifications', certifications)  // 민간자격
app.route('/api/admin/certifications', adminCertifications)  // 관리자 민간자격
app.route('/api/upload', upload)  // 파일 업로드
app.route('/api', upload)  // 스토리지 파일 서빙
app.route('/api/ai', ai)  // AI 도우미
app.route('/api/video-external', videoExternal)  // 외부 영상 스토리지
app.route('/api/video-apivideo', videoApiVideo)  // api.video 영상 관리
app.route('/api/ai-bulk-lessons', aiBulkLessons)  // AI 일괄 차시 생성
app.route('/api/analytics', analytics)  // 학습 분석 통계

// 페이지 라우트
app.route('/', landing)  // 신규 랜딩 페이지 (Phase 3)
app.route('/', pages)
app.route('/', pagesMy)
app.route('/', pagesAbout)
app.route('/', pagesPayment)  // 결제 페이지
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
