/**
 * SSR 공통 헤더 — 2단 데스크톱(유틸 + GNB) / 모바일 햄버거 + 우측 글래스 드로어
 *
 * export:
 * - siteHeaderNavCoursesGlassStyles()
 * - siteHeaderFullMarkup(options)
 * - siteHeaderDrawerControlScript(variant) — 드로어 + (hover:none 시) 데스크톱 과정 안내 클릭 토글
 * - (하위 호환) siteNavMobileToggleScript — 사용 중인 곳 없으면 제거 가능
 */

export type SiteHeaderVariant = 'landing' | 'pages' | 'brand'

export interface SiteHeaderOptions {
  variant: SiteHeaderVariant
  /** 랜딩 전용: 수강신청 GNB 노출 */
  showEnrollment?: boolean
  /** SSR: 관리자 + 미처리 support_inquiries 가 있으면 커맨드 센터에 초록 펄스 점 */
  adminCommandPulse?: boolean
}

function id(variant: SiteHeaderVariant, suffix: string): string {
  return `siteHeader-${variant}-${suffix}`
}

/** 관리자 퀵 수정 연필 (숫자·알파벳 ID 경로용; href는 호출부에서 검증) */
export function adminMagicPencilHtml(href: string, ariaLabel: string): string {
  const h = href.replace(/"/g, '&quot;')
  const a = ariaLabel.replace(/"/g, '&quot;')
  return `<a href="${h}" class="admin-magic-pencil" title="관리자 수정" aria-label="${a}"><i class="fas fa-pencil-alt" aria-hidden="true"></i></a>`
}

/** 페이지 <head>에 한 번 */
export function siteHeaderNavCoursesGlassStyles(): string {
  return `<style id="site-header-nav-courses-glass">
@keyframes steelTremor {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(0.6px, -0.5px); }
  50% { transform: translate(-0.5px, 0.65px); }
  75% { transform: translate(0.55px, 0.45px); }
}
.site-nav-dd-root:hover .site-nav-dd-tremor,
.site-nav-dd-root:focus-within .site-nav-dd-tremor {
  animation: steelTremor 0.1s linear 0s 12 forwards;
  animation-fill-mode: forwards;
}
/* 커맨드 센터: 새 상담·문의 알림 (초록 펄스) */
@keyframes siteCmdCenterPulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.55);
  }
  50% {
    opacity: 0.72;
    transform: scale(1.2);
    box-shadow: 0 0 0 5px rgba(34, 197, 94, 0);
  }
}
.site-cmd-center-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.site-cmd-center-pulse-dot {
  position: absolute;
  top: -3px;
  right: -4px;
  width: 7px;
  height: 7px;
  border-radius: 9999px;
  background: rgb(34 197 94);
  animation: siteCmdCenterPulse 1.75s ease-in-out infinite;
  pointer-events: none;
}
.site-header-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
/* 매직 펜슬 (관리자 퀵 수정 링크) */
@keyframes adminMagicPencilTremor {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(0.45px, -0.38px); }
  50% { transform: translate(-0.4px, 0.48px); }
  75% { transform: translate(0.42px, 0.3px); }
}
a.admin-magic-pencil {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 0.3rem;
  color: rgb(148 163 184);
  font-size: 0.68rem;
  line-height: 1;
  flex-shrink: 0;
  text-decoration: none;
  opacity: 0.72;
  vertical-align: middle;
}
a.admin-magic-pencil:hover,
a.admin-magic-pencil:focus-visible {
  color: rgb(37 99 235);
  opacity: 1;
  animation: adminMagicPencilTremor 0.1s linear 0s 12 forwards;
  animation-fill-mode: forwards;
}
.site-nav-titanium-outer {
  border-radius: 14px;
  padding: 1.5px;
  background: linear-gradient(145deg,
    rgba(148, 163, 184, 0.95) 0%,
    rgba(226, 232, 240, 0.92) 32%,
    rgba(100, 116, 139, 0.88) 64%,
    rgba(203, 213, 225, 0.96) 100%);
  box-shadow: 0 10px 40px rgba(15, 23, 42, 0.14);
}
.site-nav-titanium-inner {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  overflow: hidden;
}
/* —— 데스크톱 과정 안내 드롭다운 (opacity/visibility, 호버 경로 브릿지) —— */
.site-nav-dd-root {
  position: relative;
}
/* 버튼 아래~패널 사이 빈틈: 호버 시에만 포인터 수신 (닫힌 상태에선 통과) */
.site-nav-dd-root::after {
  content: '';
  position: absolute;
  left: 0;
  width: 100%;
  min-width: 16.5rem;
  top: 100%;
  height: 0.625rem;
  z-index: 59;
  pointer-events: none;
}
.site-nav-dd-root:hover::after,
.site-nav-dd-root:focus-within::after,
.site-nav-dd-root.is-open::after {
  pointer-events: auto;
}
.site-nav-dd-panel {
  min-width: 16.5rem;
  position: absolute;
  left: 0;
  top: calc(100% + 0.625rem);
  z-index: 60;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateY(10px);
  transition:
    opacity 0.2s ease,
    visibility 0.2s ease,
    transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}
.site-nav-dd-chevron {
  transition: transform 0.2s ease;
}
/* PC + 정밀 포인터(마우스): 호버·포커스로 표시 */
@media (min-width: 768px) and (hover: hover) {
  .site-nav-dd-root:hover .site-nav-dd-panel,
  .site-nav-dd-root:focus-within .site-nav-dd-panel {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: translateY(0);
  }
  .site-nav-dd-root:hover .site-nav-dd-chevron,
  .site-nav-dd-root:focus-within .site-nav-dd-chevron {
    transform: rotate(180deg);
  }
}
/* 넓은 화면이지만 터치 위주: 클릭 토글(.is-open) + 포커스 진입 */
@media (min-width: 768px) and (hover: none) {
  .site-nav-dd-root.is-open .site-nav-dd-panel,
  .site-nav-dd-root:focus-within .site-nav-dd-panel {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: translateY(0);
  }
  .site-nav-dd-root.is-open .site-nav-dd-chevron {
    transform: rotate(180deg);
  }
}
.site-nav-dd-link {
  display: block;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.28);
  transition: background-color 0.15s ease, color 0.15s ease;
}
.site-nav-dd-link:last-of-type { border-bottom: none; }
.site-nav-dd-link:hover { background: rgba(255, 255, 255, 0.55); }
.site-nav-dd-desc {
  display: block;
  font-size: 0.7rem;
  font-weight: 500;
  color: rgba(71, 85, 105, 0.88);
  margin-top: 0.2rem;
  line-height: 1.35;
}
.site-nav-dd-link--row {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}
.site-nav-dd-ico {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}
.site-nav-dd-ico--classic {
  background: rgba(16, 185, 129, 0.12);
  color: rgb(5 150 105);
}
.site-nav-dd-ico--next {
  background: rgba(37, 99, 235, 0.12);
  color: rgb(37 99 235);
}
.site-nav-dd-ico--consortium {
  background: rgba(79, 70, 229, 0.12);
  color: rgb(67 56 202);
}
.site-nav-dd-link-body { min-width: 0; flex: 1; }
/* 과정 안내: Classic · Next · 공동훈련 안내 — 1줄 3카드 (넓은 화면) */
@media (min-width: 900px) {
  .site-nav-dd-panel--cards {
    min-width: 44rem;
  }
  .site-nav-dd-panel--cards .site-nav-titanium-inner {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.35rem;
    min-width: 42rem;
    padding: 0.5rem;
  }
  .site-nav-dd-panel--cards .site-nav-dd-link--row {
    flex-direction: column;
    align-items: center;
    text-align: center;
    border-bottom: none;
    border-right: 1px solid rgba(148, 163, 184, 0.28);
    border-radius: 0.5rem;
    padding: 1rem 0.65rem;
    min-height: 7.25rem;
    justify-content: flex-start;
    transition: background-color 0.2s ease, transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.22s ease;
  }
  .site-nav-dd-panel--cards .site-nav-dd-link--row:nth-of-type(3) {
    border-right: none;
  }
  @media (hover: hover) {
    .site-nav-dd-panel--cards .site-nav-dd-link--row:hover {
      background: rgba(255, 255, 255, 0.72);
      transform: translateY(-3px);
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.07);
    }
  }
  .site-nav-dd-panel--cards .site-nav-dd-link--summary {
    grid-column: 1 / -1;
    border-top: 1px solid rgba(148, 163, 184, 0.32);
    margin-top: 0.15rem;
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
    border-bottom: none;
    border-right: none;
  }
}
.site-nav-m-acc[open] .site-nav-m-acc-icon { transform: rotate(180deg); }
.site-nav-m-acc-titanium .site-nav-titanium-outer { margin-top: 0.25rem; }
.site-nav-m-acc-titanium .site-nav-dd-link:last-child { border-bottom: none; }

/* —— 2단 데스크톱 유틸 —— */
.site-header-util-bar {
  border-bottom: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(248, 250, 252, 0.82);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

/* —— 모바일 드로어 —— */
.site-header-backdrop {
  transition: opacity 0.28s ease, visibility 0.28s ease;
  visibility: hidden;
}
.site-header-backdrop.is-visible {
  opacity: 1 !important;
  visibility: visible !important;
  pointer-events: auto !important;
}
.site-header-drawer {
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
  box-shadow: -12px 0 48px rgba(15, 23, 42, 0.18);
}
.site-header-drawer.is-open {
  transform: translateX(0) !important;
}
.site-nav-m-drawer-acc summary {
  list-style: none;
}
.site-nav-m-drawer-acc summary::-webkit-details-marker { display: none; }
.site-nav-m-drawer-acc[open] .site-nav-m-drawer-acc-icon {
  transform: rotate(180deg);
}
</style>`
}

function navCoursesDropdownDesktop(): string {
  return `<div class="site-nav-dd-root">
  <button type="button" class="site-nav-dd-trigger flex items-center gap-1.5 text-gray-700 hover:text-indigo-600 transition-colors duration-200 font-medium rounded-lg px-1 py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40" aria-haspopup="true" aria-expanded="false" aria-controls="site-nav-dd-panel">
    과정 안내
    <i class="site-nav-dd-chevron fas fa-chevron-down text-[0.65rem] opacity-55" aria-hidden="true"></i>
  </button>
  <div id="site-nav-dd-panel" role="menu" aria-label="과정 안내 하위 메뉴" class="site-nav-dd-panel site-nav-dd-panel--cards">
    <div class="site-nav-titanium-outer site-nav-dd-tremor">
      <div class="site-nav-titanium-inner py-1">
        <a href="/courses/classic" role="menuitem" class="site-nav-dd-link site-nav-dd-link--row text-mst-navy font-semibold">
          <span class="site-nav-dd-ico site-nav-dd-ico--classic" aria-hidden="true"><i class="fas fa-book-open"></i></span>
          <span class="site-nav-dd-link-body">
            <span class="block">Classic</span>
            <span class="site-nav-dd-desc">마인드스토리 전통 입문 과정</span>
          </span>
        </a>
        <a href="/courses/next" role="menuitem" class="site-nav-dd-link site-nav-dd-link--row text-next-accent font-semibold">
          <span class="site-nav-dd-ico site-nav-dd-ico--next" aria-hidden="true"><i class="fas fa-rocket"></i></span>
          <span class="site-nav-dd-link-body">
            <span class="block">Next</span>
            <span class="site-nav-dd-desc">심화 마스터 과정</span>
          </span>
        </a>
        <a href="/courses/ncs" role="menuitem" class="site-nav-dd-link site-nav-dd-link--row text-amber-800 font-semibold">
          <span class="site-nav-dd-ico bg-amber-100 text-amber-800 rounded-lg w-9 h-9 flex items-center justify-center" aria-hidden="true"><i class="fas fa-certificate"></i></span>
          <span class="site-nav-dd-link-body">
            <span class="block">NCS</span>
            <span class="site-nav-dd-desc">국가직무능력표준 연계</span>
          </span>
        </a>
        <a href="/courses/consortium" role="menuitem" class="site-nav-dd-link site-nav-dd-link--row text-indigo-700 font-semibold" aria-label="공동훈련 안내 페이지로 이동">
          <span class="site-nav-dd-ico site-nav-dd-ico--consortium" aria-hidden="true"><i class="fas fa-users"></i></span>
          <span class="site-nav-dd-link-body">
            <span class="block">공동훈련 안내</span>
            <span class="site-nav-dd-desc">기업 및 기관 맞춤형 협력 과정</span>
          </span>
        </a>
        <a href="/legacy/mindstory-landing#signature-lineup" role="menuitem" class="site-nav-dd-link site-nav-dd-link--summary border-t border-slate-200/50 text-sm text-gray-700 font-medium">
          전체 과정 보기<span class="site-nav-dd-desc">시그니처 라인업·추천 과정 섹션으로 이동</span>
        </a>
      </div>
    </div>
  </div>
</div>`
}

/** 드로어 내부: 과정 안내 아코디언 */
function navDrawerCoursesAccordion(): string {
  return `<details class="site-nav-m-drawer-acc rounded-xl border border-slate-200/45 bg-white/35 backdrop-blur-md overflow-hidden">
  <summary class="px-4 py-3.5 cursor-pointer font-medium text-gray-900 flex items-center justify-between select-none">
    <span>과정 안내</span>
    <i class="fas fa-chevron-down text-xs text-slate-400 transition-transform duration-200 site-nav-m-drawer-acc-icon" aria-hidden="true"></i>
  </summary>
  <div class="px-2 pb-3 border-t border-slate-200/40">
    <div class="site-nav-titanium-outer mt-2">
      <div class="site-nav-titanium-inner flex flex-col py-1">
        <a href="/courses/classic" class="site-nav-dd-link site-nav-dd-link--row text-mst-navy font-semibold">
          <span class="site-nav-dd-ico site-nav-dd-ico--classic" aria-hidden="true"><i class="fas fa-book-open"></i></span>
          <span class="site-nav-dd-link-body"><span class="block">Classic</span><span class="site-nav-dd-desc">마인드스토리 전통 입문 과정</span></span>
        </a>
        <a href="/courses/next" class="site-nav-dd-link site-nav-dd-link--row text-next-accent font-semibold">
          <span class="site-nav-dd-ico site-nav-dd-ico--next" aria-hidden="true"><i class="fas fa-rocket"></i></span>
          <span class="site-nav-dd-link-body"><span class="block">Next</span><span class="site-nav-dd-desc">심화 마스터 과정</span></span>
        </a>
        <a href="/courses/ncs" class="site-nav-dd-link site-nav-dd-link--row text-amber-800 font-semibold">
          <span class="site-nav-dd-ico bg-amber-100 text-amber-800 rounded-lg w-9 h-9 flex items-center justify-center shrink-0" aria-hidden="true"><i class="fas fa-certificate"></i></span>
          <span class="site-nav-dd-link-body"><span class="block">NCS</span><span class="site-nav-dd-desc">국가직무능력표준 연계</span></span>
        </a>
        <a href="/courses/consortium" class="site-nav-dd-link site-nav-dd-link--row text-indigo-700 font-semibold" aria-label="공동훈련 안내 페이지로 이동">
          <span class="site-nav-dd-ico site-nav-dd-ico--consortium" aria-hidden="true"><i class="fas fa-users"></i></span>
          <span class="site-nav-dd-link-body">
            <span class="block">공동훈련 안내</span>
            <span class="site-nav-dd-desc">기업 및 기관 맞춤형 협력 과정</span>
          </span>
        </a>
        <a href="/legacy/mindstory-landing#signature-lineup" class="site-nav-dd-link text-sm text-gray-700 font-medium">전체 과정 보기<span class="site-nav-dd-desc">시그니처 라인업으로 이동</span></a>
      </div>
    </div>
  </div>
</details>`
}

function logoBlock(opts: SiteHeaderOptions): string {
  if (opts.variant === 'landing') {
    return `<a href="/legacy/mindstory-landing" class="text-xl sm:text-2xl md:text-3xl font-bold truncate min-w-0" style="color: var(--color-primary);">마인드스토리 원격평생교육원</a>`
  }
  if (opts.variant === 'brand') {
    return `<a href="/legacy/mindstory-landing" class="text-lg font-bold text-slate-800 truncate">마인드스토리</a>`
  }
  return `<a href="/legacy/mindstory-landing" class="text-lg sm:text-xl md:text-2xl font-bold text-indigo-600 whitespace-nowrap truncate min-w-0">마인드스토리 원격 평생교육원</a>`
}

function enrollmentLink(className: string): string {
  return `<a href="/enrollment" class="${className}">
    <i class="fas fa-graduation-cap mr-1.5"></i>수강신청
  </a>`
}

/**
 * 전체 <header> 마크업 (sticky, z-50)
 */
export function siteHeaderFullMarkup(opts: SiteHeaderOptions): string {
  const v = opts.variant
  const showEnroll = opts.showEnrollment === true
  const cmdPulse = opts.adminCommandPulse === true
  const cmdPulseDot = cmdPulse
    ? '<span class="site-cmd-center-pulse-dot" aria-hidden="true"></span><span class="site-header-sr-only">새 문의 또는 상담 요청이 있습니다</span>'
    : ''
  const bid = (s: string) => id(v, s)

  const coursesAllLink =
    opts.variant === 'brand'
      ? `<a href="/courses" class="text-slate-600 hover:text-indigo-600 transition-colors duration-200 font-medium text-sm">전체</a>`
      : ''

  const communityGnbDesktop =
    opts.variant === 'brand'
      ? `<a href="/community" class="text-slate-600 hover:text-indigo-600 text-sm font-medium">공지 · FAQ</a>`
      : `<a href="/community" class="text-gray-700 hover:text-indigo-600 transition-colors duration-200 font-medium">공지 · FAQ</a>`

  const desktopGnbExtras =
    (showEnroll
      ? enrollmentLink(
          'text-indigo-600 hover:text-indigo-700 transition-colors duration-200 font-bold',
        )
      : '') +
    coursesAllLink +
    `<a href="/my-courses" class="${opts.variant === 'brand' ? 'text-slate-600 hover:text-indigo-600 text-sm font-medium' : 'text-gray-700 hover:text-indigo-600 transition-colors duration-200 font-medium'}">내 강의실</a>` +
    communityGnbDesktop

  const drawerEnrollment = showEnroll
    ? `<a href="/enrollment" class="px-4 py-3 rounded-xl text-indigo-600 font-bold hover:bg-indigo-50/70 border border-indigo-100/50 transition-all"><i class="fas fa-graduation-cap mr-2"></i>수강신청</a>`
    : ''

  const drawerCoursesAll =
    opts.variant === 'brand'
      ? `<a href="/courses" class="px-4 py-3 rounded-xl text-slate-800 font-medium hover:bg-white/50 border border-transparent hover:border-slate-200/50 transition-all">전체</a>`
      : ''

  const drawerBody =
    `<a href="/legacy/mindstory-landing" class="px-4 py-3 rounded-xl text-gray-900 font-medium hover:bg-white/50 border border-transparent hover:border-slate-200/50 transition-all">홈</a>` +
    navDrawerCoursesAccordion() +
    drawerEnrollment +
    drawerCoursesAll +
    `<a href="/my-courses" class="px-4 py-3 rounded-xl text-gray-800 font-medium hover:bg-white/50 border border-transparent hover:border-slate-200/50 transition-all">내 강의실</a>
    <a href="/community" class="px-4 py-3 rounded-xl text-gray-800 font-medium hover:bg-white/50 border border-transparent hover:border-slate-200/50 transition-all"><i class="fas fa-bullhorn mr-2 text-indigo-500" aria-hidden="true"></i>공지 · FAQ</a>
    <div class="my-4 border-t border-slate-200/50"></div>
    <div id="mHeaderAuthButtons" class="flex flex-col gap-2 px-1">
      <a href="/login" class="px-4 py-3 rounded-xl text-center text-gray-700 font-medium border border-slate-200/60 hover:bg-white/60">로그인</a>
      <a href="/register" class="px-4 py-3 rounded-xl text-center bg-indigo-600 text-white font-semibold hover:bg-indigo-700">회원가입</a>
    </div>
    <div id="mHeaderUserMenu" class="flex flex-col gap-3 px-2 pt-2" style="display:none">
      <p class="text-sm text-slate-600 inline-flex items-center flex-wrap gap-1"><span class="font-semibold text-slate-900" id="mHeaderUserName"></span></p>
      <div id="mAdminModeSwitch" class="flex flex-col gap-2" style="display:none">
        <button type="button" id="mHeaderViewToggleBtn" class="hidden w-full text-xs font-medium px-3 py-2 rounded-md transition-colors justify-center items-center" aria-label="관리자 뷰 전환"></button>
        <a id="mHeaderCommandCenterLink" href="/admin/dashboard" class="site-cmd-center-wrap flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 transition-colors">
          ${cmdPulseDot}
          <i class="fas fa-terminal text-xs opacity-80"></i> 커맨드 센터
        </a>
      </div>
      <button type="button" onclick="handleLogout()" class="w-full px-4 py-3 rounded-xl text-left text-gray-700 font-medium border border-slate-200/60 hover:bg-white/60">로그아웃</button>
    </div>`

  return `<header class="sticky top-0 z-50 shadow-sm shadow-slate-900/5" data-ms-header="two-tier" data-ms-header-rev="20260329-dd-hover">
  <!-- 데스크톱 1단: 유틸 -->
  <div class="site-header-util-bar hidden md:block">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-end items-center gap-4 py-2 text-sm">
      <div id="headerAuthButtons" class="flex items-center gap-3">
        <a href="/login" class="text-slate-600 hover:text-indigo-600 font-medium">로그인</a>
        <a href="/register" class="inline-flex items-center rounded-lg bg-indigo-600 text-white px-3 py-1.5 text-sm font-semibold hover:bg-indigo-700">회원가입</a>
      </div>
      <div id="headerUserMenu" class="items-center gap-4 flex-wrap justify-end" style="display:none">
        <span class="text-slate-700 inline-flex items-center"><span id="headerUserName" class="font-semibold text-slate-900" data-ms-name-default="font-semibold text-slate-900"></span></span>
        <div id="adminModeSwitch" class="items-center gap-2 flex-wrap" style="display:none">
          <button type="button" id="headerViewToggleBtn" class="hidden text-xs font-medium px-2 py-1 rounded-md transition-colors whitespace-nowrap" aria-label="관리자 뷰 전환"></button>
          <a id="headerCommandCenterLink" href="/admin/dashboard" class="site-cmd-center-wrap inline-flex items-center gap-1.5 rounded-lg border border-slate-300/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-white hover:border-indigo-300 transition-colors">
            ${cmdPulseDot}
            <i class="fas fa-terminal text-[10px] opacity-70"></i> 커맨드 센터
          </a>
        </div>
        <button type="button" onclick="handleLogout()" class="text-slate-600 hover:text-indigo-600 font-medium">로그아웃</button>
      </div>
    </div>
  </div>

  <!-- 데스크톱 2단: GNB -->
  <div class="hidden md:block bg-white/85 backdrop-blur-md border-b border-slate-200/40">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center py-3.5 gap-4">
      ${logoBlock(opts)}
      <nav class="flex items-center gap-6 lg:gap-8 text-base flex-wrap justify-end" aria-label="주 메뉴">
        <a href="/legacy/mindstory-landing" class="text-gray-700 hover:text-indigo-600 font-medium transition-colors">홈</a>
        ${navCoursesDropdownDesktop()}
        ${desktopGnbExtras}
      </nav>
    </div>
  </div>

  <!-- 모바일: 한 줄 + 햄버거 -->
  <div class="md:hidden flex items-center justify-between gap-3 px-4 py-3 bg-white/90 backdrop-blur-md border-b border-slate-200/45">
    <div class="flex items-center gap-2 min-w-0 flex-1">
      <button type="button" id="${bid('open')}" class="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-xl border border-slate-200/80 bg-white/80 text-slate-700 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40" aria-label="메뉴 열기" aria-expanded="false" aria-controls="${bid('drawer')}">
        <i class="fas fa-bars text-lg" aria-hidden="true"></i>
      </button>
      <div class="min-w-0">${logoBlock(opts)}</div>
    </div>
  </div>

  <!-- 모바일: 백드롭 -->
  <div id="${bid('backdrop')}" class="site-header-backdrop fixed inset-0 z-[100] md:hidden opacity-0 invisible pointer-events-none bg-slate-900/45 backdrop-blur-sm" aria-hidden="true"></div>

  <!-- 모바일: 우측 글래스 드로어 -->
  <div id="${bid('drawer')}" class="site-header-drawer site-header-drawer-panel fixed top-0 right-0 z-[101] h-full w-[min(100%,22rem)] max-w-full translate-x-full md:hidden border-l border-slate-200/50 bg-white/72 backdrop-blur-xl shadow-2xl flex flex-col" role="dialog" aria-modal="true" aria-label="전체 메뉴" hidden>
    <div class="flex items-center justify-between px-4 py-3 border-b border-slate-200/40 bg-white/40">
      <span class="text-sm font-bold text-slate-800">메뉴</span>
      <button type="button" id="${bid('close')}" class="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200/70 text-slate-600 hover:bg-white/80" aria-label="메뉴 닫기">
        <i class="fas fa-times text-lg"></i>
      </button>
    </div>
    <nav class="flex-1 overflow-y-auto overscroll-contain py-4 px-2 flex flex-col gap-1" aria-label="모바일 메뉴">
      ${drawerBody}
    </nav>
  </div>
</header>`
}

/** 드로어 열기/닫기, 스크롤 잠금, 백드롭 클릭, 링크 클릭 시 닫기 */
export function siteHeaderDrawerControlScript(variant: SiteHeaderVariant): string {
  const bid = (s: string) => `siteHeader-${variant}-${s}`
  return `(function(){
    var openBtn=document.getElementById('${bid('open')}');
    var closeBtn=document.getElementById('${bid('close')}');
    var backdrop=document.getElementById('${bid('backdrop')}');
    var drawer=document.getElementById('${bid('drawer')}');
    if(!openBtn||!backdrop||!drawer)return;
    function openD(){
      drawer.removeAttribute('hidden');
      backdrop.classList.add('is-visible');
      requestAnimationFrame(function(){
        drawer.classList.add('is-open');
      });
      document.body.style.overflow='hidden';
      openBtn.setAttribute('aria-expanded','true');
    }
    function closeD(){
      drawer.classList.remove('is-open');
      backdrop.classList.remove('is-visible');
      document.body.style.overflow='';
      openBtn.setAttribute('aria-expanded','false');
      setTimeout(function(){
        if(!drawer.classList.contains('is-open')) drawer.setAttribute('hidden','');
      },320);
    }
    openBtn.addEventListener('click',function(e){ e.preventDefault(); if(drawer.classList.contains('is-open')) closeD(); else openD(); });
    if(closeBtn) closeBtn.addEventListener('click',function(e){ e.preventDefault(); closeD(); });
    backdrop.addEventListener('click',function(){ closeD(); });
    drawer.querySelectorAll('a[href]').forEach(function(a){
      a.addEventListener('click',function(){ closeD(); });
    });
  })();
  (function(){
    function setupDesktopCoursesDd(){
      if(!window.matchMedia('(min-width: 768px)').matches) return;
      if(!window.matchMedia('(hover: none)').matches) return;
      var root=document.querySelector('.site-nav-dd-root');
      if(!root) return;
      var btn=root.querySelector('.site-nav-dd-trigger');
      var panel=document.getElementById('site-nav-dd-panel');
      if(!btn||!panel) return;
      btn.addEventListener('click',function(e){
        e.preventDefault();
        var o=root.classList.toggle('is-open');
        btn.setAttribute('aria-expanded',o?'true':'false');
      });
      document.addEventListener('click',function(ev){
        if(!root.contains(ev.target)){
          root.classList.remove('is-open');
          btn.setAttribute('aria-expanded','false');
        }
      },true);
      panel.querySelectorAll('a[href]').forEach(function(a){
        a.addEventListener('click',function(){
          root.classList.remove('is-open');
          btn.setAttribute('aria-expanded','false');
        });
      });
      document.addEventListener('keydown',function(ev){
        if(ev.key==='Escape'){
          root.classList.remove('is-open');
          btn.setAttribute('aria-expanded','false');
        }
      });
    }
    if(document.readyState==='loading')
      document.addEventListener('DOMContentLoaded',setupDesktopCoursesDd);
    else
      setupDesktopCoursesDd();
  })();`
}

/** @deprecated 새 레이아웃에서는 siteHeaderDrawerControlScript 사용 */
export function siteNavMobileToggleScript(toggleId: string, panelId: string): string {
  return `(function(){
    var t=document.getElementById('${toggleId}');
    var p=document.getElementById('${panelId}');
    if(!t||!p)return;
    t.addEventListener('click',function(){
      var o=!p.classList.contains('hidden');
      p.classList.toggle('hidden');
      t.setAttribute('aria-expanded',o?'false':'true');
    });
  })();`
}

export function siteNavCoursesDropdownDesktop(): string {
  return navCoursesDropdownDesktop()
}

export function siteNavCoursesAccordionMobile(): string {
  return navDrawerCoursesAccordion()
}
