/**
 * 관리자 페이지 라우트
 * /admin/*
 *
 * 단일 셸(4대 GNB/LNB)은 GET /admin/dashboard → adminHubPageHtml() 에서 제공합니다.
 * 이 파일의 차시 관리 등 서브 페이지는 상단 바를 간소화해 관제탑 해시(#courses 등)로 되돌아갑니다.
 */

import { Hono } from 'hono'
import { adminHubPageHtml } from '../utils/admin-hub-html'
import { adminMembersPageHtml } from '../utils/admin-members-page-html'
import { Bindings } from '../types/database'
import { STATIC_JS_CACHE_QUERY } from '../utils/static-js-cache-bust'
import { requireAdmin } from '../middleware/auth'

const pagesAdmin = new Hono<{ Bindings: Bindings }>()

/** 매직 펜슬 → 관제탑 해당 패널 (전용 편집 페이지 없을 때) */
pagesAdmin.get('/notice/edit/:id', requireAdmin, (c) => {
  void c.req.param('id')
  return c.redirect('/admin/dashboard#support', 302)
})

pagesAdmin.get('/course/edit/:id', requireAdmin, (c) => {
  return c.redirect('/admin/dashboard#courses', 302)
})

/**
 * GET /admin
 * 관리자 메인 페이지 → 대시보드로 리디렉트
 */
pagesAdmin.get('/', (c) => {
  return c.redirect('/admin/dashboard')
})

/**
 * GET /admin/dashboard
 * 관리자 대시보드 - 통계 및 개요
 */
pagesAdmin.get('/dashboard', async (c) => {
  return c.html(adminHubPageHtml())
})

/**
 * GET /admin/members
 * 전체 회원 관리 (목록·필터·상세 슬라이드 패널)
 */
pagesAdmin.get('/members', requireAdmin, async (c) => {
  return c.html(adminMembersPageHtml())
})

pagesAdmin.get('/courses', (c) => {
  return c.redirect('/admin/dashboard#courses')
})

pagesAdmin.get('/users', (c) => {
  return c.redirect('/admin/members', 302)
})

/**
 * GET /admin/payments
 * 결제 관리 페이지
 */
pagesAdmin.get('/payments', (c) => {
  return c.redirect('/admin/dashboard#payments')
})

pagesAdmin.get('/popups', (c) => {
  return c.redirect('/admin/dashboard#popups')
})

pagesAdmin.get('/settings', (c) => {
  return c.redirect('/admin/dashboard#settings')
})

