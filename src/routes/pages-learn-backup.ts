/**
 * Learning Pages Router
 * Student lesson learning/watching pages
 */

import { Hono } from 'hono'
import type { Bindings } from '../types/database'
import { STATIC_JS_CACHE_QUERY } from '../utils/static-js-cache-bust'

const app = new Hono<{ Bindings: Bindings }>()

/**
 * Course Learning Page
 * GET /courses/:courseId/learn
 */
app.get('/courses/:courseId/learn', async (c) => {
  const courseId = c.req.param('courseId')
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=0.9, maximum-scale=1.0, user-scalable=yes">
        <title>강좌 학습 - 마인드스토리 LMS</title>
        <link rel="stylesheet" href="/static/css/app.css" />
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://embed.cloudflarestream.com/embed/sdk.latest.js"></script>
        <script src="/static/js/auth.js?v=20260329-admin-name"></script>
        <style>
            .lesson-item.active {
                background-color: #EBF8FF;
                border-left: 4px solid #3B82F6;
            }
            .lesson-item.completed {
                opacity: 0.7;
            }
            .lesson-item.completed .lesson-title::after {
                content: " ✓";
                color: #10B981;
            }
            #videoPlayer {
                width: 100%;
                height: 600px;
            }
            
            /* YouTube IFrame 보호 */
            iframe {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                user-select: none !important;
            }
            
            /* YouTube 컨트롤 보호 */
            .ytp-chrome-top,
            .ytp-share-button,
            .ytp-watch-later-button {
                display: none !important;
            }
            
            /* 모바일 최적화 - 폰트 크기 조정 */
            @media (max-width: 768px) {
                html {
                    font-size: 14.4px; /* 12px * 1.2 = 14.4px */
                }
                
                body {
                    line-height: 1.6;
                }
                
                h1 {
                    font-size: 1.68rem !important; /* 1.4 * 1.2 */
                }
                
                h2 {
                    font-size: 1.38rem !important; /* 1.15 * 1.2 */
                }
                
                h3 {
                    font-size: 1.2rem !important; /* 1.0 * 1.2 */
                }
                
                p, div {
                    font-size: 1.02rem !important; /* 0.85 * 1.2 */
                }
                
                #videoPlayer {
                    height: 264px !important; /* 220 * 1.2 */
                }
                
                .lesson-item {
                    padding: 0.75rem !important; /* 터치 영역 증가 */
                    min-height: 60px; /* 터치하기 쉽게 */
                }
                
                button {
                    padding: 0.6rem 1.2rem !important; /* 터치 영역 증가 */
                    font-size: 1rem !important; /* 0.8 * 1.25 */
                    min-height: 44px; /* iOS 권장 터치 크기 */
                }
            }
        </style>
        <script src="/static/js/content-protection.js${STATIC_JS_CACHE_QUERY}"></script>
    </head>
    <body class="bg-gray-50">
        <!-- 헤더 -->
        <header class="bg-white shadow-sm">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-xl font-bold text-blue-600">
                        <i class="fas fa-arrow-left mr-2"></i>
                        강좌로 돌아가기
                    </a>
                    <span class="inline-flex items-center max-w-[min(11rem,40vw)]"><span id="headerUserName" class="text-gray-700 font-semibold truncate" data-ms-name-default="text-gray-700 font-semibold truncate"></span></span>
                </div>
            </div>
        </header>

        <!-- 메인 컨텐츠 -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- 영상 플레이어 (왼쪽 2/3) -->
                <div class="lg:col-span-2">
                    <!-- 강좌 정보 -->
                    <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <h1 id="courseTitle" class="text-2xl font-bold text-gray-900 mb-2">
                            로딩 중...
                        </h1>
                        <p id="courseDescription" class="text-gray-600 mb-4">
                            로딩 중...
                        </p>
                        <!-- 진도율 프로그레스 바 -->
                        <div class="mb-2">
                            <div class="flex justify-between text-sm text-gray-600 mb-1">
                                <span>진도율</span>
                                <span id="progressPercentage" class="font-semibold">0%</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div id="progressBar" class="bg-blue-600 h-2 rounded-full transition-all" style="width: 0%"></div>
                            </div>
                        </div>
                    </div>

                    <!-- 영상 플레이어 -->
                    <div class="bg-black rounded-lg shadow-lg mb-6">
                        <div id="videoContainer" class="relative">
                            <div id="videoPlayer" class="flex items-center justify-center text-white">
                                <div class="text-center">
                                    <i class="fas fa-spinner fa-spin text-6xl mb-4"></i>
                                    <p class="text-xl">영상을 불러오는 중...</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 현재 차시 정보 -->
                    <div class="bg-white rounded-lg shadow-sm p-6">
                        <h2 id="currentLessonTitle" class="text-xl font-bold text-gray-900 mb-2">
                            차시를 선택해주세요
                        </h2>
                        <p id="currentLessonDescription" class="text-gray-600">
                            왼쪽 목록에서 학습할 차시를 선택하세요.
                        </p>
                    </div>
                </div>

                <!-- 차시 목록 (오른쪽 1/3) -->
                <div class="lg:col-span-1">
                    <div class="bg-white rounded-lg shadow-sm sticky top-4">
                        <div class="p-4 border-b">
                            <h3 class="text-lg font-bold text-gray-900">
                                <i class="fas fa-list mr-2"></i>차시 목록
                            </h3>
                            <p class="text-sm text-gray-600 mt-1">
                                <span id="lessonStats">0/0 차시 완료</span>
                            </p>
                        </div>
                        <div id="lessonList" class="overflow-y-auto" style="max-height: 600px;">
                            <div class="p-8 text-center text-gray-500">
                                <i class="fas fa-spinner fa-spin text-3xl mb-2"></i>
                                <p>차시 목록을 불러오는 중...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <!-- courseId를 전역 변수로 전달 -->
        <script>
        window.COURSE_ID = parseInt('${courseId}');
        </script>
        
        <!-- 학습 플레이어 외부 JS -->
        <script src="/static/js/learn-player.js"></script>
        
        <script>
        // 기존 inline script 제거됨 - learn-player.js에서 처리
        let courseData = null;
        let lessonsData = [];
        let currentLesson = null;
        let enrollmentData = null;
        let player = null; // YouTube or api.video player
        let progressUpdateInterval = null;

        const PROGRESS_UPDATE_INTERVAL = 5000; // 5초마다 진도 업데이트

        async function loadCourseData() {
            try {
                const courseId = parseInt('${courseId}');
                console.log('📚 Loading course data for courseId:', courseId);
                
                // 🔐 관리자 확인
                const user = await getCurrentUser();
                const isAdmin = user && user.role === 'admin';
                console.log('👤 User role:', isAdmin ? 'admin' : 'user');
                
                // Load course info
                console.log('🔍 Fetching course info...');
                const courseResponse = await apiRequest('GET', \`/api/courses/\${courseId}\`);
                console.log('✅ Course response:', courseResponse);
                if (!courseResponse.success) {
                    console.error('❌ Course info failed:', courseResponse);
                    const errorMsg = courseResponse.error || '강좌 정보를 불러올 수 없습니다.';
                    showError(errorMsg);
                    // Redirect to courses list if course not found or access denied
                    if (courseResponse.error?.includes('찾을 수 없') || courseResponse.error?.includes('권한')) {
                        setTimeout(() => {
                            window.location.href = '/courses';
                        }, 2000);
                    }
                    return;
                }
                courseData = courseResponse.data || courseResponse.course;
                console.log('✅ Course data loaded:', courseData);
                
                // 🔐 수강 등록 확인 (관리자는 모든 강좌 접근 가능)
                if (!isAdmin) {
                    const enrollment = courseResponse.enrollment || courseResponse.data?.enrollment;
                    console.log('🔍 Enrollment status:', enrollment);
                    
                    if (!enrollment || (enrollment.status !== 'active' && enrollment.status !== 'completed')) {
                        console.warn('⚠️ Not enrolled in this course');
                        showError('이 강좌에 수강 등록이 필요합니다.');
                        setTimeout(() => {
                            window.location.href = '/courses/' + courseId;
                        }, 2000);
                        return;
                    }
                    console.log('✅ Enrollment verified');
                }
                
                // Load lessons
                console.log('🔍 Fetching lessons...');
                const lessonsResponse = await apiRequest('GET', \`/api/courses/\${courseId}/lessons\`);
                console.log('✅ Lessons response:', lessonsResponse);
                if (!lessonsResponse.success) {
                    console.error('❌ Lessons failed:', lessonsResponse);
                    showError('차시 목록을 불러올 수 없습니다.');
                    return;
                }
                lessonsData = lessonsResponse.data || lessonsResponse.lessons || [];
                console.log('✅ Lessons loaded:', lessonsData.length, 'lessons');
                
                // Load progress (optional - don't block if fails)
                try {
                    console.log('🔍 Fetching progress...');
                    const progressResponse = await apiRequest('GET', \`/api/progress/courses/\${courseId}\`);
                    console.log('✅ Progress response:', progressResponse);
                    if (progressResponse.success) {
                        enrollmentData = progressResponse.enrollment;
                        updateProgressDisplay();
                        console.log('✅ Progress loaded');
                    } else {
                        console.warn('⚠️ Progress not available:', progressResponse);
                    }
                } catch (progressError) {
                    console.warn('⚠️ Progress load failed (non-critical):', progressError);
                    // Continue without progress - show 0%
                    document.getElementById('progressPercentage').textContent = '0%';
                }
                
                // Render UI
                renderCourseInfo();
                renderLessonList();
                
                // Check if specific lesson is requested via URL
                const urlParams = new URLSearchParams(window.location.search);
                const requestedLessonId = urlParams.get('lessonId');
                
                if (requestedLessonId) {
                    // Load requested lesson
                    const requestedLesson = lessonsData.find(l => l.id == requestedLessonId);
                    if (requestedLesson) {
                        loadLesson(requestedLesson.id);
                    } else {
                        // Fallback to first lesson
                        loadLesson(lessonsData[0]?.id);
                    }
                } else {
                    // Load first incomplete lesson or last watched
                    const firstIncomplete = lessonsData.find(l => !l.is_completed);
                    if (firstIncomplete) {
                        loadLesson(firstIncomplete.id);
                    } else if (lessonsData.length > 0) {
                        loadLesson(lessonsData[0].id);
                    }
                }
                
            } catch (error) {
                console.error('❌ Load course error - Full error object:', error);
                console.error('❌ Error details:', {
                    message: error?.message,
                    name: error?.name,
                    stack: error?.stack,
                    toString: error?.toString?.(),
                    errorType: typeof error,
                    errorKeys: error ? Object.keys(error) : [],
                    courseId: '${courseId}'
                });
                
                // Try to extract response error
                if (error?.response) {
                    console.error('❌ Response error:', {
                        status: error.response.status,
                        data: error.response.data
                    });
                }
                
                showError('강좌를 불러오는 중 오류가 발생했습니다: ' + (error?.message || JSON.stringify(error)));
            }
        }

        function renderCourseInfo() {
            document.getElementById('courseTitle').textContent = courseData.title;
            document.getElementById('courseDescription').textContent = courseData.description || '강좌 설명이 없습니다.';
        }

        function updateProgressDisplay() {
            if (!enrollmentData) return;
            
            const progress = enrollmentData.completion_rate || 0;
            document.getElementById('progressPercentage').textContent = progress + '%';
            document.getElementById('progressBar').style.width = progress + '%';
        }

        function renderLessonList() {
            const container = document.getElementById('lessonList');
            
            if (lessonsData.length === 0) {
                container.innerHTML = \`
                    <div class="p-8 text-center text-gray-500">
                        <i class="fas fa-inbox text-4xl mb-2"></i>
                        <p>등록된 차시가 없습니다.</p>
                    </div>
                \`;
                return;
            }

            const completedCount = lessonsData.filter(l => l.is_completed).length;
            document.getElementById('lessonStats').textContent = \`\${completedCount}/\${lessonsData.length} 차시 완료\`;

            container.innerHTML = lessonsData.map(lesson => {
                const isActive = currentLesson && currentLesson.id === lesson.id;
                const isCompleted = lesson.is_completed;
                const watchPercentage = lesson.watch_percentage || 0;

                return \`
                    <div class="lesson-item border-b hover:bg-gray-50 cursor-pointer p-4 \${isActive ? 'active' : ''} \${isCompleted ? 'completed' : ''}"
                         onclick="loadLesson(\${lesson.id})">
                        <div class="flex items-start">
                            <div class="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                \${isCompleted 
                                    ? '<i class="fas fa-check text-green-600"></i>' 
                                    : '<span class="text-sm font-semibold text-blue-600">' + lesson.lesson_number + '</span>'}
                            </div>
                            <div class="flex-1">
                                <h4 class="lesson-title font-semibold text-gray-900 mb-1">
                                    \${lesson.title}
                                </h4>
                                <div class="flex items-center text-sm text-gray-600">
                                    <i class="fas fa-clock mr-1"></i>
                                    <span>\${lesson.video_duration_minutes || 0}분</span>
                                </div>
                                \${watchPercentage > 0 && !isCompleted ? \`
                                    <div class="mt-2">
                                        <div class="w-full bg-gray-200 rounded-full h-1">
                                            <div class="bg-blue-500 h-1 rounded-full" style="width: \${watchPercentage}%"></div>
                                        </div>
                                    </div>
                                \` : ''}
                            </div>
                        </div>
                    </div>
                \`;
            }).join('');
        }

        async function loadLesson(lessonId) {
            try {
                // Stop previous progress tracking
                stopProgressTracking();

                // Find lesson
                currentLesson = lessonsData.find(l => l.id === lessonId);
                if (!currentLesson) {
                    showError('차시를 찾을 수 없습니다.');
                    return;
                }

                // Update UI immediately (before video loads)
                document.getElementById('currentLessonTitle').textContent = 
                    \`차시 \${currentLesson.lesson_number}: \${currentLesson.title}\`;
                document.getElementById('currentLessonDescription').textContent = 
                    currentLesson.description || '차시 설명이 없습니다.';
                
                // Update lesson list active state immediately
                renderLessonList();
                
                // Show loading indicator
                const container = document.getElementById('videoPlayer');
                container.innerHTML = \`
                    <div class="flex items-center justify-center h-full bg-gray-900" style="min-height: 400px;">
                        <div class="text-center">
                            <div class="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
                            <p class="text-white text-lg font-medium">영상 로딩 중...</p>
                            <p class="text-gray-400 text-sm mt-2">\${currentLesson.title}</p>
                        </div>
                    </div>
                \`;

                // Load video player (wait for completion to ensure player is ready)
                try {
                    await loadVideoPlayer(currentLesson);
                    
                    // Start progress tracking after player is loaded
                    startProgressTracking();
                    
                    console.log('✅ Lesson loaded successfully');
                } catch (error) {
                    console.error('❌ Video load error:', error);
                    showError('영상을 불러오는 중 오류가 발생했습니다.');
                }

            } catch (error) {
                console.error('❌ Load lesson error:', {
                    message: error?.message || 'Unknown error',
                    name: error?.name,
                    stack: error?.stack,
                    lessonId: lessonId
                });
                showError('차시를 불러오는 중 오류가 발생했습니다.');
            }
        }

        async function loadVideoPlayer(lesson) {
            console.log('🎥 loadVideoPlayer called:', lesson);
            const container = document.getElementById('videoPlayer');
            
            try {
                // Determine video provider
                const provider = lesson.video_provider || 'youtube';
                console.log('🎬 Video provider:', provider);
                
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
                    container.innerHTML = \`
                        <div class="text-center p-12">
                            <i class="fas fa-exclamation-triangle text-6xl text-yellow-500 mb-4"></i>
                            <p class="text-xl">지원하지 않는 영상 형식입니다: \${provider}</p>
                        </div>
                    \`;
                }
            } catch (error) {
                console.error('❌ Failed to load video player:', {
                    message: error?.message || 'Unknown error',
                    name: error?.name,
                    stack: error?.stack,
                    lesson: lesson
                });
                container.innerHTML = \`
                    <div class="text-center p-12">
                        <i class="fas fa-exclamation-circle text-6xl text-red-500 mb-4"></i>
                        <p class="text-xl text-red-600">영상을 불러오는 중 오류가 발생했습니다</p>
                        <p class="text-sm text-gray-600 mt-2">\${error?.message || '알 수 없는 오류'}</p>
                        <button onclick="location.reload()" class="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                            다시 시도
                        </button>
                    </div>
                \`;
            }
        }

        async function loadYouTubePlayer(lesson) {
            const container = document.getElementById('videoPlayer');
            
            // Extract video ID from URL
            let videoId = lesson.video_id;
            if (!videoId && lesson.video_url) {
                const match = lesson.video_url.match(/(?:youtube\\.com\\/(?:[^\\/]+\\/.+\\/|(?:v|e(?:mbed)?)\\/|.*[?&]v=)|youtu\\.be\\/)([^"&?\\/ ]{11})/);
                videoId = match ? match[1] : null;
            }

            if (!videoId) {
                container.innerHTML = '<p class="text-white p-12 text-center">YouTube 영상 ID를 찾을 수 없습니다.</p>';
                return;
            }

            // Load YouTube IFrame API
            if (!window.YT) {
                await loadYouTubeAPI();
            }

            // YouTube 플레이어 컨테이너 + 보호 오버레이
            container.innerHTML = '<div style="position: relative; width: 100%; height: 600px;"><div id="youtubePlayer" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></div><div id="youtubeProtection" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10;"></div></div>';

            player = new YT.Player('youtubePlayer', {
                height: '600',
                width: '100%',
                videoId: videoId,
                playerVars: {
                    autoplay: 1,
                    controls: 1,
                    modestbranding: 1,
                    rel: 0,
                    disablekb: 1,           // 키보드 컨트롤 비활성화
                    fs: 0,                  // 전체화면 버튼 숨김
                    iv_load_policy: 3,      // 주석 숨김
                    cc_load_policy: 0,      // 자막 표시 안함
                    showinfo: 0             // 제목 표시 안함
                },
                events: {
                    onReady: onYouTubePlayerReady,
                    onStateChange: onYouTubePlayerStateChange
                }
            });
        }

        function loadYouTubeAPI() {
            return new Promise((resolve) => {
                if (window.YT && window.YT.Player) {
                    resolve();
                    return;
                }

                window.onYouTubeIframeAPIReady = resolve;

                const tag = document.createElement('script');
                tag.src = 'https://www.youtube.com/iframe_api';
                document.head.appendChild(tag);
            });
        }

        function onYouTubePlayerReady(event) {
            console.log('✅ YouTube player ready');
        }

        function onYouTubePlayerStateChange(event) {
            // YT.PlayerState.PLAYING = 1
            // YT.PlayerState.PAUSED = 2
            // YT.PlayerState.ENDED = 0
            
            if (event.data === YT.PlayerState.ENDED) {
                markLessonCompleted();
            }
        }

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
            const embedUrl = \`https://embed.api.video/vod/\${videoId}\`;
            console.log('🔗 Embed URL:', embedUrl);

            // Create iframe programmatically for better control
            const iframe = document.createElement('iframe');
            iframe.id = 'apiVideoPlayer';
            iframe.src = embedUrl;
            iframe.width = '100%';
            iframe.height = '600';
            iframe.frameBorder = '0';
            iframe.scrolling = 'no';
            iframe.allowFullscreen = true;
            iframe.allow = 'autoplay; fullscreen; picture-in-picture';
            
            // Add load event listener
            iframe.onload = function() {
                console.log('✅ api.video iframe loaded successfully');
            };
            
            iframe.onerror = function(error) {
                console.error('❌ api.video iframe failed to load:', {
                    message: error?.message || 'Unknown error',
                    type: error?.type || 'error',
                    target: error?.target?.src || embedUrl
                });
            };

            // Clear container and append iframe
            container.innerHTML = '';
            container.appendChild(iframe);
            
            console.log('✅ api.video player iframe created and appended');

            // Listen to api.video events (postMessage)
            window.addEventListener('message', handleApiVideoMessage);
            console.log('📡 Listening for api.video messages');
        }

        function handleApiVideoMessage(event) {
            // Security: Only accept messages from api.video
            if (event.origin !== 'https://embed.api.video') return;

            try {
                const data = event.data;
                console.log('📨 Received api.video message:', data);
                
                if (data.type === 'ended') {
                    console.log('🏁 Video ended, marking as completed');
                    markLessonCompleted().catch(err => {
                        console.error('❌ Failed to mark lesson completed:', {
                            message: err?.message || 'Unknown error',
                            name: err?.name,
                            stack: err?.stack
                        });
                    });
                }
            } catch (error) {
                console.error('❌ Error handling api.video message:', {
                    message: error?.message || 'Unknown error',
                    name: error?.name,
                    event: event
                });
            }
        }

        // Cloudflare Stream Player
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
                // 간단하고 빠른 IFrame 방식 (SDK 불필요)
                const accountId = '2e8c2335c9dc802347fb23b9d608d4f4';
                const embedUrl = \`https://customer-\${accountId}.cloudflarestream.com/\${videoId}/iframe?preload=true&autoplay=false&muted=false\`;
                
                console.log('🔗 Stream Embed URL:', embedUrl);
                
                // 워터마크 포함 컨테이너 생성
                container.innerHTML = \`
                    <div style="position: relative; width: 100%; padding-top: 56.25%;">
                        <iframe
                            id="streamPlayerFrame"
                            src="\${embedUrl}"
                            loading="eager"
                            style="border: none; position: absolute; top: 0; left: 0; height: 100%; width: 100%;"
                            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                            allowfullscreen="true"
                        ></iframe>
                        <div id="streamWatermark" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); color: white; padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: 500; pointer-events: none; z-index: 1000; animation: watermarkFloat 15s infinite ease-in-out;">
                            \${currentUserName || '사용자'} (ID: \${currentUserId || 'N/A'})
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
                \`;

                // IFrame 로드 완료 대기
                const iframe = document.getElementById('streamPlayerFrame');
                iframe.onload = () => {
                    console.log('✅ Cloudflare Stream iframe loaded successfully');
                    
                    // Stream SDK 로드 (선택적, 이벤트 트래킹용)
                    if (window.Stream) {
                        player = window.Stream(iframe);
                        console.log('✅ Stream SDK connected');
                        
                        // 이벤트 리스너
                        player.addEventListener('ended', async () => {
                            console.log('🏁 영상 재생 완료');
                            await markLessonCompleted();
                        });
                    }
                };
                
                iframe.onerror = (error) => {
                    console.error('❌ Stream iframe failed to load:', error);
                    container.innerHTML = \`
                        <div class="text-center p-12">
                            <i class="fas fa-exclamation-circle text-6xl text-red-500 mb-4"></i>
                            <p class="text-xl text-red-600">영상을 불러올 수 없습니다</p>
                            <p class="text-sm text-gray-600 mt-2">Video ID: \${videoId}</p>
                            <button onclick="location.reload()" class="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                                다시 시도
                            </button>
                        </div>
                    \`;
                };

                console.log('✅ Stream player setup complete');

            } catch (error) {
                console.error('❌ Failed to create Stream player:', error);
                container.innerHTML = \`
                    <div class="text-center p-12">
                        <i class="fas fa-exclamation-circle text-6xl text-red-500 mb-4"></i>
                        <p class="text-xl text-red-600">Stream 플레이어를 불러오는 중 오류가 발생했습니다</p>
                        <p class="text-sm text-gray-600 mt-2">\${error?.message || '알 수 없는 오류'}</p>
                        <button onclick="location.reload()" class="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                            다시 시도
                        </button>
                    </div>
                \`;
            }
        }

        function startProgressTracking() {
            progressUpdateInterval = setInterval(() => {
                // Wrap async call to catch any unhandled rejections
                updateProgress().catch(err => {
                    console.error('❌ Progress tracking error:', {
                        message: err?.message || 'Unknown error',
                        name: err?.name
                    });
                });
            }, PROGRESS_UPDATE_INTERVAL);
        }

        function stopProgressTracking() {
            if (progressUpdateInterval) {
                clearInterval(progressUpdateInterval);
                progressUpdateInterval = null;
            }
        }

        async function updateProgress() {
            if (!currentLesson || !player) return;

            try {
                let currentTime = 0;
                let duration = 1;
                let watchPercentage = 0;

                // Get player state
                if (player.getCurrentTime && player.getDuration) {
                    // YouTube player
                    currentTime = player.getCurrentTime();
                    duration = player.getDuration();
                    watchPercentage = Math.round((currentTime / duration) * 100);
                } else {
                    // api.video - estimate from duration
                    duration = currentLesson.video_duration_minutes * 60;
                    currentTime = duration * 0.5; // Rough estimate
                    watchPercentage = 50; // Rough estimate
                }

                if (watchPercentage > 100) watchPercentage = 100;

                // Update progress
                const response = await apiRequest('POST', \`/api/progress/lessons/\${currentLesson.id}\`, {
                    watch_percentage: watchPercentage,
                    last_position_seconds: Math.floor(currentTime),
                    watch_time_seconds: 5, // 5 seconds since last update
                    is_completed: watchPercentage >= 90 ? 1 : 0
                });

                if (response.success) {
                    console.log(\`✅ Progress updated: \${watchPercentage}%\`);
                    
                    // Update local data
                    currentLesson.watch_percentage = watchPercentage;
                    
                    // Reload enrollment progress (optional)
                    try {
                        const progressResponse = await apiRequest('GET', \`/api/progress/courses/\${courseData.id}\`);
                        if (progressResponse.success) {
                            enrollmentData = progressResponse.enrollment;
                            updateProgressDisplay();
                        }
                    } catch (err) {
                        console.warn('⚠️ Progress reload failed (non-critical):', err);
                    }
                } else {
                    console.warn('⚠️ Progress update failed (non-critical):', response);
                }

            } catch (error) {
                console.error('❌ Progress update error:', {
                    message: error?.message || 'Unknown error',
                    name: error?.name,
                    stack: error?.stack,
                    lessonId: currentLesson?.id,
                    courseId: courseData?.id
                });
                // Don't throw - just log and continue
            }
        }

        async function markLessonCompleted() {
            if (!currentLesson) return;

            try {
                const response = await apiRequest('POST', \`/api/progress/lessons/\${currentLesson.id}\`, {
                    watch_percentage: 100,
                    last_position_seconds: currentLesson.video_duration_minutes * 60,
                    is_completed: 1
                });

                if (response.success) {
                    console.log('✅ Lesson marked as completed');
                    currentLesson.is_completed = true;
                    renderLessonList();
                    
                    // Check for certificate eligibility (optional)
                    try {
                        const progressResponse = await apiRequest('GET', \`/api/progress/courses/\${courseData.id}\`);
                        if (progressResponse.success) {
                            enrollmentData = progressResponse.enrollment;
                            updateProgressDisplay();
                            
                            if (enrollmentData.completion_rate >= 80) {
                                showCertificateNotification();
                            }
                        }
                    } catch (err) {
                        console.warn('⚠️ Progress check failed (non-critical):', err);
                    }
                    
                    // Auto-play next lesson
                    const currentIndex = lessonsData.findIndex(l => l.id === currentLesson.id);
                    if (currentIndex >= 0 && currentIndex < lessonsData.length - 1) {
                        setTimeout(() => {
                            loadLesson(lessonsData[currentIndex + 1].id);
                        }, 2000);
                    }
                } else {
                    console.warn('⚠️ Mark completed failed (non-critical):', response);
                }

            } catch (error) {
                console.error('Mark completed error:', error);
            }
        }

        function showCertificateNotification() {
            alert('🎉 축하합니다! 진도율 80%를 달성하여 수료증 발급 조건을 충족했습니다!');
        }

        function showError(message) {
            document.getElementById('videoPlayer').innerHTML = \`
                <div class="text-center p-12">
                    <i class="fas fa-exclamation-triangle text-6xl text-red-500 mb-4"></i>
                    <p class="text-xl text-white">\${message}</p>
                    <button onclick="location.reload()" 
                            class="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        다시 시도
                    </button>
                </div>
            \`;
        }

        // learn-player.js에서 모든 로직 처리
        </script>
        
        <!-- 보안 시스템 -->
        <script src="/static/js/security.js${STATIC_JS_CACHE_QUERY}"></script>
    </body>
    </html>
  `)
})

export default app
