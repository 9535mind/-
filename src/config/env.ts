/**
 * 환경 변수 설정
 * Cloudflare Pages에서 vars가 작동하지 않는 문제 해결
 */

export const ENV_CONFIG = {
  GOOGLE_CLIENT_ID: '966965276792-0bhnlaeo06dcvqm395k0q1faom34455i.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: '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',
  GOOGLE_REDIRECT_URI: 'https://production-ready.mindstory-lms.pages.dev/api/auth/google/callback',
  KAKAO_CLIENT_ID: '4a832f4eddd0348ce18774012252bf0a',
  KAKAO_CLIENT_SECRET: 'gdxTxKOkaONr8eGQVTFwxlh0u4QqRNlo',
  KAKAO_REDIRECT_URI: 'https://production-ready.mindstory-lms.pages.dev/api/auth/kakao/callback',
  GEMINI_API_KEY: 'AIzaSyCZKGEqStpm0X9CmpRrtxxojuBAu6h8J7c',
  JWT_SECRET: 'mindstory-lms-jwt-secret-key-2024-12-27'
} as const

/**
 * 환경 변수 가져오기
 * ENV_CONFIG를 우선으로 사용 (fallback으로 c.env 사용)
 */
export function getEnv<K extends keyof typeof ENV_CONFIG>(
  c: { env: Record<string, any> },
  key: K
): string {
  // ENV_CONFIG를 우선으로 사용 (확실한 값)
  return ENV_CONFIG[key] || c.env[key]
}
