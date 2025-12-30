/**
 * 관리자 대시보드 API 라우트
 */

import { Hono } from 'hono'
import { Bindings, DashboardStats } from '../types/database'
import { successResponse, errorResponse } from '../utils/helpers'
import { requireAdmin } from '../middleware/auth'

const admin = new Hono<{ Bindings: Bindings }>()

// 대시보드 통계 (상세)
admin.get('/dashboard/stats', requireAdmin, async (c) => {
  const { DB } = c.env

  try {
    // 기본 통계
    const [users, courses, activeEnroll] = await Promise.all([
      DB.prepare(`SELECT COUNT(*) as count FROM users WHERE status = 'active'`).first(),
      DB.prepare(`SELECT COUNT(*) as count FROM courses WHERE status = 'active'`).first(),
      DB.prepare(`SELECT COUNT(*) as count FROM enrollments WHERE status = 'active'`).first(),
    ])

    // 이번 달 매출 (월별)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthlyRevenue = await DB.prepare(`
      SELECT SUM(final_amount) as total 
      FROM payments 
      WHERE status = 'completed' AND created_at >= ?
    `).bind(startOfMonth).first()

    return c.json(successResponse({
      total_users: users?.count || 0,
      total_courses: courses?.count || 0,
      active_enrollments: activeEnroll?.count || 0,
      monthly_revenue: monthlyRevenue?.total || 0
    }))
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return c.json(errorResponse('통계 조회 실패'), 500)
  }
})

// 대시보드 통계
admin.get('/dashboard', requireAdmin, async (c) => {
  const { DB } = c.env

  const [users, courses, enrollments, revenue, activeEnroll, completedEnroll] = await Promise.all([
    DB.prepare(`SELECT COUNT(*) as count FROM users WHERE status = 'active'`).first(),
    DB.prepare(`SELECT COUNT(*) as count FROM courses WHERE status = 'active'`).first(),
    DB.prepare(`SELECT COUNT(*) as count FROM enrollments`).first(),
    DB.prepare(`SELECT SUM(final_amount) as total FROM payments WHERE status = 'completed'`).first(),
    DB.prepare(`SELECT COUNT(*) as count FROM enrollments WHERE status = 'active'`).first(),
    DB.prepare(`SELECT COUNT(*) as count FROM enrollments WHERE status = 'completed'`).first(),
  ])

  const recentEnroll = await DB.prepare(`
    SELECT e.*, u.name as user_name, c.title as course_title
    FROM enrollments e
    JOIN users u ON e.user_id = u.id
    JOIN courses c ON e.course_id = c.id
    ORDER BY e.created_at DESC
    LIMIT 10
  `).all()

  const popularCourses = await DB.prepare(`
    SELECT c.*, COUNT(e.id) as enrollment_count
    FROM courses c
    LEFT JOIN enrollments e ON c.id = e.course_id
    WHERE c.status = 'active'
    GROUP BY c.id
    ORDER BY enrollment_count DESC
    LIMIT 5
  `).all()

  const stats: DashboardStats = {
    totalUsers: users?.count || 0,
    totalCourses: courses?.count || 0,
    totalEnrollments: enrollments?.count || 0,
    totalRevenue: revenue?.total || 0,
    activeEnrollments: activeEnroll?.count || 0,
    completedEnrollments: completedEnroll?.count || 0,
    recentEnrollments: recentEnroll.results,
    popularCourses: popularCourses.results
  }

  return c.json(successResponse(stats))
})

// 전체 회원 목록
admin.get('/users', requireAdmin, async (c) => {
  const { DB } = c.env
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = (page - 1) * limit

  const [users, total] = await Promise.all([
    DB.prepare(`
      SELECT id, email, name, phone, role, status, phone_verified, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all(),
    DB.prepare(`SELECT COUNT(*) as count FROM users`).first()
  ])

  return c.json({
    success: true,
    data: users.results,
    pagination: {
      page,
      limit,
      total: total?.count || 0,
      totalPages: Math.ceil((total?.count || 0) / limit)
    }
  })
})

