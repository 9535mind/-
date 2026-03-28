/**
 * Admin Analytics Pages
 * Learning analytics dashboard for administrators
 */

import { Hono } from 'hono'
import type { Bindings } from '../types/database'

const app = new Hono<{ Bindings: Bindings }>()

/**
 * Analytics Dashboard
 * GET /admin/analytics
 */
app.get('/admin/analytics', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>학습 분석 - 관리자</title>
        <link rel="stylesheet" href="/static/css/app.css" />
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
        <script src="/static/js/auth.js"></script>
    </head>
    <body class="bg-gray-50">
        <!-- 헤더 -->
        <header class="bg-white shadow-sm">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-xl font-bold text-blue-600 hover:text-blue-800 transition-colors">
                        <i class="fas fa-home mr-2"></i>
                        홈으로
                    </a>
                    <h1 class="text-2xl font-bold text-gray-900">학습 분석</h1>
                    <span id="adminName" class="text-gray-700"></span>
                </div>
            </div>
        </header>

        <!-- 메인 컨텐츠 -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            
            <!-- 전체 통계 카드 -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <!-- 총 수강생 -->
                <div class="bg-white rounded-lg shadow-sm p-6">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 p-3 bg-blue-100 rounded-lg">
                            <i class="fas fa-users text-2xl text-blue-600"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm text-gray-600">총 수강생</p>
                            <p id="totalUsers" class="text-2xl font-bold text-gray-900">0</p>
                        </div>
                    </div>
                </div>

                <!-- 수강 신청 -->
                <div class="bg-white rounded-lg shadow-sm p-6">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 p-3 bg-green-100 rounded-lg">
                            <i class="fas fa-user-plus text-2xl text-green-600"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm text-gray-600">총 수강신청</p>
                            <p id="totalEnrollments" class="text-2xl font-bold text-gray-900">0</p>
                        </div>
                    </div>
                </div>

                <!-- 평균 진도율 -->
                <div class="bg-white rounded-lg shadow-sm p-6">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 p-3 bg-yellow-100 rounded-lg">
                            <i class="fas fa-chart-line text-2xl text-yellow-600"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm text-gray-600">평균 진도율</p>
                            <p id="avgCompletionRate" class="text-2xl font-bold text-gray-900">0%</p>
                        </div>
                    </div>
                </div>

                <!-- 수료증 발급 -->
                <div class="bg-white rounded-lg shadow-sm p-6">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 p-3 bg-purple-100 rounded-lg">
                            <i class="fas fa-certificate text-2xl text-purple-600"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm text-gray-600">수료증 발급</p>
                            <p id="certificatesIssued" class="text-2xl font-bold text-gray-900">0</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 차트 섹션 -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <!-- 수강 신청 추이 -->
                <div class="bg-white rounded-lg shadow-sm p-6">
                    <h3 class="text-lg font-bold text-gray-900 mb-4">
                        <i class="fas fa-chart-area mr-2 text-blue-600"></i>
                        수강 신청 추이 (최근 30일)
                    </h3>
                    <canvas id="enrollmentTrendChart" height="200"></canvas>
                </div>

                <!-- 학습 활동 추이 -->
                <div class="bg-white rounded-lg shadow-sm p-6">
                    <h3 class="text-lg font-bold text-gray-900 mb-4">
                        <i class="fas fa-chart-line mr-2 text-green-600"></i>
                        학습 활동 추이 (최근 30일)
                    </h3>
                    <canvas id="activityTrendChart" height="200"></canvas>
                </div>
            </div>

            <!-- 강좌별 분석 -->
            <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold text-gray-900">
                        <i class="fas fa-book mr-2 text-blue-600"></i>
                        강좌별 분석
                    </h3>
                    <select id="courseSelect" onchange="loadCourseAnalytics(this.value)"
                            class="px-4 py-2 border border-gray-300 rounded-lg">
                        <option value="">강좌를 선택하세요</option>
                    </select>
                </div>

                <div id="courseAnalytics" class="hidden">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div class="bg-blue-50 rounded-lg p-4">
                            <p class="text-sm text-gray-600 mb-1">총 수강생</p>
                            <p id="courseEnrollments" class="text-2xl font-bold text-blue-600">0</p>
                        </div>
                        <div class="bg-green-50 rounded-lg p-4">
                            <p class="text-sm text-gray-600 mb-1">완강률</p>
                            <p id="courseCompletionRate" class="text-2xl font-bold text-green-600">0%</p>
                        </div>
                        <div class="bg-purple-50 rounded-lg p-4">
                            <p class="text-sm text-gray-600 mb-1">평균 진도율</p>
                            <p id="courseAvgProgress" class="text-2xl font-bold text-purple-600">0%</p>
                        </div>
                    </div>

                    <!-- 차시별 완료율 차트 -->
                    <div class="mb-6">
                        <h4 class="text-md font-semibold text-gray-900 mb-3">차시별 완료율</h4>
                        <canvas id="lessonCompletionChart" height="100"></canvas>
                    </div>

                    <!-- 우수 학습자 -->
                    <div>
                        <h4 class="text-md font-semibold text-gray-900 mb-3">우수 학습자 Top 10</h4>
                        <div id="topStudentsList" class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">순위</th>
                                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">진도율</th>
                                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">완료 차시</th>
                                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">등록일</th>
                                    </tr>
                                </thead>
                                <tbody id="topStudentsBody" class="bg-white divide-y divide-gray-200">
                                    <!-- Dynamic content -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

        </main>

        <script>
        let enrollmentChart, activityChart, lessonChart;

        async function loadOverview() {
            try {
                const response = await apiRequest('GET', '/api/analytics/overview');
                
                if (response.success) {
                    const stats = response.statistics;
                    
                    document.getElementById('totalUsers').textContent = stats.total_users.toLocaleString();
                    document.getElementById('totalEnrollments').textContent = stats.total_enrollments.toLocaleString();
                    document.getElementById('avgCompletionRate').textContent = stats.avg_completion_rate + '%';
                    document.getElementById('certificatesIssued').textContent = stats.certificates_issued.toLocaleString();
                }
            } catch (error) {
                console.error('Load overview error:', error);
            }
        }

        async function loadTrends() {
            try {
                const response = await apiRequest('GET', '/api/analytics/trends?period=daily');
                
                if (response.success) {
                    renderEnrollmentTrendChart(response.trends.enrollments);
                    renderActivityTrendChart(response.trends.completions);
                }
            } catch (error) {
                console.error('Load trends error:', error);
            }
        }

        function renderEnrollmentTrendChart(data) {
            const ctx = document.getElementById('enrollmentTrendChart').getContext('2d');
            
            if (enrollmentChart) {
                enrollmentChart.destroy();
            }

            enrollmentChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.map(d => d.period),
                    datasets: [{
                        label: '신규 수강신청',
                        data: data.map(d => d.count),
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }

        function renderActivityTrendChart(data) {
            const ctx = document.getElementById('activityTrendChart').getContext('2d');
            
            if (activityChart) {
                activityChart.destroy();
            }

            activityChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.map(d => d.period),
                    datasets: [{
                        label: '완료한 차시 수',
                        data: data.map(d => d.completed_lessons),
                        backgroundColor: 'rgba(34, 197, 94, 0.8)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }

        async function loadCourseList() {
            try {
                const response = await apiRequest('GET', '/api/courses');
                
                if (response.success) {
                    const select = document.getElementById('courseSelect');
                    response.courses.forEach(course => {
                        const option = document.createElement('option');
                        option.value = course.id;
                        option.textContent = course.title;
                        select.appendChild(option);
                    });
                }
            } catch (error) {
                console.error('Load course list error:', error);
            }
        }

        async function loadCourseAnalytics(courseId) {
            if (!courseId) {
                document.getElementById('courseAnalytics').classList.add('hidden');
                return;
            }

            try {
                const response = await apiRequest('GET', \`/api/analytics/courses/\${courseId}\`);
                
                if (response.success) {
                    const stats = response.statistics;
                    
                    document.getElementById('courseEnrollments').textContent = stats.total_enrollments.toLocaleString();
                    document.getElementById('courseCompletionRate').textContent = stats.completion_rate + '%';
                    document.getElementById('courseAvgProgress').textContent = stats.avg_completion_rate + '%';
                    
                    renderLessonCompletionChart(response.lesson_stats);
                    renderTopStudents(response.top_students);
                    
                    document.getElementById('courseAnalytics').classList.remove('hidden');
                }
            } catch (error) {
                console.error('Load course analytics error:', error);
            }
        }

        function renderLessonCompletionChart(lessonStats) {
            const ctx = document.getElementById('lessonCompletionChart').getContext('2d');
            
            if (lessonChart) {
                lessonChart.destroy();
            }

            lessonChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: lessonStats.map(l => \`차시 \${l.lesson_number}\`),
                    datasets: [{
                        label: '평균 시청률 (%)',
                        data: lessonStats.map(l => Math.round(l.avg_watch_percentage || 0)),
                        backgroundColor: 'rgba(147, 51, 234, 0.8)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        }

        function renderTopStudents(students) {
            const tbody = document.getElementById('topStudentsBody');
            
            if (students.length === 0) {
                tbody.innerHTML = \`
                    <tr>
                        <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                            수강생이 없습니다.
                        </td>
                    </tr>
                \`;
                return;
            }

            tbody.innerHTML = students.map((student, index) => {
                const enrolledDate = new Date(student.enrolled_at).toLocaleDateString('ko-KR');
                
                return \`
                    <tr class="hover:bg-gray-50">
                        <td class="px-4 py-3 text-sm font-semibold text-gray-900">\${index + 1}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">\${student.name}</td>
                        <td class="px-4 py-3 text-sm">
                            <div class="flex items-center">
                                <div class="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                    <div class="bg-blue-600 h-2 rounded-full" style="width: \${student.completion_rate}%"></div>
                                </div>
                                <span class="text-gray-900 font-semibold">\${student.completion_rate}%</span>
                            </div>
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-900">\${student.completed_lessons || 0}</td>
                        <td class="px-4 py-3 text-sm text-gray-600">\${enrolledDate}</td>
                    </tr>
                \`;
            }).join('');
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', async () => {
            const user = await getCurrentUser();
            if (!user || user.role !== 'admin') {
                window.location.href = '/login';
                return;
            }

            document.getElementById('adminName').textContent = user.name + ' 님';
            
            loadOverview();
            loadTrends();
            loadCourseList();
        });
        </script>
        <script src="/static/js/security.js"></script>
    </body>
    </html>
  `)
})

export default app
