/**
 * 학습 플레이어 JavaScript
 * Hono 백틱 이스케이핑 문제 해결을 위해 외부 파일로 분리
 */

// 전역 변수
let courseData = null;
let lessonsData = [];
let currentLesson = null;
let enrollmentData = null;
let player = null; // YouTube or api.video player
let progressUpdateInterval = null;
let currentUserId = null;
let currentUserName = null;
let isRedirecting = false; // 리다이렉트 방지 플래그
let isInitialized = false; // 초기화 완료 플래그

const PROGRESS_UPDATE_INTERVAL = 5000; // 5초마다 진도 업데이트

// courseId는 HTML에서 window.COURSE_ID로 전달됨
const courseId = window.COURSE_ID;

/**
 * 초기화
 */
document.addEventListener('DOMContentLoaded', async () => {
    // 중복 초기화 방지
    if (isInitialized) {
        console.warn('⚠️ Already initialized, skip');
        return;
    }
    
    // 리다이렉트 중이면 중단
    if (isRedirecting) {
        console.warn('⚠️ Redirecting, skip initialization');
        return;
    }
    
    isInitialized = true;
    console.log('🎬 Learn Player 초기화 시작');
    
    // 인증 확인이 실패하면 여기서 중단
    const courseLoaded = await loadCourseData();
    if (!courseLoaded) {
        console.error('❌ Failed to load course data, stop initialization');
        return;
    }
    
    await loadLessons();
    await loadEnrollment();
    
    // URL에서 lessonId 파라미터 확인
    const urlParams = new URLSearchParams(window.location.search);
    const lessonIdParam = urlParams.get('lessonId');
    
    if (lessonIdParam && lessonsData.length > 0) {
        const lesson = lessonsData.find(l => l.id === parseInt(lessonIdParam));
        if (lesson) {
            await loadLesson(lesson.id);
        } else if (lessonsData.length > 0) {
            await loadLesson(lessonsData[0].id);
        }
    } else if (lessonsData.length > 0) {
        await loadLesson(lessonsData[0].id);
    }
});

/**
 * 강좌 데이터 로드
 */
async function loadCourseData() {
    try {
        console.log('📚 Loading course data for courseId:', courseId);
        
        // 리다이렉트 방지 체크
        if (isRedirecting) {
            console.warn('⚠️ Already redirecting, skip loading');
            return false;
        }
        
        // 사용자 정보 가져오기
        const user = await getCurrentUser();
        if (!user) {
            console.error('❌ User not authenticated');
            showError('로그인이 필요합니다.');
            return false;
        }
        
        const isAdmin = user && user.role === 'admin';
        currentUserId = user?.id;
        currentUserName = user?.name || user?.email;
        console.log('👤 User:', currentUserName, '(ID:', currentUserId, ') Role:', user.role);
        
        const response = await axios.get(`/api/courses/${courseId}`);
        
        // API 응답 구조 검증
        if (response.data && response.data.success === false) {
            throw new Error(response.data.error || '강좌를 찾을 수 없습니다.');
        }
        
        // 응답 데이터 추출 (API는 { success: true, data: { course: {...}, lessons: [...] } } 구조)
        const apiData = response.data.data || response.data;
        courseData = apiData.course || apiData;
        
        // 데이터 유효성 검증
        if (!courseData || !courseData.title) {
            console.error('Invalid course data:', response.data);
            console.error('Parsed courseData:', courseData);
            throw new Error('강좌 데이터가 올바르지 않습니다.');
        }
        
        // UI 업데이트
        document.getElementById('courseTitle').textContent = courseData.title;
        document.getElementById('courseDescription').textContent = courseData.description || '';
        
        console.log('✅ Course data loaded:', courseData.title);
        return true;
    } catch (error) {
        console.error('❌ Failed to load course data:', error);
        
        // 리다이렉트 중이 아닐 때만 처리
        if (!isRedirecting) {
            showError(error.message || '강좌 정보를 불러올 수 없습니다.');
            
            // 3초 후 강좌 목록으로 리다이렉트
            setTimeout(() => {
                window.location.replace('/courses');
            }, 3000);
        }
        
        return false;
    }
}

