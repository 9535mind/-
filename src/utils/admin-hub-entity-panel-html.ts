/**
 * 관제탑 — 회원 외 항목(강좌·도서 등) 상세 슬라이드 패널
 */
export function adminHubEntityDetailPanelHtml(): string {
  return `  <div id="hubEntityDetailPanel" class="fixed inset-0 z-[71] hidden" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="hubEntityDetailTitle">
    <div class="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]" id="hubEntityDetailBackdrop" onclick="closeHubEntityDetailPanel()"></div>
    <aside id="hubEntityDetailAside" class="absolute top-0 right-0 h-full w-full max-w-md sm:max-w-lg bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-out translate-x-full border-l border-violet-200/80 ring-1 ring-slate-900/5">
      <div class="shrink-0 border-b border-violet-100 bg-gradient-to-r from-violet-50/90 to-indigo-50/50 px-4 py-3 flex items-center gap-3">
        <button type="button" onclick="closeHubEntityDetailPanel()" class="inline-flex items-center gap-1.5 text-sm font-medium text-violet-800 hover:text-violet-950 px-2 py-1.5 rounded-lg hover:bg-white/80 transition">
          <span aria-hidden="true">←</span> 뒤로
        </button>
      </div>
      <div class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4" id="hubEntityDetailBody">
        <div>
          <h2 id="hubEntityDetailTitle" class="text-lg font-bold text-slate-900">상세</h2>
          <p id="hubEntityDetailSubtitle" class="text-xs text-slate-500 mt-1"></p>
        </div>
        <div id="hubEntityDetailContent" class="text-sm text-slate-800 space-y-3 leading-relaxed"></div>
      </div>
    </aside>
  </div>
`
}
