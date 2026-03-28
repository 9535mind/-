/**
 * AI 일괄 업로드 기능
 */

let currentCourseId = null;
let analyzedLessons = [];

/**
 * AI 일괄 업로드 모달 열기
 */
function openAIBulkUploadModal(courseId) {
  currentCourseId = courseId;
  document.getElementById('aiBulkUploadModal').classList.remove('hidden');
  document.getElementById('aiBulkUploadModal').classList.add('flex');
}

/**
 * AI 일괄 업로드 모달 닫기
 */
function closeAIBulkUploadModal() {
  document.getElementById('aiBulkUploadModal').classList.add('hidden');
  document.getElementById('aiBulkUploadModal').classList.remove('flex');
  analyzedLessons = [];
  document.getElementById('aiUploadResults').classList.add('hidden');
}

/**
 * PDF/문서 업로드 및 AI 분석
 */
async function handleDocumentUpload() {
  const fileInput = document.getElementById('documentFile');
  const file = fileInput.files[0];
  
  if (!file) {
    alert('파일을 선택해주세요.');
    return;
  }

  const lessonCount = document.getElementById('lessonCount').value;

  try {
    document.getElementById('uploadProgress').classList.remove('hidden');
    document.getElementById('progressText').textContent = 'AI가 문서를 분석하고 있습니다...';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('course_id', currentCourseId);
    if (lessonCount) {
      formData.append('lesson_count', lessonCount);
    }

    const response = await fetch('/api/ai-bulk-lessons/analyze-document', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      },
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      analyzedLessons = result.data.lessons;
      displayAnalyzedLessons(result.data);
      document.getElementById('progressText').textContent = 'AI 분석 완료!';
      setTimeout(() => {
        document.getElementById('uploadProgress').classList.add('hidden');
      }, 1000);
    } else {
      throw new Error(result.error || 'AI 분석 실패');
    }

  } catch (error) {
    console.error('Document upload error:', error);
    alert('문서 분석에 실패했습니다: ' + error.message);
    document.getElementById('uploadProgress').classList.add('hidden');
  }
}

/**
 * 영상 파일 여러 개 업로드
 */
async function handleVideoFilesUpload() {
  const fileInput = document.getElementById('videoFiles');
  const files = fileInput.files;
  
  if (files.length === 0) {
    alert('영상 파일을 선택해주세요.');
    return;
  }

  try {
    document.getElementById('uploadProgress').classList.remove('hidden');
    document.getElementById('progressText').textContent = `${files.length}개의 영상 파일을 처리하고 있습니다...`;

    const formData = new FormData();
    formData.append('course_id', currentCourseId);
    formData.append('upload_to_apivideo', 'false'); // 나중에 true로 변경 가능
    
    for (let i = 0; i < files.length; i++) {
      formData.append(`files[${i}]`, files[i]);
    }

    const response = await fetch('/api/ai-bulk-lessons/create-from-videos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      },
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      analyzedLessons = result.data.lessons;
      displayAnalyzedLessons(result.data);
      document.getElementById('progressText').textContent = '영상 파일 분석 완료!';
      setTimeout(() => {
        document.getElementById('uploadProgress').classList.add('hidden');
      }, 1000);
    } else {
      throw new Error(result.error || '영상 파일 처리 실패');
    }

  } catch (error) {
    console.error('Video files upload error:', error);
    alert('영상 파일 처리에 실패했습니다: ' + error.message);
    document.getElementById('uploadProgress').classList.add('hidden');
  }
}

/**
 * CSV 템플릿 다운로드
 */
