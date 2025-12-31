/**
 * 차시 관리 JavaScript (영상 업로드 포함)
 */

let currentVideoTab = 'youtube';
let uploadedVideoKey = null;
let bulkUploadMode = false;
let uploadedVideos = []; // 일괄 업로드된 영상 목록

/**
 * 영상 탭 전환
 */
function switchVideoTab(tab) {
  currentVideoTab = tab;
  
  // 탭 버튼 스타일 업데이트
  const youtubeTa = document.getElementById('youtubeTab');
  const uploadTab = document.getElementById('uploadTab');
  
  if (tab === 'youtube') {
    youtubeTab.classList.add('border-purple-600', 'text-purple-600');
    youtubeTab.classList.remove('border-transparent', 'text-gray-500');
    uploadTab.classList.remove('border-purple-600', 'text-purple-600');
    uploadTab.classList.add('border-transparent', 'text-gray-500');
    
    // 콘텐츠 표시/숨김
    document.getElementById('youtubeTabContent').classList.remove('hidden');
    document.getElementById('uploadTabContent').classList.add('hidden');
  } else {
    uploadTab.classList.add('border-purple-600', 'text-purple-600');
    uploadTab.classList.remove('border-transparent', 'text-gray-500');
    youtubeTab.classList.remove('border-purple-600', 'text-purple-600');
    youtubeTab.classList.add('border-transparent', 'text-gray-500');
    
    // 콘텐츠 표시/숨김
    document.getElementById('uploadTabContent').classList.remove('hidden');
    document.getElementById('youtubeTabContent').classList.add('hidden');
  }
}

/**
 * 일괄 업로드 모드 전환
 */
function toggleBulkUpload() {
  bulkUploadMode = document.getElementById('bulkUploadMode').checked;
  const fileInput = document.getElementById('videoFileInput');
  const hint = document.getElementById('bulkUploadHint');
  
  if (bulkUploadMode) {
    fileInput.setAttribute('multiple', 'multiple');
    hint.style.display = 'block';
  } else {
    fileInput.removeAttribute('multiple');
    hint.style.display = 'none';
  }
}

/**
 * 일괄 업로드 도움말
 */
function showBulkUploadHelp() {
  alert(`일괄 업로드 사용법:

1. "일괄 업로드" 체크박스 활성화
2. 파일 선택 시 Ctrl(Cmd) + 클릭으로 여러 파일 선택
3. 파일명에서 차시 제목 자동 추천
4. 순서대로 차시 생성

파일명 예시:
- "01_강좌소개.mp4" → 차시 1: 강좌소개
- "02_기본개념.mp4" → 차시 2: 기본개념
  
팁: 파일명을 명확하게 작성하면 AI가 더 정확하게 제목을 추천합니다!`);
}

/**
 * 영상 파일 선택 처리
 */
function handleVideoFileSelect(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  // 일괄 업로드 모드
  if (bulkUploadMode && files.length > 1) {
    handleBulkUpload(Array.from(files));
    return;
  }

  // 단일 파일 업로드
  const file = files[0];

  // 파일 크기 체크 (500MB)
  const maxSize = 500 * 1024 * 1024;
  if (file.size > maxSize) {
    alert('파일 크기는 500MB를 초과할 수 없습니다.');
    return;
  }

  // 파일 형식 체크
  const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
  if (!validTypes.includes(file.type)) {
    alert('지원하지 않는 파일 형식입니다. (MP4, WebM, MOV, AVI만 가능)');
    return;
  }

  // 업로드 시작
  uploadVideoFile(file);
}

/**
 * 일괄 업로드 처리
 */
