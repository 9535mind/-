/**
 * 관리자 강좌 관리 JavaScript
 */

let allCourses = [];
let currentImageTab = 'url';  // 현재 선택된 탭 ('url' 또는 'upload')

// 탭 전환
function switchImageTab(tab) {
  currentImageTab = tab;
  
  // 탭 버튼 스타일 변경
  const urlTab = document.getElementById('urlTab');
  const uploadTab = document.getElementById('uploadTab');
  
  if (tab === 'url') {
    urlTab.classList.add('border-b-2', 'border-purple-700', 'text-purple-700', 'font-semibold');
    urlTab.classList.remove('text-gray-600');
    uploadTab.classList.remove('border-b-2', 'border-purple-700', 'text-purple-700', 'font-semibold');
    uploadTab.classList.add('text-gray-600');
    
    document.getElementById('urlSection').classList.remove('hidden');
    document.getElementById('uploadSection').classList.add('hidden');
  } else {
    uploadTab.classList.add('border-b-2', 'border-purple-700', 'text-purple-700', 'font-semibold');
    uploadTab.classList.remove('text-gray-600');
    urlTab.classList.remove('border-b-2', 'border-purple-700', 'text-purple-700', 'font-semibold');
    urlTab.classList.add('text-gray-600');
    
    document.getElementById('uploadSection').classList.remove('hidden');
    document.getElementById('urlSection').classList.add('hidden');
  }
}

// 이미지 업로드
async function uploadImage() {
  const fileInput = document.getElementById('courseThumbnailFile');
  const file = fileInput.files[0];
  
  if (!file) {
    alert('파일을 선택해주세요.');
    return;
  }
  
  // 진행 바 표시
  document.getElementById('uploadProgress').classList.remove('hidden');
  
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = AuthManager.getSessionToken();
    const response = await fetch('/api/upload/image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      // 업로드 성공 - URL을 courseThumbnail 필드에 설정
      document.getElementById('courseThumbnail').value = result.data.url;
      
      // 미리보기 표시
      showThumbnailPreview(result.data.url);
      
      alert('이미지가 업로드되었습니다.');
    } else {
      alert(result.error || '이미지 업로드에 실패했습니다.');
    }
  } catch (error) {
    console.error('Upload error:', error);
    alert('이미지 업로드에 실패했습니다.');
  } finally {
    // 진행 바 숨기기
    document.getElementById('uploadProgress').classList.add('hidden');
  }
}

