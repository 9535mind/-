/**
 * 관리자 대시보드 API 라우트
 */

import { Hono } from 'hono'
import { Bindings, DashboardStats } from '../types/database'
import { successResponse, errorResponse, hashPassword } from '../utils/helpers'
import { requireAdmin } from '../middleware/auth'
import { approveBookSubmission } from '../services/publishPipeline'
import { ean13Svg } from '../utils/ean13-svg'
import { buildPublishingReportHtml } from '../utils/publish-helper'

const admin = new Hono<{ Bindings: Bindings }>()

function generateTemporaryPassword(length: number = 14): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const digits = '23456789'
  const symbols = '!@#$%^&*'
  const all = upper + lower + digits + symbols

  const pick = (chars: string) => chars[crypto.getRandomValues(new Uint32Array(1))[0] % chars.length]
  const required = [pick(upper), pick(lower), pick(digits), pick(symbols)]
  const rest = Array.from({ length: Math.max(0, length - required.length) }, () => pick(all))
  const chars = [...required, ...rest]

  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

// 대시보드 통계 (상세)
admin.get('/dashboard/stats', requireAdmin, async (c) => {
  const { DB } = c.env

  try {
    // 기본 통계
    const [users, courses, activeEnroll] = await Promise.all([
      DB.prepare(`SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL`).first(),
      DB.prepare(`SELECT COUNT(*) as count FROM courses WHERE status = 'published'`).first(),
      DB.prepare(`SELECT COUNT(*) as count FROM enrollments WHERE completed_at IS NULL`).first(),
    ])

    // 이번 달 매출 (payments 테이블이 없으므로 0으로 설정)
    const monthlyRevenue = 0

    return c.json(successResponse({
      total_users: users?.count || 0,
      total_courses: courses?.count || 0,
      active_enrollments: activeEnroll?.count || 0,
      monthly_revenue: monthlyRevenue
    }))
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return c.json(errorResponse('통계 조회 실패'), 500)
  }
})

