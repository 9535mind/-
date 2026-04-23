/**
 * 페이지 라우트 (HTML 페이지 서빙)
 */

import { Context, Hono } from 'hono'
import { Bindings, User } from '../types/database'
import { optionalAuth } from '../middleware/auth'
import { resolveAdminCommandPulse } from '../utils/site-header-admin-ssr'
import { siteFooterLegalBlockHtml } from '../utils/site-footer-legal'
import {
  siteAiChatWidgetMarkup,
  siteAiChatWidgetScript,
  siteAiChatWidgetStyles,
} from '../utils/site-ai-chat-widget'
import {
  siteFloatingQuickMenuMarkup,
  siteFloatingQuickMenuScript,
  siteFloatingQuickMenuStyles,
} from '../utils/site-floating-quick-menu'
import {
  siteHeaderDrawerControlScript,
  siteHeaderFullMarkup,
  siteHeaderNavCoursesGlassStyles,
} from '../utils/site-header-courses-nav'
import { SITE_POPUP_SCRIPT_TAG } from '../utils/site-popup-script'
import { SITE_ICONS_HEAD_HTML } from '../utils/site-icons-head'

const pages = new Hono<{ Bindings: Bindings; Variables: { user?: User } }>()
pages.use('*', optionalAuth)

// 공통 헤더/푸터 컴포넌트 (SSR: 관리자 미처리 문의 시 커맨드 센터 펄스)
const getHeader = async (c: Context) => {
  const adminCommandPulse = await resolveAdminCommandPulse(c)
  return siteHeaderFullMarkup({ variant: 'pages', adminCommandPulse })
}

const getFooter = () => `
<footer class="bg-gray-800 text-white py-8 mt-12">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        ${siteFooterLegalBlockHtml()}
        <p class="mt-4 pt-4 border-t border-gray-700 text-center text-xs text-gray-500">
            © 2025 마인드스토리 원격평생교육원. All rights reserved.
        </p>
    </div>
</footer>
${siteFloatingQuickMenuMarkup()}
${siteAiChatWidgetMarkup()}
`

const getCommonHead = (title: string) => `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=0.9, maximum-scale=1.0, user-scalable=yes">
    <title>${title} - 마인드스토리 원격평생교육원</title>
    ${SITE_ICONS_HEAD_HTML}
    <link rel="stylesheet" href="/static/css/app.css" />
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script src="/static/js/auth.js?v=20260329-admin-name"></script>
    <script src="/static/js/utils.js?v=20260328-1"></script>
    <style>
        /* 모바일 최적화 - 폰트 크기 및 터치 영역 개선 */
        @media (max-width: 768px) {
            html {
                font-size: 18px; /* 12px * 1.5 = 18px (50% 증가) */
            }
            
            body {
                line-height: 1.6;
            }
            
            h1 {
                font-size: 2.25rem !important; /* 1.5 * 1.5 */
            }
            
            h2 {
                font-size: 1.95rem !important; /* 1.3 * 1.5 */
            }
            
            h3 {
                font-size: 1.65rem !important; /* 1.1 * 1.5 */
            }
            
            p, div, span {
                font-size: 1.28rem !important; /* 0.85 * 1.5 */
            }
            
            /* 터치 영역 크게 */
            button, a {
                padding: 0.8rem 1.5rem !important;
                font-size: 1.2rem !important; /* 0.8 * 1.5 */
                min-height: 48px !important; /* 터치하기 쉽게 */
                min-width: 48px !important;
            }
            
            input, textarea, select {
                font-size: 1.28rem !important; /* 0.85 * 1.5 */
                padding: 0.8rem !important;
                min-height: 48px !important;
            }
            
            /* 테이블 글씨 크게 */
            table {
                font-size: 1.1rem !important;
            }
            
            th, td {
                padding: 1rem !important;
                font-size: 1.1rem !important;
            }
            
            /* 아이콘 크기 증가 */
            i.fas, i.far, i.fab {
                font-size: 1.5em !important;
            }
            
            /* 햄버거 메뉴 (삼선) 크게 */
            .menu-icon, .hamburger, [class*="menu"] i {
                font-size: 2rem !important;
                padding: 1rem !important;
                min-width: 60px !important;
                min-height: 60px !important;
            }

            /* 플로팅 퀵 메뉴: 전역 터치 규칙 제외 */
            .ms-float-rail-mobile a.ms-float-m-item,
            .ms-float-rail-mobile button.ms-float-m-item {
                padding: 0.35rem 0.25rem !important;
                min-height: 3.35rem !important;
                min-width: 0 !important;
                font-size: 0.72rem !important;
            }
            .ms-float-rail-desktop .ms-float-link {
                padding: 0.65rem 0.55rem !important;
                min-height: 0 !important;
                min-width: 0 !important;
                font-size: 0.68rem !important;
            }
            #ms-ai-chat-root button,
            #ms-ai-chat-root input {
                min-width: 0 !important;
            }
        }
    </style>
    ${siteHeaderNavCoursesGlassStyles()}
    ${siteFloatingQuickMenuStyles()}
    ${siteAiChatWidgetStyles()}
</head>
<body class="bg-gray-50">
`

const getCommonFoot = () => `
<script>
  // 헤더 업데이트 (로그인 상태 및 관리자 링크 자동 처리)
  document.addEventListener('DOMContentLoaded', () => {
    ${siteHeaderDrawerControlScript('pages')}
    ${siteFloatingQuickMenuScript()}
    ${siteAiChatWidgetScript()}
  })
</script>
${SITE_POPUP_SCRIPT_TAG}
</body>
</html>
`

/**
 * 로그인 페이지
 */
