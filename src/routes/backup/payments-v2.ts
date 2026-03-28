/**
 * 결제 API v2 - 토스페이먼츠 연동
 */

import { Hono } from 'hono'
import { Bindings } from '../types/database'
import { successResponse, errorResponse, generateOrderId } from '../utils/helpers'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { 
  confirmPayment, 
  cancelPayment, 
  calculateRefundAmount,
  BUSINESS_INFO 
} from '../utils/toss-payments'

const payments = new Hono<{ Bindings: Bindings }>()

/**
 * 내 결제 내역
 * GET /api/payments/my
 */
payments.get('/my', requireAuth, async (c) => {
  const user = c.get('user')
  const { DB } = c.env
  
  const result = await DB.prepare(`
    SELECT 
      p.*,
      c.title as course_title,
      c.thumbnail_url as course_thumbnail
    FROM payments p
    JOIN courses c ON p.course_id = c.id
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC
  `).bind(user.id).all()

  return c.json(successResponse(result.results))
})

/**
 * 결제 준비 (주문 생성)
 * POST /api/payments/prepare
 */
payments.post('/prepare', requireAuth, async (c) => {
  const user = c.get('user')
  const { course_id } = await c.req.json<{ course_id: number }>()
  const { DB } = c.env

  // 과정 정보 조회
  const course: any = await DB.prepare(`
    SELECT * FROM courses WHERE id = ? AND status = 'published'
  `).bind(course_id).first()

  if (!course) {
    return c.json(errorResponse('과정을 찾을 수 없습니다.'), 404)
  }

  // 이미 수강 중인지 확인
  const existingEnrollment: any = await DB.prepare(`
    SELECT e.* FROM enrollments e
    JOIN payments p ON e.payment_id = p.id
    WHERE e.user_id = ? AND e.course_id = ? 
      AND p.status = 'completed'
      AND e.status = 'active'
  `).bind(user.id, course_id).first()

  if (existingEnrollment) {
    return c.json(errorResponse('이미 수강 중인 과정입니다.'), 400)
  }

  // 주문 ID 생성
  const orderId = generateOrderId()
  const finalAmount = course.discount_price || course.price

  // 결제 레코드 생성 (pending 상태)
  const result = await DB.prepare(`
    INSERT INTO payments (
      user_id, course_id, order_id, order_name, 
      amount, discount_amount, final_amount,
      payment_method, pg_provider, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'card', 'tosspayments', 'pending')
  `).bind(
    user.id,
    course_id,
    orderId,
    course.title,
    course.price,
    course.price - finalAmount,
    finalAmount
  ).run()

  const paymentId = result.meta.last_row_id

  // 결제 위젯으로 전달할 데이터
  return c.json(successResponse({
    paymentId: paymentId,
    orderId: orderId,
    orderName: course.title,
    amount: finalAmount,
    customerEmail: user.email,
    customerName: user.name,
    successUrl: `${c.req.url.split('/api')[0]}/payment/success`,
    failUrl: `${c.req.url.split('/api')[0]}/payment/fail`
  }))
})

/**
 * 결제 승인 (토스페이먼츠 리다이렉트 후)
 * POST /api/payments/confirm
 */
payments.post('/confirm', requireAuth, async (c) => {
  const user = c.get('user')
  const { paymentKey, orderId, amount } = await c.req.json<{
    paymentKey: string
    orderId: string
    amount: number
  }>()

  const { DB } = c.env

  try {
    // 시크릿 키는 환경변수에서만 로드 (하드코딩 금지)
    const secretKey = c.env.TOSS_SECRET_KEY
    if (!secretKey) {
      return c.json(errorResponse('TOSS_SECRET_KEY 환경변수가 설정되지 않았습니다.'), 500)
    }

    // 토스페이먼츠 결제 승인 요청
    const tossPayment = await confirmPayment(paymentKey, orderId, amount, secretKey)

    // DB에서 결제 정보 조회
    const payment: any = await DB.prepare(`
      SELECT * FROM payments WHERE order_id = ?
    `).bind(orderId).first()

    if (!payment) {
      return c.json(errorResponse('결제 정보를 찾을 수 없습니다.'), 404)
    }

    // 금액 검증
    if (payment.final_amount !== amount) {
      return c.json(errorResponse('결제 금액이 일치하지 않습니다.'), 400)
    }

    // 결제 상태 업데이트
    await DB.prepare(`
      UPDATE payments
      SET 
        status = 'completed',
        payment_key = ?,
        paid_at = datetime('now'),
        pg_transaction_id = ?,
        payment_method = ?,
        receipt_url = ?
      WHERE id = ?
    `).bind(
      paymentKey,
      tossPayment.transactionKey || '',
      tossPayment.method || 'card',
      tossPayment.receipt?.url || '',
      payment.id
    ).run()

    // 수강 신청 생성
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 90) // 90일 수강 기간

    await DB.prepare(`
      INSERT INTO enrollments (
        user_id, course_id, payment_id, status,
        enrolled_at, expires_at
      ) VALUES (?, ?, ?, 'active', datetime('now'), ?)
    `).bind(
      user.id,
      payment.course_id,
      payment.id,
      endDate.toISOString()
    ).run()

    // TODO: 이메일/SMS 발송

    return c.json(successResponse({
      paymentId: payment.id,
      orderId: payment.order_id,
      amount: payment.final_amount,
      receiptUrl: tossPayment.receipt?.url
    }, '결제가 완료되었습니다.'))

  } catch (error: any) {
    console.error('결제 승인 실패:', error)
    
    // 결제 실패 상태 업데이트
    await DB.prepare(`
      UPDATE payments
      SET status = 'failed', fail_reason = ?
      WHERE order_id = ?
    `).bind(error.message, orderId).run()

    return c.json(errorResponse(`결제 승인 실패: ${error.message}`), 400)
  }
})

