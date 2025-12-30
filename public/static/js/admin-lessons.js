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
          document.getElementById('uploadedFileName').textContent = file.name;
          
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
