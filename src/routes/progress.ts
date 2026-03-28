/**
 * Progress Tracking API Routes
 * Handles lesson progress updates and course completion tracking
 */

import { Hono } from 'hono'
import type { Bindings } from '../types/database'
import { requireAuth } from '../middleware/auth'

const app = new Hono<{ Bindings: Bindings }>()

// Apply authentication middleware to all routes
app.use('/*', requireAuth)

/**
 * Update lesson progress
 * POST /api/progress/lessons/:lessonId
 */
app.post('/lessons/:lessonId', async (c) => {
  try {
    const user = c.get('user')
    if (user.role === 'admin') {
      return c.json({
        success: true,
        skipped: true,
        message: '관리자 계정은 진도가 기록되지 않습니다.',
      })
    }
    const lessonId = c.req.param('lessonId')
    
    const {
      watch_percentage = 0,
      last_position_seconds = 0,
      watch_time_seconds = 0,
      is_completed = 0
    } = await c.req.json()

    const { DB } = c.env

    // Get enrollment_id from lesson -> course -> enrollment
    const lesson = await DB.prepare(`
      SELECT course_id FROM lessons WHERE id = ?
    `).bind(lessonId).first()

    if (!lesson) {
      return c.json({ success: false, error: '차시를 찾을 수 없습니다.' }, 404)
    }

    const enrollment = await DB.prepare(`
      SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?
    `).bind(user.id, lesson.course_id).first()

    if (!enrollment) {
      return c.json({ success: false, error: '수강 중인 과정이 아닙니다.' }, 403)
    }

    // Update or insert lesson progress
    await DB.prepare(`
      INSERT INTO lesson_progress (
        enrollment_id, lesson_id, watch_percentage, 
        last_position_seconds, watch_time_seconds, 
        is_completed, completed_at, last_watched_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(enrollment_id, lesson_id) 
      DO UPDATE SET
        watch_percentage = excluded.watch_percentage,
        last_position_seconds = excluded.last_position_seconds,
        watch_time_seconds = watch_time_seconds + excluded.watch_time_seconds,
        is_completed = excluded.is_completed,
        completed_at = CASE 
          WHEN excluded.is_completed = 1 AND is_completed = 0 
          THEN CURRENT_TIMESTAMP 
          ELSE completed_at 
        END,
        last_watched_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      enrollment.id,
      lessonId,
      watch_percentage,
      last_position_seconds,
      watch_time_seconds,
      is_completed,
      is_completed ? new Date().toISOString() : null
    ).run()

    // Update enrollment progress
    const progressStats = await DB.prepare(`
      SELECT 
        COUNT(*) as total_lessons,
        SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed_lessons,
        SUM(watch_time_seconds) as total_watch_time
      FROM lesson_progress
      WHERE enrollment_id = ?
    `).bind(enrollment.id).first()

    const completion_rate = progressStats.total_lessons > 0
      ? Math.round((progressStats.completed_lessons / progressStats.total_lessons) * 100)
      : 0

    // Check for certificate eligibility (80% completion)
    const shouldIssueCertificate = completion_rate >= 80
    const now = new Date().toISOString()
    
    // Get current certificate status
    const currentEnrollment = await DB.prepare(`
      SELECT certificate_issued, certificate_issued_at FROM enrollments WHERE id = ?
    `).bind(enrollment.id).first()

    const certificateIssued = shouldIssueCertificate ? 1 : currentEnrollment.certificate_issued
    const certificateIssuedAt = shouldIssueCertificate && !currentEnrollment.certificate_issued 
      ? now 
      : currentEnrollment.certificate_issued_at

    await DB.prepare(`
      UPDATE enrollments
      SET 
        total_lessons = ?,
        completed_lessons = ?,
        total_watch_time_seconds = ?,
        completion_rate = ?,
        progress = ?,
        last_lesson_id = ?,
        last_watched_at = CURRENT_TIMESTAMP,
        certificate_issued = ?,
        certificate_issued_at = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      progressStats.total_lessons,
      progressStats.completed_lessons,
      progressStats.total_watch_time || 0,
      completion_rate,
      completion_rate,
      lessonId,
      certificateIssued,
      certificateIssuedAt,
      enrollment.id
    ).run()

    // Check if certificate was just issued
    const certificateJustIssued = shouldIssueCertificate && !currentEnrollment.certificate_issued

    return c.json({
      success: true,
      progress: {
        watch_percentage,
        is_completed,
        completion_rate
      },
      certificate: {
        eligible: shouldIssueCertificate,
        issued: certificateIssued === 1,
        just_issued: certificateJustIssued,
        issued_at: certificateIssuedAt
      }
    })

  } catch (error) {
    console.error('❌ Progress update error:', error)
    return c.json({ 
      success: false, 
      error: '진도 업데이트에 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

/**
 * Get lesson progress
 * GET /api/progress/lessons/:lessonId
 */
app.get('/lessons/:lessonId', async (c) => {
  try {
    const user = c.get('user')
    const lessonId = c.req.param('lessonId')
    const { DB } = c.env

    // Get enrollment_id
    const lesson = await DB.prepare(`
      SELECT course_id FROM lessons WHERE id = ?
    `).bind(lessonId).first()

    if (!lesson) {
      return c.json({ success: false, error: '차시를 찾을 수 없습니다.' }, 404)
    }

    const enrollment = await DB.prepare(`
      SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?
    `).bind(user.id, lesson.course_id).first()

    if (!enrollment) {
      return c.json({ success: false, progress: null })
    }

    const progress = await DB.prepare(`
      SELECT * FROM lesson_progress
      WHERE enrollment_id = ? AND lesson_id = ?
    `).bind(enrollment.id, lessonId).first()

    return c.json({
      success: true,
      progress: progress || {
        watch_percentage: 0,
        last_position_seconds: 0,
        is_completed: 0
      }
    })

  } catch (error) {
    console.error('❌ Get progress error:', error)
    return c.json({ 
      success: false, 
      error: '진도 조회에 실패했습니다.' 
    }, 500)
  }
})

/**
 * Get course progress summary
 * GET /api/progress/courses/:courseId
 */
app.get('/courses/:courseId', async (c) => {
  try {
    const user = c.get('user')
    const courseId = c.req.param('courseId')
    const { DB } = c.env

    const enrollment = await DB.prepare(`
      SELECT 
        e.*,
        c.title as course_title,
        c.total_lessons as course_total_lessons
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = ? AND e.course_id = ?
    `).bind(user.id, courseId).first()

    if (!enrollment) {
      return c.json({ success: false, error: '수강 중인 과정이 아닙니다.' }, 404)
    }

    // Get detailed lesson progress
    const lessons = await DB.prepare(`
      SELECT 
        l.id,
        l.lesson_number,
        l.title,
        l.video_duration_minutes,
        lp.watch_percentage,
        lp.is_completed,
        lp.last_watched_at
      FROM lessons l
      LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.enrollment_id = ?
      WHERE l.course_id = ?
      ORDER BY l.lesson_number
    `).bind(enrollment.id, courseId).all()

    return c.json({
      success: true,
      enrollment: {
        id: enrollment.id,
        course_id: enrollment.course_id,
        course_title: enrollment.course_title,
        enrolled_at: enrollment.enrolled_at,
        progress: enrollment.progress,
        completion_rate: enrollment.completion_rate,
        total_lessons: enrollment.total_lessons,
        completed_lessons: enrollment.completed_lessons,
        last_watched_at: enrollment.last_watched_at,
        certificate_issued: enrollment.certificate_issued
      },
      lessons: lessons.results
    })

  } catch (error) {
    console.error('❌ Get course progress error:', error)
    return c.json({ 
      success: false, 
      error: '과정 진도 조회에 실패했습니다.' 
    }, 500)
  }
})

/**
 * Get user's all courses progress
 * GET /api/progress/my-courses
 */
app.get('/my-courses', async (c) => {
  try {
    const user = c.get('user')
    const { DB } = c.env

    const enrollments = await DB.prepare(`
      SELECT 
        e.id as enrollment_id,
        e.course_id,
        e.progress,
        e.completion_rate,
        e.total_lessons,
        e.completed_lessons,
        e.enrolled_at,
        e.last_watched_at,
        e.certificate_issued,
        c.title,
        c.description,
        c.thumbnail_url,
        c.total_duration_minutes,
        u.name as instructor_name,
        (
          SELECT cert.certificate_number FROM certificates cert
          WHERE cert.enrollment_id = e.id
          ORDER BY cert.id DESC LIMIT 1
        ) as certificate_number
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE e.user_id = ?
      ORDER BY e.last_watched_at DESC
    `).bind(user.id).all()

    return c.json({
      success: true,
      courses: enrollments.results
    })

  } catch (error) {
    console.error('❌ Get my courses error:', error)
    return c.json({ 
      success: false, 
      error: '내 강좌 조회에 실패했습니다.' 
    }, 500)
  }
})

export default app
