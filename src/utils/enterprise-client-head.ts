/**
 * Enterprise Chrome + Cloudflare 캐시 + (잔존) Service Worker 충돌 완화용.
 * - <head> 직후 주입: meta 힌트 + 등록된 SW 전부 unregister (의도적 PWA 도입 시 이 스니펫 제거·조정)
 */
export const ENTERPRISE_HTML_HEAD_INJECT = `
    <meta http-equiv="Cache-Control" content="no-store" />
    <script>(function(){if(!('serviceWorker'in navigator))return;navigator.serviceWorker.getRegistrations().then(function(rs){return Promise.all(rs.map(function(r){return r.unregister().catch(function(){});}));}).catch(function(){});})();</script>`
