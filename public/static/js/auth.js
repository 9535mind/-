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
    if (error.response?.status === 401) {
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

  console.log('[updateHeader] 시작')
  console.log('[updateHeader] adminLink 요소:', adminLink)

  if (AuthManager.isLoggedIn()) {
    const user = AuthManager.getUser()
    console.log('[updateHeader] 로그인 사용자:', user)
    console.log('[updateHeader] 사용자 역할:', user?.role)
    
    if (authButtons) authButtons.style.display = 'none'
    if (userMenu) userMenu.style.display = 'flex'
    if (userName && user) userName.textContent = user.name + ' 님'
    
    // 관리자 링크 표시
    if (adminLink && user && user.role === 'admin') {
      console.log('[updateHeader] ✅ 관리자 링크 표시!')
      adminLink.style.display = 'inline-block'
    } else {
      console.log('[updateHeader] ⚠️ 관리자 링크 표시 실패:', {
        adminLink: !!adminLink,
        user: !!user,
        role: user?.role
      })
    }
  } else {
    console.log('[updateHeader] 로그인하지 않음')
    if (authButtons) authButtons.style.display = 'flex'
    if (userMenu) userMenu.style.display = 'none'
    if (adminLink) adminLink.style.display = 'none'
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
