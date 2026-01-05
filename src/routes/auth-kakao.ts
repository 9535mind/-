/**
 * 카카오 소셜 로그인 API
 * /api/auth/kakao/*
 */

import { Hono } from 'hono'
import { Bindings, User } from '../types/database'
import { 
  successResponse, 
  errorResponse, 
  generateSessionToken,
  addDays
} from '../utils/helpers'

const authKakao = new Hono<{ Bindings: Bindings }>()

/**
 * GET /api/auth/kakao/login
 * 카카오 로그인 시작 (카카오 인증 페이지로 리다이렉트)
 */
authKakao.get('/login', async (c) => {
  try {
    // 환경 변수에서 카카오 설정 읽기
    const clientId = c.env.KAKAO_CLIENT_ID || 'your_kakao_rest_api_key'
    const redirectUri = c.env.KAKAO_REDIRECT_URI || 'http://localhost:3000/api/auth/kakao/callback'
    
    // 카카오 인증 URL 생성
    const kakaoAuthUrl = new URL('https://kauth.kakao.com/oauth/authorize')
    kakaoAuthUrl.searchParams.set('client_id', clientId)
    kakaoAuthUrl.searchParams.set('redirect_uri', redirectUri)
    kakaoAuthUrl.searchParams.set('response_type', 'code')
    
    // 카카오 로그인 페이지로 리다이렉트
    return c.redirect(kakaoAuthUrl.toString())
    
  } catch (error) {
    console.error('Kakao login start error:', error)
    return c.json(errorResponse('카카오 로그인 시작에 실패했습니다.'), 500)
  }
})

/**
 * GET /api/auth/kakao/callback
 * 카카오 로그인 콜백 처리
 */
authKakao.get('/callback', async (c) => {
  try {
    const code = c.req.query('code')
    
    if (!code) {
      return c.json(errorResponse('인증 코드가 없습니다.'), 400)
    }
    
    const clientId = c.env.KAKAO_CLIENT_ID || 'your_kakao_rest_api_key'
    const redirectUri = c.env.KAKAO_REDIRECT_URI || 'http://localhost:3000/api/auth/kakao/callback'
    
    // 1. 액세스 토큰 요청
    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        redirect_uri: redirectUri,
        code: code,
      }).toString(),
    })
    
    if (!tokenResponse.ok) {
      throw new Error('Failed to get access token')
    }
    
    const tokenData = await tokenResponse.json<{
      access_token: string
      token_type: string
      refresh_token: string
      expires_in: number
    }>()
    
    // 2. 사용자 정보 요청
    const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    })
    
    if (!userResponse.ok) {
      throw new Error('Failed to get user info')
    }
    
    const kakaoUser = await userResponse.json<{
      id: number
      kakao_account: {
        profile: {
          nickname: string
          profile_image_url?: string
        }
        email?: string
      }
    }>()
    
    const { DB } = c.env
    
    // 3. 기존 사용자 확인
    const existingUser = await DB.prepare(`
      SELECT * FROM users 
      WHERE social_provider = 'kakao' AND social_id = ?
      AND deleted_at IS NULL
    `).bind(kakaoUser.id.toString()).first<User>()
    
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
            updated_at = datetime('now')
        WHERE id = ?
      `).bind(
        kakaoUser.kakao_account.profile.nickname,
        kakaoUser.kakao_account.profile.profile_image_url || null,
        userId
      ).run()
      
    } else {
      // 신규 사용자 - 회원가입 처리
      const email = kakaoUser.kakao_account.email || `kakao_${kakaoUser.id}@kakao.local`
      
      // 이메일 중복 체크
      const emailCheck = await DB.prepare(`
        SELECT id FROM users WHERE email = ?
      `).bind(email).first()
      
      if (emailCheck) {
        // 이메일은 있지만 카카오 연동 안 됨
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
      
      // 신규 회원 가입
      const result = await DB.prepare(`
        INSERT INTO users (
          email, password_hash, name, social_provider, social_id, 
          profile_image_url, role
        ) VALUES (?, '', ?, 'kakao', ?, ?, 'student')
      `).bind(
        email,
        kakaoUser.kakao_account.profile.nickname,
        kakaoUser.id.toString(),
        kakaoUser.kakao_account.profile.profile_image_url || null
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
    
    // 4. 기존 세션 삭제 (만료된 세션 정리)
    await DB.prepare(`
      DELETE FROM sessions 
      WHERE user_id = ? AND expires_at < datetime('now')
    `).bind(userId).run()
    
    // 5. 새 세션 생성
    const sessionToken = generateSessionToken()
    const expiresAt = addDays(new Date(), 7)
    
    await DB.prepare(`
      INSERT INTO sessions (
        user_id, session_token, expires_at
      ) VALUES (?, ?, ?)
    `).bind(userId, sessionToken, expiresAt.toISOString()).run()
    
    // 6. 로그인 시간 업데이트는 생략 (컬럼 없음)
    
    // 7. HttpOnly 쿠키 설정 + 리다이렉트
    c.header('Set-Cookie', `session_token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`)
    
    return c.html(`
      <html>
        <head>
          <title>로그인 중...</title>
        </head>
        <body>
          <script>
            // 메인 페이지로 이동
            alert('카카오 로그인 성공! 환영합니다, ${user.name}님!');
            window.location.href = '/';
          </script>
        </body>
      </html>
    `)
    
  } catch (error) {
    console.error('Kakao callback error:', error)
    return c.html(`
      <html>
        <head>
          <title>로그인 실패</title>
        </head>
        <body>
          <script>
            alert('카카오 로그인에 실패했습니다. 다시 시도해주세요.');
            window.location.href = '/login';
          </script>
        </body>
      </html>
    `)
  }
})

export default authKakao
