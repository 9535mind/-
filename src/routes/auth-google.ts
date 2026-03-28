/**
 * Google 소셜 로그인 API
 * /api/auth/google/*
 */

import { Context, Hono } from 'hono'
import { Bindings, User } from '../types/database'
import { 
  successResponse, 
  errorResponse, 
  generateSessionToken,
  addDays,
  hashPassword
} from '../utils/helpers'
import { applySessionCookie } from '../utils/session-cookie'
import {
  envRedirectUriHostname,
  GOOGLE_OAUTH_REDIRECT_URI,
  isLocalDevHostname,
  requestHostname,
  SITE_PUBLIC_ORIGIN,
} from '../utils/oauth-public'

const authGoogle = new Hono<{ Bindings: Bindings }>()

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

function isAllowedRedirectHost(hostname: string): boolean {
  return (
    hostname === 'mindstory.kr' ||
    hostname.endsWith('.mindstory.kr') ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1'
  )
}

/** *.pages.dev 등에서 OAuth 시작 시 구글·쿠키 도메인 불일치 방지 */
function redirectGoogleOAuthToCanonicalOrigin(c: Context<{ Bindings: Bindings }>): Response | undefined {
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

function isAllowedGoogleRedirectUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
    if (u.pathname.replace(/\/$/, '') !== '/api/auth/google/callback') return false
    return isAllowedRedirectHost(u.hostname)
  } catch {
    return false
  }
}

/**
 * 프로덕션(비로컬)은 항상 mindstory.kr 콜백 고정 — 잘못된 Cloudflare 시크릿·옛 도메인 무시
 */
function resolveGoogleRedirectUri(c: Context<{ Bindings: Bindings }>): string {
  const h = requestHostname(c)
  if (isLocalDevHostname(h)) {
    const fromEnv = (c.env.GOOGLE_REDIRECT_URI || '').trim().replace(/\/$/, '')
    if (fromEnv && isAllowedGoogleRedirectUrl(fromEnv)) return fromEnv
    return 'http://localhost:3000/api/auth/google/callback'
  }

  const fromEnv = (c.env.GOOGLE_REDIRECT_URI || '').trim().replace(/\/$/, '')
  if (fromEnv && fromEnv !== GOOGLE_OAUTH_REDIRECT_URI) {
    console.warn('[GOOGLE_REDIRECT] Production ignores GOOGLE_REDIRECT_URI (use mindstory.kr only):', fromEnv)
  }
  return GOOGLE_OAUTH_REDIRECT_URI
}

/**
 * GET /api/auth/google/login
 * Google 로그인 시작 (Google 인증 페이지로 리다이렉트)
 */
authGoogle.get('/login', async (c) => {
  try {
    const forceCanon = redirectGoogleOAuthToCanonicalOrigin(c)
    if (forceCanon) return forceCanon

    const clientId = c.env.GOOGLE_CLIENT_ID
    const redirectUri = resolveGoogleRedirectUri(c)
    
    // 디버깅 로그
    console.log('[GOOGLE_LOGIN] c.env keys:', Object.keys(c.env))
    console.log('[GOOGLE_LOGIN] GOOGLE_CLIENT_ID exists:', !!clientId)
    console.log('[GOOGLE_LOGIN] GOOGLE_REDIRECT_URI exists:', !!redirectUri)
    
    if (!clientId) {
      console.error('[GOOGLE_LOGIN] Missing environment variables:', {
        GOOGLE_CLIENT_ID: !!clientId,
        GOOGLE_REDIRECT_URI: !!redirectUri,
      })
      return c.json(errorResponse('Google 로그인 설정이 완료되지 않았습니다.'), 500)
    }
    
    console.log('[GOOGLE_LOGIN] Client ID:', clientId.substring(0, 20) + '...')
    console.log('[GOOGLE_LOGIN] Redirect URI:', redirectUri)
    
    // Google 인증 URL 생성
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    googleAuthUrl.searchParams.set('client_id', clientId)
    googleAuthUrl.searchParams.set('redirect_uri', redirectUri)
    googleAuthUrl.searchParams.set('response_type', 'code')
    googleAuthUrl.searchParams.set('scope', 'openid email profile')
    googleAuthUrl.searchParams.set('access_type', 'online')
    
    console.log('[GOOGLE_LOGIN] Full OAuth URL:', googleAuthUrl.toString())
    
    // Google 로그인 페이지로 리다이렉트
    return c.redirect(googleAuthUrl.toString())
    
  } catch (error) {
    console.error('Google login start error:', error)
    return c.json(errorResponse('Google 로그인 시작에 실패했습니다.'), 500)
  }
})

