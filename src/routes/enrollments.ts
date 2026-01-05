/**
 * 수강 신청 및 학습 관련 API 라우트
 * /api/enrollments/*
 */

import { Hono } from 'hono'
import { Bindings, Enrollment, LessonProgress } from '../types/database'
import { 
  successResponse, 
  errorResponse, 
  formatDate, 
  addDays,
  calculateProgressRate,
  calculateWatchPercentage,
  isCompletionEligible
} from '../utils/helpers'
import { requireAuth } from '../middleware/auth'

const enrollments = new Hono<{ Bindings: Bindings }>()

/**
 * GET /api/enrollments/my
 * 내 수강 신청 목록 조회
 */
enrollments.get('/my', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const { DB } = c.env
    
    // status 파라미터는 무시 (DB에 status 컬럼이 없음)
    // const status = c.req.query('status')

    const query = `
      SELECT e.*, c.title, c.thumbnail_url
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = ?
      ORDER BY e.enrolled_at DESC
    `

    const result = await DB.prepare(query).bind(user.id).all()

    return c.json(successResponse(result.results))

  } catch (error) {
    console.error('Get my enrollments error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

/**
 * GET /api/enrollments/:id
 * 수강 신청 상세 조회
 */
enrollments.get('/:id', requireAuth, async (c) => {
  try {
    const enrollmentId = c.req.param('id')
    const user = c.get('user')
    const { DB } = c.env

    // 수강 신청 정보 조회
    const enrollment = await DB.prepare(`
      SELECT e.*, c.*, e.id as enrollment_id
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.id = ? AND e.user_id = ?
    `).bind(enrollmentId, user.id).first()

    if (!enrollment) {
      return c.json(errorResponse('수강 신청을 찾을 수 없습니다.'), 404)
    }

    // 차시별 진도 조회
    const lessons = await DB.prepare(`
      SELECT l.*, lp.status as progress_status, lp.watch_percentage, lp.is_completed
      FROM lessons l
      LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.enrollment_id = ?
      WHERE l.course_id = ?
      ORDER BY l.lesson_number ASC
    `).bind(enrollmentId, enrollment.course_id).all()

    return c.json(successResponse({
      ...enrollment,
      lessons: lessons.results
    }))

  } catch (error) {
    console.error('Get enrollment error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

/**
 * POST /api/enrollments
 * 수강 신청 (무료 강좌 즉시 등록)
 * 
 * Request Body:
 * - courseId: number (필수)
 * 
 * Response:
 * - 201: { enrollmentId, courseId, enrolledAt }
 * - 400: courseId 누락/형식 오류, 강좌 상태 오류, 유료 강좌
 * - 401: 인증 없음
 * - 404: 강좌 없음
 * - 409: 이미 등록됨
 */
enrollments.post('/', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const body = await c.req.json<{ courseId?: number }>()
    const courseId = body.courseId

    // ① courseId 검증
    if (!courseId || typeof courseId !== 'number') {
      return c.json(errorResponse('courseId는 필수이며 숫자여야 합니다.'), 400)
    }

    const { DB } = c.env

    // ② 강좌 존재 여부 및 상태 확인
    const course = await DB.prepare(`
      SELECT id, title, status, price
      FROM courses 
      WHERE id = ?
    `).bind(courseId).first<{
      id: number
      title: string
      status: string
      price: number
    }>()

    if (!course) {
      return c.json(errorResponse('강좌를 찾을 수 없습니다.'), 404)
    }

    // ③ 강좌 상태 확인 (published만 가능)
    if (course.status !== 'published') {
      return c.json(errorResponse('현재 수강 신청이 불가능한 강좌입니다.'), 400)
    }

    // ④ 무료 강좌 확인 (price가 0이면 무료)
    const isFree = course.price === 0
    if (!isFree) {
      return c.json(errorResponse('유료 강좌는 결제가 필요합니다.'), 402)
    }

    // ⑤ 중복 등록 방지
    const existing = await DB.prepare(`
      SELECT id FROM enrollments 
      WHERE user_id = ? AND course_id = ?
    `).bind(user.id, courseId).first()

    if (existing) {
      return c.json(errorResponse('이미 등록된 강좌입니다.'), 409)
    }

    // ⑥ enrollments 생성
    const enrolledAt = new Date().toISOString()
    const result = await DB.prepare(`
      INSERT INTO enrollments (
        user_id, course_id, progress, enrolled_at, completed_at
      ) VALUES (?, ?, 0, ?, NULL)
    `).bind(
      user.id,
      courseId,
      enrolledAt
    ).run()

    const enrollmentId = result.meta.last_row_id

    // 성공 응답
    return c.json({
      success: true,
      data: {
        enrollmentId,
        courseId,
        enrolledAt
      },
      message: '수강 신청이 완료되었습니다.'
    }, 201)

  } catch (error: any) {
    console.error('Create enrollment error:', error)
    
    // UNIQUE constraint 위반 (중복 등록)
    if (error?.message?.includes('UNIQUE constraint failed')) {
      return c.json(errorResponse('이미 등록된 강좌입니다.'), 409)
    }
    
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

/**
 * POST /api/enrollments/:id/progress
 * 학습 진도 업데이트
 */
enrollments.post('/:id/progress', requireAuth, async (c) => {
  try {
    const enrollmentId = c.req.param('id')
    const user = c.get('user')
    const { lesson_id, watched_seconds, total_seconds } = await c.req.json<{
      lesson_id: number
      watched_seconds: number
      total_seconds: number
    }>()

    if (!lesson_id || watched_seconds === undefined || total_seconds === undefined) {
      return c.json(errorResponse('필수 파라미터가 누락되었습니다.'), 400)
    }

    const { DB } = c.env

    // 수강 신청 확인
    const enrollment = await DB.prepare(`
      SELECT * FROM enrollments 
      WHERE id = ? AND user_id = ? AND status = 'active'
    `).bind(enrollmentId, user.id).first<Enrollment>()

    if (!enrollment) {
      return c.json(errorResponse('유효한 수강 신청이 아닙니다.'), 404)
    }

    // 수강 기간 확인 (status 컬럼 사용 안 함)
    // if (new Date(enrollment.end_date) < new Date()) {
    //   return c.json(errorResponse('수강 기간이 만료되었습니다.'), 403)
    // }

    // 진도 레코드 조회
    const progress = await DB.prepare(`
      SELECT * FROM lesson_progress 
      WHERE enrollment_id = ? AND lesson_id = ?
    `).bind(enrollmentId, lesson_id).first<LessonProgress>()

    if (!progress) {
      return c.json(errorResponse('진도 정보를 찾을 수 없습니다.'), 404)
    }

    // 시청 비율 계산
    const watchPercentage = calculateWatchPercentage(watched_seconds, total_seconds)
    const isCompleted = watchPercentage >= 80 // 80% 이상 시청 시 완료

    // 진도 업데이트
    const newStatus = isCompleted ? 'completed' : (watched_seconds > 0 ? 'in_progress' : 'not_started')
    
    await DB.prepare(`
      UPDATE lesson_progress 
      SET last_watched_position = ?,
          total_watched_seconds = ?,
          watch_percentage = ?,
          status = ?,
          is_completed = ?,
          completed_at = CASE WHEN ? = 1 AND is_completed = 0 THEN datetime('now') ELSE completed_at END,
          access_count = access_count + 1,
          first_accessed_at = COALESCE(first_accessed_at, datetime('now')),
          last_accessed_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      watched_seconds,
      watched_seconds,
      watchPercentage,
      newStatus,
      isCompleted ? 1 : 0,
      isCompleted ? 1 : 0,
      progress.id
    ).run()

    // 전체 진도율 재계산
    const lessonStats = await DB.prepare(`
      SELECT 
        COUNT(*) as total_lessons,
        SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed_lessons,
        SUM(total_watched_seconds) / 60 as total_watched_minutes
      FROM lesson_progress
      WHERE enrollment_id = ?
    `).bind(enrollmentId).first<{
      total_lessons: number
      completed_lessons: number
      total_watched_minutes: number
    }>()

    const progressRate = calculateProgressRate(
      lessonStats?.completed_lessons || 0,
      lessonStats?.total_lessons || 1
    )

    // 수강 신청 진도율 업데이트
    await DB.prepare(`
      UPDATE enrollments 
      SET progress_rate = ?,
          completed_lessons = ?,
          total_watched_minutes = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      progressRate,
      lessonStats?.completed_lessons || 0,
      Math.round(lessonStats?.total_watched_minutes || 0),
      enrollmentId
    ).run()

    // 수료 조건 체크
    const course = await DB.prepare(`
      SELECT * FROM courses WHERE id = ?
    `).bind(enrollment.course_id).first()

    const canComplete = isCompletionEligible(progressRate, course.completion_progress_rate)

    return c.json(successResponse({
      progress_rate: progressRate,
      watch_percentage: watchPercentage,
      is_lesson_completed: isCompleted,
      can_complete: canComplete
    }, '진도가 업데이트되었습니다.'))

  } catch (error) {
    console.error('Update progress error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

/**
 * POST /api/enrollments/:id/complete
 * 수료 처리
 */
enrollments.post('/:id/complete', requireAuth, async (c) => {
  try {
    const enrollmentId = c.req.param('id')
    const user = c.get('user')
    const { DB } = c.env

    // 수강 신청 확인
    const enrollment = await DB.prepare(`
      SELECT e.*, c.completion_progress_rate
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.id = ? AND e.user_id = ?
    `).bind(enrollmentId, user.id).first()

    if (!enrollment) {
      return c.json(errorResponse('유효한 수강 신청이 아닙니다.'), 404)
    }

    // 수료 조건 확인
    if (!isCompletionEligible(enrollment.progress_rate, enrollment.completion_progress_rate)) {
      return c.json(errorResponse(
        `수료 조건을 충족하지 못했습니다. (현재 진도율: ${enrollment.progress_rate}%, 필요: ${enrollment.completion_progress_rate}%)`
      ), 400)
    }

    // 수료 처리 (status 컬럼 제거)
    await DB.prepare(`
      UPDATE enrollments 
      SET completed_at = datetime('now')
      WHERE id = ?
    `).bind(enrollmentId).run()

    return c.json(successResponse({
      enrollment_id: enrollmentId,
      completed_at: new Date().toISOString()
    }, '수료가 완료되었습니다. 수료증을 발급받으실 수 있습니다.'))

  } catch (error) {
    console.error('Complete enrollment error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

/**
 * GET /api/enrollments/:id/lessons/:lessonId
 * 차시 학습 페이지 (영상 재생 정보)
 */
enrollments.get('/:id/lessons/:lessonId', requireAuth, async (c) => {
  try {
    const enrollmentId = c.req.param('id')
    const lessonId = c.req.param('lessonId')
    const user = c.get('user')
    const { DB } = c.env

    // 수강 권한 확인
    const enrollment = await DB.prepare(`
      SELECT * FROM enrollments 
      WHERE id = ? AND user_id = ? AND status IN ('active', 'completed')
    `).bind(enrollmentId, user.id).first()

    if (!enrollment) {
      return c.json(errorResponse('수강 권한이 없습니다.'), 403)
    }

    // 차시 정보 조회
    const lesson = await DB.prepare(`
      SELECT * FROM lessons 
      WHERE id = ? AND course_id = ?
    `).bind(lessonId, enrollment.course_id).first()

    if (!lesson) {
      return c.json(errorResponse('차시를 찾을 수 없습니다.'), 404)
    }

    // 진도 정보 조회
    const progress = await DB.prepare(`
      SELECT * FROM lesson_progress 
      WHERE enrollment_id = ? AND lesson_id = ?
    `).bind(enrollmentId, lessonId).first()

    return c.json(successResponse({
      lesson,
      progress,
      enrollment: {
        id: enrollment.id,
        start_date: enrollment.start_date,
        end_date: enrollment.end_date,
        progress_rate: enrollment.progress_rate
      }
    }))

  } catch (error) {
    console.error('Get lesson detail error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

export default enrollments