async function handleBulkUpload(files) {
  // 파일 검증
  const maxSize = 500 * 1024 * 1024;
  const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
  
  const invalidFiles = files.filter(f => f.size > maxSize || !validTypes.includes(f.type));
  if (invalidFiles.length > 0) {
    alert(`다음 파일들이 유효하지 않습니다:\n${invalidFiles.map(f => f.name).join('\n')}\n\n조건: 500MB 이하, MP4/WebM/MOV/AVI 형식`);
    return;
  }

  if (!confirm(`${files.length}개의 영상을 업로드하시겠습니까?\n\n자동으로 차시가 생성됩니다.`)) {
    return;
  }

  // 일괄 업로드 UI 표시
  showBulkUploadProgress(files.length);

  uploadedVideos = [];
  
  // 순차 업로드
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    updateBulkUploadProgress(i + 1, files.length, file.name);
    
    try {
      const videoKey = await uploadVideoFileAsync(file);
      
      // 파일명에서 제목 추출
      const title = extractTitleFromFilename(file.name);
      
      // 영상 메타데이터 추출 (재생 시간)
      const duration = await getVideoDuration(file);
      
      uploadedVideos.push({
        video_key: videoKey,
        title: title,
        filename: file.name,
        duration: Math.ceil(duration / 60), // 분 단위
        lesson_number: i + 1
      });
      
    } catch (error) {
      console.error(`Upload failed for ${file.name}:`, error);
      alert(`${file.name} 업로드 실패: ${error.message}`);
      break;
    }
  }

  hideBulkUploadProgress();
  
  if (uploadedVideos.length > 0) {
    // 일괄 차시 생성 확인
    if (confirm(`${uploadedVideos.length}개 영상 업로드 완료!\n\n지금 바로 차시를 생성하시겠습니까?`)) {
      await createBulkLessons();
    }
  }
}

/**
 * 파일명에서 제목 추출
 */
function extractTitleFromFilename(filename) {
  // 확장자 제거
  let title = filename.replace(/\.(mp4|webm|mov|avi)$/i, '');
  
  // 앞의 숫자와 구분자 제거 (예: "01_", "001-", "1.")
  title = title.replace(/^[\d]+[\s_\-\.]+/, '');
  
  // 특수문자를 공백으로
  title = title.replace(/[_\-]/g, ' ');
  
  // 연속 공백 제거
  title = title.replace(/\s+/g, ' ').trim();
  
  return title || filename;
}

/**
 * 영상 재생 시간 추출
 */
function getVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = function() {
      window.URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    
    video.onerror = function() {
      reject(new Error('영상 메타데이터를 읽을 수 없습니다'));
    };
    
    video.src = URL.createObjectURL(file);
  });
}

/**
 * 일괄 업로드 진행률 UI
 */
function showBulkUploadProgress(total) {
  const modal = document.getElementById('lessonModal');
  const overlay = document.createElement('div');
  overlay.id = 'bulkUploadOverlay';
  overlay.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
  overlay.innerHTML = `
    <div class="bg-white rounded-lg p-8 max-w-md w-full">
      <h3 class="text-xl font-bold mb-4">
        <i class="fas fa-cloud-upload-alt text-purple-600 mr-2"></i>
        일괄 업로드 중...
      </h3>
      <div class="mb-4">
        <div class="flex justify-between text-sm mb-2">
          <span id="bulkUploadCurrentFile">준비 중...</span>
          <span id="bulkUploadCount">0 / ${total}</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-3">
          <div id="bulkUploadBar" class="bg-purple-600 h-3 rounded-full transition-all" style="width: 0%"></div>
        </div>
      </div>
      <p class="text-sm text-gray-600">
        <i class="fas fa-info-circle mr-1"></i>
        업로드가 완료될 때까지 잠시만 기다려주세요.
      </p>
    </div>
  `;
  document.body.appendChild(overlay);
}

function updateBulkUploadProgress(current, total, filename) {
  const percent = Math.round((current / total) * 100);
  document.getElementById('bulkUploadBar').style.width = percent + '%';
  document.getElementById('bulkUploadCount').textContent = `${current} / ${total}`;
  document.getElementById('bulkUploadCurrentFile').textContent = filename;
}

function hideBulkUploadProgress() {
  const overlay = document.getElementById('bulkUploadOverlay');
  if (overlay) {
    overlay.remove();
  }
}

