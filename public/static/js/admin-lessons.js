/**
 * 차시 관리 JavaScript (YouTube 전용 - Phase 2 Simplified)
 */

/**
 * YouTube URL에서 비디오 ID 추출
 */
function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/  // 직접 ID 입력
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

/**
 * 차시 추가 모달 열기
 */
async function openAddLessonModal() {
  const courseId = window.location.pathname.split('/')[3];
  
  // 모달 HTML
  const modalHTML = `
    <div id="addLessonModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onclick="closeAddLessonModal(event)">
      <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
        <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h3 class="text-2xl font-bold text-gray-900">새 차시 추가</h3>
          <button onclick="closeAddLessonModal()" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times text-2xl"></i>
          </button>
        </div>
        
        <form id="addLessonForm" class="p-6 space-y-6">
          <!-- 차시 번호 -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              차시 번호
            </label>
            <input type="number" id="lessonNumber" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" placeholder="1" min="1" required>
          </div>

          <!-- 차시 제목 -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              차시 제목 *
            </label>
            <input type="text" id="lessonTitle" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" placeholder="예: 강좌 소개" required>
          </div>

          <!-- 차시 설명 -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              차시 설명
            </label>
            <textarea id="lessonDescription" rows="3" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" placeholder="이 차시에서 다룰 내용을 간단히 설명해주세요"></textarea>
          </div>

          <!-- YouTube URL -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              YouTube URL *
            </label>
            <input type="text" id="youtubeUrl" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ 또는 dQw4w9WgXcQ" required>
            <p class="mt-2 text-sm text-gray-500">
              <i class="fas fa-info-circle"></i> YouTube URL 또는 영상 ID를 입력하세요
            </p>
          </div>

          <!-- 영상 길이 -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              영상 길이 (분)
            </label>
            <input type="number" id="durationMinutes" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" placeholder="예: 15" min="0">
          </div>

          <!-- 무료 미리보기 -->
          <div class="flex items-center">
            <input type="checkbox" id="isFree" class="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500">
            <label for="isFree" class="ml-3 text-sm font-medium text-gray-700">
              무료 미리보기 (로그인 없이 시청 가능)
            </label>
          </div>

          <!-- 버튼 -->
          <div class="flex gap-3 pt-4">
            <button type="button" onclick="closeAddLessonModal()" class="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50">
              취소
            </button>
            <button type="submit" class="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700">
              <i class="fas fa-plus mr-2"></i>
              차시 추가
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // 폼 제출 이벤트
  document.getElementById('addLessonForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitLesson();
  });
}

/**
 * 차시 추가 모달 닫기
 */
function closeAddLessonModal(event) {
  if (event && event.target.id !== 'addLessonModal') return;
  const modal = document.getElementById('addLessonModal');
  if (modal) {
    modal.remove();
  }
}

/**
 * 차시 제출
 */
async function submitLesson() {
  const courseId = window.location.pathname.split('/')[3];
  const youtubeUrl = document.getElementById('youtubeUrl').value.trim();
  
  // YouTube ID 추출
  const videoId = extractYouTubeId(youtubeUrl);
  if (!videoId) {
    alert('유효하지 않은 YouTube URL입니다.');
    return;
  }

  const lessonData = {
    course_id: parseInt(courseId),
    lesson_number: parseInt(document.getElementById('lessonNumber').value),
    title: document.getElementById('lessonTitle').value.trim(),
    description: document.getElementById('lessonDescription').value.trim(),
    video_url: videoId,  // YouTube ID만 저장
    video_type: 'youtube',
    video_provider: 'youtube',
    duration_minutes: parseInt(document.getElementById('durationMinutes').value) || 0,
    is_free: document.getElementById('isFree').checked ? 1 : 0
  };

  try {
    const response = await axios.post(`/api/courses/${courseId}/lessons`, lessonData);
    
    if (response.data.success) {
      alert('차시가 성공적으로 추가되었습니다!');
      closeAddLessonModal();
      location.reload();  // 페이지 새로고침
    } else {
      alert(response.data.error || '차시 추가에 실패했습니다.');
    }
  } catch (error) {
    console.error('Lesson creation error:', error);
    alert('차시 추가 중 오류가 발생했습니다: ' + (error.response?.data?.error || error.message));
  }
}

/**
 * 차시 수정 모달 열기
 */
async function editLesson(lessonId) {
  const courseId = window.location.pathname.split('/')[3];
  
  try {
    // 차시 정보 가져오기
    const response = await axios.get(`/api/courses/${courseId}/lessons/${lessonId}`);
    const lesson = response.data.data;
    
    const modalHTML = `
      <div id="editLessonModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onclick="closeEditLessonModal(event)">
        <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
          <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
            <h3 class="text-2xl font-bold text-gray-900">차시 수정</h3>
            <button onclick="closeEditLessonModal()" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times text-2xl"></i>
            </button>
          </div>
          
          <form id="editLessonForm" class="p-6 space-y-6">
            <input type="hidden" id="editLessonId" value="${lesson.id}">
            
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">차시 번호</label>
              <input type="number" id="editLessonNumber" value="${lesson.lesson_number}" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" required>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">차시 제목 *</label>
              <input type="text" id="editLessonTitle" value="${lesson.title}" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" required>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">차시 설명</label>
              <textarea id="editLessonDescription" rows="3" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">${lesson.description || ''}</textarea>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">YouTube URL *</label>
              <input type="text" id="editYoutubeUrl" value="${lesson.video_url || ''}" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" required>
              <p class="mt-2 text-sm text-gray-500">
                <i class="fas fa-info-circle"></i> YouTube URL 또는 영상 ID
              </p>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">영상 길이 (분)</label>
              <input type="number" id="editDurationMinutes" value="${lesson.duration_minutes || 0}" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
            </div>

            <div class="flex items-center">
              <input type="checkbox" id="editIsFree" ${lesson.is_free ? 'checked' : ''} class="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500">
              <label for="editIsFree" class="ml-3 text-sm font-medium text-gray-700">
                무료 미리보기
              </label>
            </div>

            <div class="flex gap-3 pt-4">
              <button type="button" onclick="closeEditLessonModal()" class="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50">
                취소
              </button>
              <button type="submit" class="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700">
                <i class="fas fa-save mr-2"></i>
                저장
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    document.getElementById('editLessonForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await updateLesson();
    });
    
  } catch (error) {
    console.error('Lesson fetch error:', error);
    alert('차시 정보를 불러오는데 실패했습니다.');
  }
}

