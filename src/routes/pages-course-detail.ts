/**
 * Course Detail Page Router
 * 강좌 상세 페이지 (차시 목록, 수강하기, 교육자료)
 */

import { Hono } from 'hono'
import type { Bindings } from '../types/database'

const app = new Hono<{ Bindings: Bindings }>()

/**
 * GET /courses/:id
 * 강좌 상세 페이지
 */
app.get('/courses/:id', async (c) => {
  const courseId = c.req.param('id')
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>강좌 상세 - 마인드스토리 LMS</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/js/auth.js"></script>
        <script src="/static/js/utils.js"></script>
        <script src="/static/js/content-protection.js"></script>
    </head>
    <body class="bg-gray-50">
        <!-- 헤더 -->
        <header class="bg-gradient-to-r from-purple-700 to-purple-900 text-white shadow-lg">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-2xl font-bold hover:text-purple-200 transition">
                        <i class="fas fa-graduation-cap mr-2"></i>
                        마인드스토리 LMS
                    </a>
                    <div class="flex items-center space-x-4">
                        <span id="headerUserName" class="text-purple-100"></span>
                        <button id="logoutBtn" onclick="handleLogout()" class="hidden bg-white text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-50 transition">
                            <i class="fas fa-sign-out-alt mr-2"></i>로그아웃
                        </button>
                        <a href="/login" id="loginBtn" class="bg-white text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-50 transition">
                            <i class="fas fa-sign-in-alt mr-2"></i>로그인
                        </a>
                    </div>
                </div>
            </div>
        </header>

        <!-- 메인 컨텐츠 -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- 강좌 헤더 -->
            <div class="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
                <div class="md:flex">
                    <!-- 강좌 썸네일 -->
                    <div class="md:w-2/5">
                        <img id="courseThumbnail" src="" alt="강좌 썸네일" class="w-full h-64 md:h-full object-cover">
                    </div>
                    <!-- 강좌 정보 -->
                    <div class="md:w-3/5 p-8">
                        <div class="flex items-center mb-4">
                            <span id="courseDifficulty" class="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                                초급
                            </span>
                            <span id="courseStatus" class="ml-2 px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
                                공개
                            </span>
                        </div>
                        <h1 id="courseTitle" class="text-3xl font-bold text-gray-900 mb-4">
                            로딩 중...
                        </h1>
                        <p id="courseDescription" class="text-gray-600 mb-6">
                            로딩 중...
                        </p>
                        
                        <!-- 강좌 통계 -->
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div class="text-center">
                                <div class="text-2xl font-bold text-purple-600" id="totalLessons">0</div>
                                <div class="text-sm text-gray-600">총 차시</div>
                            </div>
                            <div class="text-center">
                                <div class="text-2xl font-bold text-purple-600" id="totalDuration">0분</div>
                                <div class="text-sm text-gray-600">총 시간</div>
                            </div>
                            <div class="text-center">
                                <div class="text-2xl font-bold text-purple-600" id="enrolledCount">0명</div>
                                <div class="text-sm text-gray-600">수강생</div>
                            </div>
                            <div class="text-center">
                                <div class="text-2xl font-bold text-purple-600" id="coursePrice">무료</div>
                                <div class="text-sm text-gray-600">수강료</div>
                            </div>
                        </div>

                        <!-- 수강 버튼 -->
                        <div class="flex gap-4">
                            <button id="enrollBtn" onclick="handleEnroll()" class="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition">
                                <i class="fas fa-play-circle mr-2"></i>지금 수강하기
                            </button>
                            <button id="learnBtn" onclick="handleStartLearning()" class="hidden flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition">
                                <i class="fas fa-book-reader mr-2"></i>학습 시작하기
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 탭 메뉴 -->
            <div class="bg-white rounded-lg shadow-lg mb-8">
                <div class="border-b">
                    <nav class="flex">
                        <button id="tabLessons" onclick="switchTab('lessons')" class="px-6 py-4 font-semibold border-b-2 border-purple-600 text-purple-600">
                            <i class="fas fa-list mr-2"></i>차시 목록
                        </button>
                        <button id="tabMaterials" onclick="switchTab('materials')" class="px-6 py-4 font-semibold border-b-2 border-transparent text-gray-600 hover:text-purple-600">
                            <i class="fas fa-file-alt mr-2"></i>교육자료
                        </button>
                        <button id="tabReviews" onclick="switchTab('reviews')" class="px-6 py-4 font-semibold border-b-2 border-transparent text-gray-600 hover:text-purple-600">
                            <i class="fas fa-star mr-2"></i>수강평
                        </button>
                    </nav>
                </div>

                <!-- 차시 목록 탭 -->
                <div id="contentLessons" class="p-6">
                    <div class="space-y-4" id="lessonsList">
                        <div class="text-center py-8 text-gray-500">
                            <i class="fas fa-spinner fa-spin text-4xl mb-4"></i>
                            <p>차시 목록을 불러오는 중...</p>
                        </div>
                    </div>
                </div>

                <!-- 교육자료 탭 -->
                <div id="contentMaterials" class="hidden p-6">
                    <div class="text-center py-12 text-gray-500">
                        <i class="fas fa-folder-open text-6xl mb-4"></i>
                        <p class="text-lg">등록된 교육자료가 없습니다.</p>
                        <p class="text-sm mt-2">강사가 자료를 업로드하면 이곳에 표시됩니다.</p>
                    </div>
                </div>

                <!-- 수강평 탭 -->
                <div id="contentReviews" class="hidden p-6">
                    <div class="text-center py-12 text-gray-500">
                        <i class="fas fa-comments text-6xl mb-4"></i>
                        <p class="text-lg">등록된 수강평이 없습니다.</p>
                        <p class="text-sm mt-2">수강을 완료하면 수강평을 작성할 수 있습니다.</p>
                    </div>
                </div>
            </div>
        </main>

        <script>
            const courseId = ${courseId};
            let courseData = null;
            let lessonsData = [];
            let enrollment = null;

            // 페이지 로드 시 초기화
            document.addEventListener('DOMContentLoaded', async () => {
                await checkAuth();
                await loadCourseData();
                await loadLessons();
            });

            // 인증 확인
            async function checkAuth() {
                const user = await getCurrentUser();
                if (user) {
                    document.getElementById('headerUserName').textContent = user.name;
                    document.getElementById('loginBtn').classList.add('hidden');
                    document.getElementById('logoutBtn').classList.remove('hidden');
                }
            }

            // 강좌 데이터 로드
            async function loadCourseData() {
                try {
                    const response = await apiRequest('GET', \`/api/courses/\${courseId}\`);
                    
                    if (!response.success) {
                        showError(response.error || '강좌를 불러올 수 없습니다.');
                        return;
                    }

                    courseData = response.data.course;
                    enrollment = response.data.enrollment;

                    // 강좌 정보 표시
                    document.getElementById('courseTitle').textContent = courseData.title;
                    document.getElementById('courseDescription').textContent = courseData.description || '강좌 설명이 없습니다.';
                    document.getElementById('courseThumbnail').src = courseData.thumbnail_url || 'https://placehold.co/600x400/667eea/ffffff?text=' + encodeURIComponent(courseData.title);
                    
                    // 난이도
                    const difficultyMap = {
                        'beginner': '초급',
                        'intermediate': '중급',
                        'advanced': '고급'
                    };
                    document.getElementById('courseDifficulty').textContent = difficultyMap[courseData.difficulty] || '초급';
                    
                    // 상태
                    const statusMap = {
                        'published': { text: '공개', color: 'green' },
                        'draft': { text: '준비중', color: 'gray' }
                    };
                    const status = statusMap[courseData.status] || statusMap['draft'];
                    const statusEl = document.getElementById('courseStatus');
                    statusEl.textContent = status.text;
                    statusEl.className = \`ml-2 px-3 py-1 bg-\${status.color}-100 text-\${status.color}-800 text-sm font-semibold rounded-full\`;
                    
                    // 통계
                    document.getElementById('totalLessons').textContent = courseData.total_lessons || 0;
                    document.getElementById('totalDuration').textContent = (courseData.total_duration_minutes || 0) + '분';
                    document.getElementById('enrolledCount').textContent = courseData.enrolled_count || 0;
                    
                    // 가격
                    if (courseData.price === 0) {
                        document.getElementById('coursePrice').textContent = '무료';
                    } else if (courseData.price) {
                        document.getElementById('coursePrice').textContent = courseData.price.toLocaleString() + '원';
                    } else {
                        document.getElementById('coursePrice').textContent = '미정';
                    }

                    // 수강 버튼 표시
                    if (enrollment) {
                        document.getElementById('enrollBtn').classList.add('hidden');
                        document.getElementById('learnBtn').classList.remove('hidden');
                    }

                } catch (error) {
                    console.error('강좌 로드 에러:', error);
                    showError('강좌 정보를 불러오는 중 오류가 발생했습니다.');
                }
            }

            // 차시 목록 로드
            async function loadLessons() {
                try {
                    const response = await apiRequest('GET', \`/api/courses/\${courseId}/lessons\`);
                    
                    if (!response.success) {
                        document.getElementById('lessonsList').innerHTML = \`
                            <div class="text-center py-8 text-red-500">
                                <i class="fas fa-exclamation-circle text-4xl mb-4"></i>
                                <p>\${response.error || '차시 목록을 불러올 수 없습니다.'}</p>
                            </div>
                        \`;
                        return;
                    }

                    lessonsData = response.data || [];

                    if (lessonsData.length === 0) {
                        document.getElementById('lessonsList').innerHTML = \`
                            <div class="text-center py-12 text-gray-500">
                                <i class="fas fa-inbox text-6xl mb-4"></i>
                                <p class="text-lg">등록된 차시가 없습니다.</p>
                            </div>
                        \`;
                        return;
                    }

                    // 차시 목록 렌더링 (모바일 최적화: 글씨 크기 더 크게 + 플레이 버튼 대형화)
                    const lessonsHTML = lessonsData.map((lesson, index) => \`
                        <div class="border rounded-lg p-5 md:p-4 hover:border-purple-300 hover:shadow-md transition">
                            <div class="flex items-start flex-col md:flex-row">
                                <div class="flex items-start w-full md:w-auto">
                                    <div class="flex-shrink-0 w-16 h-16 md:w-12 md:h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-2xl md:text-base">
                                        \${lesson.lesson_number}
                                    </div>
                                    <div class="ml-4 flex-1">
                                        <h3 class="text-2xl md:text-lg font-bold text-gray-900 mb-3">
                                            \${lesson.title}
                                            \${lesson.is_free || lesson.is_free_preview ? '<span class="ml-2 px-3 py-1 bg-green-100 text-green-800 text-base md:text-xs font-semibold rounded">무료</span>' : ''}
                                        </h3>
                                        <p class="text-gray-600 text-lg md:text-sm mb-4 leading-relaxed">\${lesson.description || '차시 설명이 없습니다.'}</p>
                                        <div class="flex items-center text-lg md:text-sm text-gray-500 space-x-4">
                                            <span>
                                                <i class="fas fa-clock mr-1 text-lg md:text-sm"></i>
                                                \${lesson.video_duration_minutes || lesson.duration_minutes || 0}분
                                            </span>
                                            <span>
                                                <i class="fas fa-video mr-1 text-lg md:text-sm"></i>
                                                \${lesson.video_provider === 'youtube' ? 'YouTube' : 'api.video'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div class="mt-5 md:mt-0 md:ml-4 w-full md:w-auto">
                                    \${enrollment || lesson.is_free || lesson.is_free_preview ? \`
                                        <button onclick="playLesson(\${lesson.id})" class="w-full md:w-auto bg-green-600 text-white px-8 py-4 md:px-4 md:py-2 rounded-xl hover:bg-green-700 transition text-xl md:text-sm font-bold shadow-lg">
                                            <i class="fas fa-play-circle mr-2 text-2xl md:text-base"></i>재생
                                        </button>
                                    \` : \`
                                        <button disabled class="w-full md:w-auto bg-gray-300 text-gray-600 px-8 py-4 md:px-4 md:py-2 rounded-xl cursor-not-allowed text-xl md:text-sm font-bold">
                                            <i class="fas fa-lock mr-2 text-2xl md:text-base"></i>잠김
                                        </button>
                                    \`}
                                </div>
                            </div>
                        </div>
                    \`).join('');

                    document.getElementById('lessonsList').innerHTML = lessonsHTML;

                } catch (error) {
                    console.error('차시 로드 에러:', error);
                    document.getElementById('lessonsList').innerHTML = \`
                        <div class="text-center py-8 text-red-500">
                            <i class="fas fa-exclamation-circle text-4xl mb-4"></i>
                            <p>차시 목록을 불러오는 중 오류가 발생했습니다.</p>
                        </div>
                    \`;
                }
            }

            // 탭 전환
            function switchTab(tab) {
                // 모든 탭 버튼 초기화
                document.querySelectorAll('nav button').forEach(btn => {
                    btn.classList.remove('border-purple-600', 'text-purple-600');
                    btn.classList.add('border-transparent', 'text-gray-600');
                });

                // 모든 탭 콘텐츠 숨기기
                document.querySelectorAll('[id^="content"]').forEach(content => {
                    content.classList.add('hidden');
                });

                // 선택된 탭 활성화
                const tabBtn = document.getElementById(\`tab\${tab.charAt(0).toUpperCase() + tab.slice(1)}\`);
                tabBtn.classList.add('border-purple-600', 'text-purple-600');
                tabBtn.classList.remove('border-transparent', 'text-gray-600');

                // 선택된 콘텐츠 표시
                document.getElementById(\`content\${tab.charAt(0).toUpperCase() + tab.slice(1)}\`).classList.remove('hidden');
            }

            // 수강 신청
            async function handleEnroll() {
                const user = await getCurrentUser();
                if (!user) {
                    if (confirm('로그인이 필요합니다. 로그인 페이지로 이동하시겠습니까?')) {
                        window.location.href = '/login';
                    }
                    return;
                }

                if (!confirm('이 강좌를 수강 신청하시겠습니까?')) {
                    return;
                }

                try {
                    const response = await apiRequest('POST', \`/api/enrollments\`, {
                        course_id: courseId
                    });

                    if (response.success) {
                        alert('수강 신청이 완료되었습니다!');
                        location.reload();
                    } else {
                        showError(response.error || '수강 신청에 실패했습니다.');
                    }
                } catch (error) {
                    console.error('수강 신청 에러:', error);
                    showError('수강 신청 중 오류가 발생했습니다.');
                }
            }

            // 학습 시작
            function handleStartLearning() {
                window.location.href = \`/courses/\${courseId}/learn\`;
            }

            // 차시 재생
            function playLesson(lessonId) {
                window.location.href = \`/courses/\${courseId}/learn?lesson=\${lessonId}\`;
            }

            // 에러 표시
            function showError(message) {
                alert(message);
            }

            // 로그아웃
            function handleLogout() {
                if (confirm('로그아웃 하시겠습니까?')) {
                    localStorage.removeItem('session_token');
                    window.location.href = '/';
                }
            }
        </script>
        
        <!-- 보안 시스템 -->
        <script src="/static/js/security.js"></script>
        <script src="/static/js/content-protection.js"></script>
    </body>
    </html>
  `)
})

export default app
