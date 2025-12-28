/**
 * 과정 관련 API 라우트
 * /api/courses/*
 */

import { Hono } from 'hono'
import { Bindings, Course, Lesson, CreateCourseInput, CreateLessonInput } from '../types/database'
import { successResponse, errorResponse } from '../utils/helpers'
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth'

const courses = new Hono<{ Bindings: Bindings }>()

/**
 * GET /api/courses
 * 과정 목록 조회 (공개된 과정만)
 */
courses.get('/', optionalAuth, async (c) => {
  try {
    const { DB } = c.env
    const user = c.get('user')

    // 관리자는 모든 과정, 일반 사용자는 공개된 과정만
    const query = user?.role === 'admin' 
      ? `SELECT * FROM courses ORDER BY display_order ASC, created_at DESC`
      : `SELECT * FROM courses WHERE status = 'active' ORDER BY display_order ASC, created_at DESC`

    const result = await DB.prepare(query).all<Course>()

    return c.json(successResponse(result.results))

  } catch (error) {
    console.error('Get courses error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

/**
 * GET /api/courses/featured
 * 추천 과정 목록 조회
 */
courses.get('/featured', async (c) => {
  try {
    const { DB } = c.env

    const result = await DB.prepare(`
      SELECT * FROM courses 
      WHERE status = 'active' AND is_featured = 1
      ORDER BY display_order ASC, created_at DESC
      LIMIT 10
    `).all<Course>()

    return c.json(successResponse(result.results))

  } catch (error) {
    console.error('Get featured courses error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

/**
 * GET /api/courses/:id
 * 과정 상세 조회
 */
courses.get('/:id', optionalAuth, async (c) => {
  try {
    const courseId = c.req.param('id')
    const { DB } = c.env
    const user = c.get('user')

    // 과정 정보 조회
    const course = await DB.prepare(`
      SELECT * FROM courses WHERE id = ?
    `).bind(courseId).first<Course>()

    if (!course) {
      return c.json(errorResponse('과정을 찾을 수 없습니다.'), 404)
    }

    // 비공개 과정은 관리자만 조회 가능
    if (course.status !== 'active' && user?.role !== 'admin') {
      return c.json(errorResponse('접근 권한이 없습니다.'), 403)
    }

    // 차시 목록 조회
    const lessons = await DB.prepare(`
      SELECT * FROM lessons 
      WHERE course_id = ? 
      ORDER BY lesson_number ASC
    `).bind(courseId).all<Lesson>()

    // 수강 정보 조회 (로그인한 경우)
    let enrollment = null
    if (user) {
      enrollment = await DB.prepare(`
        SELECT * FROM enrollments 
        WHERE user_id = ? AND course_id = ?
      `).bind(user.id, courseId).first()
    }

    return c.json(successResponse({
      course,
      lessons: lessons.results,
      enrollment
    }))

  } catch (error) {
    console.error('Get course error:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    console.error('Stack:', error instanceof Error ? error.stack : '')
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

/**
 * POST /api/courses
 * 과정 생성 (관리자 전용)
 */
courses.post('/', requireAdmin, async (c) => {
  try {
    const body = await c.req.json<CreateCourseInput>()
    const { 
      title, description, thumbnail_url, course_type, duration_days, 
      completion_progress_rate, price, discount_price, is_free, status, is_featured 
    } = body

    if (!title || price === undefined) {
      return c.json(errorResponse('제목과 가격은 필수입니다.'), 400)
    }

    const { DB } = c.env

    const result = await DB.prepare(`
      INSERT INTO courses (
        title, description, thumbnail_url, course_type, duration_days,
        completion_progress_rate, price, discount_price, is_free, status, is_featured
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      title,
      description || null,
      thumbnail_url || null,
      course_type || 'general',
      duration_days || 30,
      completion_progress_rate || 80,
      price,
      discount_price || null,
      is_free ? 1 : 0,
      status || 'draft',
      is_featured ? 1 : 0
    ).run()

    return c.json(successResponse({
      id: result.meta.last_row_id,
      title
    }, '과정이 생성되었습니다.'), 201)

  } catch (error) {
    console.error('Create course error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

/**
 * PUT /api/courses/:id
 * 과정 수정 (관리자 전용)
 */
courses.put('/:id', requireAdmin, async (c) => {
  try {
    const courseId = c.req.param('id')
    const body = await c.req.json<Partial<CreateCourseInput>>()

    const { DB } = c.env

    // 과정 존재 확인
    const course = await DB.prepare(`
      SELECT * FROM courses WHERE id = ?
    `).bind(courseId).first()

    if (!course) {
      return c.json(errorResponse('과정을 찾을 수 없습니다.'), 404)
    }

    // 업데이트할 필드 구성
    const updates: string[] = []
    const values: any[] = []

    Object.entries(body).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = ?`)
        values.push(value)
      }
    })

    if (updates.length === 0) {
      return c.json(errorResponse('수정할 내용이 없습니다.'), 400)
    }

    updates.push('updated_at = datetime(\'now\')')
    values.push(courseId)

    await DB.prepare(`
      UPDATE courses 
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...values).run()

    return c.json(successResponse(null, '과정이 수정되었습니다.'))

  } catch (error) {
    console.error('Update course error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

/**
 * DELETE /api/courses/:id
 * 과정 삭제 (관리자 전용)
 */
courses.delete('/:id', requireAdmin, async (c) => {
  try {
    const courseId = c.req.param('id')
    const { DB } = c.env

    // 수강 중인 학생이 있는지 확인
    const activeEnrollments = await DB.prepare(`
      SELECT COUNT(*) as count 
      FROM enrollments 
      WHERE course_id = ? AND status = 'active'
    `).bind(courseId).first<{ count: number }>()

    if (activeEnrollments && activeEnrollments.count > 0) {
      return c.json(errorResponse('수강 중인 학생이 있어 삭제할 수 없습니다.'), 400)
    }

    // 과정 삭제 (CASCADE로 차시도 함께 삭제)
    await DB.prepare(`
      DELETE FROM courses WHERE id = ?
    `).bind(courseId).run()

    return c.json(successResponse(null, '과정이 삭제되었습니다.'))

  } catch (error) {
    console.error('Delete course error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

/**
 * GET /api/courses/:id/lessons
 * 과정의 차시 목록 조회
 */
courses.get('/:id/lessons', optionalAuth, async (c) => {
  try {
    const courseId = c.req.param('id')
    const { DB } = c.env
    const user = c.get('user')

    // 과정 확인
    const course = await DB.prepare(`
      SELECT * FROM courses WHERE id = ?
    `).bind(courseId).first<Course>()

    if (!course) {
      return c.json(errorResponse('과정을 찾을 수 없습니다.'), 404)
    }

    // 차시 목록 조회
    const lessons = await DB.prepare(`
      SELECT * FROM lessons 
      WHERE course_id = ? 
      ORDER BY lesson_number ASC
    `).bind(courseId).all<Lesson>()

    // 수강 중인 경우 진도 정보 포함
    if (user) {
      const enrollment = await DB.prepare(`
        SELECT * FROM enrollments 
        WHERE user_id = ? AND course_id = ?
      `).bind(user.id, courseId).first()

      if (enrollment) {
        // 각 차시별 진도 조회
        const lessonsWithProgress = await Promise.all(
          lessons.results.map(async (lesson) => {
            const progress = await DB.prepare(`
              SELECT * FROM lesson_progress 
              WHERE enrollment_id = ? AND lesson_id = ?
            `).bind(enrollment.id, lesson.id).first()

            return {
              ...lesson,
              progress
            }
          })
        )

        return c.json(successResponse(lessonsWithProgress))
      }
    }

    return c.json(successResponse(lessons.results))

  } catch (error) {
    console.error('Get lessons error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

/**
 * POST /api/courses/:id/lessons
 * 차시 생성 (관리자 전용)
 */
courses.post('/:id/lessons', requireAdmin, async (c) => {
  try {
    const courseId = parseInt(c.req.param('id'))
    const body = await c.req.json<CreateLessonInput>()
    const { 
      lesson_number, title, description, content_type, 
      video_provider, video_id, video_url, video_duration_minutes, is_free_preview 
    } = body

    if (!title || !lesson_number) {
      return c.json(errorResponse('차시 번호와 제목은 필수입니다.'), 400)
    }

    const { DB } = c.env

    // 과정 확인
    const course = await DB.prepare(`
      SELECT * FROM courses WHERE id = ?
    `).bind(courseId).first()

    if (!course) {
      return c.json(errorResponse('과정을 찾을 수 없습니다.'), 404)
    }

    // 차시 번호 중복 확인
    const existingLesson = await DB.prepare(`
      SELECT * FROM lessons 
      WHERE course_id = ? AND lesson_number = ?
    `).bind(courseId, lesson_number).first()

    if (existingLesson) {
      return c.json(errorResponse('이미 존재하는 차시 번호입니다.'), 409)
    }

    // 차시 생성
    const result = await DB.prepare(`
      INSERT INTO lessons (
        course_id, lesson_number, title, description, content_type,
        video_provider, video_id, video_url, video_duration_minutes, is_free_preview
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      courseId,
      lesson_number,
      title,
      description || null,
      content_type || 'video',
      video_provider || null,
      video_id || null,
      video_url || null,
      video_duration_minutes || null,
      is_free_preview ? 1 : 0
    ).run()

    // 과정의 총 차시 수와 총 학습 시간 업데이트
    await DB.prepare(`
      UPDATE courses 
      SET total_lessons = (SELECT COUNT(*) FROM lessons WHERE course_id = ?),
          total_duration_minutes = (SELECT COALESCE(SUM(video_duration_minutes), 0) FROM lessons WHERE course_id = ?),
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(courseId, courseId, courseId).run()

    return c.json(successResponse({
      id: result.meta.last_row_id,
      title
    }, '차시가 생성되었습니다.'), 201)

  } catch (error) {
    console.error('Create lesson error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

/**
 * PUT /api/courses/:courseId/lessons/:lessonId
 * 차시 수정 (관리자 전용)
 */
courses.put('/:courseId/lessons/:lessonId', requireAdmin, async (c) => {
  try {
    const lessonId = c.req.param('lessonId')
    const body = await c.req.json<Partial<CreateLessonInput>>()

    const { DB } = c.env

    // 차시 존재 확인
    const lesson = await DB.prepare(`
      SELECT * FROM lessons WHERE id = ?
    `).bind(lessonId).first()

    if (!lesson) {
      return c.json(errorResponse('차시를 찾을 수 없습니다.'), 404)
    }

    // 업데이트할 필드 구성
    const updates: string[] = []
    const values: any[] = []

    Object.entries(body).forEach(([key, value]) => {
      if (value !== undefined && key !== 'course_id') {
        updates.push(`${key} = ?`)
        values.push(value)
      }
    })

    if (updates.length === 0) {
      return c.json(errorResponse('수정할 내용이 없습니다.'), 400)
    }

    updates.push('updated_at = datetime(\'now\')')
    values.push(lessonId)

    await DB.prepare(`
      UPDATE lessons 
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...values).run()

    return c.json(successResponse(null, '차시가 수정되었습니다.'))

  } catch (error) {
    console.error('Update lesson error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

/**
 * DELETE /api/courses/:courseId/lessons/:lessonId
 * 차시 삭제 (관리자 전용)
 */
courses.delete('/:courseId/lessons/:lessonId', requireAdmin, async (c) => {
  try {
    const courseId = c.req.param('courseId')
    const lessonId = c.req.param('lessonId')
    const { DB } = c.env

    // 차시 삭제
    await DB.prepare(`
      DELETE FROM lessons WHERE id = ?
    `).bind(lessonId).run()

    // 과정 통계 업데이트
    await DB.prepare(`
      UPDATE courses 
      SET total_lessons = (SELECT COUNT(*) FROM lessons WHERE course_id = ?),
          total_duration_minutes = (SELECT COALESCE(SUM(video_duration_minutes), 0) FROM lessons WHERE course_id = ?),
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(courseId, courseId, courseId).run()

    return c.json(successResponse(null, '차시가 삭제되었습니다.'))

  } catch (error) {
    console.error('Delete lesson error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

export default courses
