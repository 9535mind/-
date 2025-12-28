/**
 * Google 소셜 로그인 API
 * /api/auth/google/*
 */

import { Hono } from 'hono'
import { Bindings, User } from '../types/database'
import { 
  successResponse, 
  errorResponse, 
  generateSessionToken,
  addDays
} from '../utils/helpers'

const authGoogle = new Hono<{ Bindings: Bindings }>()

/**
 * GET /api/auth/google/login
 * Google 로그인 시작 (Google 인증 페이지로 리다이렉트)
 */
authGoogle.get('/login', async (c) => {
  try {
    // 환경 변수에서 Google 설정 읽기
    const clientId = c.env.GOOGLE_CLIENT_ID || 'your_google_client_id'
    const redirectUri = c.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
    
    // Google 인증 URL 생성
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    googleAuthUrl.searchParams.set('client_id', clientId)
    googleAuthUrl.searchParams.set('redirect_uri', redirectUri)
    googleAuthUrl.searchParams.set('response_type', 'code')
    googleAuthUrl.searchParams.set('scope', 'openid email profile')
    googleAuthUrl.searchParams.set('access_type', 'online')
    
    // Google 로그인 페이지로 리다이렉트
    return c.redirect(googleAuthUrl.toString())
    
  } catch (error) {
    console.error('Google login start error:', error)
    return c.json(errorResponse('Google 로그인 시작에 실패했습니다.'), 500)
  }
})

/**
 * GET /api/auth/google/callback
 * Google 로그인 콜백 처리
 */
authGoogle.get('/callback', async (c) => {
  try {
    const code = c.req.query('code')
    
    if (!code) {
      return c.json(errorResponse('인증 코드가 없습니다.'), 400)
    }
    
    const clientId = c.env.GOOGLE_CLIENT_ID || 'your_google_client_id'
    const clientSecret = c.env.GOOGLE_CLIENT_SECRET || 'your_google_client_secret'
    const redirectUri = c.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
    
    // 1. 액세스 토큰 요청
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    })
    
    if (!tokenResponse.ok) {
      throw new Error('Failed to get access token')
    }
    
    const tokenData = await tokenResponse.json<{
      access_token: string
      id_token: string
      expires_in: number
    }>()
    
    // 2. 사용자 정보 요청
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    })
    
    if (!userResponse.ok) {
      throw new Error('Failed to get user info')
    }
    
    const googleUser = await userResponse.json<{
      id: string
      email: string
      name: string
      picture?: string
      verified_email: boolean
    }>()
    
    const { DB } = c.env
    
    // 3. 기존 사용자 확인
    const existingUser = await DB.prepare(`
      SELECT * FROM users WHERE social_provider = 'google' AND social_id = ?
    `).bind(googleUser.id).first<User>()
    
    let userId: number
    let user: User
    
    if (existingUser) {
      // 기존 사용자 - 로그인 처리
      userId = existingUser.id
      user = existingUser
      
      // 프로필 업데이트 (이름, 이미지 변경 가능성)
      await DB.prepare(`
        UPDATE users 
        SET name = ?,
            profile_image_url = ?,
            last_login_at = datetime('now'),
            updated_at = datetime('now')
        WHERE id = ?
      `).bind(
        googleUser.name,
        googleUser.picture || null,
        userId
      ).run()
      
    } else {
      // 신규 사용자 - 회원가입 처리
      const email = googleUser.email
      
      // 이메일 중복 체크
      const emailCheck = await DB.prepare(`
        SELECT id FROM users WHERE email = ?
      `).bind(email).first()
      
      if (emailCheck) {
        // 이메일은 있지만 Google 연동 안 됨
        return c.html(`
          <html>
            <head>
              <script>
                alert('이미 가입된 이메일입니다. 기존 계정으로 로그인해주세요.');
                window.location.href = '/login';
              </script>
            </head>
          </html>
        `)
      }
      
      // 신규 회원 가입 (password는 랜덤 생성, 소셜 로그인에서는 사용 안 함)
      const randomPassword = Math.random().toString(36).substring(2, 15)
      
      const result = await DB.prepare(`
        INSERT INTO users (
          email, password, name, social_provider, social_id, profile_image_url,
          role, status, terms_agreed, privacy_agreed, marketing_agreed
        ) VALUES (?, ?, ?, 'google', ?, ?, 'student', 'active', 1, 1, 0)
      `).bind(
        email,
        randomPassword, // 소셜 로그인에서는 사용하지 않는 비밀번호
        googleUser.name,
        googleUser.id,
        googleUser.picture || null
      ).run()
      
      userId = result.meta.last_row_id as number
      
      // 생성된 사용자 정보 조회
      const newUser = await DB.prepare(`
        SELECT * FROM users WHERE id = ?
      `).bind(userId).first<User>()
      
      if (!newUser) {
        throw new Error('Failed to create user')
      }
      
      user = newUser
    }
    
    // 4. 기존 활성 세션 비활성화
    await DB.prepare(`
      UPDATE user_sessions 
      SET is_active = 0 
      WHERE user_id = ? AND is_active = 1
    `).bind(userId).run()
    
    // 5. 새 세션 생성
    const sessionToken = generateSessionToken()
    const expiresAt = addDays(new Date(), 7)
    
    await DB.prepare(`
      INSERT INTO user_sessions (
        user_id, session_token, expires_at, is_active
      ) VALUES (?, ?, ?, 1)
    `).bind(userId, sessionToken, expiresAt.toISOString()).run()
    
    // 6. 로그인 시간 업데이트
    await DB.prepare(`
      UPDATE users 
      SET last_login_at = datetime('now')
      WHERE id = ?
    `).bind(userId).run()
    
    // 7. 메인 페이지로 리다이렉트 (세션 토큰 포함)
    return c.html(`
      <html>
        <head>
          <title>로그인 중...</title>
        </head>
        <body>
          <script>
            // 세션 토큰 저장
            localStorage.setItem('session_token', '${sessionToken}');
            
            // 메인 페이지로 이동
            alert('Google 로그인 성공! 환영합니다, ${user.name}님!');
            window.location.href = '/';
          </script>
        </body>
      </html>
    `)
    
  } catch (error) {
    console.error('Google callback error:', error)
    return c.html(`
      <html>
        <head>
          <title>로그인 실패</title>
        </head>
        <body>
          <script>
            alert('Google 로그인에 실패했습니다. 다시 시도해주세요.');
            window.location.href = '/login';
          </script>
        </body>
      </html>
    `)
  }
})

export default authGoogle
