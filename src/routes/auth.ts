/**
 * 인증 관련 API 라우트
 * /api/auth/*
 */

import { Hono } from 'hono'
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

    if (!terms_agreed || !privacy_agreed) {
      return c.json(errorResponse('이용약관과 개인정보처리방침에 동의해야 합니다.'), 400)
    }

    const { DB } = c.env

    // 이메일 중복 체크
    const existingUser = await DB.prepare(`
      SELECT id FROM users WHERE email = ?
    `).bind(email).first()

    if (existingUser) {
      return c.json(errorResponse('이미 사용 중인 이메일입니다.'), 409)
    }

    // 비밀번호 해시
    const hashedPassword = await hashPassword(password)

    // 사용자 생성
    const result = await DB.prepare(`
      INSERT INTO users (
        email, password, name, phone, birth_date, 
        role, status, terms_agreed, privacy_agreed, marketing_agreed
      ) VALUES (?, ?, ?, ?, ?, 'student', 'active', ?, ?, ?)
    `).bind(
      email,
      hashedPassword,
      name,
      phone || null,
      birth_date || null,
      terms_agreed ? 1 : 0,
      privacy_agreed ? 1 : 0,
      marketing_agreed ? 1 : 0
    ).run()

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

    // 사용자 조회
    const user = await DB.prepare(`
      SELECT * FROM users WHERE email = ? AND status = 'active'
    `).bind(email).first<User>()

    if (!user) {
      return c.json(errorResponse('이메일 또는 비밀번호가 일치하지 않습니다.'), 401)
    }

    // 비밀번호 검증
    const isValidPassword = await verifyPassword(password, user.password)
    if (!isValidPassword) {
      return c.json(errorResponse('이메일 또는 비밀번호가 일치하지 않습니다.'), 401)
    }

    // 기존 활성 세션 비활성화 (동시 접속 차단)
    await DB.prepare(`
      UPDATE user_sessions 
      SET is_active = 0 
      WHERE user_id = ? AND is_active = 1
    `).bind(user.id).run()

    // 새 세션 생성
    const sessionToken = generateSessionToken()
    const expiresAt = addDays(new Date(), 7) // 7일 후 만료

    await DB.prepare(`
      INSERT INTO user_sessions (
        user_id, session_token, expires_at, is_active
      ) VALUES (?, ?, ?, 1)
    `).bind(user.id, sessionToken, expiresAt.toISOString()).run()

    // 마지막 로그인 시간 업데이트
    await DB.prepare(`
      UPDATE users 
      SET last_login_at = datetime('now')
      WHERE id = ?
    `).bind(user.id).run()

    // 비밀번호 제외한 사용자 정보 반환
    const { password: _, ...userWithoutPassword } = user

    return c.json(successResponse({
      user: userWithoutPassword,
      session_token: sessionToken,
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
 * POST /api/auth/withdrawal
 * 회원 탈퇴
 */
auth.post('/withdrawal', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const { password } = await c.req.json<{ password: string }>()

    if (!password) {
      return c.json(errorResponse('비밀번호를 입력해주세요.'), 400)
    }

    const { DB } = c.env

    // 비밀번호 검증
    const isValidPassword = await verifyPassword(password, user.password)
    if (!isValidPassword) {
      return c.json(errorResponse('비밀번호가 일치하지 않습니다.'), 401)
    }

    // 진행 중인 수강이 있는지 확인
    const activeEnrollment = await DB.prepare(`
      SELECT COUNT(*) as count 
      FROM enrollments 
      WHERE user_id = ? AND status = 'active'
    `).bind(user.id).first<{ count: number }>()

    if (activeEnrollment && activeEnrollment.count > 0) {
      return c.json(errorResponse('진행 중인 수강이 있어 탈퇴할 수 없습니다. 환불 후 탈퇴해주세요.'), 400)
    }

    // 회원 상태를 탈퇴로 변경
    await DB.prepare(`
      UPDATE users 
      SET status = 'withdrawn', 
          withdrawn_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(user.id).run()

    // 모든 세션 비활성화
    await DB.prepare(`
      UPDATE user_sessions 
      SET is_active = 0 
      WHERE user_id = ?
    `).bind(user.id).run()

    return c.json(successResponse(null, '회원 탈퇴가 완료되었습니다.'))

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
