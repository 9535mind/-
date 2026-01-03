/**
 * 인증 관련 API 라우트
 * /api/auth/*
 */

import { Hono } from 'hono'
import { setCookie } from 'hono/cookie'
import { Bindings, CreateUserInput, User } from '../types/database'
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

    // 탈퇴한 사용자가 재가입하는 경우
    if (existingUser && existingUser.deleted_at) {
      // 기존 데이터 완전 삭제 후 신규 가입 처리
      await DB.prepare(`
        DELETE FROM users WHERE id = ?
      `).bind(existingUser.id).run()
    }

    // 비밀번호 해시
    const hashedPassword = await hashPassword(password)

    // 사용자 생성 (simplified for basic schema)
    const result = await DB.prepare(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (?, ?, ?, 'student')
    `).bind(email, hashedPassword, name).run()

    if (!result.success) {
      return c.json(errorResponse('회원가입에 실패했습니다.'), 500)
    }

    return c.json(successResponse({
      id: result.meta.last_row_id,
      email,
      name
    }, '회원가입이 완료되었습니다.'), 201)

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

    // 비밀번호 검증
    const isValidPassword = await verifyPassword(password, user.password_hash)
    if (!isValidPassword) {
      return c.json(errorResponse('이메일 또는 비밀번호가 일치하지 않습니다.'), 401)
    }

    // Generate session token
    const sessionToken = generateSessionToken()
    
    // 세션 만료 시간 (30일 후)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    // 이전 세션 비활성화
    await DB.prepare(`
      UPDATE user_sessions 
      SET is_active = 0 
      WHERE user_id = ?
    `).bind(user.id).run()

    // 새 세션 저장
    await DB.prepare(`
      INSERT INTO user_sessions (
        user_id, session_token, is_active, expires_at, 
        last_activity_at, created_at
      ) VALUES (?, ?, 1, ?, datetime('now'), datetime('now'))
    `).bind(user.id, sessionToken, expiresAt.toISOString()).run()

    // 비밀번호 제외한 사용자 정보 반환
    const { password_hash: _, ...userWithoutPassword } = user

    // 🍪 Cookie 설정 (Hono setCookie 사용)
    setCookie(c, 'session_token', sessionToken, {
      path: '/',
      httpOnly: true,   // JavaScript에서 접근 불가 (보안)
      secure: true,     // HTTPS에서만 전송
      sameSite: 'Lax',  // CSRF 방어
      maxAge: 60 * 60 * 24 * 30  // 30일 유지
    })

    return c.json(successResponse({
      user: userWithoutPassword,
      session_token: sessionToken,  // 클라이언트 호환성 유지
      expires_at: expiresAt.toISOString()
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
    const sessionToken = c.req.header('Authorization')?.replace('Bearer ', '') || 
                         c.req.cookie('session_token')

    if (!sessionToken) {
      return c.json(errorResponse('세션이 없습니다.'), 400)
    }

    const { DB } = c.env

    // 세션 비활성화
    await DB.prepare(`
      UPDATE user_sessions 
      SET is_active = 0 
      WHERE session_token = ?
    `).bind(sessionToken).run()

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

    // 비밀번호 제외
    const { password, ...userWithoutPassword } = user

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

    // 소셜 로그인 사용자는 비밀번호 변경 불가
    if (user.social_provider) {
      return c.json(errorResponse('소셜 로그인 사용자는 비밀번호를 변경할 수 없습니다.'), 400)
    }

    // 현재 비밀번호 검증
    const isValidPassword = await verifyPassword(current_password, user.password)
    if (!isValidPassword) {
      return c.json(errorResponse('현재 비밀번호가 일치하지 않습니다.'), 401)
    }

    const { DB } = c.env

    // 새 비밀번호 해시
    const hashedPassword = await hashPassword(new_password)

    // 비밀번호 업데이트
    await DB.prepare(`
      UPDATE users 
      SET password = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(hashedPassword, user.id).run()

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

    // TODO: 실제 본인인증 API 연동
    // 현재는 임시로 성공 처리
    
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

export default auth