pages.get('/login', async (c) => {
  return c.html(`
    ${getCommonHead('로그인')}
    ${await getHeader(c)}
    
    <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-md w-full space-y-8">
            <!-- 세션 정리 버튼 (디버깅용) -->
            <div class="text-center">
                <button onclick="AuthManager.clearSession(); localStorage.clear(); sessionStorage.clear(); location.reload();" 
                    class="text-sm text-gray-500 hover:text-gray-700 underline">
                    🧹 로그인 문제 해결 (세션 초기화)
                </button>
            </div>
            
            <div>
                <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    로그인
                </h2>
            </div>
            <form id="loginForm" class="mt-8 space-y-6">
                <div class="rounded-md shadow-sm space-y-4">
                    <div>
                        <label for="email" class="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                        <input id="email" name="email" type="email" required
                            class="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base"
                            placeholder="이메일을 입력하세요">
                    </div>
                    <div>
                        <label for="password" class="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                        <input id="password" name="password" type="password" required
                            class="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base"
                            placeholder="비밀번호를 입력하세요">
                    </div>
                    
                    <!-- 아이디/비밀번호 기억하기 체크박스 -->
                    <div class="flex items-center">
                        <input id="rememberMe" name="rememberMe" type="checkbox"
                            class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                        <label for="rememberMe" class="ml-2 block text-sm text-gray-900">
                            아이디/비밀번호 기억하기
                        </label>
                    </div>
                </div>

                <div class="space-y-3">
                    <button type="submit"
                        class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-base font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all">
                        <i class="fas fa-sign-in-alt mr-2"></i>
                        로그인
                    </button>
                    
                    <!-- 소셜 로그인 구분선 -->
                    <div class="relative my-6">
                        <div class="absolute inset-0 flex items-center">
                            <div class="w-full border-t border-gray-300"></div>
                        </div>
                        <div class="relative flex justify-center text-sm">
                            <span class="px-2 bg-white text-gray-500">간편 로그인</span>
                        </div>
                    </div>
                    
                    <p id="kakaoKeyHint" class="hidden text-sm text-amber-800 text-center bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">카카오: 루트 <code class="text-xs">.env</code>에 <code class="text-xs">KAKAO_CLIENT_ID=</code>(REST)를 넣고 <code class="text-xs">npm run dev</code>를 다시 실행하세요.</p>
                    <!-- 구글 로그인 버튼 -->
                    <button type="button" onclick="loginWithGoogle()"
                        class="group relative w-full flex justify-center py-3 px-4 border-2 border-gray-300 text-base font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-all">
                        <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Google 계정으로 로그인
                    </button>
                    
                    <!-- 카카오 로그인 버튼 -->
                    <button type="button" onclick="loginWithKakao()"
                        class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-base font-semibold rounded-lg text-gray-900 hover:text-black transition-all"
                        style="background-color: #FEE500;">
                        <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 3C6.48 3 2 6.58 2 11c0 2.89 1.86 5.44 4.67 7.08l-1.14 4.23c-.1.36.26.66.59.48l5.31-2.88c.51.07 1.03.11 1.57.11 5.52 0 10-3.58 10-8S17.52 3 12 3z"/>
                        </svg>
                        카카오로 시작하기
                    </button>
                    
                    <a href="/register"
                        class="group relative w-full flex justify-center py-3 px-4 border-2 border-indigo-600 text-base font-semibold rounded-lg text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all">
                        <i class="fas fa-user-plus mr-2"></i>
                        회원가입
                    </a>
                </div>
            </form>
        </div>
    </div>

    <script>
        // Google / 카카오 — redirect= 은 /app* 제외(회의는 별도 도메인)
        function loginWithGoogle() {
            const p = new URLSearchParams(window.location.search);
            const r = p.get('redirect');
            if (r && r.trim().startsWith('/app')) {
                window.location.href = '/api/auth/google/login';
                return;
            }
            if (r && r.trim().startsWith('/') && !r.trim().startsWith('//') && r.indexOf('..') === -1) {
                window.location.href = '/api/auth/google/login?next=' + encodeURIComponent(r.trim().split('#')[0] || r.trim());
            } else {
                window.location.href = '/api/auth/google/login';
            }
        }
        
        function loginWithKakao() {
            const p = new URLSearchParams(window.location.search);
            const r = p.get('redirect');
            if (r && r.trim().startsWith('/app')) {
                window.location.href = '/api/auth/kakao/login';
                return;
            }
            if (r && r.trim().startsWith('/') && !r.trim().startsWith('//') && r.indexOf('..') === -1) {
                window.location.href = '/api/auth/kakao/login?next=' + encodeURIComponent(r.trim().split('#')[0] || r.trim());
            } else {
                window.location.href = '/api/auth/kakao/login';
            }
        }
        
        // 로컬스토리지에서 저장된 로그인 정보 불러오기
        window.addEventListener('DOMContentLoaded', () => {
            const rememberedEmail = localStorage.getItem('rememberedEmail')
            const rememberMe = localStorage.getItem('rememberMe') === 'true'
            
            if (rememberMe && rememberedEmail) {
                document.getElementById('email').value = rememberedEmail
                document.getElementById('rememberMe').checked = true
            }
            fetch('/api/auth/kakao/ready', { credentials: 'include' })
                .then((r) => r.json())
                .then((b) => {
                    const d = b && b.data
                    if (d && !d.kakaoConfigured) {
                        const h = document.getElementById('kakaoKeyHint')
                        if (h) h.classList.remove('hidden')
                    }
                })
                .catch(() => {})
        })
    </script>
    <script>
        /** 오픈 리다이렉트 방지: 같은 사이트 경로만 허용 */
        function safeRedirectPath(raw) {
            if (raw == null || typeof raw !== 'string') return null
            const t = raw.trim()
            if (!t.startsWith('/') || t.startsWith('//')) return null
            return t
        }

        function sleepMs(ms) {
            return new Promise(function (resolve) { setTimeout(resolve, ms) })
        }

        /** POST 로그인 직후 Set-Cookie 가 한 박자 늦을 때 대비 — /me 재시도 */
        async function verifySessionAfterLogin() {
            const gaps = [0, 120, 280, 520, 900, 1500]
            let lastErr = null
            for (let i = 0; i < gaps.length; i++) {
                if (gaps[i] > 0) await sleepMs(gaps[i])
                try {
                    const verify = await axios.get('/api/auth/me', { withCredentials: true, timeout: 12000 })
                    if (verify.data && verify.data.success && verify.data.data != null) {
                        return verify
                    }
                } catch (e) {
                    lastErr = e
                }
            }
            throw lastErr || new Error('session verify failed')
        }

        let loginSessionCheckAbort = null
        /** 로그인 폼 제출~리다이렉트 전까지 true — 늦게 도착하는 초기 /me 401 이 saveSession 을 지우지 않게 함 */
        let loginFlowActive = false

        // 로그인 페이지 로드 시 즉시 로컬 세션 정리 (서버 세션 없는 경우)
        async function checkAndCleanupSession() {
            const hasLocalSession = AuthManager.isLoggedIn()

            if (!hasLocalSession) {
                return
            }

            loginSessionCheckAbort = new AbortController()
            const signal = loginSessionCheckAbort.signal
            try {
                const response = await axios.get('/api/auth/me', { timeout: 3000, withCredentials: true, signal })

                if (response.data && response.data.success && response.data.data) {
                    const urlParams = new URLSearchParams(window.location.search)
                    const redirect = safeRedirectPath(urlParams.get('redirect')) || '/'
                    window.location.href = redirect
                } else {
                    if (loginFlowActive) return
                    console.warn('⚠️ Server session invalid, clearing local session')
                    AuthManager.clearSession()
                }
            } catch (error) {
                if (axios.isCancel?.(error) || error.code === 'ERR_CANCELED' || error.name === 'CanceledError') {
                    return
                }
                if (loginFlowActive) {
                    return
                }
                const status = error?.response?.status
                if (status !== 401) {
                    console.error('❌ Session check failed:', error.message)
                }
                AuthManager.clearSession()
            }
        }

        checkAndCleanupSession()

        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault()
            loginFlowActive = true
            loginSessionCheckAbort?.abort()

            const email = document.getElementById('email').value
            const password = document.getElementById('password').value
            const rememberMe = document.getElementById('rememberMe').checked

            // 아이디/비밀번호 기억하기 처리
            if (rememberMe) {
                localStorage.setItem('rememberedEmail', email)
                localStorage.setItem('rememberMe', 'true')
            } else {
                localStorage.removeItem('rememberedEmail')
                localStorage.removeItem('rememberMe')
            }

            try {
                const response = await axios.post('/api/auth/login', { email, password }, { withCredentials: true })

                if (response.data.success) {
                    let verify
                    try {
                        verify = await verifySessionAfterLogin()
                    } catch (verr) {
                        loginFlowActive = false
                        showToast('세션이 브라우저에 저장되지 않았습니다. 쿠키 차단·시크릿 모드·다른 주소(www/비www)를 확인해주세요.', 'error')
                        return
                    }
                    const serverUser = verify.data.data
                    AuthManager.saveSession(serverUser)
                    showToast('로그인되었습니다.', 'success')

                    if (response.data.data.password_change_required) {
                        showToast('임시 비밀번호입니다. 새 비밀번호로 변경해주세요.', 'warning')
                        setTimeout(() => {
                            window.location.href = '/my-profile'
                        }, 400)
                        return
                    }

                    setTimeout(() => {
                        const urlParams = new URLSearchParams(window.location.search)
                        const redirect = safeRedirectPath(urlParams.get('redirect'))

                        if (redirect) {
                            window.location.href = redirect
                        } else {
                            if (serverUser.role !== 'student') {
                                window.location.href = '/admin/dashboard'
                            } else {
                                window.location.href = '/'
                            }
                        }
                    }, 400)
                } else {
                    loginFlowActive = false
                }
            } catch (error) {
                loginFlowActive = false
                const message = error.response?.data?.error || '로그인에 실패했습니다.'
                showToast(message, 'error')
            }
        })
    </script>
    
    ${getFooter()}
    ${getCommonFoot()}
  `)
})

/**
 * 회원가입 페이지 - 3가지 방법 (이메일, 카카오, 전화번호)
 */
