/**
 * 관리자 강좌 관리 JavaScript
 */

let allCourses = [];
let currentImageTab = 'video';  // 현재 선택된 탭 ('video', 'url', 'upload')

// 탭 전환
function switchImageTab(tab) {
  currentImageTab = tab;
  
  // 탭 버튼 스타일 변경
  const videoTab = document.getElementById('videoTab');
  const urlTab = document.getElementById('urlTab');
  const uploadTab = document.getElementById('uploadTab');
  
  const tabs = [
    { element: videoTab, section: 'videoSection', name: 'video' },
    { element: urlTab, section: 'urlSection', name: 'url' },
    { element: uploadTab, section: 'uploadSection', name: 'upload' }
  ];
  
  tabs.forEach(({ element, section, name }) => {
    if (name === tab) {
      element.classList.add('border-b-2', 'border-purple-700', 'text-purple-700', 'font-semibold');
      element.classList.remove('text-gray-600');
      document.getElementById(section).classList.remove('hidden');
    } else {
      element.classList.remove('border-b-2', 'border-purple-700', 'text-purple-700', 'font-semibold');
      element.classList.add('text-gray-600');
      document.getElementById(section).classList.add('hidden');
    }
  });
}

// 이미지 업로드
async function uploadImage() {
  const fileInput = document.getElementById('courseThumbnailFile');
  const file = fileInput.files[0];
  
  console.log('[DEBUG] 이미지 업로드 시작');
  console.log('[DEBUG] 파일:', file);
  
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
    console.log('[DEBUG] 토큰:', token ? '있음' : '없음');
    
    const response = await fetch('/api/upload/image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    console.log('[DEBUG] 응답 상태:', response.status);
    
    const result = await response.json();
    console.log('[DEBUG] 응답 결과:', result);
    
    if (result.success) {
      // 업로드 성공 - URL을 courseThumbnail 필드에 설정
      const imageUrl = result.data.url;
      console.log('[DEBUG] 이미지 URL:', imageUrl);
      
      document.getElementById('courseThumbnail').value = imageUrl;
      console.log('[DEBUG] courseThumbnail 필드 값:', document.getElementById('courseThumbnail').value);
      
      // 미리보기 표시
      showThumbnailPreview(imageUrl);
      
      alert('이미지가 업로드되었습니다.\n저장 버튼을 클릭하여 강좌를 저장해주세요.');
    } else {
      console.error('[DEBUG] 업로드 실패:', result.error);
      alert(result.error || '이미지 업로드에 실패했습니다.');
    }
  } catch (error) {
    console.error('[DEBUG] Upload error:', error);
    alert('이미지 업로드에 실패했습니다: ' + error.message);
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

// URL 입력 시 미리보기
function previewThumbnailUrl(url) {
  if (!url || url.length < 10) {
    document.getElementById('thumbnailPreview').classList.add('hidden');
    return;
  }
  
  // URL 유효성 검사 (http 또는 https로 시작)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    showThumbnailPreview(url);
  }
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
  console.log('[DEBUG] renderCourses 호출됨, 강좌 수:', courses?.length);
  console.log('[DEBUG] 첫 번째 강좌:', courses?.[0]);
  
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
    console.log('[DEBUG] 강좌 렌더링:', course.id, course.title);
    const price = course.is_free ? '무료' : 
                  (course.discount_price ? 
                    `<span class="line-through text-gray-400">${course.price?.toLocaleString()}원</span> ${course.discount_price?.toLocaleString()}원` : 
                    `${course.price?.toLocaleString()}원`);
    
    const statusBadge = getStatusBadge(course.status);
    
    // 썸네일 처리: URL이 없거나 로딩 실패 시 기본 썸네일 생성
    const thumbnailHtml = getThumbnailHtml(course);
    
    return `
      <tr class="border-b hover:bg-gray-50">
        <td class="py-3 px-4">
          <div class="flex items-center">
            ${thumbnailHtml}
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
  
  // 썸네일 미리보기 숨김
  document.getElementById('thumbnailPreview').classList.add('hidden');
  
  // 차시 미리보기 섹션 숨김 (새 강좌는 차시가 없음)
  document.getElementById('lessonPreviewSection').classList.add('hidden');
  
  document.getElementById('courseModal').classList.remove('hidden');
  document.getElementById('courseModal').classList.add('flex');
  
  // 모달 드래그 기능 초기화 (admin-courses-drag.js에서 처리)
  if (typeof initModalDrag === 'function') {
    initModalDrag();
  }
}

// 강좌 수정 모달
async function editCourse(courseId) {
  try {
    const response = await apiRequest('GET', `/api/courses/${courseId}`);
    
    if (response.success) {
      // API 응답 구조: response.data.course (not response.data directly)
      const course = response.data.course || response.data;
      
      console.log('[DEBUG] editCourse - course:', course);
      console.log('[DEBUG] editCourse - course.title:', course.title);
      
      document.getElementById('modalTitle').textContent = `강좌 수정: ${course.title}`;
      document.getElementById('courseId').value = course.id;
      document.getElementById('courseTitle').value = course.title || '';
      document.getElementById('courseDescription').value = course.description || '';
      document.getElementById('courseThumbnail').value = course.thumbnail_url || '';
      document.getElementById('courseType').value = course.course_type || 'general';
      document.getElementById('courseDuration').value = course.duration_days || 30;
      document.getElementById('coursePrice').value = course.price || 0;
      document.getElementById('courseDiscountPrice').value = course.discount_price || 0;
      document.getElementById('courseIsFree').checked = course.is_free === 1;
      document.getElementById('courseIsFeatured').checked = course.is_featured === 1;
      document.getElementById('courseStatus').value = course.status || 'active';
      
      // 썸네일 미리보기 표시
      if (course.thumbnail_url) {
        showThumbnailPreview(course.thumbnail_url);
      }
      
      // 차시 미리보기 섹션 표시
      document.getElementById('lessonPreviewSection').classList.remove('hidden');
      
      // 차시 목록 로드
      refreshLessonPreview();
      
      document.getElementById('courseModal').classList.remove('hidden');
      document.getElementById('courseModal').classList.add('flex');
      
      // 모달 드래그 기능 초기화 (admin-courses-drag.js에서 처리)
      if (typeof initModalDrag === 'function') {
        initModalDrag();
      }
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
  const thumbnailUrl = document.getElementById('courseThumbnail').value;
  
  console.log('[DEBUG] 강좌 저장 시작');
  console.log('[DEBUG] courseId:', courseId);
  console.log('[DEBUG] thumbnail_url:', thumbnailUrl);
  
  const formData = {
    title: document.getElementById('courseTitle').value,
    description: document.getElementById('courseDescription').value,
    thumbnail_url: thumbnailUrl,
    course_type: document.getElementById('courseType').value,
    duration_days: parseInt(document.getElementById('courseDuration').value),
    price: parseInt(document.getElementById('coursePrice').value) || 0,
    discount_price: parseInt(document.getElementById('courseDiscountPrice').value) || 0,
    is_free: document.getElementById('courseIsFree').checked ? 1 : 0,
    is_featured: document.getElementById('courseIsFeatured').checked ? 1 : 0,
    status: document.getElementById('courseStatus').value
  };
  
  console.log('[DEBUG] formData:', formData);

  try {
    let response;
    if (courseId) {
      // 수정
      console.log('[DEBUG] 강좌 수정 API 호출');
      response = await apiRequest('PUT', `/api/admin/courses/${courseId}`, formData);
    } else {
      // 등록
      console.log('[DEBUG] 강좌 등록 API 호출');
      response = await apiRequest('POST', '/api/admin/courses', formData);
    }
    
    console.log('[DEBUG] API 응답:', response);

    if (response.success) {
      alert(courseId ? '강좌가 수정되었습니다.' : '강좌가 등록되었습니다.');
      closeCourseModal();
      await loadCourses();
    } else {
      console.error('[DEBUG] 저장 실패:', response.error);
      showError(response.error || '저장에 실패했습니다.');
    }
  } catch (error) {
    console.error('[DEBUG] Save course error:', error);
    showError('저장에 실패했습니다: ' + error.message);
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
  console.log('[DEBUG] toggleCourseDetails 호출됨, courseId:', courseId, 'type:', typeof courseId);
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
  console.log('[DEBUG] loadCourseLessons 호출됨, courseId:', courseId);
  const previewContainer = document.getElementById(`lesson-preview-${courseId}`);
  console.log('[DEBUG] previewContainer:', previewContainer);
  
  try {
    console.log('[DEBUG] API 요청:', `/api/courses/${courseId}/lessons`);
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

// AI 기반 강좌 설명 생성
async function generateDescription() {
  const titleInput = document.getElementById('courseTitle');
  const descriptionTextarea = document.getElementById('courseDescription');
  
  const title = titleInput.value.trim();
  
  if (!title) {
    alert('먼저 강좌명을 입력해주세요.');
    titleInput.focus();
    return;
  }
  
  // 로딩 상태 표시
  const originalText = descriptionTextarea.value;
  descriptionTextarea.value = '🤖 AI가 설명을 생성하고 있습니다...';
  descriptionTextarea.disabled = true;
  
  try {
    const response = await apiRequest('POST', '/api/ai/generate-description', {
      title: title,
      context: 'course' // 강좌 설명임을 명시
    });
    
    if (response.success && response.data.description) {
      descriptionTextarea.value = response.data.description;
    } else {
      throw new Error(response.message || 'AI 설명 생성에 실패했습니다.');
    }
  } catch (error) {
    console.error('Generate description error:', error);
    alert('AI 설명 생성에 실패했습니다.\n\n' + (error.message || '서버 오류가 발생했습니다.') + '\n\n직접 입력해주세요.');
    descriptionTextarea.value = originalText; // 원래 텍스트 복구
  } finally {
    descriptionTextarea.disabled = false;
  }
}

// 썸네일 HTML 생성 (Fallback 포함)
function getThumbnailHtml(course) {
  if (course.thumbnail_url) {
    // 외부 URL 또는 로컬 경로
    return `<img src="${course.thumbnail_url}" 
                 class="w-16 h-16 object-cover rounded mr-3" 
                 onerror="this.onerror=null; this.outerHTML=getDefaultThumbnailHtml('${escapeHtml(course.title)}')"
                 alt="${escapeHtml(course.title)}">`;
  } else {
    // 썸네일이 없으면 기본 썸네일 생성
    return getDefaultThumbnailHtml(course.title);
  }
}

// 기본 썸네일 HTML (강좌 제목 첫 글자)
function getDefaultThumbnailHtml(title) {
  const firstChar = title.charAt(0).toUpperCase();
  const colors = ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];
  const color = colors[title.charCodeAt(0) % colors.length];
  
  return `<div class="w-16 h-16 rounded mr-3 flex items-center justify-center text-white font-bold text-2xl" 
               style="background-color: ${color}">
            ${firstChar}
          </div>`;
}

// HTML 이스케이프 (XSS 방지)
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 동영상 썸네일 자동 추출
async function extractVideoThumbnail() {
  const courseId = document.getElementById('courseId').value;
  
  if (!courseId) {
    alert('먼저 강좌를 저장한 후에 썸네일을 추출해주세요.');
    return;
  }
  
  // 진행 상태 표시
  const progressDiv = document.getElementById('videoThumbnailProgress');
  const progressBar = document.getElementById('videoThumbnailProgressBar');
  progressDiv.classList.remove('hidden');
  progressBar.style.width = '30%';
  
  try {
    const response = await apiRequest('POST', `/api/courses/${courseId}/extract-thumbnail`);
    
    progressBar.style.width = '100%';
    
    if (response.success && response.data.thumbnail_url) {
      // 썸네일 URL 설정
      document.getElementById('courseThumbnail').value = response.data.thumbnail_url;
      
      // 미리보기 표시
      showThumbnailPreview(response.data.thumbnail_url);
      
      alert('✅ 동영상 썸네일이 추출되었습니다!\n저장 버튼을 클릭하여 변경사항을 저장하세요.');
    } else {
      throw new Error(response.message || '썸네일 추출에 실패했습니다.');
    }
  } catch (error) {
    console.error('Extract thumbnail error:', error);
    alert('썸네일 추출에 실패했습니다.\n\n원인:\n' + 
          '1. 강좌에 영상이 업로드되지 않았을 수 있습니다.\n' +
          '2. 영상 형식이 지원되지 않을 수 있습니다.\n' +
          '3. 서버 오류가 발생했을 수 있습니다.\n\n' +
          '다른 방법으로 썸네일을 업로드해주세요.');
  } finally {
    progressDiv.classList.add('hidden');
    progressBar.style.width = '0%';
  }
}
