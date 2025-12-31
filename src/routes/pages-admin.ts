/**
 * 관리자 페이지 라우트
 * /admin/*
 */

import { Hono } from 'hono'
import { Bindings } from '../types/database'

const pagesAdmin = new Hono<{ Bindings: Bindings }>()

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
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>관리자 대시보드 - 마인드스토리 LMS</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/style.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100">
        <!-- 관리자 헤더 -->
        <nav class="bg-purple-700 text-white shadow-lg">
            <div class="max-w-7xl mx-auto px-4 py-4">
                <div class="flex justify-between items-center">
                    <h1 class="text-2xl font-bold">
                        <i class="fas fa-tachometer-alt mr-2"></i>
                        관리자 대시보드
                    </h1>
                    <div class="flex items-center space-x-4">
                        <a href="/" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors">
                            <i class="fas fa-users mr-1"></i>수강생 모드
                        </a>
                        <span id="adminName">로딩중...</span>
                        <button onclick="logout()" class="bg-white text-purple-700 px-4 py-2 rounded hover:bg-gray-100">
                            <i class="fas fa-sign-out-alt mr-1"></i>로그아웃
                        </button>
                    </div>
                </div>
            </div>
        </nav>

        <!-- 관리자 메뉴 -->
        <div class="bg-white shadow-md">
            <div class="max-w-7xl mx-auto px-4">
                <div class="flex space-x-1">
                    <a href="/admin/dashboard" class="px-4 py-3 bg-purple-100 text-purple-700 font-semibold border-b-2 border-purple-700">
                        <i class="fas fa-home mr-1"></i>대시보드
                    </a>
                    <a href="/admin/courses" class="px-4 py-3 text-gray-600 hover:bg-gray-100">
                        <i class="fas fa-book mr-1"></i>강좌 관리
                    </a>
                    <a href="/admin/users" class="px-4 py-3 text-gray-600 hover:bg-gray-100">
                        <i class="fas fa-users mr-1"></i>회원 관리
                    </a>
                    <a href="/admin/payments" class="px-4 py-3 text-gray-600 hover:bg-gray-100">
                        <i class="fas fa-credit-card mr-1"></i>결제 관리
                    </a>
                    <a href="/admin/popups" class="px-4 py-3 text-gray-600 hover:bg-gray-100">
                        <i class="fas fa-bell mr-1"></i>팝업 관리
                    </a>
                    <a href="/admin/settings" class="px-4 py-3 text-gray-600 hover:bg-gray-100">
                        <i class="fas fa-cog mr-1"></i>설정
                    </a>
                </div>
            </div>
        </div>

        <!-- 메인 콘텐츠 -->
        <div class="max-w-7xl mx-auto px-4 py-8">
            <!-- 통계 카드 -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-sm">총 회원수</p>
                            <p class="text-3xl font-bold text-purple-700" id="totalUsers">0</p>
                        </div>
                        <div class="bg-purple-100 rounded-full p-4">
                            <i class="fas fa-users text-purple-700 text-2xl"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-sm">총 강좌수</p>
                            <p class="text-3xl font-bold text-blue-700" id="totalCourses">0</p>
                        </div>
                        <div class="bg-blue-100 rounded-full p-4">
                            <i class="fas fa-book text-blue-700 text-2xl"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-sm">이번 달 매출</p>
                            <p class="text-3xl font-bold text-green-700" id="monthlyRevenue">0원</p>
                        </div>
                        <div class="bg-green-100 rounded-full p-4">
                            <i class="fas fa-won-sign text-green-700 text-2xl"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-sm">활성 수강생</p>
                            <p class="text-3xl font-bold text-orange-700" id="activeEnrollments">0</p>
                        </div>
                        <div class="bg-orange-100 rounded-full p-4">
                            <i class="fas fa-graduation-cap text-orange-700 text-2xl"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 최근 활동 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- 최근 결제 -->
                <div class="bg-white rounded-lg shadow">
                    <div class="p-6 border-b">
                        <h2 class="text-xl font-bold text-gray-800">
                            <i class="fas fa-credit-card mr-2"></i>최근 결제
                        </h2>
                    </div>
                    <div class="p-6">
                        <div id="recentPayments" class="space-y-4">
                            <p class="text-gray-500 text-center py-4">로딩중...</p>
                        </div>
                    </div>
                </div>

                <!-- 최근 수강신청 -->
                <div class="bg-white rounded-lg shadow">
                    <div class="p-6 border-b">
                        <h2 class="text-xl font-bold text-gray-800">
                            <i class="fas fa-graduation-cap mr-2"></i>최근 수강신청
                        </h2>
                    </div>
                    <div class="p-6">
                        <div id="recentEnrollments" class="space-y-4">
                            <p class="text-gray-500 text-center py-4">로딩중...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/js/auth.js"></script>
        <script src="/static/js/admin-dashboard.js"></script>
    </body>
    </html>
  `)
})

/**
 * GET /admin/courses
 * 강좌 관리 페이지
 */
pagesAdmin.get('/courses', async (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>강좌 관리 - 마인드스토리 LMS</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/style.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100">
        <!-- 관리자 헤더 -->
        <nav class="bg-purple-700 text-white shadow-lg">
            <div class="max-w-7xl mx-auto px-4 py-4">
                <div class="flex justify-between items-center">
                    <h1 class="text-2xl font-bold">
                        <i class="fas fa-book mr-2"></i>
                        강좌 관리
                    </h1>
                    <div class="flex items-center space-x-4">
                        <a href="/" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors">
                            <i class="fas fa-users mr-1"></i>수강생 모드
                        </a>
                        <span id="adminName">로딩중...</span>
                        <button onclick="logout()" class="bg-white text-purple-700 px-4 py-2 rounded hover:bg-gray-100">
                            <i class="fas fa-sign-out-alt mr-1"></i>로그아웃
                        </button>
                    </div>
                </div>
            </div>
        </nav>

        <!-- 관리자 메뉴 -->
        <div class="bg-white shadow-md">
            <div class="max-w-7xl mx-auto px-4">
                <div class="flex space-x-1">
                    <a href="/admin/dashboard" class="px-4 py-3 text-gray-600 hover:bg-gray-100">
                        <i class="fas fa-home mr-1"></i>대시보드
                    </a>
                    <a href="/admin/courses" class="px-4 py-3 bg-purple-100 text-purple-700 font-semibold border-b-2 border-purple-700">
                        <i class="fas fa-book mr-1"></i>강좌 관리
                    </a>
                    <a href="/admin/users" class="px-4 py-3 text-gray-600 hover:bg-gray-100">
                        <i class="fas fa-users mr-1"></i>회원 관리
                    </a>
                    <a href="/admin/payments" class="px-4 py-3 text-gray-600 hover:bg-gray-100">
                        <i class="fas fa-credit-card mr-1"></i>결제 관리
                    </a>
                    <a href="/admin/popups" class="px-4 py-3 text-gray-600 hover:bg-gray-100">
                        <i class="fas fa-bell mr-1"></i>팝업 관리
                    </a>
                    <a href="/admin/settings" class="px-4 py-3 text-gray-600 hover:bg-gray-100">
                        <i class="fas fa-cog mr-1"></i>설정
                    </a>
                </div>
            </div>
        </div>

        <!-- 메인 콘텐츠 -->
        <div class="max-w-7xl mx-auto px-4 py-8">
            <!-- 상단 액션 바 -->
            <div class="bg-white rounded-lg shadow p-6 mb-6">
                <div class="flex justify-between items-center">
                    <div class="flex space-x-4">
                        <input type="text" id="searchInput" placeholder="강좌 검색..." 
                            class="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <select id="statusFilter" class="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                            <option value="">전체 상태</option>
                            <option value="active">활성</option>
                            <option value="inactive">비활성</option>
                            <option value="draft">임시저장</option>
                        </select>
                    </div>
                    <button onclick="openNewCourseModal()" class="bg-purple-700 text-white px-6 py-2 rounded-lg hover:bg-purple-800">
                        <i class="fas fa-plus mr-2"></i>새 강좌 등록
                    </button>
                    <button onclick="openAIAssistantModal()" class="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700">
                        <i class="fas fa-robot mr-2"></i>AI 도우미
                    </button>
                </div>
            </div>

            <!-- 강좌 목록 -->
            <div class="bg-white rounded-lg shadow">
                <div class="p-6">
                    <table class="w-full">
                        <thead>
                            <tr class="border-b">
                                <th class="text-left py-3 px-4">강좌명</th>
                                <th class="text-left py-3 px-4">가격</th>
                                <th class="text-left py-3 px-4">수강생</th>
                                <th class="text-left py-3 px-4">상태</th>
                                <th class="text-left py-3 px-4">등록일</th>
                                <th class="text-center py-3 px-4">관리</th>
                            </tr>
                        </thead>
                        <tbody id="courseList">
                            <tr>
                                <td colspan="6" class="text-center py-8 text-gray-500">
                                    <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                                    <p>로딩중...</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- 강좌 등록/수정 모달 -->
        <div id="courseModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
            <div id="courseModalContent" class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" style="position: relative;">
                <div id="modalHeader" class="p-6 border-b flex justify-between items-center cursor-move bg-purple-50">
                    <h2 class="text-2xl font-bold text-gray-800">
                        <i class="fas fa-edit mr-2"></i><span id="modalTitle">새 강좌 등록</span>
                        <span class="text-sm text-gray-500 ml-2">(드래그하여 이동 가능)</span>
                    </h2>
                    <button onclick="closeCourseModal()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                <form id="courseForm" class="p-6 space-y-6">
                    <input type="hidden" id="courseId">
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- 강좌명 -->
                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                강좌명 <span class="text-red-500">*</span>
                            </label>
                            <input type="text" id="courseTitle" required
                                class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                        </div>

                        <!-- 설명 -->
                        <div class="md:col-span-2">
                            <div class="flex justify-between items-center mb-2">
                                <label class="block text-sm font-medium text-gray-700">
                                    강좌 설명 <span class="text-red-500">*</span>
                                </label>
                                <button type="button" onclick="generateDescription()" 
                                    class="text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all">
                                    <i class="fas fa-magic mr-1"></i>AI로 설명 생성
                                </button>
                            </div>
                            <textarea id="courseDescription" rows="4" required placeholder="강좌에 대한 설명을 입력하거나 AI로 생성하세요..."
                                class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"></textarea>
                        </div>

                        <!-- 썸네일 URL 또는 파일 업로드 -->
                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                썸네일 이미지
                            </label>
                            
                            <!-- 탭 선택 -->
                            <div class="flex border-b mb-4">
                                <button type="button" id="videoTab" onclick="switchImageTab('video')" 
                                    class="px-4 py-2 border-b-2 border-purple-700 text-purple-700 font-semibold">
                                    <i class="fas fa-video mr-1"></i>동영상 썸네일
                                </button>
                                <button type="button" id="urlTab" onclick="switchImageTab('url')" 
                                    class="px-4 py-2 text-gray-600">
                                    <i class="fas fa-link mr-1"></i>URL 입력
                                </button>
                                <button type="button" id="uploadTab" onclick="switchImageTab('upload')" 
                                    class="px-4 py-2 text-gray-600">
                                    <i class="fas fa-upload mr-1"></i>파일 업로드
                                </button>
                            </div>

                            <!-- 동영상 썸네일 추출 -->
                            <div id="videoSection">
                                <div class="space-y-3">
                                    <p class="text-sm text-gray-600">
                                        <i class="fas fa-info-circle text-purple-600 mr-1"></i>
                                        강좌의 첫 번째 차시 영상에서 자동으로 썸네일을 추출합니다.
                                    </p>
                                    <button type="button" onclick="extractVideoThumbnail()" 
                                        class="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all">
                                        <i class="fas fa-magic mr-2"></i>동영상에서 썸네일 자동 추출
                                    </button>
                                    <div id="videoThumbnailProgress" class="hidden">
                                        <div class="w-full bg-gray-200 rounded-full h-2">
                                            <div id="videoThumbnailProgressBar" class="bg-purple-700 h-2 rounded-full transition-all" style="width: 0%"></div>
                                        </div>
                                        <p class="text-sm text-gray-500 mt-1 text-center">
                                            <i class="fas fa-spinner fa-spin mr-1"></i>썸네일 추출 중...
                                        </p>
                                    </div>
                                    <p class="text-sm text-gray-500">
                                        💡 <strong>팁:</strong> 영상이 업로드된 후에 사용하세요. 
                                        추출된 썸네일은 자동으로 저장됩니다.
                                    </p>
                                </div>
                            </div>

                            <!-- URL 입력 -->
                            <div id="urlSection" class="hidden">
                                <input type="url" id="courseThumbnail" placeholder="https://..."
                                    oninput="previewThumbnailUrl(this.value)"
                                    class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                                <p class="text-sm text-gray-500 mt-1">
                                    <i class="fas fa-info-circle text-purple-600"></i>
                                    Unsplash, Pexels 등 무료 이미지 사이트의 URL을 입력하세요
                                </p>
                                <p class="text-xs text-gray-400 mt-1">
                                    예시: https://images.unsplash.com/photo-1234567890...
                                </p>
                            </div>

                            <!-- 파일 업로드 -->
                            <div id="uploadSection" class="hidden">
                                <div class="flex items-center space-x-4">
                                    <input type="file" id="courseThumbnailFile" accept="image/*"
                                        class="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                                    <button type="button" onclick="uploadImage()" 
                                        class="bg-purple-700 text-white px-4 py-2 rounded-lg hover:bg-purple-800">
                                        <i class="fas fa-upload mr-2"></i>업로드
                                    </button>
                                </div>
                                <p class="text-sm text-gray-500 mt-1">* JPG, PNG, GIF, WebP (최대 5MB)</p>
                                <div id="uploadProgress" class="hidden mt-2">
                                    <div class="w-full bg-gray-200 rounded-full h-2">
                                        <div id="uploadProgressBar" class="bg-purple-700 h-2 rounded-full" style="width: 0%"></div>
                                    </div>
                                    <p class="text-sm text-gray-500 mt-1">업로드 중...</p>
                                </div>
                            </div>

                            <!-- 미리보기 -->
                            <div id="thumbnailPreview" class="mt-4 hidden">
                                <img id="previewImage" src="" alt="미리보기" class="w-full h-48 object-cover rounded-lg">
                            </div>
                        </div>

                        <!-- 강좌 유형 -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                강좌 유형
                            </label>
                            <select id="courseType"
                                class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                                <option value="general">일반 과정</option>
                                <option value="certificate">수료증 과정</option>
                            </select>
                        </div>

                        <!-- 수강 기간 -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                수강 기간 (일)
                            </label>
                            <input type="number" id="courseDuration" min="1" value="30"
                                class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                        </div>

                        <!-- 가격 -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                정가 (원)
                            </label>
                            <input type="number" id="coursePrice" min="0" step="1000"
                                class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                        </div>

                        <!-- 할인가 -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                할인가 (원)
                            </label>
                            <input type="number" id="courseDiscountPrice" min="0" step="1000"
                                class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                        </div>

                        <!-- 무료 강좌 -->
                        <div class="md:col-span-2">
                            <label class="flex items-center">
                                <input type="checkbox" id="courseIsFree" class="mr-2">
                                <span class="text-sm font-medium text-gray-700">무료 강좌</span>
                            </label>
                        </div>

                        <!-- 메인 노출 -->
                        <div class="md:col-span-2">
                            <label class="flex items-center">
                                <input type="checkbox" id="courseIsFeatured" class="mr-2">
                                <span class="text-sm font-medium text-gray-700">메인 페이지에 노출</span>
                            </label>
                        </div>

                        <!-- 상태 -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                상태
                            </label>
                            <select id="courseStatus"
                                class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                                <option value="active">활성</option>
                                <option value="inactive">비활성</option>
                                <option value="draft">임시저장</option>
                            </select>
                        </div>

                        <!-- 차시 목록 미리보기 (수정 모드에서만 표시) -->
                        <div id="lessonPreviewSection" class="md:col-span-2 hidden">
                            <div class="border-t pt-6">
                                <div class="flex justify-between items-center mb-4">
                                    <label class="block text-lg font-semibold text-gray-800">
                                        <i class="fas fa-list-ol mr-2 text-purple-600"></i>차시 목록
                                    </label>
                                    <button type="button" onclick="refreshLessonPreview()" class="text-blue-600 hover:text-blue-800 text-sm">
                                        <i class="fas fa-sync-alt mr-1"></i>새로고침
                                    </button>
                                </div>
                                
                                <div id="lessonPreviewList" class="space-y-2 max-h-64 overflow-y-auto bg-gray-50 rounded-lg p-4">
                                    <!-- 차시 목록이 여기에 표시됩니다 -->
                                    <div class="text-center text-gray-500 py-4">
                                        <i class="fas fa-spinner fa-spin mr-2"></i>로딩 중...
                                    </div>
                                </div>

                                <div class="mt-4 flex justify-between items-center text-sm">
                                    <span class="text-gray-600">
                                        총 <strong id="previewLessonCount" class="text-purple-600">0</strong>개 차시
                                    </span>
                                    <button type="button" onclick="goToLessonManagement()" 
                                        class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                                        <i class="fas fa-list-ul mr-2"></i>차시 관리 페이지로 이동
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="flex justify-end space-x-4 pt-6 border-t">
                        <button type="button" onclick="closeCourseModal()"
                            class="px-6 py-2 border rounded-lg hover:bg-gray-100">
                            취소
                        </button>
                        <button type="submit"
                            class="px-6 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-800">
                            <i class="fas fa-save mr-2"></i>저장
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- AI 도우미 모달 -->
        <div id="aiAssistantModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
            <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
                <div class="p-6 border-b flex justify-between items-center bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-lg">
                    <h2 class="text-2xl font-bold">
                        <i class="fas fa-robot mr-2"></i>AI 강좌 생성 도우미
                    </h2>
                    <button onclick="closeAIAssistantModal()" class="text-white hover:text-gray-200">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                <div class="p-6">
                    <div class="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                        <div class="flex items-start">
                            <i class="fas fa-info-circle text-purple-600 mt-1 mr-3"></i>
                            <div class="text-sm text-gray-700">
                                <p class="font-semibold mb-1">AI가 강좌를 자동으로 기획해드립니다!</p>
                                <ul class="list-disc list-inside space-y-1 text-gray-600">
                                    <li>주제만 입력하면 강좌 제목, 설명, 차시 구성을 자동 생성</li>
                                    <li>생성된 내용은 수정 가능합니다</li>
                                    <li>OpenAI API 키가 필요합니다 (GenSpark API Keys 탭에서 설정)</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    <form id="aiAssistantForm" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                강좌 주제 <span class="text-red-500">*</span>
                            </label>
                            <input type="text" id="aiTopic" required placeholder="예: 파이썬 기초, 디지털 마케팅, 리더십 코칭"
                                class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                대상 (선택)
                            </label>
                            <input type="text" id="aiTargetAudience" placeholder="예: 직장인, 대학생, 초보자"
                                class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">난이도</label>
                            <select id="aiDifficulty"
                                class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                                <option value="beginner">초급</option>
                                <option value="intermediate">중급</option>
                                <option value="advanced">고급</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">수강 기간 (일)</label>
                            <input type="number" id="aiDuration" min="1" value="30"
                                class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                        </div>
                        <div class="flex justify-end space-x-4 pt-6 border-t">
                            <button type="button" onclick="closeAIAssistantModal()"
                                class="px-6 py-2 border rounded-lg hover:bg-gray-100">취소</button>
                            <button type="submit" id="aiGenerateBtn"
                                class="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700">
                                <i class="fas fa-magic mr-2"></i>AI로 생성하기
                            </button>
                        </div>
                    </form>
                    <div id="aiGenerating" class="hidden text-center py-8">
                        <i class="fas fa-robot fa-3x text-purple-600 mb-4 animate-pulse"></i>
                        <p class="text-lg font-semibold text-gray-800 mb-2">AI가 강좌를 생성하고 있습니다...</p>
                        <p class="text-sm text-gray-600">잠시만 기다려주세요 (약 10~20초 소요)</p>
                    </div>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/js/auth.js"></script>
        <script src="/static/js/admin-courses.js"></script>
        <script src="/static/js/admin-courses-drag.js"></script>
    </body>
    </html>
  `)
})

