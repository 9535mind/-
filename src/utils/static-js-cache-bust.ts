/**
 * 조직용 크롬·강한 캐시로 오래된 content-protection.js / security.js 가 남는 경우 대비.
 * 해당 JS를 바꿨을 때 숫자만 올려서 배포하면 브라우저가 새 URL로 다시 받습니다.
 */
export const STATIC_JS_CACHE_QUERY = '?v=20260329-1'
