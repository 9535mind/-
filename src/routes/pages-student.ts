/**
 * Student Pages Router
 * Handles student-facing course pages
 */

import { Hono } from 'hono'
import type { Bindings } from '../types/database'

const app = new Hono<{ Bindings: Bindings }>()

/**
 * My Courses Page - Student view
 * GET /my-courses
 */
app.get('/my-courses', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>내 강좌 - 마인드스토리 LMS</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/js/auth.js"></script>
    </head>
    <body class="bg-gray-50">
        <!-- 헤더 -->
        <header class="bg-white shadow-sm">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-2xl font-bold text-blue-600">
                        <i class="fas fa-graduation-cap mr-2"></i>
                        마인드스토리 LMS
                    </a>
                    <nav class="flex items-center space-x-6">
                        <a href="/courses" class="text-gray-600 hover:text-gray-900">전체 강좌</a>
                        <a href="/my-courses" class="text-blue-600 font-semibold">내 강좌</a>
                        <span id="headerUserName" class="text-gray-700"></span>
                        <button onclick="logout()" class="text-red-600 hover:text-red-700">
                            <i class="fas fa-sign-out-alt mr-1"></i>로그아웃
                        </button>
                    </nav>
                </div>
            </div>
        </header>

        <!-- 메인 컨텐츠 -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- 타이틀 -->
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-gray-900 mb-2">
                    <i class="fas fa-book-reader mr-2"></i>내 강좌
                </h1>
                <p class="text-gray-600">수강 중인 강좌 목록과 학습 진도를 확인하세요.</p>
            </div>

            <!-- 필터 -->
            <div class="bg-white rounded-lg shadow-sm p-4 mb-6">
                <div class="flex items-center space-x-4">
                    <button onclick="filterCourses('all')" 
                            class="filter-btn px-4 py-2 rounded-lg bg-blue-600 text-white">
                        전체
                    </button>
                    <button onclick="filterCourses('in-progress')" 
                            class="filter-btn px-4 py-2 rounded-lg bg-white text-gray-700 hover:bg-gray-50">
                        학습 중
                    </button>
                    <button onclick="filterCourses('completed')" 
                            class="filter-btn px-4 py-2 rounded-lg bg-white text-gray-700 hover:bg-gray-50">
                        완강
                    </button>
                    <div class="flex-1"></div>
                    <select id="sortBy" onchange="sortCourses(this.value)" 
                            class="px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="recent">최근 학습순</option>
                        <option value="progress">진도율순</option>
                        <option value="title">제목순</option>
                    </select>
                </div>
            </div>

            <!-- 강좌 목록 -->
            <div id="coursesList" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <!-- 로딩 중... -->
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-spinner fa-spin text-4xl text-gray-400 mb-4"></i>
                    <p class="text-gray-600">강좌 목록을 불러오는 중...</p>
                </div>
            </div>
        </main>

        <script>
        let allCourses = [];
        let currentFilter = 'all';

        async function loadMyCourses() {
            try {
                const response = await apiRequest('GET', '/api/progress/my-courses');
                
                if (response.success) {
                    allCourses = response.courses || [];
                    renderCourses();
                } else {
                    showError(response.error || '강좌 목록을 불러오지 못했습니다.');
                }
            } catch (error) {
                console.error('Load courses error:', error);
                showError('강좌 목록을 불러오는 중 오류가 발생했습니다.');
            }
        }

        function renderCourses() {
            const container = document.getElementById('coursesList');
            
            // Filter courses
            let filteredCourses = allCourses;
            if (currentFilter === 'in-progress') {
                filteredCourses = allCourses.filter(c => c.completion_rate < 100);
            } else if (currentFilter === 'completed') {
                filteredCourses = allCourses.filter(c => c.completion_rate >= 100);
            }

            if (filteredCourses.length === 0) {
                container.innerHTML = \`
                    <div class="col-span-full text-center py-12">
                        <i class="fas fa-book-open text-6xl text-gray-300 mb-4"></i>
                        <p class="text-gray-600 text-lg mb-4">수강 중인 강좌가 없습니다.</p>
                        <a href="/courses" class="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            강좌 둘러보기
                        </a>
                    </div>
                \`;
                return;
            }

            container.innerHTML = filteredCourses.map(course => {
                const progress = course.completion_rate || 0;
                const isCompleted = progress >= 100;
                const thumbnailUrl = course.thumbnail_url || '/static/images/default-course.jpg';
                const lastWatched = course.last_watched_at 
                    ? new Date(course.last_watched_at).toLocaleDateString('ko-KR')
                    : '학습 전';

                return \`
                    <div class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                        <!-- 썸네일 -->
                        <div class="relative">
                            <img src="\${thumbnailUrl}" 
                                 alt="\${course.title}" 
                                 class="w-full h-48 object-cover"
                                 onerror="this.src='/static/images/default-course.jpg'">
                            \${isCompleted ? \`
                                <div class="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                                    <i class="fas fa-check-circle mr-1"></i>완강
                                </div>
                            \` : ''}
                        </div>

                        <!-- 내용 -->
                        <div class="p-6">
                            <h3 class="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                                \${course.title}
                            </h3>
                            
                            <p class="text-sm text-gray-600 mb-4 line-clamp-2">
                                \${course.description || '강좌 설명이 없습니다.'}
                            </p>

                            <!-- 진도율 -->
                            <div class="mb-4">
                                <div class="flex justify-between text-sm text-gray-600 mb-1">
                                    <span>진도율</span>
                                    <span class="font-semibold">\${progress}%</span>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-2">
                                    <div class="bg-blue-600 h-2 rounded-full transition-all" 
                                         style="width: \${progress}%"></div>
                                </div>
                            </div>

                            <!-- 통계 -->
                            <div class="flex items-center justify-between text-sm text-gray-600 mb-4">
                                <div>
                                    <i class="fas fa-list mr-1"></i>
                                    \${course.completed_lessons || 0}/\${course.total_lessons || 0} 차시
                                </div>
                                <div>
                                    <i class="fas fa-clock mr-1"></i>
                                    \${course.total_duration_minutes || 0}분
                                </div>
                            </div>

                            <!-- 마지막 학습일 -->
                            <div class="text-xs text-gray-500 mb-4">
                                <i class="fas fa-calendar mr-1"></i>
                                최근 학습: \${lastWatched}
                            </div>

                            <!-- 버튼 -->
                            <div class="flex space-x-2">
                                \${isCompleted && course.certificate_issued ? \`
                                    <a href="/certificates/\${course.course_id}" 
                                       class="flex-1 text-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                                        <i class="fas fa-certificate mr-1"></i>수료증
                                    </a>
                                \` : \`
                                    <a href="/courses/\${course.course_id}/learn" 
                                       class="flex-1 text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                        <i class="fas fa-play mr-1"></i>
                                        \${progress > 0 ? '이어서 학습' : '학습 시작'}
                                    </a>
                                \`}
                                <a href="/courses/\${course.course_id}" 
                                   class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                                    <i class="fas fa-info-circle"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                \`;
            }).join('');
        }

        function filterCourses(filter) {
            currentFilter = filter;
            
            // Update button styles
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('bg-blue-600', 'text-white');
                btn.classList.add('bg-white', 'text-gray-700');
            });
            event.target.classList.remove('bg-white', 'text-gray-700');
            event.target.classList.add('bg-blue-600', 'text-white');
            
            renderCourses();
        }

        function sortCourses(sortBy) {
            if (sortBy === 'recent') {
                allCourses.sort((a, b) => 
                    new Date(b.last_watched_at || 0) - new Date(a.last_watched_at || 0)
                );
            } else if (sortBy === 'progress') {
                allCourses.sort((a, b) => (b.completion_rate || 0) - (a.completion_rate || 0));
            } else if (sortBy === 'title') {
                allCourses.sort((a, b) => a.title.localeCompare(b.title));
            }
            renderCourses();
        }

        function showError(message) {
            const container = document.getElementById('coursesList');
            container.innerHTML = \`
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-exclamation-triangle text-6xl text-red-400 mb-4"></i>
                    <p class="text-gray-600 text-lg mb-4">\${message}</p>
                    <button onclick="loadMyCourses()" 
                            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        다시 시도
                    </button>
                </div>
            \`;
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', async () => {
            const user = await checkAuth();
            if (!user) {
                window.location.href = '/login';
                return;
            }

            document.getElementById('headerUserName').textContent = user.name + ' 님';
            loadMyCourses();
        });
        </script>
    </body>
    </html>
  `)
})

export default app