/**
 * 비동기 영상 업로드 (Promise 반환)
 */
function uploadVideoFileAsync(file) {
  return new Promise((resolve, reject) => {
    const token = localStorage.getItem('session_token');
    if (!token) {
      reject(new Error('로그인이 필요합니다'));
      return;
    }

    const formData = new FormData();
    formData.append('video', file);

    const xhr = new XMLHttpRequest();

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        if (response.success) {
          resolve(response.data.video_key);
        } else {
          reject(new Error(response.error || '업로드 실패'));
        }
      } else {
        reject(new Error('업로드 실패: HTTP ' + xhr.status));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('네트워크 오류'));
    });

    xhr.open('POST', '/api/upload/video');
    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    xhr.send(formData);
  });
}

/**
 * 일괄 차시 생성
 */
async function createBulkLessons() {
  const token = localStorage.getItem('session_token');
  const courseId = document.getElementById('courseIdInput').value;
  
  for (const video of uploadedVideos) {
    try {
      const response = await fetch(`/api/courses/${courseId}/lessons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          course_id: parseInt(courseId),
          title: video.title,
          lesson_number: video.lesson_number,
          video_provider: 'r2',
          video_url: video.video_key,
          video_duration_minutes: video.duration,
          status: 'active',
          is_free_preview: 0
        })
      });
      
      if (!response.ok) {
        throw new Error(`차시 생성 실패: ${video.title}`);
      }
    } catch (error) {
      console.error('Create lesson error:', error);
      alert(`차시 생성 실패: ${video.title}`);
    }
  }
  
  alert(`${uploadedVideos.length}개 차시가 생성되었습니다!`);
  
  // 모달 닫고 새로고침
  closeLessonModal();
  await loadLessons();
}

/**
 * 영상 파일 업로드
 */
async function uploadVideoFile(file) {
  const token = localStorage.getItem('session_token');
  if (!token) {
    alert('로그인이 필요합니다.');
    return;
  }

  // 진행률 표시
  const progressContainer = document.getElementById('uploadProgress');
  const progressBar = document.getElementById('uploadProgressBar');
  const progressPercent = document.getElementById('uploadPercent');
  const fileNameDisplay = document.getElementById('uploadFileName');
  const uploadedInfo = document.getElementById('uploadedInfo');

  progressContainer.classList.remove('hidden');
  uploadedInfo.classList.add('hidden');
  fileNameDisplay.textContent = file.name;
  progressBar.style.width = '0%';
  progressPercent.textContent = '0%';

  try {
    // FormData 생성
    const formData = new FormData();
    formData.append('file', file);

    // XMLHttpRequest로 업로드 (진행률 추적)
    const xhr = new XMLHttpRequest();

    // 진행률 이벤트
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        progressBar.style.width = percent + '%';
        progressPercent.textContent = percent + '%';
      }
    });

    // 완료 이벤트
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        if (response.success) {
          // 업로드 완료
          uploadedVideoKey = response.data.url; // video_key → url
          document.getElementById('uploadedVideoKey').value = uploadedVideoKey;
          
          // 업로드 정보 표시 (파일명, 크기, 재생시간)
          updateUploadedInfo({
            originalName: file.name,
            filename: response.data.filename,
            size: response.data.size,
            duration: response.data.duration
          });
          
          // 재생 시간 자동 설정
          if (response.data.duration) {
            const durationInput = document.getElementById('videoDuration');
            if (durationInput) {
              durationInput.value = response.data.duration;
            }
          }
          
          progressContainer.classList.add('hidden');
          uploadedInfo.classList.remove('hidden');
          
          console.log('영상 업로드 완료:', uploadedVideoKey, '재생시간:', response.data.duration, '분');
        } else {
          throw new Error(response.message || '업로드 실패');
        }
      } else {
        throw new Error('업로드 실패: HTTP ' + xhr.status);
      }
    });

    // 에러 이벤트
    xhr.addEventListener('error', () => {
      progressContainer.classList.add('hidden');
      alert('네트워크 오류가 발생했습니다.');
    });

    // 요청 전송
    xhr.open('POST', '/api/upload/video');
    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    xhr.send(formData);

  } catch (error) {
    console.error('Upload error:', error);
    progressContainer.classList.add('hidden');
    alert('영상 업로드에 실패했습니다: ' + error.message);
  }
}

/**
 * 차시 폼 제출 시 영상 정보 처리
 */
function getVideoData() {
  if (currentVideoTab === 'youtube') {
    // YouTube URL 방식
    const videoUrl = document.getElementById('lessonVideoUrl').value.trim();
    if (!videoUrl) {
      return null;
    }

    // YouTube URL을 embed 형식으로 변환
    let videoId = '';
    if (videoUrl.includes('youtube.com/watch?v=')) {
      videoId = videoUrl.split('v=')[1].split('&')[0];
    } else if (videoUrl.includes('youtu.be/')) {
      videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
    } else if (videoUrl.includes('youtube.com/embed/')) {
      videoId = videoUrl.split('embed/')[1].split('?')[0];
    }

    if (videoId) {
      return {
        video_provider: 'youtube',
        video_url: `https://www.youtube.com/embed/${videoId}`,
        video_id: videoId
      };
    } else {
      alert('올바른 YouTube URL을 입력해주세요.');
      return null;
    }
  } else {
    // 직접 업로드 방식
    if (!uploadedVideoKey) {
      alert('영상 파일을 업로드해주세요.');
      return null;
    }

    return {
      video_provider: 'r2',
      video_url: uploadedVideoKey,
      video_id: null
    };
  }
}

