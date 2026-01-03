/**
 * 과정 관련 API 라우트
 * /api/courses/*
 */

import { Hono } from 'hono'
import { Bindings, Course, Lesson, CreateCourseInput, CreateLessonInput } from '../types/database'
import { successResponse, errorResponse } from '../utils/helpers'
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth'
import { validateLessonContent, validateVideoUrl, extractYouTubeId, extractApiVideoId } from '../utils/content-filter'

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
      ? `SELECT * FROM courses ORDER BY created_at DESC`
      : `SELECT * FROM courses WHERE status = 'published' ORDER BY created_at DESC`

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
      WHERE status = 'published'
      ORDER BY created_at DESC
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
    if (course.status !== 'published' && user?.role !== 'admin') {
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
    const user = c.get('user')
    const { title, description, thumbnail_url, price, status } = body

    if (!title) {
      return c.json(errorResponse('제목은 필수입니다.'), 400)
    }

    const { DB } = c.env

    const result = await DB.prepare(`
      INSERT INTO courses (
        title, description, instructor_id, thumbnail_url, price, status
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      title,
      description || null,
      user?.id || 1,
      thumbnail_url || null,
      price || 0,
      status || 'draft'
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

    // ✅ 필수 필드 검증 강화
    if (!title || !lesson_number) {
      return c.json(errorResponse('차시 번호와 제목은 필수입니다.'), 400)
    }
    
    // 🛡️ 콘텐츠 필터링 (불법 영상 차단)
    const contentValidation = validateLessonContent({
      title,
      description,
      video_url
    })
    
    if (!contentValidation.isAllowed) {
      console.warn('🚫 부적절한 콘텐츠 차단:', { title, errors: contentValidation.errors })
      return c.json(errorResponse(
        '부적절한 콘텐츠가 감지되었습니다: ' + contentValidation.errors.join(', ')
      ), 400)
    }
    
    // 경고 로그 (허용은 되지만 주의 필요)
    if (contentValidation.warnings.length > 0) {
      console.warn('⚠️ 콘텐츠 경고:', contentValidation.warnings)
    }
    
    // 🔍 영상 URL 추가 검증
    if (video_url) {
      const urlValidation = validateVideoUrl(video_url)
      if (!urlValidation.isAllowed) {
        console.warn('🚫 부적절한 영상 URL 차단:', video_url)
        return c.json(errorResponse(urlValidation.reason || '유효하지 않은 영상 URL입니다.'), 400)
      }
    }
    
    // ✅ video_provider 정규화 (apivideo, api.video → apivideo)
    let normalizedProvider = video_provider || 'youtube';
    if (normalizedProvider === 'api.video') {
      normalizedProvider = 'apivideo';
    }
    
    // ✅ 디버깅 로그 추가
    console.log('📝 차시 생성 데이터:', {
      courseId,
      title,
      lesson_number,
      video_provider: normalizedProvider,
      video_url,
      video_id,
      video_duration_minutes,
      is_free_preview
    });
    
    console.log('✅ 차시 생성 요청:', { 
      courseId, 
      title, 
      lesson_number, 
      video_provider: normalizedProvider, 
      video_url, 
      video_id 
    });

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
        course_id, lesson_number, title, description,
        video_url, video_type, duration_minutes, is_free
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      courseId,
      lesson_number,
      title,
      description || null,
      video_url || null,
      'youtube',  // 고정값: YouTube만 사용
      video_duration_minutes || 0,
      is_free_preview ? 1 : 0
    ).run()

    return c.json(successResponse({
      id: result.meta.last_row_id,
      title
    }, '차시가 생성되었습니다.'), 201)

  } catch (error: any) {
    console.error('❌ Create lesson error:', error);
    
    // ✅ 구체적인 에러 메시지 반환
    let errorMessage = '서버 오류가 발생했습니다.';
    
    if (error.message?.includes('UNIQUE constraint')) {
      errorMessage = '이미 존재하는 차시 번호입니다.';
    } else if (error.message?.includes('NOT NULL constraint')) {
      errorMessage = '필수 항목이 누락되었습니다. 영상 URL을 확인해주세요.';
    } else if (error.message?.includes('FOREIGN KEY constraint')) {
      errorMessage = '과정 정보를 찾을 수 없습니다.';
    } else if (error.message) {
      errorMessage = `오류: ${error.message}`;
    }
    
    return c.json(errorResponse(errorMessage), 500)
  }
})

/**
 * GET /api/courses/:courseId/lessons/:lessonId
 * 차시 상세 조회
 */
courses.get('/:courseId/lessons/:lessonId', optionalAuth, async (c) => {
  try {
    const courseId = c.req.param('courseId')
    const lessonId = c.req.param('lessonId')
    console.log('📚 Fetching lesson:', { courseId, lessonId })
    
    const { DB } = c.env
    if (!DB) {
      console.error('❌ DB binding not found')
      return c.json(errorResponse('데이터베이스 연결 오류'), 500)
    }
    
    const user = c.get('user')
    console.log('👤 User:', user ? user.email : 'anonymous')

    // 🔐 로그인 필수
    if (!user) {
      return c.json(errorResponse('로그인이 필요합니다.'), 401)
    }

    const lesson = await DB.prepare(`
      SELECT * FROM lessons WHERE id = ? AND course_id = ?
    `).bind(lessonId, courseId).first<Lesson>()

    console.log('📖 Lesson found:', lesson ? lesson.title : 'not found')

    if (!lesson) {
      return c.json(errorResponse('차시를 찾을 수 없습니다.'), 404)
    }

    // 🔐 수강 신청 정보 조회 (관리자는 모든 강좌 접근 가능)
    const isAdmin = user.role === 'admin'
    let enrollment = null
    
    if (!isAdmin) {
      try {
        enrollment = await DB.prepare(`
          SELECT * FROM enrollments 
          WHERE user_id = ? AND course_id = ? AND status IN ('active', 'completed')
        `).bind(user.id, courseId).first()
        
        // 🔐 수강 등록 확인: 무료 미리보기가 아니면 수강 등록 필수
        if (!enrollment && !lesson.is_free_preview) {
          console.warn('⚠️ Access denied: Not enrolled')
          return c.json(errorResponse('이 강좌에 수강 등록이 필요합니다.'), 403)
        }
      } catch (enrollError) {
        console.error('⚠️ Enrollment query error:', enrollError)
        return c.json(errorResponse('수강 정보를 확인할 수 없습니다.'), 500)
      }
    }

    console.log('✅ Returning lesson data')
    return c.json(successResponse({ lesson, enrollment }))

  } catch (error) {
    console.error('❌ Get lesson error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다: ' + (error as Error).message), 500)
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

    // 🛡️ 콘텐츠 필터링 (불법 영상 차단)
    const contentValidation = validateLessonContent({
      title: body.title,
      description: body.description,
      video_url: body.video_url
    })
    
    if (!contentValidation.isAllowed) {
      console.warn('🚫 부적절한 콘텐츠 차단 (수정):', { lessonId, errors: contentValidation.errors })
      return c.json(errorResponse(
        '부적절한 콘텐츠가 감지되었습니다: ' + contentValidation.errors.join(', ')
      ), 400)
    }
    
    // 경고 로그
    if (contentValidation.warnings.length > 0) {
      console.warn('⚠️ 콘텐츠 경고 (수정):', contentValidation.warnings)
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

/**
 * POST /api/courses/:courseId/extract-thumbnail
 * 동영상에서 썸네일 자동 추출 (관리자 전용)
 */
courses.post('/:courseId/extract-thumbnail', requireAdmin, async (c) => {
  try {
    const courseId = parseInt(c.req.param('courseId'))
    const { DB, VIDEO_STORAGE, STORAGE } = c.env

    // 1. 강좌의 첫 번째 영상 차시 찾기
    const lessonResult = await DB.prepare(`
      SELECT * FROM lessons 
      WHERE course_id = ? AND content_type = 'video' AND video_url IS NOT NULL
      ORDER BY lesson_number ASC
      LIMIT 1
    `).bind(courseId).first<Lesson>()

    if (!lessonResult) {
      return c.json(errorResponse('영상이 업로드된 차시가 없습니다.'), 400)
    }

    const videoUrl = lessonResult.video_url

    // 2. 영상이 R2에 저장되어 있는지 확인
    if (!videoUrl || !VIDEO_STORAGE) {
      return c.json(errorResponse('영상 파일을 찾을 수 없습니다.'), 400)
    }

    // 3. 현재는 간단한 구현: 첫 번째 영상 URL을 썸네일로 사용
    // TODO: 실제로는 FFmpeg를 사용하여 영상에서 프레임을 추출해야 함
    // Cloudflare Workers 환경에서는 FFmpeg를 직접 실행할 수 없으므로,
    // 외부 서비스 (예: Cloudflare Images, AWS Lambda) 또는
    // 업로드 시점에 클라이언트에서 썸네일을 생성하는 방법을 사용해야 함

    // 임시 솔루션: 강좌 제목으로 기본 썸네일 생성
    const courseResult = await DB.prepare(`
      SELECT title FROM courses WHERE id = ?
    `).bind(courseId).first<{ title: string }>()

    if (!courseResult) {
      return c.json(errorResponse('강좌를 찾을 수 없습니다.'), 404)
    }

    // 기본 썸네일 URL 생성 (SVG 데이터 URL)
    const firstChar = courseResult.title.charAt(0).toUpperCase()
    const colors = ['8B5CF6', 'EC4899', '3B82F6', '10B981', 'F59E0B', 'EF4444']
    const color = colors[courseResult.title.charCodeAt(0) % colors.length]
    
    const svg = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="300" fill="#${color}"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
        font-family="Arial, sans-serif" font-size="120" font-weight="bold" fill="white">
        ${firstChar}
      </text>
    </svg>`
    
    const thumbnailUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

    return c.json(successResponse({
      thumbnail_url: thumbnailUrl,
      message: '기본 썸네일이 생성되었습니다. 실제 영상 썸네일 추출은 업로드 시점에 처리됩니다.',
      video_url: videoUrl
    }))

  } catch (error) {
    console.error('Extract thumbnail error:', error)
    return c.json(errorResponse('썸네일 추출 중 오류가 발생했습니다.'), 500)
  }
})