// 대시보드 통계
admin.get('/dashboard', requireAdmin, async (c) => {
  const { DB } = c.env

  const [users, courses, enrollments, activeEnroll, completedEnroll] = await Promise.all([
    DB.prepare(`SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL`).first(),
    DB.prepare(`SELECT COUNT(*) as count FROM courses WHERE status = 'published'`).first(),
    DB.prepare(`SELECT COUNT(*) as count FROM enrollments`).first(),
    DB.prepare(`SELECT COUNT(*) as count FROM enrollments WHERE completed_at IS NULL`).first(),
    DB.prepare(`SELECT COUNT(*) as count FROM enrollments WHERE completed_at IS NOT NULL`).first(),
  ])
  
  // payments 테이블이 없으므로 revenue는 0으로 설정
  const revenue = { total: 0 }

  const recentEnroll = await DB.prepare(`
    SELECT e.*, u.name as user_name, c.title as course_title
    FROM enrollments e
    JOIN users u ON e.user_id = u.id
    JOIN courses c ON e.course_id = c.id
    ORDER BY e.enrolled_at DESC
    LIMIT 10
  `).all()

  const popularCourses = await DB.prepare(`
    SELECT c.*, COUNT(e.id) as enrollment_count
    FROM courses c
    LEFT JOIN enrollments e ON c.id = e.course_id
    WHERE c.status = 'published'
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

/** 오늘의 핵심 지표 — 중앙 관제탑 카드용 */
admin.get('/dashboard/pulse', requireAdmin, async (c) => {
  const { DB } = c.env
  try {
    const signupRow = await DB.prepare(`
      SELECT COUNT(*) as c FROM users
      WHERE deleted_at IS NULL AND date(created_at) = date('now')
    `).first<{ c: number }>()
    const signup_today = Number(signupRow?.c ?? 0)

    let payment_today = 0
    try {
      const pay = await DB.prepare(`
        SELECT COALESCE(SUM(amount), 0) as s FROM orders
        WHERE status = 'paid' AND paid_at IS NOT NULL
        AND date(paid_at) = date('now')
      `).first<{ s: number }>()
      payment_today = Number(pay?.s ?? 0)
    } catch {
      try {
        const pay2 = await DB.prepare(`
          SELECT COALESCE(SUM(final_amount), 0) as s FROM payments
          WHERE status = 'completed' AND paid_at IS NOT NULL
          AND date(paid_at) = date('now')
        `).first<{ s: number }>()
        payment_today = Number(pay2?.s ?? 0)
      } catch {
        payment_today = 0
      }
    }

    let unanswered_inquiries = 0
    try {
      const inq = await DB.prepare(`
        SELECT COUNT(*) as c FROM support_inquiries WHERE status = 'open'
      `).first<{ c: number }>()
      unanswered_inquiries = Number(inq?.c ?? 0)
    } catch {
      unanswered_inquiries = 0
    }

    return c.json(
      successResponse({
        signup_today,
        payment_today,
        unanswered_inquiries,
      }),
    )
  } catch (error) {
    console.error('Dashboard pulse error:', error)
    return c.json(errorResponse('지표 조회 실패'), 500)
  }
})

// 전체 회원 목록 (검색: ?q=이메일·이름 부분일치)
admin.get('/users', requireAdmin, async (c) => {
  const { DB } = c.env
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = (page - 1) * limit
  const q = (c.req.query('q') || '').trim()
  const like = q ? `%${q.replace(/%/g, '\\%')}%` : ''

  const whereSearch = q
    ? `AND (email LIKE ? ESCAPE '\\' OR name LIKE ? ESCAPE '\\')`
    : ''

  const [users, total] = await Promise.all([
    q
      ? DB.prepare(`
      SELECT id, email, name, phone, role, created_at
      FROM users
      WHERE deleted_at IS NULL ${whereSearch}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(like, like, limit, offset).all()
      : DB.prepare(`
      SELECT id, email, name, phone, role, created_at
      FROM users
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all(),
    q
      ? DB.prepare(`
      SELECT COUNT(*) as count FROM users
      WHERE deleted_at IS NULL ${whereSearch}
    `).bind(like, like).first()
      : DB.prepare(`SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL`).first(),
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
      ORDER BY e.enrolled_at DESC
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

/** DELETE /api/admin/enrollments/:id — 수강 취소(관리자) */
admin.delete('/enrollments/:id', requireAdmin, async (c) => {
  const { DB } = c.env
  const enrollmentId = c.req.param('id')
  try {
    await DB.prepare(`DELETE FROM lesson_progress WHERE enrollment_id = ?`).bind(enrollmentId).run()
    const result = await DB.prepare(`DELETE FROM enrollments WHERE id = ?`).bind(enrollmentId).run()
    if (result.meta.changes === 0) {
      return c.json(errorResponse('수강 정보를 찾을 수 없습니다'), 404)
    }
    return c.json(successResponse(null, '수강이 취소되었습니다'))
  } catch (error) {
    console.error('Delete enrollment error:', error)
    return c.json(errorResponse('수강 취소 실패'), 500)
  }
})

// 전체 결제 내역
admin.get('/payments', requireAdmin, async (c) => {
  const { DB } = c.env
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = (page - 1) * limit

  try {
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
      data: payments.results || [],
      pagination: {
        page,
        limit,
        total: total?.count || 0,
        totalPages: Math.ceil((total?.count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Admin payments error:', error)
    // 에러 발생 시 빈 배열 반환
    return c.json({
      success: true,
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0
      }
    })
  }
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
      status = 'draft',
      category_group: rawCg,
    } = body

    // 필수 필드 검증
    if (!title || !description) {
      return c.json(errorResponse('필수 항목을 입력해주세요'), 400)
    }

    let categoryGroup = 'CLASSIC'
    if (rawCg !== undefined && rawCg !== null && String(rawCg).trim() !== '') {
      const cg = String(rawCg).trim().toUpperCase()
      if (cg !== 'CLASSIC' && cg !== 'NEXT') {
        return c.json(errorResponse('category_group은 CLASSIC 또는 NEXT'), 400)
      }
      categoryGroup = cg
    }

    // 현재 로그인한 관리자의 ID를 instructor_id로 사용
    const session = c.get('session')
    const instructorId = session?.user_id || null

    const result = await DB.prepare(`
      INSERT INTO courses (
        title, description, thumbnail_url, instructor_id, status,
        category_group,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(
      title,
      description,
      thumbnail_url || null,
      instructorId,
      status,
      categoryGroup
    ).run()

    return c.json(successResponse({
      id: result.meta.last_row_id,
      message: '강좌가 등록되었습니다'
    }))
  } catch (error) {
    console.error('Create course error:', error)
    return c.json(errorResponse('강좌 등록 실패: ' + (error as Error).message), 500)
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
      status,
      category_group: rawCg,
    } = body

    // 필수 필드 검증
    if (!title || !description) {
      return c.json(errorResponse('필수 항목을 입력해주세요'), 400)
    }

    let categoryGroup: string | null = null
    if (rawCg !== undefined && rawCg !== null && String(rawCg).trim() !== '') {
      const cg = String(rawCg).trim().toUpperCase()
      if (cg !== 'CLASSIC' && cg !== 'NEXT') {
        return c.json(errorResponse('category_group은 CLASSIC 또는 NEXT'), 400)
      }
      categoryGroup = cg
    }

    const result = categoryGroup
      ? await DB.prepare(`
      UPDATE courses SET
        title = ?,
        description = ?,
        thumbnail_url = ?,
        status = ?,
        category_group = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
        title,
        description,
        thumbnail_url || null,
        status,
        categoryGroup,
        courseId
      ).run()
      : await DB.prepare(`
      UPDATE courses SET
        title = ?,
        description = ?,
        thumbnail_url = ?,
        status = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
        title,
        description,
        thumbnail_url || null,
        status,
        courseId
      ).run()

    if (result.meta.changes === 0) {
      return c.json(errorResponse('강좌를 찾을 수 없습니다'), 404)
    }

    return c.json(successResponse({ message: '강좌가 수정되었습니다' }))
  } catch (error) {
    console.error('Update course error:', error)
    return c.json(errorResponse('강좌 수정 실패: ' + (error as Error).message), 500)
  }
})

/** PATCH /api/admin/courses/:id — 상태·브랜드·Classic 상단 노출 등 */
admin.patch('/courses/:id', requireAdmin, async (c) => {
  const { DB } = c.env
  const courseId = c.req.param('id')
  try {
    const body = await c.req.json()
    const {
      status,
      highlight_classic,
      category_group,
      isbn_enabled,
      course_subtype,
      feature_flags,
    } = body as {
      status?: string
      highlight_classic?: number
      category_group?: string
      isbn_enabled?: number
      course_subtype?: string
      feature_flags?: string
    }

    const sets: string[] = []
    const vals: unknown[] = []

    if (status !== undefined) {
      const allowed = ['draft', 'inactive', 'active', 'published']
      if (!allowed.includes(status)) {
        return c.json(errorResponse('허용되지 않는 상태입니다'), 400)
      }
      sets.push('status = ?')
      vals.push(status)
    }
    if (highlight_classic !== undefined) {
      sets.push('highlight_classic = ?')
      vals.push(highlight_classic ? 1 : 0)
    }
    if (category_group !== undefined) {
      const cg = String(category_group).toUpperCase()
      if (cg !== 'CLASSIC' && cg !== 'NEXT') {
        return c.json(errorResponse('category_group은 CLASSIC 또는 NEXT'), 400)
      }
      sets.push('category_group = ?')
      vals.push(cg)
    }
    if (isbn_enabled !== undefined) {
      sets.push('isbn_enabled = ?')
      vals.push(isbn_enabled ? 1 : 0)
    }
    if (course_subtype !== undefined) {
      sets.push('course_subtype = ?')
      vals.push(String(course_subtype).toUpperCase())
    }
    if (feature_flags !== undefined) {
      sets.push('feature_flags = ?')
      vals.push(typeof feature_flags === 'string' ? feature_flags : JSON.stringify(feature_flags))
    }

    if (sets.length === 0) {
      return c.json(errorResponse('갱신할 필드가 없습니다'), 400)
    }

    vals.push(courseId)
    const sql = `UPDATE courses SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`
    const result = await DB.prepare(sql)
      .bind(...vals)
      .run()
    if (result.meta.changes === 0) {
      return c.json(errorResponse('강좌를 찾을 수 없습니다'), 404)
    }
    return c.json(successResponse({ id: courseId }, '강좌가 갱신되었습니다'))
  } catch (error) {
    console.error('Patch course error:', error)
    return c.json(errorResponse('강좌 상태 변경 실패'), 500)
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
admin.get('/videos', requireAdmin, async (c) => {
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
    const { DB } = c.env
    
    // 사용자 존재 확인
    const user = await DB.prepare(`
      SELECT id, name, email FROM users WHERE id = ?
    `).bind(userId).first()
    
    if (!user) {
      return c.json(errorResponse('사용자를 찾을 수 없습니다.'), 404)
    }
    
    // 예측 가능한 기본값 금지: 항상 랜덤 임시 비밀번호 발급
    let newPassword = generateTemporaryPassword()
    
    const hashedPassword = await hashPassword(newPassword)

    try {
      await DB.prepare(`
        UPDATE users 
        SET password_hash = ?, password_reset_required = 1, updated_at = datetime('now') 
        WHERE id = ?
      `).bind(hashedPassword, userId).run()
    } catch {
      // 마이그레이션 적용 전 호환성
      await DB.prepare(`
        UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?
      `).bind(hashedPassword, userId).run()
    }
    
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

// 회원별 수강 목록(진도 요약)
admin.get('/users/:userId/enrollments', requireAdmin, async (c) => {
  const { DB } = c.env
  const userId = c.req.param('userId')
  try {
    const rows = await DB.prepare(`
      SELECT e.id, e.course_id, e.enrolled_at, e.progress, e.completed_at,
             c.title as course_title,
             (SELECT ROUND(AVG(COALESCE(lp.watch_percentage,0)),0) FROM lesson_progress lp WHERE lp.enrollment_id = e.id) as avg_progress
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE e.user_id = ?
      ORDER BY e.enrolled_at DESC
    `).bind(userId).all()
    return c.json(successResponse(rows.results ?? []))
  } catch (error) {
    console.error('Get user enrollments error:', error)
    return c.json(errorResponse('수강 목록 조회 실패'), 500)
  }
})

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

/** POST /api/admin/isbn/bulk — ISBN 대량 등록 */
admin.post('/isbn/bulk', requireAdmin, async (c) => {
  const { DB } = c.env
  try {
    const body = await c.req.json<{ numbers?: string[] }>()
    const raw = body.numbers
    if (!Array.isArray(raw) || raw.length === 0) {
      return c.json(errorResponse('numbers 배열이 필요합니다'), 400)
    }
    let inserted = 0
    for (const n of raw) {
      const isbn = String(n).replace(/\D/g, '')
      if (isbn.length !== 13) continue
      try {
        await DB.prepare(
          `INSERT INTO isbn_inventory (isbn_number, status) VALUES (?, 'AVAILABLE')`,
        )
          .bind(isbn)
          .run()
        inserted++
      } catch {
        /* UNIQUE 등 무시 */
      }
    }
    return c.json(successResponse({ inserted, total_requested: raw.length }))
  } catch (error) {
    console.error('ISBN bulk error:', error)
    return c.json(errorResponse('ISBN 등록 실패'), 500)
  }
})

/** GET /api/admin/isbn/stats */
admin.get('/isbn/stats', requireAdmin, async (c) => {
  const { DB } = c.env
  try {
    const a = await DB.prepare(`SELECT COUNT(*) as c FROM isbn_inventory WHERE status = 'AVAILABLE'`).first<{
      c: number
    }>()
    const u = await DB.prepare(`SELECT COUNT(*) as c FROM isbn_inventory WHERE status = 'USED'`).first<{ c: number }>()
    return c.json(
      successResponse({
        available: Number(a?.c ?? 0),
        used: Number(u?.c ?? 0),
      }),
    )
  } catch (error) {
    console.error('ISBN stats error:', error)
    return c.json(errorResponse('통계 조회 실패'), 500)
  }
})

/** GET /api/admin/digital-books — 발행·ISBN 연계 현황 */
admin.get('/digital-books', requireAdmin, async (c) => {
  const { DB } = c.env
  try {
    const rows = await DB.prepare(`
      SELECT db.id, db.user_id, u.name as user_name, u.email,
             db.course_id, c.title as course_title,
             db.title, db.isbn_number, db.barcode_url, db.status, db.updated_at
      FROM digital_books db
      JOIN users u ON u.id = db.user_id
      LEFT JOIN courses c ON c.id = db.course_id
      ORDER BY db.updated_at DESC
      LIMIT 200
    `).all()
    return c.json(successResponse(rows.results ?? []))
  } catch (error) {
    console.error('Admin digital-books error:', error)
    return c.json(errorResponse('목록 조회 실패'), 500)
  }
})

/** GET /api/admin/book-submissions — 출판 검수 대기열 */
admin.get('/book-submissions', requireAdmin, async (c) => {
  const { DB } = c.env
  const status = (c.req.query('status') || 'pending').trim().toLowerCase()
  const allowed = ['pending', 'approved', 'rejected', 'all']
  const st = allowed.includes(status) ? status : 'pending'
  try {
    let sql = `
      SELECT s.*, u.name as user_name, u.email as user_email
      FROM book_submissions s
      JOIN users u ON u.id = s.user_id
    `
    const bind: string[] = []
    if (st !== 'all') {
      sql += ` WHERE s.status = ?`
      bind.push(st)
    }
    sql += ` ORDER BY s.created_at DESC LIMIT 200`
    const rows = bind.length
      ? await DB.prepare(sql).bind(bind[0]).all()
      : await DB.prepare(sql).all()
    return c.json(successResponse(rows.results ?? []))
  } catch (error) {
    console.error('book-submissions list error:', error)
    return c.json(errorResponse('제출 목록 조회 실패'), 500)
  }
})

/** GET /api/admin/book-submissions/:id */
admin.get('/book-submissions/:id', requireAdmin, async (c) => {
  const { DB } = c.env
  const id = parseInt(c.req.param('id'), 10)
  if (Number.isNaN(id)) return c.json(errorResponse('잘못된 ID'), 400)
  try {
    const row = await DB.prepare(
      `SELECT s.*, u.name as user_name, u.email as user_email
       FROM book_submissions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`,
    )
      .bind(id)
      .first()
    if (!row) return c.json(errorResponse('없음'), 404)
    return c.json(successResponse(row))
  } catch (error) {
    console.error('book-submissions get error:', error)
    return c.json(errorResponse('조회 실패'), 500)
  }
})

/** POST /api/admin/publish/reject */
admin.post('/publish/reject', requireAdmin, async (c) => {
  const { DB } = c.env
  try {
    const body = await c.req.json<{ submission_id?: number; reason?: string }>()
    const sid = body.submission_id
    const reason = (body.reason || '').trim()
    if (sid === undefined || Number.isNaN(Number(sid))) {
      return c.json(errorResponse('submission_id가 필요합니다'), 400)
    }
    if (!reason) return c.json(errorResponse('반려 사유를 입력하세요'), 400)
    const r = await DB.prepare(
      `UPDATE book_submissions SET status = 'rejected', rejection_reason = ?, updated_at = datetime('now')
       WHERE id = ? AND status = 'pending'`,
    )
      .bind(reason, sid)
      .run()
    if (r.meta.changes !== 1) return c.json(errorResponse('대기 중인 제출만 반려할 수 있습니다'), 400)
    return c.json(successResponse({ submission_id: sid }, '반려 처리되었습니다'))
  } catch (error) {
    console.error('publish reject error:', error)
    return c.json(errorResponse('반려 처리 실패'), 500)
  }
})

/** POST /api/admin/publish/approve — ISBN 1건 자동 할당 + published_books */
admin.post('/publish/approve', requireAdmin, async (c) => {
  const { DB } = c.env
  try {
    const body = await c.req.json<{ submission_id?: number }>()
    const sid = body.submission_id
    if (sid === undefined || Number.isNaN(Number(sid))) {
      return c.json(errorResponse('submission_id가 필요합니다'), 400)
    }
    const result = await approveBookSubmission(DB, Number(sid))
    if (!result.ok) return c.json(errorResponse(result.reason), 400)
    return c.json(
      successResponse(
        {
          published_book_id: result.published_book_id,
          isbn: result.isbn,
          barcode_path: result.barcode_path,
        },
        '승인 및 ISBN 할당이 완료되었습니다',
      ),
    )
  } catch (error) {
    console.error('publish approve error:', error)
    return c.json(errorResponse('승인 처리 실패'), 500)
  }
})

/** GET /api/admin/published-books/:id/barcode.svg */
admin.get('/published-books/:id/barcode.svg', requireAdmin, async (c) => {
  const { DB } = c.env
  const id = parseInt(c.req.param('id'), 10)
  if (Number.isNaN(id)) return c.text('Not found', 404)
  try {
    const row = await DB.prepare(`SELECT isbn_number FROM published_books WHERE id = ?`).bind(id).first<{
      isbn_number: string | null
    }>()
    if (!row?.isbn_number) return c.text('Not found', 404)
    const svg = ean13Svg(row.isbn_number)
    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return c.text('Error', 500)
  }
})

/** GET /api/admin/published-books/:id/report.html — 출판 의뢰 리포트 (인쇄·PDF용) */
admin.get('/published-books/:id/report.html', requireAdmin, async (c) => {
  const { DB } = c.env
  const id = parseInt(c.req.param('id'), 10)
  if (Number.isNaN(id)) return c.text('Not found', 404)
  try {
    const row = await DB.prepare(
      `SELECT pb.title, pb.author_name, pb.isbn_number, pb.summary, pb.manuscript_url, bs.author_intent
       FROM published_books pb
       JOIN book_submissions bs ON bs.id = pb.submission_id
       WHERE pb.id = ?`,
    )
      .bind(id)
      .first<{
        title: string
        author_name: string
        isbn_number: string
        summary: string
        manuscript_url: string
        author_intent: string | null
      }>()
    if (!row) return c.text('Not found', 404)
    const svg = ean13Svg(row.isbn_number)
    const html = buildPublishingReportHtml({
      title: row.title,
      authorName: row.author_name,
      isbn: row.isbn_number,
      summary: row.summary || '',
      authorIntent: row.author_intent || undefined,
      barcodeSvgOrUrl: svg,
    })
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('report.html error:', error)
    return c.text('Error', 500)
  }
})

export default admin