pages.get('/register', async (c) => {
  return c.html(`
    ${getCommonHead('회원가입')}
    ${await getHeader(c)}
    
    <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-2xl w-full space-y-8">
            <div>
                <h2 class="mt-6 text-center text-4xl font-extrabold text-gray-900">
                    회원가입 방법을 선택해주세요
                </h2>
                <p class="mt-4 text-center text-base text-gray-600">
                    이미 계정이 있으신가요?
                    <a href="/login" class="font-medium text-indigo-600 hover:text-indigo-500 text-lg">
                        로그인하기
                    </a>
                </p>
            </div>
            
            <!-- 회원가입 방법 선택 -->
            <div id="registerMethodSelection" class="mt-8">
                <!-- 이메일 회원가입 (기본 추천) -->
                <div class="mb-6">
                    <button type="button" data-method="email" 
                        class="register-method-btn w-full flex items-center justify-center gap-3 px-6 py-5 bg-indigo-600 border-2 border-indigo-600 rounded-lg hover:bg-indigo-700 transition-all shadow-lg">
                        <i class="fas fa-envelope text-2xl text-white"></i>
                        <div class="text-left">
                            <div class="text-lg font-bold text-white">이메일로 가입하기</div>
                            <div class="text-sm text-indigo-100">가장 빠르고 안전한 방법 (추천)</div>
                        </div>
                    </button>
                </div>
                
                <!-- 소셜 로그인 -->
                <div class="space-y-3">
                    <div class="text-center text-sm text-gray-500 mb-2">또는 소셜 계정으로</div>
                    
                    <!-- 카카오로 계속하기 -->
                    <button type="button" data-method="kakao" 
                        class="register-method-btn w-full flex items-center justify-center gap-3 px-6 py-4 border-2 border-transparent rounded-lg hover:opacity-90 transition-all shadow-md"
                        style="background-color: #FEE500; position: relative; z-index: 10;">
                        <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 3C6.48 3 2 6.58 2 11c0 2.89 1.86 5.44 4.67 7.08l-1.14 4.23c-.1.36.26.66.59.48l5.31-2.88c.51.07 1.03.11 1.57.11 5.52 0 10-3.58 10-8S17.52 3 12 3z"/>
                        </svg>
                        <span class="text-lg font-semibold text-gray-900">카카오로 1초 만에 시작하기</span>
                    </button>
                    
                    <!-- 구글로 계속하기 ✅ -->
                    <button type="button" data-method="google" 
                        class="register-method-btn w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all shadow-md">
                        <svg class="w-6 h-6" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <span class="text-lg font-semibold text-gray-700">Google로 계속하기</span>
                    </button>
                </div>
                
                <!-- 안내 메시지 -->
                <div class="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div class="flex items-start gap-2">
                        <i class="fas fa-info-circle text-blue-600 mt-0.5"></i>
                        <div class="text-sm text-gray-700">
                            <p class="font-semibold mb-2">💡 가입 방법</p>
                            <ul class="space-y-1 ml-4 list-disc">
                                <li><strong>이메일 회원가입</strong>: 가장 안전하고 확실한 방법 ✅</li>
                                <li><strong>카카오 로그인</strong>: 1초 만에 간편 가입 ✅</li>
                                <li><strong>Google 로그인</strong>: 1초 만에 간편 가입 ✅</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 이메일 회원가입 폼 -->
            <div id="emailRegisterForm" style="display:none">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-lg font-semibold text-gray-900">
                        <i class="fas fa-envelope text-indigo-600 mr-2"></i>이메일 회원가입
                    </h3>
                    <button onclick="goBackToMethodSelection()" class="text-sm text-gray-600 hover:text-gray-900">
                        <i class="fas fa-arrow-left mr-1"></i>다른 방법 선택
                    </button>
                </div>
                <form id="emailForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">이메일 *</label>
                        <input id="email_email" type="email" required
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">비밀번호 * (6자 이상)</label>
                        <input id="email_password" type="password" required minlength="6"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인 *</label>
                        <input id="email_password_confirm" type="password" required minlength="6"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
                        <input id="email_name" type="text" required
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">휴대폰 번호 (선택)</label>
                        <input id="email_phone" type="tel" placeholder="01012345678"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">생년월일 (선택)</label>
                        <div class="grid grid-cols-3 gap-2">
                            <select id="email_birth_year" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                                <option value="">년도</option>
                            </select>
                            <select id="email_birth_month" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                                <option value="">월</option>
                            </select>
                            <select id="email_birth_day" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                                <option value="">일</option>
                            </select>
                        </div>
                    </div>
                    <div class="space-y-2 pt-4 border-t">
                        <label class="flex items-center">
                            <input id="email_terms_agreed" type="checkbox" required class="mr-2 w-4 h-4">
                            <span class="text-sm text-gray-700">(필수) <a href="/terms" class="text-indigo-600 hover:underline" target="_blank">서비스 이용약관</a>에 동의합니다</span>
                        </label>
                        <label class="flex items-center">
                            <input id="email_privacy_agreed" type="checkbox" required class="mr-2 w-4 h-4">
                            <span class="text-sm text-gray-700">(필수) <a href="/privacy" class="text-indigo-600 hover:underline" target="_blank">개인정보처리방침</a>에 동의합니다</span>
                        </label>
                        <label class="flex items-center">
                            <input id="email_marketing_agreed" type="checkbox" class="mr-2 w-4 h-4">
                            <span class="text-sm text-gray-700">[선택] 마케팅 정보 수신 동의 (이메일/SMS)</span>
                        </label>
                    </div>
                    <button type="submit"
                        class="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        <i class="fas fa-envelope mr-2"></i>이메일로 가입하기
                    </button>
                </form>
            </div>
            
            <!-- 카카오 회원가입 (간편 가입) -->
            <div id="kakaoRegisterForm" style="display:none">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-lg font-semibold text-gray-900">
                        <img src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_small.png" 
                             alt="Kakao" class="w-6 h-6 inline mr-2">카카오 간편 가입
                    </h3>
                    <button onclick="goBackToMethodSelection()" class="text-sm text-gray-600 hover:text-gray-900">
                        <i class="fas fa-arrow-left mr-1"></i>다른 방법 선택
                    </button>
                </div>
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <p class="text-gray-700 mb-4 text-center">카카오 계정으로 간편하게 가입하실 수 있습니다.</p>
                    <p class="text-sm text-gray-600 mb-4 text-center">카카오 계정 정보를 활용하여 빠르게 가입이 완료됩니다.</p>
                    <div class="space-y-2 mb-6 text-left max-w-md mx-auto">
                        <label class="flex items-start gap-2">
                            <input id="kakao_terms_agreed" type="checkbox" required class="mt-1 w-4 h-4 shrink-0">
                            <span class="text-sm text-gray-700">(필수) <a href="/terms" class="text-indigo-600 hover:underline" target="_blank">서비스 이용약관</a>에 동의합니다</span>
                        </label>
                        <label class="flex items-start gap-2">
                            <input id="kakao_privacy_agreed" type="checkbox" required class="mt-1 w-4 h-4 shrink-0">
                            <span class="text-sm text-gray-700">(필수) <a href="/privacy" class="text-indigo-600 hover:underline" target="_blank">개인정보처리방침</a>에 동의합니다</span>
                        </label>
                        <label class="flex items-start gap-2">
                            <input id="kakao_marketing_agreed" type="checkbox" class="mt-1 w-4 h-4 shrink-0">
                            <span class="text-sm text-gray-700">[선택] 마케팅 정보 수신 동의 (이메일/SMS)</span>
                        </label>
                    </div>
                    <div class="text-center">
                    <button onclick="registerWithKakao()" type="button"
                        class="w-full md:w-auto px-8 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-900 hover:opacity-90 transition-opacity"
                        style="background-color: #FEE500;">
                        <img src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_small.png" 
                             alt="Kakao" class="w-5 h-5 inline mr-2">
                        카카오로 시작하기
                    </button>
                    </div>
                </div>
            </div>
            
            <!-- 전화번호 회원가입 -->
            <div id="phoneRegisterForm" style="display:none">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-lg font-semibold text-gray-900">
                        <i class="fas fa-mobile-alt text-green-600 mr-2"></i>전화번호 회원가입
                    </h3>
                    <button onclick="goBackToMethodSelection()" class="text-sm text-gray-600 hover:text-gray-900">
                        <i class="fas fa-arrow-left mr-1"></i>다른 방법 선택
                    </button>
                </div>
                <form id="phoneForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">휴대폰 번호 *</label>
                        <div class="flex gap-2">
                            <input id="phone_number" type="tel" required placeholder="01012345678"
                                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500">
                            <button type="button" onclick="requestPhoneVerification()" id="requestVerifyBtn"
                                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 whitespace-nowrap">
                                인증요청
                            </button>
                        </div>
                    </div>
                    <div id="verificationCodeSection" style="display:none">
                        <label class="block text-sm font-medium text-gray-700 mb-1">인증번호 *</label>
                        <div class="flex gap-2">
                            <input id="verification_code" type="text" required placeholder="6자리 인증번호"
                                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500">
                            <button type="button" onclick="verifyPhoneCode()" id="verifyCodeBtn"
                                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 whitespace-nowrap">
                                확인
                            </button>
                        </div>
                        <p id="verificationTimer" class="text-sm text-red-600 mt-1"></p>
                    </div>
                    <div id="phoneVerifiedSection" style="display:none">
                        <div class="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                            <p class="text-sm text-green-700">
                                <i class="fas fa-check-circle mr-1"></i>휴대폰 인증이 완료되었습니다.
                            </p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
                            <input id="phone_name" type="text" required
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">비밀번호 * (6자 이상)</label>
                            <input id="phone_password" type="password" required minlength="6"
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인 *</label>
                            <input id="phone_password_confirm" type="password" required minlength="6"
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">생년월일 (선택)</label>
                            <div class="grid grid-cols-3 gap-2">
                                <select id="phone_birth_year" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500">
                                    <option value="">년도</option>
                                </select>
                                <select id="phone_birth_month" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500">
                                    <option value="">월</option>
                                </select>
                                <select id="phone_birth_day" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500">
                                    <option value="">일</option>
                                </select>
                            </div>
                        </div>
                        <div class="space-y-2 pt-4 border-t">
                            <label class="flex items-center">
                                <input id="phone_terms_agreed" type="checkbox" required class="mr-2 w-4 h-4">
                                <span class="text-sm text-gray-700">(필수) <a href="/terms" class="text-green-600 hover:underline" target="_blank">서비스 이용약관</a>에 동의합니다</span>
                            </label>
                            <label class="flex items-center">
                                <input id="phone_privacy_agreed" type="checkbox" required class="mr-2 w-4 h-4">
                                <span class="text-sm text-gray-700">(필수) <a href="/privacy" class="text-green-600 hover:underline" target="_blank">개인정보처리방침</a>에 동의합니다</span>
                            </label>
                            <label class="flex items-center">
                                <input id="phone_marketing_agreed" type="checkbox" class="mr-2 w-4 h-4">
                                <span class="text-sm text-gray-700">[선택] 마케팅 정보 수신 동의 (이메일/SMS)</span>
                            </label>
                        </div>
                        <button type="submit"
                            class="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                            <i class="fas fa-mobile-alt mr-2"></i>전화번호로 가입하기
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script>
        // 이미 로그인된 경우 리다이렉트
        if (AuthManager.isLoggedIn()) {
            window.location.href = '/'
        }

        // ===== 유효성 검사 함수 =====

        // 이메일 형식 검증
        function validateEmail(email) {
            // 빈 문자열 체크
            if (!email || email.trim() === '') {
                return false
            }
            // 표준 이메일 형식 검증 (숫자로 시작하는 이메일 포함)
            const re = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
            return re.test(email.trim())
        }

        // 전화번호 형식 검증 (010-xxxx-xxxx or 01012345678)
        function validatePhone(phone) {
            const re = /^01[0-9]{8,9}$/
            return re.test(phone.replace(/-/g, ''))
        }

        // 비밀번호 강도 검증 (6자 이상, 영문+숫자 포함)
        function validatePassword(password) {
            if (password.length < 6) {
                return { valid: false, message: '비밀번호는 6자 이상이어야 합니다.' }
            }
            
            const hasLetter = /[a-zA-Z]/.test(password)
            const hasNumber = /[0-9]/.test(password)
            
            if (!hasLetter || !hasNumber) {
                return { valid: false, message: '비밀번호는 영문과 숫자를 포함해야 합니다.' }
            }
            
            return { valid: true }
        }

        // ===== 회원가입 방법 선택 =====

        // ===== 회원가입 방법 선택 (이벤트 위임) =====
        
        // 이벤트 위임: 모든 회원가입 방법 버튼 클릭 처리
        document.addEventListener('click', function(e) {
            const btn = e.target.closest('.register-method-btn');
            if (!btn) return;
            
            const method = btn.getAttribute('data-method');
            if (!method) return;
            
            if (method === 'email') {
                selectRegisterMethod('email');
            } else if (method === 'kakao') {
                selectRegisterMethod('kakao');
            } else if (method === 'google') {
                window.location.href = '/api/auth/google/login';
            }
        });
        
        function selectRegisterMethod(method) {
            document.getElementById('registerMethodSelection').style.display = 'none'
            
            if (method === 'email') {
                document.getElementById('emailRegisterForm').style.display = 'block'
                initBirthDateSelectors('email')
            } else if (method === 'kakao') {
                document.getElementById('kakaoRegisterForm').style.display = 'block'
            } else if (method === 'phone') {
                document.getElementById('phoneRegisterForm').style.display = 'block'
                initBirthDateSelectors('phone')
            }
        }

        function goBackToMethodSelection() {
            document.getElementById('registerMethodSelection').style.display = 'block'
            document.getElementById('emailRegisterForm').style.display = 'none'
            document.getElementById('kakaoRegisterForm').style.display = 'none'
            document.getElementById('phoneRegisterForm').style.display = 'none'
            
            // 입력 폼 초기화
            resetForms()
        }

        function resetForms() {
            document.getElementById('emailForm').reset()
            document.getElementById('phoneForm').reset()
            document.getElementById('verificationCodeSection').style.display = 'none'
            document.getElementById('phoneVerifiedSection').style.display = 'none'
            window.phoneVerified = false
            if (window.verificationTimer) {
                clearInterval(window.verificationTimer)
            }
        }

        // ===== 소셜 로그인 =====

        function registerWithGoogle() {
            window.location.href = '/api/auth/google/login'
        }

        function registerWithKakao() {
            const t = document.getElementById('kakao_terms_agreed')
            const p = document.getElementById('kakao_privacy_agreed')
            if (!t?.checked || !p?.checked) {
                alert('서비스 이용약관 및 개인정보처리방침에 동의해 주세요.')
                return
            }
            const ma = document.getElementById('kakao_marketing_agreed')?.checked
            const q = ma ? '?marketing=1' : ''
            window.location.href = '/api/auth/kakao/login' + q
        }

        // ===== 생년월일 드롭다운 초기화 =====

        function initBirthDateSelectors(prefix) {
            const birthYearSelect = document.getElementById(prefix + '_birth_year')
            const birthMonthSelect = document.getElementById(prefix + '_birth_month')
            const birthDaySelect = document.getElementById(prefix + '_birth_day')
            
            // 기존 옵션 제거 (첫 번째 옵션 제외)
            while (birthYearSelect.options.length > 1) {
                birthYearSelect.remove(1)
            }
            while (birthMonthSelect.options.length > 1) {
                birthMonthSelect.remove(1)
            }
            while (birthDaySelect.options.length > 1) {
                birthDaySelect.remove(1)
            }
            
            // 1945년부터 현재년도 - 18세까지 선택 가능
            const currentYear = new Date().getFullYear()
            for (let year = 1945; year <= currentYear - 18; year++) {
                const option = document.createElement('option')
                option.value = year
                option.textContent = year + '년'
                birthYearSelect.appendChild(option)
            }
            
            for (let month = 1; month <= 12; month++) {
                const option = document.createElement('option')
                option.value = month.toString().padStart(2, '0')
                option.textContent = month + '월'
                birthMonthSelect.appendChild(option)
            }
            
            for (let day = 1; day <= 31; day++) {
                const option = document.createElement('option')
                option.value = day.toString().padStart(2, '0')
                option.textContent = day + '일'
                birthDaySelect.appendChild(option)
            }
        }

        // ===== 이메일 회원가입 =====

        document.getElementById('emailForm').addEventListener('submit', async (e) => {
            e.preventDefault()
            
            const email = document.getElementById('email_email').value.trim()
            const password = document.getElementById('email_password').value
            const password_confirm = document.getElementById('email_password_confirm').value
            const name = document.getElementById('email_name').value.trim()
            const phone = document.getElementById('email_phone').value.trim()
            const terms_agreed = document.getElementById('email_terms_agreed').checked
            const privacy_agreed = document.getElementById('email_privacy_agreed').checked
            const marketing_agreed = document.getElementById('email_marketing_agreed').checked
            
            // 유효성 검사
            if (!email) {
                showToast('이메일을 입력해주세요.', 'error')
                return
            }
            
            if (!validateEmail(email)) {
                showToast('올바른 이메일 형식이 아닙니다. (예: user@example.com)', 'error')
                console.error('이메일 검증 실패:', email) // 디버깅용
                return
            }
            
            const passwordCheck = validatePassword(password)
            if (!passwordCheck.valid) {
                showToast(passwordCheck.message, 'error')
                return
            }
            
            if (password !== password_confirm) {
                showToast('비밀번호가 일치하지 않습니다.', 'error')
                return
            }
            
            if (!name) {
                showToast('이름을 입력해주세요.', 'error')
                return
            }
            
            if (phone && !validatePhone(phone)) {
                showToast('올바른 전화번호 형식이 아닙니다. (예: 01012345678)', 'error')
                return
            }
            
            if (!terms_agreed || !privacy_agreed) {
                showToast('필수 약관에 동의해주세요.', 'error')
                return
            }
            
            // 생년월일 조합
            const year = document.getElementById('email_birth_year').value
            const month = document.getElementById('email_birth_month').value
            const day = document.getElementById('email_birth_day').value
            const birth_date = (year && month && day) ? \`\${year}-\${month}-\${day}\` : null
            
            const data = {
                email: email,
                password: password,
                name: name,
                phone: phone || null,
                birth_date: birth_date,
                terms_agreed: terms_agreed,
                privacy_agreed: privacy_agreed,
                marketing_agreed: marketing_agreed
            }
            
            try {
                const response = await axios.post('/api/auth/register', data)
                
                if (response.data.success) {
                    showToast('회원가입이 완료되었습니다. 로그인해주세요.', 'success')
                    setTimeout(() => {
                        window.location.href = '/login'
                    }, 1500)
                }
            } catch (error) {
                const message = error.response?.data?.error || '회원가입에 실패했습니다.'
                showToast(message, 'error')
            }
        })

        // ===== 전화번호 회원가입 =====

        // 전화번호 인증 요청
        window.phoneVerified = false
        window.verificationTimer = null

        async function requestPhoneVerification() {
            const phone = document.getElementById('phone_number').value.trim()
            
            if (!validatePhone(phone)) {
                showToast('올바른 전화번호 형식이 아닙니다. (예: 01012345678)', 'error')
                return
            }
            
            try {
                await axios.post('/api/auth/phone/request', { phone }, { withCredentials: true })
                showToast('인증번호가 발송되었습니다.', 'success')
            } catch (e) {
                const msg = e.response?.data?.error || '인증번호 발송에 실패했습니다.'
                showToast(msg, 'error')
                return
            }
            
            // 인증번호 입력 섹션 표시
            document.getElementById('verificationCodeSection').style.display = 'block'
            document.getElementById('requestVerifyBtn').disabled = true
            document.getElementById('requestVerifyBtn').textContent = '발송완료'
            document.getElementById('requestVerifyBtn').classList.remove('bg-green-600', 'hover:bg-green-700')
            document.getElementById('requestVerifyBtn').classList.add('bg-gray-400', 'cursor-not-allowed')
            
            // 3분 타이머 시작
            let timeLeft = 180 // 3분 = 180초
            const timerDisplay = document.getElementById('verificationTimer')
            
            if (window.verificationTimer) {
                clearInterval(window.verificationTimer)
            }
            
            window.verificationTimer = setInterval(() => {
                timeLeft--
                const minutes = Math.floor(timeLeft / 60)
                const seconds = timeLeft % 60
                timerDisplay.textContent = \`남은 시간: \${minutes}:\${seconds.toString().padStart(2, '0')}\`
                
                if (timeLeft <= 0) {
                    clearInterval(window.verificationTimer)
                    timerDisplay.textContent = '인증 시간이 만료되었습니다. 다시 요청해주세요.'
                    document.getElementById('requestVerifyBtn').disabled = false
                    document.getElementById('requestVerifyBtn').textContent = '재발송'
                    document.getElementById('requestVerifyBtn').classList.remove('bg-gray-400', 'cursor-not-allowed')
                    document.getElementById('requestVerifyBtn').classList.add('bg-green-600', 'hover:bg-green-700')
                }
            }, 1000)
        }

        // 인증번호 확인
        function verifyPhoneCode() {
            const code = document.getElementById('verification_code').value.trim()
            
            if (!code) {
                showToast('인증번호를 입력해주세요.', 'error')
                return
            }
            
            const phone = document.getElementById('phone_number').value.trim()
            axios.post('/api/auth/phone/confirm', { phone, code }, { withCredentials: true })
                .then(() => {
                    window.phoneVerified = true
                    clearInterval(window.verificationTimer)
                    document.getElementById('verificationCodeSection').style.display = 'none'
                    document.getElementById('phoneVerifiedSection').style.display = 'block'
                    showToast('휴대폰 인증이 완료되었습니다.', 'success')
                })
                .catch((e) => {
                    const msg = e.response?.data?.error || '인증번호 확인에 실패했습니다.'
                    showToast(msg, 'error')
                })
        }

        // 전화번호 회원가입 제출
        document.getElementById('phoneForm').addEventListener('submit', async (e) => {
            e.preventDefault()
            
            if (!window.phoneVerified) {
                showToast('휴대폰 인증을 완료해주세요.', 'error')
                return
            }
            
            const phone = document.getElementById('phone_number').value.trim()
            const name = document.getElementById('phone_name').value.trim()
            const password = document.getElementById('phone_password').value
            const password_confirm = document.getElementById('phone_password_confirm').value
            const terms_agreed = document.getElementById('phone_terms_agreed').checked
            const privacy_agreed = document.getElementById('phone_privacy_agreed').checked
            const marketing_agreed = document.getElementById('phone_marketing_agreed').checked
            
            // 유효성 검사
            const passwordCheck = validatePassword(password)
            if (!passwordCheck.valid) {
                showToast(passwordCheck.message, 'error')
                return
            }
            
            if (password !== password_confirm) {
                showToast('비밀번호가 일치하지 않습니다.', 'error')
                return
            }
            
            if (!name) {
                showToast('이름을 입력해주세요.', 'error')
                return
            }
            
            if (!terms_agreed || !privacy_agreed) {
                showToast('필수 약관에 동의해주세요.', 'error')
                return
            }
            
            // 생년월일 조합
            const year = document.getElementById('phone_birth_year').value
            const month = document.getElementById('phone_birth_month').value
            const day = document.getElementById('phone_birth_day').value
            const birth_date = (year && month && day) ? \`\${year}-\${month}-\${day}\` : null
            
            // 전화번호로 이메일 생성
            const email = phone + '@phone.mindstory.co.kr'
            
            const data = {
                email: email,
                password: password,
                name: name,
                phone: phone,
                birth_date: birth_date,
                terms_agreed: terms_agreed,
                privacy_agreed: privacy_agreed,
                marketing_agreed: marketing_agreed,
                phone_verified: true,
                phone_verified_at: new Date().toISOString()
            }
            
            try {
                const response = await axios.post('/api/auth/register', data)
                
                if (response.data.success) {
                    showToast('회원가입이 완료되었습니다. 로그인해주세요.', 'success')
                    setTimeout(() => {
                        window.location.href = '/login'
                    }, 1500)
                }
            } catch (error) {
                const message = error.response?.data?.error || '회원가입에 실패했습니다.'
                showToast(message, 'error')
            }
        })
    </script>
    
    ${getFooter()}
    ${getCommonFoot()}
  `)
})

