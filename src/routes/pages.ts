/**
 * 페이지 라우트 (HTML 페이지 서빙)
 */

import { Hono } from 'hono'
import { Bindings } from '../types/database'

const pages = new Hono<{ Bindings: Bindings }>()

// 공통 헤더/푸터 컴포넌트
const getHeader = () => `
<header class="bg-white shadow-sm sticky top-0 z-40">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-4">
            <div class="flex items-center">
                <a href="/" class="text-2xl font-bold text-indigo-600">마인드스토리 원격평생교육원</a>
            </div>
            <nav class="hidden md:flex space-x-8 items-center">
                <a href="/" class="text-gray-700 hover:text-indigo-600">홈</a>
                <a href="/#courses" class="text-gray-700 hover:text-indigo-600">과정 안내</a>
                <a href="/my-courses" class="text-gray-700 hover:text-indigo-600">내 강의실</a>
                
                <!-- 관리자 모드 전환 버튼 -->
                <div id="adminModeSwitch" class="flex items-center space-x-2" style="display:none">
                    <span class="text-gray-500 text-sm">|</span>
                    <a href="/admin/dashboard" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors duration-200">
                        <i class="fas fa-user-shield mr-1"></i>
                        관리자 모드
                    </a>
                </div>
            </nav>
            <div id="headerAuthButtons" class="flex items-center space-x-4">
                <a href="/login" class="text-gray-700 hover:text-indigo-600">로그인</a>
                <a href="/register" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">회원가입</a>
            </div>
            <div id="headerUserMenu" class="flex items-center space-x-4" style="display:none">
                <span class="text-gray-700" id="headerUserName"></span>
                <button onclick="handleLogout()" class="text-gray-700 hover:text-indigo-600">로그아웃</button>
            </div>
        </div>
    </div>
</header>
`

const getFooter = () => `
<footer class="bg-gray-800 text-white py-8 mt-12">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid md:grid-cols-3 gap-8">
            <div>
                <h4 class="text-lg font-semibold mb-4">마인드스토리 원격평생교육원</h4>
                <p class="text-gray-400 text-sm">
                    시간 관리와 심리학을 결합한<br>
                    전문 교육 플랫폼
                </p>
            </div>
            <div>
                <h4 class="text-lg font-semibold mb-4">바로가기</h4>
                <ul class="space-y-2 text-sm">
                    <li><a href="/terms" class="text-gray-400 hover:text-white">이용약관</a></li>
                    <li><a href="/privacy" class="text-gray-400 hover:text-white">개인정보처리방침</a></li>
                    <li><a href="/refund" class="text-gray-400 hover:text-white">환불규정</a></li>
                </ul>
            </div>
            <div>
                <h4 class="text-lg font-semibold mb-4">문의</h4>
                <p class="text-gray-400 text-sm">
                    이메일: contact@mindstory.co.kr<br>
                    운영시간: 평일 10:00 - 18:00
                </p>
            </div>
        </div>
        <div class="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400">
            © 2025 마인드스토리 원격평생교육원. All rights reserved.
        </div>
    </div>
</footer>
`

const getCommonHead = (title: string) => `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - 마인드스토리 원격평생교육원</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script src="/static/js/auth.js?v=2025122914"></script>
    <script src="/static/js/utils.js?v=2025122914"></script>
</head>
<body class="bg-gray-50">
`

const getCommonFoot = () => `
<script>
  // 헤더 업데이트 (로그인 상태 및 관리자 링크 자동 처리)
  document.addEventListener('DOMContentLoaded', () => {
    updateHeader()
  })
</script>
</body>
</html>
`

/**
 * 로그인 페이지
 */