/**
 * 드래그 앤 드롭 지원
 */
document.addEventListener('DOMContentLoaded', () => {
  const uploadArea = document.getElementById('uploadTabContent');
  if (!uploadArea) return;

  // 드래그 오버
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.add('border-purple-500', 'bg-purple-50');
  });

  // 드래그 리브
  uploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.remove('border-purple-500', 'bg-purple-50');
  });

  // 드롭
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.remove('border-purple-500', 'bg-purple-50');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      // 파일 input에 할당
      const fileInput = document.getElementById('videoFileInput');
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
      
      // 업로드 처리
      handleVideoFileSelect({ target: { files: [file] } });
    }
  });
});

/**
 * 업로드된 영상 교체
 */
function replaceUploadedVideo() {
  if (!confirm('현재 업로드된 영상을 다른 영상으로 교체하시겠습니까?')) {
    return;
  }
  
  // 업로드 UI 초기화
  uploadedVideoKey = null;
  document.getElementById('uploadedVideoKey').value = '';
  document.getElementById('uploadedInfo').classList.add('hidden');
  
  // 파일 입력 초기화
  const fileInput = document.getElementById('videoFile');
  if (fileInput) {
    fileInput.value = '';
    fileInput.click(); // 파일 선택 다이얼로그 열기
  }
}

/**
 * 업로드된 영상 삭제
 */
async function deleteUploadedVideo() {
  if (!confirm('업로드된 영상을 삭제하시겠습니까?\n\n주의: 이 작업은 되돌릴 수 없습니다.')) {
    return;
  }
  
  const videoKey = uploadedVideoKey;
  
  if (!videoKey) {
    alert('삭제할 영상이 없습니다.');
    return;
  }
  
  try {
    // R2에서 파일 삭제 API 호출
    const response = await apiRequest('DELETE', `/api/storage/videos/${videoKey}`);
    
    if (response.success) {
      // UI 초기화
      uploadedVideoKey = null;
      document.getElementById('uploadedVideoKey').value = '';
      document.getElementById('uploadedInfo').classList.add('hidden');
      
      // 파일 입력 초기화
      const fileInput = document.getElementById('videoFile');
      if (fileInput) {
        fileInput.value = '';
      }
      
      alert('✅ 영상이 삭제되었습니다.');
    } else {
      throw new Error(response.message || '삭제 실패');
    }
  } catch (error) {
    console.error('Delete video error:', error);
    alert('영상 삭제에 실패했습니다.\n\n' + error.message);
  }
}