/**
 * GET /courses/:id
 * 과정 상세 페이지
 */
pages.get('/courses/:id', async (c) => {
  const courseId = c.req.param('id')
  
  return c.html(`
    ${getCommonHead('과정 상세')}
    ${await getHeader(c)}
    
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div id="courseDetail">
            <div class="text-center py-12">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p class="mt-4 text-gray-600">과정 정보를 불러오는 중...</p>
            </div>
        </div>
    </div>
    
    <script>
        const courseId = '${courseId}'
        
        async function loadCourseDetail() {
            try {
                const response = await axios.get(\`/api/courses/\${courseId}\`)
                
                const { course, lessons, enrollment, has_paid_access } = response.data.data
                
                // 현재 사용자 확인 (서버 세션 쿠키 기준)
                const currentUser = await getCurrentUser()
                
                const isAdmin = !!(currentUser && currentUser.role === 'admin')
                const hasAccess = isAdmin || enrollment || has_paid_access === true
                
                function msCatalogLineKeys(cg, groups) {
                    if (Array.isArray(groups) && groups.length) {
                        var allowed = ['CLASSIC', 'NEXT', 'NCS']
                        return groups.map(function (g) { return String(g).toUpperCase() }).filter(function (x) { return allowed.indexOf(x) >= 0 }).filter(function (x, i, a) { return a.indexOf(x) === i })
                    }
                    var raw = String(cg || 'CLASSIC').toUpperCase().replace(/\\s/g, '').split(/[,，]/).filter(Boolean)
                    var al = ['CLASSIC', 'NEXT', 'NCS']
                    var out = []
                    raw.forEach(function (p) { if (al.indexOf(p) >= 0 && out.indexOf(p) < 0) out.push(p) })
                    return out.length ? out : ['CLASSIC']
                }
                var lineKeys = msCatalogLineKeys(course.category_group, course.category_groups)
                var hasNext = lineKeys.indexOf('NEXT') >= 0
                var hasNcs = lineKeys.indexOf('NCS') >= 0
                document.body.classList.remove('theme-legacy', 'theme-next')
                document.body.classList.add(hasNext ? 'theme-next' : 'theme-legacy')
                var cg = hasNext ? 'NEXT' : 'CLASSIC'
                var lineBadgesRow = lineKeys.map(function (k) {
                    var cls = k === 'NEXT' ? 'bg-violet-500/90 text-white' : k === 'NCS' ? 'bg-amber-300/95 text-amber-950' : 'bg-white/25 text-white'
                    var lab = k === 'CLASSIC' ? 'Classic' : k === 'NEXT' ? 'Next' : 'NCS'
                    return '<span class="' + cls + ' backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold tracking-wide">' + lab + '</span>'
                }).join('')
                var ncsBanner = hasNcs
                    ? '<div class="rounded-2xl border border-amber-300/60 bg-amber-50 p-6 md:p-8 mb-8 shadow-sm">' +
                      '<p class="text-sm font-semibold text-amber-800 uppercase tracking-wide">NCS</p>' +
                      '<h3 class="text-xl font-bold text-amber-950 mt-1">국가직무능력표준 연계</h3>' +
                      '<p class="text-amber-900/85 mt-2 text-sm leading-relaxed">본 과정은 NCS 기반 직업훈련에 해당할 수 있습니다. 훈련·평가·출석 규정은 과정 공지 및 산업인력공단 안내를 따릅니다.</p>' +
                      '</div>'
                    : ''
                
                var coursePayAmountDetail = (function () {
                    var p = parseFloat(course.price)
                    if (isNaN(p)) p = 0
                    var d = course.discount_price != null ? parseFloat(course.discount_price) : NaN
                    if (!isNaN(d) && d > 0) return d
                    return p
                })()
                var showCourseAsFree = coursePayAmountDetail <= 0
                var thumbUrl = (course.thumbnail_url && String(course.thumbnail_url).trim()) ? String(course.thumbnail_url).trim() : '/static/images/course-placeholder.svg'
                var lineLabelStr = lineKeys.map(function (k) {
                    return k === 'NEXT' ? 'Next' : k === 'NCS' ? 'NCS' : 'Classic'
                }).join(' · ')
                var instructorLine = (course.instructor_name && String(course.instructor_name).trim()) ? String(course.instructor_name).trim() : ''
                var metaSubtitle = lineLabelStr + (instructorLine ? ' · ' + instructorLine : '')
                
                const detailHtml = \`
                    <!-- 과정 헤더: 썸네일 + 다크 그라데이션 + 텍스트 오버레이 -->
                    <div class="rounded-2xl shadow-2xl overflow-hidden mb-8 border border-slate-200/80">
                        <div class="relative min-h-[280px] md:min-h-[340px] w-full">
                            <img src="\${thumbUrl}" alt="" class="absolute inset-0 w-full h-full object-cover"
                                 onerror="this.onerror=null;this.src='/static/images/course-placeholder.svg'" />
                            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none"></div>
                            <div class="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                                <div class="flex items-center gap-2 mb-3 flex-wrap">
                                    <span class="inline-flex items-center bg-white/15 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-semibold border border-white/20">
                                        <i class="fas fa-graduation-cap mr-1.5"></i>온라인 과정
                                    </span>
                                    \${course.is_featured ? '<span class="inline-flex items-center bg-amber-400/95 text-amber-950 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm"><i class="fas fa-star mr-1"></i>인기</span>' : ''}
                                    \${lineBadgesRow}
                                </div>
                                <h1 class="text-3xl md:text-5xl font-bold text-white leading-tight drop-shadow-md">\${course.title}</h1>
                                <p class="mt-2 text-sm md:text-base text-gray-300">\${metaSubtitle}</p>
                            </div>
                        </div>
                        <div class="bg-white p-6 md:p-8 flex flex-col lg:flex-row gap-8 items-start">
                            <div class="flex-1 min-w-0">
                                <p class="text-gray-600 text-base md:text-lg leading-relaxed">\${(course.description || '').replace(/</g, '&lt;')}</p>
                                <div class="flex flex-wrap items-center gap-4 md:gap-6 mt-6 text-sm text-gray-500">
                                    <span><i class="fas fa-users mr-1.5 text-indigo-500"></i>\${course.enrolled_count || 0}명 수강 중</span>
                                    <span><i class="fas fa-calendar mr-1.5 text-indigo-500"></i>수강 기간 \${course.duration_days}일</span>
                                    <span><i class="fas fa-book mr-1.5 text-indigo-500"></i>총 \${course.total_lessons}강</span>
                                </div>
                            </div>
                            <div class="w-full lg:w-auto lg:min-w-[300px] shrink-0">
                                <!-- 가격 & 신청 카드 -->
                                <div class="bg-slate-50 rounded-2xl shadow-lg border border-slate-100 p-6 w-full">
                                    <div class="text-center mb-6">
                                        \${showCourseAsFree ? 
                                            '<div><p class="text-sm text-gray-500 mb-2">수강료</p><p class="text-4xl font-bold text-green-600">무료</p></div>' :
                                            \`<div>
                                                <p class="text-sm text-gray-500 mb-2">수강료</p>
                                                \${course.discount_price ? 
                                                    \`<p class="text-gray-400 line-through text-lg mb-1">\${course.price.toLocaleString()}원</p>
                                                    <div class="flex items-center justify-center gap-2">
                                                        <p class="text-4xl font-bold text-purple-600">\${course.discount_price.toLocaleString()}원</p>
                                                        <span class="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-bold">
                                                            \${Math.round((1 - course.discount_price / course.price) * 100)}% OFF
                                                        </span>
                                                    </div>\` :
                                                    \`<p class="text-4xl font-bold text-purple-600">\${course.price.toLocaleString()}원</p>\`
                                                }
                                            </div>\`
                                        }
                                    </div>
                                    \${isAdmin ? 
                                        \`<div class="w-full space-y-3">
                                            <button type="button" onclick="goToLesson(\${course.id}, \${lessons[0]?.id || 0}, true, true)" 
                                                 class="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg">
                                                <i class="fas fa-user-shield mr-2"></i>바로 학습 (프리패스)
                                            </button>
                                            <button type="button" onclick="enrollCourse(\${course.id})" 
                                                 class="w-full bg-white text-purple-700 border-2 border-purple-200 px-6 py-3 rounded-xl font-bold hover:bg-purple-50 transition">
                                                <i class="fas fa-clipboard-check mr-2"></i>수강 신청 (테스트)
                                            </button>
                                        </div>\` :
                                        \`<button onclick="enrollCourse(\${course.id})" 
                                                 class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:from-purple-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg">
                                            <i class="fas fa-\${enrollment ? 'play' : 'shopping-cart'} mr-2"></i>\${enrollment ? '학습 시작하기' : '지금 수강 신청'}
                                        </button>\`
                                    }
                                    <p class="text-sm text-gray-500 text-center mt-4">
                                        <i class="fas fa-info-circle mr-1"></i>언제든 학습 가능
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 과정 통계 카드 -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div class="bg-white rounded-xl shadow-md p-6 text-center hover:shadow-lg transition">
                            <div class="bg-purple-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
                                <i class="fas fa-calendar text-purple-600 text-2xl"></i>
                            </div>
                            <p class="text-sm text-gray-600 mb-1">수강 기간</p>
                            <p class="text-2xl font-bold text-gray-900">\${course.duration_days}<span class="text-sm">일</span></p>
                        </div>
                        <div class="bg-white rounded-xl shadow-md p-6 text-center hover:shadow-lg transition">
                            <div class="bg-blue-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
                                <i class="fas fa-book text-blue-600 text-2xl"></i>
                            </div>
                            <p class="text-sm text-gray-600 mb-1">총 차시</p>
                            <p class="text-2xl font-bold text-gray-900">\${course.total_lessons}<span class="text-sm">강</span></p>
                        </div>
                        <div class="bg-white rounded-xl shadow-md p-6 text-center hover:shadow-lg transition">
                            <div class="bg-green-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
                                <i class="fas fa-clock text-green-600 text-2xl"></i>
                            </div>
                            <p class="text-sm text-gray-600 mb-1">학습 시간</p>
                            <p class="text-2xl font-bold text-gray-900">\${Math.floor(course.total_duration_minutes / 60)}<span class="text-sm">시간</span></p>
                        </div>
                        <div class="bg-white rounded-xl shadow-md p-6 text-center hover:shadow-lg transition">
                            <div class="bg-orange-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
                                <i class="fas fa-users text-orange-600 text-2xl"></i>
                            </div>
                            <p class="text-sm text-gray-600 mb-1">수강생</p>
                            <p class="text-2xl font-bold text-gray-900">\${course.enrolled_count || 0}<span class="text-sm">명</span></p>
                        </div>
                    </div>
                    
                    \${ncsBanner}
                    \${cg === 'CLASSIC' ? \`
                    <div class="rounded-2xl border border-slate-200/80 bg-mst-surface p-6 md:p-8 mb-8 shadow-sm">
                        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <p class="text-sm font-semibold text-mst-accent uppercase tracking-wide">MINDSTORY Classic · Heritage</p>
                                <h3 class="text-xl font-bold text-mst-navy mt-1">학습 상담 & 기록</h3>
                                <p class="text-slate-600 mt-2 text-sm">상담 일지와 학습 기록을 남기고 전문가와 연결할 수 있습니다.</p>
                            </div>
                            <div class="flex flex-wrap gap-3">
                                <a href="mailto:support@mindstory.kr?subject=상담%20신청" class="inline-flex items-center justify-center rounded-xl bg-mst-navy text-white px-5 py-3 font-semibold hover:bg-mst-navy-light transition">
                                    <i class="fas fa-comments mr-2"></i>상담 신청
                                </a>
                            </div>
                        </div>
                    </div>
                    \` : \`
                    <div class="rounded-2xl border border-next-accent/20 bg-white p-6 md:p-8 mb-8 shadow-md">
                        <p class="text-sm font-semibold text-next-accent uppercase tracking-wide">MINDSTORY Next</p>
                        <h3 class="text-xl font-bold text-next-ink mt-1">AI 동화 제작 진행</h3>
                        <div class="mt-4 flex flex-wrap gap-2">
                            \${[1,2,3,4,5].map(function(n) { return '<span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 text-next-ink">Step '+n+'</span>' }).join('')}
                        </div>
                        <div class="mt-6 flex flex-wrap gap-3">
                            <button type="button" onclick="startNextDigitalBook()" class="inline-flex items-center justify-center rounded-xl bg-next-accent text-white px-5 py-3 font-semibold hover:bg-blue-700 transition">
                                <i class="fas fa-magic mr-2"></i>AI 동화 만들기
                            </button>
                            <button type="button" onclick="publishDigitalBook()" class="inline-flex items-center justify-center rounded-xl border-2 border-next-accent text-next-accent px-5 py-3 font-semibold hover:bg-slate-50 transition">
                                <i class="fas fa-barcode mr-2"></i>출판하기 (ISBN)
                            </button>
                        </div>
                        <p class="text-xs text-slate-500 mt-3">동화 초안은 로그인 후 저장되며, 과정에 ISBN이 켜져 있으면 출판 시 번호가 할당됩니다.</p>
                    </div>
                    \`}
                    
                    <!-- 커리큘럼 섹션 -->
                    <div class="bg-white rounded-2xl shadow-lg p-8">
                        <div class="flex items-center justify-between mb-6">
                            <h2 class="text-3xl font-bold text-gray-900">
                                <i class="fas fa-list-ul mr-3 text-purple-600"></i>커리큘럼
                            </h2>
                            <span class="bg-purple-100 text-purple-700 px-4 py-2 rounded-full font-semibold">
                                총 \${lessons.length}개 강의
                            </span>
                        </div>
                        <div class="space-y-3">
                            \${lessons.map((lesson, index) => \`
                                <div onclick="goToLesson(\${course.id}, \${lesson.id}, \${lesson.is_preview || lesson.is_free_preview ? 1 : 0}, \${hasAccess ? true : false})" 
                                     class="group bg-gray-50 hover:bg-purple-50 border-2 border-gray-200 hover:border-purple-400 rounded-xl p-5 transition-all cursor-pointer transform hover:scale-[1.02]">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center flex-1 gap-4">
                                            <div class="bg-gradient-to-br from-purple-600 to-indigo-600 group-hover:from-purple-700 group-hover:to-indigo-700 text-white font-bold w-14 h-14 rounded-xl flex items-center justify-center text-xl shadow-md transition">
                                                \${index + 1}
                                            </div>
                                            <div class="flex-1">
                                                <div class="flex items-center flex-wrap gap-2 mb-1">
                                                    <span class="font-bold text-gray-900 text-lg group-hover:text-purple-700 transition">\${lesson.title}</span>
                                                    \${lesson.is_preview || lesson.is_free_preview ? '<span class="inline-flex items-center gap-1 bg-amber-100 text-amber-900 px-3 py-1 rounded-full text-xs font-bold border border-amber-200/80">✨ 무료 맛보기</span>' : ''}
                                                </div>
                                                <div class="flex items-center gap-4 text-sm text-gray-600">
                                                    <span><i class="fas fa-clock mr-1 text-purple-600"></i>\${lesson.video_duration_minutes || 0}분</span>
                                                    \${lesson.video_url ? '<span class="text-green-600"><i class="fas fa-video mr-1"></i>영상 있음</span>' : '<span class="text-gray-400"><i class="fas fa-video-slash mr-1"></i>영상 준비 중</span>'}
                                                </div>
                                            </div>
                                        </div>
                                        <button class="bg-gradient-to-r from-purple-600 to-indigo-600 group-hover:from-purple-700 group-hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-bold transition-all transform group-hover:scale-110 shadow-md">
                                            <i class="fas fa-play mr-2"></i>재생
                                        </button>
                                    </div>
                                </div>
                            \`).join('')}
                        </div>
                    </div>
                \`
                
                document.getElementById('courseDetail').innerHTML = detailHtml
                
            } catch (error) {
                console.error('[ERROR] Failed to load course:', error)
                console.error('[ERROR] Error details:', error.message, error.stack)
                if (error.response) {
                    console.error('[ERROR] Response status:', error.response.status)
                    console.error('[ERROR] Response data:', error.response.data)
                }
                document.getElementById('courseDetail').innerHTML = \`
                    <div class="text-center py-12">
                        <i class="fas fa-exclamation-circle text-5xl text-red-500 mb-4"></i>
                        <p class="text-xl text-gray-700">과정 정보를 불러오는데 실패했습니다.</p>
                        <button onclick="window.location.href='/'" class="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">
                            홈으로 돌아가기
                        </button>
                    </div>
                \`
            }
        }
        
        let lastDigitalBookId = null
        async function startNextDigitalBook() {
            const user = await getCurrentUser()
            if (!user) {
                showToast('로그인이 필요합니다.', 'error')
                setTimeout(function() { window.location.href = '/login?redirect=/courses/' + courseId }, 800)
                return
            }
            try {
                const r = await axios.post('/api/digital-books', {
                    title: '나의 동화 ' + new Date().toLocaleString('ko-KR'),
                    course_id: parseInt(courseId, 10),
                    content_json: { step: 1, draft: true }
                }, { withCredentials: true })
                if (r.data && r.data.success) {
                    lastDigitalBookId = r.data.data.id
                    showToast('동화 초안이 저장되었습니다.', 'success')
                }
            } catch (e) {
                showToast((e.response && e.response.data && e.response.data.error) || '저장 실패', 'error')
            }
        }
        async function publishDigitalBook() {
            const user = await getCurrentUser()
            if (!user) {
                showToast('로그인이 필요합니다.', 'error')
                return
            }
            try {
                if (!lastDigitalBookId) {
                    const r0 = await axios.post('/api/digital-books', {
                        title: '나의 동화',
                        course_id: parseInt(courseId, 10),
                        content_json: {}
                    }, { withCredentials: true })
                    if (r0.data && r0.data.success) lastDigitalBookId = r0.data.data.id
                }
                if (!lastDigitalBookId) {
                    showToast('먼저 「AI 동화 만들기」로 초안을 만드세요.', 'error')
                    return
                }
                const r = await axios.post('/api/digital-books/' + lastDigitalBookId + '/publish', {}, { withCredentials: true })
                if (r.data && r.data.success) {
                    var d = r.data.data
                    showToast(d.isbn ? ('출판 완료 · ISBN ' + d.isbn) : '출판 완료', 'success')
                    if (d.barcode_url) window.open(d.barcode_url, '_blank')
                }
            } catch (e) {
                showToast((e.response && e.response.data && e.response.data.error) || '출판 실패', 'error')
            }
        }
        
        async function goToLesson(courseId, lessonId, isFreePreview, isEnrolled) {
            // 관리자는 모든 차시 프리패스 (수강신청/결제 없이 학습 플레이어로)
            const user = await getCurrentUser()
            if (user && user.role === 'admin') {
                window.location.href = \`/courses/\${courseId}/learn?lesson=\${lessonId}\`
                return
            }
            
            // 무료 미리보기이거나 수강 중이면 바로 이동
            if (isFreePreview || isEnrolled) {
                window.location.href = \`/courses/\${courseId}/learn?lesson=\${lessonId}\`
            } else {
                // 수강 신청 필요
                if (!user) {
                    showToast('로그인이 필요합니다.', 'error')
                    setTimeout(() => {
                        window.location.href = '/login?redirect=/courses/' + courseId
                    }, 1000)
                } else {
                    showToast('수강 신청이 필요합니다.', 'warning')
                }
            }
        }
        
        async function enrollCourse(courseId) {
            const user = await getCurrentUser()
            if (!user) {
                showToast('로그인이 필요합니다.', 'error')
                setTimeout(() => {
                    window.location.href = '/login?redirect=/courses/' + courseId
                }, 1000)
                return
            }
            
            try {
                // 과정 정보 다시 조회 (무료/유료 확인)
                const courseResponse = await axios.get(\`/api/courses/\${courseId}\`, { withCredentials: true })
                const course = courseResponse.data?.data?.course
                
                const payAmt = (function () {
                    if (!course) return 0
                    const p = Number(course.price)
                    const base = Number.isFinite(p) ? p : 0
                    const d = course.discount_price != null ? Number(course.discount_price) : NaN
                    return Number.isFinite(d) && d > 0 ? d : base
                })()
                const isFree = payAmt <= 0
                
                if (isFree) {
                    // 무료 과정: 수강신청 후 내 강의실로 이동
                    const response = await axios.post(
                        '/api/enrollments',
                        { courseId: courseId },
                        { withCredentials: true }
                    )
                    
                    if (response.data.success) {
                        showToast('수강 신청이 완료되었습니다!', 'success')
                        setTimeout(() => {
                            window.location.href = '/my-courses'
                        }, 1000)
                    }
                } else {
                    // 유료 과정: 결제 페이지로 이동
                    window.location.href = '/payment/checkout/' + courseId
                }
            } catch (error) {
                const message = error.response?.data?.error || '수강 신청에 실패했습니다.'
                showToast(message, 'error')
            }
        }
        
        document.addEventListener('DOMContentLoaded', () => {
            loadCourseDetail()
        })
    </script>
    
    ${getFooter()}
    ${getCommonFoot()}
  `)
})

