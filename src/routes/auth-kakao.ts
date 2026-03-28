/**
 * 카카오 소셜 로그인 API
 * /api/auth/kakao/*
 */

import { Context, Hono } from 'hono'
import { Bindings, User } from '../types/database'
import { 
  successResponse, 
  errorResponse, 
  generateSessionToken,
  addDays
} from '../utils/helpers'
import { applySessionCookie } from '../utils/session-cookie'
import {
  envRedirectUriHostname,
  isLocalDevHostname,
  KAKAO_OAUTH_REDIRECT_URI,
  requestHostname,
  SITE_PUBLIC_ORIGIN,
} from '../utils/oauth-public'

const authKakao = new Hono<{ Bindings: Bindings }>()

/**
 * 브라우저가 실제로 접속한 공개 origin (Cloudflare Pages 등 프록시 대응)
 */
function getRequestOrigin(c: Context<{ Bindings: Bindings }>): string {
  const reqUrl = new URL(c.req.url)
  const protoRaw =
    c.req.header('x-forwarded-proto') || reqUrl.protocol.replace(':', '') || 'https'
  const proto = protoRaw.split(',')[0]?.trim() || 'https'
  const hostRaw =
    c.req.header('x-forwarded-host') || c.req.header('host') || reqUrl.host
  const host = hostRaw.split(',')[0]?.trim() || reqUrl.host
  return `${proto}://${host}`
}

/**
 * *.pages.dev 등으로 OAuth를 시작하면 redirect_uri가 예전 호스트로 잡혀 KOE006이 난다.
 * 로컬 개발(localhost)은 그대로 둔다.
 */
function redirectKakaoOAuthToCanonicalOrigin(c: Context<{ Bindings: Bindings }>): Response | undefined {
  const raw =
    c.req.header('x-forwarded-host') ||
    c.req.header('host') ||
    new URL(c.req.url).host
  const h = raw.split(',')[0].trim().split(':')[0]
  if (!h || h === 'mindstory.kr' || h.endsWith('.mindstory.kr')) return undefined
  if (h === 'localhost' || h === '127.0.0.1') return undefined
  const u = new URL(c.req.url)
  return c.redirect(`${SITE_PUBLIC_ORIGIN}${u.pathname}${u.search}`, 302)
}

function isAllowedKakaoRedirectUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
    const pathOk = u.pathname.replace(/\/$/, '') === '/api/auth/kakao/callback'
    if (!pathOk) return false
    const h = u.hostname
    return (
      h === 'mindstory.kr' ||
      h.endsWith('.mindstory.kr') ||
      h === 'localhost' ||
      h === '127.0.0.1'
    )
  } catch {
    return false
  }
}

/**
 * 로컬/프로덕션 redirect_uri 결정.
 * - 프로덕션(비로컬): 항상 https://mindstory.kr/... 고정 — Cloudflare에 남은 pages.dev 시크릿 때문에 KOE006 나는 것을 원천 차단
 * - 로컬: KAKAO_REDIRECT_URI가 유효하면 사용, 아니면 localhost 기본값
 */
function resolveKakaoRedirectUri(c: Context<{ Bindings: Bindings }>): string {
  const h = requestHostname(c)
  if (isLocalDevHostname(h)) {
    const fromEnv = (c.env.KAKAO_REDIRECT_URI || '').trim().replace(/\/$/, '')
    if (fromEnv && isAllowedKakaoRedirectUrl(fromEnv)) return fromEnv
    return 'http://localhost:3000/api/auth/kakao/callback'
  }

  const fromEnv = (c.env.KAKAO_REDIRECT_URI || '').trim().replace(/\/$/, '')
  if (fromEnv && fromEnv !== KAKAO_OAUTH_REDIRECT_URI) {
    console.warn('[KAKAO_REDIRECT] Production ignores KAKAO_REDIRECT_URI (use mindstory.kr only):', fromEnv)
  }
  return KAKAO_OAUTH_REDIRECT_URI
}

/**
 * GET /api/auth/kakao/login
 * 카카오 로그인 시작 (카카오 인증 페이지로 리다이렉트)
 */
