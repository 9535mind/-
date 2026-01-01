/**
 * 인증 미들웨어
 */

import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { getCurrentUser, isAdmin } from '../utils/helpers'

/**
 * 로그인 필수 미들웨어
 */
export async function requireAuth(c: Context, next: Next) {
  const user = await getCurrentUser(c)
  
  if (!user) {
    throw new HTTPException(401, { message: '로그인이 필요합니다.' })
  }
  
  // Context에 사용자 정보 저장
  c.set('user', user)
  
  await next()
}

/**
 * 관리자 권한 필수 미들웨어
 */
export async function requireAdmin(c: Context, next: Next) {
  const user = await getCurrentUser(c)
  
  if (!user) {
    throw new HTTPException(401, { message: '로그인이 필요합니다.' })
  }
  
  if (user.role !== 'admin') {
    throw new HTTPException(403, { message: '관리자 권한이 필요합니다.' })
  }
  
  c.set('user', user)
  
  await next()
}

/**
 * 선택적 인증 미들웨어 (로그인 선택)
 */
export async function optionalAuth(c: Context, next: Next) {
  try {
    const user = await getCurrentUser(c)
    
    if (user) {
      c.set('user', user)
    }
  } catch (error) {
    // 인증 에러가 발생해도 계속 진행 (선택적 인증)
    console.error('Optional auth error:', error)
  }
  
  await next()
}
