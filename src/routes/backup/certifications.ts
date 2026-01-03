/**
 * 민간자격 관리 API
 * /api/certifications/*
 */

import { Hono } from 'hono'
import { Bindings } from '../types/database'
import { successResponse, errorResponse } from '../utils/helpers'
import { requireAuth } from '../middleware/auth'

const certifications = new Hono<{ Bindings: Bindings }>()

/**
 * GET /api/certifications/types
 * 민간자격 종류 목록 조회 (공개)
 */
certifications.get('/types', async (c) => {
  try {
    const { DB } = c.env

    const types = await DB.prepare(`
      SELECT 
        ct.*,
        (SELECT COUNT(*) FROM certification_courses cc WHERE cc.certification_type_id = ct.id) as required_courses_count
      FROM certification_types ct
      WHERE ct.is_active = 1
      ORDER BY ct.display_order ASC, ct.name ASC
    `).all()

    return c.json(successResponse(types.results || []))

  } catch (error) {
    console.error('Get certification types error:', error)
    return c.json(errorResponse('자격 목록 조회에 실패했습니다.'), 500)
  }
})

/**
 * GET /api/certifications/types/:id
 * 특정 민간자격 상세 정보
 */
certifications.get('/types/:id', async (c) => {
  try {
    const typeId = parseInt(c.req.param('id'))
    const { DB } = c.env

    // 자격 정보
    const certType = await DB.prepare(`
      SELECT * FROM certification_types WHERE id = ? AND is_active = 1
    `).bind(typeId).first<any>()

    if (!certType) {
      return c.json(errorResponse('존재하지 않는 자격입니다.'), 404)
    }

    // 연결된 강좌 목록
    const courses = await DB.prepare(`
      SELECT c.id, c.title, c.description, c.thumbnail_url, c.price, c.discount_price, cc.is_required
      FROM certification_courses cc
      JOIN courses c ON cc.course_id = c.id
      WHERE cc.certification_type_id = ?
      ORDER BY cc.is_required DESC, c.title ASC
    `).bind(typeId).all()

    return c.json(successResponse({
      ...certType,
      requirements: certType.requirements ? JSON.parse(certType.requirements) : {},
      courses: courses.results || []
    }))

  } catch (error) {
    console.error('Get certification type error:', error)
    return c.json(errorResponse('자격 정보 조회에 실패했습니다.'), 500)
  }
})

/**
 * GET /api/certifications/eligible/:typeId
 * 사용자의 자격 신청 가능 여부 확인
 */