pages.get('/login', (c) => {
  return c.html(`
    ${getCommonHead('로그인')}
    ${getHeader()}
    
    <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-md w-full space-y-8">
            <div>
                <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    로그인
                </h2>
                <p class="mt-2 text-center text-sm text-gray-600">
                    또는
                    <a href="/register" class="font-medium text-indigo-600 hover:text-indigo-500">
                        회원가입하기
                    </a>
                </p>
            </div>
            <form id="loginForm" class="mt-8 space-y-6">
                <div class="rounded-md shadow-sm space-y-4">
                    <div>
                        <label for="email" class="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                        <input id="email" name="email" type="email" required
                            class="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="이메일을 입력하세요">
                    </div>
                    <div>
                        <label for="password" class="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                        <input id="password" name="password" type="password" required
                            class="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="비밀번호를 입력하세요">
                    </div>
                </div>

                <div>
                    <button type="submit"
                        class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        로그인
                    </button>
                </div>
            </form>
            
            <!-- 소셜 로그인 구분선 -->
            <div class="mt-6">
                <div class="relative">
                    <div class="absolute inset-0 flex items-center">
                        <div class="w-full border-t border-gray-300"></div>
                    </div>
                    <div class="relative flex justify-center text-sm">
                        <span class="px-2 bg-gray-50 text-gray-500">또는 간편 로그인</span>
                    </div>
                </div>
            </div>
            
            <!-- Google 로그인 버튼 -->
            <div class="mt-6">
                <button onclick="loginWithGoogle()" type="button"
                    class="w-full flex items-center justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                    <svg class="w-5 h-5 mr-2" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                    Google로 계속하기
                </button>
            </div>
            
            <!-- 카카오 로그인 버튼 -->
            <div class="mt-3">
                <button onclick="loginWithKakao()" type="button"
                    class="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-900 hover:opacity-90 transition-opacity"
                    style="background-color: #FEE500;">
                    <img src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_small.png" 
                         alt="Kakao" class="w-5 h-5 mr-2">
                    카카오로 시작하기
                </button>
            </div>
        </div>
    </div>

    <script>
        // Google 로그인 함수
        function loginWithGoogle() {
            window.location.href = '/api/auth/google/login';
        }
        
        // 카카오 로그인 함수
        function loginWithKakao() {
            window.location.href = '/api/auth/kakao/login';
        }
    </script>
    <script>
        // 이미 로그인된 경우 리다이렉트
        if (AuthManager.isLoggedIn()) {
            const urlParams = new URLSearchParams(window.location.search)
            const redirect = urlParams.get('redirect') || '/my-courses'
            window.location.href = redirect
        }

        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault()
            
            const email = document.getElementById('email').value
            const password = document.getElementById('password').value
            
            try {
                const response = await axios.post('/api/auth/login', { email, password })
                
                if (response.data.success) {
                    AuthManager.saveSession(response.data.data.session_token, response.data.data.user)
                    showToast('로그인되었습니다.', 'success')
                    
                    // 역할에 따른 리다이렉트
                    setTimeout(() => {
                        const urlParams = new URLSearchParams(window.location.search)
                        const redirect = urlParams.get('redirect')
                        
                        if (redirect) {
                            // 리다이렉트 파라미터가 있으면 해당 페이지로
                            window.location.href = redirect
                        } else {
                            // 관리자는 관리자 대시보드, 일반 사용자는 홈
                            const user = response.data.data.user
                            if (user.role === 'admin') {
                                window.location.href = '/admin/dashboard'
                            } else {
                                window.location.href = '/'
                            }
                        }
                    }, 500)
                }
            } catch (error) {
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
pages.get('/register', (c) => {
  return c.html(`
    ${getCommonHead('회원가입')}
    ${getHeader()}
    
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
                    <button onclick="selectRegisterMethod('email')" 
                        class="w-full flex items-center justify-center gap-3 px-6 py-5 bg-indigo-600 border-2 border-indigo-600 rounded-lg hover:bg-indigo-700 transition-all shadow-lg">
                        <i class="fas fa-envelope text-2xl text-white"></i>
                        <div class="text-left">
                            <div class="text-lg font-bold text-white">이메일로 가입하기</div>
                            <div class="text-sm text-indigo-100">가장 빠르고 안전한 방법 (추천)</div>
                        </div>
                    </button>
                </div>
                
                <!-- 소셜 로그인 (Google만) -->
                <div class="space-y-3">
                    <div class="text-center text-sm text-gray-500 mb-2">또는 소셜 계정으로</div>
                    
                    <!-- 구글로 계속하기 ✅ -->
                    <button onclick="registerWithGoogle()" 
                        class="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all shadow-md">
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
                            <span class="text-sm text-gray-700">(필수) <a href="/terms" class="text-indigo-600 hover:underline" target="_blank">이용약관</a>에 동의합니다</span>
                        </label>
                        <label class="flex items-center">
                            <input id="email_privacy_agreed" type="checkbox" required class="mr-2 w-4 h-4">
                            <span class="text-sm text-gray-700">(필수) <a href="/privacy" class="text-indigo-600 hover:underline" target="_blank">개인정보처리방침</a>에 동의합니다</span>
                        </label>
                        <label class="flex items-center">
                            <input id="email_marketing_agreed" type="checkbox" class="mr-2 w-4 h-4">
                            <span class="text-sm text-gray-700">(선택) 마케팅 정보 수신에 동의합니다</span>
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
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <p class="text-gray-700 mb-4">카카오 계정으로 간편하게 가입하실 수 있습니다.</p>
                    <p class="text-sm text-gray-600 mb-6">카카오 계정 정보를 활용하여 빠르게 가입이 완료됩니다.</p>
                    <button onclick="registerWithKakao()" type="button"
                        class="w-full md:w-auto px-8 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-900 hover:opacity-90 transition-opacity"
                        style="background-color: #FEE500;">
                        <img src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_small.png" 
                             alt="Kakao" class="w-5 h-5 inline mr-2">
                        카카오로 시작하기
                    </button>
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
                                <span class="text-sm text-gray-700">(필수) <a href="/terms" class="text-green-600 hover:underline" target="_blank">이용약관</a>에 동의합니다</span>
                            </label>
                            <label class="flex items-center">
                                <input id="phone_privacy_agreed" type="checkbox" required class="mr-2 w-4 h-4">
                                <span class="text-sm text-gray-700">(필수) <a href="/privacy" class="text-green-600 hover:underline" target="_blank">개인정보처리방침</a>에 동의합니다</span>
                            </label>
                            <label class="flex items-center">
                                <input id="phone_marketing_agreed" type="checkbox" class="mr-2 w-4 h-4">
                                <span class="text-sm text-gray-700">(선택) 마케팅 정보 수신에 동의합니다</span>
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
            window.location.href = '/my-courses'
        }

        // ===== 유효성 검사 함수 =====

        // 이메일 형식 검증
        function validateEmail(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            return re.test(email)
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
            window.location.href = '/api/auth/kakao/login'
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
            
            // 60세 기준 (현재년도 - 60 ~ 현재년도 - 18)
            const currentYear = new Date().getFullYear()
            for (let year = currentYear - 60; year <= currentYear - 18; year++) {
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
            if (!validateEmail(email)) {
                showToast('올바른 이메일 형식이 아닙니다.', 'error')
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
            
            // 테스트 모드: 인증번호 123456
            showToast('인증번호가 발송되었습니다. (테스트: 123456)', 'success')
            
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
            
            // 테스트 모드: 인증번호 123456
            if (code === '123456') {
                window.phoneVerified = true
                clearInterval(window.verificationTimer)
                document.getElementById('verificationCodeSection').style.display = 'none'
                document.getElementById('phoneVerifiedSection').style.display = 'block'
                showToast('휴대폰 인증이 완료되었습니다.', 'success')
            } else {
                showToast('인증번호가 일치하지 않습니다. (테스트: 123456)', 'error')
            }
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
    ${getHeader()}
    
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
                const { course, lessons, enrollment } = response.data.data
                
                // 현재 사용자 확인
                const currentUser = AuthManager.getCurrentUser()
                const isAdmin = currentUser && currentUser.role === 'admin'
                const hasAccess = isAdmin || enrollment
                
                const detailHtml = \`
                    <div class="bg-white rounded-lg shadow-lg overflow-hidden">
                        <!-- 과정 헤더 -->
                        <div class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-8">
                            <div class="max-w-4xl mx-auto">
                                <h1 class="text-4xl font-bold mb-4">\${course.title}</h1>
                                <p class="text-xl text-indigo-100">\${course.description || ''}</p>
                            </div>
                        </div>
                        
                        <!-- 과정 정보 -->
                        <div class="p-8">
                            <div class="max-w-4xl mx-auto">
                                <!-- 기본 정보 -->
                                <div class="grid md:grid-cols-3 gap-6 mb-8">
                                    <div class="bg-gray-50 p-4 rounded-lg text-center">
                                        <i class="fas fa-calendar text-3xl text-indigo-600 mb-2"></i>
                                        <p class="text-sm text-gray-600">수강 기간</p>
                                        <p class="text-xl font-bold text-gray-900">\${course.duration_days}일</p>
                                    </div>
                                    <div class="bg-gray-50 p-4 rounded-lg text-center">
                                        <i class="fas fa-book text-3xl text-indigo-600 mb-2"></i>
                                        <p class="text-sm text-gray-600">총 차시</p>
                                        <p class="text-xl font-bold text-gray-900">\${course.total_lessons}강</p>
                                    </div>
                                    <div class="bg-gray-50 p-4 rounded-lg text-center">
                                        <i class="fas fa-clock text-3xl text-indigo-600 mb-2"></i>
                                        <p class="text-sm text-gray-600">학습 시간</p>
                                        <p class="text-xl font-bold text-gray-900">\${Math.floor(course.total_duration_minutes / 60)}시간</p>
                                    </div>
                                </div>
                                
                                <!-- 가격 정보 -->
                                <div class="bg-indigo-50 p-6 rounded-lg mb-8">
                                    <div class="flex justify-between items-center">
                                        <div>
                                            <p class="text-gray-600 mb-2">수강료</p>
                                            \${course.is_free ? 
                                                '<p class="text-3xl font-bold text-green-600">무료</p>' :
                                                \`<div>
                                                    \${course.discount_price ? 
                                                        \`<p class="text-gray-400 line-through text-lg">\${course.price.toLocaleString()}원</p>
                                                        <p class="text-3xl font-bold text-indigo-600">\${course.discount_price.toLocaleString()}원</p>\` :
                                                        \`<p class="text-3xl font-bold text-indigo-600">\${course.price.toLocaleString()}원</p>\`
                                                    }
                                                </div>\`
                                            }
                                        </div>
                                        \${isAdmin ? 
                                            \`<button onclick="goToLesson(\${course.id}, \${lessons[0]?.id || 0}, true, true)" 
                                                     class="bg-purple-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-purple-700 transition">
                                                <i class="fas fa-user-shield mr-2"></i>관리자 모드로 학습하기
                                            </button>\` :
                                            \`<button onclick="enrollCourse(\${course.id})" 
                                                     class="bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-indigo-700 transition">
                                                \${enrollment ? '학습하기' : '수강 신청'}
                                            </button>\`
                                        }
                                    </div>
                                </div>
                                
                                <!-- 커리큘럼 -->
                                <div class="mb-8">
                                    <h2 class="text-2xl font-bold text-gray-900 mb-4">
                                        <i class="fas fa-list mr-2"></i>커리큘럼
                                    </h2>
                                    <div class="space-y-2">
                                        \${lessons.map((lesson, index) => \`
                                            <div onclick="goToLesson(\${course.id}, \${lesson.id}, \${lesson.is_free_preview}, \${enrollment ? true : false})" 
                                                 class="bg-white border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition cursor-pointer">
                                                <div class="flex justify-between items-center">
                                                    <div class="flex items-center flex-1">
                                                        <span class="bg-indigo-100 text-indigo-600 font-bold w-8 h-8 rounded-full flex items-center justify-center mr-3">
                                                            \${index + 1}
                                                        </span>
                                                        <span class="font-semibold text-gray-900 flex-1">\${lesson.title}</span>
                                                        \${lesson.is_free_preview ? '<span class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold ml-2">무료</span>' : ''}
                                                    </div>
                                                    <div class="flex items-center">
                                                        <span class="text-gray-500 text-sm mr-3">
                                                            <i class="fas fa-clock mr-1"></i>\${lesson.video_duration_minutes || 0}분
                                                        </span>
                                                        <i class="fas fa-play-circle text-indigo-600 text-2xl"></i>
                                                    </div>
                                                </div>
                                            </div>
                                        \`).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                \`
                
                document.getElementById('courseDetail').innerHTML = detailHtml
                
            } catch (error) {
                console.error('Failed to load course:', error)
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
        
        function goToLesson(courseId, lessonId, isFreePreview, isEnrolled) {
            // 관리자는 모든 영상 시청 가능
            const user = AuthManager.getCurrentUser()
            if (user && user.role === 'admin') {
                window.location.href = \`/courses/\${courseId}/lessons/\${lessonId}\`
                return
            }
            
            // 무료 미리보기이거나 수강 중이면 바로 이동
            if (isFreePreview || isEnrolled) {
                window.location.href = \`/courses/\${courseId}/lessons/\${lessonId}\`
            } else {
                // 수강 신청 필요
                if (!AuthManager.isLoggedIn()) {
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
            if (!AuthManager.isLoggedIn()) {
                showToast('로그인이 필요합니다.', 'error')
                setTimeout(() => {
                    window.location.href = '/login?redirect=/courses/' + courseId
                }, 1000)
                return
            }
            
            try {
                // 과정 정보 다시 조회 (무료/유료 확인)
                const courseResponse = await axios.get(\`/api/courses/\${courseId}\`)
                const course = courseResponse.data.data
                
                if (course.is_free) {
                    // 무료 과정: 바로 수강신청
                    const token = AuthManager.getSessionToken()
                    const response = await axios.post('/api/enrollments', 
                        { course_id: courseId },
                        { headers: { 'Authorization': \`Bearer \${token}\` } }
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
 * GET /courses/:courseId/lessons/:lessonId
 * 차시 학습 페이지 (영상 재생)
 */
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
                const message = error.response?.data?.error || '차시 정보를 불러오지 못했습니다.'
                document.getElementById('lessonContent').innerHTML = \`
                    <div class="text-center py-12">
                        <i class="fas fa-exclamation-circle text-6xl text-red-500 mb-4"></i>
                        <p class="text-xl text-gray-700">\${message}</p>
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
                    // R2 저장소 영상
                    const videoUrl = \`/api/storage/\${currentLesson.video_url}\`
                    videoHtml = \`
                        <video 
                            id="lessonVideo"
                            class="w-full rounded-lg shadow-lg"
                            controls 
                            controlsList="nodownload"
                            oncontextmenu="return false;"
                            onended="handleVideoEnd()">
                            <source src="\${videoUrl}" type="video/mp4">
                            Your browser does not support the video tag.
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
                                        \${currentLesson.is_free_preview ? 
                                            '<span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold"><i class="fas fa-unlock mr-1"></i>무료</span>' : 
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
                            <h2 class="text-xl font-bold text-gray-900 mb-4">
                                <i class="fas fa-list mr-2"></i>전체 차시
                            </h2>
                            <div class="space-y-2 max-h-[600px] overflow-y-auto">
                                \${allLessons.map(lesson => \`
                                    <a href="/courses/\${courseId}/lessons/\${lesson.id}" 
                                       class="block p-3 rounded-lg hover:bg-gray-50 transition \${lesson.id == lessonId ? 'bg-indigo-50 border-2 border-indigo-500' : 'border border-gray-200'}">
                                        <div class="flex items-start justify-between">
                                            <div class="flex-1">
                                                <div class="flex items-center gap-2 mb-1">
                                                    <span class="text-sm font-semibold text-gray-700">\${lesson.lesson_number}강</span>
                                                    \${lesson.is_free_preview ? 
                                                        '<span class="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">무료</span>' : 
                                                        ''
                                                    }
                                                </div>
                                                <p class="text-sm \${lesson.id == lessonId ? 'text-indigo-700 font-semibold' : 'text-gray-600'}">\${lesson.title}</p>
                                                <p class="text-xs text-gray-500 mt-1">
                                                    <i class="fas fa-clock mr-1"></i>\${lesson.video_duration_minutes || 0}분
                                                </p>
                                            </div>
                                            \${lesson.id == lessonId ? 
                                                '<i class="fas fa-play-circle text-2xl text-indigo-600"></i>' : 
                                                '<i class="fas fa-play-circle text-2xl text-gray-300"></i>'
                                            }
                                        </div>
                                    </a>
                                \`).join('')}
                            </div>
                            
                            <div class="mt-6 pt-6 border-t">
                                <a href="/courses/\${courseId}" 
                                   class="block w-full text-center bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition">
                                    <i class="fas fa-arrow-left mr-2"></i>강좌로 돌아가기
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            \`
            
            document.getElementById('lessonContent').innerHTML = html
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
                console.log('Progress recorded')
            } catch (error) {
                console.error('Record progress error:', error)
            }
        }
        
        document.addEventListener('DOMContentLoaded', () => {
            loadLessonContent()
        })
    </script>
    
    ${getFooter()}
    ${getCommonFoot()}
  `)
})

export default pages
