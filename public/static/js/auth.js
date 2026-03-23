/**
 * 인증 관련 공통 함수
 */

// Axios 전역 설정: Cookie 자동 전송 활성화
axios.defaults.withCredentials = true;

// 🔥 Axios 인터셉터: 모든 요청에 자동으로 토큰 붙이기
axios.interceptors.request.use(
  (config) => {
    // localStorage 또는 sessionStorage에서 토큰 가져오기
    const token = localStorage.getItem('session_token') || sessionStorage.getItem('session_token');
    
    // 토큰이 있으면 Authorization 헤더에 추가
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // withCredentials 강제 활성화 (쿠키 기반 인증용)
    config.withCredentials = true;
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 🔥 Axios 응답 인터셉터: 401 에러 시 자동 로그아웃
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 401 Unauthorized: 세션 만료 또는 인증 실패
    if (error.response && error.response.status === 401) {
      console.warn('⚠️ 인증 실패 (401) - 로그인 페이지로 이동');
      
      // 세션 정리
      localStorage.removeItem('session_token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('session_token');
      
      // 로그인 페이지로 리다이렉트 (현재 페이지를 redirect 파라미터로 전달)
      const currentPath = window.location.pathname;
      if (currentPath !== '/login') {
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
      }
    }
    
    return Promise.reject(error);
  }
);

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
  try {
    // 이제 axios 인터셉터가 자동으로 토큰을 붙임
    await axios.post('/api/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
  }
  
  // 세션 정리
  AuthManager.clearSession();
  clearSessionToken();
  
  // 로그인 페이지로 이동
  window.location.href = '/login';
}

// 현재 사용자 정보 가져오기 (리다이렉트 제거)
async function getCurrentUser() {
  const token = getSessionToken();
  if (!token) {
    console.warn('⚠️ No session token found');
    return null;
  }

  try {
    // 이제 axios 인터셉터가 자동으로 토큰을 붙임
    const response = await axios.get('/api/auth/me');
    
    if (response.data.success) {
      return response.data.data;
    } else {
      console.warn('⚠️ Auth failed:', response.data.error);
      return null;
    }
  } catch (error) {
    console.error('Get user error:', error);
    if (error.response?.status === 401) {
      console.warn('⚠️ Unauthorized - token may be expired');
    }
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

// API 요청 헬퍼 (자동으로 토큰 포함 - 이제 인터셉터가 처리)
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
    
    // 401 에러는 이미 응답 인터셉터에서 처리되므로 여기서는 로그만
    if (error.response?.status === 401) {
      console.warn('⚠️ Unauthorized - handled by interceptor');
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
