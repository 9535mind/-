/**
 * 모달 드래그 기능
 */

let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;
let xOffset = 0;
let yOffset = 0;

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('courseModalContent');
  const header = document.getElementById('modalHeader');
  
  if (!modal || !header) return;

  header.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);

  function dragStart(e) {
    // 닫기 버튼 클릭 시 드래그 방지
    if (e.target.closest('button')) return;
    
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;

    if (e.target === header || header.contains(e.target)) {
      isDragging = true;
    }
  }

  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;

      xOffset = currentX;
      yOffset = currentY;

      setTranslate(currentX, currentY, modal);
    }
  }

  function dragEnd() {
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
  }

  function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate(${xPos}px, ${yPos}px)`;
  }
});

/**
 * AI 설명 생성
 */
async function generateDescription() {
  const titleInput = document.getElementById('courseTitle');
  const descriptionInput = document.getElementById('courseDescription');
  
  const title = titleInput.value.trim();
  
  if (!title) {
    alert('먼저 강좌명을 입력해주세요.');
    titleInput.focus();
    return;
  }
  
  // 기존 설명이 있으면 확인
  if (descriptionInput.value.trim()) {
    if (!confirm('기존 설명을 AI가 생성한 설명으로 덮어쓰시겠습니까?')) {
      return;
    }
  }
  
  descriptionInput.value = '✨ AI가 설명을 생성하고 있습니다...';
  descriptionInput.disabled = true;
  
  try {
    const token = AuthManager.getSessionToken();
    const response = await fetch('/api/ai/generate-description', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title })
    });
    
    const result = await response.json();
    
    if (result.success) {
      descriptionInput.value = result.data.description;
    } else {
      descriptionInput.value = '';
      alert(result.error || 'AI 설명 생성에 실패했습니다.');
    }
  } catch (error) {
    console.error('Generate description error:', error);
    descriptionInput.value = '';
    alert('AI 설명 생성 중 오류가 발생했습니다.');
  } finally {
    descriptionInput.disabled = false;
  }
}
