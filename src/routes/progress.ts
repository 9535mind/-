/**
 * 학습 진도율 추적 API
 * /api/progress/*
 */

import { Hono } from 'hono'
import { Bindings } from '../types/database'
import { successResponse, errorResponse } from '../utils/helpers'
import { requireAuth } from '../middleware/auth'

const progress = new Hono<{ Bindings: Bindings }>()

/**
 * POST /api/progress/update
 * 시청 진도 업데이트
 */
progress.post('/update', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const { 
      lesson_id, 
      current_time, 
      duration, 
      watch_percentage 
    } = await c.req.json<{
      lesson_id: number
      current_time: number  // 초 단위
      duration: number      // 초 단위
      watch_percentage: number  // 0-100
    }>()

    if (!lesson_id || current_time === undefined || duration === undefined) {
      return c.json(errorResponse('필수 정보가 누락되었습니다.'), 400)
    }

    const { DB } = c.env

    // 차시 정보 조회
    const lesson = await DB.prepare(`
      SELECT l.id, l.course_id, l.video_duration_minutes
      FROM lessons l
      WHERE l.id = ? AND l.status = 'active'
    `).bind(lesson_id).first<any>()

    if (!lesson) {
      return c.json(errorResponse('존재하지 않는 차시입니다.'), 404)
    }

    // 수강 신청 정보 조회
    const enrollment = await DB.prepare(`
      SELECT id, status, end_date
      FROM enrollments
      WHERE user_id = ? AND course_id = ? AND status = 'active'
    `).bind(user.id, lesson.course_id).first<any>()

    if (!enrollment) {
      return c.json(errorResponse('수강권이 없습니다.'), 403)
    }

    // 기존 진도 기록 조회
    const existingProgress = await DB.prepare(`
      SELECT id, total_watched_seconds, watch_percentage, is_completed
      FROM lesson_progress
      WHERE enrollment_id = ? AND lesson_id = ? AND user_id = ?
    `).bind(enrollment.id, lesson_id, user.id).first<any>()

    const isCompleted = watch_percentage >= 80 ? 1 : 0

    if (existingProgress) {
      // 업데이트
      await DB.prepare(`
        UPDATE lesson_progress
        SET last_watched_position = ?,
            total_watched_seconds = ?,
            watch_percentage = ?,
            is_completed = ?,
            completed_at = CASE WHEN ? = 1 AND is_completed = 0 THEN datetime('now') ELSE completed_at END,
            access_count = access_count + 1,
            last_accessed_at = datetime('now'),
            status = CASE WHEN ? >= 80 THEN 'completed' ELSE 'in_progress' END
        WHERE id = ?
      `).bind(
        current_time,
        Math.max(existingProgress.total_watched_seconds, current_time),
        Math.max(existingProgress.watch_percentage, watch_percentage),
        isCompleted,
        isCompleted,
        watch_percentage,
        existingProgress.id
      ).run()
    } else {
      // 신규 생성
      await DB.prepare(`
        INSERT INTO lesson_progress (
          enrollment_id, lesson_id, user_id,
          status, last_watched_position, total_watched_seconds,
          watch_percentage, is_completed, completed_at,
          access_count, first_accessed_at, last_accessed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
      `).bind(
        enrollment.id,
        lesson_id,
        user.id,
        isCompleted ? 'completed' : 'in_progress',
        current_time,
        current_time,
        watch_percentage,
        isCompleted,
        isCompleted ? new Date().toISOString() : null
      ).run()
    }

    // 전체 강좌 진도율 재계산
    const courseProgress = await DB.prepare(`
      SELECT 
        COUNT(*) as total_lessons,
        SUM(CASE WHEN lp.is_completed = 1 THEN 1 ELSE 0 END) as completed_lessons,
        SUM(lp.total_watched_seconds) as total_watched_seconds
      FROM lessons l
      LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.enrollment_id = ?
      WHERE l.course_id = ? AND l.status = 'active'
    `).bind(enrollment.id, lesson.course_id).first<any>()

    const progressRate = courseProgress.total_lessons > 0 
      ? (courseProgress.completed_lessons / courseProgress.total_lessons) * 100 
      : 0

    const totalWatchedMinutes = Math.floor((courseProgress.total_watched_seconds || 0) / 60)

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
      courseProgress.completed_lessons || 0,
      totalWatchedMinutes,
      enrollment.id
    ).run()

    // 80% 이상 완료 시 수료 처리
    if (progressRate >= 80) {
      await DB.prepare(`
        UPDATE enrollments
        SET is_completed = 1,
            completed_at = CASE WHEN is_completed = 0 THEN datetime('now') ELSE completed_at END,
            status = 'completed'
        WHERE id = ? AND is_completed = 0
      `).bind(enrollment.id).run()
    }

    return c.json(successResponse({
      lesson_progress: watch_percentage,
      course_progress: progressRate,
      lesson_completed: isCompleted === 1,
      course_completed: progressRate >= 80
    }))

  } catch (error) {
    console.error('Progress update error:', error)
    return c.json(errorResponse('진도 업데이트에 실패했습니다.'), 500)
  }
})