/**
 * 업로드 완료 정보 업데이트
 */
function updateUploadedInfo(data) {
  // 파일명 표시
  document.getElementById('uploadedFileName').textContent = data.originalName || data.filename;
  
  // 파일 정보 표시
  const fileSize = (data.size / (1024 * 1024)).toFixed(2); // MB
  const duration = data.duration ? `${data.duration}분` : '알 수 없음';
  document.getElementById('uploadedFileInfo').textContent = `크기: ${fileSize}MB | 재생시간: ${duration}`;
}

/**
 * AI 기반 차시 설명 자동 생성
 */
async function generateLessonDescription() {
  const titleInput = document.getElementById('lessonTitle');
  const descriptionTextarea = document.getElementById('lessonDescription');
  
  const title = titleInput.value.trim();
  
  if (!title) {
    alert('먼저 차시 제목을 입력해주세요.');
    titleInput.focus();
    return;
  }
  
  // 로딩 상태 표시
  const originalText = descriptionTextarea.value;
  descriptionTextarea.value = '🤖 AI가 차시 설명을 생성하고 있습니다...\n\n차시 제목을 기반으로 관련성 높은 설명을 작성 중입니다.';
  descriptionTextarea.disabled = true;
  
  try {
    // 강좌 정보 가져오기 (컨텍스트 제공)
    const courseId = window.location.pathname.split('/')[3];
    let courseTitle = '강좌';
    
    try {
      const courseResponse = await apiRequest('GET', `/api/courses/${courseId}`);
      if (courseResponse.success && courseResponse.data.course) {
        courseTitle = courseResponse.data.course.title;
      }
    } catch (e) {
      console.log('강좌 정보 로드 실패, 기본값 사용');
    }
    
    const response = await apiRequest('POST', '/api/ai/generate-lesson-description', {
      title: title,
      courseTitle: courseTitle,
      context: 'lesson'
    });
    
    if (response.success && response.data.description) {
      descriptionTextarea.value = response.data.description;
    } else {
      throw new Error(response.message || 'AI 설명 생성에 실패했습니다.');
    }
  } catch (error) {
    console.error('Generate lesson description error:', error);
    alert('AI 설명 생성에 실패했습니다.\n\n원인:\n' + 
          (error.message || '서버 오류가 발생했습니다.') + '\n\n직접 입력해주세요.');
    descriptionTextarea.value = originalText; // 원래 텍스트 복구
  } finally {
    descriptionTextarea.disabled = false;
    descriptionTextarea.focus();
  }
}

// ========== 차시 일괄 입력 기능 ==========

let generatedLessons = [];

function openBulkLessonModal() {
    document.getElementById('bulkLessonModal').classList.remove('hidden');
    document.getElementById('bulkLessonModal').classList.add('flex');
    
    // 초기화
    document.getElementById('bulkLessonInput').value = '';
    document.getElementById('aiLessonCount').value = 5;
    document.getElementById('aiRequirements').value = '';
    document.getElementById('aiPreviewSection').classList.add('hidden');
    generatedLessons = [];
}

function closeBulkLessonModal() {
    document.getElementById('bulkLessonModal').classList.remove('flex');
    document.getElementById('bulkLessonModal').classList.add('hidden');
}

function switchBulkInputMode(mode) {
    const manualTab = document.getElementById('manualTab');
    const aiTab = document.getElementById('aiTab');
    const manualSection = document.getElementById('manualSection');
    const aiSection = document.getElementById('aiSection');
    
    if (mode === 'manual') {
        manualTab.classList.add('border-b-2', 'border-purple-600', 'text-purple-600');
        manualTab.classList.remove('text-gray-500');
        aiTab.classList.remove('border-b-2', 'border-purple-600', 'text-purple-600');
        aiTab.classList.add('text-gray-500');
        manualSection.classList.remove('hidden');
        aiSection.classList.add('hidden');
    } else {
        aiTab.classList.add('border-b-2', 'border-purple-600', 'text-purple-600');
        aiTab.classList.remove('text-gray-500');
        manualTab.classList.remove('border-b-2', 'border-purple-600', 'text-purple-600');
        manualTab.classList.add('text-gray-500');
        aiSection.classList.remove('hidden');
        manualSection.classList.add('hidden');
    }
}

