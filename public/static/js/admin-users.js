/**
 * 관리자 회원 관리 JavaScript
 */

let currentPage = 1;
let totalPages = 1;
let currentUserId = null;
let currentUserName = '';

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
  // 관리자 권한 확인
  const user = await requireAdmin();
  if (!user) return;

  // 관리자 이름 표시
  if (typeof applyHeaderUserDisplay === 'function') {
    applyHeaderUserDisplay(document.getElementById('adminName'), user)
  }

  // 회원 목록 로드
  await loadUsers();

  // 비밀번호 재설정 방식 라디오 버튼 이벤트
  document.querySelectorAll('input[name="resetMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const isManual = e.target.value === 'manual';
      document.getElementById('manualPasswordInput').classList.toggle('hidden', !isManual);
      document.getElementById('generatedPasswordDisplay').classList.add('hidden');
    });
  });

  // Enter 키로 검색
  document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchUsers();
    }
  });
});

// 회원 목록 로드
async function loadUsers(page = 1) {
  try {
    const searchQuery = document.getElementById('searchInput').value;
    const roleFilter = document.getElementById('roleFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;

    let url = `/api/admin/users?page=${page}&limit=20`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
    if (roleFilter) url += `&role=${roleFilter}`;
    if (statusFilter) url += `&status=${statusFilter}`;

    const response = await apiRequest('GET', url);
    
    if (response.success) {
      currentPage = response.pagination.page;
      totalPages = response.pagination.totalPages;
      
      renderUsers(response.data);
      updatePagination(response.pagination);
    }
  } catch (error) {
    console.error('Load users error:', error);
    showNotification('회원 목록을 불러오는데 실패했습니다.', 'error');
  }
}

// 회원 목록 렌더링
function renderUsers(users) {
  const tbody = document.getElementById('usersTableBody');
  
  if (!users || users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="px-6 py-8 text-center text-gray-500">
          <i class="fas fa-users text-4xl mb-2 text-gray-300"></i>
          <p>등록된 회원이 없습니다.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = users.map(user => `
    <tr class="hover:bg-gray-50">
      <td class="px-6 py-4 text-sm text-gray-900">${user.id}</td>
      <td class="px-6 py-4">
        <div class="flex items-center">
          <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
            <i class="fas fa-user text-indigo-600 text-xs"></i>
          </div>
          <span class="text-sm font-medium text-gray-900">${user.name}</span>
        </div>
      </td>
      <td class="px-6 py-4 text-sm text-gray-600">${user.email}</td>
      <td class="px-6 py-4 text-sm text-gray-600">${user.phone || '-'}</td>
      <td class="px-6 py-4">
        <span class="px-2 py-1 text-xs rounded-full ${
          user.role === 'admin' 
            ? 'bg-red-100 text-red-800' 
            : 'bg-blue-100 text-blue-800'
        }">
          ${user.role === 'admin' ? '관리자' : '학습자'}
        </span>
      </td>
      <td class="px-6 py-4 text-sm text-gray-600">${formatDate(user.created_at)}</td>
      <td class="px-6 py-4">
        <div class="flex space-x-2">
          <button 
            onclick="openResetPasswordModal(${user.id}, '${user.name}')" 
            class="text-indigo-600 hover:text-indigo-800 text-sm"
            title="비밀번호 재설정"
          >
            <i class="fas fa-key"></i>
          </button>
          <button 
            onclick="viewUserDetail(${user.id})" 
            class="text-blue-600 hover:text-blue-800 text-sm"
            title="상세보기"
          >
            <i class="fas fa-eye"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// 페이지네이션 업데이트
function updatePagination(pagination) {
  document.getElementById('totalCount').textContent = pagination.total;
  document.getElementById('pageInfo').textContent = 
    `${(pagination.page - 1) * pagination.limit + 1}-${Math.min(pagination.page * pagination.limit, pagination.total)} / ${pagination.total}`;
  document.getElementById('currentPage').textContent = `${pagination.page} / ${pagination.totalPages}`;
  
  document.getElementById('prevPage').disabled = pagination.page === 1;
  document.getElementById('nextPage').disabled = pagination.page === pagination.totalPages;
}

// 검색
function searchUsers() {
  currentPage = 1;
  loadUsers(currentPage);
}

// 페이지 변경
function changePage(direction) {
  const newPage = currentPage + direction;
  if (newPage >= 1 && newPage <= totalPages) {
    loadUsers(newPage);
  }
}

// 비밀번호 재설정 모달 열기
function openResetPasswordModal(userId, userName) {
  currentUserId = userId;
  currentUserName = userName;
  
  document.getElementById('resetUserName').textContent = userName;
  document.getElementById('manualPasswordInput').classList.add('hidden');
  document.getElementById('generatedPasswordDisplay').classList.add('hidden');
  document.getElementById('manualPassword').value = '';
  
  // AI 모드로 초기화
  document.querySelector('input[name="resetMode"][value="ai"]').checked = true;
  
  document.getElementById('resetPasswordModal').classList.remove('hidden');
}

// 비밀번호 재설정 모달 닫기
function closeResetPasswordModal() {
  document.getElementById('resetPasswordModal').classList.add('hidden');
  currentUserId = null;
  currentUserName = '';
}

// 비밀번호 재설정
async function resetPassword() {
  if (!currentUserId) return;

  const mode = document.querySelector('input[name="resetMode"]:checked').value;
  const resetBtn = document.getElementById('resetPasswordBtn');
  
  try {
    resetBtn.disabled = true;
    resetBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>처리 중...';

    const response = await apiRequest('POST', `/api/admin/users/${currentUserId}/reset-password`, {
      mode: mode
    });

    if (response.success) {
      const newPassword = response.data.new_password;
      
      // 생성된 비밀번호 표시
      document.getElementById('generatedPassword').textContent = newPassword;
      document.getElementById('generatedPasswordDisplay').classList.remove('hidden');
      
      showNotification(`${currentUserName}님의 비밀번호가 재설정되었습니다.`, 'success');
      
      // 버튼 텍스트 변경
      resetBtn.innerHTML = '<i class="fas fa-check mr-2"></i>완료';
      
      // 3초 후 모달 닫기
      setTimeout(() => {
        closeResetPasswordModal();
      }, 3000);
    } else {
      throw new Error(response.error || '비밀번호 재설정 실패');
    }
  } catch (error) {
    console.error('Reset password error:', error);
    showNotification(error.message || '비밀번호 재설정에 실패했습니다.', 'error');
    
    resetBtn.disabled = false;
    resetBtn.innerHTML = '<i class="fas fa-check mr-2"></i>재설정';
  }
}

// 비밀번호 복사
function copyPassword() {
  const password = document.getElementById('generatedPassword').textContent;
  
  navigator.clipboard.writeText(password).then(() => {
    showNotification('비밀번호가 클립보드에 복사되었습니다.', 'success');
  }).catch(err => {
    console.error('Copy failed:', err);
    showNotification('복사에 실패했습니다.', 'error');
  });
}

// 회원 상세보기 (추후 구현)
function viewUserDetail(userId) {
  showNotification('회원 상세보기 기능은 준비 중입니다.', 'info');
}

// 알림 표시
function showNotification(message, type = 'info') {
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  };
  
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}
