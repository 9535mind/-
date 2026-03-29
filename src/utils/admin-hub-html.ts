/**
 * 마인드스토리 원격평생교육원 — 중앙 관제탑 (단일 관리자 셸)
 * /admin/dashboard 에서만 로드, 다른 /admin/* 는 여기로 리다이렉트
 */
import { STATIC_JS_CACHE_QUERY } from './static-js-cache-bust'

export function adminHubPageHtml(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>중앙 관제탑 — 마인드스토리 원격평생교육원</title>
  <link rel="stylesheet" href="/static/css/app.css" />
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-slate-100 min-h-screen">
  <div id="hubMobileBackdrop" class="fixed inset-0 z-[100] bg-black/50 opacity-0 pointer-events-none transition-opacity md:hidden" aria-hidden="true"></div>
  <aside id="hubMobileDrawer" class="fixed top-0 right-0 z-[101] h-full w-[min(100%,20rem)] max-w-full bg-slate-900 text-white shadow-2xl translate-x-full transition-transform md:hidden flex flex-col border-l border-white/10" aria-label="관리자 메뉴">
    <div class="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
      <span class="font-semibold text-indigo-100">4대 메뉴</span>
      <button type="button" id="hubMobileNavClose" class="p-2 rounded-lg hover:bg-white/10 text-xl leading-none" aria-label="메뉴 닫기">&times;</button>
    </div>
    <div class="overflow-y-auto flex-1 p-2 text-sm" id="hubMobileAccordion">
      <details class="border-b border-white/10 group">
        <summary class="px-3 py-3 cursor-pointer font-medium text-indigo-100 list-none flex justify-between items-center after:content-['+'] after:text-indigo-300 group-open:after:content-['−'] [&::-webkit-details-marker]:hidden">운영 센터</summary>
        <div class="pb-2 pl-2 flex flex-col gap-0.5">
          <a href="#dashboard" class="hub-mobile-nav-link block px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200">대시보드</a>
          <a href="#members" class="hub-mobile-nav-link block px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200">회원 · B2B</a>
          <a href="#enrollments" class="hub-mobile-nav-link block px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200">수강신청</a>
          <a href="#payments" class="hub-mobile-nav-link block px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200">결제 · 매출</a>
        </div>
      </details>
      <details class="border-b border-white/10 group">
        <summary class="px-3 py-3 cursor-pointer font-medium text-indigo-100 list-none flex justify-between items-center after:content-['+'] after:text-indigo-300 group-open:after:content-['−'] [&::-webkit-details-marker]:hidden">교육 및 자격</summary>
        <div class="pb-2 pl-2 flex flex-col gap-0.5">
          <a href="#courses" class="hub-mobile-nav-link block px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200">강좌 (Classic / Next)</a>
          <a href="#videos" class="hub-mobile-nav-link block px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200">영상 · 차시</a>
          <a href="#certificates" class="hub-mobile-nav-link block px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200">수료 · 자격</a>
          <a href="#instructors" class="hub-mobile-nav-link block px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200">강사단 · 파견</a>
        </div>
      </details>
      <details class="border-b border-white/10 group">
        <summary class="px-3 py-3 cursor-pointer font-medium text-indigo-100 list-none flex justify-between items-center after:content-['+'] after:text-indigo-300 group-open:after:content-['−'] [&::-webkit-details-marker]:hidden">출판 및 ISBN</summary>
        <div class="pb-2 pl-2 flex flex-col gap-0.5">
          <a href="#publishing" class="hub-mobile-nav-link block px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200">출판 승인 대기</a>
          <a href="#isbn" class="hub-mobile-nav-link block px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200">ISBN 재고</a>
          <a href="#ai-cost" class="hub-mobile-nav-link block px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200">AI API 비용</a>
        </div>
      </details>
      <details class="border-b border-white/10 group">
        <summary class="px-3 py-3 cursor-pointer font-medium text-indigo-100 list-none flex justify-between items-center after:content-['+'] after:text-indigo-300 group-open:after:content-['−'] [&::-webkit-details-marker]:hidden">시스템 지원</summary>
        <div class="pb-2 pl-2 flex flex-col gap-0.5">
          <a href="#support" class="hub-mobile-nav-link block px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200">공지 · Q&amp;A</a>
          <a href="#popups" class="hub-mobile-nav-link block px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200">팝업</a>
          <a href="#settings" class="hub-mobile-nav-link block px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200">사이트 · 연동 설정</a>
        </div>
      </details>
    </div>
  </aside>

  <nav class="ms-admin-top-bar bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 text-white shadow-xl sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-0 flex-1 md:flex-none">
        <p class="text-xs text-indigo-200 uppercase tracking-widest">Mindstory LMS</p>
        <h1 class="text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-2 truncate">
          <i class="fas fa-satellite-dish text-indigo-300 shrink-0"></i>
          <span class="truncate">중앙 관제탑</span>
        </h1>
      </div>
      <div class="flex items-center gap-2 flex-wrap justify-end">
        <button type="button" id="hubMobileNavToggle" class="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15" aria-label="메뉴 열기" aria-expanded="false">
          <span class="text-lg" aria-hidden="true">☰</span>
        </button>
        <a href="/" class="bg-indigo-500 hover:bg-indigo-400 border border-white/20 text-white px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap shadow-sm">
          <i class="fas fa-graduation-cap mr-1"></i>수강생 사이트
        </a>
        <span class="inline-flex items-center max-w-[min(14rem,50vw)]"><span id="adminName" class="text-sm text-indigo-100 hidden sm:inline truncate" data-ms-name-default="text-sm text-indigo-100 hidden sm:inline truncate">…</span></span>
        <button type="button" onclick="logout()" class="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm whitespace-nowrap">
          <i class="fas fa-sign-out-alt mr-1"></i>로그아웃
        </button>
      </div>
    </div>
    <div class="hidden md:block border-t border-white/10">
      <div class="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center gap-1 lg:gap-2" id="hubDesktopGnb">
        <div class="relative group" data-hub-group="ops">
          <button type="button" class="hub-gnb-trigger px-3 py-2 rounded-lg text-sm font-medium text-indigo-100 hover:bg-white/10 border border-transparent group-hover:border-white/20 flex items-center gap-1">
            운영 센터 <i class="fas fa-chevron-down text-[10px] opacity-70"></i>
          </button>
          <div class="absolute left-0 top-full pt-1 min-w-[14rem] opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-150 z-50 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto">
            <div class="rounded-xl bg-slate-800 border border-white/10 shadow-xl py-2 text-sm">
              <a href="#dashboard" data-hub-panel="dashboard" class="block px-4 py-2 text-slate-100 hover:bg-indigo-600/80">대시보드</a>
              <a href="#members" data-hub-panel="members" class="block px-4 py-2 text-slate-100 hover:bg-indigo-600/80">회원 · B2B 관리</a>
              <a href="#enrollments" data-hub-panel="enrollments" class="block px-4 py-2 text-slate-100 hover:bg-indigo-600/80">수강신청</a>
              <a href="#payments" data-hub-panel="payments" class="block px-4 py-2 text-slate-100 hover:bg-indigo-600/80">결제 · 매출</a>
            </div>
          </div>
        </div>
        <div class="relative group" data-hub-group="edu">
          <button type="button" class="hub-gnb-trigger px-3 py-2 rounded-lg text-sm font-medium text-indigo-100 hover:bg-white/10 border border-transparent group-hover:border-white/20 flex items-center gap-1">
            교육 및 자격 <i class="fas fa-chevron-down text-[10px] opacity-70"></i>
          </button>
          <div class="absolute left-0 top-full pt-1 min-w-[15rem] opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-150 z-50 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto">
            <div class="rounded-xl bg-slate-800 border border-white/10 shadow-xl py-2 text-sm">
              <a href="#courses" data-hub-panel="courses" class="block px-4 py-2 text-slate-100 hover:bg-indigo-600/80">강좌 관리 (Classic / Next)</a>
              <a href="#videos" data-hub-panel="videos" class="block px-4 py-2 text-slate-100 hover:bg-indigo-600/80">영상 · 차시</a>
              <a href="#certificates" data-hub-panel="certificates" class="block px-4 py-2 text-slate-100 hover:bg-indigo-600/80">수료 · 자격 (기관 템플릿)</a>
              <a href="#instructors" data-hub-panel="instructors" class="block px-4 py-2 text-slate-100 hover:bg-indigo-600/80">강사단 · 파견</a>
            </div>
          </div>
        </div>
        <div class="relative group" data-hub-group="pub">
          <button type="button" class="hub-gnb-trigger px-3 py-2 rounded-lg text-sm font-medium text-indigo-100 hover:bg-white/10 border border-transparent group-hover:border-white/20 flex items-center gap-1">
            출판 및 ISBN <i class="fas fa-chevron-down text-[10px] opacity-70"></i>
          </button>
          <div class="absolute left-0 top-full pt-1 min-w-[14rem] opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-150 z-50 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto">
            <div class="rounded-xl bg-slate-800 border border-white/10 shadow-xl py-2 text-sm">
              <a href="#publishing" data-hub-panel="publishing" class="block px-4 py-2 text-slate-100 hover:bg-indigo-600/80">출판 승인 대기</a>
              <a href="#isbn" data-hub-panel="isbn" class="block px-4 py-2 text-slate-100 hover:bg-indigo-600/80">ISBN 재고 관리</a>
              <a href="#ai-cost" data-hub-panel="ai-cost" class="block px-4 py-2 text-slate-100 hover:bg-indigo-600/80">AI API 비용 모니터링</a>
            </div>
          </div>
        </div>
        <div class="relative group" data-hub-group="sys">
          <button type="button" class="hub-gnb-trigger px-3 py-2 rounded-lg text-sm font-medium text-indigo-100 hover:bg-white/10 border border-transparent group-hover:border-white/20 flex items-center gap-1">
            시스템 지원 <i class="fas fa-chevron-down text-[10px] opacity-70"></i>
          </button>
          <div class="absolute left-0 top-full pt-1 min-w-[14rem] opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-150 z-50 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto">
            <div class="rounded-xl bg-slate-800 border border-white/10 shadow-xl py-2 text-sm">
              <a href="#support" data-hub-panel="support" class="block px-4 py-2 text-slate-100 hover:bg-indigo-600/80">공지 · Q&amp;A</a>
              <a href="#popups" data-hub-panel="popups" class="block px-4 py-2 text-slate-100 hover:bg-indigo-600/80">팝업</a>
              <a href="#settings" data-hub-panel="settings" class="block px-4 py-2 text-slate-100 hover:bg-indigo-600/80">사이트 · 연동 (PG, API 키)</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </nav>

  <main class="max-w-7xl mx-auto px-4 py-6">
    <!-- 대시보드 -->
    <section id="panel-dashboard" class="hub-panel space-y-6">
      <p class="text-sm text-slate-600">카드를 클릭하면 요약 설명을 보고, 관련 관리 탭으로 바로 이동할 수 있습니다.</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button type="button" data-hub-kpi="users" class="hub-kpi-card group rounded-2xl bg-white shadow-lg border border-slate-200 p-6 flex flex-col justify-between text-left cursor-pointer transition hover:shadow-xl hover:border-indigo-300 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 active:scale-[0.99]">
          <div class="flex justify-between items-start gap-2">
            <div>
              <p class="text-sm font-medium text-slate-500">총 회원수</p>
              <p class="text-3xl font-bold text-purple-600 mt-1 tabular-nums" id="statTotalUsers">—</p>
            </div>
            <span class="rounded-full bg-purple-100 text-purple-700 p-3 shrink-0 group-hover:bg-purple-200 transition-colors"><i class="fas fa-users"></i></span>
          </div>
          <p class="text-xs text-slate-400 mt-3">삭제되지 않은 전체 회원 계정 수</p>
        </button>
        <button type="button" data-hub-kpi="courses" class="hub-kpi-card group rounded-2xl bg-white shadow-lg border border-slate-200 p-6 flex flex-col justify-between text-left cursor-pointer transition hover:shadow-xl hover:border-blue-300 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:scale-[0.99]">
          <div class="flex justify-between items-start gap-2">
            <div>
              <p class="text-sm font-medium text-slate-500">총 강좌수</p>
              <p class="text-3xl font-bold text-blue-600 mt-1 tabular-nums" id="statTotalCourses">—</p>
            </div>
            <span class="rounded-full bg-blue-100 text-blue-700 p-3 shrink-0 group-hover:bg-blue-200 transition-colors"><i class="fas fa-book"></i></span>
          </div>
          <p class="text-xs text-slate-400 mt-3">상태가 <code class="text-[11px] bg-slate-100 px-1 rounded">published</code>인 강좌</p>
        </button>
        <button type="button" data-hub-kpi="revenue" class="hub-kpi-card group rounded-2xl bg-white shadow-lg border border-slate-200 p-6 flex flex-col justify-between text-left cursor-pointer transition hover:shadow-xl hover:border-emerald-300 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 active:scale-[0.99]">
          <div class="flex justify-between items-start gap-2">
            <div>
              <p class="text-sm font-medium text-slate-500">이번 달 매출</p>
              <p class="text-3xl font-bold text-emerald-600 mt-1 tabular-nums" id="statMonthlyRevenue">—</p>
            </div>
            <span class="rounded-full bg-emerald-100 text-emerald-700 p-3 shrink-0 group-hover:bg-emerald-200 transition-colors"><i class="fas fa-won-sign"></i></span>
          </div>
          <p class="text-xs text-slate-400 mt-3">당월 결제·주문 합계 (API 집계 기준)</p>
        </button>
        <button type="button" data-hub-kpi="enrollments" class="hub-kpi-card group rounded-2xl bg-white shadow-lg border border-slate-200 p-6 flex flex-col justify-between text-left cursor-pointer transition hover:shadow-xl hover:border-amber-300 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 active:scale-[0.99]">
          <div class="flex justify-between items-start gap-2">
            <div>
              <p class="text-sm font-medium text-slate-500">활성 수강생</p>
              <p class="text-3xl font-bold text-orange-600 mt-1 tabular-nums" id="statActiveEnrollments">—</p>
            </div>
            <span class="rounded-full bg-orange-100 text-orange-700 p-3 shrink-0 group-hover:bg-orange-200 transition-colors"><i class="fas fa-graduation-cap"></i></span>
          </div>
          <p class="text-xs text-slate-400 mt-3">수강 완료 전(진행 중) 수강신청 건수</p>
        </button>
      </div>
      <h2 class="text-sm font-semibold text-slate-700 uppercase tracking-wide">오늘의 지표</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button type="button" data-hub-pulse="signup" class="hub-pulse-card group rounded-2xl bg-white shadow-lg border border-slate-200 p-6 flex flex-col justify-between text-left w-full cursor-pointer transition hover:shadow-xl hover:border-indigo-300 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 active:scale-[0.99]">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-sm font-medium text-slate-500">오늘의 신규 가입자</p>
              <p class="text-3xl font-bold text-indigo-600 mt-1 tabular-nums" id="pulseSignup">—</p>
            </div>
            <span class="rounded-full bg-indigo-100 text-indigo-700 p-3 group-hover:bg-indigo-200 transition-colors"><i class="fas fa-user-plus"></i></span>
          </div>
          <p class="text-xs text-slate-400 mt-3">오늘 00:00 ~ 현재 기준 가입 완료 회원</p>
        </button>
        <button type="button" data-hub-pulse="payment" class="hub-pulse-card group rounded-2xl bg-white shadow-lg border border-slate-200 p-6 flex flex-col justify-between text-left w-full cursor-pointer transition hover:shadow-xl hover:border-emerald-300 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 active:scale-[0.99]">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-sm font-medium text-slate-500">오늘의 결제 금액</p>
              <p class="text-3xl font-bold text-emerald-600 mt-1 tabular-nums" id="pulsePayment">—</p>
            </div>
            <span class="rounded-full bg-emerald-100 text-emerald-700 p-3 group-hover:bg-emerald-200 transition-colors"><i class="fas fa-won-sign"></i></span>
          </div>
          <p class="text-xs text-slate-400 mt-3">오늘 결제 완료 주문 합계 (orders / payments)</p>
        </button>
        <button type="button" data-hub-pulse="inquiry" class="hub-pulse-card group rounded-2xl bg-white shadow-lg border border-slate-200 p-6 flex flex-col justify-between text-left w-full cursor-pointer transition hover:shadow-xl hover:border-amber-300 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 active:scale-[0.99]">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-sm font-medium text-slate-500">미답변 문의</p>
              <p class="text-3xl font-bold text-amber-600 mt-1 tabular-nums" id="pulseInquiries">—</p>
            </div>
            <span class="rounded-full bg-amber-100 text-amber-700 p-3 group-hover:bg-amber-200 transition-colors"><i class="fas fa-inbox"></i></span>
          </div>
          <p class="text-xs text-slate-400 mt-3">support_inquiries.status = open (마이그레이션 적용 후 집계)</p>
        </button>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white rounded-xl shadow border border-slate-200 p-4">
          <h3 class="font-semibold text-slate-800 mb-3"><i class="fas fa-bolt mr-2 text-indigo-500"></i>최근 결제</h3>
          <div id="hubRecentPayments" class="space-y-2 text-sm text-slate-600 min-h-[120px]">로딩 중…</div>
        </div>
        <div class="bg-white rounded-xl shadow border border-slate-200 p-4">
          <h3 class="font-semibold text-slate-800 mb-3"><i class="fas fa-user-plus mr-2 text-indigo-500"></i>최근 수강신청</h3>
          <div id="hubRecentEnrollments" class="space-y-2 text-sm text-slate-600 min-h-[120px]">로딩 중…</div>
        </div>
      </div>
    </section>

    <!-- 회원 -->
    <section id="panel-members" class="hub-panel hidden space-y-4">
      <div class="flex flex-wrap gap-2 items-center">
        <input type="search" id="userSearch" placeholder="이름 또는 이메일 검색" class="flex-1 min-w-[200px] border border-slate-300 rounded-lg px-4 py-2">
        <button type="button" id="userSearchBtn" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">검색</button>
      </div>
      <div class="bg-white rounded-xl shadow border overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-600">
            <tr>
              <th class="text-left p-3">ID</th>
              <th class="text-left p-3">이름</th>
              <th class="text-left p-3">이메일</th>
              <th class="text-left p-3">역할</th>
              <th class="text-left p-3">가입일</th>
              <th class="text-center p-3">관리</th>
            </tr>
          </thead>
          <tbody id="userTableBody"></tbody>
        </table>
      </div>
      <div class="flex justify-center gap-2" id="userPagination"></div>
    </section>

    <!-- 강좌 -->
    <section id="panel-courses" class="hub-panel hidden space-y-4">
      <div class="flex flex-wrap gap-3 items-center justify-between">
        <p class="text-sm text-slate-600">공개·비공개 토글은 학생 사이트 목록(/api/courses)에서 즉시 반영됩니다. (공개: active 또는 published)</p>
        <button type="button" onclick="openHubNewCourseModal()" class="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm">
          <i class="fas fa-plus mr-1"></i>새 강좌 등록
        </button>
      </div>
      <div class="bg-white rounded-xl shadow border overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-600">
            <tr>
              <th class="text-left p-3">강좌</th>
              <th class="text-left p-3">상태</th>
              <th class="text-center p-3">학생 사이트 공개</th>
              <th class="text-center p-3">관리</th>
            </tr>
          </thead>
          <tbody id="courseTableBody"></tbody>
        </table>
      </div>
    </section>

    <!-- 결제 -->
    <section id="panel-payments" class="hub-panel hidden">
      <div class="bg-white rounded-xl shadow border p-4 overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50"><tr>
            <th class="text-left p-2">회원</th>
            <th class="text-left p-2">강좌</th>
            <th class="text-right p-2">금액</th>
            <th class="text-left p-2">일시</th>
          </tr></thead>
          <tbody id="paymentsTableBody"></tbody>
        </table>
      </div>
    </section>

    <!-- 영상 -->
    <section id="panel-videos" class="hub-panel hidden">
      <div class="bg-white rounded-xl shadow border p-4 overflow-x-auto max-h-[70vh] overflow-y-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50"><tr>
            <th class="text-left p-2">강좌</th>
            <th class="text-left p-2">차시</th>
            <th class="text-left p-2">영상</th>
          </tr></thead>
          <tbody id="videosTableBody"></tbody>
        </table>
      </div>
    </section>

    <!-- 수강 신청 -->
    <section id="panel-enrollments" class="hub-panel hidden">
      <div class="bg-white rounded-xl shadow border p-4 overflow-x-auto max-h-[70vh] overflow-y-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50"><tr>
            <th class="text-left p-2">회원</th>
            <th class="text-left p-2">강좌</th>
            <th class="text-left p-2">신청일</th>
          </tr></thead>
          <tbody id="enrollmentsTableBody"></tbody>
        </table>
      </div>
    </section>

    <!-- B2B · 기관 (플레이스홀더) -->
    <section id="panel-b2b" class="hub-panel hidden space-y-4">
      <div class="bg-white rounded-xl shadow border border-slate-200 p-6 text-sm text-slate-600 leading-relaxed">
        <h2 class="text-lg font-bold text-slate-800 mb-2"><i class="fas fa-building text-indigo-500 mr-2"></i>회원 · B2B</h2>
        <p>소속 기관별 수강생 그룹화·통계는 이 영역에 연결할 예정입니다. 현재는 <a href="#members" class="text-indigo-600 underline">회원 탭</a>에서 개별 계정을 관리할 수 있습니다.</p>
      </div>
    </section>

    <!-- 수료 · 자격 -->
    <section id="panel-certificates" class="hub-panel hidden space-y-4">
      <p class="text-sm text-slate-600">4개 자매기관별 직인·로고 자동 매칭은 추후 연동됩니다. 아래는 발급된 수료증 목록입니다.</p>
      <div class="bg-white rounded-xl shadow border overflow-x-auto max-h-[70vh] overflow-y-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-600">
            <tr>
              <th class="text-left p-3">번호</th>
              <th class="text-left p-3">회원</th>
              <th class="text-left p-3">강좌</th>
              <th class="text-left p-3">발급일</th>
            </tr>
          </thead>
          <tbody id="certificatesTableBody"></tbody>
        </table>
      </div>
    </section>

    <!-- 강사단 · 파견 (플레이스홀더) -->
    <section id="panel-instructors" class="hub-panel hidden space-y-4">
      <div class="bg-white rounded-xl shadow border border-slate-200 p-6 text-sm text-slate-600 leading-relaxed">
        <h2 class="text-lg font-bold text-slate-800 mb-2"><i class="fas fa-chalkboard-teacher text-indigo-500 mr-2"></i>강사단 · 파견</h2>
        <p>지역·분야별 강사 검색 및 파견 이력 관리 UI는 이 패널에 구현 예정입니다.</p>
      </div>
    </section>

    <!-- 출판 승인 대기 (플레이스홀더) -->
    <section id="panel-publishing" class="hub-panel hidden space-y-4">
      <p class="text-sm text-slate-600">수강생이 <code class="text-xs bg-slate-100 px-1 rounded">POST /api/digital-books/submissions</code>로 제출한 원고가 여기에 쌓입니다. 행을 클릭하면 우측에서 검수합니다.</p>
      <div class="bg-white rounded-xl shadow border overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-600">
            <tr>
              <th class="text-left p-3">ID</th>
              <th class="text-left p-3">도서명</th>
              <th class="text-left p-3">작가명</th>
              <th class="text-left p-3">회원</th>
              <th class="text-left p-3">제출일</th>
              <th class="text-center p-3">열기</th>
            </tr>
          </thead>
          <tbody id="publishingQueueBody"></tbody>
        </table>
      </div>
    </section>

    <div id="publishingSlideBackdrop" class="fixed inset-0 z-[110] bg-black/40 opacity-0 pointer-events-none transition-opacity" aria-hidden="true"></div>
    <aside id="publishingSlideOver" class="fixed top-0 right-0 z-[111] h-full w-full max-w-lg bg-white shadow-2xl border-l border-slate-200 translate-x-full transition-transform flex flex-col" aria-hidden="true" aria-labelledby="publishingDetailTitle">
      <div class="p-4 border-b flex justify-between items-center shrink-0 bg-slate-50">
        <h2 id="publishingDetailTitle" class="text-lg font-bold text-slate-900 truncate pr-2">검수</h2>
        <button type="button" id="publishingSlideClose" class="text-2xl text-slate-500 hover:text-slate-800 leading-none">&times;</button>
      </div>
      <div class="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
        <div id="publishingDetailMeta" class="text-slate-700 space-y-1"></div>
        <div>
          <h3 class="font-semibold text-slate-800 mb-1">줄거리 요약</h3>
          <p id="publishingDetailSummary" class="text-slate-600 whitespace-pre-wrap border rounded-lg p-3 bg-slate-50 min-h-[3rem]"></p>
        </div>
        <div>
          <h3 class="font-semibold text-slate-800 mb-1">작가 의도</h3>
          <p id="publishingDetailIntent" class="text-slate-600 whitespace-pre-wrap border rounded-lg p-3 bg-slate-50 min-h-[3rem]"></p>
        </div>
        <div>
          <h3 class="font-semibold text-slate-800 mb-2">원고 PDF</h3>
          <div id="publishingPdfWrap" class="border rounded-lg overflow-hidden bg-slate-100" style="min-height: 14rem">
            <iframe id="publishingPdfIframe" title="원고 미리보기" class="w-full h-64 border-0 bg-white hidden"></iframe>
            <p id="publishingPdfError" class="hidden p-4 text-amber-800 text-sm"></p>
          </div>
          <a id="publishingPdfLink" href="#" target="_blank" rel="noopener" class="mt-2 inline-block text-indigo-600 hover:underline text-sm"></a>
        </div>
        <div class="border rounded-lg p-3 bg-indigo-50/50 border-indigo-100">
          <h3 class="font-semibold text-slate-800 mb-2">검수 체크리스트 (기록용)</h3>
          <label class="flex items-center gap-2 py-1 cursor-pointer"><input type="checkbox" id="chkCopyright" class="rounded border-slate-300" /> 저작권 확인</label>
          <label class="flex items-center gap-2 py-1 cursor-pointer"><input type="checkbox" id="chkContent" class="rounded border-slate-300" /> 내용 적절성</label>
          <label class="flex items-center gap-2 py-1 cursor-pointer"><input type="checkbox" id="chkImage" class="rounded border-slate-300" /> 이미지 품질</label>
        </div>
        <div class="flex flex-wrap gap-2 pt-2">
          <button type="button" id="publishingBtnReject" class="flex-1 min-w-[120px] bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-medium">반려</button>
          <button type="button" id="publishingBtnApprove" class="flex-1 min-w-[120px] bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium">승인 및 ISBN 할당</button>
        </div>
      </div>
    </aside>

    <!-- AI API 비용 (플레이스홀더) -->
    <section id="panel-ai-cost" class="hub-panel hidden space-y-4">
      <div class="bg-white rounded-xl shadow border border-slate-200 p-6 text-sm text-slate-600 leading-relaxed">
        <h2 class="text-lg font-bold text-slate-800 mb-2"><i class="fas fa-robot text-indigo-500 mr-2"></i>AI API 비용 모니터링</h2>
        <p>OpenAI 등 사용량·한도 제어 대시보드는 추후 연동합니다. 키는 Cloudflare / Wrangler 시크릿으로 보관하는 것을 권장합니다.</p>
      </div>
    </section>

    <!-- 공지 · Q&A -->
    <section id="panel-support" class="hub-panel hidden space-y-4">
      <div class="bg-white rounded-xl shadow border border-slate-200 p-6 text-sm text-slate-600 leading-relaxed">
        <h2 class="text-lg font-bold text-slate-800 mb-2"><i class="fas fa-headset text-indigo-500 mr-2"></i>공지 · Q&amp;A</h2>
        <p>고객 문의·티켓은 DB(<code class="text-xs bg-slate-100 px-1 rounded">support_inquiries</code>) 기준으로 집계할 수 있습니다. 전용 관리 UI는 이 탭에 확장 예정입니다.</p>
      </div>
    </section>

    <!-- ISBN · 디지털 출판 (MINDSTORY Next) -->
    <section id="panel-isbn" class="hub-panel hidden">
      <div class="grid lg:grid-cols-2 gap-6">
        <div class="bg-white rounded-xl shadow border p-5 space-y-3">
          <h3 class="font-bold text-slate-800">ISBN 창고</h3>
          <p class="text-xs text-slate-500">한 줄에 하나씩 13자리 ISBN (숫자만). 중복은 무시됩니다.</p>
          <textarea id="isbnBulkInput" rows="8" class="w-full border rounded-lg p-2 text-sm font-mono" placeholder="9788901234567&#10;9788901234574"></textarea>
          <button type="button" id="isbnBulkBtn" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">일괄 등록</button>
          <p id="isbnBulkMsg" class="text-sm text-slate-600"></p>
        </div>
        <div class="bg-white rounded-xl shadow border p-5 space-y-4">
          <h3 class="font-bold text-slate-800">재고 현황</h3>
          <div class="flex gap-4">
            <div class="flex-1 rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-center">
              <p class="text-xs text-emerald-800 font-medium">사용 가능</p>
              <p id="isbnStatAvail" class="text-2xl font-bold text-emerald-700">—</p>
            </div>
            <div class="flex-1 rounded-lg bg-slate-100 border border-slate-200 p-4 text-center">
              <p class="text-xs text-slate-600 font-medium">사용됨</p>
              <p id="isbnStatUsed" class="text-2xl font-bold text-slate-800">—</p>
            </div>
          </div>
          <div class="h-3 rounded-full bg-slate-100 overflow-hidden flex" id="isbnBarWrap" title="ISBN 사용 비율">
            <div id="isbnBarUsed" class="h-full bg-indigo-500 transition-all" style="width:0%"></div>
          </div>
        </div>
      </div>
      <div class="mt-6 bg-white rounded-xl shadow border p-4 overflow-x-auto max-h-[55vh] overflow-y-auto">
        <h3 class="font-bold text-slate-800 mb-3">발행·작가 현황</h3>
        <table class="w-full text-sm">
          <thead class="bg-slate-50"><tr>
            <th class="text-left p-2">ID</th>
            <th class="text-left p-2">회원</th>
            <th class="text-left p-2">제목</th>
            <th class="text-left p-2">ISBN</th>
            <th class="text-left p-2">상태</th>
            <th class="text-left p-2">바코드</th>
          </tr></thead>
          <tbody id="isbnBooksBody"></tbody>
        </table>
      </div>
    </section>

    <!-- 팝업 / 설정 (플레이스홀더 — 전용 라우트 미구성 시 안내) -->
    <section id="panel-popups" class="hub-panel hidden">
      <div class="bg-amber-50 border border-amber-200 rounded-xl p-6 text-sm text-amber-900">
        팝업은 API(<code class="bg-amber-100 px-1 rounded">/api/popups</code>)로 관리됩니다. 관리자 UI는 추후 이 탭에 연결할 수 있습니다.
      </div>
    </section>
    <section id="panel-settings" class="hub-panel hidden">
      <div class="bg-slate-50 border border-slate-200 rounded-xl p-6 text-sm text-slate-700">
        배포·비밀키·도메인은 Cloudflare / Wrangler 환경에서 설정합니다. LMS 내 별도 설정 화면은 필요 시 추가합니다.
      </div>
    </section>
  </main>

  <!-- 회원 상세 모달 -->
  <div id="userModal" class="fixed inset-0 bg-black/50 z-50 hidden items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
      <div class="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
        <h3 class="text-lg font-bold text-slate-800" id="userModalTitle">회원</h3>
        <button type="button" class="text-slate-500 hover:text-slate-800 text-2xl" onclick="closeUserModal()">&times;</button>
      </div>
      <div class="p-4 space-y-4" id="userModalBody"></div>
    </div>
  </div>

  <!-- 강좌 편집 모달 -->
  <div id="courseModal" class="fixed inset-0 bg-black/50 z-50 hidden items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl">
      <div class="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
        <h3 class="text-lg font-bold text-slate-800" id="courseModalTitle">강좌 편집</h3>
        <button type="button" class="text-slate-500 hover:text-slate-800 text-2xl" onclick="closeCourseModal()">&times;</button>
      </div>
      <div class="border-b flex gap-1 px-4 pt-2">
        <button type="button" id="courseTabInfo" class="tab-btn px-4 py-2 rounded-t-lg font-medium text-indigo-600 border-b-2 border-indigo-600">기본 정보</button>
        <button type="button" id="courseTabLessons" class="tab-btn px-4 py-2 rounded-t-lg font-medium text-slate-500">차시·영상</button>
        <button type="button" id="courseTabAdvanced" class="tab-btn px-4 py-2 rounded-t-lg font-medium text-slate-500">차시 전체 편집</button>
      </div>
      <div id="courseTabPanelInfo" class="p-4 space-y-3"></div>
      <div id="courseTabPanelLessons" class="p-4 hidden space-y-2"></div>
      <div id="courseTabPanelAdvanced" class="p-4 hidden">
        <iframe id="courseLessonsFrame" class="w-full h-[70vh] border rounded-lg" title="차시 관리"></iframe>
      </div>
    </div>
  </div>

  <!-- KPI / 오늘의 지표 — 클릭 시 상세 모달 -->
  <div id="hubKpiModal" class="fixed inset-0 z-[60] hidden items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="hubKpiModalTitle" onclick="if (event.target === this) closeHubKpiModal()">
    <div class="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden" onclick="event.stopPropagation()">
      <div class="p-6">
        <h3 id="hubKpiModalTitle" class="text-lg font-bold text-slate-900"></h3>
        <p id="hubKpiModalBody" class="text-sm text-slate-600 mt-2 leading-relaxed"></p>
        <p class="text-xs text-slate-500 mt-3">현재 값</p>
        <p id="hubKpiModalValue" class="text-2xl font-bold text-indigo-600 mt-1 tabular-nums"></p>
        <div class="flex flex-wrap gap-2 mt-6">
          <button type="button" id="hubKpiModalGoTab" class="flex-1 min-w-[120px] bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition">
            관련 탭으로 이동
          </button>
          <button type="button" onclick="closeHubKpiModal()" class="flex-1 min-w-[120px] bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2.5 rounded-lg text-sm font-medium transition">
            닫기
          </button>
        </div>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script src="/static/js/auth.js?v=20260329-admin-name"></script>
  <script src="/static/js/utils.js"></script>
  <script src="/static/js/admin-hub.js"></script>
  <script src="/static/js/admin-isbn.js"></script>
  <script src="/static/js/security.js${STATIC_JS_CACHE_QUERY}"></script>
</body>
</html>`
}