/**
 * 환불 처리 (관리자)
 * POST /api/payments/:id/refund
 */
payments.post('/:id/refund', requireAdmin, async (c) => {
  const paymentId = c.req.param('id')
  const { refund_reason } = await c.req.json<{ refund_reason?: string }>()
  const { DB } = c.env

  try {
    // 결제 정보 조회
    const payment: any = await DB.prepare(`
      SELECT * FROM payments WHERE id = ?
    `).bind(paymentId).first()

    if (!payment) {
      return c.json(errorResponse('결제를 찾을 수 없습니다.'), 404)
    }

    if (payment.status !== 'completed') {
      return c.json(errorResponse('완료된 결제만 환불 가능합니다.'), 400)
    }

    // 수강 정보 조회 (진도율 확인)
    const enrollment: any = await DB.prepare(`
      SELECT * FROM enrollments WHERE payment_id = ?
    `).bind(paymentId).first()

    if (!enrollment) {
      return c.json(errorResponse('수강 정보를 찾을 수 없습니다.'), 404)
    }

    // 환불 금액 계산
    const enrolledDays = Math.floor(
      (Date.now() - new Date(enrollment.enrolled_at).getTime()) / (1000 * 60 * 60 * 24)
    )

    const refundCalc = calculateRefundAmount(
      payment.final_amount,
      enrollment.progress || 0,
      enrolledDays
    )

    if (refundCalc.refundAmount === 0) {
      return c.json(errorResponse(refundCalc.reason), 400)
    }

    // 토스페이먼츠 환불 요청
    const secretKey = c.env.TOSS_SECRET_KEY
    if (!secretKey) {
      return c.json(errorResponse('TOSS_SECRET_KEY 환경변수가 설정되지 않았습니다.'), 500)
    }
    
    const cancelResult = await cancelPayment(
      payment.payment_key,
      refund_reason || refundCalc.reason,
      refundCalc.refundAmount < payment.final_amount ? refundCalc.refundAmount : undefined,
      secretKey
    )

    // DB 업데이트
    await DB.prepare(`
      UPDATE payments 
      SET 
        status = 'refunded',
        refunded_at = datetime('now'),
        refund_amount = ?,
        refund_reason = ?
      WHERE id = ?
    `).bind(refundCalc.refundAmount, refundCalc.reason, paymentId).run()

    // 수강 권한 회수
    await DB.prepare(`
      UPDATE enrollments 
      SET status = 'refunded', is_active = 0
      WHERE payment_id = ?
    `).bind(paymentId).run()

    // TODO: 환불 완료 이메일/SMS 발송

    return c.json(successResponse({
      refundAmount: refundCalc.refundAmount,
      refundRate: refundCalc.refundRate,
      reason: refundCalc.reason
    }, '환불이 완료되었습니다.'))

  } catch (error: any) {
    console.error('환불 실패:', error)
    return c.json(errorResponse(`환불 실패: ${error.message}`), 400)
  }
})

/**
 * 웹훅 엔드포인트
 * POST /api/payments/webhook
 */
payments.post('/webhook', async (c) => {
  const webhookData = await c.req.json()
  const signature = c.req.header('toss-signature') || ''

  const { DB } = c.env

  try {
    // TODO: 웹훅 서명 검증
    // verifyWebhookSignature(JSON.stringify(webhookData), signature, secretKey)

    console.log('웹훅 수신:', webhookData)

    // 이벤트 타입에 따른 처리
    switch (webhookData.eventType) {
      case 'PAYMENT_STATUS_CHANGED':
        // 결제 상태 변경 처리
        const { orderId, status } = webhookData.data
        
        await DB.prepare(`
          UPDATE payments
          SET status = ?
          WHERE order_id = ?
        `).bind(status.toLowerCase(), orderId).run()

        break

      case 'REFUND_COMPLETED':
        // 환불 완료 처리
        // 이미 환불 API에서 처리되므로 로그만 기록
        console.log('환불 완료 웹훅:', webhookData.data)
        break

      default:
        console.log('미처리 웹훅:', webhookData.eventType)
    }

    return c.json({ success: true })

  } catch (error: any) {
    console.error('웹훅 처리 실패:', error)
    return c.json({ success: false, error: error.message }, 400)
  }
})

/**
 * 영수증/매출전표 조회
 * GET /api/payments/:id/receipt
 */
payments.get('/:id/receipt', requireAuth, async (c) => {
  const user = c.get('user')
  const paymentId = c.req.param('id')
  const { DB } = c.env

  const payment: any = await DB.prepare(`
    SELECT p.*, c.title as course_title, u.name as user_name
    FROM payments p
    JOIN courses c ON p.course_id = c.id
    JOIN users u ON p.user_id = u.id
    WHERE p.id = ? AND p.user_id = ?
  `).bind(paymentId, user.id).first()

  if (!payment) {
    return c.json(errorResponse('결제 정보를 찾을 수 없습니다.'), 404)
  }

  // 영수증 정보
  return c.json(successResponse({
    paymentId: payment.id,
    orderId: payment.order_id,
    courseName: payment.course_title,
    amount: payment.final_amount,
    paymentMethod: payment.payment_method,
    paidAt: payment.paid_at,
    receiptUrl: payment.receipt_url,
    businessInfo: BUSINESS_INFO
  }))
})

export default payments
