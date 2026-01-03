/**
 * 수료증 발급 API 라우트
 */

import { Hono } from 'hono'
import { Bindings } from '../types/database'
import { successResponse, errorResponse, generateCertificateNumber, formatDate } from '../utils/helpers'
import { requireAuth } from '../middleware/auth'

const certificates = new Hono<{ Bindings: Bindings }>()

// 내 수료증 목록
certificates.get('/my', requireAuth, async (c) => {
  const user = c.get('user')
  const { DB } = c.env
  
  const result = await DB.prepare(`
    SELECT cert.*, c.title as course_title
    FROM certificates cert
    JOIN courses c ON cert.course_id = c.id
    WHERE cert.user_id = ?
    ORDER BY cert.created_at DESC
  `).bind(user.id).all()

  return c.json(successResponse(result.results))
})

// 수료증 발급
certificates.post('/', requireAuth, async (c) => {
  const user = c.get('user')
  const { enrollment_id } = await c.req.json<{ enrollment_id: number }>()
  const { DB } = c.env

  // 본인인증 체크
  if (!user.phone_verified) {
    return c.json(errorResponse('수료증 발급을 위해 휴대폰 본인인증이 필요합니다.'), 403)
  }

  const enrollment = await DB.prepare(`
    SELECT * FROM enrollments WHERE id = ? AND user_id = ? AND is_completed = 1
  `).bind(enrollment_id, user.id).first()

  if (!enrollment) {
    return c.json(errorResponse('수료한 과정이 아닙니다.'), 404)
  }

  // 중복 발급 체크
  const existing = await DB.prepare(`
    SELECT * FROM certificates WHERE enrollment_id = ?
  `).bind(enrollment_id).first()

  if (existing) {
    return c.json(errorResponse('이미 발급된 수료증입니다.'), 409)
  }

  const certNumber = await generateCertificateNumber(DB)
  const today = formatDate(new Date())

  const result = await DB.prepare(`
    INSERT INTO certificates (
      user_id, course_id, enrollment_id, certificate_number,
      issue_date, completion_date, progress_rate
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    user.id, enrollment.course_id, enrollment_id, certNumber,
    today, formatDate(new Date(enrollment.completed_at)), enrollment.progress_rate
  ).run()

  return c.json(successResponse({
    id: result.meta.last_row_id,
    certificate_number: certNumber
  }, '수료증이 발급되었습니다.'), 201)
})

// 수료증 조회
certificates.get('/:id', requireAuth, async (c) => {
  const certId = c.req.param('id')
  const user = c.get('user')
  const { DB } = c.env

  const cert = await DB.prepare(`
    SELECT cert.*, c.title as course_title, u.name as user_name, u.birth_date
    FROM certificates cert
    JOIN courses c ON cert.course_id = c.id
    JOIN users u ON cert.user_id = u.id
    WHERE cert.id = ? AND cert.user_id = ?
  `).bind(certId, user.id).first()

  if (!cert) return c.json(errorResponse('수료증을 찾을 수 없습니다.'), 404)
  
  return c.json(successResponse(cert))
})

export default certificates
