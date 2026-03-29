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

const MINDSTORY_VIEW_MODE_KEY = 'mindstory_view_mode'

function getMindstoryViewMode() {
  try {
    var v = localStorage.getItem(MINDSTORY_VIEW_MODE_KEY)
    if (v === 'student' || v === 'admin') return v
  } catch (e) {}
  return 'admin'
}

/** 관리자인데 수강생 뷰로 위장(헤더·크롬 최소화) */
function isAdminStudentViewActive(user) {
  return !!(user && user.role === 'admin' && getMindstoryViewMode() === 'student')
}

window.getMindstoryViewMode = getMindstoryViewMode
window.isAdminStudentViewActive = isAdminStudentViewActive

function setHeaderDisplayNameEl(el, user) {
  if (!el) return
  const defaultCls = el.getAttribute('data-ms-name-default')
  if (user && user.role === 'admin' && !isAdminStudentViewActive(user)) {
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

/** 관리자 + 수강생 뷰: SSR된 매직 펜슬·펄스 점 등만 숨김 (일반 회원 DOM 불변) */
function applyAdminStudentViewMask() {
  var user = AuthManager.getUser()
  if (!user || user.role !== 'admin' || getMindstoryViewMode() !== 'student') return
  document.querySelectorAll('.admin-magic-pencil').forEach(function (el) {
    el.style.display = 'none'
    el.setAttribute('aria-hidden', 'true')
  })
  document.querySelectorAll('.site-cmd-center-pulse-dot').forEach(function (el) {
    el.style.display = 'none'
  })
}

/** JS로 주입한 매직 펜슬만 제거 (SSR 연필은 그대로) */
function removeInjectedMagicPencils() {
  document.querySelectorAll('a.admin-magic-pencil[data-ms-injected="1"]').forEach(function (el) {
    el.remove()
  })
}

/**
 * [data-ms-magic-pencil-wrap]: 관리자이고 관리자 뷰일 때만 연필 DOM 추가. 그 외에는 추가하지 않음.
 */
function mountGlobalMagicPencils(user) {
  removeInjectedMagicPencils()
  if (!user || user.role !== 'admin' || isAdminStudentViewActive(user)) return
  document.querySelectorAll('[data-ms-magic-pencil-wrap]').forEach(function (wrap) {
    var href = wrap.getAttribute('data-ms-pencil-href') || '/admin/dashboard'
    var label = wrap.getAttribute('data-ms-pencil-label') || '관리자에서 편집'
    var a = document.createElement('a')
    a.href = href
    a.className = 'admin-magic-pencil admin-magic-pencil--corner'
    a.setAttribute('data-ms-injected', '1')
    a.title = '관리자 수정'
    a.setAttribute('aria-label', label)
    a.style.pointerEvents = 'auto'
    a.style.display = 'inline-flex'
    a.innerHTML = '<i class="fas fa-pencil-alt" aria-hidden="true"></i>'
    a.addEventListener('click', function (e) {
      e.stopPropagation()
    })
    wrap.appendChild(a)
  })
}

/**
 * 헤더·드로어: 커맨드 센터 앞 관리자 전용 뷰 스위치 (role === 'admin' 일 때만 노출)
 */
function setupAdminViewToggleButtons(user) {
  var desktopBtn = document.getElementById('headerViewToggleBtn')
  var mobileBtn = document.getElementById('mHeaderViewToggleBtn')
  var cmdDesk = document.getElementById('headerCommandCenterLink')
  var cmdMob = document.getElementById('mHeaderCommandCenterLink')

  if (!user || user.role !== 'admin') {
    ;[desktopBtn, mobileBtn].forEach(function (b) {
      if (!b) return
      b.classList.add('hidden')
      b.style.display = 'none'
      b.onclick = null
    })
    ;[cmdDesk, cmdMob].forEach(function (a) {
      if (!a) return
      a.style.display = ''
    })
    return
  }

  var isStudentView = getMindstoryViewMode() === 'student'
  var label = isStudentView ? '🛠️ 관리자 뷰로 전환' : '👀 수강생 뷰로 전환'
  var deskCls =
    'text-xs font-medium px-2 py-1 rounded-md transition-colors whitespace-nowrap items-center justify-center ' +
    (isStudentView
      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100')
  var mobCls =
    'w-full text-xs font-medium px-3 py-2 rounded-md transition-colors justify-center items-center ' +
    (isStudentView
      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100')

  function flipMode() {
    try {
      localStorage.setItem(MINDSTORY_VIEW_MODE_KEY, isStudentView ? 'admin' : 'student')
    } catch (e) {}
    location.reload()
  }

  if (desktopBtn) {
    desktopBtn.classList.remove('hidden')
    desktopBtn.className = deskCls
    desktopBtn.style.display = 'inline-flex'
    desktopBtn.textContent = label
    desktopBtn.onclick = flipMode
  }
  if (mobileBtn) {
    mobileBtn.classList.remove('hidden')
    mobileBtn.className = mobCls
    mobileBtn.style.display = 'flex'
    mobileBtn.textContent = label
    mobileBtn.onclick = flipMode
  }

  if (cmdDesk) {
    cmdDesk.style.display = isStudentView ? 'none' : ''
  }
  if (cmdMob) {
    cmdMob.style.display = isStudentView ? 'none' : 'flex'
  }
}

function afterHeaderDomReady() {
  var path = (window.location.pathname || '').replace(/\/$/, '') || '/'
  if (path === '/login') return
  applyAdminStudentViewMask()
}

// 헤더 업데이트 (로그인 상태 표시)
async function updateHeader() {
  const path = (window.location.pathname || '').replace(/\/$/, '') || '/'
  // /login 은 페이지 인라인 스크립트가 이미 /api/auth/me 로 세션을 검사함.
  // 여기서 syncUserSession()까지 돌리면 동일 요청이 2번 나가 콘솔에 401·로그가 반복됨.
  if (path === '/login') {
    setupAdminViewToggleButtons(null)
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
    if (mAdminSwitch) {
      mAdminSwitch.style.display = user.role === 'admin' ? 'flex' : 'none'
    }

    if (adminNameEl) {
      applyHeaderUserDisplay(adminNameEl, user)
    }
    if (loginBtn) loginBtn.classList.add('hidden')
    if (logoutBtn) logoutBtn.classList.remove('hidden')
    setupAdminViewToggleButtons(user)
    mountGlobalMagicPencils(user)
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
    setupAdminViewToggleButtons(null)
    mountGlobalMagicPencils(null)
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    updateHeader()
      .then(afterHeaderDomReady)
      .catch(function () {
        afterHeaderDomReady()
      })
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
