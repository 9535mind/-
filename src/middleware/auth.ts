/**
 * 인증 미들웨어
 * 로그인한 사용자만 접근할 수 있도록 제한
 */

import { Context, Next } from 'hono'
import { Bindings, User } from '../types/database'

/**
 * 세션 쿠키에서 사용자 정보 가져오기
 */
export async function requireAuth(c: Context<{ Bindings: Bindings }>, next: Next) {
  try {
    const sessionToken = c.req.cookie('session_token')
    
    if (!sessionToken) {
      console.log('[AUTH] No session token found, redirecting to login')
      return c.redirect('/login')
    }
    
    const { DB } = c.env
    
    if (!DB) {
      console.error('[AUTH] Database not available')
      return c.html(`
        <!DOCTYPE html>
        <html><head><meta charset="UTF-8"><title>오류</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>데이터베이스 연결 오류</h1>
          <p>잠시 후 다시 시도해주세요.</p>
          <a href="/login" style="color: blue;">로그인 페이지로</a>
        </body></html>
      `, 500)
    }
    
    // 세션 확인
    const session = await DB.prepare(`
      SELECT s.*, u.* 
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_token = ? 
      AND s.expires_at > datetime('now')
      AND u.deleted_at IS NULL
    `).bind(sessionToken).first<User & { session_token: string; expires_at: string }>()
    
    if (!session) {
      console.log('[AUTH] Invalid or expired session, redirecting to login')
      // 만료된 쿠키 삭제
      c.header('Set-Cookie', 'session_token=; Path=/; HttpOnly; Max-Age=0')
      return c.redirect('/login')
    }
    
    console.log('[AUTH] User authenticated:', session.name, session.email)
    
    // Context에 사용자 정보 저장
    c.set('user', session)
    
    await next()
  } catch (error) {
    console.error('[AUTH] Error in requireAuth middleware:', error)
    return c.html(`
      <!DOCTYPE html>
      <html><head><meta charset="UTF-8"><title>인증 오류</title></head>
      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1>인증 처리 중 오류가 발생했습니다</h1>
        <p>오류: ${error instanceof Error ? error.message : String(error)}</p>
        <a href="/login" style="color: blue; text-decoration: underline;">로그인 페이지로</a>
      </body></html>
    `, 500)
  }
}

/**
 * 옵션: 로그인한 사용자만 API 접근 가능
 */
export async function requireAuthAPI(c: Context<{ Bindings: Bindings }>, next: Next) {
  const sessionToken = c.req.cookie('session_token')
  
  if (!sessionToken) {
    return c.json({ success: false, error: '로그인이 필요합니다.' }, 401)
  }
  
  const { DB } = c.env
  
  const session = await DB.prepare(`
    SELECT s.*, u.* 
    FROM user_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.session_token = ? 
    AND s.expires_at > datetime('now')
    AND u.deleted_at IS NULL
  `).bind(sessionToken).first<User & { session_token: string; expires_at: string }>()
  
  if (!session) {
    return c.json({ success: false, error: '세션이 만료되었습니다.' }, 401)
  }
  
  c.set('user', session)
  
  await next()
}

/**
 * 옵션: 로그인 정보가 있으면 사용자 정보 추가, 없으면 그냥 진행
 */
export async function optionalAuth(c: Context<{ Bindings: Bindings }>, next: Next) {
  const sessionToken = c.req.cookie('session_token')
  
  if (sessionToken) {
    const { DB } = c.env
    
    const session = await DB.prepare(`
      SELECT s.*, u.* 
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_token = ? 
      AND s.expires_at > datetime('now')
      AND u.deleted_at IS NULL
    `).bind(sessionToken).first<User & { session_token: string; expires_at: string }>()
    
    if (session) {
      c.set('user', session)
    }
  }
  
  await next()
}

/**
 * 관리자만 접근 가능
 */
export async function requireAdmin(c: Context<{ Bindings: Bindings }>, next: Next) {
  const sessionToken = c.req.cookie('session_token')
  
  if (!sessionToken) {
    return c.json({ success: false, error: '로그인이 필요합니다.' }, 401)
  }
  
  const { DB } = c.env
  
  const session = await DB.prepare(`
    SELECT s.*, u.* 
    FROM user_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.session_token = ? 
    AND s.expires_at > datetime('now')
    AND u.deleted_at IS NULL
  `).bind(sessionToken).first<User & { session_token: string; expires_at: string }>()
  
  if (!session) {
    return c.json({ success: false, error: '세션이 만료되었습니다.' }, 401)
  }
  
  if (session.role !== 'admin') {
    return c.json({ success: false, error: '관리자 권한이 필요합니다.' }, 403)
  }
  
  c.set('user', session)
  
  await next()
}
