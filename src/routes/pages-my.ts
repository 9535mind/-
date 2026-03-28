/**
 * 내 강의실 관련 페이지
 */

import { Hono } from 'hono'
import { Bindings } from '../types/database'

const pagesMy = new Hono<{ Bindings: Bindings }>()

const getHeader = (currentPage = '') => `
<header class="bg-white shadow-sm sticky top-0 z-40">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-4">
            <a href="/" class="text-2xl font-bold text-indigo-600">마인드스토리 원격평생교육원</a>
            <nav class="hidden md:flex space-x-8">
                <a href="/#courses" class="text-gray-700 hover:text-indigo-600">과정 안내</a>
                <a href="/my-courses" class="${currentPage === 'courses' ? 'text-indigo-600 font-semibold' : 'text-gray-700 hover:text-indigo-600'}">내 강의실</a>
                <a href="/my-profile" class="${currentPage === 'profile' ? 'text-indigo-600 font-semibold' : 'text-gray-700 hover:text-indigo-600'}">내 정보</a>
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
// NOTE: /my-courses 는 pages-student.ts 가 담당 (진도 기반 UI)
// 이 페이지는 삭제하지 않고 legacy 경로로 유지한다.
pagesMy.get('/my-courses-legacy', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>내 강의실 - 마인드스토리</title>
        <link rel="stylesheet" href="/static/css/app.css" />
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/js/auth.js"></script>
        <script src="/static/js/utils.js"></script>
        <script src="/static/js/content-protection.js"></script>
    </head>
    <body class="bg-gray-50">
        ${getHeader('courses')}
        
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 class="text-3xl font-bold text-gray-900 mb-8">내 강의실</h1>

            <div id="adminFreepassSection" class="hidden mb-8 rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                <p class="font-semibold text-amber-900 mb-1"><i class="fas fa-user-shield mr-2 text-amber-700"></i>관리자 프리패스</p>
                <p class="text-sm text-amber-800 mb-4">수강 신청 없이도 모든 강좌를 바로 열 수 있습니다. 공식 수강 기록이 필요하면 수강신청 페이지에서 일반 사용자처럼 신청하세요.</p>
                <div id="adminFreepassGrid" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3"></div>
            </div>
            
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
            // 로그인 확인
            if (!AuthManager.isLoggedIn()) {
                window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname)
            }
            
            // 사용자 이름 표시
            const user = AuthManager.getUser()
            if (user) {
                document.getElementById('userName').textContent = user.name + '님'
            }

            const isAdminUser = user && user.role === 'admin'

            function escapeAdminHtml(s) {
                if (s == null) return ''
                return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')
            }

            async function loadAdminFreepassCourses() {
                if (!isAdminUser) return
                const section = document.getElementById('adminFreepassSection')
                const grid = document.getElementById('adminFreepassGrid')
                if (!section || !grid) return
                section.classList.remove('hidden')
                try {
                    const r = await axios.get('/api/courses', { withCredentials: true })
                    const list = r.data.data || []
                    if (!list.length) {
                        grid.innerHTML = '<p class="text-sm text-gray-600">등록된 강좌가 없습니다.</p>'
                        return
                    }
                    grid.innerHTML = list.map(c => {
                        const t = escapeAdminHtml(c.title)
                        return \`<a href="/courses/\${c.id}/learn" class="block rounded-lg border border-amber-200/80 bg-white px-4 py-3 shadow-sm hover:border-indigo-400 transition text-left"><span class="font-medium text-gray-900">\${t}</span><span class="mt-1 block text-xs text-indigo-600">바로 학습 →</span></a>\`
                    }).join('')
                } catch (e) {
                    console.error(e)
                    grid.innerHTML = '<p class="text-sm text-red-600">강좌 목록을 불러오지 못했습니다.</p>'
                }
            }
            if (isAdminUser) loadAdminFreepassCourses()
            
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
                    const response = await axios.get(url, {
                        withCredentials: true
                    })
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
                                        <a href="/courses/\${enrollment.course_id}/learn" 
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
        <script src="/static/js/security.js"></script>
    </body>
    </html>
  `)
})

// /my-courses 는 pages-student.ts 가 처리 (index.tsx 라우팅 순서에서 우선)

/**
 * 내 정보 (프로필) 페이지
 */
