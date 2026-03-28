/**
 * 인증 관련 공통 함수
 */

// Axios 전역 설정: Cookie 자동 전송 활성화
axios.defaults.withCredentials = true;

// AuthManager 클래스 (HttpOnly 쿠키 기반)
class AuthManager {
  static saveSession(user) {
    localStorage.setItem('user', JSON.stringify(user))
  }

  static getSessionToken() {
    return null
  }

  static getUser() {
    const userJson = localStorage.getItem('user')
    return userJson ? JSON.parse(userJson) : null
  }

  static getCurrentUser() {
    return this.getUser()
  }

  static isLoggedIn() {
    return !!this.getUser()
  }

  static isAdmin() {
    const user = this.getUser()
    return user && user.role !== 'student'
  }

  static clearSession() {
    localStorage.removeItem('user')
  }
}

// AuthManager를 window 객체에 명시적으로 등록
window.AuthManager = AuthManager

// 세션 토큰 가져오기 (쿠키 전용 운영으로 토큰 노출 금지)
function getSessionToken() {
  return null;
}

// 세션 토큰 저장 (호환용 no-op)
function setSessionToken(token, remember = false) {
  return;
}

// 세션 토큰 삭제 (호환용 no-op)
function clearSessionToken() {
  return;
}

// 로그아웃
async function logout() {
  try {
    await axios.post('/api/auth/logout', {});
  } catch (error) {
    console.error('Logout error:', error);
  }
  
  clearSessionToken();
  window.location.href = '/login';
}

// 현재 사용자 정보 가져오기 (리다이렉트 제거)
async function getCurrentUser() {
  try {
    const response = await axios.get('/api/auth/me');
    
    if (response.data.success) {
      return response.data.data;
    } else {
      console.warn('⚠️ Auth failed:', response.data.error);
      return null;
    }
  } catch (error) {
    // 로그인 전/만료 상태(401)는 정상 시나리오이므로 조용히 처리
    if (error.response?.status === 401) {
      return null;
    }
    console.error('Get user error:', error);
    return null;
  }
}

// 관리자 권한 확인
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role === 'student') {
    alert('관리자 권한이 필요합니다.');
    window.location.href = '/';
    return null;
  }
  return user;
}

// API 요청 헬퍼 (자동으로 토큰 포함)
async function apiRequest(method, url, data = null) {
  const config = {
    method,
    url
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

// 서버 세션 쿠키 기준으로 localStorage 동기화
async function syncUserSession() {
  const serverUser = await getCurrentUser()
  if (serverUser) {
    AuthManager.saveSession(serverUser)
    return serverUser
  }
  AuthManager.clearSession()
  return null
}

// 헤더 업데이트 (로그인 상태 표시)
async function updateHeader() {
  const authButtons = document.getElementById('headerAuthButtons')
  const userMenu = document.getElementById('headerUserMenu')
  const userName = document.getElementById('headerUserName')
  const adminLink = document.getElementById('adminLink')
  const adminModeSwitch = document.getElementById('adminModeSwitch')

  // 먼저 로컬 정보를 보여주고, 서버 세션으로 최종 동기화
  let user = AuthManager.getUser()
  if (!user) {
    user = await syncUserSession()
  } else {
    // 로컬에 값이 있어도 권한/이름 변경을 반영하기 위해 최신화
    user = await syncUserSession()
  }

  if (user) {
    
    if (authButtons) authButtons.style.display = 'none'
    if (userMenu) userMenu.style.display = 'flex'
    if (userName) userName.textContent = user.name + ' 님'
    
    // 로그인 사용자에게 관리자 페이지 진입 버튼은 항상 노출
    // 실제 접근 권한은 서버(/admin, /api/admin)에서 최종 검증한다.
    if (adminLink) adminLink.style.display = 'none'
    if (adminModeSwitch) adminModeSwitch.style.display = 'flex'
  } else {
    if (authButtons) authButtons.style.display = 'flex'
    if (userMenu) userMenu.style.display = 'none'
    if (adminLink) adminLink.style.display = 'none'
    if (adminModeSwitch) adminModeSwitch.style.display = 'none'
  }
}

// 로그아웃 처리
async function handleLogout() {
  try {
    await axios.post('/api/auth/logout', {})
  } catch (error) {
    console.error('Logout error:', error)
  }

  AuthManager.clearSession()
  window.location.href = '/login'
}
