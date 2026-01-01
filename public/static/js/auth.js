/**
 * 인증 관련 공통 함수
 */

// AuthManager 클래스
class AuthManager {
  static saveSession(token, user) {
    localStorage.setItem('session_token', token)
    localStorage.setItem('user', JSON.stringify(user))
  }

  static getSessionToken() {
    return localStorage.getItem('session_token') || sessionStorage.getItem('session_token')
  }

  static getUser() {
    const userJson = localStorage.getItem('user')
    return userJson ? JSON.parse(userJson) : null
  }

  static getCurrentUser() {
    return this.getUser()
  }

  static isLoggedIn() {
    return !!this.getSessionToken()
  }

  static isAdmin() {
    const user = this.getUser()
    return user && user.role === 'admin'
  }

  static clearSession() {
    localStorage.removeItem('session_token')
    localStorage.removeItem('user')
    sessionStorage.removeItem('session_token')
  }
}

// AuthManager를 window 객체에 명시적으로 등록
window.AuthManager = AuthManager

// 세션 토큰 가져오기
function getSessionToken() {
  return localStorage.getItem('session_token') || sessionStorage.getItem('session_token');
}

// 세션 토큰 저장
function setSessionToken(token, remember = false) {
  if (remember) {
    localStorage.setItem('session_token', token);
  } else {
    sessionStorage.setItem('session_token', token);
  }
}

// 세션 토큰 삭제
function clearSessionToken() {
  localStorage.removeItem('session_token');
  sessionStorage.removeItem('session_token');
}

// 로그아웃
async function logout() {
  const token = getSessionToken();
  if (token) {
    try {
      await axios.post('/api/auth/logout', {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
  
  clearSessionToken();
  window.location.href = '/login';
}

// 현재 사용자 정보 가져오기
async function getCurrentUser() {
  const token = getSessionToken();
  if (!token) {
    window.location.href = '/login';
    return null;
  }

  try {
    const response = await axios.get('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.data.success) {
      return response.data.data;
    } else {
      clearSessionToken();
      window.location.href = '/login';
      return null;
    }
  } catch (error) {
    console.error('Get user error:', error);
    clearSessionToken();
    window.location.href = '/login';
    return null;
  }
}

// 관리자 권한 확인
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    alert('관리자 권한이 필요합니다.');
    window.location.href = '/';
    return null;
  }
  return user;
}

// API 요청 헬퍼 (자동으로 토큰 포함)
async function apiRequest(method, url, data = null) {
  const token = getSessionToken();
  const config = {
    method,
    url,
    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
  };

  if (data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error('❌ API Request failed:', {
      method,
      url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
    if (error.response?.status === 401) {
      console.warn('⚠️ Unauthorized - redirecting to login');
      clearSessionToken();
      window.location.href = '/login';
    }
    throw error;
  }
}

// 헤더 업데이트 (로그인 상태 표시)
function updateHeader() {
  const authButtons = document.getElementById('headerAuthButtons')
  const userMenu = document.getElementById('headerUserMenu')
  const userName = document.getElementById('headerUserName')
  const adminLink = document.getElementById('adminLink')
  const adminModeSwitch = document.getElementById('adminModeSwitch')

  if (AuthManager.isLoggedIn()) {
    const user = AuthManager.getUser()
    
    if (authButtons) authButtons.style.display = 'none'
    if (userMenu) userMenu.style.display = 'flex'
    if (userName && user) userName.textContent = user.name + ' 님'
    
    // 관리자인 경우 모드 전환 버튼 표시
    if (user && user.role === 'admin') {
      // 이전 adminLink는 숨김 (모드 전환 버튼으로 대체)
      if (adminLink) adminLink.style.display = 'none'
      
      // 관리자 모드 전환 버튼 표시
      if (adminModeSwitch) adminModeSwitch.style.display = 'flex'
    }
  } else {
    if (authButtons) authButtons.style.display = 'flex'
    if (userMenu) userMenu.style.display = 'none'
    if (adminLink) adminLink.style.display = 'none'
    if (adminModeSwitch) adminModeSwitch.style.display = 'none'
  }
}

// 로그아웃 처리
async function handleLogout() {
  const token = AuthManager.getSessionToken()
  if (token) {
    try {
      await axios.post('/api/auth/logout', {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  AuthManager.clearSession()
  window.location.href = '/login'
}
