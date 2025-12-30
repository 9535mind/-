/**
 * 향상된 영상 업로드 시스템
 * - 차시 제목: 파일명에서 자동 추출 (관리자 수정 가능)
 * - 차시 순서: AI 자동 부여 또는 관리자 입력
 * - 재생 시간: 영상 메타데이터에서 자동 추출
 */

/**
 * 영상 파일에서 메타데이터 추출
 * @param {File} file - 영상 파일
 * @returns {Promise<Object>} - {duration, width, height}
 */
function extractVideoMetadata(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = function() {
      window.URL.revokeObjectURL(video.src);
      
      const duration = Math.ceil(video.duration / 60); // 초 → 분 (올림)
      
      resolve({
        duration: duration, // 분 단위
        durationSeconds: Math.ceil(video.duration), // 초 단위
        width: video.videoWidth,
        height: video.videoHeight,
        aspectRatio: `${video.videoWidth}x${video.videoHeight}`
      });
    };

    video.onerror = function() {
      reject(new Error('영상 메타데이터를 읽을 수 없습니다.'));
    };

    video.src = URL.createObjectURL(file);
  });
}

/**
 * 파일명에서 차시 제목 추출
 * @param {string} filename - 파일명
 * @returns {string} - 추출된 제목
 */
function extractLessonTitleFromFilename(filename) {
  // 확장자 제거
  let title = filename.replace(/\.(mp4|webm|mov|avi)$/i, '');
  
  // 특수 문자 제거 및 공백 정리
  title = title
    .replace(/[_-]/g, ' ')  // 언더스코어, 대시를 공백으로
    .replace(/\s+/g, ' ')    // 연속 공백 제거
    .trim();
  
  // 숫자로 시작하면 "차시" 제거
  title = title.replace(/^(\d+)\s*(차시|강|장)?\.?\s*/i, '');
  
  return title || '새 차시';
}

/**
 * 다음 차시 번호 자동 추천
 * @param {Array} existingLessons - 기존 차시 목록
 * @returns {number} - 다음 차시 번호
 */
function suggestNextLessonNumber(existingLessons) {
  if (!existingLessons || existingLessons.length === 0) {
    return 1;
  }
  
  const maxNumber = Math.max(...existingLessons.map(l => l.lesson_number || 0));
  return maxNumber + 1;
}

/**
 * 향상된 영상 업로드
 * @param {File} file - 영상 파일
 * @param {Object} options - 옵션 {onProgress, onSuccess, onError}
 */
async function uploadVideoEnhanced(file, options = {}) {
  const { onProgress, onSuccess, onError } = options;
  
  try {
    // 1. 영상 메타데이터 추출
    console.log('[VIDEO] 메타데이터 추출 중...');
    const metadata = await extractVideoMetadata(file);
    console.log('[VIDEO] 메타데이터:', metadata);
    
    // 2. 차시 제목 자동 추출
    const suggestedTitle = extractLessonTitleFromFilename(file.name);
    console.log('[VIDEO] 추천 제목:', suggestedTitle);
    
    // 3. 파일 업로드
    const token = localStorage.getItem('session_token');
    if (!token) {
      throw new Error('로그인이 필요합니다.');
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    // XMLHttpRequest로 업로드 (진행률 추적)
    const xhr = new XMLHttpRequest();
    
    // 진행률 이벤트
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent, e.loaded, e.total);
      }
    });
    
    // 완료 이벤트
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        if (response.success) {
          const uploadData = {
            ...response.data,
            metadata: metadata,
            suggestedTitle: suggestedTitle,
            originalName: file.name
          };
          
          if (onSuccess) {
            onSuccess(uploadData);
          }
        } else {
          throw new Error(response.message || '업로드 실패');
        }
      } else {
        throw new Error(`업로드 실패: HTTP ${xhr.status}`);
      }
    });
    
    // 에러 이벤트
    xhr.addEventListener('error', () => {
      if (onError) {
        onError(new Error('네트워크 오류가 발생했습니다.'));
      }
    });
    
    // 요청 전송
    xhr.open('POST', '/api/upload/video');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
    
  } catch (error) {
    console.error('[VIDEO] Upload error:', error);
    if (onError) {
      onError(error);
    }
  }
}

/**
 * 재생 시간 포맷팅
 * @param {number} minutes - 분
 * @returns {string} - "10분" 또는 "1시간 30분"
 */
function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes}분`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) {
    return `${hours}시간`;
  }
  
  return `${hours}시간 ${mins}분`;
}
