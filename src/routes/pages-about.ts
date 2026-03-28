/**
 * 교육원 소개 페이지
 * - 대표 소개
 * - 교육이념
 */

import { Hono } from 'hono'
import { siteFooterLegalBlockHtml } from '../utils/site-footer-legal'

const app = new Hono()

/**
 * 대표 소개 및 교육이념 페이지
 * GET /about
 */
app.get('/about', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>교육원 소개 - 마인드스토리 원격평생교육원</title>
        <link rel="stylesheet" href="/static/css/app.css" />
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/js/auth.js"></script>
    </head>
    <body class="bg-gray-50">
        <!-- 헤더 -->
        <header class="bg-white shadow-sm">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center py-4">
                    <div class="flex items-center">
                        <a href="/" class="text-2xl font-bold text-indigo-600">마인드스토리 원격평생교육원</a>
                    </div>
                    <nav class="hidden md:flex space-x-8">
                        <a href="/" class="text-gray-700 hover:text-indigo-600">홈</a>
                        <a href="/about" class="text-indigo-600 font-semibold">교육원 소개</a>
                        <a href="/#courses" class="text-gray-700 hover:text-indigo-600">과정 안내</a>
                        <a href="/my-courses" class="text-gray-700 hover:text-indigo-600">내 강의실</a>
                    </nav>
                    <div id="headerAuthButtons" class="flex items-center space-x-4">
                        <a href="/login" class="text-gray-700 hover:text-indigo-600">로그인</a>
                        <a href="/register" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">회원가입</a>
                    </div>
                </div>
            </div>
        </header>

        <!-- 대표 소개 섹션 -->
        <section class="py-20 bg-white">
            <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="text-center mb-16">
                    <h1 class="text-5xl font-bold text-gray-900 mb-4">교육원 소개</h1>
                    <p class="text-xl text-gray-600">학습자의 성장 과정에 함께하는 평생교육원</p>
                </div>

                <!-- 대표 프로필 -->
                <div class="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-8 md:p-12 mb-16">
                    <div class="grid md:grid-cols-3 gap-8 items-center">
                        <div class="md:col-span-1">
                            <div class="bg-white rounded-full w-48 h-48 mx-auto shadow-xl flex items-center justify-center">
                                <div class="text-center">
                                    <i class="fas fa-user-tie text-6xl text-indigo-600 mb-2"></i>
                                    <p class="text-sm text-gray-600 font-semibold">대표</p>
                                </div>
                            </div>
                        </div>
                        <div class="md:col-span-2">
                            <h2 class="text-3xl font-bold text-gray-900 mb-2">박종석 대표</h2>
                            <p class="text-lg text-indigo-600 font-semibold mb-4">(주)마인드스토리 대표</p>
                            <div class="space-y-3 text-gray-700 leading-relaxed">
                                <p>학습·상담·교육 현장에서 <strong class="text-indigo-600">20년 이상</strong> 활동하며,</p>
                                <p>메타인지 기반 자기주도학습, 시간관리, 학습 동기 프로그램을 개발·운영해 왔습니다.</p>
                                <p class="pt-2">학교·지역사회·공공기관을 중심으로</p>
                                <p>아동·청소년·성인 대상 교육과 상담을 진행해 왔으며,</p>
                                <p class="pt-2 text-lg font-semibold text-indigo-700">'배우는 사람이 스스로 성장하는 교육'을 추구합니다.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 교육이념 (PC 버전) -->
                <div class="hidden md:block bg-white rounded-2xl shadow-xl p-12 mb-8">
                    <h2 class="text-4xl font-bold text-center text-gray-900 mb-8">교육이념</h2>
                    <div class="space-y-6 text-lg text-gray-700 leading-relaxed">
                        <p class="text-center text-2xl font-bold text-indigo-600 mb-6">
                            마인드스토리는
                        </p>
                        <p class="text-center">
                            지식을 많이 아는 사람보다<br>
                            <strong class="text-indigo-600">스스로 배우고 성장할 수 있는 사람</strong>을 키우는 교육을 지향합니다.
                        </p>
                        <div class="border-t-2 border-indigo-100 pt-6 mt-6"></div>
                        <p class="text-center">
                            우리는 성적이나 결과보다<br>
                            <strong class="text-purple-600">'왜 배우는지', '어떻게 배우는지'</strong>를 먼저 묻습니다.
                        </p>
                        <div class="border-t-2 border-indigo-100 pt-6 mt-6"></div>
                        <p class="text-center">
                            학습자(내담자)가 자신의 생각과 습관을 이해하고,<br>
                            스스로 조절하며 성장할 수 있도록 돕는 것,
                        </p>
                        <p class="text-center text-xl font-bold text-indigo-700 mt-4">
                            그것이 마인드스토리 원격평생교육원의 운영 방향입니다.
                        </p>
                    </div>
                </div>

                <!-- 교육이념 (모바일 버전) -->
                <div class="md:hidden bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
                    <h2 class="text-3xl font-bold text-center mb-6">교육이념</h2>
                    <div class="space-y-4 text-base leading-relaxed">
                        <p class="text-center font-semibold">
                            우리는 지식을 전달하는 교육이 아니라,<br>
                            <span class="text-yellow-300 text-lg">스스로 배우는 힘을 키우는 교육</span>을 지향합니다.
                        </p>
                        <div class="border-t border-white/30 my-4"></div>
                        <p class="text-center text-lg font-bold">
                            마인드스토리는<br>
                            학습자의 성장 과정에 함께하는<br>
                            평생교육원입니다.
                        </p>
                    </div>
                </div>

                <!-- 핵심 가치 -->
                <div class="grid md:grid-cols-3 gap-8 mt-16">
                    <div class="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-2xl transition">
                        <div class="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-brain text-3xl text-indigo-600"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 mb-3">메타인지 기반</h3>
                        <p class="text-gray-600">자신의 학습 과정을 이해하고 조절하는 능력 향상</p>
                    </div>
                    <div class="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-2xl transition">
                        <div class="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-heart text-3xl text-purple-600"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 mb-3">심리·상담 전문성</h3>
                        <p class="text-gray-600">20년 현장 경험을 바탕으로 한 실전 교육</p>
                    </div>
                    <div class="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-2xl transition">
                        <div class="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-users text-3xl text-pink-600"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 mb-3">평생 학습 동반자</h3>
                        <p class="text-gray-600">아동부터 성인까지 성장 과정에 함께</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- CTA 섹션 -->
        <section class="py-16 bg-gradient-to-r from-indigo-600 to-purple-600">
            <div class="max-w-4xl mx-auto px-4 text-center">
                <h2 class="text-4xl font-bold text-white mb-6">함께 성장하는 여정을 시작하세요</h2>
                <p class="text-xl text-white/90 mb-8">마인드스토리와 함께라면 스스로 배우는 힘을 키울 수 있습니다</p>
                <div class="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="/#courses" class="bg-yellow-400 text-gray-900 px-10 py-4 rounded-lg font-bold text-lg hover:bg-yellow-300 transition shadow-xl">
                        <i class="fas fa-graduation-cap mr-2"></i>
                        과정 둘러보기
                    </a>
                    <a href="/register" class="bg-white text-indigo-600 px-10 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition shadow-xl">
                        <i class="fas fa-user-plus mr-2"></i>
                        무료 회원가입
                    </a>
                </div>
            </div>
        </section>

        <!-- 푸터 -->
        <footer class="bg-gray-900 text-white py-10">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                ${siteFooterLegalBlockHtml()}
                <p class="mt-8 pt-8 border-t border-gray-800 text-center text-xs text-gray-500">
                    &copy; 2025 (주)마인드스토리. All rights reserved.
                </p>
            </div>
        </footer>

        <script>
            // 헤더 업데이트
            updateHeader();
        </script>
        <script src="/static/js/security.js"></script>
    </body>
    </html>
  `)
})

export default app