/**
 * GET /admin/users
 * 회원 관리 페이지
 */
pagesAdmin.get('/users', async (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>회원 관리 - 마인드스토리 LMS</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100">
        <!-- 관리자 헤더 -->
        <nav class="bg-purple-700 text-white shadow-lg">
            <div class="max-w-7xl mx-auto px-4 py-4">
                <div class="flex justify-between items-center">
                    <h1 class="text-2xl font-bold">
                        <i class="fas fa-users mr-2"></i>
                        회원 관리
                    </h1>
                    <div class="flex items-center space-x-4">
                        <span id="adminName">로딩중...</span>
                        <a href="/" class="bg-white text-purple-700 px-4 py-2 rounded hover:bg-gray-100">
                            <i class="fas fa-home mr-1"></i>메인으로
                        </a>
                    </div>
                </div>
            </div>
        </nav>

        <!-- 관리자 메뉴 -->
        <div class="bg-white shadow-md">
            <div class="max-w-7xl mx-auto px-4">
                <div class="flex space-x-1">
                    <a href="/admin/dashboard" class="px-4 py-3 text-gray-600 hover:bg-gray-100">
                        <i class="fas fa-home mr-1"></i>대시보드
                    </a>
                    <a href="/admin/courses" class="px-4 py-3 text-gray-600 hover:bg-gray-100">
                        <i class="fas fa-book mr-1"></i>강좌 관리
                    </a>
                    <a href="/admin/users" class="px-4 py-3 bg-purple-100 text-purple-700 font-semibold border-b-2 border-purple-700">
                        <i class="fas fa-users mr-1"></i>회원 관리
                    </a>
                    <a href="/admin/payments" class="px-4 py-3 text-gray-600 hover:bg-gray-100">
                        <i class="fas fa-credit-card mr-1"></i>결제 관리
                    </a>
                    <a href="/admin/enrollments" class="px-4 py-3 text-gray-600 hover:bg-gray-100">
                        <i class="fas fa-graduation-cap mr-1"></i>수강 관리
                    </a>
                </div>
            </div>
        </div>

        <!-- 메인 콘텐츠 -->
        <div class="max-w-7xl mx-auto px-4 py-8">
            <!-- 검색 및 필터 -->
            <div class="bg-white rounded-lg shadow p-6 mb-6">
                <div class="flex gap-4">
                    <input type="text" id="searchInput" placeholder="이름, 이메일 검색..." 
                        class="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <select id="roleFilter" class="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <option value="">전체 권한</option>
                        <option value="admin">관리자</option>
                        <option value="student">학생</option>
                    </select>
                    <select id="statusFilter" class="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <option value="">전체 상태</option>
                        <option value="active">활성</option>
                        <option value="inactive">비활성</option>
                    </select>
                </div>
            </div>

            <!-- 회원 목록 -->
            <div class="bg-white rounded-lg shadow">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-xl font-bold text-gray-800">회원 목록</h2>
                        <span id="totalCount" class="text-gray-600">총 <strong>0</strong>명</span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead>
                                <tr class="border-b">
                                    <th class="text-left py-3 px-4">ID</th>
                                    <th class="text-left py-3 px-4">이름</th>
                                    <th class="text-left py-3 px-4">이메일</th>
                                    <th class="text-left py-3 px-4">전화번호</th>
                                    <th class="text-left py-3 px-4">권한</th>
                                    <th class="text-left py-3 px-4">상태</th>
                                    <th class="text-left py-3 px-4">가입일</th>
                                    <th class="text-center py-3 px-4">관리</th>
                                </tr>
                            </thead>
                            <tbody id="userList">
                                <tr>
                                    <td colspan="8" class="text-center py-8 text-gray-500">
                                        <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                                        <p>로딩중...</p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- 페이지네이션 -->
                <div id="pagination" class="px-6 py-4 border-t flex justify-center"></div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/js/auth.js"></script>
        <script src="/static/js/utils.js"></script>
        <script>
            let currentPage = 1;
            const limit = 20;

            document.addEventListener('DOMContentLoaded', async () => {
                const user = await requireAdmin();
                if (!user) return;
                document.getElementById('adminName').textContent = user.name;
                
                await loadUsers();
                
                // 검색 및 필터 이벤트
                document.getElementById('searchInput').addEventListener('input', () => loadUsers());
                document.getElementById('roleFilter').addEventListener('change', () => loadUsers());
                document.getElementById('statusFilter').addEventListener('change', () => loadUsers());
            });

            async function loadUsers(page = 1) {
                currentPage = page;
                const search = document.getElementById('searchInput').value;
                const role = document.getElementById('roleFilter').value;
                const status = document.getElementById('statusFilter').value;
                
                try {
                    const token = AuthManager.getSessionToken();
                    const params = new URLSearchParams({
                        page: currentPage,
                        limit: limit,
                        ...(search && { search }),
                        ...(role && { role }),
                        ...(status && { status })
                    });
                    
                    const response = await axios.get(\`/api/admin/users?\${params}\`, {
                        headers: { 'Authorization': \`Bearer \${token}\` }
                    });
                    
                    if (response.data.success) {
                        renderUsers(response.data.data);
                        renderPagination(response.data.pagination);
                        document.getElementById('totalCount').innerHTML = 
                            \`총 <strong>\${response.data.pagination.total}</strong>명\`;
                    }
                } catch (error) {
                    console.error('Failed to load users:', error);
                    document.getElementById('userList').innerHTML = 
                        '<tr><td colspan="8" class="text-center py-8 text-red-500">회원 목록을 불러오는데 실패했습니다.</td></tr>';
                }
            }

            function renderUsers(users) {
                const tbody = document.getElementById('userList');
                
                if (users.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-gray-500">회원이 없습니다.</td></tr>';
                    return;
                }
                
                tbody.innerHTML = users.map(user => \`
                    <tr class="border-b hover:bg-gray-50">
                        <td class="py-3 px-4">\${user.id}</td>
                        <td class="py-3 px-4 font-semibold">\${user.name}</td>
                        <td class="py-3 px-4">\${user.email}</td>
                        <td class="py-3 px-4">\${user.phone || '-'}</td>
                        <td class="py-3 px-4">
                            <span class="px-2 py-1 rounded-full text-xs font-semibold \${user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}">
                                \${user.role === 'admin' ? '관리자' : '학생'}
                            </span>
                        </td>
                        <td class="py-3 px-4">
                            <span class="px-2 py-1 rounded-full text-xs font-semibold \${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                                \${user.status === 'active' ? '활성' : '비활성'}
                            </span>
                        </td>
                        <td class="py-3 px-4">\${formatDate(user.created_at)}</td>
                        <td class="py-3 px-4 text-center">
                            <button onclick="resetPassword(\${user.id}, '\${user.name}')" 
                                    class="text-orange-600 hover:text-orange-800 mx-1" 
                                    title="비밀번호 초기화">
                                <i class="fas fa-key"></i>
                            </button>
                            <a href="/admin/users/\${user.id}/classroom" 
                               class="text-blue-600 hover:text-blue-800 mx-1"
                               title="내강의실 보기">
                                <i class="fas fa-chalkboard-teacher"></i>
                            </a>
                            <a href="/admin/users/\${user.id}" 
                               class="text-purple-600 hover:text-purple-800 mx-1"
                               title="상세 보기">
                                <i class="fas fa-eye"></i>
                            </a>
                        </td>
                    </tr>
                \`).join('');
            }

            function renderPagination(pagination) {
                const container = document.getElementById('pagination');
                if (!pagination || pagination.totalPages <= 1) {
                    container.innerHTML = '';
                    return;
                }
                
                let html = '<div class="flex space-x-2">';
                
                // 이전 버튼
                if (pagination.page > 1) {
                    html += \`<button onclick="loadUsers(\${pagination.page - 1})" class="px-4 py-2 border rounded hover:bg-gray-100">이전</button>\`;
                }
                
                // 페이지 번호
                for (let i = Math.max(1, pagination.page - 2); i <= Math.min(pagination.totalPages, pagination.page + 2); i++) {
                    const active = i === pagination.page ? 'bg-purple-600 text-white' : 'hover:bg-gray-100';
                    html += \`<button onclick="loadUsers(\${i})" class="px-4 py-2 border rounded \${active}">\${i}</button>\`;
                }
                
                // 다음 버튼
                if (pagination.page < pagination.totalPages) {
                    html += \`<button onclick="loadUsers(\${pagination.page + 1})" class="px-4 py-2 border rounded hover:bg-gray-100">다음</button>\`;
                }
                
                html += '</div>';
                container.innerHTML = html;
            }

            function formatDate(dateString) {
                if (!dateString) return '-';
                const date = new Date(dateString);
                return date.toLocaleDateString('ko-KR');
            }
            
            // 비밀번호 초기화 함수
            async function resetPassword(userId, userName) {
                const options = [
                    { text: '🔑 수동 초기화', value: 'manual' },
                    { text: '🤖 AI 자동 생성', value: 'ai' }
                ];
                
                const selected = confirm(\`\${userName} 님의 비밀번호를 초기화하시겠습니까?\n\n확인: 수동 초기화 (password123)\n취소: AI 자동 생성\`);
                
                const mode = selected ? 'manual' : 'ai';
                
                try {
                    const token = AuthManager.getSessionToken();
                    const response = await axios.post(\`/api/admin/users/\${userId}/reset-password\`, 
                        { mode },
                        { headers: { 'Authorization': \`Bearer \${token}\` } }
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
                                    
                                    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                                        <p class="text-sm text-yellow-800">
                                            <i class="fas fa-exclamation-triangle mr-2"></i>
                                            <strong>중요:</strong> 이 비밀번호를 학생에게 안전하게 전달해주세요.
                                        </p>
                                    </div>
                                    
                                    <button onclick="closePasswordModal()" 
                                            class="w-full bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 font-semibold">
                                        확인
                                    </button>
                                </div>
                            </div>
                        \`;
                        
                        document.body.insertAdjacentHTML('beforeend', modalHtml);
                    } else {
                        alert('비밀번호 초기화에 실패했습니다: ' + (response.data.error || '알 수 없는 오류'));
                    }
                } catch (error) {
                    console.error('Reset password error:', error);
                    alert('비밀번호 초기화 중 오류가 발생했습니다: ' + (error.response?.data?.error || error.message));
                }
            }
            
            function copyPassword(password) {
                navigator.clipboard.writeText(password).then(() => {
                    showToast('비밀번호가 클립보드에 복사되었습니다!', 'success');
                }).catch(err => {
                    console.error('Copy failed:', err);
                    alert('복사 실패: ' + err.message);
                });
            }
            
            function closePasswordModal() {
                const modal = document.getElementById('passwordModal');
                if (modal) {
                    modal.remove();
                }
            }
        </script>
    </body>
    </html>
  `)
})

/**
 * GET /admin/payments
 * 결제 관리 페이지
 */
pagesAdmin.get('/payments', async (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>결제 관리 - 마인드스토리 LMS</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100">
        <!-- 관리자 헤더 -->
        <nav class="bg-purple-700 text-white shadow-lg">
            <div class="max-w-7xl mx-auto px-4 py-4">
                <div class="flex justify-between items-center">
                    <h1 class="text-2xl font-bold">
                        <i class="fas fa-credit-card mr-2"></i>
                        결제 관리
                    </h1>
                    <div class="flex items-center space-x-4">
                        <span id="adminName">로딩중...</span>
                        <a href="/" class="bg-white text-purple-700 px-4 py-2 rounded hover:bg-gray-100">
                            <i class="fas fa-home mr-1"></i>메인으로
                        </a>
                    </div>
                </div>
            </div>
        </nav>

        <!-- 관리자 메뉴 -->
        <div class="bg-white shadow-md">
            <div class="max-w-7xl mx-auto px-4">
                <div class="flex space-x-1">
                    <a href="/admin/dashboard" class="px-4 py-3 text-gray-600 hover:bg-gray-100">
                        <i class="fas fa-home mr-1"></i>대시보드
                    </a>
                    <a href="/admin/courses" class="px-4 py-3 text-gray-600 hover:bg-gray-100">
                        <i class="fas fa-book mr-1"></i>강좌 관리
                    </a>
                    <a href="/admin/users" class="px-4 py-3 text-gray-600 hover:bg-gray-100">
                        <i class="fas fa-users mr-1"></i>회원 관리
                    </a>
                    <a href="/admin/payments" class="px-4 py-3 bg-purple-100 text-purple-700 font-semibold border-b-2 border-purple-700">
                        <i class="fas fa-credit-card mr-1"></i>결제 관리
                    </a>
                    <a href="/admin/enrollments" class="px-4 py-3 text-gray-600 hover:bg-gray-100">
                        <i class="fas fa-graduation-cap mr-1"></i>수강 관리
                    </a>
                </div>
            </div>
        </div>

        <!-- 메인 콘텐츠 -->
        <div class="max-w-7xl mx-auto px-4 py-8">
            <!-- 통계 카드 -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div class="bg-white rounded-lg shadow p-6">
                    <p class="text-gray-500 text-sm mb-1">총 결제 건수</p>
                    <p class="text-2xl font-bold text-purple-700" id="totalPayments">0건</p>
                </div>
                <div class="bg-white rounded-lg shadow p-6">
                    <p class="text-gray-500 text-sm mb-1">총 결제 금액</p>
                    <p class="text-2xl font-bold text-green-700" id="totalAmount">0원</p>
                </div>
                <div class="bg-white rounded-lg shadow p-6">
                    <p class="text-gray-500 text-sm mb-1">이번 달 매출</p>
                    <p class="text-2xl font-bold text-blue-700" id="monthlyAmount">0원</p>
                </div>
                <div class="bg-white rounded-lg shadow p-6">
                    <p class="text-gray-500 text-sm mb-1">환불 건수</p>
                    <p class="text-2xl font-bold text-red-700" id="refundCount">0건</p>
                </div>
            </div>

            <!-- 검색 및 필터 -->
            <div class="bg-white rounded-lg shadow p-6 mb-6">
                <div class="flex gap-4">
                    <input type="text" id="searchInput" placeholder="주문번호, 이름, 이메일 검색..." 
                        class="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <select id="statusFilter" class="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <option value="">전체 상태</option>
                        <option value="completed">완료</option>
                        <option value="pending">대기</option>
                        <option value="failed">실패</option>
                        <option value="refunded">환불</option>
                    </select>
                </div>
            </div>

            <!-- 결제 목록 -->
            <div class="bg-white rounded-lg shadow">
                <div class="p-6">
                    <h2 class="text-xl font-bold text-gray-800 mb-4">결제 내역</h2>
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead>
                                <tr class="border-b">
                                    <th class="text-left py-3 px-4">주문번호</th>
                                    <th class="text-left py-3 px-4">회원</th>
                                    <th class="text-left py-3 px-4">강좌</th>
                                    <th class="text-right py-3 px-4">금액</th>
                                    <th class="text-left py-3 px-4">상태</th>
                                    <th class="text-left py-3 px-4">결제일</th>
                                    <th class="text-center py-3 px-4">관리</th>
                                </tr>
                            </thead>
                            <tbody id="paymentList">
                                <tr>
                                    <td colspan="7" class="text-center py-8 text-gray-500">
                                        <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                                        <p>로딩중...</p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- 페이지네이션 -->
                <div id="pagination" class="px-6 py-4 border-t flex justify-center"></div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/js/auth.js"></script>
        <script src="/static/js/utils.js"></script>
        <script>
            let currentPage = 1;
            const limit = 20;

            document.addEventListener('DOMContentLoaded', async () => {
                const user = await requireAdmin();
                if (!user) return;
                document.getElementById('adminName').textContent = user.name;
                
                await loadPayments();
                await loadStats();
                
                // 검색 및 필터 이벤트
                document.getElementById('searchInput').addEventListener('input', () => loadPayments());
                document.getElementById('statusFilter').addEventListener('change', () => loadPayments());
            });

            async function loadStats() {
                try {
                    const token = AuthManager.getSessionToken();
                    const response = await axios.get('/api/admin/payments', {
                        headers: { 'Authorization': \`Bearer \${token}\` }
                    });
                    
                    if (response.data.success) {
                        const payments = response.data.data;
                        const total = payments.length;
                        const totalAmount = payments.reduce((sum, p) => sum + (p.final_amount || 0), 0);
                        const completed = payments.filter(p => p.status === 'completed');
                        const refunded = payments.filter(p => p.status === 'refunded');
                        
                        const now = new Date();
                        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                        const monthlyPayments = completed.filter(p => new Date(p.created_at) >= monthStart);
                        const monthlyAmount = monthlyPayments.reduce((sum, p) => sum + (p.final_amount || 0), 0);
                        
                        document.getElementById('totalPayments').textContent = \`\${total}건\`;
                        document.getElementById('totalAmount').textContent = \`\${totalAmount.toLocaleString()}원\`;
                        document.getElementById('monthlyAmount').textContent = \`\${monthlyAmount.toLocaleString()}원\`;
                        document.getElementById('refundCount').textContent = \`\${refunded.length}건\`;
                    }
                } catch (error) {
                    console.error('Failed to load stats:', error);
                }
            }

            async function loadPayments(page = 1) {
                currentPage = page;
                const search = document.getElementById('searchInput').value;
                const status = document.getElementById('statusFilter').value;
                
                try {
                    const token = AuthManager.getSessionToken();
                    const params = new URLSearchParams({
                        page: currentPage,
                        limit: limit,
                        ...(search && { search }),
                        ...(status && { status })
                    });
                    
                    const response = await axios.get(\`/api/admin/payments?\${params}\`, {
                        headers: { 'Authorization': \`Bearer \${token}\` }
                    });
                    
                    if (response.data.success) {
                        renderPayments(response.data.data);
                        renderPagination(response.data.pagination);
                    }
                } catch (error) {
                    console.error('Failed to load payments:', error);
                    document.getElementById('paymentList').innerHTML = 
                        '<tr><td colspan="7" class="text-center py-8 text-red-500">결제 내역을 불러오는데 실패했습니다.</td></tr>';
                }
            }

            function renderPayments(payments) {
                const tbody = document.getElementById('paymentList');
                
                if (payments.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500">결제 내역이 없습니다.</td></tr>';
                    return;
                }
                
                tbody.innerHTML = payments.map(payment => \`
                    <tr class="border-b hover:bg-gray-50">
                        <td class="py-3 px-4 font-mono text-sm">\${payment.payment_key || payment.order_id}</td>
                        <td class="py-3 px-4">
                            <div>\${payment.user_name || '-'}</div>
                            <div class="text-xs text-gray-500">\${payment.email || ''}</div>
                        </td>
                        <td class="py-3 px-4">\${payment.course_title || payment.order_name}</td>
                        <td class="py-3 px-4 text-right font-semibold">\${(payment.final_amount || 0).toLocaleString()}원</td>
                        <td class="py-3 px-4">
                            <span class="px-2 py-1 rounded-full text-xs font-semibold \${getStatusClass(payment.status)}">
                                \${getStatusText(payment.status)}
                            </span>
                        </td>
                        <td class="py-3 px-4">\${formatDate(payment.paid_at || payment.created_at)}</td>
                        <td class="py-3 px-4 text-center">
                            <button onclick="viewPayment('\${payment.id}')" class="text-purple-600 hover:text-purple-800 mx-1">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                    </tr>
                \`).join('');
            }

            function getStatusClass(status) {
                const classes = {
                    'completed': 'bg-green-100 text-green-800',
                    'pending': 'bg-yellow-100 text-yellow-800',
                    'failed': 'bg-red-100 text-red-800',
                    'refunded': 'bg-gray-100 text-gray-800',
                    'cancelled': 'bg-gray-100 text-gray-800'
                };
                return classes[status] || 'bg-gray-100 text-gray-800';
            }

            function getStatusText(status) {
                const texts = {
                    'completed': '완료',
                    'pending': '대기',
                    'failed': '실패',
                    'refunded': '환불',
                    'cancelled': '취소'
                };
                return texts[status] || status;
            }

            function renderPagination(pagination) {
                const container = document.getElementById('pagination');
                if (!pagination || pagination.totalPages <= 1) {
                    container.innerHTML = '';
                    return;
                }
                
                let html = '<div class="flex space-x-2">';
                
                if (pagination.page > 1) {
                    html += \`<button onclick="loadPayments(\${pagination.page - 1})" class="px-4 py-2 border rounded hover:bg-gray-100">이전</button>\`;
                }
                
                for (let i = Math.max(1, pagination.page - 2); i <= Math.min(pagination.totalPages, pagination.page + 2); i++) {
                    const active = i === pagination.page ? 'bg-purple-600 text-white' : 'hover:bg-gray-100';
                    html += \`<button onclick="loadPayments(\${i})" class="px-4 py-2 border rounded \${active}">\${i}</button>\`;
                }
                
                if (pagination.page < pagination.totalPages) {
                    html += \`<button onclick="loadPayments(\${pagination.page + 1})" class="px-4 py-2 border rounded hover:bg-gray-100">다음</button>\`;
                }
                
                html += '</div>';
                container.innerHTML = html;
            }

            function formatDate(dateString) {
                if (!dateString) return '-';
                const date = new Date(dateString);
                return date.toLocaleString('ko-KR');
            }

            function viewPayment(id) {
                alert('결제 상세 페이지는 준비 중입니다.');
            }
        </script>
    </body>
    </html>
  `)
})

/**
 * GET /admin/courses/:courseId/lessons
 * 강좌 차시 관리 페이지
 */
pagesAdmin.get('/courses/:courseId/lessons', async (c) => {
  const courseId = c.req.param('courseId')
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>차시 관리 - 마인드스토리 LMS</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/style.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100">
        <!-- 관리자 헤더 -->
        <nav class="bg-purple-700 text-white shadow-lg">
            <div class="max-w-7xl mx-auto px-4 py-4">
                <div class="flex justify-between items-center">
                    <h1 class="text-2xl font-bold">
                        <i class="fas fa-list mr-2"></i>
                        차시 관리
                    </h1>
                    <div class="flex items-center space-x-4">
                        <a href="/" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors">
                            <i class="fas fa-users mr-1"></i>수강생 모드
                        </a>
                        <span id="adminName">로딩중...</span>
                        <button onclick="logout()" class="bg-white text-purple-700 px-4 py-2 rounded hover:bg-gray-100">
                            <i class="fas fa-sign-out-alt mr-1"></i>로그아웃
                        </button>
                    </div>
                </div>
            </div>
        </nav>

        <!-- 관리자 메뉴 -->
        <div class="bg-white shadow-md">
            <div class="max-w-7xl mx-auto px-4">
                <div class="flex space-x-1">
                    <a href="/admin/dashboard" class="px-4 py-3 text-gray-600 hover:bg-gray-100">
                        <i class="fas fa-home mr-1"></i>대시보드
                    </a>
                    <a href="/admin/courses" class="px-4 py-3 bg-purple-100 text-purple-700 font-semibold border-b-2 border-purple-700">
                        <i class="fas fa-book mr-1"></i>강좌 관리
                    </a>
                    <a href="/admin/users" class="px-4 py-3 text-gray-600 hover:bg-gray-100">
                        <i class="fas fa-users mr-1"></i>회원 관리
                    </a>
                    <a href="/admin/payments" class="px-4 py-3 text-gray-600 hover:bg-gray-100">
                        <i class="fas fa-credit-card mr-1"></i>결제 관리
                    </a>
                    <a href="/admin/popups" class="px-4 py-3 text-gray-600 hover:bg-gray-100">
                        <i class="fas fa-bell mr-1"></i>팝업 관리
                    </a>
                    <a href="/admin/settings" class="px-4 py-3 text-gray-600 hover:bg-gray-100">
                        <i class="fas fa-cog mr-1"></i>설정
                    </a>
                </div>
            </div>
        </div>

        <!-- 메인 콘텐츠 -->
        <div class="max-w-7xl mx-auto px-4 py-8">
            <!-- 강좌 정보 카드 -->
            <div class="bg-white rounded-lg shadow p-6 mb-6">
                <div class="flex justify-between items-start">
                    <div class="flex items-start">
                        <img id="courseThumbnail" src="" alt="강좌 썸네일" class="w-32 h-32 object-cover rounded-lg mr-6" onerror="this.src='https://via.placeholder.com/128'">
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
            <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div class="p-6 border-b flex justify-between items-center">
                    <h2 class="text-2xl font-bold text-gray-800">
                        <i class="fas fa-edit mr-2"></i><span id="modalTitle">새 차시 추가</span>
                    </h2>
                    <button onclick="closeLessonModal()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                <form id="lessonForm" class="p-6 space-y-6">
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
                            <input type="number" id="lessonOrder" min="1" required
                                class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                            <p class="text-sm text-gray-500 mt-1">* 차시 순서를 입력하세요 (예: 1, 2, 3...)</p>
                        </div>

                        <!-- 재생 시간 (분) -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                재생 시간 (분)
                            </label>
                            <input type="number" id="lessonDuration" min="0" value="0"
                                class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                        </div>

                        <!-- 영상 설정 (탭 형식) -->
                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-3">
                                영상 설정 <span class="text-red-500">*</span>
                            </label>
                            
                            <!-- 탭 메뉴 -->
                            <div class="flex border-b mb-4">
                                <button type="button" id="youtubeTab" onclick="switchVideoTab('youtube')"
                                    class="px-4 py-2 font-medium border-b-2 border-purple-600 text-purple-600 video-tab active">
                                    <i class="fab fa-youtube mr-2"></i>YouTube
                                </button>
                                <button type="button" id="uploadTab" onclick="switchVideoTab('upload')"
                                    class="px-4 py-2 font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 video-tab">
                                    <i class="fas fa-upload mr-2"></i>직접 업로드
                                </button>
                            </div>

                            <!-- YouTube 탭 -->
                            <div id="youtubeTabContent" class="video-tab-content">
                                <input type="url" id="lessonVideoUrl" placeholder="https://youtube.com/watch?v=..."
                                    class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                                <p class="text-sm text-gray-500 mt-2">
                                    <i class="fas fa-info-circle mr-1"></i>
                                    YouTube 영상 링크를 입력하세요 (공개/비공개 모두 가능)
                                </p>
                            </div>

                            <!-- 직접 업로드 탭 -->
                            <div id="uploadTabContent" class="video-tab-content hidden">
                                <!-- 업로드 방식 선택 토글 -->
                                <div class="mb-4 flex items-center space-x-4 border-b pb-3">
                                    <button type="button" id="fileUploadBtn" onclick="switchUploadMode('file')"
                                        class="px-4 py-2 rounded-lg bg-purple-600 text-white font-medium">
                                        <i class="fas fa-file-upload mr-2"></i>파일 업로드
                                    </button>
                                    <button type="button" id="urlUploadBtn" onclick="switchUploadMode('url')"
                                        class="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-medium hover:bg-gray-300">
                                        <i class="fas fa-link mr-2"></i>URL 입력
                                    </button>
                                </div>

                                <!-- 파일 업로드 영역 -->
                                <div id="fileUploadArea" class="upload-mode-area">
                                    <!-- 일괄 업로드 옵션 -->
                                    <div class="mb-4 flex items-center justify-between">
                                        <label class="flex items-center">
                                            <input type="checkbox" id="bulkUploadMode" class="mr-2" onchange="toggleBulkUpload()">
                                            <span class="text-sm font-medium text-gray-700">
                                                <i class="fas fa-layer-group mr-1"></i>일괄 업로드 (여러 파일 동시 선택)
                                            </span>
                                        </label>
                                        <button type="button" onclick="showBulkUploadHelp()" class="text-blue-600 hover:text-blue-800 text-sm">
                                            <i class="fas fa-question-circle mr-1"></i>사용법
                                        </button>
                                    </div>

                                    <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                        <input type="file" id="videoFileInput" accept="video/mp4,video/webm,video/quicktime,video/x-msvideo" 
                                            class="hidden" onchange="handleVideoFileSelect(event)">
                                        <label for="videoFileInput" class="cursor-pointer">
                                            <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-4"></i>
                                            <p class="text-gray-600 mb-2">클릭하여 영상 파일을 선택하거나</p>
                                            <p class="text-gray-600 mb-2">파일을 드래그 앤 드롭하세요</p>
                                            <p class="text-sm text-gray-500">MP4, WebM, MOV, AVI (최대 500MB)</p>
                                            <p class="text-xs text-purple-600 mt-2" id="bulkUploadHint" style="display: none;">
                                                <i class="fas fa-info-circle mr-1"></i>여러 파일을 동시에 선택할 수 있습니다
                                            </p>
                                        </label>
                                    </div>
                                </div>

                                <!-- URL 입력 영역 -->
                                <div id="urlUploadArea" class="upload-mode-area hidden">
                                    <div class="space-y-4">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                                영상 URL <span class="text-red-500">*</span>
                                            </label>
                                            <input type="url" id="videoUrlInput" 
                                                placeholder="https://embed.api.video/vod/vi..."
                                                class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                                            <p class="text-sm text-gray-500 mt-2">
                                                <i class="fas fa-info-circle mr-1"></i>
                                                지원 형식: api.video URL, 직접 영상 URL (.mp4, .webm, .mov 등)
                                            </p>
                                        </div>
                                        <button type="button" onclick="handleVideoUrlUpload()" 
                                            class="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">
                                            <i class="fas fa-check mr-2"></i>URL 등록
                                        </button>
                                    </div>
                                </div>
                                
                                <!-- 업로드 진행률 -->
                                <div id="uploadProgress" class="mt-4 hidden">
                                    <div class="flex items-center justify-between mb-2">
                                        <span class="text-sm font-medium text-gray-700" id="uploadFileName"></span>
                                        <span class="text-sm text-gray-600" id="uploadPercent">0%</span>
                                    </div>
                                    <div class="w-full bg-gray-200 rounded-full h-2">
                                        <div id="uploadProgressBar" class="bg-purple-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                                    </div>
                                </div>

                                <!-- 업로드 완료 정보 -->
                                <div id="uploadedInfo" class="mt-4 hidden">
                                    <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center">
                                                <i class="fas fa-check-circle text-green-600 mr-2"></i>
                                                <span class="text-sm font-medium text-green-800">업로드 완료</span>
                                            </div>
                                            <div class="flex space-x-2">
                                                <button type="button" onclick="replaceUploadedVideo()" 
                                                    class="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                                                    title="다른 영상으로 교체">
                                                    <i class="fas fa-exchange-alt mr-1"></i>교체
                                                </button>
                                                <button type="button" onclick="deleteUploadedVideo()" 
                                                    class="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
                                                    title="업로드된 영상 삭제">
                                                    <i class="fas fa-trash mr-1"></i>삭제
                                                </button>
                                            </div>
                                        </div>
                                        <div class="mt-2">
                                            <p class="text-sm text-green-700 font-medium" id="uploadedFileName"></p>
                                            <p class="text-xs text-green-600 mt-1" id="uploadedFileInfo"></p>
                                        </div>
                                        <input type="hidden" id="uploadedVideoKey">
                                    </div>
                                </div>
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

                        <!-- 무료 미리보기 -->
                        <div class="md:col-span-2">
                            <label class="flex items-center mb-3">
                                <input type="checkbox" id="lessonIsFree" class="mr-2" onchange="toggleFreePreviewTime()">
                                <span class="text-sm font-medium text-gray-700">무료 미리보기 (비로그인 사용자도 시청 가능)</span>
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

                    <div class="flex justify-end space-x-4 pt-6 border-t">
                        <button type="button" onclick="closeLessonModal()"
                            class="px-6 py-2 border rounded-lg hover:bg-gray-100">
                            취소
                        </button>
                        <button type="submit"
                            class="px-6 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-800">
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

              // 관리자 이름 표시
              document.getElementById('adminName').textContent = user.name;

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
                  const course = response.data;
                  document.getElementById('courseTitle').textContent = course.title;
                  document.getElementById('courseDescription').textContent = course.description || '';
                  document.getElementById('courseThumbnail').src = course.thumbnail_url || 'https://via.placeholder.com/128';
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

              container.innerHTML = lessons.map(lesson => \`
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
                          \${lesson.is_free_preview === 1 ? '<span class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold"><i class="fas fa-unlock mr-1"></i>무료 미리보기</span>' : ''}
                          \${lesson.status !== 'active' ? '<span class="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-semibold"><i class="fas fa-eye-slash mr-1"></i>비공개</span>' : ''}
                        </div>
                      </div>
                    </div>
                    <div class="flex space-x-2">
                      \${lesson.video_url ? \`
                        <a href="/courses/\${courseId}/lessons/\${lesson.id}" target="_blank" 
                           class="text-green-600 hover:text-green-800" title="영상 재생">
                          <i class="fas fa-play-circle"></i>
                        </a>
                      \` : ''}
                      <button onclick="editLesson(\${lesson.id})" class="text-blue-600 hover:text-blue-800" title="수정">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button onclick="deleteLesson(\${lesson.id})" class="text-red-600 hover:text-red-800" title="삭제">
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
                  
                  document.getElementById('modalTitle').textContent = '차시 수정';
                  document.getElementById('lessonId').value = lesson.id;
                  document.getElementById('lessonTitle').value = lesson.title;
                  document.getElementById('lessonOrder').value = lesson.lesson_number;
                  document.getElementById('lessonDuration').value = lesson.video_duration_minutes || 0;
                  document.getElementById('lessonVideoUrl').value = lesson.video_url || '';
                  document.getElementById('lessonDescription').value = lesson.description || '';
                  document.getElementById('lessonIsFree').checked = lesson.is_free_preview === 1;
                  document.getElementById('lessonIsActive').checked = lesson.status === 'active';
                  
                  document.getElementById('lessonModal').classList.remove('hidden');
                  document.getElementById('lessonModal').classList.add('flex');
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

            // 폼 제출 처리
            async function handleSubmit(e) {
              e.preventDefault();
              
              const lessonId = document.getElementById('lessonId').value;
              
              // 영상 데이터 가져오기 (admin-lessons.js의 함수 호출)
              const videoData = getVideoData();
              if (!videoData) {
                return; // 영상 데이터 검증 실패
              }
              
              const formData = {
                course_id: parseInt(courseId),
                title: document.getElementById('lessonTitle').value,
                lesson_number: parseInt(document.getElementById('lessonOrder').value),
                video_duration_minutes: parseInt(document.getElementById('lessonDuration').value) || 0,
                video_provider: videoData.video_provider,
                video_url: videoData.video_url,
                video_id: videoData.video_id,
                description: document.getElementById('lessonDescription').value || null,
                is_free_preview: document.getElementById('lessonIsFree').checked ? 1 : 0,
                status: document.getElementById('lessonIsActive').checked ? 'active' : 'inactive'
              };

              try {
                let response;
                if (lessonId) {
                  // 수정
                  response = await apiRequest('PUT', \`/api/courses/\${courseId}/lessons/\${lessonId}\`, formData);
                } else {
                  // 등록
                  response = await apiRequest('POST', \`/api/courses/\${courseId}/lessons\`, formData);
                }

                if (response.success) {
                  alert(lessonId ? '차시가 수정되었습니다.' : '차시가 추가되었습니다.');
                  closeLessonModal();
                  await loadLessons();
                } else {
                  showError(response.error || '저장에 실패했습니다.');
                }
              } catch (error) {
                console.error('Save lesson error:', error);
                showError('저장에 실패했습니다.');
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

            // 에러 메시지 표시
            function showError(message) {
              alert(message);
            }
        </script>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/js/auth.js"></script>
        <script src="/static/js/admin-lessons.js"></script>
    </body>
    </html>
  `)
})

/**
 * GET /admin/enrollments
 * 수강 관리 페이지
 */
pagesAdmin.get('/enrollments', async (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>수강 관리 - 마인드스토리 LMS</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100">
        <!-- 관리자 헤더 -->
        <nav class="bg-purple-700 text-white shadow-lg">
            <div class="max-w-7xl mx-auto px-4 py-4">
                <div class="flex justify-between items-center">
                    <h1 class="text-2xl font-bold">
                        <i class="fas fa-graduation-cap mr-2"></i>
                        수강 관리
                    </h1>
                    <div class="flex items-center space-x-4">
                        <span id="adminName">로딩중...</span>
                        <a href="/" class="bg-white text-purple-700 px-4 py-2 rounded hover:bg-gray-100">
                            <i class="fas fa-home mr-1"></i>메인으로
                        </a>
                    </div>
                </div>
            </div>
        </nav>

        <!-- 관리자 메뉴 -->
        <div class="bg-white shadow-md">
            <div class="max-w-7xl mx-auto px-4">
                <div class="flex space-x-1">
                    <a href="/admin/dashboard" class="px-4 py-3 text-gray-600 hover:bg-gray-100">
                        <i class="fas fa-home mr-1"></i>대시보드
                    </a>
                    <a href="/admin/courses" class="px-4 py-3 text-gray-600 hover:bg-gray-100">
                        <i class="fas fa-book mr-1"></i>강좌 관리
                    </a>
                    <a href="/admin/users" class="px-4 py-3 text-gray-600 hover:bg-gray-100">
                        <i class="fas fa-users mr-1"></i>회원 관리
                    </a>
                    <a href="/admin/payments" class="px-4 py-3 text-gray-600 hover:bg-gray-100">
                        <i class="fas fa-credit-card mr-1"></i>결제 관리
                    </a>
                    <a href="/admin/enrollments" class="px-4 py-3 bg-purple-100 text-purple-700 font-semibold border-b-2 border-purple-700">
                        <i class="fas fa-graduation-cap mr-1"></i>수강 관리
                    </a>
                </div>
            </div>
        </div>

        <!-- 메인 콘텐츠 -->
        <div class="max-w-7xl mx-auto px-4 py-8">
            <!-- 통계 카드 -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div class="bg-white rounded-lg shadow p-6">
                    <p class="text-gray-500 text-sm mb-1">전체 수강생</p>
                    <p class="text-2xl font-bold text-purple-700" id="totalEnrollments">0명</p>
                </div>
                <div class="bg-white rounded-lg shadow p-6">
                    <p class="text-gray-500 text-sm mb-1">활성 수강생</p>
                    <p class="text-2xl font-bold text-green-700" id="activeEnrollments">0명</p>
                </div>
                <div class="bg-white rounded-lg shadow p-6">
                    <p class="text-gray-500 text-sm mb-1">수료 완료</p>
                    <p class="text-2xl font-bold text-blue-700" id="completedEnrollments">0명</p>
                </div>
                <div class="bg-white rounded-lg shadow p-6">
                    <p class="text-gray-500 text-sm mb-1">기간 만료</p>
                    <p class="text-2xl font-bold text-red-700" id="expiredEnrollments">0명</p>
                </div>
            </div>

            <!-- 검색 및 필터 -->
            <div class="bg-white rounded-lg shadow p-6 mb-6">
                <div class="flex gap-4">
                    <input type="text" id="searchInput" placeholder="이름, 이메일, 강좌명 검색..." 
                        class="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <select id="statusFilter" class="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <option value="">전체 상태</option>
                        <option value="active">수강 중</option>
                        <option value="completed">수료</option>
                        <option value="expired">기간 만료</option>
                        <option value="refunded">환불</option>
                    </select>
                </div>
            </div>

            <!-- 수강 목록 -->
            <div class="bg-white rounded-lg shadow">
                <div class="p-6">
                    <h2 class="text-xl font-bold text-gray-800 mb-4">수강 내역</h2>
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead>
                                <tr class="border-b">
                                    <th class="text-left py-3 px-4">ID</th>
                                    <th class="text-left py-3 px-4">회원</th>
                                    <th class="text-left py-3 px-4">강좌</th>
                                    <th class="text-center py-3 px-4">진도율</th>
                                    <th class="text-left py-3 px-4">상태</th>
                                    <th class="text-left py-3 px-4">수강 기간</th>
                                    <th class="text-center py-3 px-4">관리</th>
                                </tr>
                            </thead>
                            <tbody id="enrollmentList">
                                <tr>
                                    <td colspan="7" class="text-center py-8 text-gray-500">
                                        <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                                        <p>로딩중...</p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- 페이지네이션 -->
                <div id="pagination" class="px-6 py-4 border-t flex justify-center"></div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/js/auth.js"></script>
        <script src="/static/js/utils.js"></script>
        <script>
            let currentPage = 1;
            const limit = 20;

            document.addEventListener('DOMContentLoaded', async () => {
                const user = await requireAdmin();
                if (!user) return;
                document.getElementById('adminName').textContent = user.name;
                
                await loadEnrollments();
                await loadStats();
                
                // 검색 및 필터 이벤트
                document.getElementById('searchInput').addEventListener('input', () => loadEnrollments());
                document.getElementById('statusFilter').addEventListener('change', () => loadEnrollments());
            });

            async function loadStats() {
                try {
                    const token = AuthManager.getSessionToken();
                    const response = await axios.get('/api/admin/enrollments', {
                        headers: { 'Authorization': \`Bearer \${token}\` }
                    });
                    
                    if (response.data.success) {
                        const enrollments = response.data.data;
                        const total = enrollments.length;
                        const active = enrollments.filter(e => e.status === 'active').length;
                        const completed = enrollments.filter(e => e.status === 'completed').length;
                        const expired = enrollments.filter(e => e.status === 'expired').length;
                        
                        document.getElementById('totalEnrollments').textContent = \`\${total}명\`;
                        document.getElementById('activeEnrollments').textContent = \`\${active}명\`;
                        document.getElementById('completedEnrollments').textContent = \`\${completed}명\`;
                        document.getElementById('expiredEnrollments').textContent = \`\${expired}명\`;
                    }
                } catch (error) {
                    console.error('Failed to load stats:', error);
                }
            }

            async function loadEnrollments(page = 1) {
                currentPage = page;
                const search = document.getElementById('searchInput').value;
                const status = document.getElementById('statusFilter').value;
                
                try {
                    const token = AuthManager.getSessionToken();
                    const params = new URLSearchParams({
                        page: currentPage,
                        limit: limit,
                        ...(search && { search }),
                        ...(status && { status })
                    });
                    
                    const response = await axios.get(\`/api/admin/enrollments?\${params}\`, {
                        headers: { 'Authorization': \`Bearer \${token}\` }
                    });
                    
                    if (response.data.success) {
                        renderEnrollments(response.data.data);
                        renderPagination(response.data.pagination);
                    }
                } catch (error) {
                    console.error('Failed to load enrollments:', error);
                    document.getElementById('enrollmentList').innerHTML = 
                        '<tr><td colspan="7" class="text-center py-8 text-red-500">수강 내역을 불러오는데 실패했습니다.</td></tr>';
                }
            }

            function renderEnrollments(enrollments) {
                const tbody = document.getElementById('enrollmentList');
                
                if (enrollments.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500">수강 내역이 없습니다.</td></tr>';
                    return;
                }
                
                tbody.innerHTML = enrollments.map(enrollment => \`
                    <tr class="border-b hover:bg-gray-50">
                        <td class="py-3 px-4">\${enrollment.id}</td>
                        <td class="py-3 px-4">
                            <div>\${enrollment.user_name}</div>
                            <div class="text-xs text-gray-500">\${enrollment.email}</div>
                        </td>
                        <td class="py-3 px-4">\${enrollment.course_title}</td>
                        <td class="py-3 px-4 text-center">
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-green-500 h-2 rounded-full" style="width: \${enrollment.progress_rate || 0}%"></div>
                            </div>
                            <span class="text-xs text-gray-600">\${Math.round(enrollment.progress_rate || 0)}%</span>
                        </td>
                        <td class="py-3 px-4">
                            <span class="px-2 py-1 rounded-full text-xs font-semibold \${getStatusClass(enrollment.status)}">
                                \${getStatusText(enrollment.status)}
                            </span>
                        </td>
                        <td class="py-3 px-4">
                            <div class="text-sm">\${formatDate(enrollment.start_date)}</div>
                            <div class="text-xs text-gray-500">~ \${formatDate(enrollment.end_date)}</div>
                        </td>
                        <td class="py-3 px-4 text-center">
                            <button onclick="viewEnrollment('\${enrollment.id}')" class="text-purple-600 hover:text-purple-800 mx-1">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                    </tr>
                \`).join('');
            }

            function getStatusClass(status) {
                const classes = {
                    'active': 'bg-green-100 text-green-800',
                    'completed': 'bg-blue-100 text-blue-800',
                    'expired': 'bg-gray-100 text-gray-800',
                    'refunded': 'bg-red-100 text-red-800'
                };
                return classes[status] || 'bg-gray-100 text-gray-800';
            }

            function getStatusText(status) {
                const texts = {
                    'active': '수강 중',
                    'completed': '수료',
                    'expired': '기간 만료',
                    'refunded': '환불'
                };
                return texts[status] || status;
            }

            function renderPagination(pagination) {
                const container = document.getElementById('pagination');
                if (!pagination || pagination.totalPages <= 1) {
                    container.innerHTML = '';
                    return;
                }
                
                let html = '<div class="flex space-x-2">';
                
                if (pagination.page > 1) {
                    html += \`<button onclick="loadEnrollments(\${pagination.page - 1})" class="px-4 py-2 border rounded hover:bg-gray-100">이전</button>\`;
                }
                
                for (let i = Math.max(1, pagination.page - 2); i <= Math.min(pagination.totalPages, pagination.page + 2); i++) {
                    const active = i === pagination.page ? 'bg-purple-600 text-white' : 'hover:bg-gray-100';
                    html += \`<button onclick="loadEnrollments(\${i})" class="px-4 py-2 border rounded \${active}">\${i}</button>\`;
                }
                
                if (pagination.page < pagination.totalPages) {
                    html += \`<button onclick="loadEnrollments(\${pagination.page + 1})" class="px-4 py-2 border rounded hover:bg-gray-100">다음</button>\`;
                }
                
                html += '</div>';
                container.innerHTML = html;
            }

            function formatDate(dateString) {
                if (!dateString) return '-';
                const date = new Date(dateString);
                return date.toLocaleDateString('ko-KR');
            }

            function viewEnrollment(id) {
                alert('수강 상세 페이지는 준비 중입니다.');
            }
        </script>
    </body>
    </html>
  `)
})

export default pagesAdmin

/**
 * GET /admin/videos
 * 영상 라이브러리 관리 페이지
 */
pagesAdmin.get('/videos', async (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>영상 라이브러리 - 마인드스토리 LMS</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/style.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100">
        <!-- 관리자 헤더 -->
        <nav class="bg-purple-700 text-white p-4">
            <div class="container mx-auto flex justify-between items-center">
                <h1 class="text-2xl font-bold">
                    <i class="fas fa-video mr-2"></i>영상 라이브러리
                </h1>
                <div class="flex items-center space-x-4">
                    <span id="adminName" class="text-sm"></span>
                    <a href="/admin/dashboard" class="hover:text-purple-200">
                        <i class="fas fa-home mr-1"></i>관리자 홈
                    </a>
                    <button onclick="handleLogout()" class="hover:text-purple-200">
                        <i class="fas fa-sign-out-alt mr-1"></i>로그아웃
                    </button>
                </div>
            </div>
        </nav>

        <div class="container mx-auto p-6">
            <!-- 상단 통계 -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center">
                        <div class="bg-purple-100 rounded-full p-4 mr-4">
                            <i class="fas fa-video text-purple-600 text-2xl"></i>
                        </div>
                        <div>
                            <p class="text-gray-500 text-sm">총 영상 수</p>
                            <p id="totalVideos" class="text-3xl font-bold text-gray-800">0</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center">
                        <div class="bg-green-100 rounded-full p-4 mr-4">
                            <i class="fas fa-check-circle text-green-600 text-2xl"></i>
                        </div>
                        <div>
                            <p class="text-gray-500 text-sm">활성 영상</p>
                            <p id="activeVideos" class="text-3xl font-bold text-gray-800">0</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center">
                        <div class="bg-blue-100 rounded-full p-4 mr-4">
                            <i class="fas fa-clock text-blue-600 text-2xl"></i>
                        </div>
                        <div>
                            <p class="text-gray-500 text-sm">총 재생 시간</p>
                            <p id="totalDuration" class="text-3xl font-bold text-gray-800">0분</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 영상 목록 -->
            <div class="bg-white rounded-lg shadow">
                <div class="p-6 border-b flex justify-between items-center">
                    <h2 class="text-xl font-bold text-gray-800">
                        <i class="fas fa-list mr-2 text-purple-600"></i>영상 목록
                    </h2>
                    <div class="flex space-x-2">
                        <input type="text" id="searchInput" placeholder="영상 검색..." 
                            class="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <button onclick="loadVideos()" class="bg-purple-700 text-white px-4 py-2 rounded-lg hover:bg-purple-800">
                            <i class="fas fa-sync-alt mr-1"></i>새로고침
                        </button>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="py-3 px-4 text-left text-sm font-semibold text-gray-700">썸네일</th>
                                <th class="py-3 px-4 text-left text-sm font-semibold text-gray-700">영상 제목</th>
                                <th class="py-3 px-4 text-left text-sm font-semibold text-gray-700">강좌</th>
                                <th class="py-3 px-4 text-left text-sm font-semibold text-gray-700">차시</th>
                                <th class="py-3 px-4 text-left text-sm font-semibold text-gray-700">재생 시간</th>
                                <th class="py-3 px-4 text-left text-sm font-semibold text-gray-700">업로드 일시</th>
                                <th class="py-3 px-4 text-left text-sm font-semibold text-gray-700">상태</th>
                                <th class="py-3 px-4 text-center text-sm font-semibold text-gray-700">관리</th>
                            </tr>
                        </thead>
                        <tbody id="videoList">
                            <tr>
                                <td colspan="8" class="text-center py-8 text-gray-500">
                                    <i class="fas fa-spinner fa-spin text-4xl mb-2"></i>
                                    <p>로딩 중...</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/js/auth.js"></script>
        <script>
            let allVideos = [];

            // 페이지 로드 시 초기화
            document.addEventListener('DOMContentLoaded', async () => {
                await requireAdmin();
                const user = await getCurrentUser();
                document.getElementById('adminName').textContent = user.name + ' 님';
                
                loadVideos();
                
                // 검색 기능
                document.getElementById('searchInput').addEventListener('input', filterVideos);
            });

            // 영상 목록 로드
            async function loadVideos() {
                try {
                    const response = await apiRequest('GET', '/api/admin/videos');
                    
                    if (response.success) {
                        allVideos = response.data;
                        renderVideos(allVideos);
                        updateStatistics(allVideos);
                    } else {
                        showError('영상 목록을 불러오는데 실패했습니다.');
                    }
                } catch (error) {
                    console.error('Load videos error:', error);
                    showError('영상 목록을 불러오는데 실패했습니다.');
                }
            }

            // 영상 목록 렌더링
            function renderVideos(videos) {
                const tbody = document.getElementById('videoList');
                
                if (!videos || videos.length === 0) {
                    tbody.innerHTML = \`
                        <tr>
                            <td colspan="8" class="text-center py-8 text-gray-500">
                                <i class="fas fa-video-slash text-4xl mb-2"></i>
                                <p>등록된 영상이 없습니다.</p>
                            </td>
                        </tr>
                    \`;
                    return;
                }

                tbody.innerHTML = videos.map(video => {
                    const statusBadge = video.status === 'active' 
                        ? '<span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">활성</span>'
                        : '<span class="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">비활성</span>';
                    
                    const freePreview = video.is_free_preview 
                        ? '<span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs ml-1">무료</span>'
                        : '';
                    
                    return \`
                        <tr class="border-b hover:bg-gray-50">
                            <td class="py-3 px-4">
                                <div class="w-20 h-14 bg-gray-200 rounded flex items-center justify-center">
                                    <i class="fas fa-video text-gray-400 text-2xl"></i>
                                </div>
                            </td>
                            <td class="py-3 px-4">
                                <p class="font-semibold text-gray-800">\${video.lesson_title}</p>
                                <p class="text-sm text-gray-500">\${video.description || '설명 없음'}</p>
                            </td>
                            <td class="py-3 px-4">
                                <p class="text-gray-800">\${video.course_title}</p>
                            </td>
                            <td class="py-3 px-4">
                                <p class="text-gray-800">\${video.lesson_number}차시</p>
                            </td>
                            <td class="py-3 px-4">
                                <p class="text-gray-800">\${video.video_duration_minutes || 0}분</p>
                            </td>
                            <td class="py-3 px-4">
                                <p class="text-sm text-gray-600">\${formatDate(video.created_at)}</p>
                            </td>
                            <td class="py-3 px-4">
                                \${statusBadge}\${freePreview}
                            </td>
                            <td class="py-3 px-4 text-center">
                                <button onclick="viewVideo(\${video.lesson_id})" class="text-purple-600 hover:text-purple-800 mr-2" title="재생">
                                    <i class="fas fa-play-circle"></i>
                                </button>
                                <button onclick="editLesson(\${video.course_id}, \${video.lesson_id})" class="text-blue-600 hover:text-blue-800 mr-2" title="수정">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="deleteVideo(\${video.lesson_id})" class="text-red-600 hover:text-red-800" title="삭제">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    \`;
                }).join('');
            }

            // 통계 업데이트
            function updateStatistics(videos) {
                document.getElementById('totalVideos').textContent = videos.length;
                document.getElementById('activeVideos').textContent = videos.filter(v => v.status === 'active').length;
                
                const totalMinutes = videos.reduce((sum, v) => sum + (parseInt(v.video_duration_minutes) || 0), 0);
                document.getElementById('totalDuration').textContent = totalMinutes + '분';
            }

            // 영상 검색
            function filterVideos() {
                const searchTerm = document.getElementById('searchInput').value.toLowerCase();
                const filtered = allVideos.filter(video => 
                    video.lesson_title.toLowerCase().includes(searchTerm) ||
                    video.course_title.toLowerCase().includes(searchTerm)
                );
                renderVideos(filtered);
            }

            // 영상 재생
            function viewVideo(lessonId) {
                window.open(\`/lessons/\${lessonId}\`, '_blank');
            }

            // 차시 수정
            function editLesson(courseId, lessonId) {
                window.location.href = \`/admin/courses/\${courseId}/lessons\`;
            }

            // 영상 삭제
            async function deleteVideo(lessonId) {
                if (!confirm('정말로 이 영상을 삭제하시겠습니까?')) return;
                
                try {
                    const response = await apiRequest('DELETE', \`/api/admin/lessons/\${lessonId}\`);
                    
                    if (response.success) {
                        alert('영상이 삭제되었습니다.');
                        loadVideos();
                    } else {
                        alert('삭제 실패: ' + (response.message || '알 수 없는 오류'));
                    }
                } catch (error) {
                    console.error('Delete error:', error);
                    alert('삭제 중 오류가 발생했습니다.');
                }
            }

            // 날짜 포맷
            function formatDate(dateString) {
                if (!dateString) return '-';
                const date = new Date(dateString);
                return date.toLocaleDateString('ko-KR') + ' ' + date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
            }

            // 에러 메시지
            function showError(message) {
                alert(message);
            }
        </script>
    </body>
    </html>
  `)
})

/**
 * GET /admin/users/:userId/classroom
 * 관리자용 학생 내강의실 보기
 */
pagesAdmin.get('/users/:userId/classroom', async (c) => {
  const userId = c.req.param('userId')
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>학생 내강의실 - 마인드스토리 LMS</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100">
        <!-- 관리자 헤더 -->
        <nav class="bg-purple-700 text-white shadow-lg">
            <div class="max-w-7xl mx-auto px-4 py-4">
                <div class="flex justify-between items-center">
                    <h1 class="text-2xl font-bold">
                        <i class="fas fa-chalkboard-teacher mr-2"></i>
                        학생 내강의실
                    </h1>
                    <div class="flex items-center space-x-4">
                        <span id="adminName">로딩중...</span>
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
        <script src="/static/js/auth.js"></script>
        <script>
            const userId = ${userId};
            let currentTab = 'ongoing';
            let allEnrollments = [];

            document.addEventListener('DOMContentLoaded', async () => {
                const admin = await requireAdmin();
                if (!admin) return;
                document.getElementById('adminName').textContent = admin.name;
                
                await loadStudentInfo();
                await loadEnrollments();
            });

            async function loadStudentInfo() {
                try {
                    const token = AuthManager.getSessionToken();
                    const response = await axios.get(\`/api/admin/users/\${userId}\`, {
                        headers: { 'Authorization': \`Bearer \${token}\` }
                    });
                    
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
                    const token = AuthManager.getSessionToken();
                    const response = await axios.get(\`/api/admin/enrollments?user_id=\${userId}&limit=100\`, {
                        headers: { 'Authorization': \`Bearer \${token}\` }
                    });
                    
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
                            <img src="\${enrollment.course_thumbnail || '/api/placeholder/400/200'}" 
                                 alt="\${enrollment.course_title}"
                                 class="w-full h-48 object-cover"
                                 onerror="this.src='/api/placeholder/400/200'">
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
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100">
        <!-- 관리자 헤더 -->
        <nav class="bg-purple-700 text-white shadow-lg">
            <div class="max-w-7xl mx-auto px-4 py-4">
                <div class="flex justify-between items-center">
                    <h1 class="text-2xl font-bold">
                        <i class="fas fa-user-circle mr-2"></i>
                        회원 상세
                    </h1>
                    <div class="flex items-center space-x-4">
                        <span id="adminName">로딩중...</span>
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
        <script src="/static/js/auth.js"></script>
        <script>
            const userId = ${userId};

            document.addEventListener('DOMContentLoaded', async () => {
                const admin = await requireAdmin();
                if (!admin) return;
                document.getElementById('adminName').textContent = admin.name;
                
                await loadUserDetail();
            });

            async function loadUserDetail() {
                try {
                    const token = AuthManager.getSessionToken();
                    const response = await axios.get(\`/api/admin/users/\${userId}\`, {
                        headers: { 'Authorization': \`Bearer \${token}\` }
                    });
                    
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
                    const token = AuthManager.getSessionToken();
                    const response = await axios.post(\`/api/admin/users/\${userId}/reset-password\`, 
                        { mode },
                        { headers: { 'Authorization': \`Bearer \${token}\` } }
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
    </body>
    </html>
  `)
})
