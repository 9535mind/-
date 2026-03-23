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
    // Cloudflare 런타임 환경 변수 사용
    const clientId = c.env.KAKAO_CLIENT_ID
    const redirectUri = c.env.KAKAO_REDIRECT_URI
    
    // 환경 변수 검증
    if (!clientId || !redirectUri) {
      console.error('[KAKAO_LOGIN] Missing environment variables')
      return c.json({ 
        success: false, 
        error: 'Kakao 로그인 설정이 완료되지 않았습니다. 관리자에게 문의하세요.' 
      }, 500)
    }
    
    // 디버그: 설정값 로그
    console.log('[KAKAO_LOGIN] Client ID:', clientId)
    console.log('[KAKAO_LOGIN] Redirect URI:', redirectUri)
    
    // 카카오 인증 URL 생성
    const kakaoAuthUrl = new URL('https://kauth.kakao.com/oauth/authorize')
    kakaoAuthUrl.searchParams.set('client_id', clientId)
    kakaoAuthUrl.searchParams.set('redirect_uri', redirectUri)
    kakaoAuthUrl.searchParams.set('response_type', 'code')
    
    console.log('[KAKAO_LOGIN] Full OAuth URL:', kakaoAuthUrl.toString())
    
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
    // 모든 쿼리 파라미터 로깅 (디버깅용)
    const allParams = c.req.url.split('?')[1] || 'no params'
    console.log('[KAKAO_CALLBACK] Full URL:', c.req.url)
    console.log('[KAKAO_CALLBACK] All params:', allParams)
    
    const code = c.req.query('code')
    const error = c.req.query('error')
    const errorDescription = c.req.query('error_description')
    
    console.log('[KAKAO_CALLBACK] code:', code || 'MISSING')
    console.log('[KAKAO_CALLBACK] error:', error || 'none')
    console.log('[KAKAO_CALLBACK] error_description:', errorDescription || 'none')
    
    // 에러 파라미터 확인
    if (error) {
      console.error('[KAKAO_CALLBACK] OAuth Error:', error, errorDescription)
      return c.html(`
        <html>
          <head>
            <title>카카오 로그인 오류</title>
            <meta charset="UTF-8">
          </head>
          <body>
            <script>
              alert('카카오 로그인 오류:\\n에러: ${error}\\n설명: ${errorDescription || '없음'}\\n\\n카카오 개발자 콘솔 설정을 확인해주세요.');
              window.location.href = '/login';
            </script>
          </body>
        </html>
      `)
    }
    
    if (!code) {
      console.error('[KAKAO_CALLBACK] No authorization code - This means Kakao rejected the request')
      console.error('[KAKAO_CALLBACK] Possible reasons:')
      console.error('[KAKAO_CALLBACK] 1. Redirect URI mismatch in Kakao Developers Console')
      console.error('[KAKAO_CALLBACK] 2. Web platform domain not registered')
      console.error('[KAKAO_CALLBACK] 3. Kakao Login not activated')
      console.error('[KAKAO_CALLBACK] 4. Test user not registered (if app is in development mode)')
      
      return c.html(`
        <html>
          <head>
            <title>카카오 로그인 실패</title>
            <meta charset="UTF-8">
          </head>
          <body style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e74c3c;">⚠️ 카카오 로그인 실패</h2>
            <p><strong>인증 코드를 받지 못했습니다.</strong></p>
            <hr>
            <h3>가능한 원인:</h3>
            <ol style="line-height: 2;">
              <li><strong>Redirect URI 불일치</strong> (가장 높은 가능성)<br>
                  카카오 개발자 콘솔에 등록된 URI와 서버 설정이 다릅니다.</li>
              <li><strong>Web 플랫폼 도메인 미등록</strong><br>
                  현재 도메인이 카카오 앱 플랫폼에 등록되지 않았습니다.</li>
              <li><strong>카카오 로그인 비활성화</strong><br>
                  카카오 개발자 콘솔에서 카카오 로그인이 OFF 상태입니다.</li>
              <li><strong>테스트 사용자 미등록</strong> (앱이 개발 중인 경우)<br>
                  현재 카카오 계정이 테스트 사용자로 등록되지 않았습니다.</li>
            </ol>
            <hr>
            <h3>필요한 설정:</h3>
            <p><strong>Redirect URI:</strong><br>
            <code style="background: #f4f4f4; padding: 5px; display: block; word-break: break-all;">
            ${c.env.KAKAO_REDIRECT_URI || 'Not configured'}
            </code></p>
            <p><strong>Web 플랫폼 도메인:</strong><br>
            <code style="background: #f4f4f4; padding: 5px; display: block; word-break: break-all;">
            https://3000-ieu1ambselnpjf2cme9se-c81df28e.sandbox.novita.ai
            </code></p>
            <hr>
            <p style="margin-top: 30px;">
              <button onclick="window.location.href='/login'" 
                      style="background: #3498db; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
                로그인 페이지로 돌아가기
              </button>
            </p>
            <p style="font-size: 12px; color: #999; margin-top: 20px;">
              현재 URL: ${c.req.url}
            </p>
          </body>
        </html>
      `)
    }
    
    // Cloudflare 런타임 환경 변수 사용
    const clientId = c.env.KAKAO_CLIENT_ID
    const redirectUri = c.env.KAKAO_REDIRECT_URI
    
    // 환경 변수 검증
    if (!clientId || !redirectUri) {
      console.error('[KAKAO_CALLBACK] Missing environment variables')
      return c.json({ 
        success: false, 
        error: 'Kakao 로그인 설정이 완료되지 않았습니다. 관리자에게 문의하세요.' 
      }, 500)
    }
    
    console.log('[KAKAO_CALLBACK] Code received:', code.substring(0, 10) + '...')
    console.log('[KAKAO_CALLBACK] Using redirect_uri:', redirectUri)
    
    // 1. 액세스 토큰 요청
    console.log('[KAKAO_CALLBACK] Requesting access token...')
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
    
    console.log('[KAKAO_CALLBACK] Token response status:', tokenResponse.status)
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('[KAKAO_CALLBACK] Token request failed:', errorText)
      throw new Error(`Failed to get access token: ${tokenResponse.status} - ${errorText}`)
    }
    
    const tokenData = await tokenResponse.json<{
      access_token: string
      token_type: string
      refresh_token: string
      expires_in: number
    }>()
    
    // 2. 사용자 정보 요청
    console.log('[KAKAO_CALLBACK] Requesting user info...')
    const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    })
    
    console.log('[KAKAO_CALLBACK] User info response status:', userResponse.status)
    
    if (!userResponse.ok) {
      const errorText = await userResponse.text()
      console.error('[KAKAO_CALLBACK] User info request failed:', errorText)
      throw new Error(`Failed to get user info: ${userResponse.status} - ${errorText}`)
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
    
    console.log('[KAKAO_CALLBACK] Kakao user ID:', kakaoUser.id)
    console.log('[KAKAO_CALLBACK] Kakao nickname:', kakaoUser.kakao_account.profile.nickname)
    console.log('[KAKAO_CALLBACK] Kakao email:', kakaoUser.kakao_account.email || 'not provided')
    
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
      console.log('[KAKAO_CALLBACK] Existing user found, ID:', existingUser.id)
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
      console.log('[KAKAO_CALLBACK] New user, creating account...')
      const email = kakaoUser.kakao_account.email || `kakao_${kakaoUser.id}@kakao.local`
      console.log('[KAKAO_CALLBACK] Email for registration:', email)
      
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
      console.log('[KAKAO_CALLBACK] New user created, ID:', userId)
      
      // 생성된 사용자 정보 조회
      const newUser = await DB.prepare(`
        SELECT * FROM users WHERE id = ?
      `).bind(userId).first<User>()
      
      if (!newUser) {
        throw new Error('Failed to create user')
      }
      
      user = newUser
    }
    
    // 4. 최종 사용자 정보 조회 (확실하게)
    const finalUser = await DB.prepare(`
      SELECT * FROM users WHERE id = ?
    `).bind(userId).first<User>()
    
    if (!finalUser) {
      throw new Error('User not found after authentication')
    }
    
    user = finalUser
    console.log('[KAKAO_CALLBACK] Final user loaded:', user.email)
    
    // 5. 기존 세션 삭제 (만료된 세션 정리)
    await DB.prepare(`
      DELETE FROM user_sessions 
      WHERE user_id = ? AND expires_at < datetime('now')
    `).bind(userId).run()
    
    // 6. 새 세션 생성
    console.log('[KAKAO_CALLBACK] Creating session for user:', userId)
    const sessionToken = generateSessionToken()
    const expiresAt = addDays(new Date(), 7)
    
    await DB.prepare(`
      INSERT INTO user_sessions (
        user_id, session_token, expires_at
      ) VALUES (?, ?, ?)
    `).bind(userId, sessionToken, expiresAt.toISOString()).run()
    
    console.log('[KAKAO_CALLBACK] Session created successfully')
    
    // 7. HttpOnly 쿠키 설정 + 리다이렉트
    console.log('[KAKAO_CALLBACK] Setting session cookie and redirecting...')
    console.log('[KAKAO_CALLBACK] Login SUCCESS for user:', user.name)
    
    // HTTPS 환경에서 Secure 플래그 필수!
    // Sandbox 환경은 항상 HTTPS이므로 강제 설정
    const isSecure = true  // Cloudflare/Sandbox는 항상 HTTPS
    const secureCookie = isSecure ? '; Secure' : ''
    
    console.log('[KAKAO_CALLBACK] Cookie will be Secure:', isSecure)
    
    c.header('Set-Cookie', `session_token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax${secureCookie}; Max-Age=${7 * 24 * 60 * 60}`)
    console.log('[KAKAO_CALLBACK] Cookie header set successfully')
    
    return c.html(`
      <html>
        <head>
          <title>로그인 중...</title>
          <meta charset="UTF-8">
        </head>
        <body>
          <script>
            // localStorage에 세션 정보 저장 (클라이언트 호환성)
            localStorage.setItem('session_token', '${sessionToken}');
            localStorage.setItem('user', JSON.stringify({
              id: ${user.id},
              email: '${user.email}',
              name: '${user.name}',
              role: '${user.role}',
              profile_image_url: ${user.profile_image_url ? `'${user.profile_image_url}'` : 'null'}
            }));
            
            // 환영 알림 후 대시보드로 이동
            alert('환영합니다! 대시보드로 이동합니다.');
            window.location.href = '/dashboard';
          </script>
        </body>
      </html>
    `)
    
  } catch (error) {
    console.error('[KAKAO_CALLBACK] ===== ERROR OCCURRED =====')
    console.error('[KAKAO_CALLBACK] Error type:', error?.constructor?.name)
    console.error('[KAKAO_CALLBACK] Error message:', error?.message)
    console.error('[KAKAO_CALLBACK] Full error:', error)
    
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