/**
 * 차시 목록 로드
 */
async function loadLessons() {
    try {
        const response = await axios.get(`/api/courses/${courseId}/lessons`);
        
        // API 응답 구조 검증
        if (response.data && response.data.success === false) {
            throw new Error(response.data.error || '차시 목록을 불러올 수 없습니다.');
        }
        
        // 응답 데이터 추출 및 배열 타입 검증
        let lessons = response.data.data || response.data;
        
        // 배열이 아니면 빈 배열로 초기화
        if (!Array.isArray(lessons)) {
            console.warn('⚠️ Lessons data is not an array:', lessons);
            lessons = [];
        }
        
        lessonsData = lessons;
        console.log(`✅ Loaded ${lessonsData.length} lessons`);
        
        // 차시가 없으면 안내 메시지 표시
        if (lessonsData.length === 0) {
            console.warn('⚠️ No lessons found for this course');
            document.getElementById('lessonList').innerHTML = '<div class="text-center text-gray-500 p-4">등록된 차시가 없습니다.</div>';
            return;
        }
        
        renderLessonList();
    } catch (error) {
        console.error('❌ Failed to load lessons:', error);
        showError(error.message || '차시 목록을 불러올 수 없습니다.');
        
        // 에러 발생 시 빈 배열로 초기화
        lessonsData = [];
        document.getElementById('lessonList').innerHTML = '<div class="text-center text-red-500 p-4">차시 목록을 불러올 수 없습니다.</div>';
    }
}

/**
 * 수강 정보 로드
 */
async function loadEnrollment() {
    try {
        const response = await axios.get(`/api/enrollments`);
        const enrollments = response.data;
        enrollmentData = enrollments.find(e => e.course_id === courseId);
        
        if (enrollmentData) {
            updateProgressUI(enrollmentData.watch_percentage || 0);
        }
    } catch (error) {
        console.error('❌ Failed to load enrollment:', error);
    }
}

/**
 * 차시 목록 렌더링
 */
