/**
 * 마인드스토리 LMS 보안 모듈
 * 저작권 보호를 위한 클라이언트 측 보안 기능
 */

;(function initMindstoryDevFlag() {
  if (typeof window === 'undefined') return
  if (typeof window.isDevelopment === 'boolean') return
  const h = window.location.hostname
  window.isDevelopment =
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h.includes('sandbox') ||
    h.endsWith('.local')
})()

// ========================================
// 1. 우클릭 방지
// ========================================
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  showSecurityAlert('이 콘텐츠는 저작권법으로 보호됩니다.');
  return false;
});

// ========================================
// 2. 드래그 방지
// ========================================
document.addEventListener('dragstart', (e) => {
  e.preventDefault();
  return false;
});

// ========================================
// 3. 선택 방지 (텍스트/이미지)
// ========================================
document.addEventListener('selectstart', (e) => {
  // 입력 필드는 선택 허용
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    return true;
  }
  e.preventDefault();
  return false;
});

// CSS로도 선택 방지 적용
const style = document.createElement('style');
style.innerHTML = `
  body {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
  input, textarea {
    -webkit-user-select: text;
    -moz-user-select: text;
    -ms-user-select: text;
    user-select: text;
  }
`;
document.head.appendChild(style);

// ========================================
// 4. 키보드 단축키 차단 (조용한 차단)
// ========================================
document.addEventListener('keydown', (e) => {
  let blocked = false;
  
  // F12 차단
  if (e.key === 'F12') {
    blocked = true;
  }
  
  // Ctrl+Shift+I (개발자 도구)
  if (e.ctrlKey && e.shiftKey && e.key === 'I') {
    blocked = true;
  }
  
  // Ctrl+Shift+J (콘솔)
  if (e.ctrlKey && e.shiftKey && e.key === 'J') {
    blocked = true;
  }
  
  // Ctrl+Shift+C (요소 검사)
  if (e.ctrlKey && e.shiftKey && e.key === 'C') {
    blocked = true;
  }
  
  // Ctrl+U (소스 보기)
  if (e.ctrlKey && e.key === 'u') {
    blocked = true;
  }
  
  // Ctrl+S (저장)
  if (e.ctrlKey && e.key === 's') {
    blocked = true;
  }
  
  // Ctrl+P (인쇄) - 영상 페이지만 차단
  if (e.ctrlKey && e.key === 'p' && window.location.pathname.includes('/learn')) {
    blocked = true;
  }
  
  // Ctrl+C (복사) - 입력 필드 제외
  if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
    const target = e.target;
    if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
      blocked = true;
    }
  }
  
  // Ctrl+X (잘라내기) - 입력 필드 제외
  if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
    const target = e.target;
    if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
      blocked = true;
    }
  }
  
  // 차단된 경우 이벤트 중단 (팝업 없이)
  if (blocked) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
});

// ========================================
// 5. 개발자 도구 감지 (조용한 모드)
// ========================================
// 팝업 없이 로그만 기록 (사용자 경험 개선)
let devToolsOpen = false;

function detectDevTools() {
  const threshold = 160;
  const widthThreshold = window.outerWidth - window.innerWidth > threshold;
  const heightThreshold = window.outerHeight - window.innerHeight > threshold;
  
  if (widthThreshold || heightThreshold) {
    if (!devToolsOpen) {
      devToolsOpen = true;
      // 팝업 제거 - 조용히 로그만 기록
      logSecurityEvent('devtools_detected');
    }
  } else {
    devToolsOpen = false;
  }
}

// 1초마다 체크 (팝업 없이 로그만)
const devToolsCheckInterval = setInterval(detectDevTools, 1000);

// ========================================
// 6. 탭 전환 감지
// ========================================
let isPageVisible = true;
let tabSwitchCount = 0;

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    isPageVisible = false;
    tabSwitchCount++;
    
    // 영상 재생 중이면 일시정지 (선택사항)
    const video = document.querySelector('video');
    if (video && !video.paused) {
      // 탭 전환 시 자동 일시정지는 UX에 나쁠 수 있으므로 로그만 기록
      logSecurityEvent('tab_switch_during_video');
    }
  } else {
    isPageVisible = true;
  }
});

