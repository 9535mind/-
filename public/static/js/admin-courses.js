/**
 * 관리자 강좌 관리 JavaScript
 */

let allCourses = [];

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
  // 관리자 권한 확인
  const user = await requireAdmin();
  if (!user) return;

  // 관리자 이름 표시
  document.getElementById('adminName').textContent = user.name;

  // 강좌 목록 로드
  await loadCourses();

  // 검색/필터 이벤트
  document.getElementById('searchInput').addEventListener('input', filterCourses);
  document.getElementById('statusFilter').addEventListener('change', filterCourses);

  // 폼 제출 이벤트
  document.getElementById('courseForm').addEventListener('submit', handleSubmit);

  // 무료 강좌 체크박스
  document.getElementById('courseIsFree').addEventListener('change', (e) => {
    const priceInput = document.getElementById('coursePrice');
    const discountInput = document.getElementById('courseDiscountPrice');
    if (e.target.checked) {
      priceInput.value = 0;
      discountInput.value = 0;
      priceInput.disabled = true;
      discountInput.disabled = true;
    } else {
      priceInput.disabled = false;
      discountInput.disabled = false;
    }
  });
});

// 강좌 목록 로드
async function loadCourses() {
  try {
    const response = await apiRequest('GET', '/api/courses');
    
    if (response.success) {
      allCourses = response.data;
      renderCourses(allCourses);
    } else {
      showError('강좌 목록을 불러오는데 실패했습니다.');
    }
  } catch (error) {
    console.error('Load courses error:', error);
    showError('강좌 목록을 불러오는데 실패했습니다.');
  }
}