function renderLessonList() {
    const container = document.getElementById('lessonList');
    if (!container || !lessonsData || lessonsData.length === 0) return;
    
    container.innerHTML = lessonsData.map(lesson => {
        const isActive = currentLesson && currentLesson.id === lesson.id;
        const isCompleted = lesson.completed;
        
        return `
            <div class="lesson-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} p-4 border-b cursor-pointer hover:bg-gray-50"
                 onclick="loadLesson(${lesson.id})">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <h3 class="lesson-title text-sm font-medium text-gray-900">
                            ${lesson.lesson_number}. ${lesson.title}
                        </h3>
                        ${lesson.video_duration_minutes ? `<p class="text-xs text-gray-500 mt-1">${lesson.video_duration_minutes}분</p>` : ''}
                    </div>
                    ${isCompleted ? '<i class="fas fa-check-circle text-green-500"></i>' : ''}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * 차시 로드
 */
async function loadLesson(lessonId) {
    try {
        console.log('📖 Loading lesson:', lessonId);
        
        // 진도율 추적 중지
        stopProgressTracking();

        // 차시 찾기
        currentLesson = lessonsData.find(l => l.id === lessonId);
        if (!currentLesson) {
            showError('차시를 찾을 수 없습니다.');
            return;
        }

        // UI 즉시 업데이트
        document.getElementById('currentLessonTitle').textContent = 
            `차시 ${currentLesson.lesson_number}: ${currentLesson.title}`;
        document.getElementById('currentLessonDescription').textContent = 
            currentLesson.description || '차시 설명이 없습니다.';
        
        // 차시 목록 활성화 상태 업데이트
        renderLessonList();
        
        // 로딩 인디케이터 표시
        const container = document.getElementById('videoPlayer');
        if (!container) {
            console.error('❌ videoPlayer container not found');
            return;
        }
        
        container.innerHTML = `
            <div class="flex items-center justify-center h-full bg-gray-900" style="min-height: 400px;">
                <div class="text-center">
                    <div class="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
                    <p class="text-white text-lg font-medium">영상 로딩 중...</p>
                    <p class="text-gray-400 text-sm mt-2">${currentLesson.title}</p>
                </div>
            </div>
        `;

        // 영상 플레이어 로드 (await로 완료 대기)
        await loadVideoPlayer(currentLesson);
        
        // 진도율 추적 시작
        startProgressTracking();
        
        console.log('✅ Lesson loaded successfully');

    } catch (error) {
        console.error('❌ Load lesson error:', error);
        showError('차시를 불러오는 중 오류가 발생했습니다.');
    }
}

/**
 * 영상 플레이어 로드
 */
async function loadVideoPlayer(lesson) {
    console.log('🎥 loadVideoPlayer called:', lesson);
    const container = document.getElementById('videoPlayer');
    
    if (!container) {
        console.error('❌ videoPlayer container not found');
        return;
    }
    
    try {
        // 영상 제공자 확인 (video_provider 또는 video_type 사용)
        const provider = lesson.video_provider || lesson.video_type || 'youtube';
        console.log('🎬 Video provider:', provider, '(from video_provider:', lesson.video_provider, ', video_type:', lesson.video_type, ')');
        
        if (provider === 'youtube') {
            console.log('▶️ Loading YouTube player');
            await loadYouTubePlayer(lesson);
        } else if (provider === 'apivideo' || provider === 'api.video') {
            console.log('▶️ Loading api.video player');
            await loadApiVideoPlayer(lesson);
        } else if (provider === 'cloudflare' || provider === 'stream') {
            console.log('▶️ Loading Cloudflare Stream player');
            await loadStreamPlayer(lesson);
        } else {
            console.error('❌ Unsupported video provider:', provider);
            container.innerHTML = `
                <div class="text-center p-12">
                    <i class="fas fa-exclamation-triangle text-6xl text-yellow-500 mb-4"></i>
                    <p class="text-xl">지원하지 않는 영상 형식입니다: ${provider}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('❌ Failed to load video player:', error);
        container.innerHTML = `
            <div class="text-center p-12">
                <i class="fas fa-exclamation-circle text-6xl text-red-500 mb-4"></i>
                <p class="text-xl text-red-600">영상을 불러오는 중 오류가 발생했습니다</p>
                <p class="text-sm text-gray-600 mt-2">${error?.message || '알 수 없는 오류'}</p>
                <button onclick="location.reload()" class="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    다시 시도
                </button>
            </div>
        `;
    }
}

/**
 * YouTube API 로드 보장
 */
function waitForYouTubeAPI() {
    return new Promise((resolve) => {
        if (window.YT && window.YT.Player) {
            console.log('✅ YouTube API already loaded');
            resolve();
        } else {
            console.log('⏳ Waiting for YouTube API...');
            const oldCallback = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                console.log('✅ YouTube API ready');
                if (oldCallback) oldCallback();
                resolve();
            };
            
            // YouTube API 스크립트 로드 (아직 없다면)
            if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
                const tag = document.createElement('script');
                tag.src = 'https://www.youtube.com/iframe_api';
                document.head.appendChild(tag);
            }
        }
    });
}

/**
 * YouTube 플레이어 로드
 */
