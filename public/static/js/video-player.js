/**
 * 커스텀 비디오 플레이어
 * Cloudflare R2 + 진도율 추적 시스템
 */

class MindstoryVideoPlayer {
  constructor(containerId, lessonId) {
    this.container = document.getElementById(containerId);
    this.lessonId = lessonId;
    this.video = null;
    this.isPlaying = false;
    this.lastSavedTime = 0;
    this.duration = 0;
    this.saveInterval = null;
    this.videoData = null;
    
    this.init();
  }

  async init() {
    try {
      // 영상 정보 가져오기
      const response = await apiRequest('GET', `/api/videos/play/${this.lessonId}`);
      
      if (!response.success) {
        this.showError(response.error || '영상 정보를 불러올 수 없습니다.');
        return;
      }

      this.videoData = response.data;
      
      // 이전 진도 가져오기
      const progressResponse = await apiRequest('GET', `/api/progress/lesson/${this.lessonId}`);
      const lastPosition = progressResponse.success ? progressResponse.data.last_position : 0;

      // 플레이어 UI 생성
      this.createPlayer(lastPosition);
      
      // 진도 자동 저장 시작 (5초마다)
      this.startAutoSave();
      
    } catch (error) {
      console.error('Player init error:', error);
      this.showError('플레이어 초기화에 실패했습니다.');
    }
  }

  createPlayer(startPosition = 0) {
    const videoUrl = this.videoData.video_provider === 'r2' 
      ? `/api/videos/stream/${this.videoData.video_key}`
      : this.videoData.video_url;

    this.container.innerHTML = `
      <div class="video-player-wrapper">
        <video 
          id="mindstory-video" 
          class="video-js w-full rounded-lg shadow-lg"
          controls
          preload="metadata"
          controlsList="nodownload"
          oncontextmenu="return false;"
        >
          <source src="${videoUrl}" type="video/mp4">
          브라우저가 비디오 재생을 지원하지 않습니다.
        </video>
        
        <div id="video-overlay" class="hidden absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div class="text-white text-center">
            <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
            <p class="text-lg">영상 건너뛰기가 감지되었습니다.</p>
            <p class="text-sm mt-2">정상적으로 시청해주세요.</p>
          </div>
        </div>

        <div class="mt-4 bg-white rounded-lg shadow p-4">
          <div class="flex justify-between items-center mb-2">
            <h3 class="text-lg font-bold">${this.videoData.title}</h3>
            <span class="text-sm text-gray-500">${this.videoData.duration_minutes || 0}분</span>
          </div>
          <p class="text-gray-600 text-sm mb-3">${this.videoData.description || ''}</p>
          
          <div class="flex items-center space-x-4">
            <div class="flex-1">
              <div class="flex justify-between text-sm mb-1">
                <span>시청 진도</span>
                <span id="progress-text">0%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div id="progress-bar" class="bg-green-500 h-2 rounded-full transition-all" style="width: 0%"></div>
              </div>
            </div>
            <div class="text-sm text-gray-600">
              <i class="fas fa-clock mr-1"></i>
              <span id="time-display">00:00 / 00:00</span>
            </div>
          </div>
        </div>
      </div>
    `;

    this.video = document.getElementById('mindstory-video');
    this.setupEventListeners(startPosition);
  }

