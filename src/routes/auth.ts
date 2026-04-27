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
  addDays,
  SQL_SESSION_EXPIRED,
  getCurrentUser,
  getSessionTokenFromRequest,
  parseSessionTokenFromCookieHeaderString,
  formatSessionExpiresAtForDb,
  SQL_SESSION_S_VALID,
} from '../utils/helpers'
import { requireAuth } from '../middleware/auth'
import { getAuthMode, isOpenGuestMode } from '../utils/auth-mode'
import { ensureActorForMeEndpoint, type AppActor } from '../utils/actor'
import { buildMeAuthDebug } from '../utils/auth-me-diagnostics'
import { getUserMs12Plan } from '../utils/ms12-plan'

const auth = new Hono<{ Bindings: Bindings }>()

/**
 * POST /api/auth/register
 * 회원가입
 */
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json<CreateUserInput>()
    const { email, password, name, phone, birth_date, terms_agreed, privacy_agreed } = body

    // 입력 검증
    if (!email || !password || !name) {
      return c.json(errorResponse('이메일, 비밀번호, 이름은 필수입니다.'), 400)
    }

    if (!terms_agreed || !privacy_agreed) {
      return c.json(errorResponse('이용약관 및 개인정보처리방침에 동의해주세요.'), 400)
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

    // 비밀번호 해시
    const hashedPassword = await hashPassword(password)

    let userId: number

    // 탈퇴한 사용자: FK 때문에 DELETE 대신 계정 복구(UPDATE)
    // 프로덕션 D1 등 일부 DB 에는 terms_* 컬럼이 없음 — 존재하는 컬럼만 갱신
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
          updated_at = datetime('now')
        WHERE id = ?
      `).bind(email, hashedPassword, name, existingUser.id).run()
      userId = existingUser.id
      await DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(userId).run()
    } else {
      const result = await DB.prepare(`
        INSERT INTO users (email, password_hash, name, role)
        VALUES (?, ?, ?, 'student')
      `).bind(email, hashedPassword, name).run()

      if (!result.success) {
        return c.json(errorResponse('회원가입에 실패했습니다.'), 500)
      }

      userId = Number(result.meta.last_row_id)
      if (!userId) {
        return c.json(errorResponse('회원가입에 실패했습니다.'), 500)
      }
    }

    await ensureListedAdminRole(DB, email, userId)

    // 자동 로그인을 위한 세션 토큰 생성
    const sessionToken = generateSessionToken()
    const expiresAt = addDays(new Date(), 30)

    // 세션 저장
    const regSession = await DB.prepare(`
      INSERT INTO sessions (user_id, session_token, expires_at)
      VALUES (?, ?, ?)
    `).bind(userId, sessionToken, formatSessionExpiresAtForDb(expiresAt)).run()
    if (!regSession.success) {
      console.error('[auth/register] sessions INSERT failed:', regSession)
      return c.json(errorResponse('세션을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.'), 500)
    }

    applySessionCookie(c, sessionToken, 30 * 24 * 60 * 60)

    const regRole = isListedAdminEmail(email) ? 'admin' : 'student'
    return c.json(successResponse({
      user: {
        id: userId,
        email,
        name,
        role: regRole
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
    let user = await DB.prepare(`
      SELECT * FROM users 
      WHERE email = ? 
      AND deleted_at IS NULL
    `).bind(email).first<User>()

    if (!user) {
      return c.json(errorResponse('이메일 또는 비밀번호가 일치하지 않습니다.'), 401)
    }

    const hash = user.password_hash
    const hasPassword = hash != null && hash !== ''

    // 소셜만 연동되고 비밀번호가 없는 계정만 이메일 로그인 차단
    if (user.social_provider && !hasPassword) {
      const providerName = user.social_provider === 'google' ? 'Google' : 
                          user.social_provider === 'kakao' ? '카카오' : user.social_provider
      return c.json(errorResponse(
        `이 계정은 ${providerName}로 가입되었습니다. "${providerName}로 계속하기" 버튼을 사용해주세요.`
      ), 400)
    }

    // 비밀번호 검증
    if (hash == null || hash === '') {
      return c.json(errorResponse('이메일 또는 비밀번호가 일치하지 않습니다.'), 401)
    }
    const isValidPassword = await verifyPassword(password, hash)
    if (!isValidPassword) {
      return c.json(errorResponse('이메일 또는 비밀번호가 일치하지 않습니다.'), 401)
    }

    await ensureListedAdminRole(DB, user.email, user.id)
    if (isListedAdminEmail(user.email)) {
      user = { ...user, role: 'admin' }
    }

    // Generate session token
    const sessionToken = generateSessionToken()
    
    // 세션 만료 시간 (30일 후)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    // 이전 세션 삭제 (만료된 세션 정리)
    await DB.prepare(`
      DELETE FROM sessions 
      WHERE user_id = ? AND ${SQL_SESSION_EXPIRED}
    `).bind(user.id).run()

    // 새 세션 저장
    const insSession = await DB.prepare(`
      INSERT INTO sessions (
        user_id, session_token, expires_at
      ) VALUES (?, ?, ?)
    `).bind(user.id, sessionToken, formatSessionExpiresAtForDb(expiresAt)).run()
    if (!insSession.success) {
      console.error('[auth/login] sessions INSERT failed:', insSession)
      return c.json(errorResponse('세션을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.'), 500)
    }

    // 비밀번호 제외한 사용자 정보 반환
    const { password_hash: _, ...userWithoutPassword } = user
    const passwordChangeRequired = (user as unknown as { password_reset_required?: number }).password_reset_required === 1

    applySessionCookie(c, sessionToken, 60 * 60 * 24 * 30)

    return c.json(successResponse({
      user: userWithoutPassword,
      expires_at: expiresAt.toISOString(),
      password_change_required: passwordChangeRequired,
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
    const sessionToken = getSessionTokenFromRequest(c)

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
 * 비로그인 시 401 대신 200 + data: null — 브라우저 콘솔에 GET /me 가 매번 빨간 실패로 찍이는 문제 완화, 의미도 "세션 없음"에 맞음.
 */
const ME_NO_STORE = { 'Cache-Control': 'private, no-store, must-revalidate' as const }

auth.get('/me', async (c) => {
  try {
    const mode = getAuthMode(c)
    let token = getSessionTokenFromRequest(c)
    if (!token) {
      const merged = [
        c.req.header('Cookie') || c.req.header('cookie') || '',
        typeof c.req.raw?.headers?.get === 'function'
          ? c.req.raw.headers.get('Cookie') || c.req.raw.headers.get('cookie') || ''
          : '',
      ]
        .map((s) => s.trim())
        .filter(Boolean)
        .join('; ')
      token = parseSessionTokenFromCookieHeaderString(merged)
    }
    if (!token) {
      const g = getCookie(c, 'session_token')
      if (g && g.trim()) token = g.trim()
    }
    const user = (await getCurrentUser(
      c,
      token ?? undefined,
    )) as Record<string, unknown> | null
    let diag = await buildMeAuthDebug(c, user, token)

    // sessions는 있는데 users와 맞지 않으면(고아 user_id, 탈퇴 등) 고착 방지: 토큰 삭제 + 쿠키 무효
    if (!user && token && c.env?.DB && diag.guestReason === 'user_not_found') {
      try {
        await c.env.DB.prepare('DELETE FROM sessions WHERE session_token = ?').bind(token).run()
        clearSessionCookie(c)
        console.warn(
          '[AUTH ME] session removed: user_not_found (orphan or invalid user_id; client must re-login)',
        )
        diag = await buildMeAuthDebug(c, null, undefined)
      } catch (e) {
        console.error('[AUTH ME] failed to remove invalid session', e)
      }
    }

    let sessionUserIdLog: string | number = 'n/a'
    if (token && c.env?.DB) {
      try {
        const sr = await c.env.DB.prepare(
          `SELECT s.user_id FROM sessions s WHERE s.session_token = ? AND ${SQL_SESSION_S_VALID}`,
        )
          .bind(token)
          .first<{ user_id: number }>()
        sessionUserIdLog = sr?.user_id ?? 'n/a'
      } catch {
        sessionUserIdLog = 'query_err'
      }
    }
    console.log(`[AUTH ME SESSION] userId=${String(sessionUserIdLog)}`)
    console.log(`[AUTH ME USER FOUND] ${user ? 'yes' : 'no'}`)

    const cookieHeader = c.req.header('Cookie') || c.req.header('cookie') || ''
    const hasSessionTokenInHeader =
      /(?:^|;\s*)session_token=/i.test(cookieHeader) ||
      /(?:^|;\s*)ms12_guest=/i.test(cookieHeader)
    const tokenPrefix = token ? token.slice(0, 8) : null

    console.log('[API_AUTH_ME]', {
      has_session_in_cookie_header: hasSessionTokenInHeader,
      session_prefix: tokenPrefix,
      sessionFound: diag.sessionFound,
      sessionExpired: diag.sessionExpired,
      userFound: diag.userFound,
      guestReason: user ? 'ok' : diag.guestReason,
    })

    // 1순위: 세션(로그인) — authMode=demo 여도 게스트로 덮지 않음
    if (user) {
      const u = user
      const { password_hash: _h, password: _p, ...userWithoutPassword } = u
      const uid = Number(u.id)
      const ms12_plan = Number.isFinite(uid) ? await getUserMs12Plan(c, uid) : 'free'
      const actor: AppActor = { type: 'user', id: String(u.id) }
      const nameVal = u.name != null ? String(u.name) : ''
      const emailVal = u.email != null ? String(u.email) : ''
      return c.json(
        {
          success: true,
          data: {
            ...userWithoutPassword,
            ms12_plan: ms12_plan,
            name: nameVal || null,
            email: emailVal || null,
          },
          authMode: mode,
          actor,
          message: undefined,
          hasCookie: diag.hasCookie,
          sessionPrefix: diag.sessionPrefix,
          sessionFound: diag.sessionFound,
          userFound: diag.userFound,
          sessionExpired: diag.sessionExpired,
          guestReason: diag.guestReason,
        },
        200,
        ME_NO_STORE
      )
    }

    // 2순위: 세션 없음 — optional/demo 등에서만 게스트 actor
    let actor: AppActor | null = null
    if (isOpenGuestMode(mode)) {
      console.log('[API_AUTH_ME] guest-fallback', {
        reason: diag.guestReason,
        hasCookie: diag.hasCookie,
        sessionPrefix: diag.sessionPrefix,
        sessionFound: diag.sessionFound,
        sessionExpired: diag.sessionExpired,
        userFound: diag.userFound,
      })
      actor = await ensureActorForMeEndpoint(c)
    }
    const guestData =
      actor && actor.type === 'guest'
        ? { type: 'guest' as const, id: String(actor.id), name: '게스트' }
        : null
    return c.json(
      {
        success: true,
        data: guestData,
        authMode: mode,
        actor,
        message: undefined,
        hasCookie: diag.hasCookie,
        sessionPrefix: diag.sessionPrefix,
        sessionFound: diag.sessionFound,
        userFound: diag.userFound,
        sessionExpired: diag.sessionExpired,
        guestReason: diag.guestReason,
      },
      200,
      ME_NO_STORE
    )
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

/**
 * GET /api/auth/debug-session-db
 * 임시: D1 `sessions`·현재 쿠키 토큰 대조(카카오/로그인 로직·쿠키 정책 미변경).
 * `MS12_DEBUG_SESSION_DB=1` (또는 true)일 때만 200, 아니면 404. 진단 후 라우트·바인딩 제거.
 */
auth.get('/debug-session-db', async (c) => {
  const on =
    c.env.MS12_DEBUG_SESSION_DB === '1' ||
    (c.env.MS12_DEBUG_SESSION_DB || '').toLowerCase() === 'true'
  if (!on) {
    return c.text('Not Found', 404)
  }
  c.header('Cache-Control', 'private, no-store')
  const token = getSessionTokenFromRequest(c)
  const hasCookie = !!token
  const hasDb = !!c.env.DB
  if (!hasDb) {
    return c.json({
      success: true,
      hasDb: false,
      sessionsTableExists: false,
      columns: [] as { name: string; type: string }[],
      recentCount: 0,
      hasCookie,
      currentSessionFound: false,
    })
  }
  const DB = c.env.DB
  let sessionsTableExists = false
  let columns: { name: string; type: string }[] = []
  let recentCount = 0
  let currentSessionFound = false
  let error: string | null = null
  try {
    const trow = await DB.prepare(
      `SELECT 1 AS x FROM sqlite_master WHERE type = 'table' AND name = 'sessions'`
    )
      .first<{ x: number }>()
    sessionsTableExists = !!trow
    if (sessionsTableExists) {
      const pragma = await DB.prepare(`PRAGMA table_info(sessions)`).all<{
        name: string
        type: string
      }>()
      for (const row of pragma.results || []) {
        if (row && (row as { name?: string }).name) {
          const r = row as { name: string; type: string }
          columns.push({ name: r.name, type: String(r.type || '') })
        }
      }
      const recent = await DB.prepare(
        `SELECT id FROM sessions ORDER BY id DESC LIMIT 5`
      ).all<{ id: number }>()
      recentCount = (recent.results || []).length
      if (hasCookie) {
        const hit = await DB.prepare(
          `SELECT 1 AS o FROM sessions WHERE session_token = ?`
        )
          .bind(token)
          .first<{ o: number }>()
        currentSessionFound = !!hit
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  }
  return c.json({
    success: !error,
    hasDb: true,
    sessionsTableExists,
    columns,
    recentCount,
    hasCookie,
    currentSessionFound,
    ...(error ? { error: error.slice(0, 500) } : {}),
  })
})

export default auth
