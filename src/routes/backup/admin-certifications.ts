/**
 * 관리자 민간자격 관리 API
 * /api/admin/certifications/*
 */

import { Hono } from 'hono'
import { Bindings } from '../types/database'
import { successResponse, errorResponse } from '../utils/helpers'
import { requireAuth } from '../middleware/auth'

const adminCertifications = new Hono<{ Bindings: Bindings }>()

// 모든 라우트에 관리자 권한 확인
adminCertifications.use('*', requireAuth, async (c, next) => {
  const user = c.get('user')
  if (user.role !== 'admin') {
    return c.json(errorResponse('관리자 권한이 필요합니다.'), 403)
  }
  await next()
})

/**
 * GET /api/admin/certifications/types
 * 민간자격 종류 목록
 */
adminCertifications.get('/types', async (c) => {
  try {
    const { DB } = c.env
    
    const types = await DB.prepare(`
      SELECT * FROM certification_types
      ORDER BY display_order ASC, created_at DESC
    `).all()

    return c.json(successResponse(types.results || []))

  } catch (error) {
    console.error('Get certification types error:', error)
    return c.json(errorResponse('자격 종류 조회에 실패했습니다.'), 500)
  }
})

/**
 * POST /api/admin/certifications/types
 * 민간자격 종류 생성
 */
adminCertifications.post('/types', async (c) => {
  try {
    const body = await c.req.json<{
      name: string
      code: string
      category: string
      description?: string
      issuer_type: 'direct' | 'partner'
      issuer_name?: string
      issuer_registration_number?: string
      price?: number
      validity_period_months?: number
      is_active?: boolean
      display_order?: number
      requirements?: any
    }>()

    if (!body.name || !body.code || !body.category) {
      return c.json(errorResponse('필수 항목을 입력해주세요.'), 400)
    }

    const { DB } = c.env

    // 자격명/코드 중복 확인
    const existing = await DB.prepare(`
      SELECT id FROM certification_types WHERE name = ? OR code = ?
    `).bind(body.name, body.code).first()

    if (existing) {
      return c.json(errorResponse('이미 존재하는 자격명 또는 코드입니다.'), 409)
    }

    // 발급 기관 기본값 설정
    let issuerName = body.issuer_name || '(주)마인드스토리'
    if (body.issuer_type === 'direct') {
      issuerName = '(주)마인드스토리'
    }

    // 자격 생성
    const result = await DB.prepare(`
      INSERT INTO certification_types (
        name, code, category, description, issuer_type, issuer_name, issuer_registration_number,
        price, validity_period_months, is_active, display_order, requirements
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.name,
      body.code,
      body.category,
      body.description || null,
      body.issuer_type || 'direct',
      issuerName,
      body.issuer_registration_number || null,
      body.price || 0,
      body.validity_period_months || 0,
      body.is_active !== false ? 1 : 0,
      body.display_order || 0,
      body.requirements ? JSON.stringify(body.requirements) : null
    ).run()

    return c.json(successResponse({
      id: result.meta.last_row_id,
      name: body.name,
      code: body.code
    }, '자격이 생성되었습니다.'), 201)

  } catch (error) {
    console.error('Create certification type error:', error)
    return c.json(errorResponse('자격 생성에 실패했습니다.'), 500)
  }
})

/**
 * PUT /api/admin/certifications/types/:id
 * 민간자격 종류 수정
 */
adminCertifications.put('/types/:id', async (c) => {
  try {
    const typeId = parseInt(c.req.param('id'))
    const body = await c.req.json<{
      name?: string
      code?: string
      category?: string
      description?: string
      issuer_type?: 'direct' | 'partner'
      issuer_name?: string
      issuer_registration_number?: string
      price?: number
      validity_period_months?: number
      is_active?: boolean
      display_order?: number
      requirements?: any
    }>()

    const { DB } = c.env

    // 존재 확인
    const existing = await DB.prepare(`
      SELECT id FROM certification_types WHERE id = ?
    `).bind(typeId).first()

    if (!existing) {
      return c.json(errorResponse('존재하지 않는 자격입니다.'), 404)
    }

    // 업데이트 필드 구성
    const updates: string[] = []
    const bindings: any[] = []

    if (body.name !== undefined) {
      updates.push('name = ?')
      bindings.push(body.name)
    }
    if (body.code !== undefined) {
      updates.push('code = ?')
      bindings.push(body.code)
    }
    if (body.category !== undefined) {
      updates.push('category = ?')
      bindings.push(body.category)
    }
    if (body.description !== undefined) {
      updates.push('description = ?')
      bindings.push(body.description)
    }
    if (body.issuer_type !== undefined) {
      updates.push('issuer_type = ?')
      bindings.push(body.issuer_type)
      // 직접 발급이면 자동으로 발급 기관 설정
      if (body.issuer_type === 'direct') {
        updates.push('issuer_name = ?')
        bindings.push('(주)마인드스토리')
      }
    }
    if (body.issuer_name !== undefined && body.issuer_type === 'partner') {
      updates.push('issuer_name = ?')
      bindings.push(body.issuer_name)
    }
    if (body.issuer_registration_number !== undefined) {
      updates.push('issuer_registration_number = ?')
      bindings.push(body.issuer_registration_number)
    }
    if (body.price !== undefined) {
      updates.push('price = ?')
      bindings.push(body.price)
    }
    if (body.validity_period_months !== undefined) {
      updates.push('validity_period_months = ?')
      bindings.push(body.validity_period_months)
    }
    if (body.is_active !== undefined) {
      updates.push('is_active = ?')
      bindings.push(body.is_active ? 1 : 0)
    }
    if (body.display_order !== undefined) {
      updates.push('display_order = ?')
      bindings.push(body.display_order)
    }
    if (body.requirements !== undefined) {
      updates.push('requirements = ?')
      bindings.push(JSON.stringify(body.requirements))
    }

    if (updates.length === 0) {
      return c.json(errorResponse('업데이트할 항목이 없습니다.'), 400)
    }

    updates.push('updated_at = datetime(\'now\')')
    bindings.push(typeId)

    await DB.prepare(`
      UPDATE certification_types
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...bindings).run()

    return c.json(successResponse(null, '자격이 수정되었습니다.'))

  } catch (error) {
    console.error('Update certification type error:', error)
    return c.json(errorResponse('자격 수정에 실패했습니다.'), 500)
  }
})