pagesAdmin.get('/courses/:courseId/lessons', async (c) => {
  const courseId = c.req.param('courseId')
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>차시 관리 - 마인드스토리 LMS</title>
        <link rel="stylesheet" href="/static/css/app.css" />
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100">
        <!-- 관리자 헤더 -->
        <nav class="ms-admin-top-bar bg-purple-700 text-white shadow-lg">
            <div class="max-w-7xl mx-auto px-4 py-4">
                <div class="flex justify-between items-center">
                    <h1 class="text-2xl font-bold">
                        <i class="fas fa-list mr-2"></i>
                        차시 관리
                    </h1>
                    <div class="flex items-center space-x-4">
                        <a href="/" class="bg-indigo-500 hover:bg-indigo-400 border border-white/25 text-white px-4 py-2 rounded font-semibold shadow-sm transition-colors">
                            <i class="fas fa-users mr-1"></i>수강생 모드
                        </a>
                        <span class="inline-flex items-center max-w-[min(14rem,55vw)]"><span id="adminName" class="text-purple-100 text-sm font-medium truncate" data-ms-name-default="text-purple-100 text-sm font-medium truncate">로딩중...</span></span>
                        <button onclick="logout()" class="bg-white text-purple-700 px-4 py-2 rounded hover:bg-gray-100">
                            <i class="fas fa-sign-out-alt mr-1"></i>로그아웃
                        </button>
                    </div>
                </div>
            </div>
        </nav>

        <!-- 관제탑 4대 메뉴와 동일 해시로 복귀 (GNB는 /admin/dashboard 에서 전체 제공) -->
        <div class="bg-white shadow-md border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center gap-2 text-sm">
                <a href="/admin/dashboard" class="text-purple-700 font-semibold hover:underline"><i class="fas fa-satellite-dish mr-1"></i>관제탑</a>
                <span class="text-gray-300 hidden sm:inline">|</span>
                <a href="/admin/dashboard#courses" class="text-gray-600 hover:text-purple-700 hover:underline">교육 · 강좌</a>
                <a href="/admin/members" class="text-gray-600 hover:text-purple-700 hover:underline">회원</a>
                <a href="/admin/dashboard#payments" class="text-gray-600 hover:text-purple-700 hover:underline">결제</a>
                <a href="/admin/dashboard#isbn" class="text-gray-600 hover:text-purple-700 hover:underline">ISBN</a>
                <a href="/admin/dashboard#settings" class="text-gray-600 hover:text-purple-700 hover:underline">설정</a>
                <span class="grow"></span>
                <span class="text-xs text-gray-400 hidden md:inline">차시 편집 화면</span>
            </div>
        </div>

        <!-- 메인 콘텐츠 -->
        <div class="max-w-7xl mx-auto px-4 py-8">
            <!-- 강좌 정보 카드 -->
            <div class="bg-white rounded-lg shadow p-6 mb-6">
                <div class="flex justify-between items-start">
                    <div class="flex items-start">
                        <img id="courseThumbnail" src="" alt="강좌 썸네일" class="w-32 h-32 object-cover rounded-lg mr-6 bg-gray-100" onerror="this.onerror=null;this.src='https://placehold.co/200x200/e9d5ff/4c1d95?text=Course'">
                        <div>
                            <h2 id="courseTitle" class="text-2xl font-bold text-gray-800 mb-2">로딩중...</h2>
                            <p id="courseDescription" class="text-gray-600 mb-4">로딩중...</p>
                            <div class="flex items-center space-x-4 text-sm text-gray-500">
                                <span><i class="fas fa-users mr-1"></i><span id="enrolledCount">0</span>명 수강중</span>
                                <span><i class="fas fa-list mr-1"></i><span id="lessonCount">0</span>개 차시</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex space-x-2">
                        <a href="/admin/courses" class="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600">
                            <i class="fas fa-arrow-left mr-2"></i>강좌 목록
                        </a>
                        <button onclick="openBulkLessonModal()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
                            <i class="fas fa-layer-group mr-2"></i>차시 일괄 입력
                        </button>
                        <button onclick="openNewLessonModal()" class="bg-purple-700 text-white px-4 py-2 rounded-lg hover:bg-purple-800">
                            <i class="fas fa-plus mr-2"></i>새 차시 추가
                        </button>
                    </div>
                </div>
            </div>

            <!-- 차시 목록 -->
            <div class="bg-white rounded-lg shadow">
                <div class="p-6">
                    <h2 class="text-xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-list-ol mr-2"></i>차시 목록
                    </h2>
                    <div class="space-y-4" id="lessonList">
                        <div class="text-center py-8 text-gray-500">
                            <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                            <p>로딩중...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 차시 등록/수정 모달 -->
        <!-- 차시 일괄 입력 모달 -->
        <div id="bulkLessonModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
            <div class="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div class="p-6 border-b flex justify-between items-center">
                    <h2 class="text-2xl font-bold text-gray-800">
                        <i class="fas fa-layer-group mr-2"></i>차시 일괄 입력
                    </h2>
                    <button onclick="closeBulkLessonModal()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                
                <div class="p-6">
                    <!-- 입력 방법 선택 탭 -->
                    <div class="flex border-b mb-6">
                        <button id="manualTab" onclick="switchBulkInputMode('manual')" 
                                class="px-6 py-3 font-semibold border-b-2 border-purple-600 text-purple-600">
                            <i class="fas fa-keyboard mr-2"></i>수동 입력
                        </button>
                        <button id="aiTab" onclick="switchBulkInputMode('ai')" 
                                class="px-6 py-3 font-semibold text-gray-500 hover:text-gray-700">
                            <i class="fas fa-robot mr-2"></i>AI 자동 생성
                        </button>
                    </div>
                    
                    <!-- 수동 입력 섹션 -->
                    <div id="manualSection">
                        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <h3 class="font-semibold text-blue-900 mb-2">
                                <i class="fas fa-info-circle mr-2"></i>입력 형식
                            </h3>
                            <p class="text-sm text-blue-800 mb-2">각 줄에 하나의 차시를 입력하세요. 형식: <code class="bg-blue-100 px-2 py-1 rounded">차시번호|제목|설명|재생시간(분)</code></p>
                            <p class="text-sm text-blue-800 font-mono">예: 1|메타인지란 무엇인가?|메타인지의 기본 개념을 배웁니다|30</p>
                            <p class="text-sm text-blue-600 mt-2">* 설명과 재생시간은 선택사항입니다.</p>
                        </div>
                        
                        <textarea id="bulkLessonInput" rows="12" 
                                  placeholder="1|메타인지란 무엇인가?|메타인지의 기본 개념을 배웁니다|30&#10;2|메타인지 향상 전략|효과적인 메타인지 향상 방법을 학습합니다|45&#10;3|실전 적용 사례|실제 학습 상황에서의 메타인지 활용법|40"
                                  class="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"></textarea>
                        
                        <div class="flex justify-between items-center mt-4">
                            <p class="text-sm text-gray-600">
                                <i class="fas fa-lightbulb text-yellow-500 mr-1"></i>
                                Tip: 엑셀에서 복사-붙여넣기도 가능합니다
                            </p>
                            <button onclick="processBulkLessons('manual')" 
                                    class="bg-purple-700 text-white px-6 py-3 rounded-lg hover:bg-purple-800 font-semibold">
                                <i class="fas fa-check mr-2"></i>일괄 등록
                            </button>
                        </div>
                    </div>
                    
                    <!-- AI 자동 생성 섹션 -->
                    <div id="aiSection" class="hidden">
                        <div class="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6 mb-6">
                            <h3 class="font-semibold text-purple-900 mb-3 flex items-center">
                                <i class="fas fa-magic mr-2 text-purple-600"></i>AI가 강좌 커리큘럼을 자동으로 생성합니다
                            </h3>
                            <p class="text-sm text-purple-800">강좌 제목과 목표를 기반으로 최적의 차시 구성을 제안합니다.</p>
                        </div>
                        
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    생성할 차시 수 <span class="text-red-500">*</span>
                                </label>
                                <input type="number" id="aiLessonCount" min="3" max="20" value="5"
                                       class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                                <p class="text-sm text-gray-500 mt-1">* 3~20개 사이로 입력하세요</p>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    추가 요구사항 (선택사항)
                                </label>
                                <textarea id="aiRequirements" rows="3" 
                                          placeholder="예: 초보자를 위한 기초 중심 구성, 실습 위주의 내용 포함 등"
                                          class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"></textarea>
                            </div>
                            
                            <div class="flex justify-end">
                                <button onclick="processBulkLessons('ai')" 
                                        class="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-3 rounded-lg hover:from-purple-700 hover:to-indigo-700 font-semibold shadow-lg">
                                    <i class="fas fa-wand-magic-sparkles mr-2"></i>AI로 생성하기
                                </button>
                            </div>
                        </div>
                        
                        <!-- AI 생성 결과 미리보기 -->
                        <div id="aiPreviewSection" class="hidden mt-6">
                            <div class="border-t pt-6">
                                <h3 class="font-semibold text-gray-900 mb-4">
                                    <i class="fas fa-eye mr-2"></i>생성된 차시 미리보기
                                </h3>
                                <div id="aiPreviewList" class="space-y-2 max-h-80 overflow-y-auto bg-gray-50 rounded-lg p-4 mb-4">
                                    <!-- AI 생성 결과가 여기에 표시됩니다 -->
                                </div>
                                <div class="flex justify-end space-x-3">
                                    <button onclick="regenerateAILessons()" 
                                            class="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600">
                                        <i class="fas fa-redo mr-2"></i>다시 생성
                                    </button>
                                    <button onclick="confirmAILessons()" 
                                            class="bg-purple-700 text-white px-6 py-2 rounded-lg hover:bg-purple-800">
                                        <i class="fas fa-check mr-2"></i>확인 및 등록
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div id="lessonModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
            <div id="lessonModalDialog" class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col" style="cursor: move;">
                <div class="p-6 border-b flex justify-between items-center flex-shrink-0">
                    <h2 class="text-2xl font-bold text-gray-800">
                        <i class="fas fa-edit mr-2"></i><span id="modalTitle">새 차시 추가</span>
                    </h2>
                    <button onclick="closeLessonModal()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                <form id="lessonForm" class="flex-1 overflow-y-auto">
                    <div class="p-6 space-y-6">
                    <input type="hidden" id="lessonId">
                    <input type="hidden" id="courseIdInput" value="${courseId}">
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- 차시 제목 -->
                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                차시 제목 <span class="text-red-500">*</span>
                            </label>
                            <input type="text" id="lessonTitle" required
                                class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                        </div>

                        <!-- 차시 순서 -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                차시 순서 <span class="text-red-500">*</span>
                            </label>
                            <input type="number" id="lessonOrder" min="1" required placeholder="예: 1, 2, 3..."
                                class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                            <p class="text-sm text-gray-500 mt-1">* 차시 순서를 입력하세요</p>
                        </div>

                        <!-- 재생 시간 (분) -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                재생 시간 (분)
                            </label>
                            <input type="number" id="lessonDuration" min="0" value="0"
                                class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                        </div>

                        <!-- YouTube 영상 입력 (간단 버전) -->
                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                <i class="fab fa-youtube mr-2 text-red-600"></i>YouTube 영상 <span class="text-red-500">*</span>
                            </label>
                            
                            <input type="text" id="lessonVideoUrl" placeholder="https://youtube.com/watch?v=dQw4w9WgXcQ 또는 dQw4w9WgXcQ"
                                class="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500">
                            
                            <div class="flex items-center justify-between mt-2">
                                <p class="text-xs text-gray-500">
                                    <i class="fas fa-info-circle mr-1"></i>
                                    YouTube URL 또는 영상 ID 입력
                                </p>
                                <a href="https://studio.youtube.com/channel/UCXF55ON7qD6Z_iVYhkcOffg/videos" 
                                   target="_blank" 
                                   class="inline-flex items-center px-2.5 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors">
                                    <i class="fab fa-youtube mr-1.5"></i>내 YouTube
                                    <i class="fas fa-external-link-alt ml-1.5 text-[10px]"></i>
                                </a>
                            </div>

                        </div>

                        <!-- 차시 설명 -->
                        <div class="md:col-span-2">
                            <div class="flex justify-between items-center mb-2">
                                <label class="block text-sm font-medium text-gray-700">
                                    차시 설명
                                </label>
                                <button type="button" onclick="generateLessonDescription()" 
                                    class="text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all">
                                    <i class="fas fa-magic mr-1"></i>AI로 설명 생성
                                </button>
                            </div>
                            <textarea id="lessonDescription" rows="4" placeholder="차시에 대한 설명을 입력하거나 AI로 생성하세요..."
                                class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"></textarea>
                            <p class="text-xs text-gray-500 mt-1">
                                💡 <strong>팁:</strong> 차시 제목을 먼저 입력한 후 AI 생성 버튼을 클릭하세요.
                            </p>
                        </div>

                        <!-- 무료 맛보기 -->
                        <div class="md:col-span-2">
                            <label class="flex items-center mb-3">
                                <input type="checkbox" id="lessonIsPreview" class="mr-2 rounded border-gray-300 text-purple-600 focus:ring-purple-500" onchange="toggleFreePreviewTime()">
                                <span class="text-sm font-medium text-gray-700">👀 무료 맛보기로 공개 <span class="text-xs text-gray-500 font-normal">(수강·결제 없이 이 차시만 시청 가능)</span></span>
                            </label>
                            
                            <!-- 무료 체험 시간 설정 -->
                            <div id="freePreviewTimeSection" class="hidden ml-6 mt-2">
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    무료 체험 시간 (분)
                                </label>
                                <div class="flex items-center space-x-4">
                                    <input type="number" id="lessonFreePreviewMinutes" min="0" max="10" value="3"
                                        class="w-32 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                                    <span class="text-sm text-gray-600">
                                        <i class="fas fa-info-circle mr-1"></i>
                                        0 = 전체 무료, 1~10 = 제한된 시간만 무료
                                    </span>
                                </div>
                                <p class="text-xs text-gray-500 mt-2">
                                    * 3~5분 권장: 수강생이 강좌 맛보기 가능<br>
                                    * 0분 설정 시: 전체 영상 무료 공개
                                </p>
                            </div>
                        </div>

                        <!-- 공개 여부 -->
                        <div class="md:col-span-2">
                            <label class="flex items-center">
                                <input type="checkbox" id="lessonIsActive" checked class="mr-2">
                                <span class="text-sm font-medium text-gray-700">공개 (수강생에게 공개)</span>
                            </label>
                        </div>
                    </div>
                    </div>
                    
                    <!-- ✅ 저장 버튼을 form 안으로 이동 (sticky footer) -->
                    <div class="p-6 border-t flex justify-end space-x-4 sticky bottom-0 bg-white z-10">
                        <button type="button" onclick="closeLessonModal()"
                            class="px-6 py-3 border rounded-lg hover:bg-gray-100">
                            <i class="fas fa-times mr-2"></i>취소
                        </button>
                        <button type="submit"
                            class="px-6 py-3 bg-purple-700 text-white rounded-lg hover:bg-purple-800">
                            <i class="fas fa-save mr-2"></i>저장
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <script>
            const courseId = ${courseId};
            let allLessons = [];

            // 페이지 로드 시 초기화
            document.addEventListener('DOMContentLoaded', async () => {
              // 관리자 권한 확인
              const user = await requireAdmin();
              if (!user) return;

              if (typeof applyHeaderUserDisplay === 'function') {
                applyHeaderUserDisplay(document.getElementById('adminName'), user)
              }

              // 강좌 정보 로드
              await loadCourseInfo();

              // 차시 목록 로드
              await loadLessons();

              // 폼 제출 이벤트
              document.getElementById('lessonForm').addEventListener('submit', handleSubmit);
            });

            // 강좌 정보 로드
            async function loadCourseInfo() {
              try {
                const response = await apiRequest('GET', \`/api/courses/\${courseId}\`);
                
                if (response.success) {
                  // API는 { data: { course: {...}, lessons: [...] } } 구조로 반환
                  const course = response.data.course || response.data;
                  document.getElementById('courseTitle').textContent = course.title;
                  document.getElementById('courseDescription').textContent = course.description || '';
                  const thumbnailImg = document.getElementById('courseThumbnail');
                  if (course.thumbnail_url) {
                    thumbnailImg.src = course.thumbnail_url;
                    thumbnailImg.style.display = 'block';
                  } else {
                    thumbnailImg.style.display = 'none';
                  }
                  document.getElementById('enrolledCount').textContent = course.enrolled_count || 0;
                } else {
                  showError('강좌 정보를 불러오는데 실패했습니다.');
                }
              } catch (error) {
                console.error('Load course info error:', error);
                showError('강좌 정보를 불러오는데 실패했습니다.');
              }
            }

            // 차시 목록 로드
            async function loadLessons() {
              console.log('[DEBUG] loadLessons() 호출됨, courseId:', courseId);
              try {
                const response = await apiRequest('GET', \`/api/courses/\${courseId}/lessons\`);
                console.log('[DEBUG] API 응답:', response);
                
                if (response.success) {
                  allLessons = response.data;
                  console.log('[DEBUG] 차시 목록:', allLessons);
                  document.getElementById('lessonCount').textContent = allLessons.length;
                  renderLessons(allLessons);
                } else {
                  console.error('[DEBUG] API 실패:', response);
                  showError('차시 목록을 불러오는데 실패했습니다.');
                }
              } catch (error) {
                console.error('[DEBUG] Load lessons error:', error);
                showError('차시 목록을 불러오는데 실패했습니다.');
              }
            }

            // 차시 목록 렌더링
            function renderLessons(lessons) {
              console.log('[DEBUG] renderLessons() 호출됨, lessons:', lessons);
              const container = document.getElementById('lessonList');
              console.log('[DEBUG] lessonList container:', container);
              
              if (!lessons || lessons.length === 0) {
                console.log('[DEBUG] 차시가 없음, 빈 메시지 표시');
                container.innerHTML = \`
                  <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-2"></i>
                    <p>등록된 차시가 없습니다.</p>
                    <button onclick="openNewLessonModal()" class="mt-4 bg-purple-700 text-white px-6 py-2 rounded-lg hover:bg-purple-800">
                      <i class="fas fa-plus mr-2"></i>첫 차시 추가하기
                    </button>
                  </div>
                \`;
                return;
              }
              
              console.log('[DEBUG] 차시 렌더링 중, 개수:', lessons.length);

              // 차시 번호 역순 정렬 (최신 차시가 위로)
              const sortedLessons = [...lessons].sort((a, b) => b.lesson_number - a.lesson_number);

              container.innerHTML = sortedLessons.map(lesson => \`
                <div class="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div class="flex justify-between items-start">
                    <div class="flex items-start flex-1">
                      <div class="bg-purple-100 text-purple-700 rounded-full w-10 h-10 flex items-center justify-center font-bold mr-4">
                        \${lesson.lesson_number}
                      </div>
                      <div class="flex-1">
                        <h3 class="text-lg font-semibold text-gray-800 mb-1">\${lesson.title}</h3>
                        <p class="text-sm text-gray-600 mb-2">\${lesson.description || '설명 없음'}</p>
                        <div class="flex items-center space-x-4 text-sm text-gray-500">
                          \${lesson.video_duration_minutes ? \`<span><i class="fas fa-clock mr-1"></i>\${lesson.video_duration_minutes}분</span>\` : ''}
                          \${lesson.video_url ? \`<span><i class="fas fa-video mr-1"></i>영상 있음</span>\` : '<span><i class="fas fa-video-slash mr-1 text-gray-400"></i>영상 없음</span>'}
                          \${lesson.is_preview === 1 || lesson.is_free_preview === 1 ? '<span class="bg-amber-100 text-amber-900 px-2 py-1 rounded text-xs font-semibold">✨ 무료 맛보기</span>' : ''}
                          \${lesson.status !== 'active' ? '<span class="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-semibold"><i class="fas fa-eye-slash mr-1"></i>비공개</span>' : ''}
                        </div>
                      </div>
                    </div>
                    <div class="flex space-x-2">
                      \${lesson.video_url ? \`
                        <a href="/courses/\${courseId}/lessons/\${lesson.id}" target="_blank" 
                           class="text-green-600 hover:text-green-800 text-2xl" title="영상 재생">
                          <i class="fas fa-play-circle"></i>
                        </a>
                      \` : ''}
                      <button onclick="editLesson(\${lesson.id})" class="text-blue-600 hover:text-blue-800 text-2xl" title="수정">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button onclick="deleteLesson(\${lesson.id})" class="text-red-600 hover:text-red-800 text-2xl" title="삭제">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              \`).join('');
            }

            // 새 차시 모달 열기
            function openNewLessonModal() {
              document.getElementById('modalTitle').textContent = '새 차시 추가';
              document.getElementById('lessonForm').reset();
              document.getElementById('lessonId').value = '';
              document.getElementById('courseIdInput').value = courseId;
              
              // 다음 순서 번호 자동 설정
              const nextOrder = allLessons.length > 0 ? Math.max(...allLessons.map(l => l.lesson_number)) + 1 : 1;
              document.getElementById('lessonOrder').value = nextOrder;
              
              document.getElementById('lessonIsActive').checked = true;
              document.getElementById('lessonModal').classList.remove('hidden');
              document.getElementById('lessonModal').classList.add('flex');
            }

            // 차시 수정 모달
            async function editLesson(lessonId) {
              try {
                const response = await apiRequest('GET', \`/api/courses/\${courseId}/lessons/\${lessonId}\`);
                
                if (response.success) {
                  const lesson = response.data;
                  
                  console.log('📝 Loaded lesson data:', lesson);
                  
                  document.getElementById('modalTitle').textContent = '차시 수정';
                  document.getElementById('lessonId').value = lesson.id;
                  document.getElementById('lessonTitle').value = lesson.title || '';
                  document.getElementById('lessonOrder').value = lesson.lesson_number;
                  document.getElementById('lessonDuration').value = lesson.video_duration_minutes || 0;
                  document.getElementById('lessonDescription').value = lesson.description || '';
                  document.getElementById('lessonIsPreview').checked =
                    lesson.is_preview === 1 || lesson.is_free_preview === 1;
                  document.getElementById('lessonIsActive').checked = lesson.status === 'active';
                  
                  // 영상 데이터 설정
                  if (lesson.video_url) {
                    console.log('🎬 영상 URL 발견:', lesson.video_url);
                    console.log('🎬 영상 제공자:', lesson.video_provider);
                    
                    // 현재 영상 정보 표시
                    const currentVideoInfo = document.getElementById('currentVideoInfo');
                    const currentVideoUrl = document.getElementById('currentVideoUrl');
                    
                    // YouTube인지 api.video인지 확인
                    const isYoutube = lesson.video_provider === 'youtube' || 
                                     lesson.video_url.includes('youtube.com') || 
                                     lesson.video_url.includes('youtu.be');
                    
                    if (isYoutube) {
                      // YouTube 영상인 경우
                      switchVideoTab('youtube');
                      document.getElementById('lessonVideoUrl').value = lesson.video_url;
                      
                      // YouTube는 현재 영상 정보 숨김 (URL 입력창에 표시되므로)
                      currentVideoInfo.classList.add('hidden');
                    } else {
                      // api.video 또는 기타 URL인 경우
                      switchVideoTab('urlupload');
                      document.getElementById('videoUrlInput').value = lesson.video_url;
                      
                      // 현재 영상 정보 표시
                      currentVideoInfo.classList.remove('hidden');
                      currentVideoUrl.textContent = lesson.video_url;
                      
                      // 영상 플랫폼 구분하여 표시
                      const platformBadge = currentVideoUrl.parentElement.querySelector('.platform-badge') || document.createElement('span');
                      platformBadge.className = 'platform-badge text-xs px-2 py-1 rounded ml-2';
                      
                      if (lesson.video_url.includes('api.video')) {
                        platformBadge.textContent = 'api.video';
                        platformBadge.className += ' bg-purple-100 text-purple-700';
                      } else if (lesson.video_url.includes('cloudflare')) {
                        platformBadge.textContent = 'Cloudflare Stream';
                        platformBadge.className += ' bg-blue-100 text-blue-700';
                      } else if (lesson.video_url.includes('r2.dev')) {
                        platformBadge.textContent = 'R2 Storage';
                        platformBadge.className += ' bg-orange-100 text-orange-700';
                      } else {
                        platformBadge.textContent = '외부 URL';
                        platformBadge.className += ' bg-gray-100 text-gray-700';
                      }
                      
                      if (!currentVideoUrl.parentElement.querySelector('.platform-badge')) {
                        currentVideoUrl.parentElement.insertBefore(platformBadge, currentVideoUrl);
                      }
                    }
                    
                    // 재생시간 표시
                    if (lesson.video_duration_minutes && lesson.video_duration_minutes > 0) {
                      console.log('⏱️ 재생시간:', lesson.video_duration_minutes, '분');
                    }
                  } else {
                    console.log('❌ 영상 URL이 없습니다');
                    document.getElementById('currentVideoInfo').classList.add('hidden');
                    document.getElementById('lessonVideoUrl').value = '';
                    document.getElementById('videoUrlInput').value = '';
                  }
                  
                  document.getElementById('lessonModal').classList.remove('hidden');
                  document.getElementById('lessonModal').classList.add('flex');
                } else {
                  console.error('❌ Failed to load lesson:', response);
                  showError(response.error || '차시 정보를 불러오는데 실패했습니다.');
                }
              } catch (error) {
                console.error('Edit lesson error:', error);
                showError('차시 정보를 불러오는데 실패했습니다.');
              }
            }

            // 모달 닫기
            function closeLessonModal() {
              document.getElementById('lessonModal').classList.add('hidden');
              document.getElementById('lessonModal').classList.remove('flex');
            }
            
            // 저장 버튼 클릭 시 폼 제출
            function submitLessonForm() {
              const form = document.getElementById('lessonForm');
              if (form) {
                form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
              }
            }

            // 무료 체험 시간 섹션 토글
            function toggleFreePreviewTime() {
              const checkbox = document.getElementById('lessonIsFree');
              const section = document.getElementById('freePreviewTimeSection');
              
              if (checkbox.checked) {
                section.classList.remove('hidden');
              } else {
                section.classList.add('hidden');
              }
            }

            // 영상 데이터 가져오기
            function getVideoData() {
              console.log('🎬 getVideoData 시작');
              
              // YouTube URL 입력 필드
              const youtubeUrlField = document.getElementById('lessonVideoUrl');
              if (!youtubeUrlField) {
                console.error('❌ lessonVideoUrl 필드를 찾을 수 없음');
                alert('YouTube URL 입력 필드를 찾을 수 없습니다.');
                return null;
              }
              
              const youtubeUrl = youtubeUrlField.value.trim();
              console.log('📝 YouTube URL:', youtubeUrl);
              
              if (!youtubeUrl) {
                alert('YouTube URL 또는 영상 ID를 입력해주세요.');
                youtubeUrlField.focus();
                return null;
              }
              
              // YouTube ID 추출
              const videoId = extractYouTubeId(youtubeUrl);
              console.log('🆔 추출된 YouTube ID:', videoId);
              
              if (!videoId) {
                alert('유효하지 않은 YouTube URL입니다.\\n\\n예시:\\n- https://www.youtube.com/watch?v=dQw4w9WgXcQ\\n- dQw4w9WgXcQ');
                youtubeUrlField.focus();
                return null;
              }
              
              return {
                video_provider: 'youtube',
                video_url: videoId,
                video_id: videoId
              };
            }
            
            // YouTube ID 추출 함수
            function extractYouTubeId(url) {
              const patterns = [
                /(?:youtube\\.com\\/watch\\?v=|youtu\\.be\\/|youtube\\.com\\/embed\\/)([a-zA-Z0-9_-]{11})/,
                /^([a-zA-Z0-9_-]{11})$/  // 직접 ID 입력
              ];
              
              for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match) {
                  return match[1];
                }
              }
              return null;
            }

            // 폼 제출 처리
            async function handleSubmit(e) {
              e.preventDefault();
              console.log('🚀 handleSubmit 시작');
              
              const lessonId = document.getElementById('lessonId').value;
              
              // 영상 데이터 가져오기
              const videoData = getVideoData();
              if (!videoData) {
                console.error('❌ videoData가 null/undefined');
                return; // 영상 데이터 검증 실패
              }
              
              console.log('✅ videoData 확인 완료:', videoData);
              
              const title = document.getElementById('lessonTitle').value;
              const lessonOrder = document.getElementById('lessonOrder').value;
              
              console.log('📝 입력값 확인:', {
                title,
                lessonOrder,
                titleLength: title?.length,
                lessonOrderValue: lessonOrder
              });
              
              if (!title || !title.trim()) {
                alert('차시 제목을 입력해주세요.');
                document.getElementById('lessonTitle').focus();
                return;
              }
              
              if (!lessonOrder || parseInt(lessonOrder) < 1) {
                alert('차시 순서를 입력해주세요. (1 이상)');
                document.getElementById('lessonOrder').focus();
                return;
              }
              
              const formData = {
                course_id: parseInt(courseId),
                title: title.trim(),
                lesson_number: parseInt(lessonOrder),
                video_duration_minutes: parseInt(document.getElementById('lessonDuration').value) || 0,
                video_provider: videoData.video_provider,
                video_url: videoData.video_url,
                video_id: videoData.video_id,
                description: document.getElementById('lessonDescription').value || null,
                is_preview: document.getElementById('lessonIsPreview').checked ? 1 : 0,
                status: document.getElementById('lessonIsActive').checked ? 'active' : 'inactive'
              };

              console.log('📤 API 요청 시작:', { lessonId, courseId, formData });
              
              try {
                let response;
                if (lessonId) {
                  // 수정
                  response = await apiRequest('PUT', \`/api/courses/\${courseId}/lessons/\${lessonId}\`, formData);
                } else {
                  // 등록
                  console.log('📤 POST 요청:', \`/api/courses/\${courseId}/lessons\`);
                  response = await apiRequest('POST', \`/api/courses/\${courseId}/lessons\`, formData);
                }

                console.log('📥 API 응답:', response);

                if (response.success) {
                  alert(lessonId ? '차시가 수정되었습니다.' : '차시가 추가되었습니다.');
                  closeLessonModal();
                  await loadLessons();
                } else {
                  console.error('❌ API 실패:', response);
                  showError(response.error || '저장에 실패했습니다.');
                }
              } catch (error) {
                console.error('❌ Save lesson error:', error);
                console.error('❌ Error details:', {
                  message: error.message,
                  response: error.response?.data,
                  status: error.response?.status
                });
                
                let errorMessage = '저장에 실패했습니다.';
                if (error.response?.data?.error) {
                  errorMessage = error.response.data.error;
                } else if (error.message) {
                  errorMessage = \`오류: \${error.message}\`;
                }
                
                showError(errorMessage);
              }
            }

            // 차시 삭제
            async function deleteLesson(lessonId) {
              if (!confirm('정말 이 차시를 삭제하시겠습니까?')) {
                return;
              }

              try {
                const response = await apiRequest('DELETE', \`/api/courses/\${courseId}/lessons/\${lessonId}\`);
                
                if (response.success) {
                  alert('차시가 삭제되었습니다.');
                  await loadLessons();
                } else {
                  showError(response.error || '삭제에 실패했습니다.');
                }
              } catch (error) {
                console.error('Delete lesson error:', error);
                showError('삭제에 실패했습니다.');
              }
            }

            // 현재 영상 미리보기
            function previewCurrentVideo() {
              const videoUrl = document.getElementById('currentVideoUrl').textContent.trim();
              if (!videoUrl) {
                alert('미리보기할 영상 URL이 없습니다.');
                return;
              }
              
              console.log('🎬 미리보기 URL:', videoUrl);
              
              // YouTube URL인지 확인
              const isYoutube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
              
              // api.video embed URL인지 확인
              const isApiVideo = videoUrl.includes('api.video') || videoUrl.includes('embed');
              
              // 미리보기 모달 생성
              const previewModal = document.createElement('div');
              previewModal.id = 'videoPreviewModal';
              previewModal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60]';
              previewModal.onclick = (e) => {
                if (e.target === previewModal) {
                  document.body.removeChild(previewModal);
                }
              };
              
              let embedHtml = '';
              
              if (isYoutube) {
                // YouTube URL을 embed 형식으로 변환
                let videoId = '';
                if (videoUrl.includes('youtube.com/watch?v=')) {
                  videoId = videoUrl.split('v=')[1].split('&')[0];
                } else if (videoUrl.includes('youtu.be/')) {
                  videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
                }
                
                if (videoId) {
                  embedHtml = \`
                    <iframe width="960" height="540" 
                      src="https://www.youtube.com/embed/\${videoId}" 
                      frameborder="0" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowfullscreen
                      class="rounded-lg shadow-2xl">
                    </iframe>
                  \`;
                }
              } else if (isApiVideo) {
                // api.video embed URL은 그대로 사용
                embedHtml = \`
                  <iframe 
                    src="\${videoUrl}" 
                    width="960" 
                    height="540" 
                    frameborder="0" 
                    scrolling="no" 
                    allowfullscreen="true"
                    class="rounded-lg shadow-2xl">
                  </iframe>
                \`;
              } else {
                // 기타 영상 URL은 video 태그 사용
                embedHtml = \`
                  <video controls width="960" height="540" class="rounded-lg shadow-2xl">
                    <source src="\${videoUrl}" type="video/mp4">
                    브라우저가 비디오를 지원하지 않습니다.
                  </video>
                \`;
              }
              
              previewModal.innerHTML = \`
                <div class="relative">
                  <button onclick="document.body.removeChild(document.getElementById('videoPreviewModal'))" 
                    class="absolute -top-10 right-0 text-white hover:text-gray-300 text-2xl">
                    <i class="fas fa-times-circle"></i> 닫기
                  </button>
                  \${embedHtml}
                  <div class="mt-4 text-center text-white text-sm">
                    <i class="fas fa-info-circle mr-2"></i>
                    클릭하여 닫기 또는 ESC 키를 누르세요
                  </div>
                </div>
              \`;
              
              document.body.appendChild(previewModal);
              
              // ESC 키로 닫기
              const closeOnEsc = (e) => {
                if (e.key === 'Escape') {
                  const modal = document.getElementById('videoPreviewModal');
                  if (modal) {
                    document.body.removeChild(modal);
                  }
                  document.removeEventListener('keydown', closeOnEsc);
                }
              };
              document.addEventListener('keydown', closeOnEsc);
            }
            
            // 현재 영상 삭제
            function removeCurrentVideo() {
              if (confirm('영상을 삭제하시겠습니까? 저장 후에 적용됩니다.')) {
                document.getElementById('currentVideoInfo').classList.add('hidden');
                document.getElementById('lessonVideoUrl').value = '';
                document.getElementById('videoUrlInput').value = '';
                
                // 업로드된 파일 정보도 초기화
                const uploadedInfo = document.getElementById('uploadedInfo');
                if (uploadedInfo) {
                  uploadedInfo.classList.add('hidden');
                }
                
                alert('영상이 삭제된 상태로 표시되었습니다. 저장 버튼을 클릭하여 확정하세요.');
              }
            }
            
            // 업로드된 영상 교체
            function replaceUploadedVideo() {
              if (confirm('다른 영상으로 교체하시겠습니까?')) {
                // 현재 업로드 정보 숨기기
                document.getElementById('uploadedInfo').classList.add('hidden');
                
                // 파일 선택 창 열기
                const fileInput = document.getElementById('videoFileInput');
                if (fileInput) {
                  fileInput.click();
                }
                
                alert('새 영상 파일을 선택해 주세요.');
              }
            }
            
            // 업로드된 영상 삭제
            function deleteUploadedVideo() {
              if (confirm('업로드된 영상을 삭제하시겠습니까? 저장 후에 적용됩니다.')) {
                // 업로드 정보 숨기기
                document.getElementById('uploadedInfo').classList.add('hidden');
                
                // 숨겨진 필드 초기화
                const videoKey = document.getElementById('uploadedVideoKey');
                if (videoKey) {
                  videoKey.value = '';
                }
                
                // 입력 필드 초기화
                document.getElementById('lessonVideoUrl').value = '';
                document.getElementById('videoUrlInput').value = '';
                
                alert('영상이 삭제된 상태로 표시되었습니다. 저장 버튼을 클릭하여 확정하세요.');
              }
            }
            
            // 에러 메시지 표시
            function showError(message) {
              alert(message);
            }
            
            // 모달 드래그 가능하게 만들기
            (() => {
              const modal = document.getElementById('lessonModal');
              const modalDialog = document.getElementById('lessonModalDialog');
              let isDragging = false;
              let currentX;
              let currentY;
              let initialX;
              let initialY;
              let xOffset = 0;
              let yOffset = 0;

              modalDialog.addEventListener('mousedown', dragStart);
              document.addEventListener('mousemove', drag);
              document.addEventListener('mouseup', dragEnd);

              function dragStart(e) {
                // 헤더 영역만 드래그 가능
                if (e.target.closest('.p-6.border-b')) {
                  initialX = e.clientX - xOffset;
                  initialY = e.clientY - yOffset;
                  isDragging = true;
                }
              }

              function drag(e) {
                if (isDragging) {
                  e.preventDefault();
                  currentX = e.clientX - initialX;
                  currentY = e.clientY - initialY;

                  xOffset = currentX;
                  yOffset = currentY;

                  setTranslate(currentX, currentY, modalDialog);
                }
              }

              function dragEnd() {
                initialX = currentX;
                initialY = currentY;
                isDragging = false;
              }

              function setTranslate(xPos, yPos, el) {
                el.style.transform = 'translate3d(' + xPos + 'px, ' + yPos + 'px, 0)';
              }
            })();
            
            /**
             * 🚀 스마트 빠른 업로드
             * 플랫폼별로 새 창을 열고, 사용자가 붙여넣기할 수 있도록 클립보드 감지
             */
            function quickUpload(platform, url) {
              // 1. 새 탭에서 플랫폼 열기
              window.open(url, '_blank');
              
              // 2. 플랫폼별 탭 자동 전환 및 안내 표시
              let targetTab = '';
              let inputField = null;
              let message = '';
              
              if (platform === 'youtube') {
                targetTab = 'youtube';
                inputField = document.getElementById('lessonVideoUrl');
                message = '✨ YouTube에서 영상을 업로드한 후, 영상 URL을 복사해서 아래에 붙여넣으세요!';
              } else if (platform === 'apivideo') {
                targetTab = 'urlupload';
                inputField = document.getElementById('videoUrlInput');
                message = '✨ api.video에서 영상을 업로드한 후, Embed URL을 복사해서 아래에 붙여넣으세요!';
              } else if (platform === 'r2') {
                targetTab = 'urlupload';
                inputField = document.getElementById('videoUrlInput');
                message = '✨ R2에 파일을 업로드한 후, 공개 URL을 복사해서 아래에 붙여넣으세요!';
              } else if (platform === 'stream') {
                targetTab = 'stream';
                inputField = document.getElementById('streamVideoId');
                message = '✨ Cloudflare Stream에서 영상 업로드 후, Video ID를 복사해서 입력하세요!';
              }
              
              // 3. 해당 탭 활성화
              if (targetTab) {
                switchVideoTab(targetTab);
              }
              
              // 4. 입력 필드에 포커스
              if (inputField) {
                setTimeout(() => {
                  inputField.focus();
                  inputField.placeholder = message;
                  
                  // 5. 입력 필드 하이라이트 효과
                  inputField.classList.add('ring-4', 'ring-purple-300', 'ring-opacity-50');
                  
                  // 6. 안내 토스트 메시지 표시
                  showQuickUploadToast(platform, message);
                  
                  // 7. 붙여넣기 감지 및 자동 완료 메시지
                  inputField.addEventListener('paste', function pasteHandler(e) {
                    setTimeout(() => {
                      // 하이라이트 제거
                      inputField.classList.remove('ring-4', 'ring-purple-300', 'ring-opacity-50');
                      
                      // 성공 메시지
                      showSuccess('✅ URL이 입력되었습니다! 이제 저장 버튼을 눌러주세요.');
                      
                      // 이벤트 리스너 제거 (한 번만 실행)
                      inputField.removeEventListener('paste', pasteHandler);
                    }, 100);
                  }, { once: true });
                }, 500);
              }
            }
            
            /**
             * 빠른 업로드 토스트 메시지 표시
             */
            function showQuickUploadToast(platform, message) {
              // 기존 토스트 제거
              const existingToast = document.getElementById('quickUploadToast');
              if (existingToast) {
                existingToast.remove();
              }
              
              // 플랫폼별 색상
              const colors = {
                youtube: 'bg-red-600',
                apivideo: 'bg-purple-600',
                r2: 'bg-orange-500',
                stream: 'bg-blue-600'
              };
              
              const icons = {
                youtube: 'fab fa-youtube',
                apivideo: 'fas fa-video',
                r2: 'fas fa-database',
                stream: 'fas fa-cloud'
              };
              
              // 토스트 생성
              const toast = document.createElement('div');
              toast.id = 'quickUploadToast';
              toast.className = \`fixed top-20 right-4 \${colors[platform]} text-white px-6 py-4 rounded-lg shadow-2xl z-50 max-w-md animate-slide-in\`;
              toast.innerHTML = \`
                <div class="flex items-start">
                  <i class="\${icons[platform]} text-2xl mr-3 mt-1"></i>
                  <div>
                    <p class="font-bold text-sm mb-1">빠른 업로드 활성화</p>
                    <p class="text-xs opacity-90">\${message}</p>
                  </div>
                  <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              \`;
              
              document.body.appendChild(toast);
              
              // 10초 후 자동 제거
              setTimeout(() => {
                if (toast && toast.parentElement) {
                  toast.style.opacity = '0';
                  toast.style.transform = 'translateX(400px)';
                  setTimeout(() => toast.remove(), 300);
                }
              }, 10000);
            }
            
            /**
             * Stream Video ID 미리보기
             */
            const streamVideoIdInput = document.getElementById('streamVideoId');
            if (streamVideoIdInput) {
              streamVideoIdInput.addEventListener('input', function(e) {
                const videoId = e.target.value.trim();
                const preview = document.getElementById('streamPreview');
                const previewFrame = document.getElementById('streamPreviewFrame');
                
                if (videoId && videoId.length === 32) {
                  // Video ID 형식이 올바른 경우 (32자리)
                  const embedUrl = \`https://customer-2e8c2335c9dc802347fb23b9d608d4f4.cloudflarestream.com/\${videoId}/iframe?preload=true\`;
                  previewFrame.src = embedUrl;
                  preview.classList.remove('hidden');
                  
                  console.log('✅ Stream 미리보기 활성화:', videoId);
                } else {
                  // Video ID가 없거나 형식이 틀린 경우
                  preview.classList.add('hidden');
                  previewFrame.src = '';
                }
              });
            }
            
            /**
             * 탭 전환 함수 (Stream 탭 포함)
             */
            function switchVideoTab(tab) {
              console.log('🔄 탭 전환:', tab);
              
              // 모든 탭 버튼 비활성화
              document.querySelectorAll('.video-tab').forEach(btn => {
                btn.classList.remove('border-purple-600', 'text-purple-600', 'border-blue-600', 'text-blue-600', 'active');
                btn.classList.add('border-transparent', 'text-gray-500');
              });
              
              // 모든 탭 컨텐츠 숨기기
              document.querySelectorAll('.video-tab-content').forEach(content => {
                content.classList.add('hidden');
              });
              
              // 선택된 탭 활성화
              if (tab === 'youtube') {
                document.getElementById('youtubeTab').classList.remove('border-transparent', 'text-gray-500');
                document.getElementById('youtubeTab').classList.add('border-purple-600', 'text-purple-600', 'active');
                document.getElementById('youtubeTabContent').classList.remove('hidden');
              } else if (tab === 'stream') {
                document.getElementById('streamTab').classList.remove('border-transparent', 'text-gray-500');
                document.getElementById('streamTab').classList.add('border-blue-600', 'text-blue-600', 'active');
                document.getElementById('streamTabContent').classList.remove('hidden');
              } else if (tab === 'fileupload') {
                document.getElementById('fileUploadTab').classList.remove('border-transparent', 'text-gray-500');
                document.getElementById('fileUploadTab').classList.add('border-gray-700', 'text-gray-700', 'active');
                document.getElementById('fileUploadTabContent').classList.remove('hidden');
              } else if (tab === 'urlupload') {
                document.getElementById('urlUploadTab').classList.remove('border-transparent', 'text-gray-500');
                document.getElementById('urlUploadTab').classList.add('border-purple-600', 'text-purple-600', 'active');
                document.getElementById('urlUploadTabContent').classList.remove('hidden');
              }
            }
        </script>
        
        <style>
          @keyframes slide-in {
            from {
              transform: translateX(400px);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          
          .animate-slide-in {
            animation: slide-in 0.3s ease-out;
          }
        </style>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/js/auth.js?v=20260329-admin-name"></script>
        <script src="/static/js/admin-lessons.js"></script>
        <script src="/static/js/security.js${STATIC_JS_CACHE_QUERY}"></script>
    </body>
    </html>
  `)
})

/**
 * GET /admin/enrollments
 * 수강 관리 페이지
 */
pagesAdmin.get('/enrollments', (c) => {
  return c.redirect('/admin/dashboard#enrollments')
})

pagesAdmin.get('/videos', (c) => {
  return c.redirect('/admin/dashboard#videos')
})

pagesAdmin.get('/users/:userId/classroom', async (c) => {
  const userId = c.req.param('userId')
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>학생 내강의실 - 마인드스토리 LMS</title>
        <link rel="stylesheet" href="/static/css/app.css" />
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100">
        <!-- 관리자 헤더 -->
        <nav class="ms-admin-top-bar bg-purple-700 text-white shadow-lg">
            <div class="max-w-7xl mx-auto px-4 py-4">
                <div class="flex justify-between items-center">
                    <h1 class="text-2xl font-bold">
                        <i class="fas fa-chalkboard-teacher mr-2"></i>
                        학생 내강의실
                    </h1>
                    <div class="flex items-center space-x-4">
                        <span class="inline-flex items-center max-w-[min(14rem,55vw)]"><span id="adminName" class="text-purple-100 text-sm font-medium truncate" data-ms-name-default="text-purple-100 text-sm font-medium truncate">로딩중...</span></span>
                        <a href="/admin/users" class="bg-white text-purple-700 px-4 py-2 rounded hover:bg-gray-100">
                            <i class="fas fa-arrow-left mr-1"></i>회원 관리로
                        </a>
                    </div>
                </div>
            </div>
        </nav>

        <!-- 학생 정보 카드 -->
        <div class="max-w-7xl mx-auto px-4 py-8">
            <div class="bg-white rounded-lg shadow p-6 mb-6">
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="text-2xl font-bold text-gray-800 mb-2" id="studentName">로딩중...</h2>
                        <p class="text-gray-600" id="studentEmail">-</p>
                    </div>
                    <div class="text-right">
                        <div class="text-3xl font-bold text-purple-600" id="totalCourses">0</div>
                        <div class="text-gray-600">수강 중인 강좌</div>
                    </div>
                </div>
            </div>

            <!-- 탭 메뉴 -->
            <div class="bg-white rounded-lg shadow mb-6">
                <div class="flex border-b">
                    <button onclick="showTab('ongoing')" id="tab-ongoing" 
                            class="flex-1 px-6 py-4 text-center font-semibold border-b-2 border-purple-600 text-purple-600">
                        <i class="fas fa-play-circle mr-2"></i>수강 중
                    </button>
                    <button onclick="showTab('completed')" id="tab-completed" 
                            class="flex-1 px-6 py-4 text-center font-semibold text-gray-500 hover:text-gray-700">
                        <i class="fas fa-check-circle mr-2"></i>수강 완료
                    </button>
                    <button onclick="showTab('all')" id="tab-all" 
                            class="flex-1 px-6 py-4 text-center font-semibold text-gray-500 hover:text-gray-700">
                        <i class="fas fa-list mr-2"></i>전체
                    </button>
                </div>
            </div>

            <!-- 강좌 목록 -->
            <div id="courseList" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-spinner fa-spin text-4xl text-gray-400 mb-4"></i>
                    <p class="text-gray-500">로딩중...</p>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/js/auth.js?v=20260329-admin-name"></script>
        <script>
            const userId = ${userId};
            let currentTab = 'ongoing';
            let allEnrollments = [];

            document.addEventListener('DOMContentLoaded', async () => {
                const admin = await requireAdmin();
                if (!admin) return;
                if (typeof applyHeaderUserDisplay === 'function') {
                  applyHeaderUserDisplay(document.getElementById('adminName'), admin)
                }
                
                await loadStudentInfo();
                await loadEnrollments();
            });

            async function loadStudentInfo() {
                try {
                    const response = await axios.get(\`/api/admin/users/\${userId}\`, { withCredentials: true });
                    
                    if (response.data.success) {
                        const student = response.data.data;
                        document.getElementById('studentName').textContent = student.name;
                        document.getElementById('studentEmail').textContent = student.email;
                    }
                } catch (error) {
                    console.error('Failed to load student info:', error);
                }
            }

            async function loadEnrollments() {
                try {
                    const response = await axios.get(\`/api/admin/enrollments?user_id=\${userId}&limit=100\`, { withCredentials: true });
                    
                    if (response.data.success) {
                        allEnrollments = response.data.data;
                        document.getElementById('totalCourses').textContent = 
                            allEnrollments.filter(e => e.status === 'active').length;
                        renderEnrollments();
                    }
                } catch (error) {
                    console.error('Failed to load enrollments:', error);
                    document.getElementById('courseList').innerHTML = 
                        '<div class="col-span-full text-center py-12 text-red-500">수강 목록을 불러오는데 실패했습니다.</div>';
                }
            }

            function showTab(tab) {
                currentTab = tab;
                
                // 탭 스타일 업데이트
                document.querySelectorAll('[id^="tab-"]').forEach(btn => {
                    btn.classList.remove('border-purple-600', 'text-purple-600');
                    btn.classList.add('text-gray-500');
                });
                document.getElementById(\`tab-\${tab}\`).classList.add('border-purple-600', 'text-purple-600');
                document.getElementById(\`tab-\${tab}\`).classList.remove('text-gray-500');
                
                renderEnrollments();
            }

            function renderEnrollments() {
                let filtered = allEnrollments;
                
                if (currentTab === 'ongoing') {
                    filtered = allEnrollments.filter(e => e.status === 'active');
                } else if (currentTab === 'completed') {
                    filtered = allEnrollments.filter(e => e.status === 'completed');
                }
                
                const container = document.getElementById('courseList');
                
                if (filtered.length === 0) {
                    let message = '수강 중인 강좌가 없습니다.';
                    if (currentTab === 'completed') message = '수강 완료된 강좌가 없습니다.';
                    if (currentTab === 'all') message = '등록된 강좌가 없습니다.';
                    
                    container.innerHTML = \`
                        <div class="col-span-full text-center py-12">
                            <i class="fas fa-graduation-cap text-6xl text-gray-300 mb-4"></i>
                            <p class="text-gray-500 text-lg">\${message}</p>
                        </div>
                    \`;
                    return;
                }
                
                container.innerHTML = filtered.map(enrollment => \`
                    <div class="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden">
                        <div class="relative">
                            <img src="\${enrollment.course_thumbnail || '/static/images/course-placeholder.svg'}" 
                                 alt="\${enrollment.course_title}"
                                 class="w-full h-48 object-cover"
                                 onerror="this.src='/static/images/course-placeholder.svg'">
                            <div class="absolute top-2 right-2">
                                <span class="px-3 py-1 rounded-full text-xs font-semibold \${getStatusBadgeClass(enrollment.status)}">
                                    \${getStatusText(enrollment.status)}
                                </span>
                            </div>
                        </div>
                        
                        <div class="p-6">
                            <h3 class="text-lg font-bold text-gray-800 mb-2 line-clamp-2">
                                \${enrollment.course_title}
                            </h3>
                            
                            <!-- 진도율 -->
                            <div class="mb-4">
                                <div class="flex justify-between text-sm text-gray-600 mb-1">
                                    <span>학습 진도</span>
                                    <span class="font-semibold">\${enrollment.progress || 0}%</span>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-2">
                                    <div class="bg-purple-600 h-2 rounded-full transition-all" 
                                         style="width: \${enrollment.progress || 0}%"></div>
                                </div>
                            </div>
                            
                            <!-- 정보 -->
                            <div class="space-y-2 text-sm text-gray-600 mb-4">
                                <div class="flex items-center">
                                    <i class="fas fa-calendar-check w-5 mr-2"></i>
                                    <span>수강 시작: \${formatDate(enrollment.enrolled_at)}</span>
                                </div>
                                \${enrollment.completed_at ? \`
                                    <div class="flex items-center text-green-600">
                                        <i class="fas fa-check-circle w-5 mr-2"></i>
                                        <span>수료: \${formatDate(enrollment.completed_at)}</span>
                                    </div>
                                \` : ''}
                                \${enrollment.expires_at ? \`
                                    <div class="flex items-center">
                                        <i class="fas fa-clock w-5 mr-2"></i>
                                        <span>만료: \${formatDate(enrollment.expires_at)}</span>
                                    </div>
                                \` : ''}
                            </div>
                            
                            <!-- 액션 버튼 -->
                            <div class="flex gap-2">
                                <a href="/courses/\${enrollment.course_id}" 
                                   class="flex-1 bg-purple-600 text-white px-4 py-2 rounded text-center hover:bg-purple-700 transition">
                                    <i class="fas fa-eye mr-1"></i>강좌 보기
                                </a>
                                <a href="/admin/enrollments" 
                                   class="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition"
                                   title="수강 관리">
                                    <i class="fas fa-cog"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                \`).join('');
            }

            function getStatusBadgeClass(status) {
                const classes = {
                    active: 'bg-green-100 text-green-800',
                    completed: 'bg-blue-100 text-blue-800',
                    expired: 'bg-red-100 text-red-800',
                    refunded: 'bg-gray-100 text-gray-800'
                };
                return classes[status] || 'bg-gray-100 text-gray-800';
            }

            function getStatusText(status) {
                const texts = {
                    active: '수강 중',
                    completed: '수료',
                    expired: '기간 만료',
                    refunded: '환불'
                };
                return texts[status] || status;
            }

            function formatDate(dateString) {
                if (!dateString) return '-';
                const date = new Date(dateString);
                return date.toLocaleDateString('ko-KR');
            }
        </script>
        <script src="/static/js/security.js${STATIC_JS_CACHE_QUERY}"></script>
    </body>
    </html>
  `)
})

/**
 * GET /admin/users/:userId
 * 관리자용 회원 상세 페이지
 */
pagesAdmin.get('/users/:userId', async (c) => {
  const userId = c.req.param('userId')
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>회원 상세 - 마인드스토리 LMS</title>
        <link rel="stylesheet" href="/static/css/app.css" />
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100">
        <!-- 관리자 헤더 -->
        <nav class="ms-admin-top-bar bg-purple-700 text-white shadow-lg">
            <div class="max-w-7xl mx-auto px-4 py-4">
                <div class="flex justify-between items-center">
                    <h1 class="text-2xl font-bold">
                        <i class="fas fa-user-circle mr-2"></i>
                        회원 상세
                    </h1>
                    <div class="flex items-center space-x-4">
                        <span class="inline-flex items-center max-w-[min(14rem,55vw)]"><span id="adminName" class="text-purple-100 text-sm font-medium truncate" data-ms-name-default="text-purple-100 text-sm font-medium truncate">로딩중...</span></span>
                        <a href="/admin/users" class="bg-white text-purple-700 px-4 py-2 rounded hover:bg-gray-100">
                            <i class="fas fa-arrow-left mr-1"></i>회원 관리로
                        </a>
                    </div>
                </div>
            </div>
        </nav>

        <!-- 메인 콘텐츠 -->
        <div class="max-w-7xl mx-auto px-4 py-8">
            <!-- 회원 기본 정보 카드 -->
            <div class="bg-white rounded-lg shadow-lg p-8 mb-6">
                <div class="flex items-start justify-between mb-6">
                    <div>
                        <h2 class="text-3xl font-bold text-gray-800 mb-2" id="userName">로딩중...</h2>
                        <p class="text-gray-600 text-lg" id="userEmail">-</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="resetPassword(${userId}, document.getElementById('userName').textContent)" 
                                class="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600">
                            <i class="fas fa-key mr-2"></i>비밀번호 초기화
                        </button>
                        <a href="/admin/users/${userId}/classroom" 
                           class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                            <i class="fas fa-chalkboard-teacher mr-2"></i>내강의실 보기
                        </a>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <!-- 통계 카드 -->
                    <div class="bg-blue-50 rounded-lg p-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-600 mb-1">수강 중</p>
                                <p class="text-2xl font-bold text-blue-600" id="activeEnrollments">0</p>
                            </div>
                            <i class="fas fa-book-reader text-blue-300 text-3xl"></i>
                        </div>
                    </div>
                    
                    <div class="bg-green-50 rounded-lg p-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-600 mb-1">수강 완료</p>
                                <p class="text-2xl font-bold text-green-600" id="completedEnrollments">0</p>
                            </div>
                            <i class="fas fa-check-circle text-green-300 text-3xl"></i>
                        </div>
                    </div>
                    
                    <div class="bg-purple-50 rounded-lg p-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-600 mb-1">총 결제</p>
                                <p class="text-2xl font-bold text-purple-600" id="totalPayments">0</p>
                            </div>
                            <i class="fas fa-credit-card text-purple-300 text-3xl"></i>
                        </div>
                    </div>
                    
                    <div class="bg-orange-50 rounded-lg p-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-600 mb-1">총 결제액</p>
                                <p class="text-xl font-bold text-orange-600" id="totalPaid">0원</p>
                            </div>
                            <i class="fas fa-won-sign text-orange-300 text-3xl"></i>
                        </div>
                    </div>
                </div>

                <!-- 상세 정보 -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-4">
                        <h3 class="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                            <i class="fas fa-info-circle mr-2"></i>기본 정보
                        </h3>
                        <div class="flex items-center">
                            <span class="text-gray-600 w-32">회원번호:</span>
                            <span class="font-semibold" id="userId">-</span>
                        </div>
                        <div class="flex items-center">
                            <span class="text-gray-600 w-32">이메일:</span>
                            <span class="font-semibold" id="userEmailDetail">-</span>
                        </div>
                        <div class="flex items-center">
                            <span class="text-gray-600 w-32">전화번호:</span>
                            <span class="font-semibold" id="userPhone">-</span>
                            <span id="phoneVerifiedBadge"></span>
                        </div>
                        <div class="flex items-center">
                            <span class="text-gray-600 w-32">생년월일:</span>
                            <span class="font-semibold" id="userBirthDate">-</span>
                        </div>
                        <div class="flex items-center">
                            <span class="text-gray-600 w-32">권한:</span>
                            <span id="userRoleBadge"></span>
                        </div>
                        <div class="flex items-center">
                            <span class="text-gray-600 w-32">상태:</span>
                            <span id="userStatusBadge"></span>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <h3 class="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                            <i class="fas fa-calendar-alt mr-2"></i>활동 정보
                        </h3>
                        <div class="flex items-center">
                            <span class="text-gray-600 w-32">가입일:</span>
                            <span class="font-semibold" id="createdAt">-</span>
                        </div>
                        <div class="flex items-center">
                            <span class="text-gray-600 w-32">최근 로그인:</span>
                            <span class="font-semibold" id="lastLoginAt">-</span>
                        </div>
                        <div class="flex items-center">
                            <span class="text-gray-600 w-32">최근 결제:</span>
                            <span class="font-semibold" id="lastPaymentDate">-</span>
                        </div>
                        
                        <h3 class="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 mt-6">
                            <i class="fas fa-check-square mr-2"></i>약관 동의
                        </h3>
                        <div class="flex items-center">
                            <span class="text-gray-600 w-32">이용약관:</span>
                            <span id="termsAgreed"></span>
                        </div>
                        <div class="flex items-center">
                            <span class="text-gray-600 w-32">개인정보:</span>
                            <span id="privacyAgreed"></span>
                        </div>
                        <div class="flex items-center">
                            <span class="text-gray-600 w-32">마케팅:</span>
                            <span id="marketingAgreed"></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/js/auth.js?v=20260329-admin-name"></script>
        <script>
            const userId = ${userId};

            document.addEventListener('DOMContentLoaded', async () => {
                const admin = await requireAdmin();
                if (!admin) return;
                if (typeof applyHeaderUserDisplay === 'function') {
                  applyHeaderUserDisplay(document.getElementById('adminName'), admin)
                }
                
                await loadUserDetail();
            });

            async function loadUserDetail() {
                try {
                    const response = await axios.get(\`/api/admin/users/\${userId}\`, { withCredentials: true });
                    
                    if (response.data.success) {
                        const user = response.data.data;
                        renderUserDetail(user);
                    }
                } catch (error) {
                    console.error('Failed to load user detail:', error);
                    alert('회원 정보를 불러오는데 실패했습니다.');
                }
            }

            function renderUserDetail(user) {
                // 기본 정보
                document.getElementById('userName').textContent = user.name;
                document.getElementById('userEmail').textContent = user.email;
                document.getElementById('userId').textContent = user.id;
                document.getElementById('userEmailDetail').textContent = user.email;
                document.getElementById('userPhone').textContent = user.phone || '-';
                document.getElementById('userBirthDate').textContent = user.birth_date || '-';
                
                // 통계
                document.getElementById('activeEnrollments').textContent = user.enrollments.active_enrollments || 0;
                document.getElementById('completedEnrollments').textContent = user.enrollments.completed_enrollments || 0;
                document.getElementById('totalPayments').textContent = user.payments.total_payments || 0;
                document.getElementById('totalPaid').textContent = 
                    new Intl.NumberFormat('ko-KR').format(user.payments.total_paid || 0) + '원';
                
                // 배지
                const roleBadgeClass = user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800';
                const roleText = user.role === 'admin' ? '관리자' : '학생';
                document.getElementById('userRoleBadge').innerHTML = 
                    \`<span class="px-3 py-1 rounded-full text-sm font-semibold \${roleBadgeClass}">\${roleText}</span>\`;
                
                const statusBadgeClass = user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
                const statusText = user.status === 'active' ? '활성' : '비활성';
                document.getElementById('userStatusBadge').innerHTML = 
                    \`<span class="px-3 py-1 rounded-full text-sm font-semibold \${statusBadgeClass}">\${statusText}</span>\`;
                
                if (user.phone_verified) {
                    document.getElementById('phoneVerifiedBadge').innerHTML = 
                        '<span class="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs"><i class="fas fa-check mr-1"></i>인증완료</span>';
                }
                
                // 날짜
                document.getElementById('createdAt').textContent = formatDate(user.created_at);
                document.getElementById('lastLoginAt').textContent = formatDate(user.last_login_at);
                document.getElementById('lastPaymentDate').textContent = formatDate(user.payments.last_payment_date);
                
                // 약관 동의
                document.getElementById('termsAgreed').innerHTML = getBooleanBadge(user.terms_agreed);
                document.getElementById('privacyAgreed').innerHTML = getBooleanBadge(user.privacy_agreed);
                document.getElementById('marketingAgreed').innerHTML = getBooleanBadge(user.marketing_agreed);
            }

            function getBooleanBadge(value) {
                if (value === 1) {
                    return '<span class="text-green-600"><i class="fas fa-check-circle mr-1"></i>동의</span>';
                }
                return '<span class="text-gray-400"><i class="fas fa-times-circle mr-1"></i>미동의</span>';
            }

            function formatDate(dateString) {
                if (!dateString) return '-';
                const date = new Date(dateString);
                return date.toLocaleDateString('ko-KR') + ' ' + date.toLocaleTimeString('ko-KR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
            }

            // 비밀번호 초기화 함수
            async function resetPassword(userId, userName) {
                const selected = confirm(\`\${userName} 님의 비밀번호를 초기화하시겠습니까?\n\n확인: 수동 초기화 (password123)\n취소: AI 자동 생성\`);
                const mode = selected ? 'manual' : 'ai';
                
                try {
                    const response = await axios.post(
                        \`/api/admin/users/\${userId}/reset-password\`,
                        { mode },
                        { withCredentials: true }
                    );
                    
                    if (response.data.success) {
                        const newPassword = response.data.data.new_password;
                        
                        // 비밀번호 표시 모달
                        const modalHtml = \`
                            <div id="passwordModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                                    <div class="text-center mb-6">
                                        <div class="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                            <i class="fas fa-check text-green-600 text-3xl"></i>
                                        </div>
                                        <h2 class="text-2xl font-bold text-gray-900 mb-2">비밀번호 초기화 완료</h2>
                                        <p class="text-gray-600">\${userName} 님의 새 비밀번호</p>
                                    </div>
                                    
                                    <div class="bg-gray-50 rounded-lg p-4 mb-6">
                                        <div class="flex items-center justify-between">
                                            <code class="text-2xl font-mono font-bold text-purple-600">\${newPassword}</code>
                                            <button onclick="copyPassword('\${newPassword}')" 
                                                    class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
                                                <i class="fas fa-copy mr-2"></i>복사
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <button onclick="closePasswordModal()" 
                                            class="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">
                                        닫기
                                    </button>
                                </div>
                            </div>
                        \`;
                        
                        document.body.insertAdjacentHTML('beforeend', modalHtml);
                    }
                } catch (error) {
                    console.error('Password reset error:', error);
                    alert('비밀번호 초기화에 실패했습니다.');
                }
            }

            function copyPassword(password) {
                navigator.clipboard.writeText(password).then(() => {
                    alert('비밀번호가 클립보드에 복사되었습니다!');
                });
            }

            function closePasswordModal() {
                document.getElementById('passwordModal').remove();
            }
        </script>
        <script src="/static/js/security.js${STATIC_JS_CACHE_QUERY}"></script>
    </body>
    </html>
  `)
})

export default pagesAdmin