/**
 * GET /api/courses/:courseId/lessons/:lessonId
 * 차시 상세 조회 (공개 API)
 */
courses.get('/:courseId/lessons/:lessonId', optionalAuth, async (c) => {
  try {
    const courseId = c.req.param('courseId')
    const lessonId = c.req.param('lessonId')
    const { DB } = c.env
    const user = c.get('user')

    // 🔐 로그인 필수
    if (!user) {
      return c.json(errorResponse('로그인이 필요합니다.'), 401)
    }

    // 차시 조회
    const lesson = await DB.prepare(`
      SELECT * FROM lessons WHERE id = ? AND course_id = ?
    `).bind(lessonId, courseId).first<Lesson>()

    if (!lesson) {
      return c.json(errorResponse('차시를 찾을 수 없습니다.'), 404)
    }

    // 강좌 정보 조회
    const course = await DB.prepare(`
      SELECT * FROM courses WHERE id = ?
    `).bind(courseId).first<Course>()

    if (!course) {
      return c.json(errorResponse('강좌를 찾을 수 없습니다.'), 404)
    }

    // 🔐 수강 여부 확인 (관리자는 모든 강좌 접근 가능)
    const isAdmin = user.role === 'admin'
    let enrollment = null
    
    if (!isAdmin) {
      enrollment = await DB.prepare(`
        SELECT * FROM enrollments 
        WHERE user_id = ? AND course_id = ? AND status IN ('active', 'completed')
      `).bind(user.id, courseId).first()
      
      // 🔐 수강 등록 확인: 무료 미리보기가 아니면 수강 등록 필수
      if (!enrollment && !lesson.is_free_preview) {
        return c.json(errorResponse('이 강좌에 수강 등록이 필요합니다.'), 403)
      }
    }

    // 진도 정보 조회 (수강 중인 경우만)
    let progress = null
    if (enrollment) {
      progress = await DB.prepare(`
        SELECT * FROM lesson_progress 
        WHERE enrollment_id = ? AND lesson_id = ?
      `).bind(enrollment.id, lessonId).first()
    }

    // 다음 차시 정보
    const nextLesson = await DB.prepare(`
      SELECT id, lesson_number, title 
      FROM lessons 
      WHERE course_id = ? AND lesson_number > ? 
      ORDER BY lesson_number ASC 
      LIMIT 1
    `).bind(courseId, lesson.lesson_number).first()

    return c.json(successResponse({
      lesson,
      course: {
        id: course.id,
        title: course.title,
        instructor_id: course.instructor_id
      },
      enrollment,
      progress,
      nextLesson
    }))

  } catch (error) {
    console.error('Get lesson detail error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

export default courses
