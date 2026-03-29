/**
 * Student Pages Router
 * Handles student-facing course pages
 */

import { Hono } from 'hono'
import type { Bindings } from '../types/database'
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
        <link rel="stylesheet" href="/static/css/app.css" />
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/js/auth.js?v=20260329-admin-name"></script>
        ${siteFloatingQuickMenuStyles()}
        ${siteAiChatWidgetStyles()}
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
                        <a href="/community" class="text-gray-600 hover:text-gray-900">공지 · FAQ</a>
                        <span class="inline-flex items-center max-w-[min(11rem,40vw)]"><span id="headerUserName" class="text-gray-700 font-semibold truncate" data-ms-name-default="text-gray-700 font-semibold truncate"></span></span>
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
        ${siteFloatingQuickMenuMarkup()}
        ${siteAiChatWidgetMarkup()}

        <script>
        ${siteFloatingQuickMenuScript()}
        ${siteAiChatWidgetScript()}
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
                                    <a href="\${course.certificate_number ? '/certificates/' + course.certificate_number : '/certificates?enrollment=' + course.enrollment_id}" 
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
            const user = await getCurrentUser();
            if (!user) {
                window.location.href = '/login';
                return;
            }

            loadMyCourses();
        });
        </script>
    </body>
    </html>
  `)
})

/**
 * Lesson Detail Page
 * GET /courses/:courseId/lessons/:lessonId
 */
app.get('/courses/:courseId/lessons/:lessonId', (c) => {
  const courseId = c.req.param('courseId')
  const lessonId = c.req.param('lessonId')
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>차시 상세 - 마인드스토리 LMS</title>
        <link rel="stylesheet" href="/static/css/app.css" />
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/js/auth.js?v=20260329-admin-name"></script>
        ${siteFloatingQuickMenuStyles()}
        ${siteAiChatWidgetStyles()}
    </head>
    <body class="bg-gray-50">
        <!-- 헤더 -->
        <header class="bg-white shadow-sm">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div class="flex justify-between items-center">
                    <a href="/courses/${courseId}" class="text-xl font-bold text-blue-600">
                        <i class="fas fa-arrow-left mr-2"></i>
                        강좌로 돌아가기
                    </a>
                    <span class="inline-flex items-center max-w-[min(11rem,40vw)]"><span id="headerUserName" class="text-gray-700 font-semibold truncate" data-ms-name-default="text-gray-700 font-semibold truncate"></span></span>
                </div>
            </div>
        </header>

        <!-- 메인 컨텐츠 -->
        <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- 로딩 상태 -->
            <div id="loadingState" class="text-center py-12">
                <i class="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
                <p class="text-gray-600">차시 정보를 불러오는 중...</p>
            </div>

            <!-- 차시 상세 컨텐츠 -->
            <div id="lessonContent" class="hidden">
                <!-- 차시 헤더 -->
                <div class="bg-white rounded-lg shadow-sm p-8 mb-6">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex-1">
                            <span id="lessonNumber" class="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold mb-3">
                                차시 1
                            </span>
                            <h1 id="lessonTitle" class="text-3xl font-bold text-gray-900 mb-2">
                                차시 제목
                            </h1>
                            <div class="flex items-center text-gray-600 space-x-4 mt-3">
                                <span>
                                    <i class="fas fa-clock mr-2"></i>
                                    <span id="lessonDuration">0</span>분
                                </span>
                                <span id="freePreviewBadge" class="hidden">
                                    <i class="fas fa-unlock-alt mr-2 text-green-600"></i>
                                    <span class="text-green-600 font-semibold">무료 미리보기</span>
                                </span>
                            </div>
                        </div>
                        <button id="startLearningBtn" 
                                onclick="startLearning()"
                                class="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg shadow-lg hover:shadow-xl transition-all">
                            <i class="fas fa-play mr-2"></i>
                            수강하기
                        </button>
                    </div>
                </div>

                <!-- 차시 설명 -->
                <div class="bg-white rounded-lg shadow-sm p-8 mb-6">
                    <h2 class="text-xl font-bold text-gray-900 mb-4">
                        <i class="fas fa-info-circle mr-2 text-blue-600"></i>
                        차시 소개
                    </h2>
                    <p id="lessonDescription" class="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        차시 설명이 없습니다.
                    </p>
                </div>

                <!-- 학습 목표 -->
                <div class="bg-white rounded-lg shadow-sm p-8 mb-6">
                    <h2 class="text-xl font-bold text-gray-900 mb-4">
                        <i class="fas fa-bullseye mr-2 text-green-600"></i>
                        학습 목표
                    </h2>
                    <ul class="space-y-3">
                        <li class="flex items-start">
                            <i class="fas fa-check-circle text-green-600 mr-3 mt-1"></i>
                            <span class="text-gray-700">차시의 핵심 개념을 이해하고 설명할 수 있습니다.</span>
                        </li>
                        <li class="flex items-start">
                            <i class="fas fa-check-circle text-green-600 mr-3 mt-1"></i>
                            <span class="text-gray-700">학습한 내용을 실무에 적용할 수 있습니다.</span>
                        </li>
                        <li class="flex items-start">
                            <i class="fas fa-check-circle text-green-600 mr-3 mt-1"></i>
                            <span class="text-gray-700">다음 차시를 위한 기초 지식을 습득합니다.</span>
                        </li>
                    </ul>
                </div>

                <!-- 교육자료 -->
                <div class="bg-white rounded-lg shadow-sm p-8">
                    <h2 class="text-xl font-bold text-gray-900 mb-4">
                        <i class="fas fa-file-download mr-2 text-purple-600"></i>
                        교육자료
                    </h2>
                    <div id="materialsSection" class="space-y-3">
                        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div class="flex items-center">
                                <i class="fas fa-file-pdf text-red-600 text-2xl mr-4"></i>
                                <div>
                                    <p class="font-semibold text-gray-900">강의자료.pdf</p>
                                    <p class="text-sm text-gray-600">PDF 문서</p>
                                </div>
                            </div>
                            <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                <i class="fas fa-download mr-2"></i>
                                다운로드
                            </button>
                        </div>
                        
                        <p class="text-center text-gray-500 py-8">
                            <i class="fas fa-inbox text-4xl mb-2"></i><br>
                            등록된 교육자료가 없습니다.
                        </p>
                    </div>
                </div>

                <!-- 다음 차시 안내 -->
                <div id="nextLessonSection" class="hidden mt-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm opacity-90 mb-1">다음 차시</p>
                            <h3 id="nextLessonTitle" class="text-xl font-bold">다음 차시 제목</h3>
                        </div>
                        <button id="nextLessonBtn" 
                                onclick="goToNextLesson()"
                                class="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-semibold">
                            <i class="fas fa-arrow-right mr-2"></i>
                            다음 차시로
                        </button>
                    </div>
                </div>
            </div>

            <!-- 에러 상태 -->
            <div id="errorState" class="hidden text-center py-12">
                <i class="fas fa-exclamation-triangle text-4xl text-red-600 mb-4"></i>
                <p id="errorMessage" class="text-gray-600 mb-4">차시를 불러올 수 없습니다.</p>
                <button onclick="location.reload()" 
                        class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    다시 시도
                </button>
            </div>
        </main>
        ${siteFloatingQuickMenuMarkup()}
        ${siteAiChatWidgetMarkup()}

        <script>
        ${siteFloatingQuickMenuScript()}
        ${siteAiChatWidgetScript()}
        const courseId = ${courseId};
        const lessonId = ${lessonId};
        let lessonData = null;
        let courseData = null;
        let allLessons = [];

        async function loadLessonDetail() {
            try {
                console.log('🔍 Loading lesson detail:', { courseId, lessonId });
                
                // Load lesson detail
                const response = await apiRequest('GET', \`/api/courses/\${courseId}/lessons/\${lessonId}\`);
                console.log('📦 API Response:', response);
                
                if (!response.success) {
                    console.error('❌ API Error:', response.error);
                    showError(response.error || '차시를 불러올 수 없습니다.');
                    return;
                }

                // API 응답 구조 확인
                if (response.data && response.data.lesson) {
                    lessonData = response.data.lesson;
                } else if (response.lesson) {
                    // 백워드 호환성
                    lessonData = response.lesson;
                } else {
                    console.error('❌ Unexpected response structure:', response);
                    showError('차시 데이터 형식이 올바르지 않습니다.');
                    return;
                }
                
                console.log('✅ Lesson data loaded:', lessonData);
                
                // Load course info
                const courseResponse = await apiRequest('GET', \`/api/courses/\${courseId}\`);
                if (courseResponse.success) {
                    courseData = courseResponse.course;
                }

                // Load all lessons for navigation
                const lessonsResponse = await apiRequest('GET', \`/api/courses/\${courseId}/lessons\`);
                if (lessonsResponse.success) {
                    allLessons = lessonsResponse.lessons || [];
                }

                renderLessonDetail();
                
            } catch (error) {
                console.error('Load lesson error:', error);
                showError('차시를 불러오는 중 오류가 발생했습니다.');
            }
        }

        function renderLessonDetail() {
            // Hide loading, show content
            document.getElementById('loadingState').classList.add('hidden');
            document.getElementById('lessonContent').classList.remove('hidden');

            // Lesson header
            document.getElementById('lessonNumber').textContent = \`차시 \${lessonData.lesson_number}\`;
            document.getElementById('lessonTitle').textContent = lessonData.title;
            document.getElementById('lessonDuration').textContent = lessonData.video_duration_minutes || lessonData.duration_minutes || 0;
            
            // Free preview badge
            if (lessonData.is_free_preview || lessonData.is_free) {
                document.getElementById('freePreviewBadge').classList.remove('hidden');
            }

            // Description
            document.getElementById('lessonDescription').textContent = 
                lessonData.description || '이 차시에 대한 자세한 설명이 아직 등록되지 않았습니다.';

            // Next lesson
            const currentIndex = allLessons.findIndex(l => l.id === lessonData.id);
            if (currentIndex >= 0 && currentIndex < allLessons.length - 1) {
                const nextLesson = allLessons[currentIndex + 1];
                document.getElementById('nextLessonSection').classList.remove('hidden');
                document.getElementById('nextLessonTitle').textContent = nextLesson.title;
                window.nextLessonId = nextLesson.id;
            }

            // 교육자료 로드
            loadMaterials().catch(err => console.error('loadMaterials error:', err));
        }

        async function loadMaterials() {
            const container = document.getElementById('materialsSection');
            if (!container) return;
            try {
                const res = await axios.get(\`/api/courses/\${courseId}/materials\`, { withCredentials: true });
                const materials = res.data?.data?.materials || [];
                if (!materials.length) {
                    container.innerHTML = \`
                        <p class="text-center text-gray-500 py-8">
                            <i class="fas fa-inbox text-4xl mb-2"></i><br>
                            등록된 교육자료가 없습니다.
                        </p>\`;
                    return;
                }
                container.innerHTML = materials.map(m => {
                    const title = m.filename || (m.title ? (m.title + '.pdf') : '자료.pdf');
                    const subtitle = m.lesson_number ? \`차시 \${m.lesson_number}\` : '교육자료';
                    const disabled = m.allow_download === false;
                    return \`
                        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div class="flex items-center">
                                <i class="fas fa-file-pdf text-red-600 text-2xl mr-4"></i>
                                <div>
                                    <p class="font-semibold text-gray-900">\${title}</p>
                                    <p class="text-sm text-gray-600">\${subtitle}</p>
                                </div>
                            </div>
                            <a href="\${m.url}" \${disabled ? 'aria-disabled=\"true\"' : ''} \${disabled ? 'onclick=\"return false;\"' : ''} class="px-4 py-2 \${disabled ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'} rounded-lg">
                                <i class="fas fa-download mr-2"></i>
                                다운로드
                            </a>
                        </div>\`;
                }).join('');
            } catch (e) {
                container.innerHTML = \`
                    <p class="text-center text-red-500 py-8">
                        교육자료를 불러오지 못했습니다.
                    </p>\`;
            }
        }

        function startLearning() {
            window.location.href = \`/courses/\${courseId}/learn?lessonId=\${lessonId}\`;
        }

        function goToNextLesson() {
            if (window.nextLessonId) {
                window.location.href = \`/courses/\${courseId}/lessons/\${window.nextLessonId}\`;
            }
        }

        function showError(message) {
            document.getElementById('loadingState').classList.add('hidden');
            document.getElementById('lessonContent').classList.add('hidden');
            document.getElementById('errorState').classList.remove('hidden');
            document.getElementById('errorMessage').textContent = message;
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', async () => {
            const user = await getCurrentUser();
            if (!user) {
                window.location.href = '/login';
                return;
            }

            loadLessonDetail();
        });
        </script>
    </body>
    </html>
  `)
})

export default app