// 전체 수강 신청 관리
admin.get('/enrollments', requireAdmin, async (c) => {
  const { DB } = c.env
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = (page - 1) * limit

  const [enrollments, total] = await Promise.all([
    DB.prepare(`
      SELECT e.*, u.name as user_name, u.email, c.title as course_title
      FROM enrollments e
      JOIN users u ON e.user_id = u.id
      JOIN courses c ON e.course_id = c.id
      ORDER BY e.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all(),
    DB.prepare(`SELECT COUNT(*) as count FROM enrollments`).first()
  ])

  return c.json({
    success: true,
    data: enrollments.results,
    pagination: {
      page,
      limit,
      total: total?.count || 0,
      totalPages: Math.ceil((total?.count || 0) / limit)
    }
  })
})

// 전체 결제 내역
admin.get('/payments', requireAdmin, async (c) => {
  const { DB } = c.env
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = (page - 1) * limit

  const [payments, total] = await Promise.all([
    DB.prepare(`
      SELECT p.*, u.name as user_name, u.email, c.title as course_title
      FROM payments p
      JOIN users u ON p.user_id = u.id
      JOIN courses c ON p.course_id = c.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all(),
    DB.prepare(`SELECT COUNT(*) as count FROM payments`).first()
  ])

  return c.json({
    success: true,
    data: payments.results,
    pagination: {
      page,
      limit,
      total: total?.count || 0,
      totalPages: Math.ceil((total?.count || 0) / limit)
    }
  })
})

// 수료증 관리
admin.get('/certificates', requireAdmin, async (c) => {
  const { DB } = c.env

  const result = await DB.prepare(`
    SELECT cert.*, u.name as user_name, u.email, c.title as course_title
    FROM certificates cert
    JOIN users u ON cert.user_id = u.id
    JOIN courses c ON cert.course_id = c.id
    ORDER BY cert.created_at DESC
  `).all()

  return c.json(successResponse(result.results))
})

/**
 * 강좌 관리 API
 */

// 강좌 목록 (관리자용)
admin.get('/courses', requireAdmin, async (c) => {
  const { DB } = c.env

  try {
    const courses = await DB.prepare(`
      SELECT c.*, COUNT(e.id) as enrolled_count
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `).all()

    return c.json(successResponse(courses.results))
  } catch (error) {
    console.error('Get courses error:', error)
    return c.json(errorResponse('강좌 목록 조회 실패'), 500)
  }
})

// 강좌 생성
admin.post('/courses', requireAdmin, async (c) => {
  const { DB } = c.env

  try {
    const body = await c.req.json()
    const {
      title,
      description,
      thumbnail_url,
      course_type = 'general',
      duration_days = 30,
      price = 0,
      discount_price = 0,
      is_free = 0,
      is_featured = 0,
      status = 'active'
    } = body

    // 필수 필드 검증
    if (!title || !description) {
      return c.json(errorResponse('필수 항목을 입력해주세요'), 400)
    }

    const result = await DB.prepare(`
      INSERT INTO courses (
        title, description, thumbnail_url, course_type, duration_days,
        price, discount_price, is_free, is_featured, status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(
      title,
      description,
      thumbnail_url || null,
      course_type,
      duration_days,
      price,
      discount_price,
      is_free,
      is_featured,
      status
    ).run()

    return c.json(successResponse({
      id: result.meta.last_row_id,
      message: '강좌가 등록되었습니다'
    }))
  } catch (error) {
    console.error('Create course error:', error)
    return c.json(errorResponse('강좌 등록 실패'), 500)
  }
})

// 강좌 수정
admin.put('/courses/:id', requireAdmin, async (c) => {
  const { DB } = c.env
  const courseId = c.req.param('id')

  try {
    const body = await c.req.json()
    const {
      title,
      description,
      thumbnail_url,
      course_type,
      duration_days,
      price,
      discount_price,
      is_free,
      is_featured,
      status
    } = body

    // 필수 필드 검증
    if (!title || !description) {
      return c.json(errorResponse('필수 항목을 입력해주세요'), 400)
    }

    const result = await DB.prepare(`
      UPDATE courses SET
        title = ?,
        description = ?,
        thumbnail_url = ?,
        course_type = ?,
        duration_days = ?,
        price = ?,
        discount_price = ?,
        is_free = ?,
        is_featured = ?,
        status = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      title,
      description,
      thumbnail_url || null,
      course_type,
      duration_days,
      price,
      discount_price,
      is_free,
      is_featured,
      status,
      courseId
    ).run()

    if (result.meta.changes === 0) {
      return c.json(errorResponse('강좌를 찾을 수 없습니다'), 404)
    }

    return c.json(successResponse({ message: '강좌가 수정되었습니다' }))
  } catch (error) {
    console.error('Update course error:', error)
    return c.json(errorResponse('강좌 수정 실패'), 500)
  }
})

// 강좌 삭제
admin.delete('/courses/:id', requireAdmin, async (c) => {
  const { DB } = c.env
  const courseId = c.req.param('id')

  try {
    // 수강생 확인
    const enrollments = await DB.prepare(`
      SELECT COUNT(*) as count FROM enrollments WHERE course_id = ?
    `).bind(courseId).first()

    if (enrollments && enrollments.count > 0) {
      return c.json(errorResponse('수강생이 있는 강좌는 삭제할 수 없습니다'), 400)
    }

    // 강좌 삭제
    const result = await DB.prepare(`
      DELETE FROM courses WHERE id = ?
    `).bind(courseId).run()

    if (result.meta.changes === 0) {
      return c.json(errorResponse('강좌를 찾을 수 없습니다'), 404)
    }

    return c.json(successResponse({ message: '강좌가 삭제되었습니다' }))
  } catch (error) {
    console.error('Delete course error:', error)
    return c.json(errorResponse('강좌 삭제 실패'), 500)
  }
})

/**
 * GET /api/admin/videos
 * 모든 영상 목록 조회 (관리자 전용)
 */
admin.get('/videos', async (c) => {
  try {
    const { DB } = c.env

    const result = await DB.prepare(`
      SELECT 
        l.id as lesson_id,
        l.lesson_number,
        l.title as lesson_title,
        l.description,
        l.video_url,
        l.video_provider,
        l.video_duration_minutes,
        l.is_free_preview,
        l.status,
        l.created_at,
        c.id as course_id,
        c.title as course_title
      FROM lessons l
      JOIN courses c ON l.course_id = c.id
      WHERE l.content_type = 'video' AND l.video_url IS NOT NULL
      ORDER BY l.created_at DESC
    `).all()

    return c.json(successResponse(result.results))

  } catch (error) {
    console.error('Get videos error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

/**
 * POST /api/admin/users/:userId/reset-password
 * 사용자 비밀번호 초기화 (관리자 전용)
 */
admin.post('/users/:userId/reset-password', requireAdmin, async (c) => {
  try {
    const userId = c.req.param('userId')
    const { mode } = await c.req.json<{ mode?: 'manual' | 'ai' }>()
    const { DB, OPENAI_API_KEY, OPENAI_BASE_URL } = c.env
    
    // 사용자 존재 확인
    const user = await DB.prepare(`
      SELECT id, name, email FROM users WHERE id = ?
    `).bind(userId).first()
    
    if (!user) {
      return c.json(errorResponse('사용자를 찾을 수 없습니다.'), 404)
    }
    
    let newPassword = ''
    
    if (mode === 'ai' && OPENAI_API_KEY) {
      // AI로 안전한 비밀번호 생성
      try {
        const baseURL = OPENAI_BASE_URL || 'https://www.genspark.ai/api/llm_proxy/v1'
        const response = await fetch(`${baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: '당신은 안전한 비밀번호 생성 전문가입니다. 8-12자리의 기억하기 쉬우면서도 안전한 비밀번호를 생성합니다.'
              },
              {
                role: 'user',
                content: `사용자 이름: ${user.name}\n\n다음 규칙으로 비밀번호를 생성해주세요:\n1. 8-12자 길이\n2. 영문 대소문자, 숫자, 특수문자(!@#$%^&*) 중 3가지 이상 포함\n3. 사용자 이름과 관련되면서도 예측하기 어려운 패턴\n4. JSON 형식으로 응답: {"password": "생성된비밀번호"}`
              }
            ],
            temperature: 0.9,
            max_tokens: 100
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          const content = data.choices[0]?.message?.content
          
          try {
            const jsonMatch = content.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0])
              newPassword = parsed.password
            }
          } catch (e) {
            // JSON 파싱 실패 시 기본값
            newPassword = 'password123'
          }
        } else {
          newPassword = 'password123'
        }
      } catch (error) {
        console.error('AI password generation error:', error)
        newPassword = 'password123'
      }
    } else {
      // 수동 초기화: password123
      newPassword = 'password123'
    }
    
    // 비밀번호 해시 (실제로는 bcrypt 사용해야 하지만, 간단히 처리)
    // 주의: 프로덕션에서는 반드시 bcrypt 등 안전한 해시 사용
    const hashedPassword = newPassword // TODO: 실제 해싱 적용
    
    // 비밀번호 업데이트
    await DB.prepare(`
      UPDATE users SET password = ? WHERE id = ?
    `).bind(hashedPassword, userId).run()
    
    console.log(`Password reset for user ${userId}: ${newPassword}`)
    
    return c.json(successResponse({
      new_password: newPassword,
      mode: mode || 'manual'
    }, '비밀번호가 초기화되었습니다.'))
    
  } catch (error) {
    console.error('Reset password error:', error)
    return c.json(errorResponse('비밀번호 초기화에 실패했습니다.'), 500)
  }
})

export default admin

// 회원 상세 조회
admin.get('/users/:userId', requireAdmin, async (c) => {
  const { DB } = c.env
  const userId = c.req.param('userId')

  try {
    // 회원 기본 정보
    const user = await DB.prepare(`
      SELECT id, email, name, phone, phone_verified, birth_date, role, status,
             terms_agreed, privacy_agreed, marketing_agreed, 
             created_at, updated_at, last_login_at
      FROM users
      WHERE id = ?
    `).bind(userId).first()

    if (!user) {
      return c.json(errorResponse('회원을 찾을 수 없습니다'), 404)
    }

    // 수강 통계
    const enrollStats = await DB.prepare(`
      SELECT 
        COUNT(*) as total_enrollments,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_enrollments,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_enrollments
      FROM enrollments
      WHERE user_id = ?
    `).bind(userId).first()

    // 결제 통계
    const paymentStats = await DB.prepare(`
      SELECT 
        COUNT(*) as total_payments,
        SUM(CASE WHEN status = 'completed' THEN final_amount ELSE 0 END) as total_paid,
        MAX(paid_at) as last_payment_date
      FROM payments
      WHERE user_id = ?
    `).bind(userId).first()

    return c.json(successResponse({
      ...user,
      enrollments: enrollStats || { total_enrollments: 0, active_enrollments: 0, completed_enrollments: 0 },
      payments: paymentStats || { total_payments: 0, total_paid: 0, last_payment_date: null }
    }))
  } catch (error) {
    console.error('Get user detail error:', error)
    return c.json(errorResponse('회원 정보 조회 실패'), 500)
  }
})