async function loadYouTubePlayer(lesson) {
    const container = document.getElementById('videoPlayer');
    
    // Video ID 추출
    let videoId = lesson.video_id || lesson.video_url;
    
    // video_url이 전체 URL인 경우 ID 추출
    if (videoId && videoId.includes('youtube.com') || videoId.includes('youtu.be')) {
        const match = videoId.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/);
        videoId = match ? match[1] : videoId;
    }

    if (!videoId) {
        container.innerHTML = '<p class="text-white p-12 text-center">YouTube 영상 ID를 찾을 수 없습니다.</p>';
        return;
    }

    console.log('📹 YouTube Video ID:', videoId);

    // YouTube API 로드 대기
    await waitForYouTubeAPI();

    // 플레이어 컨테이너 생성 (투명 보호막으로 YouTube 로고/제목 클릭 완전 차단 + 배속 재생 컨트롤)
    container.innerHTML = `
        <div id="youtubeWrapper" style="position: relative; width: 100%; height: 600px; background: #000;">
            <div id="youtubePlayer" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></div>
            <div id="youtubeProtectionLayer" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: auto; z-index: 999; background: transparent; cursor: default;"></div>
            
            <!-- 배속 재생 컨트롤 -->
            <div id="playbackSpeedControl" style="position: absolute; bottom: 20px; right: 20px; z-index: 1000; display: flex; gap: 8px; background: rgba(0,0,0,0.7); padding: 10px; border-radius: 8px;">
                <button class="speed-btn" data-speed="0.5" style="padding: 8px 12px; background: #444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500;">0.5x</button>
                <button class="speed-btn" data-speed="0.75" style="padding: 8px 12px; background: #444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500;">0.75x</button>
                <button class="speed-btn active" data-speed="1" style="padding: 8px 12px; background: #1a73e8; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500;">1x</button>
                <button class="speed-btn" data-speed="1.25" style="padding: 8px 12px; background: #444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500;">1.25x</button>
                <button class="speed-btn" data-speed="1.5" style="padding: 8px 12px; background: #444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500;">1.5x</button>
                <button class="speed-btn" data-speed="2" style="padding: 8px 12px; background: #444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500;">2x</button>
            </div>
        </div>
    `;

    console.log('🎬 Initializing YouTube Player...');

    // YouTube Player 초기화
    player = new YT.Player('youtubePlayer', {
        height: '600',
        width: '100%',
        videoId: videoId,
        playerVars: {
            autoplay: 1,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            cc_load_policy: 0,
            showinfo: 0
        },
        events: {
            onReady: onYouTubePlayerReady,
            onStateChange: onYouTubePlayerStateChange
        }
    });
}

function onYouTubePlayerReady(event) {
    console.log('✅ YouTube player ready - video will start playing');
    
    // 배속 재생 버튼 이벤트 리스너 추가
    const speedButtons = document.querySelectorAll('.speed-btn');
    speedButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const speed = parseFloat(btn.dataset.speed);
            if (player && player.setPlaybackRate) {
                player.setPlaybackRate(speed);
                
                // 활성 버튼 스타일 업데이트
                speedButtons.forEach(b => {
                    b.style.background = '#444';
                    b.classList.remove('active');
                });
                btn.style.background = '#1a73e8';
                btn.classList.add('active');
                
                console.log(`⚡ 재생 속도 변경: ${speed}x`);
            }
        });
    });
}

function onYouTubePlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        console.log('🏁 YouTube video ended');
        markLessonCompleted();
    }
}

/**
 * Cloudflare Stream 플레이어 로드
 */
