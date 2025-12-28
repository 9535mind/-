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
/**
 * 회원가입 페이지 - 3가지 방법 (이메일, 카카오, 전화번호)
*/
pages.get('/register', (c) => {
  return c.html(`
    ${getCommonHead('회원가입')}
    ${getHeader()}
    
    <div class="min-h-screen flex items-center justify-center py-12 px-4 bg-gray-50">
        <div class="max-w-2xl w-full">
            <h2 class="text-center text-3xl font-bold text-gray-900 mb-2">회원가입</h2>
            <p class="text-center text-sm text-gray-600 mb-8">
                이미 계정이 있으신가요? <a href="/login" class="text-indigo-600">로그인하기</a>
            </p>
            
            <div id="methodSelect" class="grid md:grid-cols-3 gap-4 mb-8">
                <button onclick="showForm('email')" class="p-6 border-2 rounded-lg hover:border-indigo-500 hover:bg-indigo-50">
                    <i class="fas fa-envelope text-4xl text-indigo-600 mb-3"></i>
                    <div class="font-semibold">이메일</div>
                </button>
                <button onclick="showForm('kakao')" class="p-6 border-2 rounded-lg hover:border-yellow-400 hover:bg-yellow-50">
                    <img src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_small.png" class="w-12 h-12 mx-auto mb-3">
                    <div class="font-semibold">카카오</div>
                </button>
                <button onclick="showForm('phone')" class="p-6 border-2 rounded-lg hover:border-green-500 hover:bg-green-50">
                    <i class="fas fa-mobile-alt text-4xl text-green-600 mb-3"></i>
                    <div class="font-semibold">전화번호</div>
                </button>
            </div>
            
            <div id="emailForm" style="display:none" class="bg-white p-6 rounded-lg shadow">
                <button onclick="backToSelect()" class="text-sm text-gray-600 mb-4">← 다른 방법 선택</button>
                <form id="emailReg" class="space-y-4">
                    <input id="em" type="email" placeholder="이메일" required class="w-full px-3 py-2 border rounded-lg">
                    <input id="pw" type="password" placeholder="비밀번호 (6자 이상)" required minlength="6" class="w-full px-3 py-2 border rounded-lg">
                    <input id="pw2" type="password" placeholder="비밀번호 확인" required minlength="6" class="w-full px-3 py-2 border rounded-lg">
                    <input id="nm" type="text" placeholder="이름" required class="w-full px-3 py-2 border rounded-lg">
                    <label class="flex items-center text-sm">
                        <input id="t1" type="checkbox" required class="mr-2"> 이용약관 동의 (필수)
                    </label>
                    <label class="flex items-center text-sm">
                        <input id="p1" type="checkbox" required class="mr-2"> 개인정보처리방침 동의 (필수)
                    </label>
                    <button type="submit" class="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">가입하기</button>
                </form>
            </div>
            
            <div id="kakaoForm" style="display:none" class="bg-white p-6 rounded-lg shadow text-center">
                <button onclick="backToSelect()" class="text-sm text-gray-600 mb-4">← 다른 방법 선택</button>
                <p class="mb-4">카카오 계정으로 간편하게 가입하실 수 있습니다.</p>
                <button onclick="location.href='/api/auth/kakao/login'" class="px-8 py-3 rounded-lg" style="background:#FEE500">
                    카카오로 시작하기
                </button>
            </div>
            
            <div id="phoneForm" style="display:none" class="bg-white p-6 rounded-lg shadow">
                <button onclick="backToSelect()" class="text-sm text-gray-600 mb-4">← 다른 방법 선택</button>
                <form id="phoneReg" class="space-y-4">
                    <div class="flex gap-2">
                        <input id="ph" type="tel" placeholder="01012345678" required class="flex-1 px-3 py-2 border rounded-lg">
                        <button type="button" onclick="verify()" class="px-4 py-2 bg-green-600 text-white rounded-lg">인증요청</button>
                    </div>
                    <div id="codeSection" style="display:none" class="flex gap-2">
                        <input id="code" type="text" placeholder="인증번호" required class="flex-1 px-3 py-2 border rounded-lg">
                        <button type="button" onclick="checkCode()" class="px-4 py-2 bg-green-600 text-white rounded-lg">확인</button>
                    </div>
                    <div id="phoneData" style="display:none">
                        <div class="bg-green-50 p-3 rounded mb-4">✓ 인증 완료</div>
                        <input id="pnm" type="text" placeholder="이름" required class="w-full px-3 py-2 border rounded-lg mb-4">
                        <input id="ppw" type="password" placeholder="비밀번호" required minlength="6" class="w-full px-3 py-2 border rounded-lg mb-4">
                        <input id="ppw2" type="password" placeholder="비밀번호 확인" required minlength="6" class="w-full px-3 py-2 border rounded-lg mb-4">
                        <label class="flex items-center text-sm mb-2">
                            <input id="pt1" type="checkbox" required class="mr-2"> 이용약관 동의
                        </label>
                        <label class="flex items-center text-sm mb-4">
                            <input id="pp1" type="checkbox" required class="mr-2"> 개인정보처리방침 동의
                        </label>
                        <button type="submit" class="w-full py-3 bg-green-600 text-white rounded-lg">가입하기</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script>
        if(AuthManager.isLoggedIn()) location.href='/my-courses'
        function showForm(t){document.getElementById('methodSelect').style.display='none';document.getElementById(t+'Form').style.display='block'}
        function backToSelect(){document.getElementById('methodSelect').style.display='grid';['email','kakao','phone'].forEach(t=>document.getElementById(t+'Form').style.display='none')}
        
        document.getElementById('emailReg').onsubmit=async e=>{
            e.preventDefault()
            const em=document.getElementById('em').value,pw=document.getElementById('pw').value,pw2=document.getElementById('pw2').value,nm=document.getElementById('nm').value
            if(pw!==pw2)return showToast('비밀번호 불일치','error')
            try{
                const r=await axios.post('/api/auth/register',{email:em,password:pw,name:nm,terms_agreed:document.getElementById('t1').checked,privacy_agreed:document.getElementById('p1').checked,marketing_agreed:false})
                if(r.data.success){showToast('가입 완료','success');setTimeout(()=>location.href='/login',1500)}
            }catch(e){showToast(e.response?.data?.error||'가입 실패','error')}
        }
        
        function verify(){document.getElementById('codeSection').style.display='flex';showToast('인증번호: 123456','success')}
        function checkCode(){if(document.getElementById('code').value==='123456'){document.getElementById('codeSection').style.display='none';document.getElementById('phoneData').style.display='block';showToast('인증 완료','success')}else{showToast('인증번호 불일치','error')}}
        
        document.getElementById('phoneReg').onsubmit=async e=>{
            e.preventDefault()
            const ph=document.getElementById('ph').value,nm=document.getElementById('pnm').value,pw=document.getElementById('ppw').value,pw2=document.getElementById('ppw2').value
            if(pw!==pw2)return showToast('비밀번호 불일치','error')
            try{
                const em=ph+'@phone.mindstory.co.kr'
                const r=await axios.post('/api/auth/register',{email:em,password:pw,name:nm,phone:ph,terms_agreed:document.getElementById('pt1').checked,privacy_agreed:document.getElementById('pp1').checked,marketing_agreed:false})
                if(r.data.success){showToast('가입 완료','success');setTimeout(()=>location.href='/login',1500)}
            }catch(e){showToast(e.response?.data?.error||'가입 실패','error')}
        }
    </script>
    
    ${getFooter()}
    ${getCommonFoot()}
  `)
})

/**
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
