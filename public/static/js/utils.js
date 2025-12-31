/**
 * 공통 유틸리티 함수
 */

// Toast 알림 표시
function showToast(message, type = 'info') {
  // Toast 컨테이너가 없으면 생성
  let container = document.getElementById('toastContainer')
  if (!container) {
    container = document.createElement('div')
    container.id = 'toastContainer'
    container.className = 'fixed top-4 right-4 z-50 space-y-2'
    document.body.appendChild(container)
  }

  // Toast 생성
  const toast = document.createElement('div')
  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500'
  }[type] || 'bg-gray-500'

  toast.className = `${bgColor} text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 flex items-center space-x-2 min-w-[300px]`
  
  const icon = {
    success: '<i class="fas fa-check-circle"></i>',
    error: '<i class="fas fa-exclamation-circle"></i>',
    warning: '<i class="fas fa-exclamation-triangle"></i>',
    info: '<i class="fas fa-info-circle"></i>'
  }[type] || '<i class="fas fa-info-circle"></i>'

  toast.innerHTML = `
    ${icon}
    <span>${message}</span>
  `

  // 애니메이션으로 추가
  toast.style.opacity = '0'
  toast.style.transform = 'translateX(100%)'
  container.appendChild(toast)

  setTimeout(() => {
    toast.style.opacity = '1'
    toast.style.transform = 'translateX(0)'
  }, 10)

  // 3초 후 제거
  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateX(100%)'
    setTimeout(() => {
      container.removeChild(toast)
    }, 300)
  }, 3000)
}

// 로딩 스피너 표시
function showLoading(containerId = 'loadingSpinner') {
  const container = document.getElementById(containerId)
  if (!container) return

  container.innerHTML = `
    <div class="flex flex-col items-center justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      <p class="mt-4 text-gray-600">불러오는 중...</p>
    </div>
  `
}

// 에러 메시지 표시
function showError(containerId, message) {
  const container = document.getElementById(containerId)
  if (!container) return

  container.innerHTML = `
    <div class="flex flex-col items-center justify-center py-12">
      <i class="fas fa-exclamation-circle text-5xl text-red-500 mb-4"></i>
      <p class="text-red-600">${message}</p>
    </div>
  `
}

// 날짜 포맷팅
function formatDate(dateString) {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('ko-KR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
}

// 날짜/시간 포맷팅
function formatDateTime(dateString) {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('ko-KR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 금액 포맷팅
function formatCurrency(amount) {
  return amount.toLocaleString('ko-KR') + '원'
}

// 진도율 포맷팅
function formatProgress(progress) {
  return Math.round(progress) + '%'
}

// 진도율 색상
function getProgressColor(progress) {
  if (progress >= 80) return 'bg-green-500'
  if (progress >= 50) return 'bg-yellow-500'
  return 'bg-red-500'
}

// 수강 상태 배지
function getStatusBadge(status) {
  const badges = {
    active: '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">수강중</span>',
    completed: '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">수료</span>',
    expired: '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">기간만료</span>',
    refunded: '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">환불</span>'
  }
  return badges[status] || status
}

// 결제 상태 배지
function getPaymentStatusBadge(status) {
  const badges = {
    pending: '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">대기</span>',
    completed: '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">완료</span>',
    failed: '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">실패</span>',
    cancelled: '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">취소</span>',
    refunded: '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">환불</span>'
  }
  return badges[status] || status
}

// 시간 경과 표시 (예: 3일 전)
function timeAgo(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}일 전`
  if (hours > 0) return `${hours}시간 전`
  if (minutes > 0) return `${minutes}분 전`
  return '방금 전'
}

// 남은 일수 계산
function daysRemaining(endDate) {
  const end = new Date(endDate)
  const now = new Date()
  const diff = end - now
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  
  if (days < 0) return '기간 만료'
  if (days === 0) return '오늘 마감'
  return `${days}일 남음`
}

// 모달 열기
function openModal(modalId) {
  const modal = document.getElementById(modalId)
  if (modal) {
    modal.classList.remove('hidden')
    document.body.style.overflow = 'hidden'
  }
}

// 모달 닫기
function closeModal(modalId) {
  const modal = document.getElementById(modalId)
  if (modal) {
    modal.classList.add('hidden')
    document.body.style.overflow = 'auto'
  }
}

// Confirm 다이얼로그
function confirm(message, onConfirm) {
  if (window.confirm(message)) {
    onConfirm()
  }
}

// 페이지네이션 HTML 생성
function renderPagination(pagination, containerId, onPageChange) {
  const container = document.getElementById(containerId)
  if (!container || !pagination) return

  const { page, totalPages } = pagination
  let html = '<div class="flex justify-center items-center space-x-2 mt-6">'

  // 이전 버튼
  if (page > 1) {
    html += `<button onclick="${onPageChange}(${page - 1})" class="px-3 py-2 border rounded hover:bg-gray-100">이전</button>`
  }

  // 페이지 번호
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
    const active = i === page ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100'
    html += `<button onclick="${onPageChange}(${i})" class="px-3 py-2 border rounded ${active}">${i}</button>`
  }

  // 다음 버튼
  if (page < totalPages) {
    html += `<button onclick="${onPageChange}(${page + 1})" class="px-3 py-2 border rounded hover:bg-gray-100">다음</button>`
  }

  html += '</div>'
  container.innerHTML = html
}

// API 요청 헬퍼
async function apiRequest(method, url, data = null) {
  const token = localStorage.getItem('session_token') || sessionStorage.getItem('session_token')
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  }
  
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`
  }
  
  if (data) {
    options.body = JSON.stringify(data)
  }
  
  try {
    const response = await fetch(url, options)
    
    // HTTP 에러 상태 체크
    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText} - ${url}`)
      
      // HTML 에러 페이지가 반환된 경우
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('text/html')) {
        return {
          success: false,
          error: `서버 오류 (${response.status})`,
          message: `API 요청 실패: ${url}`
        }
      }
    }
    
    const result = await response.json()
    return result
  } catch (error) {
    console.error('API Request failed:', error, 'URL:', url)
    return {
      success: false,
      error: error.message,
      message: '네트워크 오류가 발생했습니다.'
    }
  }
}

// 관리자 권한 확인 (페이지 진입 시)
async function requireAdmin() {
  const token = localStorage.getItem('session_token') || sessionStorage.getItem('session_token')
  
  if (!token) {
    alert('로그인이 필요합니다.')
    window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname)
    return null
  }
  
  try {
    const response = await apiRequest('GET', '/api/auth/me')
    
    if (!response.success) {
      alert('인증에 실패했습니다.')
      window.location.href = '/login'
      return null
    }
    
    const user = response.data
    
    if (user.role !== 'admin') {
      alert('관리자 권한이 필요합니다.')
      window.location.href = '/'
      return null
    }
    
    return user
  } catch (error) {
    console.error('Auth error:', error)
    alert('인증에 실패했습니다.')
    window.location.href = '/login'
    return null
  }
}

// 로그아웃
async function logout() {
  const token = localStorage.getItem('session_token') || sessionStorage.getItem('session_token')
  
  if (token) {
    try {
      await apiRequest('POST', '/api/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }
  
  localStorage.removeItem('session_token')
  localStorage.removeItem('user')
  sessionStorage.removeItem('session_token')
  
  window.location.href = '/login'
}
