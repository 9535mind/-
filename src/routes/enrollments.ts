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
    
    const status = c.req.query('status') // active, completed, expired, refunded

    let query = `
      SELECT e.*, c.title, c.thumbnail_url, c.total_lessons, c.total_duration_minutes
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = ?
    `
    
    const bindings: any[] = [user.id]
    
    if (status) {
      query += ` AND e.status = ?`
      bindings.push(status)
    }
    
    query += ` ORDER BY e.created_at DESC`

    const result = await DB.prepare(query).bind(...bindings).all()

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
 * 수강 신청
 */
enrollments.post('/', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const { course_id, payment_id } = await c.req.json<{
      course_id: number
      payment_id?: number
    }>()

    if (!course_id) {
      return c.json(errorResponse('과정 ID는 필수입니다.'), 400)
    }

    const { DB } = c.env

    // 과정 정보 조회
    const course = await DB.prepare(`
      SELECT * FROM courses WHERE id = ? AND status = 'active'
    `).bind(course_id).first()

    if (!course) {
      return c.json(errorResponse('과정을 찾을 수 없습니다.'), 404)
    }

    // 중복 수강 체크
    const existing = await DB.prepare(`
      SELECT * FROM enrollments 
      WHERE user_id = ? AND course_id = ? AND status IN ('active', 'completed')
    `).bind(user.id, course_id).first()

    if (existing) {
      return c.json(errorResponse('이미 수강 중이거나 수료한 과정입니다.'), 409)
    }

    // 무료 과정이 아닌 경우 결제 확인
    if (!course.is_free && !payment_id) {
      return c.json(errorResponse('결제 정보가 필요합니다.'), 400)
    }

    if (payment_id) {
      const payment = await DB.prepare(`
        SELECT * FROM payments 
        WHERE id = ? AND user_id = ? AND course_id = ? AND status = 'completed'
      `).bind(payment_id, user.id, course_id).first()

      if (!payment) {
        return c.json(errorResponse('유효한 결제 정보가 아닙니다.'), 400)
      }
    }

    // 수강 기간 계산
    const startDate = new Date()
    const endDate = addDays(startDate, course.duration_days)

    // 수강 신청 생성
    const result = await DB.prepare(`
      INSERT INTO enrollments (
        user_id, course_id, status, start_date, end_date, payment_id
      ) VALUES (?, ?, 'active', ?, ?, ?)
    `).bind(
      user.id,
      course_id,
      startDate.toISOString(),
      endDate.toISOString(),
      payment_id || null
    ).run()

    const enrollmentId = result.meta.last_row_id

    // 모든 차시에 대한 진도 레코드 생성
    const lessons = await DB.prepare(`
      SELECT id FROM lessons WHERE course_id = ?
    `).bind(course_id).all()

    for (const lesson of lessons.results) {
      await DB.prepare(`
        INSERT INTO lesson_progress (
          enrollment_id, lesson_id, user_id, status
        ) VALUES (?, ?, ?, 'not_started')
      `).bind(enrollmentId, lesson.id, user.id).run()
    }

    return c.json(successResponse({
      id: enrollmentId,
      course_id,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString()
    }, '수강 신청이 완료되었습니다.'), 201)

  } catch (error) {
    console.error('Create enrollment error:', error)
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

    // 수강 기간 확인
    if (new Date(enrollment.end_date) < new Date()) {
      await DB.prepare(`
        UPDATE enrollments SET status = 'expired' WHERE id = ?
      `).bind(enrollmentId).run()
      return c.json(errorResponse('수강 기간이 만료되었습니다.'), 403)
    }

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
      WHERE e.id = ? AND e.user_id = ? AND e.status = 'active'
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

    // 수료 처리
    await DB.prepare(`
      UPDATE enrollments 
      SET status = 'completed',
          is_completed = 1,
          completed_at = datetime('now'),
          updated_at = datetime('now')
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
