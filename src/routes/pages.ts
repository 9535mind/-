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
            <nav class="hidden md:flex space-x-8">
                <a href="/#courses" class="text-gray-700 hover:text-indigo-600">과정 안내</a>
                <a href="/my-courses" class="text-gray-700 hover:text-indigo-600">내 강의실</a>
                <a href="/admin" class="text-gray-700 hover:text-indigo-600" id="adminLink" style="display:none">관리자</a>
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
    <script src="/static/js/auth.js"></script>
    <script src="/static/js/utils.js"></script>
</head>
<body class="bg-gray-50">
`

const getCommonFoot = () => `
<script>
  // 헤더 업데이트
  document.addEventListener('DOMContentLoaded', () => {
    updateHeader()
    
    // 관리자 링크 표시
    if (AuthManager.isAdmin()) {
      document.getElementById('adminLink').style.display = 'block'
    }
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
            
            <!-- 카카오 로그인 버튼 -->
            <div class="mt-6">
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
                    
                    // 리다이렉트
                    setTimeout(() => {
                        const urlParams = new URLSearchParams(window.location.search)
                        const redirect = urlParams.get('redirect') || '/my-courses'
                        window.location.href = redirect
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
 * 회원가입 페이지
 */
pages.get('/register', (c) => {
  return c.html(`
    ${getCommonHead('회원가입')}
    ${getHeader()}
    
    <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-md w-full space-y-8">
            <div>
                <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    회원가입
                </h2>
                <p class="mt-2 text-center text-sm text-gray-600">
                    이미 계정이 있으신가요?
                    <a href="/login" class="font-medium text-indigo-600 hover:text-indigo-500">
                        로그인하기
                    </a>
                </p>
            </div>
            <form id="registerForm" class="mt-8 space-y-6">
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">이메일 *</label>
                        <input id="email" type="email" required
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">비밀번호 * (6자 이상)</label>
                        <input id="password" type="password" required minlength="6"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
                        <input id="name" type="text" required
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">휴대폰 번호</label>
                        <input id="phone" type="tel" placeholder="01012345678"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">생년월일</label>
                        <div class="grid grid-cols-3 gap-2">
                            <select id="birth_year" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                                <option value="">년도</option>
                            </select>
                            <select id="birth_month" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                                <option value="">월</option>
                            </select>
                            <select id="birth_day" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                                <option value="">일</option>
                            </select>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <label class="flex items-center">
                            <input id="terms_agreed" type="checkbox" required class="mr-2">
                            <span class="text-sm text-gray-700">(필수) <a href="/terms" class="text-indigo-600 hover:underline" target="_blank">이용약관</a>에 동의합니다</span>
                        </label>
                        <label class="flex items-center">
                            <input id="privacy_agreed" type="checkbox" required class="mr-2">
                            <span class="text-sm text-gray-700">(필수) <a href="/privacy" class="text-indigo-600 hover:underline" target="_blank">개인정보처리방침</a>에 동의합니다</span>
                        </label>
                        <label class="flex items-center">
                            <input id="marketing_agreed" type="checkbox" class="mr-2">
                            <span class="text-sm text-gray-700">(선택) 마케팅 정보 수신에 동의합니다</span>
                        </label>
                    </div>
                </div>

                <button type="submit"
                    class="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    가입하기
                </button>
            </form>
        </div>
    </div>

    <script>
        // 생년월일 드롭다운 초기화
        (function initBirthDateDropdowns() {
            const yearSelect = document.getElementById('birth_year');
            const monthSelect = document.getElementById('birth_month');
            const daySelect = document.getElementById('birth_day');
            
            // 년도: 1920 ~ 현재년도
            const currentYear = new Date().getFullYear();
            for (let year = currentYear; year >= 1920; year--) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year + '년';
                yearSelect.appendChild(option);
            }
            
            // 월: 1 ~ 12
            for (let month = 1; month <= 12; month++) {
                const option = document.createElement('option');
                const monthStr = String(month).padStart(2, '0');
                option.value = monthStr;
                option.textContent = month + '월';
                monthSelect.appendChild(option);
            }
            
            // 일: 1 ~ 31
            function updateDays() {
                const year = parseInt(yearSelect.value) || currentYear;
                const month = parseInt(monthSelect.value) || 1;
                const daysInMonth = new Date(year, month, 0).getDate();
                
                daySelect.innerHTML = '<option value="">일</option>';
                for (let day = 1; day <= daysInMonth; day++) {
                    const option = document.createElement('option');
                    const dayStr = String(day).padStart(2, '0');
                    option.value = dayStr;
                    option.textContent = day + '일';
                    daySelect.appendChild(option);
                }
            }
            
            yearSelect.addEventListener('change', updateDays);
            monthSelect.addEventListener('change', updateDays);
            updateDays();
        })();

        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault()
            
            // 생년월일 조합
            const year = document.getElementById('birth_year').value;
            const month = document.getElementById('birth_month').value;
            const day = document.getElementById('birth_day').value;
            const birthDate = (year && month && day) ? \`\${year}-\${month}-\${day}\` : undefined;
            
            const data = {
                email: document.getElementById('email').value,
                password: document.getElementById('password').value,
                name: document.getElementById('name').value,
                phone: document.getElementById('phone').value || undefined,
                birth_date: birthDate,
                terms_agreed: document.getElementById('terms_agreed').checked,
                privacy_agreed: document.getElementById('privacy_agreed').checked,
                marketing_agreed: document.getElementById('marketing_agreed').checked
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
        async function loadCourseDetail() {
            try {
                const response = await axios.get('/api/courses/${courseId}')
                const { course, lessons, enrollment } = response.data.data
                
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
                                        <button onclick="enrollCourse(\${course.id})" class="bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-indigo-700 transition">
                                            \${enrollment ? '학습하기' : '수강 신청'}
                                        </button>
                                    </div>
                                </div>
                                
                                <!-- 커리큘럼 -->
                                <div class="mb-8">
                                    <h2 class="text-2xl font-bold text-gray-900 mb-4">
                                        <i class="fas fa-list mr-2"></i>커리큘럼
                                    </h2>
                                    <div class="space-y-2">
                                        \${lessons.map((lesson, index) => \`
                                            <div class="bg-white border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition">
                                                <div class="flex justify-between items-center">
                                                    <div class="flex items-center">
                                                        <span class="bg-indigo-100 text-indigo-600 font-bold w-8 h-8 rounded-full flex items-center justify-center mr-3">
                                                            \${index + 1}
                                                        </span>
                                                        <span class="font-semibold text-gray-900">\${lesson.title}</span>
                                                    </div>
                                                    <span class="text-gray-500 text-sm">
                                                        <i class="fas fa-clock mr-1"></i>\${lesson.duration_minutes}분
                                                    </span>
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
        
        function enrollCourse(courseId) {
            if (!AuthManager.isLoggedIn()) {
                showToast('로그인이 필요합니다.', 'error')
                setTimeout(() => {
                    window.location.href = '/login?redirect=/courses/' + courseId
                }, 1000)
                return
            }
            
            window.location.href = '/payment/checkout/' + courseId
        }
        
        document.addEventListener('DOMContentLoaded', () => {
            loadCourseDetail()
        })
    </script>
    
    ${getFooter()}
    ${getCommonFoot()}
  `)
})

export default pages