async function loadStreamPlayer(lesson) {
    console.log('☁️ Loading Cloudflare Stream player:', lesson);
    const container = document.getElementById('videoPlayer');
    
    const videoId = lesson.video_id;
    console.log('📹 Stream Video ID:', videoId);
    
    if (!videoId) {
        console.error('❌ No video ID found');
        container.innerHTML = '<p class="text-white p-12 text-center">영상 ID를 찾을 수 없습니다.</p>';
        return;
    }

    try {
        const accountId = '2e8c2335c9dc802347fb23b9d608d4f4';
        const embedUrl = `https://customer-${accountId}.cloudflarestream.com/${videoId}/iframe?preload=true&autoplay=false&muted=false`;
        
        console.log('🔗 Stream Embed URL:', embedUrl);
        
        // 워터마크 포함 컨테이너 생성
        container.innerHTML = `
            <div style="position: relative; width: 100%; padding-top: 56.25%;">
                <iframe
                    id="streamPlayerFrame"
                    src="${embedUrl}"
                    loading="eager"
                    style="border: none; position: absolute; top: 0; left: 0; height: 100%; width: 100%;"
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                    allowfullscreen="true"
                ></iframe>
                <div id="streamWatermark" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); color: white; padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: 500; pointer-events: none; z-index: 1000; animation: watermarkFloat 15s infinite ease-in-out;">
                    ${currentUserName || '사용자'} (ID: ${currentUserId || 'N/A'})
                </div>
            </div>
            
            <style>
                @keyframes watermarkFloat {
                    0%, 100% { top: 10px; right: 10px; }
                    25% { top: 10px; right: calc(100% - 250px); }
                    50% { top: calc(100% - 50px); right: calc(100% - 250px); }
                    75% { top: calc(100% - 50px); right: 10px; }
                }
            </style>
        `;

        // IFrame 로드 완료 대기
        const iframe = document.getElementById('streamPlayerFrame');
        iframe.onload = () => {
            console.log('✅ Cloudflare Stream iframe loaded successfully');
            
            // 영상 플레이어 보호 즉시 적용
            setTimeout(() => {
                const videoContainer = document.getElementById('videoPlayer');
                if (videoContainer) {
                    applyVideoProtection(videoContainer);
                }
            }, 500);
        };
        
        iframe.onerror = (error) => {
            console.error('❌ Stream iframe failed to load:', error);
            container.innerHTML = `
                <div class="text-center p-12">
                    <i class="fas fa-exclamation-circle text-6xl text-red-500 mb-4"></i>
                    <p class="text-xl text-red-600">영상을 불러올 수 없습니다</p>
                    <p class="text-sm text-gray-600 mt-2">Video ID: ${videoId}</p>
                    <button onclick="location.reload()" class="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        다시 시도
                    </button>
                </div>
            `;
        };

        console.log('✅ Stream player setup complete');

    } catch (error) {
        console.error('❌ Failed to create Stream player:', error);
        container.innerHTML = `
            <div class="text-center p-12">
                <i class="fas fa-exclamation-circle text-6xl text-red-500 mb-4"></i>
                <p class="text-xl text-red-600">Stream 플레이어를 불러오는 중 오류가 발생했습니다</p>
                <p class="text-sm text-gray-600 mt-2">${error?.message || '알 수 없는 오류'}</p>
            </div>
        `;
    }
}

/**
 * api.video 플레이어 로드
 */
async function loadApiVideoPlayer(lesson) {
    console.log('🎬 Loading api.video player:', lesson);
    const container = document.getElementById('videoPlayer');
    
    const videoId = lesson.video_id;
    console.log('📹 Video ID:', videoId);
    
    if (!videoId) {
        console.error('❌ No video ID found');
        container.innerHTML = '<p class="text-white p-12 text-center">영상 ID를 찾을 수 없습니다.</p>';
        return;
    }

    // api.video embed URL
    const embedUrl = `https://embed.api.video/vod/${videoId}`;
    console.log('🔗 Embed URL:', embedUrl);

    // IFrame 생성
    const iframe = document.createElement('iframe');
    iframe.id = 'apiVideoPlayer';
    iframe.src = embedUrl;
    iframe.width = '100%';
    iframe.height = '600';
    iframe.frameBorder = '0';
    iframe.scrolling = 'no';
    iframe.allowFullscreen = true;
    iframe.allow = 'autoplay; fullscreen; picture-in-picture';
    
    iframe.onload = function() {
        console.log('✅ api.video iframe loaded successfully');
        
        // 영상 플레이어 보호 즉시 적용
        setTimeout(() => {
            const videoContainer = document.getElementById('videoPlayer');
            if (videoContainer) {
                applyVideoProtection(videoContainer);
            }
        }, 500);
    };
    
    iframe.onerror = function(error) {
        console.error('❌ api.video iframe failed to load:', error);
    };

    container.innerHTML = '';
    container.appendChild(iframe);
    
    console.log('✅ api.video player iframe created and appended');
}