// 썸네일 미리보기 표시
function showThumbnailPreview(url) {
  const preview = document.getElementById('thumbnailPreview');
  const previewImage = document.getElementById('previewImage');
  
  previewImage.src = url;
  preview.classList.remove('hidden');
}

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

  // 썸네일 URL 입력 시 미리보기
  document.getElementById('courseThumbnail').addEventListener('input', (e) => {
    const url = e.target.value;
    if (url) {
      showThumbnailPreview(url);
    } else {
      document.getElementById('thumbnailPreview').classList.add('hidden');
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
              <!-- 펼침/접기 버튼 -->
              <button onclick="toggleCourseDetails(${course.id}, event)" class="mt-2 text-xs text-purple-600 hover:text-purple-800 flex items-center">
                <i id="toggle-icon-${course.id}" class="fas fa-chevron-down mr-1"></i>
                <span id="toggle-text-${course.id}">강좌 내용 보기</span>
              </button>
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
      <!-- 강좌 상세 내용 (차시 목록) -->
      <tr id="course-details-${course.id}" class="hidden">
        <td colspan="6" class="bg-gray-50 py-4 px-8">
          <div class="border-l-4 border-purple-600 pl-4">
            <div class="flex justify-between items-center mb-3">
              <h4 class="font-semibold text-gray-800">
                <i class="fas fa-list-ol mr-2 text-purple-600"></i>
                차시 목록
              </h4>
              <button onclick="manageContent(${course.id})" class="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700">
                <i class="fas fa-cog mr-1"></i>차시 관리
              </button>
            </div>
            <div id="lesson-preview-${course.id}" class="text-sm">
              <div class="text-center py-4 text-gray-500">
                <i class="fas fa-spinner fa-spin mr-2"></i>
                차시 목록 로딩 중...
              </div>
            </div>
          </div>
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
  
  // 차시 미리보기 섹션 숨김 (새 강좌는 차시가 없음)
  document.getElementById('lessonPreviewSection').classList.add('hidden');
  
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
      
      // 차시 미리보기 섹션 표시
      document.getElementById('lessonPreviewSection').classList.remove('hidden');
      
      // 차시 목록 로드
      refreshLessonPreview();
      
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

// AI 도우미 모달 열기
function openAIAssistantModal() {
  document.getElementById('aiAssistantModal').classList.remove('hidden');
  document.getElementById('aiAssistantModal').classList.add('flex');
  document.getElementById('aiAssistantForm').classList.remove('hidden');
  document.getElementById('aiGenerating').classList.add('hidden');
}

// AI 도우미 모달 닫기
function closeAIAssistantModal() {
  document.getElementById('aiAssistantModal').classList.add('hidden');
  document.getElementById('aiAssistantModal').classList.remove('flex');
  document.getElementById('aiAssistantForm').reset();
}

// AI 폼 제출
document.addEventListener('DOMContentLoaded', () => {
  const aiForm = document.getElementById('aiAssistantForm');
  if (aiForm) {
    aiForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const topic = document.getElementById('aiTopic').value;
      const targetAudience = document.getElementById('aiTargetAudience').value;
      const difficulty = document.getElementById('aiDifficulty').value;
      const duration = parseInt(document.getElementById('aiDuration').value);
      
      // 생성 중 표시
      document.getElementById('aiAssistantForm').classList.add('hidden');
      document.getElementById('aiGenerating').classList.remove('hidden');
      
      try {
        const response = await apiRequest('POST', '/api/ai/generate-course', {
          topic,
          target_audience: targetAudience,
          difficulty,
          duration
        });
        
        if (response.success) {
          const courseData = response.data;
          
          // AI 모달 닫기
          closeAIAssistantModal();
          
          // 강좌 등록 모달 열기 및 데이터 채우기
          openNewCourseModal();
          document.getElementById('courseTitle').value = courseData.title;
          document.getElementById('courseDescription').value = courseData.description;
          document.getElementById('courseType').value = courseData.course_type;
          document.getElementById('courseDuration').value = duration;
          
          // 차시 정보를 저장 (나중에 차시 추가 시 사용)
          sessionStorage.setItem('aiGeneratedLessons', JSON.stringify(courseData.lessons));
          
          alert('AI가 강좌를 생성했습니다! 내용을 확인하고 수정 후 저장해주세요.\n\n💡 강좌 저장 후 차시 관리에서 AI가 생성한 차시를 추가할 수 있습니다.');
        } else {
          showError(response.error || 'AI 생성에 실패했습니다.');
          document.getElementById('aiAssistantForm').classList.remove('hidden');
          document.getElementById('aiGenerating').classList.add('hidden');
        }
      } catch (error) {
        console.error('AI generation error:', error);
        showError('AI 생성에 실패했습니다. OpenAI API 키가 설정되어 있는지 확인해주세요.');
        document.getElementById('aiAssistantForm').classList.remove('hidden');
        document.getElementById('aiGenerating').classList.add('hidden');
      }
    });
  }
});

/**
 * 차시 목록 미리보기 새로고침
 */
async function refreshLessonPreview() {
  const courseId = document.getElementById('courseId').value;
  if (!courseId) return;
  
  const listContainer = document.getElementById('lessonPreviewList');
  listContainer.innerHTML = '<div class="text-center text-gray-500 py-4"><i class="fas fa-spinner fa-spin mr-2"></i>로딩 중...</div>';
  
  try {
    const response = await apiRequest('GET', `/api/courses/${courseId}/lessons`);
    
    if (response.success && response.data) {
      const lessons = response.data;
      document.getElementById('previewLessonCount').textContent = lessons.length;
      
      if (lessons.length === 0) {
        listContainer.innerHTML = `
          <div class="text-center text-gray-500 py-8">
            <i class="fas fa-inbox text-3xl mb-2"></i>
            <p>등록된 차시가 없습니다.</p>
            <p class="text-sm mt-2">차시 관리 페이지에서 차시를 추가하세요.</p>
          </div>
        `;
      } else {
        listContainer.innerHTML = lessons.map(lesson => `
          <div class="flex items-center justify-between bg-white p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <div class="flex items-center flex-1">
              <span class="bg-purple-100 text-purple-700 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm mr-3">
                ${lesson.lesson_number}
              </span>
              <div class="flex-1">
                <p class="font-medium text-gray-800">${lesson.title}</p>
                <div class="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                  ${lesson.video_duration_minutes ? `<span><i class="fas fa-clock mr-1"></i>${lesson.video_duration_minutes}분</span>` : ''}
                  ${lesson.video_url ? '<span class="text-green-600"><i class="fas fa-video mr-1"></i>영상 있음</span>' : '<span class="text-gray-400"><i class="fas fa-video-slash mr-1"></i>영상 없음</span>'}
                  ${lesson.is_free_preview === 1 ? '<span class="bg-green-100 text-green-800 px-2 py-0.5 rounded"><i class="fas fa-unlock mr-1"></i>무료</span>' : ''}
                  ${lesson.status !== 'active' ? '<span class="bg-gray-100 text-gray-800 px-2 py-0.5 rounded"><i class="fas fa-eye-slash mr-1"></i>비공개</span>' : ''}
                </div>
              </div>
            </div>
          </div>
        `).join('');
      }
    } else {
      listContainer.innerHTML = '<div class="text-center text-red-500 py-4"><i class="fas fa-exclamation-circle mr-2"></i>차시 목록을 불러오는데 실패했습니다.</div>';
    }
  } catch (error) {
    console.error('Load lessons preview error:', error);
    listContainer.innerHTML = '<div class="text-center text-red-500 py-4"><i class="fas fa-exclamation-circle mr-2"></i>차시 목록을 불러오는데 실패했습니다.</div>';
  }
}

/**
 * 차시 관리 페이지로 이동
 */
function goToLessonManagement() {
  const courseId = document.getElementById('courseId').value;
  if (courseId) {
    window.location.href = `/admin/courses/${courseId}/lessons`;
  }
}

/**
 * 강좌 상세 내용 펼침/접기
 */
let expandedCourses = {}; // 펼쳐진 강좌 ID 추적

async function toggleCourseDetails(courseId, event) {
  event.preventDefault();
  event.stopPropagation();
  
  const detailsRow = document.getElementById(`course-details-${courseId}`);
  const toggleIcon = document.getElementById(`toggle-icon-${courseId}`);
  const toggleText = document.getElementById(`toggle-text-${courseId}`);
  
  // 펼침/접기 토글
  if (detailsRow.classList.contains('hidden')) {
    // 펼치기
    detailsRow.classList.remove('hidden');
    toggleIcon.classList.remove('fa-chevron-down');
    toggleIcon.classList.add('fa-chevron-up');
    toggleText.textContent = '강좌 내용 숨기기';
    
    // 차시 목록 로드 (처음 펼칠 때만)
    if (!expandedCourses[courseId]) {
      await loadCourseLessons(courseId);
      expandedCourses[courseId] = true;
    }
  } else {
    // 접기
    detailsRow.classList.add('hidden');
    toggleIcon.classList.remove('fa-chevron-up');
    toggleIcon.classList.add('fa-chevron-down');
    toggleText.textContent = '강좌 내용 보기';
  }
}

/**
 * 특정 강좌의 차시 목록 로드
 */
async function loadCourseLessons(courseId) {
  const previewContainer = document.getElementById(`lesson-preview-${courseId}`);
  
  try {
    const response = await apiRequest('GET', `/api/courses/${courseId}/lessons`);
    
    if (response.success && response.data) {
      const lessons = response.data;
      
      if (lessons.length === 0) {
        previewContainer.innerHTML = `
          <div class="text-center py-4 text-gray-500">
            <i class="fas fa-inbox text-2xl mb-2"></i>
            <p>등록된 차시가 없습니다.</p>
            <button onclick="manageContent(${courseId})" class="mt-2 text-purple-600 hover:text-purple-800 text-sm">
              <i class="fas fa-plus mr-1"></i>차시 추가하기
            </button>
          </div>
        `;
        return;
      }
      
      // 차시 목록 렌더링
      previewContainer.innerHTML = `
        <div class="space-y-2">
          ${lessons.map((lesson, index) => `
            <div class="flex items-start p-3 bg-white rounded border hover:border-purple-400 transition-colors">
              <div class="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-semibold mr-3">
                ${lesson.lesson_number}
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-800 truncate">${lesson.title}</p>
                <div class="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                  ${lesson.video_duration_minutes ? `<span><i class="fas fa-clock mr-1"></i>${lesson.video_duration_minutes}분</span>` : ''}
                  ${lesson.video_url ? '<span class="text-green-600"><i class="fas fa-video mr-1"></i>영상</span>' : '<span class="text-gray-400"><i class="fas fa-video-slash mr-1"></i>영상 없음</span>'}
                  ${lesson.is_free_preview === 1 ? '<span class="text-green-600"><i class="fas fa-unlock mr-1"></i>무료</span>' : ''}
                  ${lesson.status !== 'active' ? '<span class="text-gray-400"><i class="fas fa-eye-slash mr-1"></i>비공개</span>' : ''}
                </div>
              </div>
              <button onclick="window.location.href='/admin/courses/${courseId}/lessons'" class="ml-2 text-gray-400 hover:text-purple-600" title="차시 수정">
                <i class="fas fa-edit"></i>
              </button>
            </div>
          `).join('')}
        </div>
        <div class="mt-4 text-center">
          <button onclick="manageContent(${courseId})" class="text-sm text-purple-600 hover:text-purple-800">
            <i class="fas fa-arrow-right mr-1"></i>
            전체 차시 관리 페이지로 이동
          </button>
        </div>
      `;
    } else {
      throw new Error(response.error || '차시 목록을 불러올 수 없습니다.');
    }
  } catch (error) {
    console.error('Load lessons error:', error);
    previewContainer.innerHTML = `
      <div class="text-center py-4 text-red-500">
        <i class="fas fa-exclamation-circle mr-2"></i>
        차시 목록을 불러오는데 실패했습니다.
        <button onclick="loadCourseLessons(${courseId})" class="block mx-auto mt-2 text-sm text-purple-600 hover:text-purple-800">
          <i class="fas fa-redo mr-1"></i>다시 시도
        </button>
      </div>
    `;
  }
}
