/**
 * 관리자 대시보드 JavaScript
 */

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
  // 관리자 권한 확인
  const user = await requireAdmin();
  if (!user) return;

  // 관리자 이름 표시
  document.getElementById('adminName').textContent = user.name;

  // 대시보드 데이터 로드
  await loadDashboardData();
});

// 대시보드 데이터 로드
async function loadDashboardData() {
  try {
    // 통계 데이터 가져오기
    const stats = await apiRequest('GET', '/api/admin/dashboard/stats');
    
    if (stats.success) {
      const data = stats.data;
      
      // 통계 업데이트
      document.getElementById('totalUsers').textContent = data.total_users || 0;
      document.getElementById('totalCourses').textContent = data.total_courses || 0;
      document.getElementById('monthlyRevenue').textContent = (data.monthly_revenue || 0).toLocaleString() + '원';
      document.getElementById('activeEnrollments').textContent = data.active_enrollments || 0;
    }

    // 최근 결제 내역
    const payments = await apiRequest('GET', '/api/admin/payments?limit=5');
    if (payments.success) {
      renderRecentPayments(payments.data);
    }

    // 최근 수강신청
    const enrollments = await apiRequest('GET', '/api/admin/enrollments?limit=5');
    if (enrollments.success) {
      renderRecentEnrollments(enrollments.data);
    }
    
  } catch (error) {
    console.error('Dashboard load error:', error);
    showError('대시보드 데이터를 불러오는데 실패했습니다.');
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
