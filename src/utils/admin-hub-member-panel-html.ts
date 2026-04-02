/**
 * 회원 상세 슬라이드 패널 마크업 — 관제탑·전용 회원 페이지에서 공통 사용
 */
export function adminHubMemberDetailPanelHtml(): string {
  return `  <!-- 회원 상세 관리 프로필 (슬라이드오버) -->
  <div id="hubMemberDetailPanel" class="fixed inset-0 z-[70] hidden" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="hubMemberDetailTitle">
    <div class="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px] transition-opacity" id="hubMemberDetailBackdrop" onclick="closeHubMemberDetailPanel()"></div>
    <aside
      id="hubMemberDetailAside"
      class="absolute top-0 right-0 h-full w-full max-w-md sm:max-w-lg bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-out translate-x-full border-l border-slate-200/80 ring-1 ring-slate-900/5"
    >
      <div class="shrink-0 border-b border-slate-200 bg-gradient-to-r from-indigo-50/90 to-emerald-50/50 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onclick="closeHubMemberDetailPanel()"
          class="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-700 hover:text-indigo-900 px-2 py-1.5 rounded-lg hover:bg-white/80 transition"
        >
          <span aria-hidden="true">←</span> 뒤로 가기 <span class="text-slate-500 font-normal">(리스트로)</span>
        </button>
      </div>
      <div class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6" id="hubMemberDetailBody">
        <div>
          <h2 id="hubMemberDetailTitle" class="text-xl font-bold text-slate-900">회원 상세</h2>
          <p class="text-xs text-slate-500 mt-1" id="hubMemberDetailSubtitle">프로필을 불러오는 중입니다.</p>
          <p id="hubMemberOrgHeadline" class="hidden mt-2 text-base font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2"></p>
        </div>
        <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="hubMemberSecA">
          <h3 id="hubMemberSecA" class="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <span class="w-1.5 h-5 rounded-full bg-indigo-500" aria-hidden="true"></span> 신상 및 상태 요약
          </h3>
          <dl class="grid grid-cols-1 gap-2 text-sm">
            <div class="flex flex-wrap gap-x-2"><dt class="text-slate-500 shrink-0">이름</dt><dd class="font-semibold text-slate-900" id="hubMemberFieldName">—</dd></div>
            <div class="flex flex-wrap gap-x-2"><dt class="text-slate-500 shrink-0">아이디(이메일)</dt><dd class="text-slate-800 break-all" id="hubMemberFieldEmail">—</dd></div>
            <div class="flex flex-wrap gap-x-2"><dt class="text-slate-500 shrink-0">연락처</dt><dd class="text-slate-800" id="hubMemberFieldPhone">—</dd></div>
            <div class="flex flex-wrap gap-x-2"><dt class="text-slate-500 shrink-0">가입일</dt><dd class="text-slate-800" id="hubMemberFieldJoined">—</dd></div>
            <div class="flex flex-wrap gap-x-2"><dt class="text-slate-500 shrink-0">최근 접속</dt><dd class="text-slate-800" id="hubMemberFieldLastAccess">—</dd></div>
          </dl>
          <div class="mt-3 flex flex-wrap gap-2 items-center" id="hubMemberFieldTags"></div>
        </section>
        <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="hubMemberSecB">
          <h3 id="hubMemberSecB" class="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <span class="w-1.5 h-5 rounded-full bg-emerald-500" aria-hidden="true"></span> 학습 및 지갑 현황
          </h3>
          <div id="hubMemberFieldCourses" class="space-y-3"></div>
          <div class="mt-4 pt-3 border-t border-slate-100 text-sm space-y-1">
            <p><span class="text-slate-500">최근 결제</span> <span id="hubMemberFieldPayRecent" class="text-slate-800">—</span></p>
            <p><span class="text-slate-500">누적 결제</span> <span id="hubMemberFieldPayTotal" class="font-semibold text-emerald-700 tabular-nums">—</span></p>
          </div>
        </section>
        <section class="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 shadow-sm" aria-labelledby="hubMemberSecC">
          <h3 id="hubMemberSecC" class="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <span class="w-1.5 h-5 rounded-full bg-amber-500" aria-hidden="true"></span> 관리자 전용 액션
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button type="button" class="hub-member-action-btn px-3 py-2.5 rounded-lg text-sm font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 shadow-sm" data-hub-member-action="temp-pw">🔑 임시 비밀번호 발급</button>
            <button type="button" class="hub-member-action-btn px-3 py-2.5 rounded-lg text-sm font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 shadow-sm" data-hub-member-action="b2b-approve">✅ B2B/강사 권한 승인</button>
            <button type="button" class="hub-member-action-btn px-3 py-2.5 rounded-lg text-sm font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 shadow-sm" data-hub-member-action="manual-enroll">🛠️ 강제 수강 신청 (매뉴얼)</button>
            <button type="button" class="hub-member-action-btn px-3 py-2.5 rounded-lg text-sm font-semibold bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-900 shadow-sm" data-hub-member-action="suspend">🚨 계정 정지</button>
          </div>
        </section>
      </div>
    </aside>
  </div>
`
}