authGoogle.get('/debug', (c) => {
  const forceCanon = redirectGoogleOAuthToCanonicalOrigin(c)
  if (forceCanon) return forceCanon

  const clientId = (c.env.GOOGLE_CLIENT_ID || '').trim()
  const clientSecret = (c.env.GOOGLE_CLIENT_SECRET || '').trim()
  const h = requestHostname(c)
  const redirectUri = isLocalDevHostname(h) ? resolveGoogleRedirectUri(c) : GOOGLE_OAUTH_REDIRECT_URI
  return c.json(
    successResponse({
      origin: getRequestOrigin(c),
      redirectUri,
      canonicalRedirectUri: GOOGLE_OAUTH_REDIRECT_URI,
      sitePublicOrigin: SITE_PUBLIC_ORIGIN,
      googleRedirectPolicy: 'hostname-local-only-v3',
      envGoogleRedirectUriPresent: !!(c.env.GOOGLE_REDIRECT_URI || '').trim(),
      envGoogleRedirectHostname: envRedirectUriHostname(c.env.GOOGLE_REDIRECT_URI),
      envNextPublicSiteUrl: (c.env.NEXT_PUBLIC_SITE_URL || '').trim() || null,
      clientIdPrefix: clientId ? clientId.slice(0, 8) : null,
      clientIdLength: clientId ? clientId.length : 0,
      hasClientSecret: !!clientSecret,
    })
  )
})

/**
 * GET /api/auth/google/callback
 * Google 로그인 콜백 처리
 */