authKakao.get('/login', async (c) => {
  try {
    const forceCanon = redirectKakaoOAuthToCanonicalOrigin(c)
    if (forceCanon) return forceCanon

    const clientId = (c.env.KAKAO_CLIENT_ID || '').trim()
    const redirectUri = resolveKakaoRedirectUri(c)

    if (!clientId || clientId === 'your_kakao_rest_api_key') {
      console.error('[KAKAO_LOGIN] KAKAO_CLIENT_ID 미설정 또는 플레이스홀더')
      return c.json(errorResponse('카카오 REST API 키(KAKAO_CLIENT_ID)가 서버에 설정되지 않았습니다.'), 503)
    }

    console.log('[KAKAO_LOGIN] Client ID prefix:', clientId.slice(0, 12) + '…')
    console.log('[KAKAO_LOGIN] Redirect URI:', redirectUri)
    console.log('[KAKAO_LOGIN] Request origin:', getRequestOrigin(c))
    
    // 카카오 인증 URL 생성
    const kakaoAuthUrl = new URL('https://kauth.kakao.com/oauth/authorize')
    kakaoAuthUrl.searchParams.set('client_id', clientId)
    kakaoAuthUrl.searchParams.set('redirect_uri', redirectUri)
    kakaoAuthUrl.searchParams.set('response_type', 'code')

    const marketingParam = c.req.query('marketing')
    const marketing =
      marketingParam === '1' ||
      marketingParam === 'true' ||
      marketingParam === 'yes'
    kakaoAuthUrl.searchParams.set('state', marketing ? 'm1' : 'm0')

    console.log('[KAKAO_LOGIN] Full OAuth URL:', kakaoAuthUrl.toString())
    
    // 카카오 로그인 페이지로 리다이렉트
    return c.redirect(kakaoAuthUrl.toString())
    
  } catch (error) {
    console.error('Kakao login start error:', error)
    return c.json(errorResponse('카카오 로그인 시작에 실패했습니다.'), 500)
  }
})

/**
 * GET /api/auth/kakao/debug
 * 운영 환경에서 실제로 사용 중인 설정을 "일부 마스킹"하여 확인
 */
