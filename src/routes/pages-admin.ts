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
        <link href="/static/styles.css" rel="stylesheet">
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
        <link href="/static/styles.css" rel="stylesheet">
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
            <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div class="p-6 border-b flex justify-between items-center">
                    <h2 class="text-2xl font-bold text-gray-800">
                        <i class="fas fa-edit mr-2"></i><span id="modalTitle">새 강좌 등록</span>
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
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                강좌 설명 <span class="text-red-500">*</span>
                            </label>
                            <textarea id="courseDescription" rows="4" required
                                class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"></textarea>
                        </div>

                        <!-- 썸네일 URL 또는 파일 업로드 -->
                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                썸네일 이미지
                            </label>
                            
                            <!-- 탭 선택 -->
                            <div class="flex border-b mb-4">
                                <button type="button" id="urlTab" onclick="switchImageTab('url')" 
                                    class="px-4 py-2 border-b-2 border-purple-700 text-purple-700 font-semibold">
                                    URL 입력
                                </button>
                                <button type="button" id="uploadTab" onclick="switchImageTab('upload')" 
                                    class="px-4 py-2 text-gray-600">
                                    파일 업로드
                                </button>
                            </div>

                            <!-- URL 입력 -->
                            <div id="urlSection">
                                <input type="url" id="courseThumbnail" placeholder="https://..."
                                    class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                                <p class="text-sm text-gray-500 mt-1">* Unsplash 등 무료 이미지 사이트의 URL을 입력하세요</p>
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
                            <a href="/admin/users/\${user.id}" class="text-purple-600 hover:text-purple-800 mx-1">
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
        <link href="/static/styles.css" rel="stylesheet">
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
                                <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                    <input type="file" id="videoFileInput" accept="video/mp4,video/webm,video/quicktime,video/x-msvideo" 
                                        class="hidden" onchange="handleVideoFileSelect(event)">
                                    <label for="videoFileInput" class="cursor-pointer">
                                        <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-4"></i>
                                        <p class="text-gray-600 mb-2">클릭하여 영상 파일을 선택하거나</p>
                                        <p class="text-gray-600 mb-2">파일을 드래그 앤 드롭하세요</p>
                                        <p class="text-sm text-gray-500">MP4, WebM, MOV, AVI (최대 500MB)</p>
                                    </label>
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
                                        <div class="flex items-center">
                                            <i class="fas fa-check-circle text-green-600 mr-2"></i>
                                            <span class="text-sm font-medium text-green-800">업로드 완료</span>
                                        </div>
                                        <p class="text-sm text-green-700 mt-1" id="uploadedFileName"></p>
                                        <input type="hidden" id="uploadedVideoKey">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 차시 설명 -->
                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                차시 설명
                            </label>
                            <textarea id="lessonDescription" rows="4"
                                class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"></textarea>
                        </div>

                        <!-- 무료 미리보기 -->
                        <div class="md:col-span-2">
                            <label class="flex items-center">
                                <input type="checkbox" id="lessonIsFree" class="mr-2">
                                <span class="text-sm font-medium text-gray-700">무료 미리보기 (비로그인 사용자도 시청 가능)</span>
                            </label>
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

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/js/auth.js"></script>
        <script src="/static/js/admin-lessons.js"></script>
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
              try {
                const response = await apiRequest('GET', \`/api/courses/\${courseId}/lessons\`);
                
                if (response.success) {
                  allLessons = response.data;
                  document.getElementById('lessonCount').textContent = allLessons.length;
                  renderLessons(allLessons);
                } else {
                  showError('차시 목록을 불러오는데 실패했습니다.');
                }
              } catch (error) {
                console.error('Load lessons error:', error);
                showError('차시 목록을 불러오는데 실패했습니다.');
              }
            }

            // 차시 목록 렌더링
            function renderLessons(lessons) {
              const container = document.getElementById('lessonList');
              
              if (!lessons || lessons.length === 0) {
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
