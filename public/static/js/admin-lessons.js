/**
 * 차시 관리 JavaScript (영상 업로드 포함)
 */

let currentVideoTab = 'youtube';
let uploadedVideoKey = null;

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
 * 영상 파일 선택 처리
 */
function handleVideoFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

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
    formData.append('video', file);

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
          uploadedVideoKey = response.data.video_key;
          document.getElementById('uploadedVideoKey').value = uploadedVideoKey;
          document.getElementById('uploadedFileName').textContent = file.name;
          
          progressContainer.classList.add('hidden');
          uploadedInfo.classList.remove('hidden');
          
          console.log('영상 업로드 완료:', uploadedVideoKey);
        } else {
          throw new Error(response.error || '업로드 실패');
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
    xhr.open('POST', '/api/videos/upload');
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
