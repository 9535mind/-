/**
 * Rate Limiting 미들웨어
 * IP 기반 요청 횟수 제한으로 API 남용 방지
 */

import { Context, Next } from 'hono'

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// 메모리 기반 스토어 (프로덕션에서는 KV 사용 권장)
const store: RateLimitStore = {}

/**
 * 만료된 엔트리 정리 함수
 * 요청 시마다 호출되어 오래된 엔트리를 삭제
 */
function cleanupExpiredEntries() {
  const now = Date.now()
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  })
}

export interface RateLimitOptions {
  windowMs?: number  // 시간 윈도우 (기본: 1분)
  max?: number       // 최대 요청 수 (기본: 100)
  message?: string   // 제한 초과 시 메시지
  /** IP별 카운터를 경로와 분리 (예: ai-chat) */
  bucket?: string
}

/**
 * Rate Limiting 미들웨어 생성
 */
export const rateLimiter = (options: RateLimitOptions = {}) => {
  const windowMs = options.windowMs || 60000  // 1분
  const max = options.max || 100
  const message = options.message || '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'

  const bucket = options.bucket

  return async (c: Context, next: Next) => {
    // 만료된 엔트리 정리 (매 요청 시)
    cleanupExpiredEntries()

    // IP 주소 가져오기
    const ip = c.req.header('cf-connecting-ip') || 
               c.req.header('x-forwarded-for') || 
               c.req.header('x-real-ip') || 
               'unknown'

    const now = Date.now()
    const key = bucket ? `ratelimit:${bucket}:${ip}` : `ratelimit:${ip}`

    // 현재 IP의 요청 정보 가져오기
    if (!store[key] || store[key].resetTime < now) {
      // 새로운 윈도우 시작
      store[key] = {
        count: 1,
        resetTime: now + windowMs
      }
    } else {
      // 기존 윈도우 내 요청
      store[key].count++

      if (store[key].count > max) {
        // 제한 초과
        const resetIn = Math.ceil((store[key].resetTime - now) / 1000)
        
        return c.json({
          success: false,
          error: message,
          retryAfter: resetIn
        }, 429)  // 429 Too Many Requests
      }
    }

    // 응답 헤더에 Rate Limit 정보 추가
    c.header('X-RateLimit-Limit', max.toString())
    c.header('X-RateLimit-Remaining', (max - store[key].count).toString())
    c.header('X-RateLimit-Reset', new Date(store[key].resetTime).toISOString())

    await next()
  }
}

/**
 * 엄격한 Rate Limiting (로그인, 회원가입 등)
 */
export const strictRateLimiter = rateLimiter({
  windowMs: 60000,   // 1분
  max: 10,           // 10회
  message: '요청이 너무 많습니다. 1분 후 다시 시도해주세요.'
})

/**
 * 일반 Rate Limiting (일반 API)
 */
export const generalRateLimiter = rateLimiter({
  windowMs: 60000,   // 1분
  max: 100,          // 100회
  message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
})

/**
 * 관대한 Rate Limiting (읽기 전용 API)
 */
export const lenientRateLimiter = rateLimiter({
  windowMs: 60000,   // 1분
  max: 200,          // 200회
  message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
})
