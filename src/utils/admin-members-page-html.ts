/**
 * GET /admin/members — 전체 회원 관리 전용 페이지
 */
import { STATIC_JS_CACHE_QUERY } from './static-js-cache-bust'
import { adminHubMemberDetailPanelHtml } from './admin-hub-member-panel-html'

export function adminMembersPageHtml(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>회원 관리 — 마인드스토리 원격평생교육원</title>
  <link rel="stylesheet" href="/static/css/app.css" />
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-slate-100 min-h-screen">
  <nav class="ms-admin-top-bar bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 text-white shadow-xl sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-0 flex-1 md:flex-none">
        <p class="text-xs text-indigo-200 uppercase tracking-widest">Mindstory LMS</p>
        <h1 class="text-lg sm:text-xl font-bold flex items-center gap-2 truncate">
          <i class="fas fa-users text-indigo-300 shrink-0"></i>
          <span class="truncate">전체 회원 관리</span>
        </h1>
      </div>
      <div class="flex items-center gap-2 flex-wrap justify-end">
        <a href="/admin/dashboard" class="text-sm text-indigo-200 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10">
          <i class="fas fa-satellite-dish mr-1"></i>관제탑
        </a>
        <a href="/" class="bg-indigo-500 hover:bg-indigo-400 border border-white/20 text-white px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap shadow-sm">
          <i class="fas fa-graduation-cap mr-1"></i>수강생 사이트
        </a>
        <span class="inline-flex items-center max-w-[min(14rem,50vw)]"><span id="adminName" class="text-sm text-indigo-100 hidden sm:inline truncate" data-ms-name-default="text-sm text-indigo-100 hidden sm:inline truncate">…</span></span>
        <button type="button" onclick="logout()" class="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm whitespace-nowrap">
          <i class="fas fa-sign-out-alt mr-1"></i>로그아웃
        </button>
      </div>
    </div>
  </nav>

  <main id="adminMembersPageRoot" class="max-w-[90rem] mx-auto px-4 py-6 space-y-6">
    <p class="text-sm text-slate-600">가입일 역순으로 조회합니다. 이름을 누르면 우측에서 상세 프로필을 엽니다.</p>

    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">빠른 필터</p>
      <div class="flex flex-wrap gap-2" id="adminMembersQuickFilter" role="group">
        <button type="button" data-member-quick-filter="no_progress" class="admin-members-quick-btn rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 hover:bg-slate-100 text-left">
          미수강자 <span class="text-slate-500 font-normal">(진도율 0%)</span>
        </button>
        <button type="button" data-member-quick-filter="b2b_pending" class="admin-members-quick-btn rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 hover:bg-slate-100 text-left">
          가입 승인 대기 <span class="text-slate-500 font-normal">(approved = 0)</span>
        </button>
        <button type="button" data-member-quick-filter="inactive_7d" class="admin-members-quick-btn rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 hover:bg-slate-100 text-left">
          7일 미접속 <span class="text-slate-500 font-normal">(최근 접속 7일 전)</span>
        </button>
        <button type="button" data-member-quick-filter="unpaid" class="admin-members-quick-btn rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 hover:bg-slate-100 text-left">
          미결제자 <span class="text-slate-500 font-normal">(유료 결제 이력 없음)</span>
        </button>
        <button type="button" data-member-quick-filter="today_signup" class="admin-members-quick-btn rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 hover:bg-slate-100 text-left">
          오늘 신규 가입 <span class="text-slate-500 font-normal">(created_at = today)</span>
        </button>
      </div>
      <p class="text-xs text-slate-400 mt-2">같은 버튼을 다시 누르면 필터가 해제됩니다. 미결제는 <code class="text-slate-500">orders.status = paid</code> 인 건이 없는 회원입니다.</p>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
      <div class="flex flex-wrap gap-2 items-center">
        <span class="text-xs font-semibold text-slate-500 uppercase tracking-wide">구분</span>
        <div class="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 flex-wrap" id="adminMembersTypeFilter" role="group">
          <button type="button" data-member-type="all" class="admin-members-type-btn px-3 py-1.5 text-sm rounded-md bg-indigo-600 text-white font-medium">전체</button>
          <button type="button" data-member-type="general" class="admin-members-type-btn px-3 py-1.5 text-sm rounded-md text-slate-700 hover:bg-white">일반</button>
          <button type="button" data-member-type="b2b" class="admin-members-type-btn px-3 py-1.5 text-sm rounded-md text-slate-700 hover:bg-white">B2B</button>
          <button type="button" data-member-type="instructor" class="admin-members-type-btn px-3 py-1.5 text-sm rounded-md text-slate-700 hover:bg-white">강사</button>
        </div>
      </div>
      <div class="flex flex-1 min-w-[min(100%,18rem)] gap-2 items-center">
        <label class="sr-only" for="adminMembersSearch">통합 검색</label>
        <input type="search" id="adminMembersSearch" placeholder="이름 · 이메일 · 연락처" class="flex-1 min-w-0 border border-slate-300 rounded-lg px-4 py-2.5 text-sm" autocomplete="off" />
        <button type="button" id="adminMembersSearchBtn" class="shrink-0 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700">검색</button>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 shadow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th class="p-3 whitespace-nowrap">이름</th>
              <th class="p-3 whitespace-nowrap">구분</th>
              <th class="p-3 whitespace-nowrap min-w-[8rem]">소속</th>
              <th class="p-3 whitespace-nowrap">이메일</th>
              <th class="p-3 whitespace-nowrap">가입일</th>
              <th class="p-3 whitespace-nowrap">최근 접속</th>
              <th class="p-3 whitespace-nowrap">상태</th>
              <th class="p-3 whitespace-nowrap text-right">관리</th>
            </tr>
          </thead>
          <tbody id="adminMembersTableBody" class="divide-y divide-slate-100">
            <tr><td colspan="8" class="p-8 text-center text-slate-500">불러오는 중…</td></tr>
          </tbody>
        </table>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/80">
        <p class="text-xs text-slate-500" id="adminMembersCountMeta">—</p>
        <div class="flex flex-wrap items-center gap-2" id="adminMembersPagination"></div>
      </div>
    </div>
  </main>

${adminHubMemberDetailPanelHtml()}
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script src="/static/js/auth.js?v=20260329-admin-name"></script>
  <script src="/static/js/utils.js"></script>
  <script src="/static/js/admin-status-labels.js?v=20260330-status-ko"></script>
  <script src="/static/js/admin-hub-member-panel.js?v=20260330-members-page"></script>
  <script src="/static/js/admin-members.js?v=20260330-members-quick-filter"></script>
  <script src="/static/js/security.js${STATIC_JS_CACHE_QUERY}"></script>
</body>
</html>`
}