async function downloadCSVTemplate() {
  try {
    const response = await fetch('/api/ai-bulk-lessons/csv-template', {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lessons_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    alert('CSV 템플릿이 다운로드되었습니다!');
  } catch (error) {
    console.error('CSV template download error:', error);
    alert('CSV 템플릿 다운로드에 실패했습니다.');
  }
}

/**
 * CSV 파일 업로드
 */
async function handleCSVUpload() {
  const fileInput = document.getElementById('csvFile');
  const file = fileInput.files[0];
  
  if (!file) {
    alert('CSV 파일을 선택해주세요.');
    return;
  }

  try {
    document.getElementById('uploadProgress').classList.remove('hidden');
    document.getElementById('progressText').textContent = 'CSV 파일을 읽고 있습니다...';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('course_id', currentCourseId);

    const response = await fetch('/api/ai-bulk-lessons/upload-csv', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      },
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      analyzedLessons = result.data.lessons;
      displayAnalyzedLessons(result.data);
      document.getElementById('progressText').textContent = 'CSV 파일 로드 완료!';
      setTimeout(() => {
        document.getElementById('uploadProgress').classList.add('hidden');
      }, 1000);
    } else {
      throw new Error(result.error || 'CSV 파일 처리 실패');
    }

  } catch (error) {
    console.error('CSV upload error:', error);
    alert('CSV 파일 처리에 실패했습니다: ' + error.message);
    document.getElementById('uploadProgress').classList.add('hidden');
  }
}

/**
 * 분석 결과 표시
 */
function displayAnalyzedLessons(data) {
  const resultsDiv = document.getElementById('aiUploadResults');
  const lessonsListDiv = document.getElementById('analyzedLessonsList');
  
  let html = `
    <div class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h4 class="font-semibold text-blue-900 mb-2">
        <i class="fas fa-check-circle mr-2"></i>
        ${data.total_lessons}개의 차시가 생성되었습니다!
      </h4>
      <p class="text-sm text-blue-700">
        미리보기를 확인하신 후 "모두 저장" 버튼을 클릭하세요.
      </p>
      ${data.estimated_duration ? `
        <p class="text-sm text-blue-700 mt-1">
          예상 총 강의 시간: ${data.estimated_duration}분
        </p>
      ` : ''}
    </div>
  `;

  data.lessons.forEach((lesson, index) => {
    html += `
      <div class="border border-gray-200 rounded-lg p-4 mb-3 hover:bg-gray-50 transition">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center mb-2">
              <span class="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm font-semibold mr-2">
                ${lesson.lesson_number}강
              </span>
              <h5 class="font-semibold text-gray-900">${lesson.title}</h5>
            </div>
            <p class="text-sm text-gray-600 mb-2">${lesson.description || ''}</p>
            ${lesson.content ? `
              <div class="text-xs text-gray-500 bg-gray-100 p-2 rounded max-h-20 overflow-hidden">
                ${lesson.content.substring(0, 200)}...
              </div>
            ` : ''}
            ${lesson.video_duration_minutes ? `
              <div class="mt-2 text-xs text-gray-500">
                <i class="fas fa-clock mr-1"></i>
                예상 시간: ${lesson.video_duration_minutes}분
              </div>
            ` : ''}
            ${lesson.file_name ? `
              <div class="mt-2 text-xs text-gray-500">
                <i class="fas fa-file-video mr-1"></i>
                ${lesson.file_name} (${(lesson.file_size / 1024 / 1024).toFixed(2)} MB)
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  });

  lessonsListDiv.innerHTML = html;
  resultsDiv.classList.remove('hidden');
}

/**
 * 모든 차시 저장
 */
async function saveAllLessons() {
  if (analyzedLessons.length === 0) {
    alert('저장할 차시가 없습니다.');
    return;
  }

  if (!confirm(`${analyzedLessons.length}개의 차시를 저장하시겠습니까?`)) {
    return;
  }

  try {
    document.getElementById('uploadProgress').classList.remove('hidden');
    document.getElementById('progressText').textContent = '차시를 저장하고 있습니다...';

    const response = await fetch('/api/ai-bulk-lessons/save-lessons', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        course_id: currentCourseId,
        lessons: analyzedLessons
      })
    });

    const result = await response.json();

    if (result.success) {
      alert(`✅ ${result.data.success_count}개의 차시가 저장되었습니다!`);
      
      if (result.data.error_count > 0) {
        console.error('일부 차시 저장 실패:', result.data.errors);
        alert(`⚠️ ${result.data.error_count}개의 차시 저장에 실패했습니다. 콘솔을 확인하세요.`);
      }

      closeAIBulkUploadModal();
      
      // 강좌 페이지 새로고침
      if (typeof loadCourses === 'function') {
        loadCourses();
      }
    } else {
      throw new Error(result.error || '차시 저장 실패');
    }

  } catch (error) {
    console.error('Save lessons error:', error);
    alert('차시 저장에 실패했습니다: ' + error.message);
  } finally {
    document.getElementById('uploadProgress').classList.add('hidden');
  }
}

/**
 * 헬퍼: 쿠키 기반 인증으로 토큰 직접 사용 안함
 */
function getToken() {
  return null;
}
