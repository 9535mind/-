/**
 * 마인드스토리 원격평생교육원 - 랜딩 페이지
 * Ver.3.0 - 2026 웹 트렌드 반영
 * 
 * 디자인 시스템:
 * - Font: Pretendard (CDN)
 * - Layout: Bento Grid
 * - Style: Glassmorphism
 * - Animation: Marquee
 * - Color: Primary #6366F1, Background #F9FAFB, Text #111827
 */

import { Hono } from 'hono'
import { Bindings } from '../types/database'

const landing = new Hono<{ Bindings: Bindings }>()

/**
 * GET /
 * 홈페이지 (랜딩 페이지)
 */
landing.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=0.9, maximum-scale=1.0, user-scalable=yes">
        <title>마인드스토리 원격평생교육원 - 마음을 이해하고 성장하는 여정</title>
        
        <!-- Pretendard 폰트 -->
        <link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" />
        
        <!-- Tailwind CSS -->
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                fontFamily: {
                  sans: ['Pretendard Variable', 'Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Roboto', 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'sans-serif'],
                },
                letterSpacing: {
                  tighter: '-0.05em',
                },
                lineHeight: {
                  relaxed: '1.7',
                },
                borderRadius: {
                  '2xl': '16px',
                },
              },
            },
          }
        </script>
        
        <!-- FontAwesome -->
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        
        <!-- Axios -->
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        
        <!-- Custom Scripts -->
        <script src="/static/js/auth.js?v=20260101"></script>
        <script src="/static/js/utils.js?v=20260101"></script>
        <script src="/static/js/popup.js?v=20260101"></script>
        
        <style>
            /* 2026 웹 트렌드 디자인 시스템 */
            :root {
                --color-primary: #6366F1;
                --color-primary-hover: #4F46E5;
                --color-background: #F9FAFB;
                --color-text: #111827;
                --color-text-secondary: #6B7280;
                --color-border: #E5E7EB;
            }
            
            * {
                font-family: 'Pretendard Variable', 'Pretendard', system-ui, -apple-system, sans-serif;
            }
            
            body {
                background: var(--color-background);
                color: var(--color-text);
                line-height: 1.7;
            }
            
            /* 모바일 최적화 - 폰트 크기 조정 */
            @media (max-width: 768px) {
                html {
                    font-size: 14.4px; /* 12px * 1.2 = 14.4px (20% 증가) */
                }
                
                body {
                    line-height: 1.6;
                }
                
                h1 {
                    font-size: 2.1rem !important; /* 1.75 * 1.2 */
                }
                
                h2 {
                    font-size: 1.8rem !important; /* 1.5 * 1.2 */
                }
                
                h3 {
                    font-size: 1.38rem !important; /* 1.15 * 1.2 */
                }
                
                p {
                    font-size: 1.08rem !important; /* 0.9 * 1.2 */
                }
                
                .hero-gradient {
                    padding: 3rem 0 !important;
                }
                
                .glass-card {
                    padding: 1.5rem !important; /* 1rem * 1.5 */
                }
                
                .cta-button {
                    padding: 0.8rem 1.6rem !important;
                    font-size: 1.02rem !important; /* 0.85 * 1.2 */
                }
            }
            
            /* Hero Section with Image Slider */
            .hero-section {
                position: relative;
                overflow: hidden;
                min-height: 600px;
            }
            
            .hero-slider {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 0;
            }
            
            .hero-slide {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                opacity: 0;
                transition: opacity 1.5s ease-in-out;
                background-size: cover;
                background-position: center;
            }
            
            .hero-slide.active {
                opacity: 1;
            }
            
            .hero-slide::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, rgba(99, 102, 241, 0.4) 0%, rgba(168, 85, 247, 0.4) 100%);
            }
            
            .hero-content {
                position: relative;
                z-index: 10;
            }
            
            /* Glassmorphism */
            .glass-card {
                background: rgba(255, 255, 255, 0.7);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.3);
                transition: all 0.3s ease;
            }
            
            .glass-card:hover {
                border-color: var(--color-primary);
                box-shadow: 0 8px 32px rgba(99, 102, 241, 0.2);
                transform: translateY(-4px);
            }
            
            /* Bento Grid */
            .bento-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 1.5rem;
            }
            
            @media (max-width: 768px) {
                .bento-grid {
                    grid-template-columns: repeat(2, 1fr); /* 모바일에서 2열 */
                    gap: 1rem;
                }
            }
            
            @media (min-width: 769px) {
                .bento-grid {
                    grid-template-columns: repeat(4, 1fr); /* 데스크톱에서 4열 */
                }
            }
            
            /* Marquee Animation */
            .marquee {
                overflow: hidden;
                white-space: nowrap;
                box-sizing: border-box;
            }
            
            .marquee-content {
                display: inline-block;
                animation: marquee 40s linear infinite;
                padding-left: 100%;
            }
            
            @keyframes marquee {
                0% { transform: translateX(0%); }
                100% { transform: translateX(-50%); }
            }
            
            .marquee:hover .marquee-content {
                animation-play-state: running;
            }
            
            /* CTA Button */
            .cta-button {
                background: var(--color-primary);
                color: white;
                padding: 1rem 2.5rem;
                border-radius: 12px;
                font-weight: 600;
                box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
                transition: all 0.3s ease;
                display: inline-block;
            }
            
            .cta-button:hover {
                background: var(--color-primary-hover);
                box-shadow: 0 6px 24px rgba(99, 102, 241, 0.4);
                transform: translateY(-2px);
            }
            
            /* Review Card */
            .review-card {
                background: white;
                padding: 1.5rem;
                border-radius: 16px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                min-width: 300px;
                margin-right: 1.5rem;
                display: inline-block;
            }
            
            /* Typography */
            h1, h2, h3 {
                letter-spacing: -0.05em;
                font-weight: 700;
            }
            
            p {
                line-height: 1.7;
            }
        </style>
        <script src="/static/js/content-protection.js"></script>
    </head>
    <body>
        <!-- 헤더 -->
        <header class="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center py-4">
                    <div class="flex items-center">
                        <a href="/" class="text-2xl md:text-3xl font-bold" style="color: var(--color-primary);">
                            마인드스토리 원격평생교육원
                        </a>
                    </div>
                    <nav class="hidden md:flex space-x-8 items-center text-lg">
                        <a href="/" class="text-gray-700 hover:text-indigo-600 transition-colors duration-200 font-medium">홈</a>
                        <a href="#courses" class="text-gray-700 hover:text-indigo-600 transition-colors duration-200 font-medium">과정 안내</a>
                        <a href="/my-courses" class="text-gray-700 hover:text-indigo-600 transition-colors duration-200 font-medium">내 강의실</a>
                        
                        <!-- 관리자 모드 전환 버튼 -->
                        <div id="adminModeSwitch" class="flex items-center space-x-2" style="display:none">
                            <span class="text-gray-400">|</span>
                            <a href="/admin/dashboard" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors duration-200">
                                <i class="fas fa-user-shield mr-1"></i>
                                관리자 모드
                            </a>
                        </div>
                    </nav>
                    <div id="headerAuthButtons" class="flex items-center space-x-4">
                        <a href="/login" class="text-gray-700 hover:text-indigo-600 transition-colors duration-200 text-lg font-medium">로그인</a>
                        <a href="/register" class="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors duration-200 text-lg font-semibold">회원가입</a>
                    </div>
                    <div id="headerUserMenu" class="flex items-center space-x-4" style="display:none">
                        <span class="text-gray-700 font-medium" id="headerUserName"></span>
                        <button onclick="handleLogout()" class="text-gray-700 hover:text-indigo-600 transition-colors duration-200">로그아웃</button>
                    </div>
                </div>
            </div>
        </header>

        <!-- 히어로 섹션 -->
        <section class="hero-section text-white py-20 md:py-24">
            <!-- 배경 이미지 슬라이더 -->
            <div class="hero-slider">
                <div class="hero-slide active" style="background-image: url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1920&q=80');"></div>
                <div class="hero-slide" style="background-image: url('https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1920&q=80');"></div>
                <div class="hero-slide" style="background-image: url('https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1920&q=80');"></div>
                <div class="hero-slide" style="background-image: url('https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1920&q=80');"></div>
            </div>
            
            <!-- 콘텐츠 -->
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 hero-content">
                <div class="text-center">
                    <h1 class="text-5xl md:text-6xl lg:text-7xl font-bold mb-8 leading-tight">
                        마음을 이해하고 성장하는 여정
                    </h1>
                    <p class="text-2xl md:text-3xl lg:text-4xl mb-6 font-bold tracking-tight">
                        마인드스토리 원격평생교육원
                    </p>
                    <p class="text-lg md:text-xl lg:text-2xl mb-12 opacity-90 leading-relaxed max-w-4xl mx-auto">
                        마인드 타임 코칭, 부모-자녀 대화법, 감정코칭까지<br>
                        전문가와 함께하는 온라인 평생교육
                    </p>
                    <div class="flex flex-col sm:flex-row justify-center gap-6">
                        <button onclick="scrollToCourses()" class="cta-button text-xl px-10 py-4">
                            <i class="fas fa-graduation-cap mr-3"></i>
                            과정 둘러보기
                        </button>
                        <a href="/register" class="bg-white/20 backdrop-blur-sm text-white px-10 py-4 rounded-xl text-xl font-semibold hover:bg-white/30 transition-all duration-300 inline-block">
                            <i class="fas fa-user-plus mr-2"></i>
                            무료 회원가입
                        </a>
                    </div>
                </div>
            </div>
        </section>

        <!-- 주요 특징 (Bento Grid - 8개 카드) -->
        <section class="py-24">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 class="text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-6">왜 마인드스토리인가요?</h2>
                <p class="text-center text-gray-600 text-xl md:text-2xl mb-20">전문가와 함께하는 특별한 학습 경험</p>
                
                <div class="bento-grid">
                    <div class="glass-card rounded-2xl p-10 text-center hover:scale-105 transition-transform duration-300">
                        <div class="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mx-auto mb-6">
                            <i class="fas fa-video text-4xl text-white"></i>
                        </div>
                        <h3 class="text-2xl font-bold mb-4">언제 어디서나</h3>
                        <p class="text-gray-600 leading-relaxed text-lg">
                            PC, 모바일, 태블릿<br>
                            어디서든 학습 가능
                        </p>
                    </div>
                    
                    <div class="glass-card rounded-2xl p-10 text-center hover:scale-105 transition-transform duration-300">
                        <div class="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center mx-auto mb-6">
                            <i class="fas fa-award text-4xl text-white"></i>
                        </div>
                        <h3 class="text-2xl font-bold mb-4">민간자격증</h3>
                        <p class="text-gray-600 leading-relaxed text-lg">
                            수료 후 자격증<br>
                            취득 가능 (별도 신청)
                        </p>
                    </div>
                    
                    <div class="glass-card rounded-2xl p-10 text-center hover:scale-105 transition-transform duration-300">
                        <div class="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center mx-auto mb-6">
                            <i class="fas fa-chalkboard-teacher text-4xl text-white"></i>
                        </div>
                        <h3 class="text-2xl font-bold mb-4">박종석 대표 직강</h3>
                        <p class="text-gray-600 leading-relaxed text-lg">
                            20년 현장 경험<br>
                            실전 노하우 전수
                        </p>
                    </div>
                    
                    <div class="glass-card rounded-2xl p-10 text-center hover:scale-105 transition-transform duration-300">
                        <div class="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center mx-auto mb-6">
                            <i class="fas fa-redo text-4xl text-white"></i>
                        </div>
                        <h3 class="text-2xl font-bold mb-4">반복 학습</h3>
                        <p class="text-gray-600 leading-relaxed text-lg">
                            수강 기간 내<br>
                            무제한 복습 가능
                        </p>
                    </div>
                    
                    <div class="glass-card rounded-2xl p-10 text-center hover:scale-105 transition-transform duration-300">
                        <div class="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center mx-auto mb-6">
                            <i class="fas fa-certificate text-4xl text-white"></i>
                        </div>
                        <h3 class="text-2xl font-bold mb-4">수료증 발급</h3>
                        <p class="text-gray-600 leading-relaxed text-lg">
                            80% 이상 수강 시<br>
                            자동 발급
                        </p>
                    </div>
                    
                    <div class="glass-card rounded-2xl p-10 text-center hover:scale-105 transition-transform duration-300">
                        <div class="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center mx-auto mb-6">
                            <i class="fas fa-comments text-4xl text-white"></i>
                        </div>
                        <h3 class="text-2xl font-bold mb-4">커뮤니티</h3>
                        <p class="text-gray-600 leading-relaxed text-lg">
                            수강생 간<br>
                            경험 공유 및 소통
                        </p>
                    </div>
                    
                    <div class="glass-card rounded-2xl p-10 text-center hover:scale-105 transition-transform duration-300">
                        <div class="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center mx-auto mb-6">
                            <i class="fas fa-headset text-4xl text-white"></i>
                        </div>
                        <h3 class="text-2xl font-bold mb-4">학습 지원</h3>
                        <p class="text-gray-600 leading-relaxed text-lg">
                            1:1 질문 답변<br>
                            전문가 멘토링
                        </p>
                    </div>
                    
                    <div class="glass-card rounded-2xl p-10 text-center hover:scale-105 transition-transform duration-300">
                        <div class="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mx-auto mb-6">
                            <i class="fas fa-clock text-4xl text-white"></i>
                        </div>
                        <h3 class="text-2xl font-bold mb-4">유연한 학습</h3>
                        <p class="text-gray-600 leading-relaxed text-lg">
                            24시간 언제든지<br>
                            내 속도로 학습
                        </p>
                    </div>
                </div>
            </div>
        </section>

        <!-- 과정 목록 -->
        <section id="courses" class="py-20 bg-gradient-to-b from-white to-gray-50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="text-center mb-16">
                    <h2 class="text-4xl md:text-5xl font-bold mb-4">추천 과정</h2>
                    <p class="text-xl text-gray-600">전문가와 함께 시작하는 성장의 여정</p>
                </div>
                <div id="courseList" class="bento-grid">
                    <div class="text-center py-12 col-span-3">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                        <p class="mt-4 text-gray-600">과정 정보를 불러오는 중...</p>
                    </div>
                </div>
            </div>
        </section>
        
        <!-- 마인드스토리 교육 소개 섹션 -->
        <section class="py-20 bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-700">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="grid md:grid-cols-2 gap-12 items-center">
                    <!-- 좌측: 이미지 -->
                    <div class="relative group">
                        <img src="https://www.genspark.ai/api/files/s/Nx5k1tgA" alt="마인드스토리 교육" class="rounded-2xl shadow-2xl w-full transition-transform duration-300 group-hover:scale-105" loading="lazy">
                        <div class="absolute inset-0 bg-gradient-to-t from-purple-900/60 via-transparent to-transparent rounded-2xl"></div>
                    </div>
                    
                    <!-- 우측: 텍스트 -->
                    <div class="text-white">
                        <div class="inline-block px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold mb-6">
                            <i class="fas fa-award mr-2"></i>
                            전문가 인증 교육
                        </div>
                        <h2 class="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                            마인드스토리 교육
                        </h2>
                        <p class="text-xl md:text-2xl mb-8 opacity-95 leading-relaxed">
                            전문가와 함께하는 심리 상담 및 코칭 전문 교육
                        </p>
                        
                        <!-- 통계 카드 -->
                        <div class="grid grid-cols-3 gap-4 mb-8">
                            <div class="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-center">
                                <div class="text-3xl font-bold mb-1">1,000+</div>
                                <div class="text-sm opacity-80">
                                    <i class="fas fa-users mr-1"></i>
                                    수강생
                                </div>
                            </div>
                            <div class="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-center">
                                <div class="text-3xl font-bold mb-1">4.9</div>
                                <div class="text-sm opacity-80">
                                    <i class="fas fa-star mr-1 text-yellow-400"></i>
                                    평점
                                </div>
                            </div>
                            <div class="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-center">
                                <div class="text-3xl font-bold mb-1">95%</div>
                                <div class="text-sm opacity-80">
                                    <i class="fas fa-certificate mr-1"></i>
                                    자격증
                                </div>
                            </div>
                        </div>
                        
                        <a href="#courses" class="inline-flex items-center bg-white text-purple-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-100 transition-all duration-300 shadow-xl">
                            <i class="fas fa-arrow-right mr-2"></i>
                            과정 자세히 보기
                        </a>
                    </div>
                </div>
            </div>
        </section>
        
        <!-- 수강후기 섹션 (Marquee) -->
        <section class="py-20 bg-gradient-to-r from-indigo-50 to-purple-50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 class="text-4xl md:text-5xl font-bold text-center mb-16">수강생 후기</h2>
                
                <div class="marquee">
                    <div class="marquee-content">
                        <!-- 첫 번째 세트 -->
                        <div class="review-card">
                            <div class="flex items-center mb-4">
                                <img src="https://ui-avatars.com/api/?name=김지영&background=667eea&color=fff&size=48" class="w-12 h-12 rounded-full mr-3">
                                <div>
                                    <h5 class="font-bold text-lg">김지영</h5>
                                    <p class="text-sm text-gray-500">마인드 타임 코칭 입문</p>
                                </div>
                            </div>
                            <div class="text-yellow-400 mb-3">
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                            </div>
                            <p class="text-gray-700 leading-relaxed">
                                시간 관리에 대한 새로운 관점을 얻었어요. 실생활에 바로 적용할 수 있는 내용들이 많아서 좋았습니다!
                            </p>
                        </div>
                        
                        <div class="review-card">
                            <div class="flex items-center mb-4">
                                <img src="https://ui-avatars.com/api/?name=이수진&background=764ba2&color=fff&size=48" class="w-12 h-12 rounded-full mr-3">
                                <div>
                                    <h5 class="font-bold text-lg">이수진</h5>
                                    <p class="text-sm text-gray-500">부모-자녀 대화법</p>
                                </div>
                            </div>
                            <div class="text-yellow-400 mb-3">
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                            </div>
                            <p class="text-gray-700 leading-relaxed">
                                아이와의 관계가 확실히 좋아졌어요. 강의를 듣고 실천하니 대화가 더 편해졌습니다.
                            </p>
                        </div>
                        
                        <div class="review-card">
                            <div class="flex items-center mb-4">
                                <img src="https://ui-avatars.com/api/?name=박민수&background=f093fb&color=fff&size=48" class="w-12 h-12 rounded-full mr-3">
                                <div>
                                    <h5 class="font-bold text-lg">박민수</h5>
                                    <p class="text-sm text-gray-500">감정코칭 전문가 과정</p>
                                </div>
                            </div>
                            <div class="text-yellow-400 mb-3">
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                            </div>
                            <p class="text-gray-700 leading-relaxed">
                                전문가로 활동하기 위한 실전 노하우까지 배울 수 있어서 정말 유익했습니다!
                            </p>
                        </div>
                        
                        <div class="review-card">
                            <div class="flex items-center mb-4">
                                <img src="https://ui-avatars.com/api/?name=최은영&background=4F46E5&color=fff&size=48" class="w-12 h-12 rounded-full mr-3">
                                <div>
                                    <h5 class="font-bold text-lg">최은영</h5>
                                    <p class="text-sm text-gray-500">자기주도학습 지도사</p>
                                </div>
                            </div>
                            <div class="text-yellow-400 mb-3">
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                            </div>
                            <p class="text-gray-700 leading-relaxed">
                                체계적인 커리큘럼과 실전 사례가 정말 도움이 되었어요. 자격증까지 취득할 수 있어서 더 좋았습니다!
                            </p>
                        </div>
                        
                        <!-- 두 번째 세트 (무한 스크롤을 위한 복제) -->
                        <div class="review-card">
                            <div class="flex items-center mb-4">
                                <img src="https://ui-avatars.com/api/?name=김지영&background=667eea&color=fff&size=48" class="w-12 h-12 rounded-full mr-3">
                                <div>
                                    <h5 class="font-bold text-lg">김지영</h5>
                                    <p class="text-sm text-gray-500">마인드 타임 코칭 입문</p>
                                </div>
                            </div>
                            <div class="text-yellow-400 mb-3">
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                            </div>
                            <p class="text-gray-700 leading-relaxed">
                                시간 관리에 대한 새로운 관점을 얻었어요. 실생활에 바로 적용할 수 있는 내용들이 많아서 좋았습니다!
                            </p>
                        </div>
                        
                        <div class="review-card">
                            <div class="flex items-center mb-4">
                                <img src="https://ui-avatars.com/api/?name=이수진&background=764ba2&color=fff&size=48" class="w-12 h-12 rounded-full mr-3">
                                <div>
                                    <h5 class="font-bold text-lg">이수진</h5>
                                    <p class="text-sm text-gray-500">부모-자녀 대화법</p>
                                </div>
                            </div>
                            <div class="text-yellow-400 mb-3">
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                            </div>
                            <p class="text-gray-700 leading-relaxed">
                                아이와의 관계가 확실히 좋아졌어요. 강의를 듣고 실천하니 대화가 더 편해졌습니다.
                            </p>
                        </div>
                        
                        <div class="review-card">
                            <div class="flex items-center mb-4">
                                <img src="https://ui-avatars.com/api/?name=박민수&background=f093fb&color=fff&size=48" class="w-12 h-12 rounded-full mr-3">
                                <div>
                                    <h5 class="font-bold text-lg">박민수</h5>
                                    <p class="text-sm text-gray-500">감정코칭 전문가 과정</p>
                                </div>
                            </div>
                            <div class="text-yellow-400 mb-3">
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                            </div>
                            <p class="text-gray-700 leading-relaxed">
                                전문가로 활동하기 위한 실전 노하우까지 배울 수 있어서 정말 유익했습니다!
                            </p>
                        </div>
                        
                        <div class="review-card">
                            <div class="flex items-center mb-4">
                                <img src="https://ui-avatars.com/api/?name=최은영&background=4F46E5&color=fff&size=48" class="w-12 h-12 rounded-full mr-3">
                                <div>
                                    <h5 class="font-bold text-lg">최은영</h5>
                                    <p class="text-sm text-gray-500">자기주도학습 지도사</p>
                                </div>
                            </div>
                            <div class="text-yellow-400 mb-3">
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                            </div>
                            <p class="text-gray-700 leading-relaxed">
                                체계적인 커리큘럼과 실전 사례가 정말 도움이 되었어요. 자격증까지 취득할 수 있어서 더 좋았습니다!
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- 푸터 -->
        <footer class="bg-gray-900 text-white py-12">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="grid md:grid-cols-3 gap-12">
                    <div>
                        <h4 class="text-xl font-bold mb-4">마인드스토리 원격평생교육원</h4>
                        <p class="text-gray-400 leading-relaxed">
                            시간 관리와 심리학을 결합한<br>
                            전문 교육 플랫폼
                        </p>
                    </div>
                    <div>
                        <h4 class="text-xl font-bold mb-4">바로가기</h4>
                        <ul class="space-y-3">
                            <li><a href="#" class="text-gray-400 hover:text-white transition-colors">이용약관</a></li>
                            <li><a href="#" class="text-gray-400 hover:text-white transition-colors">개인정보처리방침</a></li>
                            <li><a href="#" class="text-gray-400 hover:text-white transition-colors">환불규정</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="text-xl font-bold mb-4">문의</h4>
                        <p class="text-gray-400 leading-relaxed">
                            이메일: contact@mindstory.co.kr<br>
                            운영시간: 평일 10:00 - 18:00
                        </p>
                    </div>
                </div>
                <div class="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
                    © 2026 마인드스토리 원격평생교육원. All rights reserved.
                </div>
            </div>
        </footer>

        <script>
            // 과정 목록 로드
            async function loadCourses() {
                try {
                    const response = await axios.get('/api/courses/featured')
                    const courses = response.data.data
                    
                    const courseList = document.getElementById('courseList')
                    if (courses.length === 0) {
                        courseList.innerHTML = '<p class="col-span-3 text-center text-gray-600">등록된 과정이 없습니다.</p>'
                        return
                    }
                    
                    courseList.innerHTML = courses.map(course => \`
                        <div class="glass-card rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer" onclick="viewCourse(\${course.id})">
                            <div class="h-56 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center relative overflow-hidden">
                                <div class="absolute inset-0 bg-black/20"></div>
                                <i class="fas fa-book-open text-7xl text-white opacity-40 relative z-10"></i>
                            </div>
                            <div class="p-6">
                                <h3 class="text-2xl font-bold mb-3">\${course.title}</h3>
                                <p class="text-gray-600 mb-6 leading-relaxed line-clamp-2">\${course.description || '전문가와 함께하는 특별한 학습 경험'}</p>
                                <div class="flex justify-between items-center mb-4">
                                    <div class="text-sm text-gray-500">
                                        <i class="fas fa-clock mr-2"></i>
                                        언제든지 학습 가능
                                    </div>
                                </div>
                                <div class="flex justify-between items-center pt-4 border-t border-gray-200">
                                    <div>
                                        <span class="text-2xl font-bold text-indigo-600">수강 신청</span>
                                    </div>
                                    <div class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors font-semibold">
                                        자세히 보기
                                    </div>
                                </div>
                            </div>
                        </div>
                    \`).join('')
                } catch (error) {
                    console.error('Failed to load courses:', error)
                    document.getElementById('courseList').innerHTML = '<p class="col-span-3 text-center text-red-600">과정 정보를 불러오는데 실패했습니다.</p>'
                }
            }
            
            function scrollToCourses() {
                document.getElementById('courses').scrollIntoView({ behavior: 'smooth' })
            }
            
            function viewCourse(id) {
                window.location.href = \`/courses/\${id}\`
            }
            
            // 페이지 로드 시 실행
            document.addEventListener('DOMContentLoaded', () => {
                loadCourses()
                updateHeader()
                
                // 팝업 로드
                PopupManager.loadPopups('home')
                
                // 히어로 이미지 슬라이더
                initHeroSlider()
            })
            
            // 히어로 이미지 슬라이더
            function initHeroSlider() {
                const slides = document.querySelectorAll('.hero-slide')
                let currentSlide = 0
                
                function nextSlide() {
                    slides[currentSlide].classList.remove('active')
                    currentSlide = (currentSlide + 1) % slides.length
                    slides[currentSlide].classList.add('active')
                }
                
                // 5초마다 자동 전환
                setInterval(nextSlide, 5000)
            }
        </script>
        <script src="/static/js/security.js"></script>
        <script src="/static/js/content-protection.js"></script>
    </body>
    </html>
  `)
})

export default landing
