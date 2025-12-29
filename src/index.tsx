/**
 * 마인드스토리 원격평생교육원 LMS 플랫폼
 * Ver.1.3 - MVP
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveStatic } from 'hono/cloudflare-workers'
import { Bindings } from './types/database'

// 라우트 임포트
import auth from './routes/auth'
import authKakao from './routes/auth-kakao'
import authGoogle from './routes/auth-google'
import courses from './routes/courses'
import enrollments from './routes/enrollments'
import payments from './routes/payments'
import paymentsV2 from './routes/payments-v2'
import pagesPayment from './routes/pages-payment'
import certificates from './routes/certificates'
import admin from './routes/admin'
import pages from './routes/pages'
import pagesMy from './routes/pages-my'
import pagesAbout from './routes/pages-about'
import pagesAdmin from './routes/pages-admin'
import popups from './routes/popups'
import videos from './routes/videos'
import progress from './routes/progress'
import certifications from './routes/certifications'
import adminCertifications from './routes/admin-certifications'

const app = new Hono<{ Bindings: Bindings }>()

// 미들웨어
app.use('*', logger())
app.use('/api/*', cors())

// 정적 파일 서빙 (Cloudflare Pages용 - root 제거)
app.use('/static/*', serveStatic())

// API 라우트
app.route('/api/auth', auth)
app.route('/api/auth/kakao', authKakao)  // 카카오 소셜 로그인
app.route('/api/auth/google', authGoogle)  // 구글 소셜 로그인
app.route('/api/courses', courses)
app.route('/api/enrollments', enrollments)
app.route('/api/payments', payments)
app.route('/api/payments-v2', paymentsV2)  // 토스페이먼츠 연동
app.route('/api/certificates', certificates)
app.route('/api/admin', admin)
app.route('/api/popups', popups)
app.route('/api/videos', videos)  // 영상 관리
app.route('/api/progress', progress)  // 진도율 추적
app.route('/api/certifications', certifications)  // 민간자격
app.route('/api/admin/certifications', adminCertifications)  // 관리자 민간자격

// 페이지 라우트
app.route('/', pages)
app.route('/', pagesMy)
app.route('/', pagesAbout)
app.route('/', pagesPayment)  // 결제 페이지
app.route('/admin', pagesAdmin)  // 관리자 페이지

// 홈페이지
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>마인드스토리 원격평생교육원</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/js/auth.js?v=20251229"></script>
        <script src="/static/js/utils.js?v=20251229"></script>
        <script src="/static/js/popup.js?v=20251229"></script>
        <style>
            /* 새로운 색상 팔레트 */
            :root {
                --color-primary: #007bff;      /* 밝은 파란색 */
                --color-success: #28a745;      /* 생생한 초록색 */
                --color-warning: #ffc107;      /* 따뜻한 오렌지 */
                --color-primary-hover: #0056b3;
                --color-success-hover: #218838;
                --color-warning-hover: #e0a800;
            }
            
            .hero-gradient {
                background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
            }
            
            .section-image {
                background-size: cover;
                background-position: center;
                position: relative;
            }
            
            .section-image::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.4);
            }
            
            /* 버튼 스타일 */
            .btn-primary {
                background-color: var(--color-primary);
                color: white;
            }
            .btn-primary:hover {
                background-color: var(--color-primary-hover);
            }
            .btn-success {
                background-color: var(--color-success);
                color: white;
            }
            .btn-success:hover {
                background-color: var(--color-success-hover);
            }
            .btn-warning {
                background-color: var(--color-warning);
                color: #333;
            }
            .btn-warning:hover {
                background-color: var(--color-warning-hover);
            }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- 헤더 -->
        <header class="bg-white shadow-sm">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center py-4">
                    <div class="flex items-center">
                        <a href="/" class="text-2xl font-bold" style="color: var(--color-primary);">마인드스토리 원격평생교육원</a>
                    </div>
                    <nav class="hidden md:flex space-x-8">
                        <a href="#courses" class="text-gray-700 transition-colors duration-200" style="hover:color: var(--color-primary);" onmouseover="this.style.color='var(--color-primary)'" onmouseout="this.style.color=''">과정 안내</a>
                        <a href="/my-courses" class="text-gray-700 transition-colors duration-200" onmouseover="this.style.color='var(--color-primary)'" onmouseout="this.style.color=''">내 강의실</a>
                        <a href="/admin" id="adminLink" class="text-gray-700 transition-colors duration-200" style="display:none" onmouseover="this.style.color='var(--color-primary)'" onmouseout="this.style.color=''">관리자</a>
                    </nav>
                    <div id="headerAuthButtons" class="flex items-center space-x-4">
                        <a href="/login" class="text-gray-700 transition-colors duration-200" onmouseover="this.style.color='var(--color-primary)'" onmouseout="this.style.color=''">로그인</a>
                        <a href="/register" class="btn-primary px-4 py-2 rounded-lg transition-colors duration-200">회원가입</a>
                    </div>
                    <div id="headerUserMenu" class="flex items-center space-x-4" style="display:none">
                        <span class="text-gray-700" id="headerUserName"></span>
                        <button onclick="handleLogout()" class="text-gray-700 transition-colors duration-200" onmouseover="this.style.color='var(--color-primary)'" onmouseout="this.style.color=''">로그아웃</button>
                    </div>
                </div>
            </div>
        </header>

        <!-- 히어로 섹션 -->
        <section class="section-image hero-gradient text-white py-32" style="background-image: url('https://www.genspark.ai/api/files/s/Nx5k1tgA');">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                <h2 class="text-5xl md:text-6xl font-bold mb-6 drop-shadow-lg">
                    마음을 이해하고 성장하는 여정
                </h2>
                <p class="text-2xl mb-2 drop-shadow-lg font-semibold">
                    마인드스토리 원격평생교육원
                </p>
                <p class="text-xl mb-8 drop-shadow-lg">
                    마인드 타임 코칭, 부모-자녀 대화법, 감정코칭까지<br>
                    전문가와 함께하는 온라인 평생교육
                </p>
                <div class="flex justify-center gap-4">
                    <button onclick="scrollToCourses()" class="btn-warning px-10 py-4 rounded-lg font-bold text-lg hover:bg-yellow-300 transition shadow-xl transform hover:scale-105">
                        <i class="fas fa-graduation-cap mr-2"></i>
                        과정 둘러보기
                    </button>
                </div>
            </div>
        </section>



        <!-- 주요 특징 -->
        <section class="py-20 bg-gray-50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h3 class="text-4xl font-bold text-center mb-16">왜 마인드스토리인가요?</h3>
                <div class="grid md:grid-cols-4 gap-8">
                    <div class="text-center p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition">
                        <div class="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 btn-primary">
                            <i class="fas fa-video text-3xl text-white"></i>
                        </div>
                        <h4 class="text-xl font-bold mb-3">언제 어디서나</h4>
                        <p class="text-gray-600">PC, 모바일, 태블릿<br>어디서든 학습 가능</p>
                    </div>
                    <div class="text-center p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition">
                        <div class="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 btn-success">
                            <i class="fas fa-award text-3xl text-white"></i>
                        </div>
                        <h4 class="text-xl font-bold mb-3">민간자격증</h4>
                        <p class="text-gray-600">수료 후 자격증<br>취득 가능 (별도 신청)</p>
                    </div>
                    <div class="text-center p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition">
                        <div class="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 btn-warning">
                            <i class="fas fa-chalkboard-teacher text-3xl text-white"></i>
                        </div>
                        <h4 class="text-xl font-bold mb-3">박종석 대표 직강</h4>
                        <p class="text-gray-600">20년 현장 경험<br>실전 노하우 전수</p>
                    </div>
                    <div class="text-center p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition">
                        <div class="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 btn-primary">
                            <i class="fas fa-redo text-3xl text-white"></i>
                        </div>
                        <h4 class="text-xl font-bold mb-3">반복 학습</h4>
                        <p class="text-gray-600">수강 기간 내<br>무제한 복습 가능</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- 과정 목록 -->
        <section id="courses" class="py-20 bg-white">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="text-center mb-16">
                    <h3 class="text-4xl font-bold mb-4">추천 과정</h3>
                    <p class="text-xl text-gray-600">전문가와 함께 시작하는 성장의 여정</p>
                </div>
                <div id="courseList" class="grid md:grid-cols-3 gap-8">
                    <div class="text-center py-8 col-span-3">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                        <p class="mt-4 text-gray-600">과정 정보를 불러오는 중...</p>
                    </div>
                </div>
            </div>
        </section>
        
        <!-- 수강후기 섹션 -->
        <section class="py-20 bg-gradient-to-r from-indigo-100 to-purple-100">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h3 class="text-4xl font-bold text-center mb-16">수강생 후기</h3>
                <div class="grid md:grid-cols-3 gap-8">
                    <div class="bg-white p-6 rounded-lg shadow-lg">
                        <div class="flex items-center mb-4">
                            <img src="https://ui-avatars.com/api/?name=김&background=667eea&color=fff&size=48" class="w-12 h-12 rounded-full mr-3">
                            <div>
                                <h5 class="font-bold">김지영</h5>
                                <p class="text-sm text-gray-500">마인드 타임 코칭 입문</p>
                            </div>
                        </div>
                        <div class="text-yellow-400 mb-2">
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                        </div>
                        <p class="text-gray-700">시간 관리에 대한 새로운 관점을 얻었어요. 실생활에 바로 적용할 수 있는 내용들이 많아서 좋았습니다!</p>
                    </div>
                    <div class="bg-white p-6 rounded-lg shadow-lg">
                        <div class="flex items-center mb-4">
                            <img src="https://ui-avatars.com/api/?name=이&background=764ba2&color=fff&size=48" class="w-12 h-12 rounded-full mr-3">
                            <div>
                                <h5 class="font-bold">이수진</h5>
                                <p class="text-sm text-gray-500">부모-자녀 대화법</p>
                            </div>
                        </div>
                        <div class="text-yellow-400 mb-2">
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                        </div>
                        <p class="text-gray-700">아이와의 관계가 확실히 좋아졌어요. 강의를 듣고 실천하니 대화가 더 편해졌습니다.</p>
                    </div>
                    <div class="bg-white p-6 rounded-lg shadow-lg">
                        <div class="flex items-center mb-4">
                            <img src="https://ui-avatars.com/api/?name=박&background=f093fb&color=fff&size=48" class="w-12 h-12 rounded-full mr-3">
                            <div>
                                <h5 class="font-bold">박민수</h5>
                                <p class="text-sm text-gray-500">감정코칭 전문가 과정</p>
                            </div>
                        </div>
                        <div class="text-yellow-400 mb-2">
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                        </div>
                        <p class="text-gray-700">전문가로 활동하기 위한 실전 노하우까지 배울 수 있어서 정말 유익했습니다!</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- 푸터 -->
        <footer class="bg-gray-800 text-white py-8">
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
                            <li><a href="#" class="text-gray-400 hover:text-white">이용약관</a></li>
                            <li><a href="#" class="text-gray-400 hover:text-white">개인정보처리방침</a></li>
                            <li><a href="#" class="text-gray-400 hover:text-white">환불규정</a></li>
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

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
            // 과정 목록 로드
            async function loadCourses() {
                try {
                    const response = await axios.get('/api/courses/featured')
                    const courses = response.data.data
                    
                    const courseList = document.getElementById('courseList')
                    if (courses.length === 0) {
                        courseList.innerHTML = '<p class="col-span-3 text-center text-gray-600">등록된 과정이 없습니다.</p>'
                        return
                    }
                    
                    courseList.innerHTML = courses.map(course => \`
                        <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                            <div class="h-48 bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
                                <i class="fas fa-book-open text-6xl text-white opacity-50"></i>
                            </div>
                            <div class="p-6">
                                <h4 class="text-xl font-semibold mb-2">\${course.title}</h4>
                                <p class="text-gray-600 text-sm mb-4 line-clamp-2">\${course.description || ''}</p>
                                <div class="flex justify-between items-center mb-4">
                                    <div>
                                        <span class="text-gray-500 text-sm">수강기간</span>
                                        <p class="font-semibold">\${course.duration_days}일</p>
                                    </div>
                                    <div>
                                        <span class="text-gray-500 text-sm">총 차시</span>
                                        <p class="font-semibold">\${course.total_lessons}개</p>
                                    </div>
                                </div>
                                <div class="flex justify-between items-center">
                                    <div>
                                        \${course.is_free ? 
                                            '<span class="text-2xl font-bold text-green-600">무료</span>' :
                                            \`<div>
                                                \${course.discount_price ? 
                                                    \`<span class="text-gray-400 line-through text-sm">\${course.price.toLocaleString()}원</span>
                                                    <span class="text-2xl font-bold text-indigo-600">\${course.discount_price.toLocaleString()}원</span>\` :
                                                    \`<span class="text-2xl font-bold text-indigo-600">\${course.price.toLocaleString()}원</span>\`
                                                }
                                            </div>\`
                                        }
                                    </div>
                                    <button onclick="viewCourse(\${course.id})" class="btn-primary px-4 py-2 rounded-lg transition">
                                        자세히 보기
                                    </button>
                                </div>
                            </div>
                        </div>
                    \`).join('')
                } catch (error) {
                    console.error('Failed to load courses:', error)
                    document.getElementById('courseList').innerHTML = '<p class="col-span-3 text-center text-red-600">과정 정보를 불러오는데 실패했습니다.</p>'
                }
            }
            
            function scrollToCourses() {
                document.getElementById('courses').scrollIntoView({ behavior: 'smooth' })
            }
            
            function viewCourse(id) {
                window.location.href = \`/courses/\${id}\`
            }
            
            // 페이지 로드 시 실행
            document.addEventListener('DOMContentLoaded', () => {
                console.log('[메인 페이지] DOMContentLoaded 이벤트 발생')
                console.log('[메인 페이지] localStorage 확인:', {
                    session_token: localStorage.getItem('session_token') ? '존재' : '없음',
                    user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null
                })
                
                loadCourses()
                updateHeader()
                
                // 팝업 로드
                PopupManager.loadPopups('home')
            })
        </script>
    </body>
    </html>
  `)
})

// 헬스체크
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

export default app
