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

                        <!-- 썸네일 URL -->
                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                썸네일 이미지 URL
                            </label>
                            <input type="url" id="courseThumbnail" placeholder="https://..."
                                class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                            <p class="text-sm text-gray-500 mt-1">* Unsplash 등 무료 이미지 사이트의 URL을 입력하세요</p>
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
