/**
 * 내 강의실 관련 페이지
 */

import { Hono } from 'hono'
import { Bindings } from '../types/database'

const pagesMy = new Hono<{ Bindings: Bindings }>()

const getHeader = () => `
<header class="bg-white shadow-sm sticky top-0 z-40">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-4">
            <a href="/" class="text-2xl font-bold text-indigo-600">마인드스토리 원격평생교육원</a>
            <nav class="hidden md:flex space-x-8">
                <a href="/#courses" class="text-gray-700 hover:text-indigo-600">과정 안내</a>
                <a href="/my-courses" class="text-indigo-600 font-semibold">내 강의실</a>
            </nav>
            <div class="flex items-center space-x-4">
                <span class="text-gray-700" id="userName"></span>
                <button onclick="handleLogout()" class="text-gray-700 hover:text-indigo-600">로그아웃</button>
            </div>
        </div>
    </div>
</header>
`

/**
 * 내 강의실 페이지
 */
pagesMy.get('/my-courses', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>내 강의실 - 마인드스토리</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/js/auth.js"></script>
        <script src="/static/js/utils.js"></script>
    </head>
    <body class="bg-gray-50">
        ${getHeader()}
        
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 class="text-3xl font-bold text-gray-900 mb-8">내 강의실</h1>
            
            <!-- 탭 메뉴 -->
            <div class="border-b border-gray-200 mb-6">
                <nav class="flex space-x-8">
                    <button onclick="loadCourses('active')" id="tab-active" 
                        class="tab-btn py-4 px-1 border-b-2 border-indigo-600 font-medium text-sm text-indigo-600">
                        수강 중
                    </button>
                    <button onclick="loadCourses('completed')" id="tab-completed"
                        class="tab-btn py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300">
                        수료 완료
                    </button>
                    <button onclick="loadCourses('all')" id="tab-all"
                        class="tab-btn py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300">
                        전체
                    </button>
                </nav>
            </div>
            
            <!-- 과정 목록 -->
            <div id="courseList" class="grid md:grid-cols-2 gap-6">
                <!-- 동적으로 로드 -->
            </div>
        </div>
        
        <script>
            if (!requireAuth()) {
                // requireAuth가 false를 반환하면 이미 로그인 페이지로 리다이렉트됨
            }
            
            // 사용자 이름 표시
            const user = AuthManager.getUser()
            if (user) {
                document.getElementById('userName').textContent = user.name + '님'
            }
            
            let currentStatus = 'active'
            
            async function loadCourses(status) {
                currentStatus = status
                
                // 탭 활성화
                document.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.classList.remove('border-indigo-600', 'text-indigo-600')
                    btn.classList.add('border-transparent', 'text-gray-500')
                })
                document.getElementById('tab-' + status).classList.remove('border-transparent', 'text-gray-500')
                document.getElementById('tab-' + status).classList.add('border-indigo-600', 'text-indigo-600')
                
                showLoading('courseList')
                
                try {
                    const url = status === 'all' ? '/api/enrollments/my' : \`/api/enrollments/my?status=\${status}\`
                    const response = await axios.get(url)
                    const enrollments = response.data.data
                    
                    if (enrollments.length === 0) {
                        document.getElementById('courseList').innerHTML = \`
                            <div class="col-span-2 text-center py-12">
                                <i class="fas fa-book text-5xl text-gray-300 mb-4"></i>
                                <p class="text-gray-600">수강 중인 과정이 없습니다.</p>
                                <a href="/#courses" class="mt-4 inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">
                                    과정 둘러보기
                                </a>
                            </div>
                        \`
                        return
                    }
                    
                    document.getElementById('courseList').innerHTML = enrollments.map(enrollment => \`
                        <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                            <div class="h-40 bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
                                <i class="fas fa-book-open text-5xl text-white opacity-50"></i>
                            </div>
                            <div class="p-6">
                                <div class="flex justify-between items-start mb-2">
                                    <h3 class="text-xl font-semibold">\${enrollment.title}</h3>
                                    \${getStatusBadge(enrollment.status)}
                                </div>
                                
                                <!-- 진도율 -->
                                <div class="mt-4">
                                    <div class="flex justify-between text-sm mb-1">
                                        <span class="text-gray-600">진도율</span>
                                        <span class="font-semibold">\${formatProgress(enrollment.progress_rate)}</span>
                                    </div>
                                    <div class="w-full bg-gray-200 rounded-full h-2">
                                        <div class="\${getProgressColor(enrollment.progress_rate)} h-2 rounded-full" 
                                             style="width: \${enrollment.progress_rate}%"></div>
                                    </div>
                                    <div class="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>완료 차시: \${enrollment.completed_lessons} / \${enrollment.total_lessons}</span>
                                        <span>시청 시간: \${Math.floor(enrollment.total_watched_minutes)}분</span>
                                    </div>
                                </div>
                                
                                <!-- 수강 기간 -->
                                <div class="mt-4 flex items-center text-sm text-gray-600">
                                    <i class="far fa-calendar mr-2"></i>
                                    <span>\${formatDate(enrollment.start_date)} ~ \${formatDate(enrollment.end_date)}</span>
                                    <span class="ml-auto text-xs \${enrollment.status === 'active' ? 'text-indigo-600' : 'text-gray-500'}">
                                        \${enrollment.status === 'active' ? daysRemaining(enrollment.end_date) : ''}
                                    </span>
                                </div>
                                
                                <!-- 액션 버튼 -->
                                <div class="mt-4 flex space-x-2">
                                    \${enrollment.status === 'active' ? \`
                                        <a href="/learn/\${enrollment.id}" 
                                           class="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 text-center">
                                            학습하기
                                        </a>
                                    \` : ''}
                                    \${enrollment.status === 'completed' && enrollment.is_completed ? \`
                                        <a href="/certificates?enrollment=\${enrollment.id}" 
                                           class="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 text-center">
                                            수료증 보기
                                        </a>
                                    \` : ''}
                                </div>
                            </div>
                        </div>
                    \`).join('')
                } catch (error) {
                    showError('courseList', '수강 목록을 불러오는데 실패했습니다.')
                }
            }
            
            // 페이지 로드 시 수강 중 과정 로드
            loadCourses('active')
        </script>
    </body>
    </html>
  `)
})

export default pagesMy