async function processBulkLessons(mode) {
    if (mode === 'manual') {
        await processManualBulkLessons();
    } else {
        await processAIBulkLessons();
    }
}

async function processManualBulkLessons() {
    const input = document.getElementById('bulkLessonInput').value.trim();
    
    if (!input) {
        alert('차시 정보를 입력해주세요.');
        return;
    }
    
    // 파싱
    const lines = input.split('\n').filter(line => line.trim());
    const lessons = [];
    
    for (const line of lines) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length < 2) {
            alert(`잘못된 형식입니다: ${line}\n\n형식: 차시번호|제목|설명|재생시간(분)`);
            return;
        }
        
        lessons.push({
            lesson_number: parseInt(parts[0]) || 0,
            title: parts[1] || '',
            description: parts[2] || '',
            video_duration_minutes: parseInt(parts[3]) || 0
        });
    }
    
    if (lessons.length === 0) {
        alert('등록할 차시가 없습니다.');
        return;
    }
    
    // 확인
    if (!confirm(`${lessons.length}개의 차시를 일괄 등록하시겠습니까?`)) {
        return;
    }
    
    // 등록
    await bulkCreateLessons(lessons);
}

async function processAIBulkLessons() {
    const count = parseInt(document.getElementById('aiLessonCount').value);
    const requirements = document.getElementById('aiRequirements').value.trim();
    
    if (count < 3 || count > 20) {
        alert('차시 수는 3~20개 사이로 입력해주세요.');
        return;
    }
    
    try {
        // 강좌 정보 가져오기
        const courseTitle = document.getElementById('courseTitle').textContent;
        const courseDescription = document.getElementById('courseDescription').textContent;
        
        // AI 생성 요청
        showToast('AI가 차시를 생성하고 있습니다... ⏳', 'info');
        
        const response = await apiRequest('/api/ai/generate-course', {
            method: 'POST',
            body: JSON.stringify({
                topic: courseTitle,
                target_audience: requirements || '일반 학습자',
                difficulty: 'beginner',
                duration: 30
            })
        });
        
        if (response.success && response.data.lessons) {
            generatedLessons = response.data.lessons.slice(0, count);
            displayAIPreview(generatedLessons);
            showToast('AI 생성이 완료되었습니다! ✅', 'success');
        } else {
            throw new Error('AI 생성에 실패했습니다.');
        }
        
    } catch (error) {
        console.error('AI generation error:', error);
        alert('AI 생성에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
    }
}

function displayAIPreview(lessons) {
    const previewList = document.getElementById('aiPreviewList');
    const html = lessons.map((lesson, index) => `
        <div class="border border-gray-300 rounded-lg p-4">
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <div class="font-semibold text-gray-900 mb-1">
                        ${lesson.lesson_number}강. ${lesson.title}
                    </div>
                    <p class="text-sm text-gray-600 mb-2">${lesson.description || ''}</p>
                    <span class="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        <i class="fas fa-clock mr-1"></i>${lesson.video_duration_minutes || 0}분
                    </span>
                </div>
            </div>
        </div>
    `).join('');
    
    previewList.innerHTML = html;
    document.getElementById('aiPreviewSection').classList.remove('hidden');
}

async function regenerateAILessons() {
    document.getElementById('aiPreviewSection').classList.add('hidden');
    await processAIBulkLessons();
}

async function confirmAILessons() {
    if (generatedLessons.length === 0) {
        alert('생성된 차시가 없습니다.');
        return;
    }
    
    if (!confirm(`${generatedLessons.length}개의 차시를 등록하시겠습니까?`)) {
        return;
    }
    
    await bulkCreateLessons(generatedLessons);
}

async function bulkCreateLessons(lessons) {
    try {
        showToast('차시를 등록하고 있습니다... ⏳', 'info');
        
        const token = localStorage.getItem('session_token');
        const courseId = document.getElementById('courseIdInput').value;
        
        let successCount = 0;
        let failCount = 0;
        
        for (const lesson of lessons) {
            try {
                const response = await fetch(`/api/courses/${courseId}/lessons`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        title: lesson.title,
                        lesson_number: lesson.lesson_number,
                        description: lesson.description || '',
                        video_duration_minutes: lesson.video_duration_minutes || 0,
                        content_type: 'video',
                        is_free_preview: 0,
                        status: 'active'
                    })
                });
                
                if (response.ok) {
                    successCount++;
                } else {
                    failCount++;
                    console.error(`Failed to create lesson ${lesson.lesson_number}:`, await response.text());
                }
                
            } catch (error) {
                failCount++;
                console.error(`Error creating lesson ${lesson.lesson_number}:`, error);
            }
        }
        
        closeBulkLessonModal();
        
        if (failCount === 0) {
            showToast(`✅ ${successCount}개의 차시가 성공적으로 등록되었습니다!`, 'success');
        } else {
            showToast(`⚠️ ${successCount}개 성공, ${failCount}개 실패`, 'warning');
        }
        
        // 목록 새로고침
        loadLessons();
        
    } catch (error) {
        console.error('Bulk create error:', error);
        alert('일괄 등록 중 오류가 발생했습니다: ' + error.message);
    }
}

