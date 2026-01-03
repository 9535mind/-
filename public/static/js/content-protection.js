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
    e.clipboardData.setData('text/plain', '⚠️ 이 콘텐츠는 복사가 금지되어 있습니다.');
    alert('⚠️ 복사가 금지된 콘텐츠입니다.\n\n저작권 보호를 위해 복사 기능이 비활성화되어 있습니다.');
    return false;
  });

  // 5. 잘라내기 방지
  document.addEventListener('cut', function(e) {
    e.preventDefault();
    return false;
  });

  // 6. 붙여넣기 방지 (입력 필드는 제외)
  document.addEventListener('paste', function(e) {
    const target = e.target;
    if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      return false;
    }
  });

  // 7. 키보드 단축키 차단
  document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + C (복사)
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      e.preventDefault();
      alert('⚠️ 복사 기능이 비활성화되어 있습니다.');
      return false;
    }

    // Ctrl/Cmd + X (잘라내기)
    if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
      e.preventDefault();
      return false;
    }

    // Ctrl/Cmd + A (전체 선택)
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      // 입력 필드에서는 허용
      const target = e.target;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        return false;
      }
    }

    // Ctrl/Cmd + U (소스 보기)
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
      e.preventDefault();
      alert('⚠️ 소스 보기가 비활성화되어 있습니다.');
      return false;
    }

    // Ctrl/Cmd + S (페이지 저장)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      alert('⚠️ 페이지 저장이 비활성화되어 있습니다.');
      return false;
    }

    // Ctrl/Cmd + P (인쇄)
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      alert('⚠️ 인쇄 기능이 비활성화되어 있습니다.');
      return false;
    }

    // F12 (개발자 도구)
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }

    // Ctrl + Shift + I (개발자 도구)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      return false;
    }

    // Ctrl + Shift + J (콘솔)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') {
      e.preventDefault();
      return false;
    }

    // Ctrl + Shift + C (요소 검사)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      return false;
    }
  });

  // 8. CSS로 텍스트 선택 방지
  const style = document.createElement('style');
  style.textContent = `
    body {
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
      -webkit-touch-callout: none;
    }

    /* 입력 필드는 선택 가능 */
    input, textarea, [contenteditable="true"] {
      -webkit-user-select: text !important;
      -moz-user-select: text !important;
      -ms-user-select: text !important;
      user-select: text !important;
    }

    /* 이미지 드래그 방지 */
    img {
      -webkit-user-drag: none;
      -khtml-user-drag: none;
      -moz-user-drag: none;
      -o-user-drag: none;
      user-drag: none;
      pointer-events: none;
    }

    /* 영상 드래그 방지 */
    video, iframe {
      -webkit-user-drag: none;
      pointer-events: auto;
    }

    /* 링크는 클릭 가능하게 */
    a, button, input, textarea, select, [role="button"] {
      pointer-events: auto !important;
    }
  `;
  document.head.appendChild(style);

  // 9. 개발자 도구 감지 (일부 브라우저)
  let devtoolsOpen = false;
  const detectDevTools = () => {
    const threshold = 160;
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
    
    if (widthThreshold || heightThreshold) {
      if (!devtoolsOpen) {
        devtoolsOpen = true;
        console.clear();
        console.log('%c⚠️ 경고', 'color: red; font-size: 30px; font-weight: bold;');
        console.log('%c이 콘텐츠는 저작권으로 보호되고 있습니다.', 'font-size: 16px;');
        console.log('%c무단 복제 및 배포는 법적 책임을 물을 수 있습니다.', 'font-size: 14px; color: orange;');
      }
    } else {
      devtoolsOpen = false;
    }
  };

  // 개발자 도구 감지 간격
  setInterval(detectDevTools, 1000);

  // 10. 콘솔 메시지
  console.clear();
  console.log('%c🛡️ 콘텐츠 보호 시스템 활성화', 'color: green; font-size: 20px; font-weight: bold;');
  console.log('%c저작권 보호를 위해 복사, 우클릭, 개발자 도구가 제한됩니다.', 'font-size: 14px;');
  console.log('%cⓒ 2026 Mindstory LMS. All rights reserved.', 'font-size: 12px; color: gray;');

  // 11. 페이지 로드 완료 시 워터마크 추가 (선택사항)
  window.addEventListener('load', function() {
    // 워터마크 추가 (선택사항 - 주석 제거하여 활성화)
    /*
    const watermark = document.createElement('div');
    watermark.innerHTML = '© Mindstory LMS';
    watermark.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      font-size: 12px;
      color: rgba(0, 0, 0, 0.3);
      pointer-events: none;
      z-index: 9999;
      user-select: none;
    `;
    document.body.appendChild(watermark);
    */
  });

  // 12. 스크린샷 감지 시도 (완벽하지 않음)
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      // 페이지가 숨겨졌을 때 (Alt+Tab, 스크린샷 도구 등)
      console.log('⚠️ 페이지가 비활성화되었습니다.');
    }
  });

  // 13. Print Screen 키 감지 (제한적)
  document.addEventListener('keyup', function(e) {
    if (e.key === 'PrintScreen') {
      navigator.clipboard.writeText('');
      alert('⚠️ 스크린샷이 제한되어 있습니다.\n\n이 콘텐츠는 저작권으로 보호되고 있습니다.');
    }
  });

  // 14. 관리자 페이지는 제외
  if (window.location.pathname.startsWith('/admin')) {
    console.log('ℹ️ 관리자 페이지는 콘텐츠 보호가 완화됩니다.');
  }

})();