/**
 * 차시 수정 모달 닫기
 */
function closeEditLessonModal(event) {
  if (event && event.target.id !== 'editLessonModal') return;
  const modal = document.getElementById('editLessonModal');
  if (modal) {
    modal.remove();
  }
}

/**
 * 차시 업데이트
 */
async function updateLesson() {
  const courseId = window.location.pathname.split('/')[3];
  const lessonId = document.getElementById('editLessonId').value;
  const youtubeUrl = document.getElementById('editYoutubeUrl').value.trim();
  
  const videoId = extractYouTubeId(youtubeUrl);
  if (!videoId) {
    alert('유효하지 않은 YouTube URL입니다.');
    return;
  }

  const lessonData = {
    lesson_number: parseInt(document.getElementById('editLessonNumber').value),
    title: document.getElementById('editLessonTitle').value.trim(),
    description: document.getElementById('editLessonDescription').value.trim(),
    video_url: videoId,
    video_type: 'youtube',
    video_provider: 'youtube',
    duration_minutes: parseInt(document.getElementById('editDurationMinutes').value) || 0,
    is_free: document.getElementById('editIsFree').checked ? 1 : 0
  };

  try {
    const response = await axios.put(`/api/courses/${courseId}/lessons/${lessonId}`, lessonData);
    
    if (response.data.success) {
      alert('차시가 성공적으로 수정되었습니다!');
      closeEditLessonModal();
      location.reload();
    } else {
      alert(response.data.error || '차시 수정에 실패했습니다.');
    }
  } catch (error) {
    console.error('Lesson update error:', error);
    alert('차시 수정 중 오류가 발생했습니다: ' + (error.response?.data?.error || error.message));
  }
}

/**
 * 차시 삭제
 */
async function deleteLesson(lessonId) {
  if (!confirm('정말 이 차시를 삭제하시겠습니까?')) {
    return;
  }

  const courseId = window.location.pathname.split('/')[3];

  try {
    const response = await axios.delete(`/api/courses/${courseId}/lessons/${lessonId}`);
    
    if (response.data.success) {
      alert('차시가 삭제되었습니다.');
      location.reload();
    } else {
      alert(response.data.error || '차시 삭제에 실패했습니다.');
    }
  } catch (error) {
    console.error('Lesson delete error:', error);
    alert('차시 삭제 중 오류가 발생했습니다: ' + (error.response?.data?.error || error.message));
  }
}

// 전역 함수로 노출
window.openAddLessonModal = openAddLessonModal;
window.closeAddLessonModal = closeAddLessonModal;
window.editLesson = editLesson;
window.closeEditLessonModal = closeEditLessonModal;
window.deleteLesson = deleteLesson;
