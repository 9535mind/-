/**
 * PortOne 결제 API — orders(pending → paid) + enrollments 수강 권한
 *
 * 환경 변수: c.env.PORTONE_IMP_KEY, c.env.PORTONE_IMP_SECRET (complete 검증)
 *            c.env.PORTONE_IMP_CODE, c.env.PORTONE_PG (프런트 public-config)
 */

import { Context, Hono } from 'hono'
import { Bindings } from '../types/database'
import { requireAuth } from '../middleware/auth'
import { successResponse, errorResponse, generateOrderId } from '../utils/helpers'
import { getIamportAccessToken, getIamportPayment } from '../utils/portone'

const portone = new Hono<{ Bindings: Bindings }>()

function getPortonePg(c: Context): string {
  return c.env.PORTONE_PG || 'html5_inicis'
}

function assertPortoneKeys(c: Context): { impKey: string; impSecret: string } {
  const impKey = c.env.PORTONE_IMP_KEY
  const impSecret = c.env.PORTONE_IMP_SECRET
  if (!impKey || !impSecret) {
    throw new Error('PORTONE_IMP_KEY, PORTONE_IMP_SECRET 환경 변수를 설정하세요.')
  }
  return { impKey, impSecret }
}

/**
 * GET /api/portone/public-config
 * IMP.init(impCode), request_pay(pg) — 비밀키 미포함
 */
portone.get('/public-config', (c) => {
  const impCode = c.env.PORTONE_IMP_CODE
  if (!impCode) {
    return c.json(errorResponse('PORTONE_IMP_CODE 가 설정되지 않았습니다.'), 503)
  }
  return c.json(
    successResponse({
      impCode,
      pg: getPortonePg(c),
    })
  )
})

/**
 * POST /api/portone/prepare
 * orders 에 pending 행 생성 후 merchant_uid 등 반환
 */
portone.post('/prepare', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const { course_id } = await c.req.json<{ course_id: number }>()
    if (!course_id || typeof course_id !== 'number') {
      return c.json(errorResponse('course_id가 필요합니다.'), 400)
    }

    const { DB } = c.env

    const course = await DB.prepare(
      `SELECT id, title, status, price, discount_price, is_free FROM courses WHERE id = ?`
    )
      .bind(course_id)
      .first<{
        id: number
        title: string
        status: string
        price: number | null
        discount_price: number | null
        is_free: number | null
      }>()

    if (!course || course.status !== 'published') {
      return c.json(errorResponse('강좌를 찾을 수 없거나 공개되지 않았습니다.'), 404)
    }

    const amount =
      course.discount_price != null && course.discount_price > 0
        ? course.discount_price
        : course.price ?? 0
    if (course.is_free === 1 || amount <= 0) {
      return c.json(errorResponse('유료 강좌만 결제할 수 있습니다.'), 400)
    }

    const paidOrder = await DB.prepare(
      `SELECT id FROM orders WHERE user_id = ? AND course_id = ? AND status = 'paid'`
    )
      .bind(user.id, course_id)
      .first()
    if (paidOrder) {
      return c.json(errorResponse('이미 결제 완료된 강좌입니다.'), 409)
    }

    const merchant_uid = `PO-${generateOrderId()}`

    const ins = await DB.prepare(
      `INSERT INTO orders (
        user_id, course_id, merchant_uid, amount, order_name, status, pg_provider
      ) VALUES (?, ?, ?, ?, ?, 'pending', 'portone')`
    )
      .bind(user.id, course_id, merchant_uid, amount, course.title)
      .run()

    if (!ins.success) {
      return c.json(errorResponse('주문 생성에 실패했습니다.'), 500)
    }

    console.info('[PORTONE_PREPARE]', {
      userId: user.id,
      courseId: course_id,
      merchant_uid,
      amount,
    })

    return c.json(
      successResponse({
        merchant_uid,
        amount,
        orderName: course.title,
        buyerName: user.name,
        buyerEmail: user.email,
        pg: getPortonePg(c),
      })
    )
  } catch (e) {
    console.error('PortOne prepare error:', e)
    const msg = e instanceof Error ? e.message : '서버 오류가 발생했습니다.'
    return c.json(errorResponse(msg), 500)
  }
})