/**
 * DEPRECATED: This route is now handled by pages-student.ts
 * 이 라우트는 pages-student.ts에서 처리됩니다 (차시 상세 정보만 표시)
 * 영상 재생은 /courses/:id/learn 에서 처리됩니다
 */
/* COMMENTED OUT - Conflicting with pages-student.ts
pages.get('/courses/:courseId/lessons/:lessonId', async (c) => {
  const courseId = c.req.param('courseId')
  const lessonId = c.req.param('lessonId')
  
  return c.html(`
    ${getCommonHead('차시 학습')}
    ${getHeader()}
    
    <div class="min-h-screen bg-gray-50 py-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div id="lessonContent">
                <div class="text-center py-12">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p class="mt-4 text-gray-600">차시 정보를 불러오는 중...</p>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        const courseId = '${courseId}'
        const lessonId = '${lessonId}'
        
        let currentLesson = null
        let allLessons = []
        let enrollment = null
        
        async function loadLessonContent() {
            try {
                const token = AuthManager.getSessionToken()
                
                // 차시 정보 조회
                const lessonResponse = await axios.get(\`/api/courses/\${courseId}/lessons/\${lessonId}\`, {
                    headers: token ? { 'Authorization': \`Bearer \${token}\` } : {}
                })
                currentLesson = lessonResponse.data.data.lesson
                enrollment = lessonResponse.data.data.enrollment
                
                // 전체 차시 목록 조회
                const lessonsResponse = await axios.get(\`/api/courses/\${courseId}/lessons\`, {
                    headers: token ? { 'Authorization': \`Bearer \${token}\` } : {}
                })
                allLessons = lessonsResponse.data.data
                
                renderLessonContent()
                
                // 학습 진도 기록 (로그인한 경우만)
                if (token && enrollment) {
                    recordProgress()
                }
                
            } catch (error) {
                console.error('Load lesson error:', error)
                console.error('Error details:', {
                    message: error.message,
                    response: error.response,
                    stack: error.stack
                })
                const message = error.response?.data?.error || '차시 정보를 불러오지 못했습니다.'
                document.getElementById('lessonContent').innerHTML = \`
                    <div class="text-center py-12">
                        <i class="fas fa-exclamation-circle text-6xl text-red-500 mb-4"></i>
                        <p class="text-xl text-gray-700">\${message}</p>
                        <p class="text-sm text-gray-500 mt-2">Error: \${error.message || JSON.stringify(error)}</p>
                        <a href="/courses/\${courseId}" class="mt-4 inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700">
                            강좌로 돌아가기
                        </a>
                    </div>
                \`
            }
        }
        
        function renderLessonContent() {
            const currentIndex = allLessons.findIndex(l => l.id == lessonId)
            const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null
            const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null
            
            // 영상 URL 처리
            let videoHtml = ''
            if (currentLesson.video_url) {
                if (currentLesson.video_provider === 'youtube') {
                    videoHtml = \`
                        <div class="relative pb-[56.25%] h-0">
                            <iframe 
                                src="\${currentLesson.video_url}" 
                                class="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
                                frameborder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowfullscreen>
                            </iframe>
                        </div>
                    \`
                } else {
                    // 로컬 또는 R2 저장소 영상
                    // video_url이 /uploads/로 시작하면 로컬 파일, 아니면 R2
                    let videoUrl = currentLesson.video_url
                    if (!videoUrl.startsWith('/uploads/') && !videoUrl.startsWith('http')) {
                        videoUrl = \`/api/storage/\${videoUrl}\`
                    }
                    videoHtml = \`
                        <video 
                            id="lessonVideo"
                            class="w-full rounded-lg shadow-lg"
                            controls 
                            controlsList="nodownload"
                            oncontextmenu="return false;"
                            onended="handleVideoEnd()">
                            <source src="\${videoUrl}" type="video/mp4">
                            <p class="text-red-500">브라우저가 영상 재생을 지원하지 않습니다.</p>
                            <p class="text-sm text-gray-500">영상 URL: \${videoUrl}</p>
                        </video>
                    \`
                }
            } else {
                videoHtml = \`
                    <div class="bg-gray-200 rounded-lg p-12 text-center">
                        <i class="fas fa-video-slash text-6xl text-gray-400 mb-4"></i>
                        <p class="text-xl text-gray-600">영상이 준비 중입니다.</p>
                    </div>
                \`
            }
            
            const html = \`
                <div class="grid lg:grid-cols-3 gap-6">
                    <!-- 왼쪽: 영상 플레이어 -->
                    <div class="lg:col-span-2">
                        <!-- 영상 -->
                        <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                            \${videoHtml}
                        </div>
                        
                        <!-- 차시 정보 -->
                        <div class="bg-white rounded-lg shadow-lg p-6">
                            <div class="flex items-start justify-between mb-4">
                                <div>
                                    <div class="flex items-center gap-2 mb-2">
                                        <span class="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-semibold">
                                            \${currentLesson.lesson_number}강
                                        </span>
                                        \${currentLesson.is_preview || currentLesson.is_free_preview ? 
                                            '<span class="bg-amber-100 text-amber-900 px-3 py-1 rounded-full text-sm font-semibold border border-amber-200">✨ 무료 맛보기</span>' : 
                                            ''
                                        }
                                    </div>
                                    <h1 class="text-3xl font-bold text-gray-900">\${currentLesson.title}</h1>
                                </div>
                                <div class="text-right">
                                    <p class="text-sm text-gray-500">재생 시간</p>
                                    <p class="text-2xl font-bold text-indigo-600">\${currentLesson.video_duration_minutes || 0}분</p>
                                </div>
                            </div>
                            
                            \${currentLesson.description ? \`
                                <div class="border-t pt-4">
                                    <h3 class="font-semibold text-gray-900 mb-2">학습 내용</h3>
                                    <p class="text-gray-600 whitespace-pre-wrap">\${currentLesson.description}</p>
                                </div>
                            \` : ''}
                            
                            <!-- 네비게이션 버튼 -->
                            <div class="border-t pt-4 mt-4 flex justify-between">
                                \${prevLesson ? \`
                                    <a href="/courses/\${courseId}/lessons/\${prevLesson.id}" 
                                       class="flex items-center text-indigo-600 hover:text-indigo-800">
                                        <i class="fas fa-chevron-left mr-2"></i>
                                        <div class="text-left">
                                            <p class="text-xs text-gray-500">이전 차시</p>
                                            <p class="font-semibold">\${prevLesson.lesson_number}강. \${prevLesson.title}</p>
                                        </div>
                                    </a>
                                \` : '<div></div>'}
                                
                                \${nextLesson ? \`
                                    <a href="/courses/\${courseId}/lessons/\${nextLesson.id}" 
                                       class="flex items-center text-indigo-600 hover:text-indigo-800">
                                        <div class="text-right">
                                            <p class="text-xs text-gray-500">다음 차시</p>
                                            <p class="font-semibold">\${nextLesson.lesson_number}강. \${nextLesson.title}</p>
                                        </div>
                                        <i class="fas fa-chevron-right ml-2"></i>
                                    </a>
                                \` : '<div></div>'}
                            </div>
                        </div>
                    </div>
                    
                    <!-- 오른쪽: 전체 차시 목록 -->
                    <div class="lg:col-span-1">
                        <div class="bg-white rounded-lg shadow-lg p-6 sticky top-6">
                            <div class="mb-4">
                                <div class="flex items-center justify-between mb-2">
                                    <h2 class="text-xl font-bold text-gray-900">
                                        <i class="fas fa-list mr-2"></i>전체 차시
                                    </h2>
                                    <span class="text-sm text-gray-600">
                                        <span class="font-bold text-indigo-600">\${currentIndex + 1}</span>/\${allLessons.length}
                                    </span>
                                </div>
                                <!-- 전체 진도율 -->
                                <div class="mb-3">
                                    <div class="flex items-center justify-between text-sm mb-1">
                                        <span class="text-gray-600">학습 진도</span>
                                        <span class="font-bold text-indigo-600">
                                            \${Math.round(((currentIndex + 1) / allLessons.length) * 100)}%
                                        </span>
                                    </div>
                                    <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                        <div class="bg-gradient-to-r from-purple-600 to-indigo-600 h-3 rounded-full transition-all duration-500 ease-out"
                                             style="width: \${((currentIndex + 1) / allLessons.length) * 100}%"></div>
                                    </div>
                                </div>
                            </div>
                            <div class="space-y-2 max-h-[500px] overflow-y-auto">
                                \${allLessons.map((lesson, idx) => {
                                    const isCompleted = idx < currentIndex;
                                    const isCurrent = lesson.id == lessonId;
                                    return \`
                                    <a href="/courses/\${courseId}/lessons/\${lesson.id}" 
                                       class="block p-3 rounded-lg transition-all hover:shadow-md \${
                                         isCurrent ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-400 shadow-md' : 
                                         isCompleted ? 'bg-green-50 border-2 border-green-200' :
                                         'bg-white border border-gray-200 hover:border-purple-300'
                                       }">
                                        <div class="flex items-start justify-between">
                                            <div class="flex-1">
                                                <div class="flex items-center gap-2 mb-1">
                                                    <span class="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold \${
                                                        isCurrent ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white' :
                                                        isCompleted ? 'bg-green-600 text-white' :
                                                        'bg-gray-200 text-gray-600'
                                                    }">
                                                        \${isCompleted ? '<i class="fas fa-check"></i>' : lesson.lesson_number}
                                                    </span>
                                                    \${lesson.is_preview || lesson.is_free_preview ? 
                                                        '<span class="text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-semibold border border-amber-200/80">✨ 맛보기</span>' : 
                                                        ''
                                                    }
                                                </div>
                                                <p class="text-sm font-medium \${
                                                    isCurrent ? 'text-purple-700' :
                                                    isCompleted ? 'text-green-700' :
                                                    'text-gray-700'
                                                }">\${lesson.title}</p>
                                                <p class="text-xs text-gray-500 mt-1">
                                                    <i class="fas fa-clock mr-1"></i>\${lesson.video_duration_minutes || 0}분
                                                </p>
                                            </div>
                                            <div class="ml-2">
                                                \${isCurrent ? 
                                                    '<i class="fas fa-play-circle text-3xl text-purple-600 animate-pulse"></i>' :
                                                    isCompleted ?
                                                    '<i class="fas fa-check-circle text-3xl text-green-600"></i>' :
                                                    '<i class="far fa-circle text-3xl text-gray-300"></i>'
                                                }
                                            </div>
                                        </div>
                                    </a>
                                \`;
                                }).join('')}
                            </div>
                            
                            <div class="mt-6 pt-6 border-t">
                                <a href="/courses/\${courseId}" 
                                   class="block w-full text-center bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-4 py-3 rounded-lg hover:from-gray-200 hover:to-gray-300 transition font-semibold">
                                    <i class="fas fa-arrow-left mr-2"></i>강좌로 돌아가기
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            \`
            
            document.getElementById('lessonContent').innerHTML = html
            
            // 비디오 요소 이벤트 리스너 추가 (DOM 삽입 후)
            const videoElement = document.getElementById('lessonVideo')
            if (videoElement) {
                videoElement.addEventListener('error', (e) => {
                    console.error('[VIDEO] Video error event:', e)
                    console.error('[VIDEO] Error code:', videoElement.error?.code)
                    console.error('[VIDEO] Error message:', videoElement.error?.message)
                })
            }
        }
        
        function handleVideoEnd() {
            // 영상 종료 시 다음 차시로 이동 제안
            const currentIndex = allLessons.findIndex(l => l.id == lessonId)
            const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null
            
            if (nextLesson) {
                if (confirm('다음 차시로 이동하시겠습니까?')) {
                    window.location.href = \`/courses/\${courseId}/lessons/\${nextLesson.id}\`
                }
            } else {
                showToast('모든 차시를 완료했습니다! 축하합니다! 🎉', 'success')
            }
        }
        
        async function recordProgress() {
            try {
                const token = AuthManager.getSessionToken()
                await axios.post(\`/api/progress/\${enrollment.id}/lessons/\${lessonId}\`, 
                    { completed: true },
                    { headers: { 'Authorization': \`Bearer \${token}\` } }
                )
            } catch (error) {
                console.error('Record progress error:', error)
            }
        }
        
        // 모든 스크립트 로드 후 실행
        window.addEventListener('load', () => {
            if (typeof axios === 'undefined' || typeof AuthManager === 'undefined') {
                console.error('[LESSON] Required libraries not loaded!')
                document.getElementById('lessonContent').innerHTML = \`
                    <div class="text-center py-12">
                        <i class="fas fa-exclamation-circle text-6xl text-red-500 mb-4"></i>
                        <p class="text-xl text-gray-700">필수 라이브러리 로드 실패</p>
                        <p class="text-sm text-gray-500 mt-2">axios: \${typeof axios}, AuthManager: \${typeof AuthManager}</p>
                        <button onclick="location.reload()" class="mt-4 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700">
                            새로고침
                        </button>
                    </div>
                \`
                return
            }
            loadLessonContent()
        })
    </script>
    
    ${getFooter()}
    ${getCommonFoot()}
  `)
})
*/ // END OF COMMENTED OUT ROUTE