// 강좌 목록 렌더링
function renderCourses(courses) {
  const tbody = document.getElementById('courseList');
  
  if (!courses || courses.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-8 text-gray-500">
          <i class="fas fa-inbox text-4xl mb-2"></i>
          <p>등록된 강좌가 없습니다.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = courses.map(course => {
    const price = course.is_free ? '무료' : 
                  (course.discount_price ? 
                    `<span class="line-through text-gray-400">${course.price?.toLocaleString()}원</span> ${course.discount_price?.toLocaleString()}원` : 
                    `${course.price?.toLocaleString()}원`);
    
    const statusBadge = getStatusBadge(course.status);
    
    return `
      <tr class="border-b hover:bg-gray-50">
        <td class="py-3 px-4">
          <div class="flex items-center">
            ${course.thumbnail_url ? `<img src="${course.thumbnail_url}" class="w-16 h-16 object-cover rounded mr-3" onerror="this.src='https://via.placeholder.com/64'">` : ''}
            <div>
              <p class="font-semibold text-gray-800">${course.title}</p>
              <p class="text-sm text-gray-600">${course.course_type === 'certificate' ? '수료증 과정' : '일반 과정'}</p>
            </div>
          </div>
        </td>
        <td class="py-3 px-4">${price}</td>
        <td class="py-3 px-4">${course.enrolled_count || 0}명</td>
        <td class="py-3 px-4">${statusBadge}</td>
        <td class="py-3 px-4">${formatDate(course.created_at)}</td>
        <td class="py-3 px-4 text-center">
          <button onclick="editCourse(${course.id})" class="text-blue-600 hover:text-blue-800 mr-2" title="수정">
            <i class="fas fa-edit"></i>
          </button>
          <button onclick="manageContent(${course.id})" class="text-green-600 hover:text-green-800 mr-2" title="차시 관리">
            <i class="fas fa-list"></i>
          </button>
          <button onclick="deleteCourse(${course.id})" class="text-red-600 hover:text-red-800" title="삭제">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// 상태 배지
function getStatusBadge(status) {
  const badges = {
    'active': '<span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">활성</span>',
    'inactive': '<span class="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">비활성</span>',
    'draft': '<span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">임시저장</span>'
  };
  return badges[status] || status;
}

// 강좌 필터링
function filterCourses() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const statusFilter = document.getElementById('statusFilter').value;

  const filtered = allCourses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm) || 
                          course.description?.toLowerCase().includes(searchTerm);
    const matchesStatus = !statusFilter || course.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  renderCourses(filtered);
}

// 새 강좌 모달 열기
function openNewCourseModal() {
  document.getElementById('modalTitle').textContent = '새 강좌 등록';
  document.getElementById('courseForm').reset();
  document.getElementById('courseId').value = '';
  document.getElementById('courseModal').classList.remove('hidden');
  document.getElementById('courseModal').classList.add('flex');
}

// 강좌 수정 모달
async function editCourse(courseId) {
  try {
    const response = await apiRequest('GET', `/api/courses/${courseId}`);
    
    if (response.success) {
      const course = response.data;
      
      document.getElementById('modalTitle').textContent = '강좌 수정';
      document.getElementById('courseId').value = course.id;
      document.getElementById('courseTitle').value = course.title;
      document.getElementById('courseDescription').value = course.description || '';
      document.getElementById('courseThumbnail').value = course.thumbnail_url || '';
      document.getElementById('courseType').value = course.course_type || 'general';
      document.getElementById('courseDuration').value = course.duration_days || 30;
      document.getElementById('coursePrice').value = course.price || 0;
      document.getElementById('courseDiscountPrice').value = course.discount_price || 0;
      document.getElementById('courseIsFree').checked = course.is_free === 1;
      document.getElementById('courseIsFeatured').checked = course.is_featured === 1;
      document.getElementById('courseStatus').value = course.status || 'active';
      
      document.getElementById('courseModal').classList.remove('hidden');
      document.getElementById('courseModal').classList.add('flex');
    }
  } catch (error) {
    console.error('Edit course error:', error);
    showError('강좌 정보를 불러오는데 실패했습니다.');
  }
}

// 모달 닫기
function closeCourseModal() {
  document.getElementById('courseModal').classList.add('hidden');
  document.getElementById('courseModal').classList.remove('flex');
}

// 폼 제출 처리
async function handleSubmit(e) {
  e.preventDefault();
  
  const courseId = document.getElementById('courseId').value;
  const formData = {
    title: document.getElementById('courseTitle').value,
    description: document.getElementById('courseDescription').value,
    thumbnail_url: document.getElementById('courseThumbnail').value,
    course_type: document.getElementById('courseType').value,
    duration_days: parseInt(document.getElementById('courseDuration').value),
    price: parseInt(document.getElementById('coursePrice').value) || 0,
    discount_price: parseInt(document.getElementById('courseDiscountPrice').value) || 0,
    is_free: document.getElementById('courseIsFree').checked ? 1 : 0,
    is_featured: document.getElementById('courseIsFeatured').checked ? 1 : 0,
    status: document.getElementById('courseStatus').value
  };

  try {
    let response;
    if (courseId) {
      // 수정
      response = await apiRequest('PUT', `/api/admin/courses/${courseId}`, formData);
    } else {
      // 등록
      response = await apiRequest('POST', '/api/admin/courses', formData);
    }

    if (response.success) {
      alert(courseId ? '강좌가 수정되었습니다.' : '강좌가 등록되었습니다.');
      closeCourseModal();
      await loadCourses();
    } else {
      showError(response.error || '저장에 실패했습니다.');
    }
  } catch (error) {
    console.error('Save course error:', error);
    showError('저장에 실패했습니다.');
  }
}

// 강좌 삭제
async function deleteCourse(courseId) {
  if (!confirm('정말 이 강좌를 삭제하시겠습니까?\n수강생이 있는 경우 삭제할 수 없습니다.')) {
    return;
  }

  try {
    const response = await apiRequest('DELETE', `/api/admin/courses/${courseId}`);
    
    if (response.success) {
      alert('강좌가 삭제되었습니다.');
      await loadCourses();
    } else {
      showError(response.error || '삭제에 실패했습니다.');
    }
  } catch (error) {
    console.error('Delete course error:', error);
    showError('삭제에 실패했습니다.');
  }
}

// 차시 관리 페이지로 이동
function manageContent(courseId) {
  window.location.href = `/admin/courses/${courseId}/lessons`;
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
