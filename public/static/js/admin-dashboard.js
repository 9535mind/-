/**
 * 관리자 대시보드 JavaScript
 */

let revenueChart = null;
let popularCoursesChart = null;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
  // 관리자 권한 확인
  const user = await requireAdmin();
  if (!user) return;

  if (typeof applyHeaderUserDisplay === 'function') {
    applyHeaderUserDisplay(document.getElementById('adminName'), user)
  }

  // 대시보드 데이터 로드
  await loadDashboardData();
  
  // 차트 초기화
  initCharts();
});

// 대시보드 데이터 로드
async function loadDashboardData() {
  // 통계 데이터 로드 (독립적)
  try {
    const stats = await apiRequest('GET', '/api/admin/dashboard/stats');
    
    if (stats.success) {
      const data = stats.data;
      
      // 통계 업데이트
      document.getElementById('totalUsers').textContent = data.total_users || 0;
      document.getElementById('totalCourses').textContent = data.total_courses || 0;
      document.getElementById('monthlyRevenue').textContent = (data.monthly_revenue || 0).toLocaleString() + '원';
      document.getElementById('activeEnrollments').textContent = data.active_enrollments || 0;
    }
  } catch (error) {
    console.error('Stats load error:', error);
    // 통계 로딩 실패 시에도 다른 섹션은 계속 로드
  }

  // 최근 결제 내역 (독립적)
  try {
    const payments = await apiRequest('GET', '/api/admin/payments?limit=5');
    if (payments.success) {
      renderRecentPayments(payments.data);
    } else {
      renderRecentPayments([]);
    }
  } catch (error) {
    console.error('Payments load error:', error);
    renderRecentPayments([]);
  }

  // 최근 수강신청 (독립적)
  try {
    const enrollments = await apiRequest('GET', '/api/admin/enrollments?limit=5');
    if (enrollments.success) {
      renderRecentEnrollments(enrollments.data);
    } else {
      renderRecentEnrollments([]);
    }
  } catch (error) {
    console.error('Enrollments load error:', error);
    renderRecentEnrollments([]);
  }
}

// 최근 결제 렌더링
function renderRecentPayments(payments) {
  const container = document.getElementById('recentPayments');
  
  if (!payments || payments.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-center py-4">최근 결제가 없습니다.</p>';
    return;
  }

  container.innerHTML = payments.map(payment => `
    <div class="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
      <div>
        <p class="font-semibold text-gray-800">${payment.user_name || '알 수 없음'}</p>
        <p class="text-sm text-gray-600">${payment.course_title || payment.order_name}</p>
      </div>
      <div class="text-right">
        <p class="font-bold text-green-700">${payment.final_amount?.toLocaleString()}원</p>
        <p class="text-xs text-gray-500">${formatDate(payment.paid_at)}</p>
      </div>
    </div>
  `).join('');
}

// 최근 수강신청 렌더링
function renderRecentEnrollments(enrollments) {
  const container = document.getElementById('recentEnrollments');
  
  if (!enrollments || enrollments.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-center py-4">최근 수강신청이 없습니다.</p>';
    return;
  }

  container.innerHTML = enrollments.map(enrollment => `
    <div class="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
      <div>
        <p class="font-semibold text-gray-800">${enrollment.user_name || '알 수 없음'}</p>
        <p class="text-sm text-gray-600">${enrollment.course_title}</p>
      </div>
      <div class="text-right">
        <span class="px-3 py-1 rounded-full text-xs font-semibold ${getStatusClass(enrollment.status)}">
          ${getStatusText(enrollment.status)}
        </span>
        <p class="text-xs text-gray-500 mt-1">${formatDate(enrollment.start_date)}</p>
      </div>
    </div>
  `).join('');
}

// 상태 클래스
function getStatusClass(status) {
  const classes = {
    'active': 'bg-green-100 text-green-800',
    'completed': 'bg-blue-100 text-blue-800',
    'expired': 'bg-gray-100 text-gray-800',
    'refunded': 'bg-red-100 text-red-800'
  };
  return classes[status] || 'bg-gray-100 text-gray-800';
}

// 상태 텍스트
function getStatusText(status) {
  const texts = {
    'active': '수강 중',
    'completed': '수료',
    'expired': '기간 만료',
    'refunded': '환불'
  };
  return texts[status] || status;
}

// 날짜 포맷팅
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 에러 메시지 표시
function showError(message) {
  alert(message);
}

/**
 * 차트 초기화
 */
function initCharts() {
  // 월별 매출 차트
  const revenueCtx = document.getElementById('revenueChart');
  if (revenueCtx) {
    // 샘플 데이터 (실제로는 API에서 가져와야 함)
    const months = ['7월', '8월', '9월', '10월', '11월', '12월'];
    const revenues = [1200000, 1500000, 1350000, 1800000, 2100000, 2400000];
    
    revenueChart = new Chart(revenueCtx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: '매출 (원)',
          data: revenues,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: '#10B981',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 13 },
            callbacks: {
              label: function(context) {
                return '매출: ' + context.parsed.y.toLocaleString() + '원';
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return (value / 1000000) + 'M';
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }
  
  // 인기 강좌 차트
  const popularCtx = document.getElementById('popularCoursesChart');
  if (popularCtx) {
    // 샘플 데이터 (실제로는 API에서 가져와야 함)
    const courseNames = ['Python 기초', '웹 개발', '데이터 분석', 'AI/ML', '디자인'];
    const enrollments = [85, 72, 65, 48, 35];
    
    popularCoursesChart = new Chart(popularCtx, {
      type: 'doughnut',
      data: {
        labels: courseNames,
        datasets: [{
          data: enrollments,
          backgroundColor: [
            '#8B5CF6',
            '#EC4899',
            '#3B82F6',
            '#10B981',
            '#F59E0B'
          ],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              padding: 15,
              font: {
                size: 12
              },
              generateLabels: function(chart) {
                const data = chart.data;
                if (data.labels.length && data.datasets.length) {
                  return data.labels.map((label, i) => {
                    const value = data.datasets[0].data[i];
                    return {
                      text: `${label} (${value}명)`,
                      fillStyle: data.datasets[0].backgroundColor[i],
                      hidden: false,
                      index: i
                    };
                  });
                }
                return [];
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 13 },
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value}명 (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }
}

/**
 * 실제 차트 데이터 로드 및 업데이트 (API 연동)
 */
async function loadChartData() {
  try {
    // 월별 매출 데이터 로드
    const revenueData = await apiRequest('GET', '/api/admin/dashboard/revenue-chart');
    if (revenueData.success && revenueChart) {
      revenueChart.data.labels = revenueData.data.months;
      revenueChart.data.datasets[0].data = revenueData.data.revenues;
      revenueChart.update();
    }
    
    // 인기 강좌 데이터 로드
    const popularData = await apiRequest('GET', '/api/admin/dashboard/popular-courses');
    if (popularData.success && popularCoursesChart) {
      popularCoursesChart.data.labels = popularData.data.courseNames;
      popularCoursesChart.data.datasets[0].data = popularData.data.enrollments;
      popularCoursesChart.update();
    }
  } catch (error) {
    console.error('Chart data load error:', error);
    // 에러 발생 시에도 샘플 데이터로 계속 표시
  }
}