/**
 * 진도율 추적 시작
 */
function startProgressTracking() {
    stopProgressTracking();
    progressUpdateInterval = setInterval(() => {
        updateProgress().catch(err => {
            console.error('❌ Progress tracking error:', err);
        });
    }, PROGRESS_UPDATE_INTERVAL);
}

/**
 * 진도율 추적 중지
 */
function stopProgressTracking() {
    if (progressUpdateInterval) {
        clearInterval(progressUpdateInterval);
        progressUpdateInterval = null;
    }
}

/**
 * 진도율 업데이트
 */
async function updateProgress() {
    if (!currentLesson || !player) return;

    try {
        let currentTime = 0;
        let duration = 1;
        let watchPercentage = 0;

        // YouTube player
        if (player.getCurrentTime && player.getDuration) {
            currentTime = player.getCurrentTime();
            duration = player.getDuration();
            watchPercentage = Math.round((currentTime / duration) * 100);
        } else {
            // api.video - estimate from duration
            duration = currentLesson.video_duration_minutes * 60;
            currentTime = duration * 0.5;
            watchPercentage = 50;
        }

        // 서버에 진도율 전송
        await axios.post('/api/progress/update', {
            lesson_id: currentLesson.id,
            watch_percentage: Math.min(watchPercentage, 100),
            current_time: Math.floor(currentTime),
            duration: Math.floor(duration)
        });

        // UI 업데이트
        updateProgressUI(watchPercentage);

    } catch (error) {
        console.error('❌ Failed to update progress:', error);
    }
}

/**
 * 진도율 UI 업데이트
 */
function updateProgressUI(percentage) {
    const progressBar = document.getElementById('progressBar');
    const progressPercentage = document.getElementById('progressPercentage');
    
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }
    if (progressPercentage) {
        progressPercentage.textContent = `${Math.round(percentage)}%`;
    }
}

/**
 * 차시 완료 마킹
 */
async function markLessonCompleted() {
    if (!currentLesson) return;
    
    try {
        await axios.post('/api/progress/complete', {
            lesson_id: currentLesson.id
        });
        
        console.log('✅ Lesson marked as completed');
        
        // 차시 목록 업데이트
        const lesson = lessonsData.find(l => l.id === currentLesson.id);
        if (lesson) {
            lesson.completed = true;
            renderLessonList();
        }
        
        // 다음 차시로 자동 이동 (선택사항)
        const currentIndex = lessonsData.findIndex(l => l.id === currentLesson.id);
        if (currentIndex >= 0 && currentIndex < lessonsData.length - 1) {
            const nextLesson = lessonsData[currentIndex + 1];
            if (confirm(`다음 차시 "${nextLesson.title}"로 이동하시겠습니까?`)) {
                await loadLesson(nextLesson.id);
            }
        }
        
    } catch (error) {
        console.error('❌ Failed to mark lesson as completed:', error);
    }
}

/**
 * 에러 표시
 */
function showError(message) {
    alert(message);
}

/**
 * 현재 사용자 정보 가져오기
 */
async function getCurrentUser() {
    try {
        const response = await axios.get('/api/auth/me');
        
        // API 응답 구조 검증
        if (response.data && response.data.success === false) {
            console.warn('⚠️ Auth API returned success=false');
            return null;
        }
        
        // 사용자 데이터 추출
        const user = response.data.user || response.data.data || response.data;
        
        // 사용자 데이터 유효성 검증
        if (!user || !user.id) {
            console.warn('⚠️ Invalid user data:', user);
            return null;
        }
        
        return user;
    } catch (error) {
        console.error('Failed to get current user:', error);
        
        // 401 에러면 로그인 페이지로 리다이렉트
        if (error.response && error.response.status === 401) {
            console.warn('⚠️ Unauthorized - user not logged in');
        }
        
        return null;
    }
}

/**
 * 영상 플레이어 우클릭 보호 강화
 */
