/**
 * 수강신청 페이지
 * 모든 강좌를 한눈에 보고 수강신청할 수 있는 페이지
 */

import { Hono } from 'hono'
import { Bindings } from '../types/database'
import { requireAuth } from '../middleware/auth'

const pagesEnrollment = new Hono<{ Bindings: Bindings }>()

/**
 * GET /enrollment
 * 수강신청 페이지 (로그인 필수)
 */
pagesEnrollment.get('/enrollment', requireAuth, async (c) => {
  const user = c.get('user')
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>수강신청 - 마인드스토리 원격평생교육원</title>
        
        <!-- Pretendard Font -->
        <link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" />
        
        <!-- Tailwind CSS -->
        <script src="https://cdn.tailwindcss.com"></script>
        
        <!-- FontAwesome -->
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        
        <!-- Axios -->
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        
        <!-- Custom Scripts -->
        <script src="/static/js/auth.js"></script>
        <script src="/static/js/utils.js"></script>
        
        <style>
            * {
                font-family: 'Pretendard Variable', 'Pretendard', system-ui, -apple-system, sans-serif;
            }
            
            body {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
            }
            
            .course-card {
                transition: all 0.3s ease;
                background: white;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            
            .course-card:hover {
                transform: translateY(-8px);
                box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
            }
            
            .course-thumbnail {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                height: 180px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 3rem;
            }
            
            .badge {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 0.75rem;
                font-weight: 600;
            }
            
            .badge-free {
                background: #10b981;
                color: white;
            }
            
            .badge-paid {
                background: #f59e0b;
                color: white;
            }
            
            .btn-enroll {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                font-weight: 600;
                transition: all 0.3s ease;
                border: none;
                cursor: pointer;
                width: 100%;
            }
            
            .btn-enroll:hover {
                transform: scale(1.05);
                box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
            }
            
            .btn-enrolled {
                background: #e5e7eb;
                color: #6b7280;
                cursor: not-allowed;
            }
            
            .btn-enrolled:hover {
                transform: none;
                box-shadow: none;
            }
            
            .filter-tabs {
                display: flex;
                gap: 12px;
                margin-bottom: 32px;
            }
            
            .filter-tab {
                padding: 8px 20px;
                border-radius: 20px;
                background: rgba(255, 255, 255, 0.2);
                color: white;
                cursor: pointer;
                transition: all 0.3s ease;
                border: 2px solid transparent;
            }
            
            .filter-tab:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            
            .filter-tab.active {
                background: white;
                color: #667eea;
                border-color: white;
            }
        </style>
    </head>
    <body>
        <!-- 헤더 -->
        <header class="bg-white shadow-sm fixed w-full top-0 z-50">
            <div class="container mx-auto px-4 py-4 flex justify-between items-center">
                <a href="/" class="text-2xl font-bold text-indigo-600">
                    <i class="fas fa-graduation-cap mr-2"></i>
                    마인드스토리
                </a>
                <nav class="hidden md:flex space-x-6">
                    <a href="/" class="text-gray-700 hover:text-indigo-600">홈</a>
                    <a href="/enrollment" class="text-indigo-600 font-bold">수강신청</a>
                    <a href="/my-courses" class="text-gray-700 hover:text-indigo-600">내 강의실</a>
                </nav>
                <div>
                    <a href="/my" class="text-gray-700 hover:text-indigo-600">
                        <i class="fas fa-user-circle text-2xl"></i>
                    </a>
                </div>
            </div>
        </header>
        
        <div style="height: 80px;"></div> <!-- 헤더 높이만큼 여백 -->
        
        <div class="container mx-auto px-4 py-12">
            <!-- 페이지 헤더 -->
            <div class="text-center mb-12">
                <h1 class="text-4xl font-bold text-white mb-4">
                    <i class="fas fa-graduation-cap mr-3"></i>
                    수강신청
                </h1>
                <p class="text-white text-lg opacity-90">
                    원하는 강좌를 선택하고 학습을 시작하세요
                </p>
            </div>
            
            <!-- 필터 탭 -->
            <div class="filter-tabs justify-center mb-8">
                <div class="filter-tab active" data-filter="all">
                    <i class="fas fa-list mr-2"></i>
                    전체 강좌
                </div>
                <div class="filter-tab" data-filter="free">
                    <i class="fas fa-gift mr-2"></i>
                    무료 강좌
                </div>
                <div class="filter-tab" data-filter="paid">
                    <i class="fas fa-star mr-2"></i>
                    유료 강좌
                </div>
            </div>
            
            <!-- 로딩 스피너 -->
            <div id="loading" class="text-center py-20">
                <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                <p class="text-white mt-4">강좌 목록을 불러오는 중...</p>
            </div>
            
            <!-- 강좌 목록 -->
            <div id="courses-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" style="display: none;">
                <!-- 강좌 카드가 여기에 동적으로 추가됩니다 -->
            </div>
            
            <!-- 빈 상태 -->
            <div id="empty-state" class="text-center py-20" style="display: none;">
                <i class="fas fa-inbox text-white text-6xl mb-4 opacity-50"></i>
                <p class="text-white text-xl">해당하는 강좌가 없습니다.</p>
            </div>
        </div>
        
        <!-- 푸터 -->
        <footer class="bg-gray-800 text-white py-12 mt-20">
            <div class="container mx-auto px-4 text-center">
                <p class="text-lg mb-4">마인드스토리 원격평생교육원</p>
                <p class="text-gray-400 text-sm">© 2026 MindStory. All rights reserved.</p>
            </div>
        </footer>
        
        <script>
            let allCourses = []
            let enrolledCourseIds = []
            let currentFilter = 'all'
            
            // 페이지 로드 시 실행
            document.addEventListener('DOMContentLoaded', async () => {
                await loadCourses()
                setupFilters()
            })
            
            // 강좌 목록 로드
            async function loadCourses() {
                try {
                    // 1. 모든 강좌 가져오기
                    const coursesResponse = await axios.get('/api/courses')
                    allCourses = coursesResponse.data.data || []
                    
                    // 2. 내 수강 목록 가져오기
                    const enrollmentsResponse = await axios.get('/api/enrollments/my', {
                        headers: {
                            'Authorization': 'Bearer ' + AuthManager.getSessionToken()
                        }
                    })
                    const enrollments = enrollmentsResponse.data.data || []
                    enrolledCourseIds = enrollments.map(e => e.course_id)
                    
                    // 3. 화면에 표시
                    renderCourses()
                    
                } catch (error) {
                    console.error('강좌 목록 로드 실패:', error)
                    showToast('강좌 목록을 불러오는데 실패했습니다.', 'error')
                    document.getElementById('loading').style.display = 'none'
                    document.getElementById('empty-state').style.display = 'block'
                }
            }
            
            // 강좌 목록 렌더링
            function renderCourses() {
                const grid = document.getElementById('courses-grid')
                const loading = document.getElementById('loading')
                const emptyState = document.getElementById('empty-state')
                
                // 필터링
                let filteredCourses = allCourses
                if (currentFilter === 'free') {
                    filteredCourses = allCourses.filter(c => c.price === 0)
                } else if (currentFilter === 'paid') {
                    filteredCourses = allCourses.filter(c => c.price > 0)
                }
                
                // 로딩 숨기기
                loading.style.display = 'none'
                
                // 강좌가 없는 경우
                if (filteredCourses.length === 0) {
                    grid.style.display = 'none'
                    emptyState.style.display = 'block'
                    return
                }
                
                // 강좌 카드 생성
                grid.innerHTML = filteredCourses.map(course => {
                    const isEnrolled = enrolledCourseIds.includes(course.id)
                    const isFree = course.price === 0
                    
                    return \`
                        <div class="course-card" data-course-id="\${course.id}">
                            <div class="course-thumbnail">
                                <i class="fas fa-book-open"></i>
                            </div>
                            
                            <div class="p-6">
                                <!-- 뱃지 -->
                                <div class="mb-3">
                                    <span class="badge \${isFree ? 'badge-free' : 'badge-paid'}">
                                        \${isFree ? '무료' : '유료'}
                                    </span>
                                    \${isEnrolled ? '<span class="badge ml-2" style="background: #3b82f6; color: white;">수강중</span>' : ''}
                                </div>
                                
                                <!-- 제목 -->
                                <h3 class="text-xl font-bold mb-2 text-gray-800">
                                    \${course.title}
                                </h3>
                                
                                <!-- 설명 -->
                                <p class="text-gray-600 text-sm mb-4 line-clamp-2">
                                    \${course.description || '강좌 설명이 없습니다.'}
                                </p>
                                
                                <!-- 정보 -->
                                <div class="space-y-2 mb-4 text-sm text-gray-600">
                                    <div class="flex items-center">
                                        <i class="fas fa-calendar-alt w-5"></i>
                                        <span>수강기간 \${course.duration_days || 0}일</span>
                                    </div>
                                    <div class="flex items-center">
                                        <i class="fas fa-video w-5"></i>
                                        <span>총 \${course.total_lessons || 0}강</span>
                                    </div>
                                    <div class="flex items-center">
                                        <i class="fas fa-clock w-5"></i>
                                        <span>\${course.total_hours || 0}시간</span>
                                    </div>
                                </div>
                                
                                <!-- 가격 -->
                                <div class="mb-4">
                                    <span class="text-2xl font-bold text-indigo-600">
                                        \${isFree ? '무료' : course.price.toLocaleString() + '원'}
                                    </span>
                                </div>
                                
                                <!-- 버튼 -->
                                \${isEnrolled 
                                    ? \`
                                        <button class="btn-enroll btn-enrolled" disabled>
                                            <i class="fas fa-check mr-2"></i>
                                            수강중
                                        </button>
                                    \`
                                    : \`
                                        <button class="btn-enroll" onclick="enrollCourse(\${course.id}, \${course.price})">
                                            <i class="fas fa-\${isFree ? 'gift' : 'shopping-cart'} mr-2"></i>
                                            \${isFree ? '무료 수강신청' : '결제하기'}
                                        </button>
                                    \`
                                }
                            </div>
                        </div>
                    \`
                }).join('')
                
                grid.style.display = 'grid'
                emptyState.style.display = 'none'
            }
            
            // 필터 설정
            function setupFilters() {
                const tabs = document.querySelectorAll('.filter-tab')
                tabs.forEach(tab => {
                    tab.addEventListener('click', () => {
                        // 활성 탭 변경
                        tabs.forEach(t => t.classList.remove('active'))
                        tab.classList.add('active')
                        
                        // 필터 적용
                        currentFilter = tab.dataset.filter
                        renderCourses()
                    })
                })
            }
            
            // 수강신청
            async function enrollCourse(courseId, price) {
                try {
                    if (price === 0) {
                        // 무료 강좌: 즉시 수강신청
                        const response = await axios.post('/api/enrollments', 
                            { courseId },
                            {
                                headers: {
                                    'Authorization': 'Bearer ' + AuthManager.getSessionToken()
                                },
                                withCredentials: true
                            }
                        )
                        
                        if (response.data.success) {
                            showToast('수강 신청이 완료되었습니다!', 'success')
                            
                            // 1초 후 내 강의실로 이동
                            setTimeout(() => {
                                window.location.href = '/my-courses'
                            }, 1000)
                        }
                    } else {
                        // 유료 강좌: 결제 페이지로 이동
                        window.location.href = '/payment/checkout/' + courseId
                    }
                } catch (error) {
                    const message = error.response?.data?.error || '수강 신청에 실패했습니다.'
                    showToast(message, 'error')
                }
            }
        </script>
    </body>
    </html>
  `)
})

export default pagesEnrollment
