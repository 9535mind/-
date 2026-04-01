/**
 * 마인드스토리 원격평생교육원 — 중앙 관제탑 (단일 관리자 셸)
 * /admin/dashboard 에서만 로드, 다른 /admin/* 는 여기로 리다이렉트
 */
import { STATIC_JS_CACHE_QUERY } from './static-js-cache-bust'
import {
  getAdminDashboardMockInlinePayload,
  renderRecentPaymentsHtml,
} from './admin-dashboard-mock-data'
import {
  siteAiChatWidgetMarkup,
  siteAiChatWidgetScript,
  siteAiChatWidgetStyles,
} from './site-ai-chat-widget'
import { adminHubMemberDetailPanelHtml } from './admin-hub-member-panel-html'
import { adminHubEntityDetailPanelHtml } from './admin-hub-entity-panel-html'

export function adminHubPageHtml(): string {
  const dashboardMockPayload = getAdminDashboardMockInlinePayload()
  const dashboardMockInlineJson = JSON.stringify(dashboardMockPayload).replace(/</g, '\\u003c')
  const dashboardRecentPaymentsHtml = renderRecentPaymentsHtml(dashboardMockPayload.recentPayments)

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>중앙 관제탑 — 마인드스토리 원격평생교육원</title>
  <link rel="stylesheet" href="/static/css/app.css" />
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  ${siteAiChatWidgetStyles()}
  <style id="hub-dash-live">
    @keyframes hub-row-fade-out {
      to { opacity: 0; transform: translateY(-8px); }
    }
    .hub-row-leaving {
      animation: hub-row-fade-out 0.45s ease forwards;
    }
    .hub-qa-accordion:not(.hidden) {
      animation: hub-row-fade-out 0.2s ease reverse;
    }
  </style>
  <style id="hub-gnb-titanium">
    /* 관제탑 데스크톱 서브 GNB — 다크 티타늄 (SaaS) */
    #hubDesktopGnb .hub-gnb-trigger {
      -webkit-tap-highlight-color: transparent;
    }
    #hubDesktopGnb .hub-gnb-trigger-label {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      line-height: 1.2;
    }
    #hubDesktopGnb .hub-gnb-trigger--active .hub-gnb-trigger-label::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: -0.45rem;
      height: 2px;
      border-radius: 9999px;
      background: linear-gradient(90deg, rgb(52 211 153), rgb(45 212 191));
      box-shadow: 0 0 12px rgba(52, 211, 153, 0.35);
    }
    #hubDesktopGnb .hub-gnb-chevron {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      margin-top: 1px;
      color: currentColor;
    }
    #hubDesktopGnb .hub-gnb-trigger--active {
      color: rgb(255 255 255);
      font-weight: 600;
    }
    #hubDesktopGnb .hub-gnb-trigger:hover .hub-gnb-chevron,
    #hubDesktopGnb .hub-gnb-trigger:focus-visible .hub-gnb-chevron,
    #hubDesktopGnb .hub-gnb-trigger--active .hub-gnb-chevron {
      opacity: 1;
    }
    /* 운영 센터 — 중첩 아코디언 */
    .hub-ops-acc-panel:not(.hidden) {
      animation: hubOpsAccOpen 0.22s ease-out;
    }
    /* 데스크톱 메가 메뉴 — JS로 hub-gnb-mega--open 토글 (호버만으로는 닫힘 불가 문제 해소) */
    #hubDesktopGnb .hub-gnb-dropdown {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition: opacity 0.18s ease, visibility 0.18s ease;
    }
    #hubDesktopGnb .hub-gnb-mega.hub-gnb-mega--open .hub-gnb-dropdown {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }
    @keyframes hubOpsAccOpen {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .hub-ops-mobile-nested > summary {
      list-style: none;
    }
    .hub-ops-mobile-nested > summary::-webkit-details-marker {
      display: none;
    }
    .hub-ops-mobile-nested[open] > summary .hub-ops-m-chev {
      transform: rotate(180deg);
    }
    @media print {
      .ms-admin-top-bar,
      #hubMobileBackdrop,
      #hubMobileDrawer,
      #hubUnifiedSearchWrap,
      .hub-no-print {
        display: none !important;
      }
      body {
        background: #fff !important;
      }
      main.max-w-7xl {
        max-width: none !important;
        padding: 12px !important;
      }
    }
  </style>
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
        <div class="pb-2 pl-2 flex flex-col gap-1">
          <a href="#dashboard" class="hub-mobile-nav-link block px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200">대시보드</a>
          <details class="hub-ops-mobile-nested rounded-lg border border-white/10 bg-white/[0.04] overflow-hidden">
            <summary class="px-3 py-2.5 cursor-pointer text-sm font-medium text-indigo-100 flex justify-between items-center after:content-['▼'] after:text-[10px] after:text-indigo-300/90 open:after:rotate-180">회원 · B2B 관리</summary>
            <div class="pl-3 pr-2 pb-2 ml-3 border-l border-emerald-500/35 flex flex-col gap-0.5">
              <a href="/admin/members?type=all" data-hub-panel="members" class="hub-mobile-nav-link block px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200 text-sm"><i class="fas fa-users w-4 mr-1.5 text-indigo-300"></i>전체 회원 조회</a>
              <a href="/admin/members?type=b2b" data-hub-panel="members" class="hub-mobile-nav-link block px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200 text-sm"><i class="fas fa-building w-4 mr-1.5 text-emerald-300"></i>B2B 단체 관리</a>
              <a href="/admin/members?type=b2b&filter=b2b_pending" data-hub-panel="members" class="hub-mobile-nav-link flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200 text-sm"><span><i class="fas fa-user-check w-4 mr-1.5 text-rose-300"></i>가입 승인 대기</span><span id="hubMobilePendingCountBadge" class="inline-flex min-w-[1.25rem] h-[1.1rem] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">0</span></a>
              <a href="/admin/members?type=instructor" data-hub-panel="members" class="hub-mobile-nav-link block px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200 text-sm"><i class="fas fa-award w-4 mr-1.5 text-amber-300"></i>강사/전문가 관리</a>
              <a href="/admin/members?type=all&filter=today_signup" data-hub-panel="members" class="hub-mobile-nav-link flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200 text-sm"><span><i class="fas fa-star w-4 mr-1.5 text-cyan-300"></i>오늘 신규 가입</span><span class="inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-indigo-500 text-[10px] leading-none font-bold text-white">N</span></a>
            </div>
          </details>
          <details class="hub-ops-mobile-nested rounded-lg border border-white/10 bg-white/[0.04] overflow-hidden">
            <summary class="px-3 py-2.5 cursor-pointer text-sm font-medium text-indigo-100 flex justify-between items-center list-none">
              <span>수강신청</span>
              <span class="hub-ops-m-chev text-[10px] text-indigo-300/90 transition-transform duration-200" aria-hidden="true">▼</span>
            </summary>
            <div class="pl-3 pr-2 pb-2 ml-3 border-l border-emerald-500/35 flex flex-col gap-0.5">
              <a href="#enrollments" data-hub-panel="enrollments" class="hub-mobile-nav-link block px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200 text-sm">수강신청 페이지</a>
              <button type="button" data-hub-dash-detail="dash-today-enrollments" class="hub-mobile-nav-link block w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200 text-sm">🆕 오늘 수강 신청 명단</button>
            </div>
          </details>
          <details class="hub-ops-mobile-nested rounded-lg border border-white/10 bg-white/[0.04] overflow-hidden">
            <summary class="px-3 py-2.5 cursor-pointer text-sm font-medium text-indigo-100 flex justify-between items-center list-none">
              <span>결제 · 매출</span>
              <span class="hub-ops-m-chev text-[10px] text-indigo-300/90 transition-transform duration-200" aria-hidden="true">▼</span>
            </summary>
            <div class="pl-3 pr-2 pb-2 ml-3 border-l border-emerald-500/35 flex flex-col gap-0.5">
              <a href="#payments" data-hub-panel="payments" class="hub-mobile-nav-link block px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200 text-sm">결제 · 매출 페이지</a>
              <button type="button" data-hub-dash-detail="dash-today-revenue" class="hub-mobile-nav-link block w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200 text-sm">🆕 오늘 결제 금액 내역</button>
            </div>
          </details>
          <details class="hub-ops-mobile-nested rounded-lg border border-rose-500/25 bg-rose-950/20 overflow-hidden">
            <summary class="px-3 py-2.5 cursor-pointer text-sm font-semibold text-rose-100 flex justify-between items-center list-none">
              <span>업무 큐 / 즉시 처리</span>
              <span class="hub-ops-m-chev text-[10px] text-rose-300/90 transition-transform duration-200" aria-hidden="true">▼</span>
            </summary>
            <div class="pl-3 pr-2 pb-2 ml-3 border-l border-rose-500/40 flex flex-col gap-0.5">
              <button type="button" data-hub-dash-detail="dash-urgent-queue" class="hub-mobile-nav-link block w-full text-left px-3 py-2 rounded-lg hover:bg-rose-900/40 text-rose-50 text-sm">🚨 즉시 처리 필요 내역</button>
            </div>
          </details>
        </div>
      </details>
      <details class="border-b border-white/10 group">
        <summary class="px-3 py-3 cursor-pointer font-medium text-indigo-100 list-none flex justify-between items-center after:content-['+'] after:text-indigo-300 group-open:after:content-['−'] [&::-webkit-details-marker]:hidden">교육 및 자격</summary>
        <div class="pb-2 pl-2 flex flex-col gap-0.5">
          <a href="#edu-dashboard" data-hub-panel="edu-dashboard" class="hub-mobile-nav-link block px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200 font-medium">📊 교육 대시보드</a>
          <a href="#courses" class="hub-mobile-nav-link block px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200">강좌 (Classic / Next / NCS)</a>
          <a href="#videos" class="hub-mobile-nav-link block px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200">영상 · 차시</a>
          <a href="#certificates" class="hub-mobile-nav-link block px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200">수료 · 자격</a>
          <a href="#instructors" class="hub-mobile-nav-link block px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200">강사단 · 파견</a>
        </div>
      </details>
      <details class="border-b border-white/10 group">
        <summary class="px-3 py-3 cursor-pointer font-medium text-indigo-100 list-none flex justify-between items-center after:content-['+'] after:text-indigo-300 group-open:after:content-['−'] [&::-webkit-details-marker]:hidden">출판 및 ISBN</summary>
        <div class="pb-2 pl-2 flex flex-col gap-0.5">
          <a href="#pub-dashboard" data-hub-panel="pub-dashboard" class="hub-mobile-nav-link block px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200 font-medium">📚 출판 대시보드</a>
          <a href="#publishing" class="hub-mobile-nav-link block px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200">출판 승인 대기</a>
          <a href="#isbn" class="hub-mobile-nav-link block px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200">ISBN 재고</a>
          <a href="#ai-cost" class="hub-mobile-nav-link block px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200">AI API 비용</a>
        </div>
      </details>
      <details class="border-b border-white/10 group">
        <summary class="px-3 py-3 cursor-pointer font-medium text-indigo-100 list-none flex justify-between items-center after:content-['+'] after:text-indigo-300 group-open:after:content-['−'] [&::-webkit-details-marker]:hidden">시스템 지원</summary>
        <div class="pb-2 pl-2 flex flex-col gap-0.5">
          <a href="#sys-dashboard" data-hub-panel="sys-dashboard" class="hub-mobile-nav-link block px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200 font-medium">🛡️ 시스템 대시보드</a>
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
    <div class="hidden md:block border-t border-white/5 bg-black/10">
      <div class="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-end gap-6 lg:gap-8" id="hubDesktopGnb">
        <div class="relative hub-gnb-mega" data-hub-group="ops">
          <button type="button" class="hub-gnb-trigger relative z-10 inline-flex flex-col items-center justify-end rounded-md border-0 bg-transparent px-3 py-1.5 text-sm font-medium text-slate-300 transition-all duration-200 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40">
            <span class="hub-gnb-trigger-label">
              운영 센터
              <i class="fas fa-chevron-down hub-gnb-chevron text-[10px] text-current opacity-80 transition-opacity duration-200" aria-hidden="true"></i>
            </span>
          </button>
          <div class="hub-gnb-dropdown absolute left-0 top-full pt-1 min-w-[16rem] z-50">
            <div class="rounded-xl bg-slate-800 border border-white/10 shadow-xl py-1.5 text-sm min-w-[17rem] max-w-[20rem]">
              <a href="#dashboard" data-hub-panel="dashboard" class="block px-4 py-2 text-slate-100 hover:bg-indigo-600/80 rounded-t-lg">대시보드</a>
              <div class="hub-ops-subgroup border-t border-white/10">
                <button type="button" class="hub-ops-acc-trigger w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-slate-100 hover:bg-indigo-600/40 text-sm font-medium">
                  <span>회원 · B2B 관리</span>
                  <i class="fas fa-chevron-down hub-ops-chevron text-[10px] text-indigo-200/90 transition-transform duration-200 shrink-0" aria-hidden="true"></i>
                </button>
                <div class="hub-ops-acc-panel hidden border-t border-white/5 bg-slate-900/50">
                  <div class="flex flex-col gap-0.5 py-1.5 pl-3 pr-2 ml-4 border-l-2 border-emerald-500/40">
                    <a href="/admin/members?type=all" data-hub-panel="members" class="block rounded-md px-3 py-1.5 text-slate-200 hover:bg-indigo-600/85 text-[13px]"><i class="fas fa-users w-4 mr-1.5 text-indigo-300"></i>전체 회원 조회</a>
                    <a href="/admin/members?type=b2b" data-hub-panel="members" class="block rounded-md px-3 py-1.5 text-slate-200 hover:bg-indigo-600/85 text-[13px]"><i class="fas fa-building w-4 mr-1.5 text-emerald-300"></i>B2B 단체 관리</a>
                    <a href="/admin/members?type=b2b&filter=b2b_pending" data-hub-panel="members" class="flex items-center justify-between rounded-md px-3 py-1.5 text-slate-200 hover:bg-indigo-600/85 text-[13px]"><span><i class="fas fa-user-check w-4 mr-1.5 text-rose-300"></i>가입 승인 대기</span><span id="hubDesktopPendingCountBadge" class="inline-flex min-w-[1.25rem] h-[1.1rem] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">0</span></a>
                    <a href="/admin/members?type=instructor" data-hub-panel="members" class="block rounded-md px-3 py-1.5 text-slate-200 hover:bg-indigo-600/85 text-[13px]"><i class="fas fa-award w-4 mr-1.5 text-amber-300"></i>강사/전문가 관리</a>
                    <a href="/admin/members?type=all&filter=today_signup" data-hub-panel="members" class="flex items-center justify-between rounded-md px-3 py-1.5 text-slate-200 hover:bg-indigo-600/85 text-[13px]"><span><i class="fas fa-star w-4 mr-1.5 text-cyan-300"></i>오늘 신규 가입</span><span class="inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-indigo-500 text-[10px] leading-none font-bold text-white">N</span></a>
                  </div>
                </div>
              </div>
              <div class="hub-ops-subgroup border-t border-white/10">
                <button type="button" class="hub-ops-acc-trigger w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-slate-100 hover:bg-indigo-600/40 text-sm font-medium">
                  <span>수강신청</span>
                  <i class="fas fa-chevron-down hub-ops-chevron text-[10px] text-indigo-200/90 transition-transform duration-200 shrink-0" aria-hidden="true"></i>
                </button>
                <div class="hub-ops-acc-panel hidden border-t border-white/5 bg-slate-900/50">
                  <div class="flex flex-col gap-0.5 py-1.5 pl-3 pr-2 ml-4 border-l-2 border-emerald-500/40">
                    <a href="#enrollments" data-hub-panel="enrollments" class="block rounded-md px-3 py-1.5 text-slate-200 hover:bg-indigo-600/85 text-[13px]">수강신청 페이지</a>
                    <button type="button" data-hub-dash-detail="dash-today-enrollments" class="block w-full text-left rounded-md px-3 py-1.5 text-slate-200 hover:bg-indigo-600/85 text-[13px]">🆕 오늘 수강 신청 명단</button>
                  </div>
                </div>
              </div>
              <div class="hub-ops-subgroup border-t border-white/10">
                <button type="button" class="hub-ops-acc-trigger w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-slate-100 hover:bg-indigo-600/40 text-sm font-medium">
                  <span>결제 · 매출</span>
                  <i class="fas fa-chevron-down hub-ops-chevron text-[10px] text-indigo-200/90 transition-transform duration-200 shrink-0" aria-hidden="true"></i>
                </button>
                <div class="hub-ops-acc-panel hidden border-t border-white/5 bg-slate-900/50">
                  <div class="flex flex-col gap-0.5 py-1.5 pl-3 pr-2 ml-4 border-l-2 border-emerald-500/40">
                    <a href="#payments" data-hub-panel="payments" class="block rounded-md px-3 py-1.5 text-slate-200 hover:bg-indigo-600/85 text-[13px]">결제 · 매출 페이지</a>
                    <button type="button" data-hub-dash-detail="dash-today-revenue" class="block w-full text-left rounded-md px-3 py-1.5 text-slate-200 hover:bg-indigo-600/85 text-[13px]">🆕 오늘 결제 금액 내역</button>
                  </div>
                </div>
              </div>
              <div class="hub-ops-subgroup border-t border-white/10 rounded-b-lg overflow-hidden">
                <button type="button" class="hub-ops-acc-trigger w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-rose-100 hover:bg-rose-900/35 text-sm font-semibold">
                  <span>업무 큐 / 즉시 처리</span>
                  <i class="fas fa-chevron-down hub-ops-chevron text-[10px] text-rose-200/90 transition-transform duration-200 shrink-0" aria-hidden="true"></i>
                </button>
                <div class="hub-ops-acc-panel hidden border-t border-rose-500/20 bg-rose-950/30">
                  <div class="flex flex-col gap-0.5 py-1.5 pl-3 pr-2 ml-4 border-l-2 border-rose-400/50">
                    <button type="button" data-hub-dash-detail="dash-urgent-queue" class="block w-full text-left rounded-md px-3 py-1.5 text-rose-50 hover:bg-rose-900/55 text-[13px]">🚨 즉시 처리 필요 내역</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="relative hub-gnb-mega" data-hub-group="edu">
          <button type="button" class="hub-gnb-trigger relative z-10 inline-flex flex-col items-center justify-end rounded-md border-0 bg-transparent px-3 py-1.5 text-sm font-medium text-slate-300 transition-all duration-200 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40">
            <span class="hub-gnb-trigger-label">
              교육 및 자격
              <i class="fas fa-chevron-down hub-gnb-chevron text-[10px] text-current opacity-80 transition-opacity duration-200" aria-hidden="true"></i>
            </span>
          </button>
          <div class="hub-gnb-dropdown absolute left-0 top-full pt-1 min-w-[19rem] max-w-[22rem] z-50">
            <div class="rounded-xl bg-slate-800 border border-white/10 shadow-xl py-1.5 text-sm">
              <a href="#edu-dashboard" data-hub-panel="edu-dashboard" class="block px-4 py-2.5 border-b border-white/10 text-slate-100 hover:bg-indigo-600/80 font-medium rounded-t-xl">📊 교육 대시보드</a>
              <div class="hub-ops-subgroup border-b border-white/10">
                <button type="button" class="hub-ops-acc-trigger w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-slate-100 hover:bg-indigo-600/40 text-sm font-medium">
                  <span>과정 · 커리큘럼</span>
                  <i class="fas fa-chevron-down hub-ops-chevron text-[10px] text-indigo-200/90 transition-transform duration-200 shrink-0" aria-hidden="true"></i>
                </button>
                <div class="hub-ops-acc-panel hidden border-t border-white/5 bg-slate-900/50">
                  <div class="flex flex-col gap-0.5 py-1.5 pl-3 pr-2 ml-4 border-l-2 border-teal-500/40">
                    <button type="button" data-hub-dash-api="courses" class="block w-full text-left rounded-md px-3 py-1.5 text-slate-200 hover:bg-indigo-600/85 text-[13px]">📋 전체 강좌 목록 (DB)</button>
                    <button type="button" data-hub-dash-detail="edu-cohort" class="block w-full text-left rounded-md px-3 py-1.5 text-slate-200 hover:bg-indigo-600/85 text-[13px]">📅 차수 · 개강 일정 (데모)</button>
                    <button type="button" data-hub-dash-detail="edu-classroom-links" class="block w-full text-left rounded-md px-3 py-1.5 text-slate-200 hover:bg-indigo-600/85 text-[13px]">🔗 강의실 바로가기 (데모)</button>
                    <a href="#courses" data-hub-panel="courses" class="block rounded-md px-3 py-1.5 text-slate-200 hover:bg-indigo-600/85 text-[13px]">강좌 탭으로 이동</a>
                  </div>
                </div>
              </div>
              <div class="hub-ops-subgroup border-t border-white/10">
                <button type="button" class="hub-ops-acc-trigger w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-slate-100 hover:bg-indigo-600/40 text-sm font-medium">
                  <span>시험 · 평가</span>
                  <i class="fas fa-chevron-down hub-ops-chevron text-[10px] text-indigo-200/90 transition-transform duration-200 shrink-0" aria-hidden="true"></i>
                </button>
                <div class="hub-ops-acc-panel hidden border-t border-white/5 bg-slate-900/50">
                  <div class="flex flex-col gap-0.5 py-1.5 pl-3 pr-2 ml-4 border-l-2 border-teal-500/40">
                    <button type="button" data-hub-dash-api="exams" class="block w-full text-left rounded-md px-3 py-1.5 text-slate-200 hover:bg-indigo-600/85 text-[13px]">📝 시험 목록 (DB)</button>
                    <button type="button" data-hub-dash-detail="edu-exam-questions" class="block w-full text-left rounded-md px-3 py-1.5 text-slate-200 hover:bg-indigo-600/85 text-[13px]">문항 관리 (데모)</button>
                    <button type="button" data-hub-dash-detail="edu-exam-attempts" class="block w-full text-left rounded-md px-3 py-1.5 text-slate-200 hover:bg-indigo-600/85 text-[13px]">응시 현황 (데모)</button>
                    <button type="button" data-hub-dash-detail="edu-exam-grading" class="block w-full text-left rounded-md px-3 py-1.5 text-slate-200 hover:bg-indigo-600/85 text-[13px]">채점 대기 (데모)</button>
                  </div>
                </div>
              </div>
              <div class="hub-ops-subgroup border-t border-white/10">
                <button type="button" class="hub-ops-acc-trigger w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-slate-100 hover:bg-indigo-600/40 text-sm font-medium">
                  <span>수료 · 자격 · 강사</span>
                  <i class="fas fa-chevron-down hub-ops-chevron text-[10px] text-indigo-200/90 transition-transform duration-200 shrink-0" aria-hidden="true"></i>
                </button>
                <div class="hub-ops-acc-panel hidden border-t border-white/5 bg-slate-900/50">
                  <div class="flex flex-col gap-0.5 py-1.5 pl-3 pr-2 ml-4 border-l-2 border-teal-500/40">
                    <button type="button" data-hub-dash-api="certificates" class="block w-full text-left rounded-md px-3 py-1.5 text-slate-200 hover:bg-indigo-600/85 text-[13px]">🎓 수료증 발급 내역 (DB)</button>
                    <a href="#certificates" data-hub-panel="certificates" class="block rounded-md px-3 py-1.5 text-slate-200 hover:bg-indigo-600/85 text-[13px]">수료 탭</a>
                    <button type="button" data-hub-dash-detail="edu-instructor-mgmt" class="block w-full text-left rounded-md px-3 py-1.5 text-slate-200 hover:bg-indigo-600/85 text-[13px]">강사 · 정산 (데모)</button>
                    <a href="#instructors" data-hub-panel="instructors" class="block rounded-md px-3 py-1.5 text-slate-200 hover:bg-indigo-600/85 text-[13px]">강사단 탭</a>
                  </div>
                </div>
              </div>
              <div class="hub-ops-subgroup border-t border-white/10 rounded-b-lg overflow-hidden">
                <a href="#videos" data-hub-panel="videos" class="block px-4 py-2.5 text-slate-100 hover:bg-indigo-600/80">영상 · 차시</a>
              </div>
            </div>
          </div>
        </div>
        <div class="relative hub-gnb-mega" data-hub-group="pub">
          <button type="button" class="hub-gnb-trigger relative z-10 inline-flex flex-col items-center justify-end rounded-md border-0 bg-transparent px-3 py-1.5 text-sm font-medium text-slate-300 transition-all duration-200 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40">
            <span class="hub-gnb-trigger-label">
              출판 및 ISBN
              <i class="fas fa-chevron-down hub-gnb-chevron text-[10px] text-current opacity-80 transition-opacity duration-200" aria-hidden="true"></i>
            </span>
          </button>
          <div class="hub-gnb-dropdown absolute left-0 top-full pt-1 min-w-[18rem] z-50">
            <div class="rounded-xl bg-slate-800 border border-white/10 shadow-xl py-1.5 text-sm">
              <a href="#pub-dashboard" data-hub-panel="pub-dashboard" class="block px-4 py-2.5 border-b border-white/10 text-slate-100 hover:bg-indigo-600/80 font-medium rounded-t-xl">📚 출판 대시보드</a>
              <div class="hub-ops-subgroup border-b border-white/10">
                <button type="button" class="hub-ops-acc-trigger w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-slate-100 hover:bg-indigo-600/40 text-sm font-medium">
                  <span>콘텐츠 · 인벤토리</span>
                  <i class="fas fa-chevron-down hub-ops-chevron text-[10px] text-indigo-200/90 transition-transform duration-200 shrink-0" aria-hidden="true"></i>
                </button>
                <div class="hub-ops-acc-panel hidden border-t border-white/5 bg-slate-900/50">
                  <div class="flex flex-col gap-0.5 py-1.5 pl-3 pr-2 ml-4 border-l-2 border-amber-500/40">
                    <button type="button" data-hub-dash-api="digital-books" class="block w-full text-left rounded-md px-3 py-1.5 text-slate-200 hover:bg-indigo-600/85 text-[13px]">📚 디지털 도서 목록 (DB)</button>
                    <a href="#publishing" data-hub-panel="publishing" class="block rounded-md px-3 py-1.5 text-slate-200 hover:bg-indigo-600/85 text-[13px]">출판 승인 대기 탭</a>
                  </div>
                </div>
              </div>
              <div class="hub-ops-subgroup border-t border-white/10">
                <button type="button" class="hub-ops-acc-trigger w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-slate-100 hover:bg-indigo-600/40 text-sm font-medium">
                  <span>ISBN · 신청</span>
                  <i class="fas fa-chevron-down hub-ops-chevron text-[10px] text-indigo-200/90 transition-transform duration-200 shrink-0" aria-hidden="true"></i>
                </button>
                <div class="hub-ops-acc-panel hidden border-t border-white/5 bg-slate-900/50">
                  <div class="flex flex-col gap-0.5 py-1.5 pl-3 pr-2 ml-4 border-l-2 border-amber-500/40">
                    <button type="button" data-hub-dash-api="book-submissions" class="block w-full text-left rounded-md px-3 py-1.5 text-slate-200 hover:bg-indigo-600/85 text-[13px]">📄 출판 검수 대기 (DB)</button>
                    <button type="button" data-hub-dash-detail="pub-isbn-requests" class="block w-full text-left rounded-md px-3 py-1.5 text-slate-200 hover:bg-indigo-600/85 text-[13px]">ISBN 신청 현황 (데모)</button>
                    <a href="#isbn" data-hub-panel="isbn" class="block rounded-md px-3 py-1.5 text-slate-200 hover:bg-indigo-600/85 text-[13px]">ISBN 재고 · 바코드 탭</a>
                  </div>
                </div>
              </div>
              <div class="hub-ops-subgroup border-t border-white/10 rounded-b-lg overflow-hidden">
                <button type="button" class="hub-ops-acc-trigger w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-slate-100 hover:bg-indigo-600/40 text-sm font-medium">
                  <span>저자 · 역자</span>
                  <i class="fas fa-chevron-down hub-ops-chevron text-[10px] text-indigo-200/90 transition-transform duration-200 shrink-0" aria-hidden="true"></i>
                </button>
                <div class="hub-ops-acc-panel hidden border-t border-white/5 bg-slate-900/50">
                  <div class="flex flex-col gap-0.5 py-1.5 pl-3 pr-2 ml-4 border-l-2 border-amber-500/40">
                    <button type="button" data-hub-dash-detail="pub-authors" class="block w-full text-left rounded-md px-3 py-1.5 text-slate-200 hover:bg-indigo-600/85 text-[13px]">저작권 · 인세 (데모)</button>
                  </div>
                </div>
              </div>
              <a href="#ai-cost" data-hub-panel="ai-cost" class="block px-4 py-2 border-t border-white/10 text-slate-100 hover:bg-indigo-600/80">AI API 비용</a>
            </div>
          </div>
        </div>
        <div class="relative hub-gnb-mega" data-hub-group="sys">
          <button type="button" class="hub-gnb-trigger relative z-10 inline-flex flex-col items-center justify-end rounded-md border-0 bg-transparent px-3 py-1.5 text-sm font-medium text-slate-300 transition-all duration-200 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40">
            <span class="hub-gnb-trigger-label">
              시스템 지원
              <i class="fas fa-chevron-down hub-gnb-chevron text-[10px] text-current opacity-80 transition-opacity duration-200" aria-hidden="true"></i>
            </span>
          </button>
          <div class="hub-gnb-dropdown absolute left-0 top-full pt-1 min-w-[18rem] z-50">
            <div class="rounded-xl bg-slate-800 border border-white/10 shadow-xl py-1.5 text-sm">
              <a href="#sys-dashboard" data-hub-panel="sys-dashboard" class="block px-4 py-2.5 border-b border-white/10 text-slate-100 hover:bg-indigo-600/80 font-medium rounded-t-xl">🛡️ 시스템 대시보드</a>
              <div class="hub-ops-subgroup border-b border-white/10">
                <button type="button" class="hub-ops-acc-trigger w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-slate-100 hover:bg-indigo-600/40 text-sm font-medium">
                  <span>AI · 사이트</span>
                  <i class="fas fa-chevron-down hub-ops-chevron text-[10px] text-indigo-200/90 transition-transform duration-200 shrink-0" aria-hidden="true"></i>
                </button>
                <div class="hub-ops-acc-panel hidden border-t border-white/5 bg-slate-900/50">
                  <div class="flex flex-col gap-0.5 py-1.5 pl-3 pr-2 ml-4 border-l-2 border-sky-500/40">
                    <button type="button" data-hub-dash-detail="sys-ai-agent" class="block w-full text-left rounded-md px-3 py-1.5 text-slate-200 hover:bg-indigo-600/85 text-[13px]">🤖 AI 에이전트 설정 (데모)</button>
                    <button type="button" data-hub-dash-detail="sys-site-content" class="block w-full text-left rounded-md px-3 py-1.5 text-slate-200 hover:bg-indigo-600/85 text-[13px]">🌐 사이트 기본 설정 (데모)</button>
                  </div>
                </div>
              </div>
              <div class="hub-ops-subgroup border-t border-white/10">
                <button type="button" class="hub-ops-acc-trigger w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-slate-100 hover:bg-indigo-600/40 text-sm font-medium">
                  <span>운영 · 보안</span>
                  <i class="fas fa-chevron-down hub-ops-chevron text-[10px] text-indigo-200/90 transition-transform duration-200 shrink-0" aria-hidden="true"></i>
                </button>
                <div class="hub-ops-acc-panel hidden border-t border-white/5 bg-slate-900/50">
                  <div class="flex flex-col gap-0.5 py-1.5 pl-3 pr-2 ml-4 border-l-2 border-sky-500/40">
                    <button type="button" data-hub-dash-detail="sys-admin-accounts" class="block w-full text-left rounded-md px-3 py-1.5 text-slate-200 hover:bg-indigo-600/85 text-[13px]">👤 관리자 계정 (데모)</button>
                    <button type="button" data-hub-dash-detail="sys-db-monitor" class="block w-full text-left rounded-md px-3 py-1.5 text-slate-200 hover:bg-indigo-600/85 text-[13px]">💾 DB 모니터링 (데모)</button>
                  </div>
                </div>
              </div>
              <a href="#support" data-hub-panel="support" class="block px-4 py-2 border-t border-white/10 text-slate-100 hover:bg-indigo-600/80">공지 · Q&amp;A</a>
              <a href="#popups" data-hub-panel="popups" class="block px-4 py-2 text-slate-100 hover:bg-indigo-600/80">팝업</a>
              <a href="#settings" data-hub-panel="settings" class="block px-4 py-2 rounded-b-lg text-slate-100 hover:bg-indigo-600/80">사이트 · 연동 (PG, API 키)</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </nav>

  <main class="max-w-7xl mx-auto px-4 py-6">
    <div id="hubUnifiedSearchWrap" class="sticky top-[4.5rem] z-40 -mx-4 px-4 py-2 mb-4 bg-slate-100/95 backdrop-blur border-b border-slate-200/80 shadow-sm">
      <label class="sr-only" for="hubUnifiedSearch">관제탑 통합 검색</label>
      <div class="flex items-center gap-2 max-w-3xl mx-auto">
        <span class="text-slate-500 text-sm shrink-0 hidden sm:inline" aria-hidden="true">🔍</span>
        <input type="search" id="hubUnifiedSearch" autocomplete="off" placeholder="통합 검색 — 현재 화면의 표에서 텍스트 필터" class="flex-1 min-w-0 border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white shadow-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none" />
      </div>
    </div>
    <!-- 대시보드 (실무 KPI + 목업 데이터 — API 연동 시 교체) -->
    <section id="panel-dashboard" class="hub-panel space-y-0">
      <p class="text-sm text-slate-500 mb-4">오늘 기준 요약입니다. <span class="text-slate-400">(데모 데이터)</span></p>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button type="button" data-hub-dash-detail="dash-new-signups" class="text-left bg-white rounded-xl border border-slate-200 shadow-sm p-5 w-full cursor-pointer transition hover:border-indigo-300 hover:ring-2 hover:ring-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
          <p class="text-sm font-medium text-slate-500">오늘 신규 가입</p>
          <p id="hubKpiSignups" class="text-3xl font-bold text-slate-900 mt-2 tabular-nums transition-all duration-300">12명</p>
          <p id="hubKpiSignupsB2bPending" class="text-xs text-slate-500 mt-2">B2B 승인 대기 1명</p>
          <p class="text-[11px] text-indigo-500 mt-2">클릭하여 상세 목록 (데모)</p>
        </button>
        <button type="button" data-hub-dash-detail="dash-today-enrollments" class="text-left bg-white rounded-xl border border-slate-200 shadow-sm p-5 w-full cursor-pointer transition hover:border-indigo-300 hover:ring-2 hover:ring-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
          <p class="text-sm font-medium text-slate-500">오늘 수강 신청</p>
          <p id="hubKpiEnrollments" class="text-3xl font-bold text-slate-900 mt-2 tabular-nums transition-all duration-300">18건</p>
          <p class="text-xs text-slate-500 mt-2">Classic 12건 · Next 4건 · 메타인지 2건</p>
          <p class="text-[11px] text-indigo-500 mt-2">클릭하여 상세 목록 (데모)</p>
        </button>
        <button type="button" data-hub-dash-detail="dash-today-revenue" class="text-left bg-white rounded-xl border border-slate-200 shadow-sm p-5 w-full cursor-pointer transition hover:border-indigo-300 hover:ring-2 hover:ring-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
          <p class="text-sm font-medium text-slate-500">오늘 결제 금액</p>
          <p id="hubKpiRevenue" class="text-3xl font-bold text-emerald-600 mt-2 tabular-nums transition-all duration-300">₩ 1,250,000</p>
          <p class="text-xs text-emerald-700/80 mt-2">전일 대비 ▲ 12%</p>
          <p class="text-[11px] text-indigo-500 mt-2">클릭하여 상세 목록 (데모)</p>
        </button>
        <button type="button" data-hub-dash-detail="dash-urgent-queue" class="text-left rounded-xl border border-rose-200/90 bg-rose-50 shadow-sm p-5 w-full ring-1 ring-rose-100/80 cursor-pointer transition hover:border-rose-300 hover:ring-2 hover:ring-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400">
          <p class="text-sm font-semibold text-rose-800">즉시 처리 필요</p>
          <p id="hubKpiUrgent" class="text-3xl font-bold text-rose-600 mt-2 tabular-nums transition-all duration-300">8건</p>
          <p class="text-xs text-rose-700/90 mt-2">누적 미처리 업무 · 우선 확인</p>
          <p class="text-[11px] text-rose-600 mt-2 font-medium">클릭 시 8건 전체 큐 (데모)</p>
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 class="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span class="text-lg" aria-hidden="true">🚨</span> Action Required <span class="text-sm font-normal text-slate-500">(할 일 목록)</span>
          </h2>
          <ul class="space-y-2">
            <li>
              <button type="button" data-hub-dash-detail="dash-action-bank" class="w-full flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 transition hover:bg-slate-100 hover:border-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 text-left">
                <span class="font-medium">무통장 입금 확인 대기</span>
                <span class="flex items-center gap-2 shrink-0">
                  <span id="hubBadgeActionBank" class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 transition-all duration-300">3건</span>
                  <span class="text-slate-400" aria-hidden="true">➔</span>
                </span>
              </button>
            </li>
            <li>
              <button type="button" data-hub-dash-detail="dash-action-b2b" class="w-full flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 transition hover:bg-slate-100 hover:border-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 text-left">
                <span class="font-medium">B2B / 강사 권한 승인 대기</span>
                <span class="flex items-center gap-2 shrink-0">
                  <span id="hubBadgeActionB2b" class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 transition-all duration-300">1건</span>
                  <span class="text-slate-400" aria-hidden="true">➔</span>
                </span>
              </button>
            </li>
            <li>
              <button type="button" data-hub-dash-detail="dash-action-inquiry" class="w-full flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 transition hover:bg-slate-100 hover:border-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 text-left">
                <span class="font-medium">미답변 1:1 문의 및 Q&amp;A</span>
                <span class="flex items-center gap-2 shrink-0">
                  <span id="hubBadgeActionInquiry" class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 transition-all duration-300">4건</span>
                  <span class="text-slate-400" aria-hidden="true">➔</span>
                </span>
              </button>
            </li>
          </ul>
        </div>

        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 class="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span class="text-lg" aria-hidden="true">💰</span> 실시간 결제 내역
          </h2>
          <p class="text-xs text-slate-500 mb-3">최근 8건 <span class="text-slate-400">(데모 데이터 · admin-dashboard-mock-data)</span></p>
          <ul id="hubDashboardRecentPayments" class="divide-y divide-slate-100 text-sm">
            ${dashboardRecentPaymentsHtml}
          </ul>
        </div>
      </div>
    </section>

    <!-- 교육 및 자격 — 교육 대시보드 (운영 센터와 동일 카드·하단 2열 레이아웃) -->
    <section id="panel-edu-dashboard" class="hub-panel hidden space-y-0">
      <p class="text-sm text-slate-500 mb-4">교육·학습·자격 현황 요약입니다. <span class="text-slate-400">(D1 실시간)</span></p>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button type="button" data-hub-edu-card="courses-list" class="text-left bg-white rounded-xl border border-slate-200 shadow-sm p-5 w-full cursor-pointer transition hover:border-indigo-300 hover:ring-2 hover:ring-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
          <p class="text-sm font-medium text-slate-500">전체 강좌</p>
          <p id="hubEduKpiCourses" class="text-3xl font-bold text-slate-900 mt-2 tabular-nums transition-all duration-300">—</p>
          <p class="text-xs text-slate-500 mt-2">courses 테이블 전체 건수</p>
          <p class="text-[11px] text-indigo-500 mt-2">클릭하여 강좌 목록 (DB)</p>
        </button>
        <button type="button" data-hub-edu-card="enrollments-tab" class="text-left bg-white rounded-xl border border-slate-200 shadow-sm p-5 w-full cursor-pointer transition hover:border-indigo-300 hover:ring-2 hover:ring-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
          <p class="text-sm font-medium text-slate-500">평균 진도율</p>
          <p id="hubEduKpiProgress" class="text-3xl font-bold text-slate-900 mt-2 tabular-nums transition-all duration-300">—</p>
          <p class="text-xs text-slate-500 mt-2">lesson_progress 시청률 평균</p>
          <p class="text-[11px] text-indigo-500 mt-2">클릭하여 수강신청 탭</p>
        </button>
        <button type="button" data-hub-edu-card="scroll-cert" class="text-left bg-white rounded-xl border border-slate-200 shadow-sm p-5 w-full cursor-pointer transition hover:border-indigo-300 hover:ring-2 hover:ring-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
          <p class="text-sm font-medium text-slate-500">자격증 대기</p>
          <p id="hubEduKpiCertPending" class="text-3xl font-bold text-slate-900 mt-2 tabular-nums transition-all duration-300">—</p>
          <p class="text-xs text-slate-500 mt-2">certification_applications · pending</p>
          <p class="text-[11px] text-indigo-500 mt-2">클릭 시 아래 대기 명단으로 이동</p>
        </button>
        <button type="button" data-hub-edu-card="exams-list" class="text-left rounded-xl border border-rose-200/90 bg-rose-50 shadow-sm p-5 w-full ring-1 ring-rose-100/80 cursor-pointer transition hover:border-rose-300 hover:ring-2 hover:ring-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400">
          <p class="text-sm font-semibold text-rose-800">오늘 응시생</p>
          <p id="hubEduKpiExamToday" class="text-3xl font-bold text-rose-600 mt-2 tabular-nums transition-all duration-300">—</p>
          <p class="text-xs text-rose-700/90 mt-2">exam_attempts · 오늘 시작 건수</p>
          <p class="text-[11px] text-rose-600 mt-2 font-medium">클릭하여 시험 목록 (DB)</p>
        </button>
      </div>

      <div id="hubEduDashPrintZone" class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div id="hubEduDashActivityBlock" class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 class="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span class="text-lg" aria-hidden="true">📚</span> 최근 학습 활동 내역
            <span class="text-sm font-normal text-slate-500">(lesson_progress)</span>
          </h2>
          <p class="text-xs text-slate-500 mb-3">최근 갱신 순 · 이름 클릭 시 회원 상세 패널</p>
          <div class="overflow-x-auto max-h-[min(420px,55vh)] overflow-y-auto rounded-lg border border-slate-100">
            <table class="w-full text-sm text-left">
              <thead class="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">
                <tr>
                  <th class="p-3 font-semibold whitespace-nowrap">이름</th>
                  <th class="p-3 font-semibold whitespace-nowrap">강좌</th>
                  <th class="p-3 font-semibold whitespace-nowrap">차시</th>
                  <th class="p-3 font-semibold text-right whitespace-nowrap">진도</th>
                  <th class="p-3 font-semibold whitespace-nowrap">갱신</th>
                </tr>
              </thead>
              <tbody id="hubEduDashActivityBody" class="divide-y divide-slate-100"></tbody>
            </table>
          </div>
        </div>

        <div id="hubEduDashCertBlock" class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 class="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span class="text-lg" aria-hidden="true">🎖️</span> 자격증 발급 대기 명단
            <span class="text-sm font-normal text-slate-500">(pending)</span>
          </h2>
          <p class="text-xs text-slate-500 mb-3">신청자명 클릭 시 회원 상세 패널</p>
          <div class="overflow-x-auto max-h-[min(420px,55vh)] overflow-y-auto rounded-lg border border-slate-100">
            <table class="w-full text-sm text-left">
              <thead class="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">
                <tr>
                  <th class="p-3 font-semibold whitespace-nowrap">신청자</th>
                  <th class="p-3 font-semibold whitespace-nowrap">자격 유형</th>
                  <th class="p-3 font-semibold whitespace-nowrap">접수번호</th>
                  <th class="p-3 font-semibold whitespace-nowrap">접수일</th>
                </tr>
              </thead>
              <tbody id="hubEduDashCertBody" class="divide-y divide-slate-100"></tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="mt-4 flex flex-wrap justify-end gap-2 relative z-10">
        <button type="button" class="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50 shadow-sm" onclick="hubPrintHubSection('hubEduDashPrintZone', '교육 대시보드')">🖨️ 인쇄</button>
      </div>
    </section>

    <!-- 출판 및 ISBN — 출판 대시보드 -->
    <section id="panel-pub-dashboard" class="hub-panel hidden space-y-0">
      <p class="text-sm text-slate-500 mb-4">지식 콘텐츠가 상품으로 전환되는 흐름입니다. <span class="text-slate-400">(D1 실시간)</span></p>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button type="button" data-hub-pub-card="digital-list" class="text-left bg-white rounded-xl border border-slate-200 shadow-sm p-5 w-full cursor-pointer transition hover:border-indigo-300 hover:ring-2 hover:ring-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
          <p class="text-sm font-medium text-slate-500">전체 콘텐츠(도서)</p>
          <p id="hubPubKpiBooks" class="text-3xl font-bold text-slate-900 mt-2 tabular-nums">—</p>
          <p class="text-xs text-slate-500 mt-2">digital_books 건수</p>
          <p class="text-[11px] text-indigo-500 mt-2">클릭 · 디지털 도서 DB 목록</p>
        </button>
        <button type="button" data-hub-pub-card="submissions" class="text-left bg-white rounded-xl border border-slate-200 shadow-sm p-5 w-full cursor-pointer transition hover:border-indigo-300 hover:ring-2 hover:ring-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
          <p class="text-sm font-medium text-slate-500">ISBN·출판 승인 대기</p>
          <p id="hubPubKpiPending" class="text-3xl font-bold text-amber-700 mt-2 tabular-nums">—</p>
          <p class="text-xs text-slate-500 mt-2">book_submissions · pending</p>
          <p class="text-[11px] text-indigo-500 mt-2">클릭 · 검수 대기열</p>
        </button>
        <button type="button" data-hub-pub-card="publishing-tab" class="text-left bg-white rounded-xl border border-slate-200 shadow-sm p-5 w-full cursor-pointer transition hover:border-indigo-300 hover:ring-2 hover:ring-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
          <p class="text-sm font-medium text-slate-500">이번 달 정식 출간</p>
          <p id="hubPubKpiMonth" class="text-3xl font-bold text-slate-900 mt-2 tabular-nums">—</p>
          <p class="text-xs text-slate-500 mt-2">published_books (당월)</p>
          <p class="text-[11px] text-indigo-500 mt-2">클릭 · 출판 승인 탭</p>
        </button>
        <button type="button" data-hub-pub-card="payments-tab" class="text-left rounded-xl border border-rose-200/90 bg-rose-50 shadow-sm p-5 w-full ring-1 ring-rose-100/80 cursor-pointer transition hover:border-rose-300 hover:ring-2 hover:ring-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400">
          <p class="text-sm font-semibold text-rose-800">누적 결제 완료</p>
          <p id="hubPubKpiOrders" class="text-3xl font-bold text-rose-600 mt-2 tabular-nums">—</p>
          <p class="text-xs text-rose-700/90 mt-2">orders · status=paid (콘텐츠 구매 지표)</p>
          <p class="text-[11px] text-rose-600 mt-2 font-medium">클릭 · 결제 탭</p>
        </button>
      </div>
      <div id="hubPubDashPrintZone" class="mt-6 space-y-4">
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 class="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span class="text-lg" aria-hidden="true">📖</span> 출판 리스트 <span class="text-sm font-normal text-slate-500">(ISBN·도서)</span>
          </h2>
          <p class="text-xs text-slate-500 mb-3">도서명 클릭 시 우측 <strong>도서 상세</strong> 패널 · 회원명은 회원 패널</p>
          <div class="overflow-x-auto max-h-[min(480px,60vh)] overflow-y-auto rounded-lg border border-slate-100">
            <table class="w-full text-sm text-left">
              <thead class="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">
                <tr>
                  <th class="p-3 font-semibold whitespace-nowrap">도서명</th>
                  <th class="p-3 font-semibold whitespace-nowrap">저자</th>
                  <th class="p-3 font-semibold whitespace-nowrap">ISBN 상태</th>
                  <th class="p-3 font-semibold whitespace-nowrap">도서 상태</th>
                  <th class="p-3 font-semibold whitespace-nowrap">발행·갱신</th>
                </tr>
              </thead>
              <tbody id="hubPubDashListBody" class="divide-y divide-slate-100"></tbody>
            </table>
          </div>
        </div>
        <div class="flex flex-wrap justify-end gap-2 relative z-10 pb-2">
          <button type="button" class="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50 shadow-sm" onclick="hubPrintHubSection('hubPubDashPrintZone', '출판 현황')">🖨️ 인쇄</button>
        </div>
      </div>
    </section>

    <!-- 시스템 지원 — 종합 검진 -->
    <section id="panel-sys-dashboard" class="hub-panel hidden space-y-0">
      <p class="text-sm text-slate-500 mb-4">LMS 상태·보안·AI·세션 요약입니다. <span class="text-slate-400">(D1 실시간)</span></p>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="text-left bg-white rounded-xl border border-slate-200 shadow-sm p-5 w-full">
          <p class="text-sm font-medium text-slate-500">DB 용량 (추정)</p>
          <p id="hubSysKpiDbPct" class="text-3xl font-bold text-slate-900 mt-2 tabular-nums">—</p>
          <p id="hubSysKpiDbSub" class="text-xs text-slate-500 mt-2">PRAGMA 기준 · Free 플랜 500MB 대비</p>
          <div class="mt-3 h-2.5 rounded-full bg-slate-100 overflow-hidden ring-1 ring-slate-200/80">
            <div id="hubSysDbBar" class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all w-0"></div>
          </div>
        </div>
        <div class="text-left bg-white rounded-xl border border-slate-200 shadow-sm p-5 w-full">
          <p class="text-sm font-medium text-slate-500">AI 응답 성공률 (24h)</p>
          <p id="hubSysKpiAi" class="text-3xl font-bold text-slate-900 mt-2 tabular-nums">—</p>
          <p class="text-xs text-slate-500 mt-2">ai_chat_request_logs</p>
        </div>
        <div class="text-left bg-white rounded-xl border border-slate-200 shadow-sm p-5 w-full">
          <p class="text-sm font-medium text-slate-500">보안 이벤트 (24h)</p>
          <p id="hubSysKpiSec" class="text-3xl font-bold text-slate-900 mt-2 tabular-nums">—</p>
          <p class="text-xs text-slate-500 mt-2">security_events 기록 건수</p>
        </div>
        <button type="button" data-hub-sys-card="members-tab" class="text-left rounded-xl border border-rose-200/90 bg-rose-50 shadow-sm p-5 w-full ring-1 ring-rose-100/80 cursor-pointer transition hover:border-rose-300 hover:ring-2 hover:ring-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400">
          <p class="text-sm font-semibold text-rose-800">활성 세션 (유저)</p>
          <p id="hubSysKpiSessions" class="text-3xl font-bold text-rose-600 mt-2 tabular-nums">—</p>
          <p class="text-xs text-rose-700/90 mt-2">sessions · 만료 전</p>
          <p class="text-[11px] text-rose-600 mt-2 font-medium">클릭 · 회원 관리</p>
        </button>
      </div>
      <div id="hubSysDashPrintZone" class="mt-6 space-y-4">
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 class="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span class="text-lg" aria-hidden="true">📜</span> 시스템·보안 로그
            <span class="text-sm font-normal text-slate-500">(최신순)</span>
          </h2>
          <div class="overflow-x-auto max-h-[min(480px,60vh)] overflow-y-auto rounded-lg border border-slate-100">
            <table class="w-full text-sm text-left">
              <thead class="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">
                <tr>
                  <th class="p-3 font-semibold whitespace-nowrap">출처</th>
                  <th class="p-3 font-semibold whitespace-nowrap">내용</th>
                  <th class="p-3 font-semibold whitespace-nowrap">일시</th>
                  <th class="p-3 font-semibold whitespace-nowrap">비고</th>
                </tr>
              </thead>
              <tbody id="hubSysDashLogsBody" class="divide-y divide-slate-100"></tbody>
            </table>
          </div>
        </div>
        <div class="flex flex-wrap justify-end gap-2 relative z-10 pb-2">
          <button type="button" class="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50 shadow-sm" onclick="hubPrintHubSection('hubSysDashPrintZone', '시스템 로그')">🖨️ 인쇄</button>
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
        <p>소속 기관별 수강생 그룹화·통계는 이 영역에 연결할 예정입니다. 현재는 <a href="/admin/members" class="text-indigo-600 underline">회원 관리 페이지</a>에서 개별 계정을 관리할 수 있습니다.</p>
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

    <!-- 공지 · Q&A — 공지사항 관리 -->
    <section id="panel-support" class="hub-panel hidden space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-bold text-slate-800 flex items-center gap-2"><i class="fas fa-bullhorn text-indigo-500"></i> 공지사항 관리</h2>
          <p class="text-sm text-slate-600 mt-1">목록은 <strong class="text-amber-800">필독(고정)</strong>이 먼저 오며, 저장 즉시 D1 <code class="text-xs bg-slate-100 px-1 rounded">notices</code> 테이블에 반영됩니다.</p>
        </div>
        <button type="button" id="hubNoticeBtnNew" class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-indigo-700 shadow-sm">
          <i class="fas fa-plus" aria-hidden="true"></i> 새 공지 작성
        </button>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th class="p-3 whitespace-nowrap">ID</th>
                <th class="p-3 min-w-[12rem]">제목</th>
                <th class="p-3 whitespace-nowrap">작성일</th>
                <th class="p-3 whitespace-nowrap">조회수</th>
                <th class="p-3 whitespace-nowrap">상태</th>
                <th class="p-3 whitespace-nowrap">고정</th>
                <th class="p-3 whitespace-nowrap text-right">관리</th>
              </tr>
            </thead>
            <tbody id="hubNoticesTableBody" class="divide-y divide-slate-100">
              <tr><td colspan="7" class="p-8 text-center text-slate-500">불러오는 중…</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div>
          <h3 class="text-base font-bold text-slate-800 flex items-center gap-2"><i class="fas fa-comments text-slate-500"></i> 커뮤니티 · Q&amp;A 게시글</h3>
          <p class="text-sm text-slate-600 mt-1">D1 <code class="text-xs bg-slate-100 px-1 rounded">posts</code> 테이블입니다. 우측에서 수정·숨김 또는 삭제할 수 있습니다.</p>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th class="p-3 whitespace-nowrap">ID</th>
                <th class="p-3 min-w-[10rem]">제목</th>
                <th class="p-3 whitespace-nowrap">작성자</th>
                <th class="p-3 whitespace-nowrap">분류</th>
                <th class="p-3 whitespace-nowrap">작성일</th>
                <th class="p-3 whitespace-nowrap text-right tabular-nums">조회</th>
                <th class="p-3 whitespace-nowrap">상태</th>
                <th class="p-3 whitespace-nowrap text-right">관리</th>
              </tr>
            </thead>
            <tbody id="hubPostsTableBody" class="divide-y divide-slate-100">
              <tr><td colspan="8" class="p-8 text-center text-slate-500">불러오는 중…</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <p class="text-xs text-slate-500 border-t border-slate-200 pt-4">
        <i class="fas fa-headset text-indigo-400 mr-1"></i> 1:1 문의·티켓(<code class="bg-slate-100 px-1 rounded">support_inquiries</code>) 전용 UI는 추후 이 탭 하단에 추가할 수 있습니다.
      </p>
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

    <!-- 팝업 관리 -->
    <section id="panel-popups" class="hub-panel hidden space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-bold text-slate-800 flex items-center gap-2"><i class="fas fa-window-restore text-indigo-500"></i> 팝업 관리</h2>
          <p class="text-sm text-slate-600 mt-1">노출 기간·대상(B2B)·이미지·랜딩 링크를 설정합니다. 저장 즉시 <code class="text-xs bg-slate-100 px-1 rounded">/api/popups/active</code> 반영 기준에 맞춰 동작합니다.</p>
        </div>
        <button type="button" id="hubPopupBtnNew" class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-indigo-700 shadow-sm">
          <i class="fas fa-plus" aria-hidden="true"></i> 새 팝업 등록
        </button>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th class="p-3 whitespace-nowrap">ID</th>
                <th class="p-3 whitespace-nowrap min-w-[8rem]">제목</th>
                <th class="p-3 whitespace-nowrap">노출 대상</th>
                <th class="p-3 whitespace-nowrap min-w-[12rem]">기간</th>
                <th class="p-3 whitespace-nowrap">상태</th>
                <th class="p-3 whitespace-nowrap text-right tabular-nums">조회수</th>
                <th class="p-3 whitespace-nowrap text-right tabular-nums">클릭수</th>
                <th class="p-3 whitespace-nowrap text-right">관리</th>
              </tr>
            </thead>
            <tbody id="hubPopupsTableBody" class="divide-y divide-slate-100">
              <tr><td colspan="8" class="p-8 text-center text-slate-500">불러오는 중…</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
    <section id="panel-settings" class="hub-panel hidden">
      <div class="bg-slate-50 border border-slate-200 rounded-xl p-6 text-sm text-slate-700">
        배포·비밀키·도메인은 Cloudflare / Wrangler 환경에서 설정합니다. LMS 내 별도 설정 화면은 필요 시 추가합니다.
      </div>
    </section>
  </main>

  <!-- 공지사항 편집 모달 -->
  <div id="hubNoticeModal" class="fixed inset-0 bg-black/50 z-[56] hidden items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="hubNoticeModalTitle">
    <div class="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
      <div class="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
        <h3 id="hubNoticeModalTitle" class="text-lg font-bold text-slate-800">공지 작성</h3>
        <button type="button" class="text-slate-500 hover:text-slate-800 text-2xl leading-none" id="hubNoticeModalClose" aria-label="닫기">&times;</button>
      </div>
      <form id="hubNoticeForm" class="p-4 space-y-4">
        <input type="hidden" id="hubNoticeId" value="">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">제목 <span class="text-rose-500">*</span></label>
          <input type="text" id="hubNoticeTitle" required class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="공지 제목" autocomplete="off">
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">내용 (HTML)</label>
          <div class="flex flex-wrap gap-1.5 mb-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
            <button type="button" class="hub-notice-tool px-2.5 py-1 text-xs font-medium border border-slate-200 rounded-md bg-white hover:bg-slate-100" data-hub-notice-tool="bold">굵게</button>
            <button type="button" class="hub-notice-tool px-2.5 py-1 text-xs font-medium border border-slate-200 rounded-md bg-white hover:bg-slate-100" data-hub-notice-tool="italic">기울임</button>
            <button type="button" class="hub-notice-tool px-2.5 py-1 text-xs font-medium border border-slate-200 rounded-md bg-white hover:bg-slate-100" data-hub-notice-tool="link">링크</button>
            <button type="button" class="hub-notice-tool px-2.5 py-1 text-xs font-medium border border-slate-200 rounded-md bg-white hover:bg-slate-100" data-hub-notice-tool="br">줄바꿈</button>
            <label class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-indigo-200 rounded-md bg-indigo-50 text-indigo-800 cursor-pointer hover:bg-indigo-100">
              <i class="fas fa-image" aria-hidden="true"></i> 이미지 업로드
              <input type="file" id="hubNoticeImageFile" accept="image/jpeg,image/png,image/gif,image/webp" class="hidden">
            </label>
          </div>
          <textarea id="hubNoticeContent" rows="14" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono leading-relaxed" placeholder="본문 (HTML 태그 사용 가능). 툴바로 삽입하거나 직접 편집하세요."></textarea>
          <p class="text-[11px] text-slate-500 mt-1">&lt;script&gt; 태그는 저장 시 제거됩니다. 이미지는 업로드 후 URL이 본문에 삽입됩니다.</p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex items-center gap-3">
            <input type="checkbox" id="hubNoticePinned" class="rounded border-slate-300 text-amber-600">
            <label for="hubNoticePinned" class="text-sm font-medium text-slate-800">상단 고정 (필독)</label>
          </div>
          <div class="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span class="text-sm font-medium text-slate-800">게시 여부</span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="hubNoticePublished" class="sr-only peer" checked>
              <span class="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></span>
            </label>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">대상</label>
          <select id="hubNoticeTargetOrg" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">전체 회원</option>
          </select>
          <p class="text-[11px] text-slate-500 mt-1">기관을 선택하면 해당 <code class="text-slate-600">org_id</code> 소속 회원 전용 공지로 저장됩니다.</p>
        </div>
        <div class="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          <button type="submit" id="hubNoticeSave" class="flex-1 min-w-[8rem] bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700">저장</button>
          <button type="button" id="hubNoticeCancel" class="px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">취소</button>
        </div>
      </form>
    </div>
  </div>

  <!-- 커뮤니티 게시글 편집 모달 -->
  <div id="hubPostModal" class="fixed inset-0 bg-black/50 z-[56] hidden items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="hubPostModalTitle">
    <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
      <div class="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
        <h3 id="hubPostModalTitle" class="text-lg font-bold text-slate-800">게시글 편집</h3>
        <button type="button" class="text-slate-500 hover:text-slate-800 text-2xl leading-none" id="hubPostModalClose" aria-label="닫기">&times;</button>
      </div>
      <form id="hubPostForm" class="p-4 space-y-4">
        <input type="hidden" id="hubPostId" value="">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">제목 <span class="text-rose-500">*</span></label>
          <input type="text" id="hubPostTitle" required class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="제목" autocomplete="off">
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">작성자 표시명</label>
            <input type="text" id="hubPostAuthor" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="표시 이름" autocomplete="off">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">분류</label>
            <select id="hubPostCategory" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="qna">Q&amp;A</option>
              <option value="review">후기</option>
              <option value="general">일반</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">본문 (HTML 가능)</label>
          <textarea id="hubPostContent" rows="12" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono leading-relaxed" placeholder="내용"></textarea>
          <p class="text-[11px] text-slate-500 mt-1">&lt;script&gt; 태그는 저장 시 제거됩니다.</p>
        </div>
        <div class="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <input type="checkbox" id="hubPostPublished" class="rounded border-slate-300 text-indigo-600" checked>
          <label for="hubPostPublished" class="text-sm font-medium text-slate-800">사이트에 게시 (해제 시 숨김)</label>
        </div>
        <div class="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          <button type="submit" id="hubPostSave" class="flex-1 min-w-[8rem] bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700">저장</button>
          <button type="button" id="hubPostCancel" class="px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">취소</button>
        </div>
      </form>
    </div>
  </div>

  <!-- 팝업 편집 모달 -->
  <div id="hubPopupModal" class="fixed inset-0 bg-black/50 z-[55] hidden items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="hubPopupModalTitle">
    <div class="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
      <div class="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
        <h3 id="hubPopupModalTitle" class="text-lg font-bold text-slate-800">팝업 등록</h3>
        <button type="button" class="text-slate-500 hover:text-slate-800 text-2xl leading-none" id="hubPopupModalClose" aria-label="닫기">&times;</button>
      </div>
      <form id="hubPopupForm" class="p-4 space-y-4">
        <input type="hidden" id="hubPopupId" value="">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">제목 <span class="text-rose-500">*</span></label>
          <input type="text" id="hubPopupTitle" required class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="관리용 팝업 명칭" autocomplete="off">
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">이미지</label>
          <div class="flex flex-col sm:flex-row gap-2 items-start">
            <input type="file" id="hubPopupImageFile" accept="image/jpeg,image/png,image/gif,image/webp" class="text-sm w-full max-w-xs">
            <input type="url" id="hubPopupImageUrl" class="flex-1 min-w-0 border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="https://… 또는 업로드 후 자동 입력">
          </div>
          <div class="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 min-h-[120px] flex items-center justify-center overflow-hidden">
            <img id="hubPopupImagePreview" src="" alt="" class="max-h-40 max-w-full object-contain hidden">
            <span id="hubPopupImagePreviewPlaceholder" class="text-xs text-slate-400">미리보기</span>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">랜딩 링크</label>
          <input type="url" id="hubPopupLinkUrl" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="https://…">
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">대상 설정</label>
          <select id="hubPopupTargetAudience" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="all">전체</option>
            <option value="b2b">특정 B2B 단체</option>
          </select>
          <select id="hubPopupOrgId" class="mt-2 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-500" disabled>
            <option value="">기관 선택</option>
          </select>
          <p class="text-[11px] text-slate-500 mt-1">B2B 선택 시 기관을 고르면 해당 <code class="text-slate-600">org_id</code> 회원에게만 노출됩니다. 미선택 시 &quot;소속 있는 B2B 전체&quot;에 노출됩니다.</p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">시작 <span class="text-rose-500">*</span></label>
            <input type="datetime-local" id="hubPopupStart" required class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">종료 <span class="text-rose-500">*</span></label>
            <input type="datetime-local" id="hubPopupEnd" required class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
          </div>
        </div>
        <div class="flex items-center gap-3">
          <input type="checkbox" id="hubPopupActive" class="rounded border-slate-300 text-indigo-600" checked>
          <label for="hubPopupActive" class="text-sm font-medium text-slate-800">활성화 (즉시 노출 조건에 포함)</label>
        </div>
        <div class="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          <button type="submit" id="hubPopupSave" class="flex-1 min-w-[8rem] bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700">저장</button>
          <button type="button" id="hubPopupCancel" class="px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">취소</button>
        </div>
      </form>
    </div>
  </div>

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
    <div class="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl">
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

  <!-- 대시보드 데모 상세 (테이블 / 유형별 섹션 모달) -->
  <div id="hubDashboardDetailModal" class="fixed inset-0 z-[62] hidden items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="hubDashboardDetailTitle" onclick="if (event.target === this) closeHubDashboardDetailModal()">
    <div class="hub-dashboard-detail-panel bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200/90 overflow-hidden ring-1 ring-emerald-500/15" onclick="event.stopPropagation()">
      <div class="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-violet-600 shrink-0" aria-hidden="true"></div>
      <div class="p-4 border-b border-slate-200 flex flex-wrap items-start justify-between gap-3 shrink-0 bg-gradient-to-br from-white to-emerald-50/40">
        <div class="min-w-0 pr-2">
          <h3 id="hubDashboardDetailTitle" class="text-lg font-bold text-slate-900">상세</h3>
          <p id="hubDashboardDetailSubtitle" class="text-xs text-slate-500 mt-1">데모 데이터입니다. 실제 API 연동 시 교체됩니다.</p>
        </div>
        <button type="button" class="hub-dashboard-detail-close text-slate-400 hover:text-violet-700 hover:bg-violet-50 rounded-lg text-2xl leading-none w-10 h-10 flex items-center justify-center transition shrink-0 ml-auto" onclick="closeHubDashboardDetailModal()" aria-label="닫기">&times;</button>
      </div>
      <div class="flex-1 overflow-auto p-4 space-y-4">
        <div id="hubDashboardDetailTableWrap" class="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
          <table class="w-full text-sm text-left">
            <thead id="hubDashboardDetailThead" class="bg-slate-50 text-slate-600 border-b border-slate-200"></thead>
            <tbody id="hubDashboardDetailTbody" class="divide-y divide-slate-100"></tbody>
          </table>
        </div>
        <div id="hubDashboardDetailSectionsWrap" class="hidden space-y-6"></div>
      </div>
      <div class="p-4 border-t border-slate-200 bg-gradient-to-r from-slate-50/90 to-violet-50/30 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" class="button-excel inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 shadow-sm transition" onclick="hubDashboardDownloadDetailCsv()">📥 엑셀 다운로드 (CSV)</button>
          <button type="button" class="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 hover:border-indigo-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 shadow-sm transition" onclick="hubDashboardPrintDetailModal()" title="목록을 새 창에서 인쇄합니다">🖨 인쇄</button>
        </div>
        <button type="button" onclick="closeHubDashboardDetailModal()" class="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-emerald-300/80 transition">닫기</button>
      </div>
    </div>
  </div>

${adminHubMemberDetailPanelHtml()}
${adminHubEntityDetailPanelHtml()}
  ${siteAiChatWidgetMarkup()}
  <script>${siteAiChatWidgetScript()}</script>

  <script>window.__ADMIN_DASHBOARD_MOCK__ = ${dashboardMockInlineJson}; try { window.ADMIN_DASHBOARD_MOCK = window.__ADMIN_DASHBOARD_MOCK__ } catch (e) {}</script>
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script src="/static/js/auth.js?v=20260329-admin-name"></script>
  <script src="/static/js/utils.js"></script>
  <script src="/static/js/admin-status-labels.js?v=20260330-status-ko"></script>
  <script src="/static/js/admin-hub-member-panel.js?v=20260330-members-page"></script>
  <script src="/static/js/admin-hub-entity-panel.js?v=20260330-hub-pillars"></script>
  <script src="/static/js/admin-hub.js?v=20260331-posts"></script>
  <script src="/static/js/admin-isbn.js"></script>
  <script src="/static/js/security.js${STATIC_JS_CACHE_QUERY}"></script>
</body>
</html>`
}
