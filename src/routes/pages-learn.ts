/**
 * Learning Pages Router
 * Student lesson learning/watching pages
 */

import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import type { Bindings } from '../types/database'

const app = new Hono<{ Bindings: Bindings }>()

/**
 * Course Learning Page
 * GET /courses/:courseId/learn
 */
app.get('/courses/:courseId/learn', async (c) => {
  const courseId = c.req.param('courseId')
  
  // 서버 사이드 인증 확인 (Hono getCookie 사용)
  const sessionToken = getCookie(c, 'session_token')
  
  if (!sessionToken) {
    // 세션이 없으면 로그인 페이지로 리다이렉트
    return c.redirect(`/login?redirect=${encodeURIComponent('/courses/' + courseId + '/learn')}`)
  }
  
  // DB에서 세션 검증
  try {
    const { DB } = c.env
    const session = await DB.prepare(`
      SELECT us.*, u.id as user_id, u.name, u.email, u.role
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.session_token = ? 
        AND us.is_active = 1
        AND us.expires_at > datetime('now')
        AND u.deleted_at IS NULL
    `).bind(sessionToken).first()
    
    if (!session) {
      // 세션이 유효하지 않으면 로그인 페이지로
      return c.redirect(`/login?redirect=${encodeURIComponent('/courses/' + courseId + '/learn')}`)
    }
    
    // 마지막 활동 시간 업데이트
    await DB.prepare(`
      UPDATE user_sessions 
      SET last_activity_at = datetime('now') 
      WHERE session_token = ?
    `).bind(sessionToken).run()
    
  } catch (error) {
    console.error('Session validation error:', error)
    return c.redirect(`/login?redirect=${encodeURIComponent('/courses/' + courseId + '/learn')}`)
  }
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=0.9, maximum-scale=1.0, user-scalable=yes">
        <title>강좌 학습 - 마인드스토리 LMS</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/js/auth.js"></script>
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
                    <span id="headerUserName" class="text-gray-700"></span>
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

        <!-- Course ID 전역 변수 설정 -->
        <script>
        window.COURSE_ID = ${courseId};
        console.log('🎯 Course ID set:', window.COURSE_ID);
        </script>
        
        <!-- 영상 플레이어 시스템 -->
        <script src="/static/js/learn-player.js"></script>
    </body>
    </html>
  `)
})

export default app
