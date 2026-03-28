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

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function splitTitleLines(title: string, maxPerLine = 18): string[] {
  const normalized = title.trim().replace(/\s+/g, ' ')
  if (!normalized) return ['마인드스토리 강좌']
  if (normalized.length <= maxPerLine) return [normalized]
  return [normalized.slice(0, maxPerLine), normalized.slice(maxPerLine, maxPerLine * 2)]
}

/**
 * 강좌 제목 기반 SVG 썸네일 생성
 * - 보라색 그라데이션 + 학습 아이콘 + 제목 오버레이
 */
function generateCourseThumbnailSvg(title: string): string {
  const safeTitle = escapeXml(title || '마인드스토리 강좌')
  const lines = splitTitleLines(safeTitle, 18)
  const line1 = lines[0] || '마인드스토리 강좌'
  const line2 = lines[1] || ''
  const y1 = line2 ? 542 : 565

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img" aria-label="${safeTitle}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6D28D9"/>
      <stop offset="58%" stop-color="#4F46E5"/>
      <stop offset="100%" stop-color="#A21CAF"/>
    </linearGradient>
    <radialGradient id="glow" cx="82%" cy="18%" r="52%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="14" flood-color="#1E1B4B" flood-opacity="0.35"/>
    </filter>
  </defs>

  <rect width="1200" height="675" fill="url(#bgGrad)"/>
  <rect width="1200" height="675" fill="url(#glow)"/>
  <rect x="64" y="72" width="260" height="140" rx="24" fill="#FFFFFF" fill-opacity="0.06"/>
  <rect x="928" y="120" width="200" height="100" rx="20" fill="#FFFFFF" fill-opacity="0.08"/>
  <circle cx="1040" cy="540" r="92" fill="#FFFFFF" fill-opacity="0.05"/>

  <g transform="translate(600,285)" filter="url(#shadow)">
    <path d="M-84 -44c31-18 59-19 84-7v111c-25-12-53-11-84 7z" fill="#FFFFFF" fill-opacity="0.86"/>
    <path d="M84 -44c-31-18-59-19-84-7v111c25-12 53-11 84 7z" fill="#FFFFFF" fill-opacity="0.72"/>
    <path d="M0 -51v118" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="4"/>
  </g>

  <g transform="translate(80,502)">
    <rect width="1040" height="132" rx="20" fill="#0F172A" fill-opacity="0.28"/>
    <text x="40" y="${y1}" fill="#FFFFFF" font-size="52" font-weight="700" font-family="Pretendard, Apple SD Gothic Neo, Noto Sans KR, sans-serif" letter-spacing="-1">${line1}</text>
    ${line2 ? `<text x="40" y="596" fill="#FFFFFF" font-size="44" font-weight="600" font-family="Pretendard, Apple SD Gothic Neo, Noto Sans KR, sans-serif" letter-spacing="-0.6">${line2}</text>` : ''}
  </g>
</svg>`.trim()
}

/**
 * GET /api/courses
 * 과정 목록 조회 (공개된 과정만)
 */
courses.get('/', optionalAuth, async (c) => {
  try {
    const { DB } = c.env
    const user = c.get('user')
    const rawCg = (c.req.query('category_group') || '').trim().toUpperCase()
    const cg = rawCg === 'CLASSIC' || rawCg === 'NEXT' ? rawCg : null

    const cgSql = cg ? `AND UPPER(IFNULL(category_group, 'CLASSIC')) = ?` : ''
    const orderBy =
      cg === 'CLASSIC'
        ? 'highlight_classic DESC, IFNULL(display_order, 0) ASC, created_at DESC'
        : 'created_at DESC'

    const query =
      user?.role === 'admin'
        ? `SELECT * FROM courses WHERE 1=1 ${cgSql} ORDER BY ${orderBy}`
        : `SELECT * FROM courses WHERE status IN ('published', 'active') ${cgSql} ORDER BY ${orderBy}`

    const result = cg
      ? await DB.prepare(query).bind(cg).all<Course>()
      : await DB.prepare(query).all<Course>()

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
      WHERE status IN ('published', 'active')
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

    // 비공개 과정은 관리자만 조회 가능 (published, active는 공개)
    if (!['published', 'active'].includes(course.status) && user?.role !== 'admin') {
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

    // 수강생 수 조회
    const studentCountResult = await DB.prepare(`
      SELECT COUNT(*) as count FROM enrollments 
      WHERE course_id = ?
    `).bind(courseId).first<{ count: number }>()
    
    const studentCount = studentCountResult?.count || 0

    let has_paid_access = false
    if (user) {
      try {
        const paidOrder = await DB.prepare(`
          SELECT 1 as ok FROM orders
          WHERE user_id = ? AND course_id = ? AND status = 'paid'
          LIMIT 1
        `)
          .bind(user.id, courseId)
          .first<{ ok: number }>()
        if (paidOrder) {
          has_paid_access = true
        }
      } catch {
        // orders 테이블 미적용 환경
      }
      if (!has_paid_access) {
        try {
          const paidLegacy = await DB.prepare(`
            SELECT 1 as ok FROM enrollments e
            JOIN payments p ON e.payment_id = p.id
            WHERE e.user_id = ? AND e.course_id = ? AND p.status = 'completed'
            LIMIT 1
          `)
            .bind(user.id, courseId)
            .first<{ ok: number }>()
          if (paidLegacy) {
            has_paid_access = true
          }
        } catch {
          // payments 테이블 없음 등
        }
      }
      if (user.role === 'admin') {
        has_paid_access = true
      }
    }

    return c.json(successResponse({
      course: {
        ...course,
        student_count: studentCount
      },
      lessons: lessons.results,
      enrollment,
      has_paid_access
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

    // 수강 중인 경우 진도 정보 포함 (lesson_progress 테이블 있을 때만)
    if (user) {
      const enrollment = await DB.prepare(`
        SELECT * FROM enrollments 
        WHERE user_id = ? AND course_id = ?
      `).bind(user.id, courseId).first()

      if (enrollment) {
        // lesson_progress 테이블 존재 확인
        try {
          // 각 차시별 진도 조회
          const lessonsWithProgress = await Promise.all(
            lessons.results.map(async (lesson) => {
              try {
                const progress = await DB.prepare(`
                  SELECT * FROM lesson_progress 
                  WHERE enrollment_id = ? AND lesson_id = ?
                `).bind(enrollment.id, lesson.id).first()

                return {
                  ...lesson,
                  progress
                }
              } catch (error) {
                // lesson_progress 테이블이 없으면 진도 없이 반환
                return lesson
              }
            })
          )

          return c.json(successResponse(lessonsWithProgress))
        } catch (error) {
          // lesson_progress 테이블이 없으면 그냥 차시 목록만 반환
          return c.json(successResponse(lessons.results))
        }
      }
    }

    return c.json(successResponse(lessons.results))

  } catch (error) {
    console.error('Get lessons error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

/**
 * GET /api/courses/:courseId/materials
 * 교육자료 목록 (차시 문서/자료)
 */
courses.get('/:courseId/materials', requireAuth, async (c) => {
  try {
    const courseId = c.req.param('courseId')
    const user = c.get('user') as { id: number; role: string }
    const { DB } = c.env

    const course = await DB.prepare(`SELECT id, price, status FROM courses WHERE id = ?`).bind(courseId).first<{
      id: number
      price: number
      status: string
    }>()
    if (!course) return c.json(errorResponse('강좌를 찾을 수 없습니다.'), 404)

    // 비공개 과정은 관리자만
    if (!['published', 'active'].includes(course.status) && user.role !== 'admin') {
      return c.json(errorResponse('접근 권한이 없습니다.'), 403)
    }

    if (user.role !== 'admin' && Number(course.price || 0) > 0) {
      // 유료 강좌는 수강(또는 결제) 사용자만 자료 접근
      const enrollment = await DB.prepare(
        `SELECT id FROM enrollments WHERE user_id = ? AND course_id = ? LIMIT 1`
      )
        .bind(user.id, courseId)
        .first<{ id: number }>()
      if (!enrollment) {
        return c.json(errorResponse('수강 신청이 필요합니다.'), 403)
      }
    }

    // 자료는 lessons.document_url 기반
    const rows = await DB.prepare(
      `
      SELECT 
        id as lesson_id,
        lesson_number,
        title,
        document_url,
        document_filename,
        document_size_kb,
        allow_download
      FROM lessons
      WHERE course_id = ?
        AND document_url IS NOT NULL
        AND TRIM(document_url) <> ''
      ORDER BY lesson_number ASC
      `
    )
      .bind(courseId)
      .all<{
        lesson_id: number
        lesson_number: number
        title: string
        document_url: string
        document_filename?: string
        document_size_kb?: number
        allow_download: number
      }>()

    return c.json(
      successResponse({
        materials: rows.results.map((m) => ({
          lesson_id: m.lesson_id,
          lesson_number: m.lesson_number,
          title: m.title,
          url: m.document_url,
          filename: m.document_filename || `lesson-${m.lesson_number}.pdf`,
          size_kb: m.document_size_kb || null,
          allow_download: m.allow_download === 1,
        })),
      })
    )
  } catch (error) {
    console.error('Get course materials error:', error)
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
    const { DB } = c.env
    const payload = await c.req.json<{ title?: string }>().catch(() => ({}))

    // 강좌 제목 조회 (또는 요청 title 우선)
    const courseResult = await DB.prepare(`
      SELECT title FROM courses WHERE id = ?
    `).bind(courseId).first<{ title: string }>()

    if (!courseResult) {
      return c.json(errorResponse('강좌를 찾을 수 없습니다.'), 404)
    }

    const title = (payload.title || courseResult.title || '').trim() || '마인드스토리 강좌'
    const svg = generateCourseThumbnailSvg(title)
    const thumbnailUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

    // 생성 즉시 강좌 썸네일 반영
    await DB.prepare(`
      UPDATE courses
      SET thumbnail_url = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(thumbnailUrl, courseId).run()

    return c.json(successResponse({
      thumbnail_url: thumbnailUrl,
      title,
      message: '강좌 제목 기반 SVG 썸네일이 생성되어 적용되었습니다.'
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
        WHERE user_id = ? AND course_id = ?
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
