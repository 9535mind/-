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
import { Bindings, User } from '../types/database'
import { optionalAuth } from '../middleware/auth'
import { resolveAdminCommandPulse } from '../utils/site-header-admin-ssr'
import {
  FOOTER_HTML_REVISION,
  siteFooterLegalBlockHtml,
  siteOrganizationJsonLdScriptHtml,
} from '../utils/site-footer-legal'
import { STATIC_JS_CACHE_QUERY } from '../utils/static-js-cache-bust'
import {
  siteFloatingQuickMenuMarkup,
  siteFloatingQuickMenuScript,
  siteFloatingQuickMenuStyles,
} from '../utils/site-floating-quick-menu'
import {
  siteHeaderDrawerControlScript,
  siteHeaderFullMarkup,
  siteHeaderNavCoursesGlassStyles,
} from '../utils/site-header-courses-nav'

const landing = new Hono<{ Bindings: Bindings; Variables: { user?: User } }>()
landing.use('*', optionalAuth)

/**
 * GET /
 * 홈페이지 (랜딩 페이지)
 */
landing.get('/', async (c) => {
  const adminCommandPulse = await resolveAdminCommandPulse(c)
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=0.9, maximum-scale=1.0, user-scalable=yes">
        <title>마인드스토리 (MINDSTORY) - 나를 성장시키는 학습 플랫폼</title>
        <meta name="description" content="마인드스토리는 다양한 지식과 경험을 나누는 온라인 학습 플랫폼입니다." />
        <link rel="canonical" href="https://mindstory.kr/" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="마인드스토리 (MINDSTORY) - 나를 성장시키는 학습 플랫폼" />
        <meta property="og:description" content="마인드스토리는 다양한 지식과 경험을 나누는 온라인 학습 플랫폼입니다." />
        <meta property="og:image" content="https://mindstory.kr/static/images/og-image.png" />
        <meta property="og:url" content="https://mindstory.kr/" />
        <meta property="og:site_name" content="마인드스토리" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="마인드스토리 (MINDSTORY) - 나를 성장시키는 학습 플랫폼" />
        <meta name="twitter:description" content="마인드스토리는 다양한 지식과 경험을 나누는 온라인 학습 플랫폼입니다." />
        <meta name="twitter:image" content="https://mindstory.kr/static/images/og-image.png" />
        <meta name="ms-footer-revision" content="${FOOTER_HTML_REVISION}" />
        ${siteOrganizationJsonLdScriptHtml()}
        
        <!-- Pretendard 폰트 -->
        <link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" />
        
        <!-- Tailwind CSS (PostCSS 빌드 → /static/css/app.css) -->
        <link rel="stylesheet" href="/static/css/app.css" />
        
        <!-- FontAwesome -->
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        
        <!-- Axios -->
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        
        <!-- Custom Scripts -->
        <script src="/static/js/auth.js?v=20260329-admin-name"></script>
        <script src="/static/js/utils.js?v=20260327-2"></script>
        
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
        ${siteHeaderNavCoursesGlassStyles()}
        ${siteFloatingQuickMenuStyles()}
        <script src="/static/js/content-protection.js${STATIC_JS_CACHE_QUERY}"></script>
    </head>
    <body>
        ${siteHeaderFullMarkup({ variant: 'landing', showEnrollment: true, adminCommandPulse })}

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
                        진로캠프, 메타인지 학습클리닉, 부모자녀 소통, 미술심리까지<br>
                        전문가와 함께 마음을 읽고 성장하는 마인드스토리 평생교육
                    </p>
                    <div class="flex flex-col sm:flex-row justify-center gap-6">
                        <a href="/enrollment" class="cta-button text-xl px-10 py-4 inline-block text-center">
                            <i class="fas fa-graduation-cap mr-3"></i>
                            수강신청 하기
                        </a>
                        <button onclick="scrollToCourses()" class="bg-white/20 backdrop-blur-sm text-white px-10 py-4 rounded-xl text-xl font-semibold hover:bg-white/30 transition-all duration-300">
                            <i class="fas fa-book-open mr-2"></i>
                            과정 둘러보기
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <!-- MINDSTORY 듀얼 브랜드 -->
        <section class="py-20 bg-white border-y border-gray-100">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 class="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">MINDSTORY 두 가지 길</h2>
                <p class="text-center text-gray-600 text-lg mb-12 max-w-2xl mx-auto">깊이 있는 학습(Classic)과 확장되는 창작(Next)을 선택하세요.</p>
                <div class="grid md:grid-cols-2 gap-8">
                    <a href="/courses/classic" class="group rounded-3xl border-2 border-classic-sage/30 bg-classic-cream p-10 shadow-lg hover:shadow-xl hover:border-classic-sage transition flex flex-col min-h-[280px]">
                        <span class="text-sm font-bold text-classic-sage tracking-widest uppercase">Heritage · Classic</span>
                        <h3 class="text-2xl md:text-3xl font-bold text-classic-forest mt-3 group-hover:text-classic-sage transition">본질의 깊이</h3>
                        <p class="text-classic-forest/80 mt-4 flex-1 leading-relaxed">상담·진로·기록 중심의 차분한 커리큘럼. 베이지와 그린 톤으로 집중과 성찰을 돕습니다.</p>
                        <span class="mt-6 inline-flex items-center text-classic-sage font-semibold">Classic 강좌 보기 <i class="fas fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform"></i></span>
                    </a>
                    <a href="/courses/next" class="group rounded-3xl border-2 border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/80 p-10 shadow-lg hover:shadow-xl hover:border-next-accent/40 transition flex flex-col min-h-[280px]">
                        <span class="text-sm font-bold text-next-accent tracking-widest uppercase">Next · Create</span>
                        <h3 class="text-2xl md:text-3xl font-bold text-next-ink mt-3 group-hover:text-next-accent transition">미래의 확장</h3>
                        <p class="text-slate-600 mt-4 flex-1 leading-relaxed">AI 동화·기술·창작. 블루와 실버 포인트의 세련된 Next 라인에서 단계별로 완성도를 높입니다.</p>
                        <span class="mt-6 inline-flex items-center text-next-accent font-semibold">Next 강좌 보기 <i class="fas fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform"></i></span>
                    </a>
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
                        <div
                            class="relative rounded-2xl shadow-2xl w-full min-h-[320px] md:min-h-[420px] overflow-hidden transition-transform duration-300 group-hover:scale-105"
                            style="background-image: linear-gradient(160deg, rgba(109,40,217,0.82), rgba(79,70,229,0.72)), url('/static/images/mindstory-education-hero.svg'); background-size: cover; background-position: center;"
                            aria-label="마인드스토리 원격평생교육원 온라인 강의 안내 이미지"
                            role="img"
                        >
                            <div class="absolute inset-0 bg-gradient-to-t from-purple-950/55 via-transparent to-purple-900/30"></div>
                            <div class="absolute left-6 right-6 bottom-6">
                                <p class="text-white text-sm md:text-base font-semibold drop-shadow-md">
                                    마인드스토리 원격평생교육원 온라인 강의 안내 이미지
                                </p>
                            </div>
                        </div>
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
        <footer class="bg-gray-900 text-white py-10">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                ${siteFooterLegalBlockHtml()}
                <p class="mt-4 pt-4 border-t border-gray-800 text-center text-xs text-gray-500">
                    © 2026 마인드스토리 원격평생교육원. All rights reserved.
                </p>
            </div>
        </footer>
        ${siteFloatingQuickMenuMarkup()}

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
                ${siteHeaderDrawerControlScript('landing')}
                ${siteFloatingQuickMenuScript()}
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
        <script src="/static/js/security.js${STATIC_JS_CACHE_QUERY}"></script>
    </body>
    </html>
  `)
})

export default landing