authKakao.get('/debug', (c) => {
  const forceCanon = redirectKakaoOAuthToCanonicalOrigin(c)
  if (forceCanon) return forceCanon

  const clientId = (c.env.KAKAO_CLIENT_ID || '').trim()
  const clientSecret = (c.env.KAKAO_CLIENT_SECRET || '').trim()
  const h = requestHostname(c)
  const origin = getRequestOrigin(c)
  /** 비로컬 호스트에서는 JSON에 상수만 노출(에지 캐시·구 Worker 혼선 방지) */
  const redirectUri = isLocalDevHostname(h) ? resolveKakaoRedirectUri(c) : KAKAO_OAUTH_REDIRECT_URI

  return c.json(
    successResponse({
      origin,
      redirectUri,
      canonicalRedirectUri: KAKAO_OAUTH_REDIRECT_URI,
      sitePublicOrigin: SITE_PUBLIC_ORIGIN,
      kakaoRedirectPolicy: 'hostname-local-only-v3',
      envKakaoRedirectUriPresent: !!(c.env.KAKAO_REDIRECT_URI || '').trim(),
      envKakaoRedirectHostname: envRedirectUriHostname(c.env.KAKAO_REDIRECT_URI),
      envNextPublicSiteUrl: (c.env.NEXT_PUBLIC_SITE_URL || '').trim() || null,
      clientIdPrefix: clientId ? clientId.slice(0, 8) : null,
      clientIdLength: clientId ? clientId.length : 0,
      hasClientSecret: !!clientSecret,
    })
  )
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
    const oauthState = c.req.query('state') || 'm0'
    const marketingForNewUser = oauthState === 'm1' ? 1 : 0
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
            <p><strong>Redirect URI (아래 값을 카카오 콘솔에 그대로 등록):</strong><br>
            <code style="background: #f4f4f4; padding: 5px; display: block; word-break: break-all;">
            ${resolveKakaoRedirectUri(c)}
            </code></p>
            <p><strong>Web 플랫폼 사이트 도메인 (루트만, 경로 없음):</strong><br>
            <code style="background: #f4f4f4; padding: 5px; display: block; word-break: break-all;">
            ${getRequestOrigin(c)}
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
    
    const clientId = (c.env.KAKAO_CLIENT_ID || '').trim()
    const redirectUri = resolveKakaoRedirectUri(c)
    const clientSecret = c.env.KAKAO_CLIENT_SECRET?.trim()

    if (!clientId) {
      return c.html(`
        <html><head><meta charset="UTF-8"></head><body>
          <script>alert('서버에 KAKAO_CLIENT_ID가 없습니다.'); window.location.href='/login';</script>
        </body></html>
      `)
    }

    console.log('[KAKAO_CALLBACK] Code received:', code.substring(0, 10) + '...')
    console.log('[KAKAO_CALLBACK] Using redirect_uri:', redirectUri)

    // 1. 액세스 토큰 요청 (실패 시 client_secret 없이 1회 재시도)
    console.log('[KAKAO_CALLBACK] Requesting access token...')

    async function requestToken(params: URLSearchParams) {
      return await fetch('https://kauth.kakao.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      })
    }

    const tokenParamsWithSecret = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code: code,
    })
    if (clientSecret) {
      tokenParamsWithSecret.set('client_secret', clientSecret)
    }

    const tokenParamsWithoutSecret = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code: code,
    })

    let tokenResponse = await requestToken(tokenParamsWithSecret)
    console.log('[KAKAO_CALLBACK] Token response status:', tokenResponse.status)

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('[KAKAO_CALLBACK] Token request failed:', errorText)

      const shouldRetryWithoutSecret =
        clientSecret &&
        (errorText.includes('KOE010') || errorText.includes('invalid_client'))

      if (shouldRetryWithoutSecret) {
        console.warn(
          '[KAKAO_CALLBACK] KOE010/invalid_client. Retrying token request without client_secret...'
        )
        const retryResponse = await requestToken(tokenParamsWithoutSecret)
        console.log('[KAKAO_CALLBACK] Retry token response status:', retryResponse.status)

        if (!retryResponse.ok) {
          const retryErrorText = await retryResponse.text().catch(() => '')
          console.error('[KAKAO_CALLBACK] Retry token request failed:', retryErrorText)
          throw new Error(
            `Failed to get access token: ${tokenResponse.status} - ${errorText} (retry: ${retryResponse.status} - ${retryErrorText})`
          )
        }

        tokenResponse = retryResponse
      } else {
        throw new Error(`Failed to get access token: ${tokenResponse.status} - ${errorText}`)
      }
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
      
      // 신규 회원 가입 (간편가입: 약관·개인정보는 가입 절차에서 동의한 것으로 처리, 마케팅은 OAuth state 반영)
      const result = await DB.prepare(`
        INSERT INTO users (
          email, password_hash, name, social_provider, social_id, 
          profile_image_url, role, terms_agreed, privacy_agreed, marketing_agreed
        ) VALUES (?, '', ?, 'kakao', ?, ?, 'student', 1, 1, ?)
      `).bind(
        email,
        kakaoUser.kakao_account.profile.nickname,
        kakaoUser.id.toString(),
        kakaoUser.kakao_account.profile.profile_image_url || null,
        marketingForNewUser
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
    
    // 4. 기존 세션 삭제 (만료된 세션 정리)
    await DB.prepare(`
      DELETE FROM sessions 
      WHERE user_id = ? AND expires_at < datetime('now')
    `).bind(userId).run()
    
    // 5. 새 세션 생성
    console.log('[KAKAO_CALLBACK] Creating session for user:', userId)
    const sessionToken = generateSessionToken()
    const expiresAt = addDays(new Date(), 7)
    
    await DB.prepare(`
      INSERT INTO sessions (
        user_id, session_token, expires_at
      ) VALUES (?, ?, ?)
    `).bind(userId, sessionToken, expiresAt.toISOString()).run()
    
    // 6. 로그인 시간 업데이트는 생략 (컬럼 없음)
    
    // 7. HttpOnly 쿠키 설정 + 리다이렉트
    console.log('[KAKAO_CALLBACK] Setting session cookie and redirecting...')
    console.log('[KAKAO_CALLBACK] Login SUCCESS for user:', user.name)
    
    applySessionCookie(c, sessionToken, 7 * 24 * 60 * 60)
    console.log('[KAKAO_CALLBACK] Session cookie set successfully')
    
    return c.html(`
      <html>
        <head>
          <title>로그인 중...</title>
          <meta charset="UTF-8">
        </head>
        <body>
          <script>
            localStorage.setItem('user', JSON.stringify({
              id: ${user.id},
              email: '${user.email}',
              name: '${user.name}',
              role: '${user.role}',
              profile_image_url: ${user.profile_image_url ? `'${user.profile_image_url}'` : 'null'}
            }));
            alert('카카오 로그인 성공! 환영합니다, ${user.name}님!');
            window.location.href = '/';
          </script>
        </body>
      </html>
    `)
    
  } catch (error) {
    console.error('[KAKAO_CALLBACK] ===== ERROR OCCURRED =====')
    console.error('[KAKAO_CALLBACK] Error type:', error?.constructor?.name)
    console.error('[KAKAO_CALLBACK] Error message:', error?.message)
    console.error('[KAKAO_CALLBACK] Full error:', error)

    const errMessage = error?.message ? String(error.message) : '알 수 없는 오류'
    const errName = error?.constructor?.name ? String(error.constructor.name) : 'Error'

    return c.html(`
      <html>
        <head>
          <title>로그인 실패</title>
          <meta charset="UTF-8">
        </head>
        <body>
          <script>
            const errName = ${JSON.stringify(errName)};
            const errMessage = ${JSON.stringify(errMessage)};
            alert('카카오 로그인에 실패했습니다.\\n' + errName + ': ' + errMessage);
            window.location.href = '/login';
          </script>
        </body>
      </html>
    `)
  }
})

export default authKakao
