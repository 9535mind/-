/**
 * 팝업 관리 시스템
 */

const PopupManager = {
  // 오늘 하루 보지 않기 쿠키 확인
  isTodayClosed(popupId) {
    const cookies = document.cookie.split(';')
    const cookieName = `popup_${popupId}_closed`
    return cookies.some(cookie => cookie.trim().startsWith(cookieName + '='))
  },

  // 오늘 하루 보지 않기 쿠키 설정
  setTodayClosed(popupId) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    document.cookie = `popup_${popupId}_closed=1; expires=${tomorrow.toUTCString()}; path=/`
  },

  // 팝업 생성
  createPopup(popup, index) {
    // 오늘 하루 보지 않기 체크
    if (this.isTodayClosed(popup.id)) {
      return null
    }

    // 팝업 컨테이너 생성
    const popupDiv = document.createElement('div')
    popupDiv.id = `popup-${popup.id}`
    popupDiv.className = 'fixed bg-white rounded-lg shadow-2xl overflow-hidden z-50 popup-window'
    popupDiv.style.width = `${popup.width}px`
    popupDiv.style.maxHeight = `${popup.height}px`
    
    // 위치 계산 (겹치지 않도록 offset 추가)
    const offsetX = index * 30
    const offsetY = index * 30
    popupDiv.style.left = `${popup.position_x + offsetX}px`
    popupDiv.style.top = `${popup.position_y + offsetY}px`

    // 드래그 가능하도록 설정
    let isDragging = false
    let currentX, currentY, initialX, initialY

    // 팝업 내용
    let popupContent = `
      <!-- 헤더 -->
      <div class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 cursor-move flex justify-between items-center popup-header">
        <h3 class="font-bold text-lg">${popup.title}</h3>
        ${popup.show_close_button ? `
          <button onclick="PopupManager.closePopup(${popup.id})" class="text-white hover:text-gray-200">
            <i class="fas fa-times text-xl"></i>
          </button>
        ` : ''}
      </div>

      <!-- 본문 -->
      <div class="overflow-y-auto" style="max-height: ${popup.height - 150}px;">
        ${popup.image_url ? `
          <img src="${popup.image_url}" alt="${popup.title}" class="w-full object-cover" style="max-height: 300px;">
        ` : ''}
        
        <div class="p-6">
          ${popup.content}
        </div>
      </div>

      <!-- 하단 버튼 -->
      <div class="border-t px-4 py-3 bg-gray-50 flex justify-between items-center">
        ${popup.show_today_close ? `
          <label class="flex items-center cursor-pointer">
            <input type="checkbox" id="today-close-${popup.id}" class="mr-2">
            <span class="text-sm text-gray-700">오늘 하루 보지 않기</span>
          </label>
        ` : '<div></div>'}
        
        <div class="flex space-x-2">
          ${popup.link_url ? `
            <a href="${popup.link_url}" target="${popup.link_target}" 
               onclick="PopupManager.trackClick(${popup.id})"
               class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-sm">
              자세히 보기
            </a>
          ` : ''}
          <button onclick="PopupManager.closePopup(${popup.id})" 
                  class="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 text-sm">
            닫기
          </button>
        </div>
      </div>
    `

    popupDiv.innerHTML = popupContent

    // 드래그 이벤트
    const header = popupDiv.querySelector('.popup-header')
    
    header.addEventListener('mousedown', (e) => {
      isDragging = true
      initialX = e.clientX - popupDiv.offsetLeft
      initialY = e.clientY - popupDiv.offsetTop
      popupDiv.style.cursor = 'move'
    })

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        e.preventDefault()
        currentX = e.clientX - initialX
        currentY = e.clientY - initialY
        popupDiv.style.left = currentX + 'px'
        popupDiv.style.top = currentY + 'px'
      }
    })

    document.addEventListener('mouseup', () => {
      isDragging = false
      popupDiv.style.cursor = 'default'
    })

    return popupDiv
  },

  // 팝업 닫기
  closePopup(popupId) {
    const checkbox = document.getElementById(`today-close-${popupId}`)
    if (checkbox && checkbox.checked) {
      this.setTodayClosed(popupId)
    }

    const popup = document.getElementById(`popup-${popupId}`)
    if (popup) {
      popup.style.opacity = '0'
      popup.style.transform = 'scale(0.9)'
      setTimeout(() => {
        popup.remove()
      }, 200)
    }
  },

  // 조회수 추적
  async trackView(popupId) {
    try {
      await axios.post(`/api/popups/${popupId}/view`)
    } catch (error) {
      console.error('Track view error:', error)
    }
  },

  // 클릭수 추적
  async trackClick(popupId) {
    try {
      await axios.post(`/api/popups/${popupId}/click`)
    } catch (error) {
      console.error('Track click error:', error)
    }
  },

  // 팝업 로드 및 표시
  async loadPopups(targetPage = 'home') {
    try {
      const response = await axios.get(`/api/popups/active?page=${targetPage}`)
      const popups = response.data.data

      if (!popups || popups.length === 0) return

      // 최대 5개까지만 표시
      const displayPopups = popups.slice(0, 5)

      // 팝업 표시
      displayPopups.forEach((popup, index) => {
        const popupElement = this.createPopup(popup, index)
        if (popupElement) {
          // 애니메이션 효과
          popupElement.style.opacity = '0'
          popupElement.style.transform = 'scale(0.9)'
          popupElement.style.transition = 'all 0.3s ease'

          document.body.appendChild(popupElement)

          // 조회수 추적
          this.trackView(popup.id)

          // 약간의 딜레이를 두고 표시
          setTimeout(() => {
            popupElement.style.opacity = '1'
            popupElement.style.transform = 'scale(1)'
          }, 100 * index)
        }
      })
    } catch (error) {
      // 팝업 API가 없으면 조용히 무시 (404는 정상)
      if (error.response?.status !== 404) {
        console.error('Load popups error:', error)
      }
    }
  }
}

// CSS 스타일 추가
const popupStyles = document.createElement('style')
popupStyles.textContent = `
  .popup-window {
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: popupFadeIn 0.3s ease;
  }

  @keyframes popupFadeIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .popup-header {
    user-select: none;
  }

  @media (max-width: 640px) {
    .popup-window {
      left: 10px !important;
      right: 10px !important;
      width: calc(100% - 20px) !important;
      max-width: 500px !important;
    }
  }
`
document.head.appendChild(popupStyles)