certifications.get('/eligible/:typeId', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const typeId = parseInt(c.req.param('typeId'))
    const { DB } = c.env

    // 자격 정보
    const certType = await DB.prepare(`
      SELECT * FROM certification_types WHERE id = ? AND is_active = 1
    `).bind(typeId).first<any>()

    if (!certType) {
      return c.json(errorResponse('존재하지 않는 자격입니다.'), 404)
    }

    // 필수 강좌 목록
    const requiredCourses = await DB.prepare(`
      SELECT cc.course_id, c.title
      FROM certification_courses cc
      JOIN courses c ON cc.course_id = c.id
      WHERE cc.certification_type_id = ? AND cc.is_required = 1
    `).bind(typeId).all()

    // 사용자의 수료 내역 확인
    const completedCourses = await DB.prepare(`
      SELECT e.course_id
      FROM enrollments e
      WHERE e.user_id = ? 
        AND e.status = 'completed'
        AND e.is_completed = 1
        AND e.progress_rate >= 80
    `).bind(user.id).all()

    const completedCourseIds = new Set(
      (completedCourses.results || []).map((e: any) => e.course_id)
    )

    const missingCourses = (requiredCourses.results || []).filter(
      (rc: any) => !completedCourseIds.has(rc.course_id)
    )

    const isEligible = missingCourses.length === 0

    // 이미 신청한 이력 확인
    const existingApplication = await DB.prepare(`
      SELECT id, status, certificate_number
      FROM certification_applications
      WHERE user_id = ? AND certification_type_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).bind(user.id, typeId).first<any>()

    return c.json(successResponse({
      eligible: isEligible,
      certification: certType,
      required_courses: requiredCourses.results || [],
      completed_courses: Array.from(completedCourseIds),
      missing_courses: missingCourses,
      existing_application: existingApplication || null
    }))

  } catch (error) {
    console.error('Check eligibility error:', error)
    return c.json(errorResponse('자격 요건 확인에 실패했습니다.'), 500)
  }
})

/**
 * POST /api/certifications/apply
 * 민간자격 신청
 */
certifications.post('/apply', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const { 
      certification_type_id, 
      applicant_name, 
      applicant_phone, 
      applicant_birth_date,
      applicant_address 
    } = await c.req.json<{
      certification_type_id: number
      applicant_name: string
      applicant_phone: string
      applicant_birth_date?: string
      applicant_address?: string
    }>()

    if (!certification_type_id || !applicant_name || !applicant_phone) {
      return c.json(errorResponse('필수 정보가 누락되었습니다.'), 400)
    }

    const { DB } = c.env

    // 자격 요건 확인
    const eligibilityCheck = await DB.prepare(`
      SELECT cc.course_id
      FROM certification_courses cc
      WHERE cc.certification_type_id = ? AND cc.is_required = 1
    `).bind(certification_type_id).all()

    const requiredCourseIds = (eligibilityCheck.results || []).map((r: any) => r.course_id)

    // 수료 확인
    for (const courseId of requiredCourseIds) {
      const enrollment = await DB.prepare(`
        SELECT id FROM enrollments
        WHERE user_id = ? AND course_id = ? AND status = 'completed' AND is_completed = 1
      `).bind(user.id, courseId).first()

      if (!enrollment) {
        return c.json(errorResponse('필수 강좌를 모두 수료하지 않았습니다.'), 400)
      }
    }

    // 중복 신청 확인
    const existingApp = await DB.prepare(`
      SELECT id, status FROM certification_applications
      WHERE user_id = ? AND certification_type_id = ?
        AND status IN ('pending', 'reviewing', 'approved', 'issued')
    `).bind(user.id, certification_type_id).first<any>()

    if (existingApp) {
      return c.json(errorResponse('이미 신청 중이거나 발급된 자격입니다.'), 400)
    }

    // 신청 번호 생성
    const year = new Date().getFullYear()
    const countResult = await DB.prepare(`
      SELECT COUNT(*) as count FROM certification_applications
      WHERE strftime('%Y', application_date) = ?
    `).bind(year.toString()).first<{ count: number }>()

    const sequence = ((countResult?.count || 0) + 1).toString().padStart(4, '0')
    const applicationNumber = `CA-${year}-${sequence}`

    // 신청 생성
    const result = await DB.prepare(`
      INSERT INTO certification_applications (
        user_id, certification_type_id, application_number,
        applicant_name, applicant_phone, applicant_email, applicant_birth_date, applicant_address,
        status, payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unpaid')
    `).bind(
      user.id,
      certification_type_id,
      applicationNumber,
      applicant_name,
      applicant_phone,
      user.email,
      applicant_birth_date || null,
      applicant_address || null
    ).run()

    return c.json(successResponse({
      application_id: result.meta.last_row_id,
      application_number: applicationNumber,
      status: 'pending'
    }, '민간자격 신청이 완료되었습니다.'), 201)

  } catch (error) {
    console.error('Apply certification error:', error)
    return c.json(errorResponse('자격 신청에 실패했습니다.'), 500)
  }
})

/**
 * GET /api/certifications/my-applications
 * 내 자격 신청 내역
 */
certifications.get('/my-applications', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const { DB } = c.env

    const applications = await DB.prepare(`
      SELECT 
        ca.*,
        ct.name as certification_name,
        ct.code as certification_code,
        ct.issuer_name,
        ct.price
      FROM certification_applications ca
      JOIN certification_types ct ON ca.certification_type_id = ct.id
      WHERE ca.user_id = ?
      ORDER BY ca.created_at DESC
    `).bind(user.id).all()

    return c.json(successResponse(applications.results || []))

  } catch (error) {
    console.error('Get my applications error:', error)
    return c.json(errorResponse('신청 내역 조회에 실패했습니다.'), 500)
  }
})

/**
 * GET /api/certifications/application/:id
 * 특정 신청 상세 정보
 */
certifications.get('/application/:id', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const applicationId = parseInt(c.req.param('id'))
    const { DB } = c.env

    const application = await DB.prepare(`
      SELECT 
        ca.*,
        ct.name as certification_name,
        ct.code as certification_code,
        ct.description as certification_description,
        ct.issuer_name,
        ct.price,
        reviewer.name as reviewer_name
      FROM certification_applications ca
      JOIN certification_types ct ON ca.certification_type_id = ct.id
      LEFT JOIN users reviewer ON ca.reviewer_id = reviewer.id
      WHERE ca.id = ? AND ca.user_id = ?
    `).bind(applicationId, user.id).first<any>()

    if (!application) {
      return c.json(errorResponse('존재하지 않는 신청입니다.'), 404)
    }

    return c.json(successResponse(application))

  } catch (error) {
    console.error('Get application error:', error)
    return c.json(errorResponse('신청 정보 조회에 실패했습니다.'), 500)
  }
})

/**
 * POST /api/certifications/application/:id/cancel
 * 자격 신청 취소
 */
certifications.post('/application/:id/cancel', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const applicationId = parseInt(c.req.param('id'))
    const { DB } = c.env

    // 신청 확인
    const application = await DB.prepare(`
      SELECT id, status FROM certification_applications
      WHERE id = ? AND user_id = ?
    `).bind(applicationId, user.id).first<any>()

    if (!application) {
      return c.json(errorResponse('존재하지 않는 신청입니다.'), 404)
    }

    if (application.status !== 'pending') {
      return c.json(errorResponse('대기 중인 신청만 취소할 수 있습니다.'), 400)
    }

    // 취소 처리
    await DB.prepare(`
      UPDATE certification_applications
      SET status = 'rejected',
          rejection_reason = '신청자 취소',
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(applicationId).run()

    return c.json(successResponse(null, '신청이 취소되었습니다.'))

  } catch (error) {
    console.error('Cancel application error:', error)
    return c.json(errorResponse('신청 취소에 실패했습니다.'), 500)
  }
})

export default certifications