/**
 * GET /courses
 * 전체 강좌 목록 페이지
 */
pages.get('/courses', async (c) => {
  return c.html(`
    ${getCommonHead('전체 강좌')}
    ${await getHeader(c)}
    
    <main class="min-h-screen bg-gray-50 py-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-8">전체 강좌</h1>
        
        <div id="coursesGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div class="text-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p class="mt-4 text-gray-600">강좌 목록을 불러오는 중...</p>
          </div>
        </div>
      </div>
    </main>
    
    ${getFooter()}
    
    <script>
      function formatCourseCatalogLine(cg) {
        const raw = String(cg || 'CLASSIC').toUpperCase().replace(/\\s/g, '').split(/[,，]/).filter(Boolean)
        const al = ['CLASSIC', 'NEXT', 'NCS']
        const keys = raw.filter((p) => al.includes(p))
        const u = keys.length ? keys : ['CLASSIC']
        return u.map((k) => (k === 'NEXT' ? 'Next' : k === 'NCS' ? 'NCS' : 'Classic')).join(' · ')
      }
      async function loadAllCoursesGridPage() {
        try {
          const response = await axios.get('/api/courses')
          const courses = response.data.data || []
          
          const grid = document.getElementById('coursesGrid')
          if (courses.length === 0) {
            grid.innerHTML = '<p class="text-center text-gray-600 col-span-full">등록된 강좌가 없습니다.</p>'
            return
          }
          
          grid.innerHTML = courses.map(course => \`
            <a href="/courses/\${course.id}" class="group block bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow ring-1 ring-slate-200/80">
              <div class="relative aspect-[16/10] w-full overflow-hidden bg-slate-900">
                <img src="\${course.thumbnail_url || '/static/images/course-placeholder.svg'}"
                     alt=""
                     class="absolute inset-0 w-full h-full object-cover transition duration-500 group-hover:scale-[1.03]"
                     onerror="this.src='/static/images/course-placeholder.svg'">
                <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none"></div>
                <div class="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                  <h3 class="text-lg md:text-xl font-bold text-white leading-snug line-clamp-2 drop-shadow-sm">\${course.title}</h3>
                  <p class="text-gray-300 text-sm mt-1.5 line-clamp-1">\${formatCourseCatalogLine(course.category_group)} · 온라인 강좌</p>
                </div>
              </div>
              <div class="p-4 flex justify-between items-center gap-3 border-t border-slate-100">
                <span class="text-indigo-600 font-semibold tabular-nums">\${(() => { const p = Number(course.price)||0; const d = course.discount_price != null ? Number(course.discount_price) : NaN; const a = Number.isFinite(d)&&d>0?d:p; return a > 0 ? a.toLocaleString() + '원' : '무료'; })()}</span>
                <span class="text-sm font-medium text-slate-500 group-hover:text-indigo-600 transition-colors">자세히 보기 <i class="fas fa-chevron-right text-xs ml-0.5"></i></span>
              </div>
            </a>
          \`).join('')
        } catch (error) {
          console.error('Failed to load courses:', error)
          document.getElementById('coursesGrid').innerHTML = 
            '<p class="text-center text-red-600 col-span-full">강좌 목록을 불러오지 못했습니다.</p>'
        }
      }
      
      loadAllCoursesGridPage()
    </script>
    
    ${getCommonFoot()}
  `)
})

export default pages
