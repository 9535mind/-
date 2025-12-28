/**
 * 관리자 페이지 라우트
 * /admin/*
 */

import { Hono } from 'hono'
import { Bindings } from '../types/database'

const pagesAdmin = new Hono<{ Bindings: Bindings }>()

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

export default pagesAdmin
