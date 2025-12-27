/**
 * 결제 관련 API 라우트 (모의 구현 - 실제 PG 연동은 추후)
 */

import { Hono } from 'hono'
import { Bindings } from '../types/database'
import { successResponse, errorResponse, generateOrderId } from '../utils/helpers'
import { requireAuth, requireAdmin } from '../middleware/auth'

const payments = new Hono<{ Bindings: Bindings }>()

// 내 결제 내역
payments.get('/my', requireAuth, async (c) => {
  const user = c.get('user')
  const { DB } = c.env
  
  const result = await DB.prepare(`
    SELECT p.*, c.title as course_title
    FROM payments p
    JOIN courses c ON p.course_id = c.id
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC
  `).bind(user.id).all()

  return c.json(successResponse(result.results))
})

// 결제 생성 (모의)
payments.post('/', requireAuth, async (c) => {
  const user = c.get('user')
  const { course_id, payment_method } = await c.req.json<{
    course_id: number
    payment_method: string
  }>()

  const { DB } = c.env

  const course = await DB.prepare(`SELECT * FROM courses WHERE id = ?`).bind(course_id).first()
  if (!course) return c.json(errorResponse('과정을 찾을 수 없습니다.'), 404)

  const orderId = generateOrderId()
  const finalAmount = course.discount_price || course.price

  const result = await DB.prepare(`
    INSERT INTO payments (
      user_id, course_id, order_id, order_name, amount, discount_amount, final_amount,
      payment_method, pg_provider, status, paid_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'tosspayments', 'completed', datetime('now'))
  `).bind(
    user.id, course_id, orderId, course.title, course.price,
    course.price - finalAmount, finalAmount, payment_method
  ).run()

  return c.json(successResponse({ id: result.meta.last_row_id, order_id: orderId }), 201)
})

// 환불 처리 (관리자)
payments.post('/:id/refund', requireAdmin, async (c) => {
  const paymentId = c.req.param('id')
  const { refund_reason } = await c.req.json<{ refund_reason: string }>()
  const { DB } = c.env

  const payment = await DB.prepare(`SELECT * FROM payments WHERE id = ?`).bind(paymentId).first()
  if (!payment) return c.json(errorResponse('결제를 찾을 수 없습니다.'), 404)

  await DB.prepare(`
    UPDATE payments 
    SET status = 'refunded', refunded_at = datetime('now'), 
        refund_amount = final_amount, refund_reason = ?
    WHERE id = ?
  `).bind(refund_reason, paymentId).run()

  // 수강 신청도 환불 상태로 변경
  await DB.prepare(`
    UPDATE enrollments SET status = 'refunded' WHERE payment_id = ?
  `).bind(paymentId).run()

  return c.json(successResponse(null, '환불이 완료되었습니다.'))
})

export default payments