/**
 * 결제 완료 후: 포트원 금액 검증 → orders paid → enrollments 보장
 */
async function ensureEnrollmentForPaidCourse(
  db: D1Database,
  userId: number,
  courseId: number
): Promise<void> {
  const existing = await db
    .prepare(`SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?`)
    .bind(userId, courseId)
    .first<{ id: number }>()

  if (existing) {
    return
  }

  const enrolledAt = new Date().toISOString()
  try {
    await db
      .prepare(
        `INSERT INTO enrollments (
          user_id, course_id, progress, enrolled_at, completed_at
        ) VALUES (?, ?, 0, ?, NULL)`
      )
      .bind(userId, courseId, enrolledAt)
      .run()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('UNIQUE') || msg.includes('unique')) {
      return
    }
    throw e
  }
}

/**
 * POST /api/portone/complete
 * 포트원 조회로 금액·주문번호·상태 검증 후 orders 를 paid 로, enrollments 추가
 */
portone.post('/complete', requireAuth, async (c) => {
  try {
    const { impKey, impSecret } = assertPortoneKeys(c)
    const user = c.get('user')
    const { imp_uid, merchant_uid } = await c.req.json<{
      imp_uid: string
      merchant_uid: string
    }>()

    if (!imp_uid || !merchant_uid) {
      return c.json(errorResponse('imp_uid와 merchant_uid가 필요합니다.'), 400)
    }

    const { DB } = c.env

    const order = await DB.prepare(
      `SELECT * FROM orders WHERE merchant_uid = ? AND user_id = ?`
    )
      .bind(merchant_uid, user.id)
      .first<{
        id: number
        user_id: number
        course_id: number
        merchant_uid: string
        amount: number
        order_name: string | null
        status: string
      }>()

    if (!order) {
      return c.json(errorResponse('주문 정보를 찾을 수 없습니다.'), 404)
    }

    if (order.status === 'paid') {
      return c.json(successResponse({ orderId: order.id, alreadyPaid: true }))
    }

    if (order.status !== 'pending') {
      return c.json(errorResponse('처리할 수 없는 주문 상태입니다.'), 400)
    }

    const token = await getIamportAccessToken(impKey, impSecret)
    const pg = await getIamportPayment(imp_uid, token)

    if (pg.merchant_uid !== merchant_uid) {
      return c.json(errorResponse('주문번호가 일치하지 않습니다.'), 400)
    }
    if (typeof pg.amount !== 'number' || pg.amount !== order.amount) {
      return c.json(errorResponse('결제 금액이 일치하지 않습니다.'), 400)
    }
    if (pg.status !== 'paid') {
      return c.json(errorResponse('결제가 완료되지 않았습니다.'), 400)
    }

    const rawJson = JSON.stringify(pg).slice(0, 8000)

    await DB.prepare(
      `UPDATE orders SET
        status = 'paid',
        imp_uid = ?,
        paid_at = datetime('now'),
        raw_response = ?,
        updated_at = datetime('now')
      WHERE id = ?`
    )
      .bind(imp_uid, rawJson, order.id)
      .run()

    await ensureEnrollmentForPaidCourse(DB, user.id, order.course_id)

    console.info('[PORTONE_COMPLETE]', {
      userId: user.id,
      orderId: order.id,
      merchant_uid,
      imp_uid,
      amount: order.amount,
    })

    return c.json(
      successResponse(
        {
          orderId: order.id,
          impUid: imp_uid,
          merchantUid: merchant_uid,
        },
        '결제가 완료되었습니다.'
      )
    )
  } catch (e) {
    console.error('PortOne complete error:', e)
    const msg = e instanceof Error ? e.message : '서버 오류가 발생했습니다.'
    return c.json(errorResponse(msg), 500)
  }
})

export default portone