authGoogle.get('/callback', async (c) => {
  try {
    // 모든 쿼리 파라미터 로깅 (디버깅용)
    const allParams = c.req.url.split('?')[1] || 'no params'
    console.log('[GOOGLE_CALLBACK] Full URL:', c.req.url)
    console.log('[GOOGLE_CALLBACK] All params:', allParams)
    
    const code = c.req.query('code')
    const error = c.req.query('error')
    
    console.log('[GOOGLE_CALLBACK] code:', code ? code.substring(0, 20) + '...' : 'MISSING')
    console.log('[GOOGLE_CALLBACK] error:', error || 'none')
    
    if (error) {
      console.error('[GOOGLE_CALLBACK] OAuth Error:', error)
      return c.html(`
        <html>
          <head>
            <title>구글 로그인 오류</title>
            <meta charset="UTF-8">
          </head>
          <body>
            <script>
              alert('구글 로그인 오류: ${error}\n\n다시 시도해주세요.');
              window.location.href = '/login';
            </script>
          </body>
        </html>
      `)
    }
    
    if (!code) {
      console.error('[GOOGLE_CALLBACK] No authorization code')
      return c.json(errorResponse('인증 코드가 없습니다.'), 400)
    }
    
    const clientId = c.env.GOOGLE_CLIENT_ID
    const clientSecret = c.env.GOOGLE_CLIENT_SECRET
    const redirectUri = resolveGoogleRedirectUri(c)
    
    if (!clientId || !clientSecret) {
      console.error('[GOOGLE_CALLBACK] Missing environment variables')
      return c.json(errorResponse('Google 로그인 설정이 완료되지 않았습니다.'), 500)
    }
    
    console.log('[GOOGLE_CALLBACK] Using redirect_uri:', redirectUri)
    
    // 1. 액세스 토큰 요청
    console.log('[GOOGLE_CALLBACK] Requesting access token...')
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
    
    console.log('[GOOGLE_CALLBACK] Token response status:', tokenResponse.status)
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('[GOOGLE_CALLBACK] Token request failed:', errorText)
      throw new Error(`Failed to get access token: ${tokenResponse.status} - ${errorText}`)
    }
    
    const tokenData = await tokenResponse.json<{
      access_token: string
      id_token: string
      expires_in: number
    }>()
    
    // 2. 사용자 정보 요청
    console.log('[GOOGLE_CALLBACK] Requesting user info...')
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    })
    
    console.log('[GOOGLE_CALLBACK] User info response status:', userResponse.status)
    
    if (!userResponse.ok) {
      const errorText = await userResponse.text()
      console.error('[GOOGLE_CALLBACK] User info request failed:', errorText)
      throw new Error(`Failed to get user info: ${userResponse.status} - ${errorText}`)
    }
    
    const googleUser = await userResponse.json<{
      id: string
      email: string
      name: string
      picture?: string
      verified_email: boolean
    }>()
    
    const { DB } = c.env
    
    console.log('[GOOGLE_CALLBACK] Google user ID:', googleUser.id)
    console.log('[GOOGLE_CALLBACK] Google email:', googleUser.email)
    console.log('[GOOGLE_CALLBACK] Google name:', googleUser.name)
    console.log('[GOOGLE_CALLBACK] Email verified:', googleUser.verified_email)
    
    // 3. 기존 사용자 확인
    const existingUser = await DB.prepare(`
      SELECT * FROM users 
      WHERE social_provider = 'google' AND social_id = ?
      AND deleted_at IS NULL
    `).bind(googleUser.id).first<User>()
    
    let userId: number
    let user: User
    
    if (existingUser) {
      // 기존 사용자 - 로그인 처리
      console.log('[GOOGLE_CALLBACK] Existing user found, ID:', existingUser.id)
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
        googleUser.name,
        googleUser.picture || null,
        userId
      ).run()
      
    } else {
      // 신규 사용자 - 회원가입 처리
      console.log('[GOOGLE_CALLBACK] New user, creating account...')
      const email = googleUser.email
      console.log('[GOOGLE_CALLBACK] Email for registration:', email)
      
      // 이메일 중복 체크
      const emailCheck = await DB.prepare(`
        SELECT id FROM users WHERE email = ?
      `).bind(email).first()
      
      if (emailCheck) {
        // 이메일은 있지만 Google 연동 안 됨
        console.log('[GOOGLE_CALLBACK] Email already exists')
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
        ) VALUES (?, '', ?, 'google', ?, ?, 'student')
      `).bind(
        email,
        googleUser.name,
        googleUser.id,
        googleUser.picture || null
      ).run()
      
      userId = result.meta.last_row_id as number
      console.log('[GOOGLE_CALLBACK] New user created, ID:', userId)
      
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
    console.log('[GOOGLE_CALLBACK] Creating session for user:', userId)
    const sessionToken = generateSessionToken()
    const expiresAt = addDays(new Date(), 7)
    
    await DB.prepare(`
      INSERT INTO sessions (
        user_id, session_token, expires_at
      ) VALUES (?, ?, ?)
    `).bind(userId, sessionToken, expiresAt.toISOString()).run()
    
    // 6. HttpOnly 쿠키 설정 + 리다이렉트
    console.log('[GOOGLE_CALLBACK] Setting session cookie and redirecting...')
    console.log('[GOOGLE_CALLBACK] Login SUCCESS for user:', user.name)
    
    applySessionCookie(c, sessionToken, 7 * 24 * 60 * 60)
    console.log('[GOOGLE_CALLBACK] Session cookie set successfully')
    
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
            alert('구글 로그인 성공! 환영합니다, ${user.name}님!');
            window.location.href = '/';
          </script>
        </body>
      </html>
    `)
    
  } catch (error) {
    console.error('[GOOGLE_CALLBACK] ===== ERROR OCCURRED =====')
    console.error('[GOOGLE_CALLBACK] Error type:', error?.constructor?.name)
    console.error('[GOOGLE_CALLBACK] Error message:', error?.message)
    console.error('[GOOGLE_CALLBACK] Full error:', error)
    
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