/**
 * api.video 업로드 함수
 */
async function uploadToApiVideo(file, lessonId, title) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title || file.name);
    formData.append('is_public', 'false'); // 비공개 설정
    
    if (lessonId) {
      formData.append('lesson_id', lessonId);
    }

    const response = await fetch('/api/video-apivideo/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      },
      body: formData
    });

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || '업로드 실패');
    }

    return result.data;

  } catch (error) {
    console.error('api.video upload error:', error);
    throw error;
  }
}

/**
 * YouTube URL을 api.video로 업로드
 */
async function uploadYouTubeToApiVideo(youtubeUrl, lessonId, title) {
  try {
    const response = await apiRequest('POST', '/api/video-apivideo/upload-url', {
      url: youtubeUrl,
      title: title,
      is_public: false,
      lesson_id: lessonId
    });

    if (!response.success) {
      throw new Error(response.error || 'URL 업로드 실패');
    }

    return response.data;

  } catch (error) {
    console.error('YouTube to api.video error:', error);
    throw error;
  }
}

/**
 * 헬퍼: 토큰 가져오기
 */
function getToken() {
  return localStorage.getItem('session_token') || sessionStorage.getItem('session_token');
}

/**
 * 업로드 모드 전환 (파일 업로드 ↔ URL 입력)
 */
function switchUploadMode(mode) {
  const fileUploadBtn = document.getElementById('fileUploadBtn');
  const urlUploadBtn = document.getElementById('urlUploadBtn');
  const fileUploadArea = document.getElementById('fileUploadArea');
  const urlUploadArea = document.getElementById('urlUploadArea');

  if (mode === 'file') {
    // 파일 업로드 모드
    fileUploadBtn.classList.add('bg-purple-600', 'text-white');
    fileUploadBtn.classList.remove('bg-gray-200', 'text-gray-700');
    urlUploadBtn.classList.remove('bg-purple-600', 'text-white');
    urlUploadBtn.classList.add('bg-gray-200', 'text-gray-700');
    
    fileUploadArea.classList.remove('hidden');
    urlUploadArea.classList.add('hidden');
  } else {
    // URL 입력 모드
    urlUploadBtn.classList.add('bg-purple-600', 'text-white');
    urlUploadBtn.classList.remove('bg-gray-200', 'text-gray-700');
    fileUploadBtn.classList.remove('bg-purple-600', 'text-white');
    fileUploadBtn.classList.add('bg-gray-200', 'text-gray-700');
    
    urlUploadArea.classList.remove('hidden');
    fileUploadArea.classList.add('hidden');
  }
}

