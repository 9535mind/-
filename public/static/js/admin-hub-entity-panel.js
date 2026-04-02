/**
 * 관제탑 — 강좌·도서 등 비회원 항목 상세 슬라이드 패널
 */
;(function () {
  let escHandler = null

  function closeHubEntityDetailPanel() {
    const wrap = document.getElementById('hubEntityDetailPanel')
    const aside = document.getElementById('hubEntityDetailAside')
    if (escHandler) {
      document.removeEventListener('keydown', escHandler, true)
      escHandler = null
    }
    if (aside) aside.classList.add('translate-x-full')
    setTimeout(() => {
      if (wrap) {
        wrap.classList.add('hidden')
        wrap.setAttribute('aria-hidden', 'true')
      }
    }, 260)
  }

  function openHubEntityDetailPanel(opts) {
    const wrap = document.getElementById('hubEntityDetailPanel')
    const aside = document.getElementById('hubEntityDetailAside')
    const title = document.getElementById('hubEntityDetailTitle')
    const sub = document.getElementById('hubEntityDetailSubtitle')
    const content = document.getElementById('hubEntityDetailContent')
    if (!wrap || !aside || !content) return
    if (title) title.textContent = opts.title || '상세'
    if (sub) sub.textContent = opts.subtitle || ''
    content.innerHTML = opts.html || '<p class="text-slate-500">내용이 없습니다.</p>'

    wrap.classList.remove('hidden')
    wrap.setAttribute('aria-hidden', 'false')
    requestAnimationFrame(() => aside.classList.remove('translate-x-full'))

    if (escHandler) document.removeEventListener('keydown', escHandler, true)
    escHandler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        closeHubEntityDetailPanel()
      }
    }
    document.addEventListener('keydown', escHandler, true)
  }

  function bindHubEntityDetailPanel() {
    if (window.__hubEntityDetailBound) return
    window.__hubEntityDetailBound = true
    document.addEventListener('click', (e) => {
      const a = e.target.closest('.entity-detail-trigger')
      if (!a) return
      const modal = document.getElementById('hubDashboardDetailModal')
      if (!modal || !modal.contains(a)) return
      e.preventDefault()
      e.stopPropagation()
      const label = (a.getAttribute('data-entity-label') || a.textContent || '').trim()
      const meta = (a.getAttribute('data-entity-meta') || '').trim()
      const html =
        '<dl class="space-y-2">' +
        '<div><dt class="text-xs text-slate-500">항목</dt><dd class="font-medium">' +
        escapeEntityHtml(label) +
        '</dd></div>' +
        (meta
          ? '<div><dt class="text-xs text-slate-500">메모</dt><dd class="text-sm">' +
            escapeEntityHtml(meta) +
            '</dd></div>'
          : '') +
        '</dl>' +
        '<p class="text-xs text-slate-400 mt-4">실제 저장·승인은 해당 탭 또는 API 연동 후 사용할 수 있습니다.</p>'
      openHubEntityDetailPanel({
        title: label || '항목 상세',
        subtitle: '관제탑 미리보기',
        html,
      })
    })
  }

  function escapeEntityHtml(s) {
    if (s == null) return ''
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  window.closeHubEntityDetailPanel = closeHubEntityDetailPanel
  window.openHubEntityDetailPanel = openHubEntityDetailPanel

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindHubEntityDetailPanel)
  } else {
    bindHubEntityDetailPanel()
  }
})()
