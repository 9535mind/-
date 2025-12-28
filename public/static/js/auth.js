/**
 * 인증 관련 공통 함수
 */

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