/**
 * URL 업로드 처리
 */
async function handleVideoUrlUpload() {
  const urlInput = document.getElementById('videoUrlInput');
  const videoUrl = urlInput.value.trim();

  if (!videoUrl) {
    alert('영상 URL을 입력해주세요.');
    return;
  }

  // URL 형식 검증
  try {
    new URL(videoUrl);
  } catch (e) {
    alert('올바른 URL 형식이 아닙니다.');
    return;
  }

  // api.video URL 감지
  const isApiVideoUrl = videoUrl.includes('api.video') || videoUrl.includes('embed.api.video');
  const isDirectVideoUrl = /\.(mp4|webm|mov|avi|mkv|flv)$/i.test(videoUrl);

  console.log('🔗 URL 업로드 시작:', { videoUrl, isApiVideoUrl, isDirectVideoUrl });

  try {
    // 진행률 표시
    const uploadProgress = document.getElementById('uploadProgress');
    const uploadFileName = document.getElementById('uploadFileName');
    const uploadPercent = document.getElementById('uploadPercent');
    const uploadProgressBar = document.getElementById('uploadProgressBar');

    uploadProgress.classList.remove('hidden');
    uploadFileName.textContent = 'URL 등록 중...';
    uploadPercent.textContent = '0%';
    uploadProgressBar.style.width = '0%';

    let result;

    if (isApiVideoUrl) {
      // api.video URL인 경우 → 바로 등록
      console.log('✅ api.video URL 감지 → 직접 등록');
      
      // Video ID 추출
      const videoIdMatch = videoUrl.match(/vi[A-Za-z0-9]{20,}/);
      const videoId = videoIdMatch ? videoIdMatch[0] : null;

      if (!videoId) {
        throw new Error('api.video URL에서 Video ID를 찾을 수 없습니다.');
      }

      // 업로드된 것처럼 처리
      uploadPercent.textContent = '100%';
      uploadProgressBar.style.width = '100%';

      result = {
        video_id: videoId,
        video_url: videoUrl,
        video_type: 'apivideo',
        provider: 'apivideo'
      };

      console.log('✅ api.video URL 등록 완료:', result);

    } else if (isDirectVideoUrl) {
      // 직접 영상 URL인 경우 → api.video로 업로드
      console.log('🎥 직접 영상 URL 감지 → api.video로 업로드');
      
      uploadPercent.textContent = '50%';
      uploadProgressBar.style.width = '50%';

      result = await uploadYouTubeToApiVideo(videoUrl);
      
      uploadPercent.textContent = '100%';
      uploadProgressBar.style.width = '100%';

      console.log('✅ 직접 영상 URL 업로드 완료:', result);

    } else {
      // 기타 URL → api.video로 시도
      console.log('🔄 기타 URL → api.video로 업로드 시도');
      
      uploadPercent.textContent = '50%';
      uploadProgressBar.style.width = '50%';

      result = await uploadYouTubeToApiVideo(videoUrl);
      
      uploadPercent.textContent = '100%';
      uploadProgressBar.style.width = '100%';

      console.log('✅ URL 업로드 완료:', result);
    }

    // 업로드 완료 정보 표시
    setTimeout(() => {
      uploadProgress.classList.add('hidden');
      const uploadedInfo = document.getElementById('uploadedInfo');
      uploadedInfo.classList.remove('hidden');
      
      // 전역 변수에 저장
      uploadedVideoKey = result.video_id;

      alert('✅ 영상 URL이 등록되었습니다!\n\n이제 "저장" 버튼을 클릭하여 차시를 저장하세요.');
      
      // URL 입력란 초기화
      urlInput.value = '';
    }, 500);

  } catch (error) {
    console.error('❌ URL 업로드 오류:', error);
    alert('URL 업로드 실패: ' + error.message);
    
    // 진행률 숨기기
    document.getElementById('uploadProgress').classList.add('hidden');
  }
}