pagesMy.get('/my-profile', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>내 정보 - 마인드스토리</title>
        <link rel="stylesheet" href="/static/css/app.css" />
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/js/auth.js"></script>
        <script src="/static/js/utils.js"></script>
    </head>
    <body class="bg-gray-50">
        ${getHeader('profile')}
        
        <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 class="text-3xl font-bold text-gray-900 mb-8">내 정보</h1>
            
            <!-- 프로필 정보 -->
            <div class="bg-white rounded-lg shadow p-6 mb-6">
                <h2 class="text-xl font-semibold mb-4">기본 정보</h2>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                        <input type="text" id="email" readonly class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">이름</label>
                        <input type="text" id="name" class="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
                        <input type="tel" id="phone" placeholder="010-1234-5678" class="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">생년월일</label>
                        <input type="date" id="birth_date" class="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <label class="flex items-start gap-2 pt-2">
                        <input type="checkbox" id="marketing_agreed" class="mt-1 w-4 h-4 shrink-0" />
                        <span class="text-sm text-gray-700">[선택] 마케팅 및 광고성 정보 수신 동의 (이메일/SMS)</span>
                    </label>
                    <p class="text-xs text-gray-500">동의 철회는 언제든지 가능하며, <a href="/privacy" class="text-indigo-600 underline" target="_blank">개인정보처리방침</a>을 참고해 주세요.</p>
                    <button onclick="updateProfile()" class="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700">
                        정보 수정
                    </button>
                </div>
            </div>

            <!-- 비밀번호 변경 (이메일 가입자만) -->
            <div class="bg-white rounded-lg shadow p-6 mb-6" id="passwordSection">
                <h2 class="text-xl font-semibold mb-4">비밀번호 변경</h2>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">현재 비밀번호</label>
                        <input type="password" id="currentPassword" class="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">새 비밀번호</label>
                        <input type="password" id="newPassword" class="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">새 비밀번호 확인</label>
                        <input type="password" id="confirmPassword" class="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <button onclick="changePassword()" class="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700">
                        비밀번호 변경
                    </button>
                </div>
            </div>

            <!-- 회원 탈퇴 -->
            <div class="bg-white rounded-lg shadow p-6">
                <h2 class="text-xl font-semibold mb-4 text-red-600">회원 탈퇴</h2>
                <p class="text-gray-600 mb-4">
                    회원 탈퇴 시 모든 수강 기록과 결제 내역이 삭제되며 복구할 수 없습니다.<br>
                    탈퇴 후 30일간 데이터가 보관되며, 이 기간 동안 고객센터에 문의하시면 복구 가능합니다.
                </p>
                <button onclick="openWithdrawalModal()" class="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700">
                    회원 탈퇴하기
                </button>
            </div>
        </div>

        <!-- 탈퇴 사유 선택 모달 -->
        <div id="withdrawalModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-md w-full p-6">
                <h3 class="text-xl font-bold mb-4">회원 탈퇴</h3>
                
                <!-- 탈퇴 조건 확인 메시지 -->
                <div id="withdrawalCheckMessage" class="mb-4"></div>
                
                <div id="withdrawalForm" class="hidden">
                    <p class="text-gray-600 mb-4">탈퇴 사유를 선택해주세요</p>
                    
                    <div class="space-y-2 mb-4">
                        <label class="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input type="radio" name="reason" value="사용하지 않는 서비스입니다" class="mr-3" />
                            <span>사용하지 않는 서비스입니다</span>
                        </label>
                        <label class="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input type="radio" name="reason" value="원하는 강의가 없습니다" class="mr-3" />
                            <span>원하는 강의가 없습니다</span>
                        </label>
                        <label class="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input type="radio" name="reason" value="다른 학습 플랫폼을 사용합니다" class="mr-3" />
                            <span>다른 학습 플랫폼을 사용합니다</span>
                        </label>
                        <label class="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input type="radio" name="reason" value="개인정보 보호를 위해" class="mr-3" />
                            <span>개인정보 보호를 위해</span>
                        </label>
                        <label class="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input type="radio" name="reason" value="기타" class="mr-3" />
                            <span>기타</span>
                        </label>
                    </div>
                    
                    <div id="reasonDetailBox" class="hidden mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">상세 사유</label>
                        <textarea id="reasonDetail" rows="3" placeholder="탈퇴 사유를 입력해주세요" class="w-full px-4 py-2 border border-gray-300 rounded-lg"></textarea>
                    </div>
                    
                    <div class="flex space-x-3">
                        <button onclick="closeWithdrawalModal()" class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400">
                            취소
                        </button>
                        <button onclick="confirmWithdrawal()" class="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700">
                            탈퇴하기
                        </button>
                    </div>
                </div>
                
                <div id="withdrawalCloseButton" class="hidden">
                    <button onclick="closeWithdrawalModal()" class="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400">
                        닫기
                    </button>
                </div>
            </div>
        </div>

        <script>
            let currentUser = null;

            // 페이지 로드 시 사용자 정보 로드
            async function loadUserProfile() {
                try {
                    const response = await axios.get('/api/auth/me', {
                        withCredentials: true
                    });

                    if (response.data.success) {
                        currentUser = response.data.data;
                        document.getElementById('email').value = currentUser.email || '';
                        document.getElementById('name').value = currentUser.name || '';
                        document.getElementById('phone').value = currentUser.phone || '';
                        document.getElementById('birth_date').value = currentUser.birth_date || '';

                        // 소셜 로그인 사용자는 비밀번호 변경 섹션 숨김
                        if (currentUser.social_provider) {
                            document.getElementById('passwordSection').style.display = 'none';
                        }
                    }
                } catch (error) {
                    console.error('프로필 로드 실패:', error);
                    alert('로그인이 필요합니다.');
                    window.location.href = '/login';
                }
            }

            // 프로필 수정
            async function updateProfile() {
                try {
                    const response = await axios.put('/api/auth/profile', {
                        name: document.getElementById('name').value,
                        phone: document.getElementById('phone').value,
                        birth_date: document.getElementById('birth_date').value,
                        marketing_agreed: document.getElementById('marketing_agreed').checked
                    }, {
                        withCredentials: true
                    });

                    if (response.data.success) {
                        alert('정보가 수정되었습니다.');
                        loadUserProfile();
                    }
                } catch (error) {
                    alert(error.response?.data?.message || '정보 수정에 실패했습니다.');
                }
            }

            // 비밀번호 변경
            async function changePassword() {
                const currentPassword = document.getElementById('currentPassword').value;
                const newPassword = document.getElementById('newPassword').value;
                const confirmPassword = document.getElementById('confirmPassword').value;

                if (!currentPassword || !newPassword || !confirmPassword) {
                    alert('모든 필드를 입력해주세요.');
                    return;
                }

                if (newPassword !== confirmPassword) {
                    alert('새 비밀번호가 일치하지 않습니다.');
                    return;
                }

                if (newPassword.length < 6) {
                    alert('비밀번호는 6자 이상이어야 합니다.');
                    return;
                }

                try {
                    const response = await axios.post('/api/auth/change-password', {
                        current_password: currentPassword,
                        new_password: newPassword
                    }, {
                        withCredentials: true
                    });

                    if (response.data.success) {
                        alert('비밀번호가 변경되었습니다.');
                        document.getElementById('currentPassword').value = '';
                        document.getElementById('newPassword').value = '';
                        document.getElementById('confirmPassword').value = '';
                    }
                } catch (error) {
                    alert(error.response?.data?.message || '비밀번호 변경에 실패했습니다.');
                }
            }

            // 탈퇴 모달 열기
            async function openWithdrawalModal() {
                // 수강/결제 내역 확인
                try {
                    const response = await axios.get('/api/auth/check-withdrawal', {
                        withCredentials: true
                    });

                    document.getElementById('withdrawalModal').classList.remove('hidden');
                    
                    if (response.data.success && response.data.data.can_withdraw) {
                        // 탈퇴 가능
                        document.getElementById('withdrawalCheckMessage').innerHTML = '';
                        document.getElementById('withdrawalForm').classList.remove('hidden');
                        document.getElementById('withdrawalCloseButton').classList.add('hidden');
                    } else {
                        // 탈퇴 불가
                        document.getElementById('withdrawalCheckMessage').innerHTML = \`
                            <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                                <p class="text-red-800 font-semibold mb-2">탈퇴할 수 없습니다</p>
                                <p class="text-red-700 text-sm">\${response.data.data.reason}</p>
                            </div>
                        \`;
                        document.getElementById('withdrawalForm').classList.add('hidden');
                        document.getElementById('withdrawalCloseButton').classList.remove('hidden');
                    }
                } catch (error) {
                    alert('탈퇴 가능 여부 확인에 실패했습니다.');
                    closeWithdrawalModal();
                }
            }

            // 탈퇴 모달 닫기
            function closeWithdrawalModal() {
                document.getElementById('withdrawalModal').classList.add('hidden');
                document.querySelectorAll('input[name="reason"]').forEach(input => input.checked = false);
                document.getElementById('reasonDetail').value = '';
                document.getElementById('reasonDetailBox').classList.add('hidden');
            }

            // 기타 선택 시 상세 사유 입력란 표시
            document.querySelectorAll('input[name="reason"]').forEach(radio => {
                radio.addEventListener('change', (e) => {
                    if (e.target.value === '기타') {
                        document.getElementById('reasonDetailBox').classList.remove('hidden');
                    } else {
                        document.getElementById('reasonDetailBox').classList.add('hidden');
                    }
                });
            });

            // 탈퇴 확인
            async function confirmWithdrawal() {
                const selectedReason = document.querySelector('input[name="reason"]:checked');
                
                if (!selectedReason) {
                    alert('탈퇴 사유를 선택해주세요.');
                    return;
                }

                const reason = selectedReason.value;
                const reasonDetail = document.getElementById('reasonDetail').value;

                if (reason === '기타' && !reasonDetail.trim()) {
                    alert('기타 사유를 입력해주세요.');
                    return;
                }

                if (!confirm('정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                    return;
                }

                try {
                    const response = await axios.post('/api/auth/withdrawal', {
                        reason: reason,
                        reason_detail: reasonDetail
                    }, {
                        withCredentials: true
                    });

                    if (response.data.success) {
                        alert(response.data.message);
                        clearSession();
                        window.location.href = '/';
                    }
                } catch (error) {
                    alert(error.response?.data?.message || '탈퇴 처리에 실패했습니다.');
                }
            }

            // 페이지 로드
            loadUserProfile();
        </script>
        <script src="/static/js/security.js"></script>
    </body>
    </html>
  `)
})

export default pagesMy