/**
 * GET /api/progress/lesson/:lesson_id
 * 특정 차시의 진도 조회
 */
progress.get('/lesson/:lesson_id', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const lessonId = parseInt(c.req.param('lesson_id'))
    const { DB } = c.env

    // 차시 정보 조회
    const lesson = await DB.prepare(`
      SELECT course_id FROM lessons WHERE id = ?
    `).bind(lessonId).first<any>()

    if (!lesson) {
      return c.json(errorResponse('존재하지 않는 차시입니다.'), 404)
    }

    // 수강 신청 정보
    const enrollment = await DB.prepare(`
      SELECT id FROM enrollments
      WHERE user_id = ? AND course_id = ? AND status IN ('active', 'completed')
    `).bind(user.id, lesson.course_id).first<any>()

    if (!enrollment) {
      return c.json(successResponse({
        has_access: false,
        progress: 0,
        last_position: 0
      }))
    }

    // 진도 기록 조회
    const progressData = await DB.prepare(`
      SELECT 
        last_watched_position,
        total_watched_seconds,
        watch_percentage,
        is_completed,
        status,
        access_count,
        last_accessed_at
      FROM lesson_progress
      WHERE enrollment_id = ? AND lesson_id = ?
    `).bind(enrollment.id, lessonId).first<any>()

    if (!progressData) {
      return c.json(successResponse({
        has_access: true,
        progress: 0,
        last_position: 0,
        is_completed: false,
        watch_count: 0
      }))
    }

    return c.json(successResponse({
      has_access: true,
      progress: progressData.watch_percentage || 0,
      last_position: progressData.last_watched_position || 0,
      total_watched_seconds: progressData.total_watched_seconds || 0,
      is_completed: progressData.is_completed === 1,
      watch_count: progressData.access_count || 0,
      last_watched_at: progressData.last_accessed_at
    }))

  } catch (error) {
    console.error('Get lesson progress error:', error)
    return c.json(errorResponse('진도 조회에 실패했습니다.'), 500)
  }
})

/**
 * GET /api/progress/course/:course_id
 * 강좌 전체 진도 조회
 */
progress.get('/course/:course_id', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const courseId = parseInt(c.req.param('course_id'))
    const { DB } = c.env

    // 수강 신청 정보
    const enrollment = await DB.prepare(`
      SELECT 
        id, progress_rate, completed_lessons, 
        total_watched_minutes, is_completed
      FROM enrollments
      WHERE user_id = ? AND course_id = ? AND status IN ('active', 'completed')
    `).bind(user.id, courseId).first<any>()

    if (!enrollment) {
      return c.json(successResponse({
        has_access: false,
        progress_rate: 0,
        completed_lessons: 0,
        total_lessons: 0,
        lessons: []
      }))
    }

    // 각 차시별 진도
    const lessons = await DB.prepare(`
      SELECT 
        l.id, l.lesson_number, l.title,
        l.video_duration_minutes,
        COALESCE(lp.watch_percentage, 0) as watch_percentage,
        COALESCE(lp.is_completed, 0) as is_completed,
        COALESCE(lp.last_accessed_at, '') as last_accessed_at
      FROM lessons l
      LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.enrollment_id = ?
      WHERE l.course_id = ? AND l.status = 'active'
      ORDER BY l.lesson_number ASC
    `).bind(enrollment.id, courseId).all()

    return c.json(successResponse({
      has_access: true,
      progress_rate: enrollment.progress_rate || 0,
      completed_lessons: enrollment.completed_lessons || 0,
      total_lessons: lessons.results?.length || 0,
      total_watched_minutes: enrollment.total_watched_minutes || 0,
      is_completed: enrollment.is_completed === 1,
      lessons: lessons.results || []
    }))

  } catch (error) {
    console.error('Get course progress error:', error)
    return c.json(errorResponse('강좌 진도 조회에 실패했습니다.'), 500)
  }
})

export default progress
