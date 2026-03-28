/**
 * 인증 관련 API 라우트
 * /api/auth/*
 */

import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { Bindings, CreateUserInput, User } from '../types/database'
import { applySessionCookie, clearSessionCookie } from '../utils/session-cookie'
import { 
  successResponse, 
  errorResponse, 
  hashPassword, 
  verifyPassword,
  generateSessionToken,
  isValidEmail,
  formatDate,
  addDays
} from '../utils/helpers'
import { requireAuth } from '../middleware/auth'

const auth = new Hono<{ Bindings: Bindings }>()

/**
 * POST /api/auth/register
 * 회원가입
 */
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json<CreateUserInput>()
    const { email, password, name, phone, birth_date, terms_agreed, privacy_agreed, marketing_agreed } = body

    // 입력 검증
    if (!email || !password || !name) {
      return c.json(errorResponse('이메일, 비밀번호, 이름은 필수입니다.'), 400)
    }

    if (!terms_agreed || !privacy_agreed) {
      return c.json(errorResponse('이용약관 및 개인정보처리방침에 동의해주세요.'), 400)
    }

    const ta = 1
    const pa = 1
    const ma = marketing_agreed ? 1 : 0

    if (!isValidEmail(email)) {
      return c.json(errorResponse('올바른 이메일 형식이 아닙니다.'), 400)
    }

    if (password.length < 6) {
      return c.json(errorResponse('비밀번호는 6자 이상이어야 합니다.'), 400)
    }

    // Terms agreement check removed - using simple schema

    const { DB } = c.env

    // 이메일 중복 체크 (탈퇴한 사용자는 재가입 가능)
    const existingUser = await DB.prepare(`
      SELECT id, deleted_at FROM users WHERE email = ?
    `).bind(email).first<{ id: number; deleted_at: string | null }>()

    if (existingUser && !existingUser.deleted_at) {
      return c.json(errorResponse('이미 사용 중인 이메일입니다.'), 409)
    }

    // 비밀번호 해시
    const hashedPassword = await hashPassword(password)

    let userId: number

    // 탈퇴한 사용자: FK 때문에 DELETE 대신 계정 복구(UPDATE)
    if (existingUser && existingUser.deleted_at) {
      await DB.prepare(`
        UPDATE users SET
          deleted_at = NULL,
          deletion_reason = NULL,
          email = ?,
          password_hash = ?,
          name = ?,
          role = 'student',
          social_provider = NULL,
          social_id = NULL,
          profile_image_url = NULL,
          terms_agreed = ?,
          privacy_agreed = ?,
          marketing_agreed = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).bind(email, hashedPassword, name, ta, pa, ma, existingUser.id).run()
      userId = existingUser.id
      await DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(userId).run()
    } else {
      const result = await DB.prepare(`
        INSERT INTO users (email, password_hash, name, role, terms_agreed, privacy_agreed, marketing_agreed)
        VALUES (?, ?, ?, 'student', ?, ?, ?)
      `).bind(email, hashedPassword, name, ta, pa, ma).run()

      if (!result.success) {
        return c.json(errorResponse('회원가입에 실패했습니다.'), 500)
      }

      userId = Number(result.meta.last_row_id)
      if (!userId) {
        return c.json(errorResponse('회원가입에 실패했습니다.'), 500)
      }
    }

    // 자동 로그인을 위한 세션 토큰 생성
    const sessionToken = generateSessionToken()
    const expiresAt = addDays(new Date(), 30)

    // 세션 저장
    await DB.prepare(`
      INSERT INTO sessions (user_id, session_token, expires_at)
      VALUES (?, ?, ?)
    `).bind(userId, sessionToken, expiresAt.toISOString()).run()

    applySessionCookie(c, sessionToken, 30 * 24 * 60 * 60)

    return c.json(successResponse({
      user: {
        id: userId,
        email,
        name,
        role: 'student'
      },
      expires_at: expiresAt.toISOString(),
      password_change_required: false
    }, '회원가입이 완료되었습니다. 자동 로그인되었습니다.'), 201)

  } catch (error) {
    console.error('Register error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

/**
 * POST /api/auth/login
 * 로그인
 */
auth.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json<{ email: string; password: string }>()

    // 입력 검증
    if (!email || !password) {
      return c.json(errorResponse('이메일과 비밀번호를 입력해주세요.'), 400)
    }

    const { DB } = c.env

    // 사용자 조회 (simplified for basic schema)
    const user = await DB.prepare(`
      SELECT * FROM users 
      WHERE email = ? 
      AND deleted_at IS NULL
    `).bind(email).first<User>()

    if (!user) {
      return c.json(errorResponse('이메일 또는 비밀번호가 일치하지 않습니다.'), 401)
    }

    // 소셜 로그인 사용자 확인
    if (user.social_provider) {
      const providerName = user.social_provider === 'google' ? 'Google' : 
                          user.social_provider === 'kakao' ? '카카오' : user.social_provider
      return c.json(errorResponse(
        `이 계정은 ${providerName}로 가입되었습니다. "${providerName}로 계속하기" 버튼을 사용해주세요.`
      ), 400)
    }

    // 비밀번호 검증 (소셜 전용 계정은 위에서 차단됨)
    const hash = user.password_hash
    if (hash == null || hash === '') {
      return c.json(errorResponse('이메일 또는 비밀번호가 일치하지 않습니다.'), 401)
    }
    const isValidPassword = await verifyPassword(password, hash)
    if (!isValidPassword) {
      return c.json(errorResponse('이메일 또는 비밀번호가 일치하지 않습니다.'), 401)
    }

    // Generate session token
    const sessionToken = generateSessionToken()
    
    // 세션 만료 시간 (30일 후)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    // 이전 세션 삭제 (만료된 세션 정리)
    await DB.prepare(`
      DELETE FROM sessions 
      WHERE user_id = ? AND expires_at < datetime('now')
    `).bind(user.id).run()

    // 새 세션 저장
    await DB.prepare(`
      INSERT INTO sessions (
        user_id, session_token, expires_at
      ) VALUES (?, ?, ?)
    `).bind(user.id, sessionToken, expiresAt.toISOString()).run()

    // 비밀번호 제외한 사용자 정보 반환
    const { password_hash: _, ...userWithoutPassword } = user
    const passwordChangeRequired = (user as unknown as { password_reset_required?: number }).password_reset_required === 1

    applySessionCookie(c, sessionToken, 60 * 60 * 24 * 30)

    return c.json(successResponse({
      user: userWithoutPassword,
      expires_at: expiresAt.toISOString(),
      password_change_required: passwordChangeRequired
    }, '로그인되었습니다.'))

  } catch (error) {
    console.error('Login error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

/**
 * POST /api/auth/logout
 * 로그아웃
 */
auth.post('/logout', requireAuth, async (c) => {
  try {
    const user = c.get('user') as { id: number }
    // Hono 내장 쿠키 파서 우선 사용 (Workers 환경)
    let sessionToken = getCookie(c, 'session_token') || null
    // 호환 fallback: Cookie 헤더 직접 파싱
    if (!sessionToken) {
      const cookieHeader = c.req.header('Cookie')
      const match = cookieHeader?.match(/(?:^|;\s*)session_token=([^;]+)/)
      sessionToken = match?.[1] || null
    }
    if (sessionToken) {
      try {
        sessionToken = decodeURIComponent(sessionToken)
      } catch {
        /* ignore malformed encoding */
      }
    }

    const { DB } = c.env

    // 세션 삭제 (토큰이 없어도 현재 사용자 세션 전체 정리)
    if (sessionToken) {
      await DB.prepare(`
        DELETE FROM sessions 
        WHERE session_token = ?
      `).bind(sessionToken).run()
    }
    await DB.prepare(`
      DELETE FROM sessions
      WHERE user_id = ?
    `).bind(user.id).run()

    clearSessionCookie(c)

    return c.json(successResponse(null, '로그아웃되었습니다.'))

  } catch (error) {
    console.error('Logout error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

/**
 * GET /api/auth/me
 * 현재 로그인한 사용자 정보 조회
 */
auth.get('/me', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const u = user as Record<string, unknown>
    const { password_hash: _h, password: _p, ...userWithoutPassword } = u

    return c.json(successResponse(userWithoutPassword))

  } catch (error) {
    console.error('Get user error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

/**
 * PUT /api/auth/profile
 * 프로필 수정
 */
auth.put('/profile', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const { name, phone, birth_date, marketing_agreed } = await c.req.json<{
      name?: string
      phone?: string
      birth_date?: string
      marketing_agreed?: boolean
    }>()

    const { DB } = c.env

    // 업데이트할 필드만 쿼리에 포함
    const updates: string[] = []
    const values: any[] = []

    if (name) {
      updates.push('name = ?')
      values.push(name)
    }
    if (phone !== undefined) {
      updates.push('phone = ?')
      values.push(phone || null)
    }
    if (birth_date !== undefined) {
      updates.push('birth_date = ?')
      values.push(birth_date || null)
    }
    if (marketing_agreed !== undefined) {
      updates.push('marketing_agreed = ?')
      values.push(marketing_agreed ? 1 : 0)
    }

    if (updates.length === 0) {
      return c.json(errorResponse('수정할 내용이 없습니다.'), 400)
    }

    updates.push('updated_at = datetime(\'now\')')
    values.push(user.id)

    await DB.prepare(`
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...values).run()

    return c.json(successResponse(null, '프로필이 수정되었습니다.'))

  } catch (error) {
    console.error('Update profile error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

/**
 * GET /api/auth/check-withdrawal
 * 회원 탈퇴 가능 여부 확인
 */
auth.get('/check-withdrawal', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const { DB } = c.env

    // 1. 진행 중인 수강 확인
    const activeEnrollment = await DB.prepare(`
      SELECT COUNT(*) as count 
      FROM enrollments 
      WHERE user_id = ? AND status = 'active'
    `).bind(user.id).first<{ count: number }>()

    if (activeEnrollment && activeEnrollment.count > 0) {
      return c.json(successResponse({
        can_withdraw: false,
        reason: '진행 중인 수강이 있어 탈퇴할 수 없습니다. 수강을 완료하거나 환불 후 탈퇴해주세요.'
      }))
    }

    // 2. 결제 내역 확인
    const pendingPayment = await DB.prepare(`
      SELECT COUNT(*) as count 
      FROM payments 
      WHERE user_id = ? AND status IN ('pending', 'completed')
    `).bind(user.id).first<{ count: number }>()

    if (pendingPayment && pendingPayment.count > 0) {
      return c.json(successResponse({
        can_withdraw: false,
        reason: '처리 중이거나 완료된 결제 내역이 있어 탈퇴할 수 없습니다. 고객센터로 문의해주세요.'
      }))
    }

    return c.json(successResponse({
      can_withdraw: true,
      reason: null
    }))

  } catch (error) {
    console.error('Check withdrawal error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

/**
 * POST /api/auth/change-password
 * 비밀번호 변경
 */
auth.post('/change-password', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const { current_password, new_password } = await c.req.json<{
      current_password: string
      new_password: string
    }>()

    if (!current_password || !new_password) {
      return c.json(errorResponse('현재 비밀번호와 새 비밀번호를 입력해주세요.'), 400)
    }

    if (new_password.length < 6) {
      return c.json(errorResponse('새 비밀번호는 6자 이상이어야 합니다.'), 400)
    }

    const { DB } = c.env

    const row = await DB.prepare(`
      SELECT password_hash, social_provider FROM users
      WHERE id = ? AND deleted_at IS NULL
    `).bind(user.id).first<{ password_hash: string | null; social_provider: string | null }>()

    if (!row) {
      return c.json(errorResponse('사용자를 찾을 수 없습니다.'), 404)
    }

    if (row.social_provider) {
      return c.json(errorResponse('소셜 로그인 사용자는 비밀번호를 변경할 수 없습니다.'), 400)
    }

    const isValidPassword = await verifyPassword(
      current_password,
      row.password_hash ?? ''
    )
    if (!isValidPassword) {
      return c.json(errorResponse('현재 비밀번호가 일치하지 않습니다.'), 401)
    }

    const hashedPassword = await hashPassword(new_password)

    try {
      await DB.prepare(`
        UPDATE users 
        SET password_hash = ?,
            password_reset_required = 0,
            updated_at = datetime('now')
        WHERE id = ?
      `).bind(hashedPassword, user.id).run()
    } catch {
      // 마이그레이션 적용 전 호환성
      await DB.prepare(`
        UPDATE users 
        SET password_hash = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).bind(hashedPassword, user.id).run()
    }

    return c.json(successResponse(null, '비밀번호가 변경되었습니다.'))

  } catch (error) {
    console.error('Change password error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

/**
 * POST /api/auth/withdrawal
 * 회원 탈퇴 (C안: 사유 선택 방식)
 * - 수강 중인 강의 있으면 차단
 * - 결제 내역 남아있으면 차단
 * - 탈퇴 사유 필수 입력
 * - 소프트 삭제 (30일 보관)
 */
auth.post('/withdrawal', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const { reason, reason_detail } = await c.req.json<{ 
      reason: string
      reason_detail?: string 
    }>()

    // 탈퇴 사유 검증
    const validReasons = [
      '사용하지 않는 서비스입니다',
      '원하는 강의가 없습니다',
      '다른 학습 플랫폼을 사용합니다',
      '개인정보 보호를 위해',
      '기타'
    ]
    
    if (!reason || !validReasons.includes(reason)) {
      return c.json(errorResponse('탈퇴 사유를 선택해주세요.'), 400)
    }

    // 기타 선택 시 상세 사유 필수
    if (reason === '기타' && !reason_detail) {
      return c.json(errorResponse('기타 사유를 입력해주세요.'), 400)
    }

    const { DB } = c.env

    // 1. 진행 중인 수강이 있는지 확인
    const activeEnrollment = await DB.prepare(`
      SELECT COUNT(*) as count 
      FROM enrollments 
      WHERE user_id = ? AND status = 'active'
    `).bind(user.id).first<{ count: number }>()

    if (activeEnrollment && activeEnrollment.count > 0) {
      return c.json(errorResponse('진행 중인 수강이 있어 탈퇴할 수 없습니다. 수강을 완료하거나 환불 후 탈퇴해주세요.'), 400)
    }

    // 2. 결제 내역이 남아있는지 확인 (환불되지 않은 결제)
    const pendingPayment = await DB.prepare(`
      SELECT COUNT(*) as count 
      FROM payments 
      WHERE user_id = ? AND status IN ('pending', 'completed')
    `).bind(user.id).first<{ count: number }>()

    if (pendingPayment && pendingPayment.count > 0) {
      return c.json(errorResponse('처리 중이거나 완료된 결제 내역이 있어 탈퇴할 수 없습니다. 고객센터로 문의해주세요.'), 400)
    }

    // 3. 소프트 삭제 (deleted_at 기록)
    const deletionReason = reason === '기타' ? `${reason}: ${reason_detail}` : reason
    
    await DB.prepare(`
      UPDATE users 
      SET deleted_at = datetime('now'),
          deletion_reason = ?,
          status = 'withdrawn',
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(deletionReason, user.id).run()

    // 4. 모든 세션 비활성화 (즉시 로그아웃)
    await DB.prepare(`
      UPDATE user_sessions 
      SET is_active = 0 
      WHERE user_id = ?
    `).bind(user.id).run()

    return c.json(successResponse(null, '회원 탈퇴가 완료되었습니다. 30일 후 모든 데이터가 완전히 삭제됩니다. 그동안 고객센터에 문의하시면 복구 가능합니다.'))

  } catch (error) {
    console.error('Withdrawal error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

/**
 * POST /api/auth/verify-phone
 * 휴대폰 본인인증 (구조만 - API 연동은 추후)
 */
auth.post('/verify-phone', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const { phone, verification_code } = await c.req.json<{
      phone: string
      verification_code: string
    }>()

    // 인증코드 검증은 /api/auth/phone/confirm 로 분리되었고,
    // 이 엔드포인트는 로그인 사용자 프로필에 반영만 한다.
    
    const { DB } = c.env

    await DB.prepare(`
      UPDATE users 
      SET phone = ?,
          phone_verified = 1,
          phone_verified_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(phone, user.id).run()

    return c.json(successResponse(null, '휴대폰 본인인증이 완료되었습니다.'))

  } catch (error) {
    console.error('Phone verification error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

/**
 * POST /api/auth/phone/request
 * 회원가입(전화번호) 인증코드 발송 (외부 SMS 연동 전: 서버 로그에만 기록)
 */
auth.post('/phone/request', async (c) => {
  try {
    const { phone } = await c.req.json<{ phone: string }>()
    if (!phone || typeof phone !== 'string') {
      return c.json(errorResponse('전화번호가 필요합니다.'), 400)
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000).toISOString() // 3분
    const { DB } = c.env

    // 기존 미검증 코드 정리
    await DB.prepare(`
      DELETE FROM phone_verification_codes
      WHERE phone = ? AND purpose = 'register' AND is_verified = 0
    `).bind(phone).run()

    await DB.prepare(`
      INSERT INTO phone_verification_codes (phone, code, purpose, expires_at)
      VALUES (?, ?, 'register', ?)
    `).bind(phone, code, expiresAt).run()

    // 실제 SMS 연동 전까지는 서버 로그로 확인
    console.log(`[phone/request] code issued phone=${phone} code=${code} expiresAt=${expiresAt}`)

    return c.json(successResponse({ expires_at: expiresAt }, '인증번호가 발송되었습니다.'))
  } catch (error) {
    console.error('Phone request error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

/**
 * POST /api/auth/phone/confirm
 * 회원가입(전화번호) 인증코드 확인
 */
auth.post('/phone/confirm', async (c) => {
  try {
    const { phone, code } = await c.req.json<{ phone: string; code: string }>()
    if (!phone || !code) {
      return c.json(errorResponse('전화번호와 인증번호가 필요합니다.'), 400)
    }
    const { DB } = c.env

    const row = await DB.prepare(`
      SELECT id, expires_at, is_verified
      FROM phone_verification_codes
      WHERE phone = ? AND purpose = 'register' AND code = ?
      ORDER BY id DESC
      LIMIT 1
    `).bind(phone, code).first<{ id: number; expires_at: string; is_verified: number }>()

    if (!row) {
      return c.json(errorResponse('인증번호가 일치하지 않습니다.'), 400)
    }
    if (row.is_verified === 1) {
      return c.json(successResponse(null, '이미 인증 완료되었습니다.'))
    }
    // 만료 확인
    const expiresMs = Date.parse(row.expires_at)
    if (!Number.isFinite(expiresMs) || expiresMs < Date.now()) {
      return c.json(errorResponse('인증 시간이 만료되었습니다. 다시 요청해주세요.'), 400)
    }

    await DB.prepare(`
      UPDATE phone_verification_codes
      SET is_verified = 1, verified_at = datetime('now')
      WHERE id = ?
    `).bind(row.id).run()

    return c.json(successResponse(null, '휴대폰 인증이 완료되었습니다.'))
  } catch (error) {
    console.error('Phone confirm error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

export default auth
