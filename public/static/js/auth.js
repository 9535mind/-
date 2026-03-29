/**
 * 인증 관련 공통 함수
 */

// Axios 전역 설정: Cookie 자동 전송 활성화 (동일 출처 세션 쿠키 → /api/*)
axios.defaults.withCredentials = true;
if (typeof axios !== 'undefined' && axios.interceptors) {
  axios.interceptors.request.use(function (config) {
    config.withCredentials = true;
    return config;
  });
}

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
    await axios.post('/api/auth/logout', {}, { withCredentials: true });
  } catch (error) {
    console.error('Logout error:', error);
  }
  
  clearSessionToken();
  window.location.href = '/login';
}

// 현재 사용자 정보 가져오기 (리다이렉트 제거)
async function getCurrentUser() {
  try {
    const response = await axios.get('/api/auth/me', { withCredentials: true });
    
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
    url,
    withCredentials: true,
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
  const params = new URLSearchParams(window.location.search || '')
  const oauthLanding = params.get('oauth_sync') === '1'
  if (oauthLanding) {
    const pathOnly = window.location.pathname + (window.location.hash || '')
    window.history.replaceState({}, '', pathOnly)
  }

  let serverUser = await getCurrentUser()
  if (!serverUser && oauthLanding) {
    const gaps = [200, 350, 500]
    for (let j = 0; j < gaps.length && !serverUser; j++) {
      await new Promise(function (resolve) { setTimeout(resolve, gaps[j]) })
      serverUser = await getCurrentUser()
    }
  }

  if (serverUser) {
    AuthManager.saveSession(serverUser)
    return serverUser
  }
  AuthManager.clearSession()
  return null
}

/** 유틸 바·모바일 드로어·관제탑 등 — 관리자만 초록 배지 (role === 'admin' 엄격 일치). 스타일은 /static/css/app.css */
const HEADER_USER_NAME_CLASS_USER = 'font-semibold text-slate-900'

function setHeaderDisplayNameEl(el, user) {
  if (!el) return
  const defaultCls = el.getAttribute('data-ms-name-default')
  if (user && user.role === 'admin') {
    el.className = 'header-user-admin-badge'
  } else {
    el.className = defaultCls || HEADER_USER_NAME_CLASS_USER
  }
}

/** 이름 + 배지 (admin 전용 페이지 스크립트에서 재사용) */
function applyHeaderUserDisplay(el, user) {
  if (!el) return
  if (user) {
    el.textContent = user.name + ' 님'
    setHeaderDisplayNameEl(el, user)
  } else {
    el.textContent = ''
    const defaultCls = el.getAttribute('data-ms-name-default')
    el.className = defaultCls || HEADER_USER_NAME_CLASS_USER
  }
}

window.setHeaderDisplayNameEl = setHeaderDisplayNameEl
window.applyHeaderUserDisplay = applyHeaderUserDisplay

// 헤더 업데이트 (로그인 상태 표시)
async function updateHeader() {
  const path = (window.location.pathname || '').replace(/\/$/, '') || '/'
  // /login 은 페이지 인라인 스크립트가 이미 /api/auth/me 로 세션을 검사함.
  // 여기서 syncUserSession()까지 돌리면 동일 요청이 2번 나가 콘솔에 401·로그가 반복됨.
  if (path === '/login') {
    return
  }

  const authButtons = document.getElementById('headerAuthButtons')
  const userMenu = document.getElementById('headerUserMenu')
  const userName = document.getElementById('headerUserName')
  const adminLink = document.getElementById('adminLink')
  const adminModeSwitch = document.getElementById('adminModeSwitch')
  const mAuthButtons = document.getElementById('mHeaderAuthButtons')
  const mUserMenu = document.getElementById('mHeaderUserMenu')
  const mUserName = document.getElementById('mHeaderUserName')
  const mAdminSwitch = document.getElementById('mAdminModeSwitch')
  const adminNameEl = document.getElementById('adminName')
  const loginBtn = document.getElementById('loginBtn')
  const logoutBtn = document.getElementById('logoutBtn')

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
    if (userName) {
      applyHeaderUserDisplay(userName, user)
    }
    
    // 관리자 모드 링크는 role === 'admin' 일 때만 노출 (학생에게 버튼만 보이고 막히는 혼선 방지)
    if (adminLink) adminLink.style.display = 'none'
    if (adminModeSwitch) {
      adminModeSwitch.style.display = user.role === 'admin' ? 'flex' : 'none'
    }

    if (mAuthButtons) mAuthButtons.style.display = 'none'
    if (mUserMenu) mUserMenu.style.display = 'flex'
    if (mUserName) {
      applyHeaderUserDisplay(mUserName, user)
    }
    if (mAdminSwitch) mAdminSwitch.style.display = user.role === 'admin' ? 'block' : 'none'

    if (adminNameEl) {
      applyHeaderUserDisplay(adminNameEl, user)
    }
    if (loginBtn) loginBtn.classList.add('hidden')
    if (logoutBtn) logoutBtn.classList.remove('hidden')
  } else {
    if (authButtons) authButtons.style.display = 'flex'
    if (userMenu) userMenu.style.display = 'none'
    if (userName) {
      applyHeaderUserDisplay(userName, null)
    }
    if (adminLink) adminLink.style.display = 'none'
    if (adminModeSwitch) adminModeSwitch.style.display = 'none'

    if (mAuthButtons) mAuthButtons.style.display = 'flex'
    if (mUserMenu) mUserMenu.style.display = 'none'
    if (mUserName) {
      applyHeaderUserDisplay(mUserName, null)
    }
    if (mAdminSwitch) mAdminSwitch.style.display = 'none'

    if (adminNameEl) {
      applyHeaderUserDisplay(adminNameEl, null)
    }
    if (loginBtn) loginBtn.classList.remove('hidden')
    if (logoutBtn) logoutBtn.classList.add('hidden')
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    updateHeader()
  })
}

// 로그아웃 처리
async function handleLogout() {
  try {
    await axios.post('/api/auth/logout', {}, { withCredentials: true })
  } catch (error) {
    console.error('Logout error:', error)
  }

  AuthManager.clearSession()
  window.location.href = '/login'
}