// ========================================
// 7. 콘솔 경고 메시지 (개발 환경에서만)
// ========================================
// 개발자 도구 감지 시에만 경고 표시
if (typeof window !== 'undefined' && window.isDevelopment) {
  console.log(
    '%c⚠️ 경고!',
    'color: red; font-size: 40px; font-weight: bold;'
  );
  console.log(
    '%c이 브라우저 기능은 개발자를 위한 것입니다.',
    'color: orange; font-size: 16px;'
  );
  console.log(
    '%c누군가 여기에 코드를 붙여넣으라고 했다면, 그것은 사기이며 귀하의 계정에 접근할 수 있습니다.',
    'color: black; font-size: 14px;'
  );
  console.log(
    '%c저작권법 위반: 무단 복제, 배포 시 법적 조치를 받을 수 있습니다.',
    'color: red; font-size: 14px; font-weight: bold;'
  );
}

// ========================================
// 8. 화면 녹화 차단 (조용한 차단)
// ========================================
// Screen Capture API 감지 및 차단
if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
  const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
  
  navigator.mediaDevices.getDisplayMedia = function(...args) {
    // 팝업 없이 로그만 기록
    logSecurityEvent('screen_capture_attempt');
    // 화면 캡처 차단
    return Promise.reject(new Error('Screen capture is not allowed'));
  };
}

// ========================================
// 유틸리티 함수
// ========================================

/**
 * 보안 경고 표시
 */
function showSecurityAlert(message) {
  // 너무 자주 표시되지 않도록 제한
  const lastAlert = localStorage.getItem('lastSecurityAlert');
  const now = Date.now();
  
  if (!lastAlert || now - parseInt(lastAlert) > 5000) { // 5초에 한 번만
    alert(message);
    localStorage.setItem('lastSecurityAlert', now.toString());
  }
}

// ========================================
// 서버 보안 이벤트 로깅
// ========================================
let lastSecurityLogAt = 0;
function logSecurityEvent(eventType, details = null) {
  try {
    if (window.isDevelopment) {
      console.debug(`[SECURITY] ${eventType}`, {
        timestamp: new Date().toISOString(),
        page: window.location.pathname,
        details,
      })
    }
    const now = Date.now();
    // 과도한 로깅 방지 (3초당 1회)
    if (now - lastSecurityLogAt < 3000) return;
    lastSecurityLogAt = now;

    fetch('/api/security/log', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: eventType,
        path: window.location.pathname,
        details
      })
    }).catch(() => {});
  } catch {
    // ignore
  }
}

// ========================================
// 9. 저작권 워터마크 (선택사항)
// ========================================
function addWatermark() {
  // 영상 재생 페이지에만 적용
  if (!window.location.pathname.includes('/learn')) return;
  
  const userName = localStorage.getItem('user_name');
  const userEmail = localStorage.getItem('user_email');
  
  if (userName || userEmail) {
    const watermark = document.createElement('div');
    watermark.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.3);
      color: rgba(255, 255, 255, 0.6);
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 11px;
      pointer-events: none;
      z-index: 9998;
      font-family: monospace;
    `;
    watermark.textContent = userName || userEmail;
    document.body.appendChild(watermark);
  }
}

// 페이지 로드 후 워터마크 추가
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addWatermark);
} else {
  addWatermark();
}

// ========================================
// 10. 정리 (페이지 이탈 시)
// ========================================
window.addEventListener('beforeunload', () => {
  if (devToolsCheckInterval) {
    clearInterval(devToolsCheckInterval);
  }
});

// 개발 환경에서만 로드 완료 로그 출력
if (window.isDevelopment) {
  console.log('✅ 보안 모듈 로드 완료');
}