/**
 * DELETE /api/admin/certifications/types/:id
 * 민간자격 종류 삭제 (비활성화)
 */
adminCertifications.delete('/types/:id', async (c) => {
  try {
    const typeId = parseInt(c.req.param('id'))
    const { DB } = c.env

    // 존재 확인
    const existing = await DB.prepare(`
      SELECT id FROM certification_types WHERE id = ?
    `).bind(typeId).first()

    if (!existing) {
      return c.json(errorResponse('존재하지 않는 자격입니다.'), 404)
    }

    // 비활성화 (실제 삭제하지 않음)
    await DB.prepare(`
      UPDATE certification_types
      SET is_active = 0, updated_at = datetime('now')
      WHERE id = ?
    `).bind(typeId).run()

    return c.json(successResponse(null, '자격이 비활성화되었습니다.'))

  } catch (error) {
    console.error('Delete certification type error:', error)
    return c.json(errorResponse('자격 삭제에 실패했습니다.'), 500)
  }
})

/**
 * GET /api/admin/certifications/applications
 * 자격 신청 목록 (관리자)
 */
adminCertifications.get('/applications', async (c) => {
  try {
    const { DB } = c.env
    const status = c.req.query('status') || ''

    let query = `
      SELECT 
        ca.*,
        ct.name as certification_name,
        ct.code as certification_code,
        u.name as applicant_user_name,
        u.email as applicant_user_email
      FROM certification_applications ca
      JOIN certification_types ct ON ca.certification_type_id = ct.id
      JOIN users u ON ca.user_id = u.id
    `

    const bindings: any[] = []

    if (status) {
      query += ` WHERE ca.status = ?`
      bindings.push(status)
    }

    query += ` ORDER BY ca.created_at DESC`

    const stmt = DB.prepare(query)
    const applications = bindings.length > 0 
      ? await stmt.bind(...bindings).all()
      : await stmt.all()

    return c.json(successResponse(applications.results || []))

  } catch (error) {
    console.error('Get applications error:', error)
    return c.json(errorResponse('신청 목록 조회에 실패했습니다.'), 500)
  }
})

/**
 * POST /api/admin/certifications/applications/:id/review
 * 자격 신청 심사
 */