  setupEventListeners(startPosition) {
    // 메타데이터 로드 완료
    this.video.addEventListener('loadedmetadata', () => {
      this.duration = this.video.duration;
      
      // 이전 시청 위치로 이동
      if (startPosition > 0 && startPosition < this.duration) {
        this.video.currentTime = startPosition;
      }
      
      this.updateTimeDisplay();
    });

    // 재생
    this.video.addEventListener('play', () => {
      this.isPlaying = true;
    });

    // 일시정지
    this.video.addEventListener('pause', () => {
      this.isPlaying = false;
      this.saveProgress();
    });

    // 시간 업데이트
    this.video.addEventListener('timeupdate', () => {
      this.updateProgress();
      this.updateTimeDisplay();
      this.detectSkipping();
    });

    // 재생 종료
    this.video.addEventListener('ended', () => {
      this.isPlaying = false;
      this.saveProgress(true);
    });

    // 우클릭 방지
    this.video.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    });

    // 페이지 벗어날 때 저장
    window.addEventListener('beforeunload', () => {
      this.saveProgress();
    });

    // 배속 제한 (선택사항)
    this.video.addEventListener('ratechange', () => {
      if (this.video.playbackRate > 2.0) {
        this.video.playbackRate = 2.0;
        this.showWarning('최대 2배속까지 지원됩니다.');
      }
    });
  }

  updateProgress() {
    if (!this.video || !this.duration) return;

    const currentTime = this.video.currentTime;
    const percentage = (currentTime / this.duration) * 100;

    // UI 업데이트
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    
    if (progressBar) progressBar.style.width = `${percentage}%`;
    if (progressText) progressText.textContent = `${Math.floor(percentage)}%`;
  }

  updateTimeDisplay() {
    if (!this.video) return;

    const current = this.formatTime(this.video.currentTime);
    const total = this.formatTime(this.duration);
    
    const timeDisplay = document.getElementById('time-display');
    if (timeDisplay) {
      timeDisplay.textContent = `${current} / ${total}`;
    }
  }

  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  detectSkipping() {
    // 건너뛰기 감지 (간단한 버전)
    const currentTime = this.video.currentTime;
    
    if (currentTime - this.lastSavedTime > 30 && this.isPlaying) {
      // 30초 이상 건너뛴 경우
      this.showWarning('영상을 건너뛰셨습니다. 정상적으로 시청해주세요.');
    }
  }

  startAutoSave() {
    // 5초마다 자동 저장
    this.saveInterval = setInterval(() => {
      if (this.isPlaying) {
        this.saveProgress();
      }
    }, 5000);
  }

  async saveProgress(isCompleted = false) {
    if (!this.video || !this.duration) return;

    const currentTime = this.video.currentTime;
    const percentage = (currentTime / this.duration) * 100;

    try {
      const response = await apiRequest('POST', '/api/progress/update', {
        lesson_id: this.lessonId,
        current_time: Math.floor(currentTime),
        duration: Math.floor(this.duration),
        watch_percentage: Math.floor(percentage)
      });

      this.lastSavedTime = currentTime;

      if (response.success && response.data.lesson_completed) {
        this.showSuccess('차시를 완료하셨습니다! 🎉');
      }

      if (response.success && response.data.course_completed) {
        this.showSuccess('강좌를 모두 완료하셨습니다! 수료증을 발급받으세요. 🎓');
      }

    } catch (error) {
      console.error('Progress save error:', error);
      // 로컬 스토리지에 백업
      this.saveToLocalStorage(currentTime, percentage);
    }
  }

  saveToLocalStorage(currentTime, percentage) {
    const key = `progress_lesson_${this.lessonId}`;
    localStorage.setItem(key, JSON.stringify({
      currentTime,
      percentage,
      timestamp: Date.now()
    }));
  }

  showError(message) {
    this.container.innerHTML = `
      <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <i class="fas fa-exclamation-circle text-red-500 text-4xl mb-3"></i>
        <p class="text-red-700 font-semibold">${message}</p>
      </div>
    `;
  }

  showWarning(message) {
    // 간단한 토스트 알림
    const toast = document.createElement('div');
    toast.className = 'fixed top-20 right-4 bg-yellow-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    toast.innerHTML = `<i class="fas fa-exclamation-triangle mr-2"></i>${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  showSuccess(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    toast.innerHTML = `<i class="fas fa-check-circle mr-2"></i>${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 5000);
  }

  destroy() {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
    
    // 마지막 진도 저장
    this.saveProgress();
  }
}

// 전역 함수로 노출
window.MindstoryVideoPlayer = MindstoryVideoPlayer;
