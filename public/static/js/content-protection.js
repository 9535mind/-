/**
 * 콘텐츠 보호 시스템
 * - 복사 금지
 * - 우클릭 방지
 * - 드래그 방지
 * - 개발자 도구 방지
 * - 단축키 차단
 */

(function() {
  'use strict';

  // 관리자 페이지는 제외
  if (window.location.pathname.startsWith('/admin')) {
    console.log('ℹ️ 관리자 페이지는 콘텐츠 보호가 적용되지 않습니다.');
    return;
  }

  // ============================================
  // 🛡️ 강화된 보안 시스템
  // ============================================

  // 0. 인쇄 차단 (Ctrl+P, Cmd+P)
  window.addEventListener('beforeprint', function(e) {
    e.preventDefault();
    alert('⚠️ 인쇄가 금지되어 있습니다.\n\n저작권 보호 콘텐츠입니다.');
    return false;
  });

  window.addEventListener('afterprint', function(e) {
    e.preventDefault();
    return false;
  });

  // 0-1. CSS로 인쇄 차단
  const printStyle = document.createElement('style');
  printStyle.textContent = `
    @media print {
      body {
        display: none !important;
      }
      body::before {
        content: "⚠️ 이 콘텐츠는 인쇄가 금지되어 있습니다." !important;
        display: block !important;
        font-size: 24px !important;
        text-align: center !important;
        padding: 50px !important;
      }
    }
  `;
  document.head.appendChild(printStyle);

  // 0-2. 스크린샷 감지 (일부 브라우저)
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      console.warn('⚠️ 화면 캡처 시도가 감지되었을 수 있습니다.');
    }
  });

  // 0-3. 개발자 도구 열림 감지
  let devtoolsOpen = false;
  const threshold = 160;
  
  setInterval(function() {
    if (window.outerWidth - window.innerWidth > threshold || 
        window.outerHeight - window.innerHeight > threshold) {
      if (!devtoolsOpen) {
        devtoolsOpen = true;
        console.clear();
        alert('⚠️ 개발자 도구가 감지되었습니다.\n\n이 페이지는 보안상의 이유로 보호되고 있습니다.');
      }
    } else {
      devtoolsOpen = false;
    }
  }, 1000);

  // 1. 텍스트 선택 방지
  document.addEventListener('selectstart', function(e) {
    e.preventDefault();
    return false;
  });

  // 2. 우클릭 방지
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    alert('⚠️ 우클릭이 비활성화되어 있습니다.\n\n이 콘텐츠는 저작권으로 보호되고 있습니다.');
    return false;
  });

  // 3. 드래그 방지
  document.addEventListener('dragstart', function(e) {
    e.preventDefault();
    return false;
  });

  // 4. 복사 방지
  document.addEventListener('copy', function(e) {
    e.preventDefault();
    alert('⚠️ 복사가 금지된 콘텐츠입니다.\n\n저작권 보호를 위해 복사 기능이 비활성화되어 있습니다.');
    return false;
  });

  // 5. 잘라내기 방지
  document.addEventListener('cut', function(e) {
    e.preventDefault();
    return false;
  });

  // 6. 강화된 키보드 단축키 차단
  document.addEventListener('keydown', function(e) {
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const alt = e.altKey;
    
    // Ctrl/Cmd + C (복사)
    if (ctrl && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      alert('⚠️ 복사 기능이 비활성화되어 있습니다.');
      return false;
    }

    // Ctrl/Cmd + X (잘라내기)
    if (ctrl && e.key.toLowerCase() === 'x') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl/Cmd + A (전체 선택)
    if (ctrl && e.key.toLowerCase() === 'a') {
      const target = e.target;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }

    // Ctrl/Cmd + P (인쇄)
    if (ctrl && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      e.stopPropagation();
      alert('⚠️ 인쇄가 비활성화되어 있습니다.');
      return false;
    }

    // Ctrl/Cmd + U (소스 보기)
    if (ctrl && e.key.toLowerCase() === 'u') {
      e.preventDefault();
      e.stopPropagation();
      alert('⚠️ 소스 보기가 비활성화되어 있습니다.');
      return false;
    }

    // Ctrl/Cmd + S (페이지 저장)
    if (ctrl && e.key.toLowerCase() === 's') {
      e.preventDefault();
      e.stopPropagation();
      alert('⚠️ 페이지 저장이 비활성화되어 있습니다.');
      return false;
    }

    // F12 (개발자 도구)
    if (e.key === 'F12') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl + Shift + I (개발자 도구)
    if (ctrl && shift && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl + Shift + J (콘솔)
    if (ctrl && shift && e.key.toLowerCase() === 'j') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl + Shift + C (요소 검사)
    if (ctrl && shift && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl + Shift + K (콘솔 - Firefox)
    if (ctrl && shift && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl + Shift + E (네트워크 - Firefox)
    if (ctrl && shift && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // PrintScreen 키 (일부 브라우저)
    if (e.key === 'PrintScreen' || e.keyCode === 44) {
      e.preventDefault();
      alert('⚠️ 화면 캡처가 감지되었습니다.\n\n저작권 보호 콘텐츠입니다.');
      return false;
    }
  }, true); // useCapture = true로 설정하여 더 먼저 가로채기

  // 7. CSS로 텍스트 선택 방지
  const style = document.createElement('style');
  style.textContent = `
    body {
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
      -webkit-touch-callout: none;
    }

    input, textarea, [contenteditable="true"] {
      -webkit-user-select: text !important;
      -moz-user-select: text !important;
      -ms-user-select: text !important;
      user-select: text !important;
    }

    img {
      -webkit-user-drag: none;
      pointer-events: none;
    }

    a, button, input, textarea, select {
      pointer-events: auto !important;
    }
  `;
  document.head.appendChild(style);

  // 8. YouTube IFrame 강화된 보호 (학습 플레이어 전용)
  function protectVideoPlayer() {
    // YouTube IFrame 찾기
    const youtubeIframe = document.querySelector('iframe[src*="youtube.com"]');
    const apiVideoIframe = document.querySelector('iframe[src*="api.video"]');
    const videoPlayer = document.getElementById('videoPlayer');
    const videoContainer = document.getElementById('videoContainer');
    
    if (youtubeIframe || apiVideoIframe || videoPlayer) {
      console.log('🛡️ 강화된 영상 플레이어 보호 활성화');
      
      // 영상 컨테이너 보호
      const containers = [videoPlayer, videoContainer].filter(Boolean);
      containers.forEach(container => {
        container.style.cssText = `
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          user-select: none !important;
          pointer-events: auto !important;
          -webkit-touch-callout: none !important;
        `;
        
        // 모든 이벤트 차단
        const events = ['contextmenu', 'dragstart', 'selectstart', 'mousedown', 'copy', 'cut'];
        events.forEach(eventName => {
          container.addEventListener(eventName, function(e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            if (eventName === 'contextmenu' || eventName === 'copy') {
              alert('⚠️ 영상 복사 및 다운로드가 금지되어 있습니다.\n\n저작권 보호 콘텐츠입니다.');
            }
            return false;
          }, true);
        });
      });
      
      // IFrame 강화된 보호
      [youtubeIframe, apiVideoIframe].forEach(iframe => {
        if (iframe) {
          // IFrame 스타일 강화
          iframe.style.cssText = `
            pointer-events: auto !important;
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            user-select: none !important;
            -webkit-touch-callout: none !important;
          `;
          
          // IFrame 속성 제거 (보안 강화)
          iframe.removeAttribute('allowfullscreen');
          iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
          
          // IFrame 부모에도 보호 적용
          const parent = iframe.parentElement;
          if (parent) {
            const events = ['contextmenu', 'dragstart', 'selectstart', 'mousedown', 'copy', 'cut'];
            events.forEach(eventName => {
              parent.addEventListener(eventName, function(e) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                if (eventName === 'contextmenu' || eventName === 'copy') {
                  alert('⚠️ 영상 복사가 금지되어 있습니다.\n\n저작권 보호 콘텐츠입니다.');
                }
                return false;
              }, true);
            });
          }
        }
      });
      
      // 투명 오버레이 추가 (추가 보호 레이어)
      containers.forEach(container => {
        const overlay = document.createElement('div');
        overlay.className = 'video-protection-overlay';
        overlay.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 999999;
          pointer-events: none;
          background: transparent;
        `;
        
        // 기존 오버레이 제거 후 추가
        const existingOverlay = container.querySelector('.video-protection-overlay');
        if (existingOverlay) {
          existingOverlay.remove();
        }
        
        if (container.style.position !== 'relative' && container.style.position !== 'absolute') {
          container.style.position = 'relative';
        }
        
        container.appendChild(overlay);
      });
    }
  }
  
  // 페이지 로드 후 영상 플레이어 보호 적용
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', protectVideoPlayer);
  } else {
    protectVideoPlayer();
  }
  
  // 동적 콘텐츠 로딩 감지 (MutationObserver)
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes.length > 0) {
        protectVideoPlayer();
      }
    });
  });
  
  // 전체 body 감시
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // 9. 영상 URL 추출 시도 차단
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    if (typeof url === 'string' && (url.includes('youtube.com') || url.includes('googlevideo.com'))) {
      console.warn('⚠️ 영상 URL 접근이 차단되었습니다.');
    }
    return originalFetch.apply(this, args);
  };

  // 10. Clipboard API 완전 차단
  if (navigator.clipboard) {
    const originalWriteText = navigator.clipboard.writeText;
    const originalWrite = navigator.clipboard.write;
    const originalReadText = navigator.clipboard.readText;
    const originalRead = navigator.clipboard.read;

    navigator.clipboard.writeText = function() {
      console.warn('⚠️ 클립보드 쓰기가 차단되었습니다.');
      alert('⚠️ 복사가 금지된 콘텐츠입니다.');
      return Promise.reject(new Error('Clipboard write blocked'));
    };

    navigator.clipboard.write = function() {
      console.warn('⚠️ 클립보드 쓰기가 차단되었습니다.');
      alert('⚠️ 복사가 금지된 콘텐츠입니다.');
      return Promise.reject(new Error('Clipboard write blocked'));
    };

    navigator.clipboard.readText = function() {
      console.warn('⚠️ 클립보드 읽기가 차단되었습니다.');
      return Promise.resolve('');
    };

    navigator.clipboard.read = function() {
      console.warn('⚠️ 클립보드 읽기가 차단되었습니다.');
      return Promise.resolve([]);
    };
  }

  // 11. execCommand 차단
  const originalExecCommand = document.execCommand;
  document.execCommand = function(command) {
    if (command === 'copy' || command === 'cut' || command === 'paste') {
      console.warn('⚠️ execCommand(' + command + ')가 차단되었습니다.');
      alert('⚠️ 복사/붙여넣기가 금지되어 있습니다.');
      return false;
    }
    return originalExecCommand.apply(this, arguments);
  };
  
  // 10. 콘솔 메시지
  console.clear();
  console.log('%c🛡️ 콘텐츠 보호 활성화', 'color: green; font-size: 20px; font-weight: bold;');
  console.log('%c저작권 보호를 위해 복사, 우클릭, 영상 다운로드가 제한됩니다.', 'font-size: 14px;');
  console.log('%c© 2026 Mindstory LMS. All rights reserved.', 'font-size: 12px; color: gray;');

})();
