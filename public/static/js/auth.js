/**
 * 인증 관련 유틸리티
 */

// 세션 토큰 저장/조회
const AuthManager = {
  // 로그인 상태 확인
  isLoggedIn() {
    return !!localStorage.getItem('session_token')
  },

  // 세션 토큰 저장
  saveSession(token, user) {
    localStorage.setItem('session_token', token)
    localStorage.setItem('user', JSON.stringify(user))
  },

  // 세션 토큰 가져오기
  getToken() {
    return localStorage.getItem('session_token')
  },

  // 사용자 정보 가져오기
  getUser() {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  },

  // 로그아웃
  logout() {
    localStorage.removeItem('session_token')
    localStorage.removeItem('user')
  },

  // 관리자 여부 확인
  isAdmin() {
    const user = this.getUser()
    return user && user.role === 'admin'
  },

  // API 요청 헤더 생성
  getAuthHeaders() {
    const token = this.getToken()
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }
}

// Axios 인터셉터 설정
if (typeof axios !== 'undefined') {
  // 요청 인터셉터 - 자동으로 토큰 추가
  axios.interceptors.request.use(config => {
    const token = AuthManager.getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  // 응답 인터셉터 - 401 에러 시 로그인 페이지로
  axios.interceptors.response.use(
    response => response,
    error => {
      if (error.response && error.response.status === 401) {
        AuthManager.logout()
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname)
        }
      }
      return Promise.reject(error)
    }
  )
}

// 페이지 로드 시 로그인 필수 체크
function requireAuth() {
  if (!AuthManager.isLoggedIn()) {
    window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname)
    return false
  }
  return true
}

// 관리자 권한 필수 체크
function requireAdmin() {
  if (!AuthManager.isLoggedIn()) {
    window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname)
    return false
  }
  if (!AuthManager.isAdmin()) {
    alert('관리자 권한이 필요합니다.')
    window.location.href = '/'
    return false
  }
  return true
}

// 헤더 업데이트 (로그인 상태 표시)
function updateHeader() {
  const headerAuthButtons = document.getElementById('headerAuthButtons')
  const headerUserMenu = document.getElementById('headerUserMenu')
  
  if (!headerAuthButtons || !headerUserMenu) return

  if (AuthManager.isLoggedIn()) {
    const user = AuthManager.getUser()
    headerAuthButtons.style.display = 'none'
    headerUserMenu.style.display = 'flex'
    
    const userName = document.getElementById('headerUserName')
    if (userName) {
      userName.textContent = user.name
    }
  } else {
    headerAuthButtons.style.display = 'flex'
    headerUserMenu.style.display = 'none'
  }
}

// 로그아웃 처리
async function handleLogout() {
  try {
    await axios.post('/api/auth/logout')
  } catch (error) {
    console.error('Logout error:', error)
  } finally {
    AuthManager.logout()
    window.location.href = '/'
  }
}
