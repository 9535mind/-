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
import courses from './routes/courses'
import enrollments from './routes/enrollments'
import payments from './routes/payments'
import certificates from './routes/certificates'
import admin from './routes/admin'

const app = new Hono<{ Bindings: Bindings }>()

// 미들웨어
app.use('*', logger())
app.use('/api/*', cors())

// 정적 파일 서빙
app.use('/static/*', serveStatic({ root: './public' }))

// API 라우트
app.route('/api/auth', auth)
app.route('/api/courses', courses)
app.route('/api/enrollments', enrollments)
app.route('/api/payments', payments)
app.route('/api/certificates', certificates)
app.route('/api/admin', admin)

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
    </head>
    <body class="bg-gray-50">
        <!-- 헤더 -->
        <header class="bg-white shadow-sm">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center py-4">
                    <div class="flex items-center">
                        <h1 class="text-2xl font-bold text-indigo-600">마인드스토리 원격평생교육원</h1>
                    </div>
                    <nav class="hidden md:flex space-x-8">
                        <a href="#courses" class="text-gray-700 hover:text-indigo-600">과정 안내</a>
                        <a href="#about" class="text-gray-700 hover:text-indigo-600">교육원 소개</a>
                        <a href="/my-courses" class="text-gray-700 hover:text-indigo-600">내 강의실</a>
                    </nav>
                    <div class="flex items-center space-x-4">
                        <button onclick="showLogin()" class="text-gray-700 hover:text-indigo-600">로그인</button>
                        <button onclick="showRegister()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">회원가입</button>
                    </div>
                </div>
            </div>
        </header>

        <!-- 히어로 섹션 -->
        <section class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-20">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 class="text-4xl md:text-5xl font-bold mb-4">
                    당신의 성장을 응원합니다
                </h2>
                <p class="text-xl mb-8 text-indigo-100">
                    마인드 타임 코칭, 부모-자녀 대화법, 감정코칭까지<br>
                    전문가와 함께하는 온라인 평생교육
                </p>
                <button onclick="scrollToCourses()" class="bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
                    과정 둘러보기 <i class="fas fa-arrow-right ml-2"></i>
                </button>
            </div>
        </section>

        <!-- 주요 특징 -->
        <section class="py-16 bg-white">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h3 class="text-3xl font-bold text-center mb-12">왜 마인드스토리인가요?</h3>
                <div class="grid md:grid-cols-3 gap-8">
                    <div class="text-center p-6">
                        <div class="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-video text-2xl text-indigo-600"></i>
                        </div>
                        <h4 class="text-xl font-semibold mb-2">언제 어디서나</h4>
                        <p class="text-gray-600">PC, 모바일로 편하게 수강하세요</p>
                    </div>
                    <div class="text-center p-6">
                        <div class="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-certificate text-2xl text-indigo-600"></i>
                        </div>
                        <h4 class="text-xl font-semibold mb-2">수료증 발급</h4>
                        <p class="text-gray-600">과정 수료 후 공식 수료증 발급</p>
                    </div>
                    <div class="text-center p-6">
                        <div class="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-user-graduate text-2xl text-indigo-600"></i>
                        </div>
                        <h4 class="text-xl font-semibold mb-2">전문가 강의</h4>
                        <p class="text-gray-600">현장 전문가의 실전 노하우</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- 과정 목록 -->
        <section id="courses" class="py-16 bg-gray-50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h3 class="text-3xl font-bold text-center mb-12">추천 과정</h3>
                <div id="courseList" class="grid md:grid-cols-3 gap-8">
                    <!-- 과정 목록이 여기에 동적으로 로드됩니다 -->
                    <div class="text-center py-8">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                        <p class="mt-4 text-gray-600">과정 정보를 불러오는 중...</p>
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
                                    <button onclick="viewCourse(\${course.id})" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
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
            
            function showLogin() {
                alert('로그인 페이지는 개발 중입니다.')
            }
            
            function showRegister() {
                alert('회원가입 페이지는 개발 중입니다.')
            }
            
            // 페이지 로드 시 과정 목록 로드
            document.addEventListener('DOMContentLoaded', loadCourses)
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