adminCertifications.post('/applications/:id/review', async (c) => {
  try {
    const user = c.get('user')
    const applicationId = parseInt(c.req.param('id'))
    const { status, review_notes, rejection_reason } = await c.req.json<{
      status: 'approved' | 'rejected'
      review_notes?: string
      rejection_reason?: string
    }>()

    if (!status || !['approved', 'rejected'].includes(status)) {
      return c.json(errorResponse('올바른 심사 결과를 선택해주세요.'), 400)
    }

    if (status === 'rejected' && !rejection_reason) {
      return c.json(errorResponse('반려 사유를 입력해주세요.'), 400)
    }

    const { DB } = c.env

    // 신청 확인
    const application = await DB.prepare(`
      SELECT id, status FROM certification_applications WHERE id = ?
    `).bind(applicationId).first<any>()

    if (!application) {
      return c.json(errorResponse('존재하지 않는 신청입니다.'), 404)
    }

    if (application.status !== 'pending' && application.status !== 'reviewing') {
      return c.json(errorResponse('대기 중이거나 검토 중인 신청만 심사할 수 있습니다.'), 400)
    }

    // 심사 처리
    await DB.prepare(`
      UPDATE certification_applications
      SET status = ?,
          reviewer_id = ?,
          review_date = datetime('now'),
          review_notes = ?,
          rejection_reason = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      status,
      user.id,
      review_notes || null,
      rejection_reason || null,
      applicationId
    ).run()

    return c.json(successResponse(null, `신청이 ${status === 'approved' ? '승인' : '반려'}되었습니다.`))

  } catch (error) {
    console.error('Review application error:', error)
    return c.json(errorResponse('심사 처리에 실패했습니다.'), 500)
  }
})

/**
 * POST /api/admin/certifications/applications/:id/issue
 * 자격증 발급
 */
adminCertifications.post('/applications/:id/issue', async (c) => {
  try {
    const applicationId = parseInt(c.req.param('id'))
    const { DB } = c.env

    // 신청 확인
    const application = await DB.prepare(`
      SELECT ca.*, ct.code, ct.validity_period_months
      FROM certification_applications ca
      JOIN certification_types ct ON ca.certification_type_id = ct.id
      WHERE ca.id = ?
    `).bind(applicationId).first<any>()

    if (!application) {
      return c.json(errorResponse('존재하지 않는 신청입니다.'), 404)
    }

    if (application.status !== 'approved') {
      return c.json(errorResponse('승인된 신청만 발급할 수 있습니다.'), 400)
    }

    // 자격증 번호 생성
    const year = new Date().getFullYear()
    const countResult = await DB.prepare(`
      SELECT COUNT(*) as count FROM certification_applications
      WHERE strftime('%Y', issue_date) = ? AND certificate_number IS NOT NULL
    `).bind(year.toString()).first<{ count: number }>()

    const sequence = ((countResult?.count || 0) + 1).toString().padStart(4, '0')
    const certificateNumber = `CERT-${application.code}-${year}-${sequence}`

    // 만료일 계산
    let expiryDate = null
    if (application.validity_period_months > 0) {
      const issueDate = new Date()
      issueDate.setMonth(issueDate.getMonth() + application.validity_period_months)
      expiryDate = issueDate.toISOString()
    }

    // 발급 처리
    await DB.prepare(`
      UPDATE certification_applications
      SET status = 'issued',
          issue_date = datetime('now'),
          certificate_number = ?,
          expiry_date = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      certificateNumber,
      expiryDate,
      applicationId
    ).run()

    // TODO: PDF 생성 로직 추가

    return c.json(successResponse({
      certificate_number: certificateNumber,
      issue_date: new Date().toISOString(),
      expiry_date: expiryDate
    }, '자격증이 발급되었습니다.'))

  } catch (error) {
    console.error('Issue certificate error:', error)
    return c.json(errorResponse('자격증 발급에 실패했습니다.'), 500)
  }
})

/**
 * GET /api/admin/certifications/statistics
 * 자격 통계
 */
adminCertifications.get('/statistics', async (c) => {
  try {
    const { DB } = c.env

    // 전체 신청 통계
    const totalStats = await DB.prepare(`
      SELECT 
        COUNT(*) as total_applications,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'reviewing' THEN 1 ELSE 0 END) as reviewing_count,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
        SUM(CASE WHEN status = 'issued' THEN 1 ELSE 0 END) as issued_count
      FROM certification_applications
    `).first<any>()

    // 자격별 신청 수
    const byType = await DB.prepare(`
      SELECT 
        ct.name,
        ct.code,
        COUNT(ca.id) as application_count,
        SUM(CASE WHEN ca.status = 'issued' THEN 1 ELSE 0 END) as issued_count
      FROM certification_types ct
      LEFT JOIN certification_applications ca ON ct.id = ca.certification_type_id
      WHERE ct.is_active = 1
      GROUP BY ct.id
      ORDER BY application_count DESC
    `).all()

    // 월별 발급 추이 (최근 6개월)
    const monthlyIssued = await DB.prepare(`
      SELECT 
        strftime('%Y-%m', issue_date) as month,
        COUNT(*) as count
      FROM certification_applications
      WHERE status = 'issued' AND issue_date >= date('now', '-6 months')
      GROUP BY month
      ORDER BY month DESC
    `).all()

    return c.json(successResponse({
      total: totalStats || {},
      by_type: byType.results || [],
      monthly_issued: monthlyIssued.results || []
    }))

  } catch (error) {
    console.error('Get certification statistics error:', error)
    return c.json(errorResponse('통계 조회에 실패했습니다.'), 500)
  }
})

export default adminCertifications
