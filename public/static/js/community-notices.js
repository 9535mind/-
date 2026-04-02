/**
 * /community — GET /api/notices 목록 + 상세 모달 (GET /api/notices/:id, 조회수 증가는 서버)
 */
;(function () {
  'use strict'

  function esc(s) {
    if (s == null) return ''
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  function formatDate(createdAt) {
    if (!createdAt) return '—'
    var t = String(createdAt)
    return t.length >= 10 ? t.slice(0, 10) : t
  }

  function adminPencilHtml(id) {
    var href = '/admin/notice/edit/' + encodeURIComponent(String(id))
    return (
      '<a href="' +
      esc(href) +
      '" class="admin-magic-pencil ml-1.5 inline-flex" title="관리자 수정" aria-label="항목 수정 (' +
      esc(String(id)) +
      ')"><i class="fas fa-pencil-alt" aria-hidden="true"></i></a>'
    )
  }

  function openModal(modal, titleEl, bodyEl, title, html) {
    if (!modal || !titleEl || !bodyEl) return
    titleEl.textContent = title || ''
    bodyEl.innerHTML = html || ''
    modal.classList.remove('hidden')
    modal.classList.add('flex', 'items-center', 'justify-center')
    document.body.style.overflow = 'hidden'
  }

  function closeModal(modal) {
    if (!modal) return
    modal.classList.remove('flex', 'items-center', 'justify-center')
    modal.classList.add('hidden')
    document.body.style.overflow = ''
  }

  async function loadDetail(id, modal, titleEl, bodyEl) {
    openModal(modal, titleEl, bodyEl, '불러오는 중…', '<p class="text-slate-500 text-sm">잠시만 기다려 주세요.</p>')
    try {
      var res = await axios.get('/api/notices/' + encodeURIComponent(id), { withCredentials: true })
      var payload = res.data
      if (!payload || !payload.success || !payload.data) {
        var err = (payload && payload.error) || '공지를 불러오지 못했습니다.'
        openModal(modal, titleEl, bodyEl, '오류', '<p class="text-rose-600 text-sm">' + esc(err) + '</p>')
        return
      }
      var d = payload.data
      var when = formatDate(d.created_at)
      var sub = when !== '—' ? '<p class="text-xs text-slate-500 mt-1 mb-4">' + esc(when) + '</p>' : ''
      openModal(
        modal,
        titleEl,
        bodyEl,
        d.title || '',
        sub + '<div class="community-notice-content text-slate-800 text-sm leading-relaxed">' + (d.content || '') + '</div>',
      )
    } catch (e) {
      var msg =
        (e.response && e.response.data && e.response.data.error) || e.message || '네트워크 오류입니다.'
      openModal(modal, titleEl, bodyEl, '오류', '<p class="text-rose-600 text-sm">' + esc(msg) + '</p>')
    }
  }

  function renderList(rows, desktopEl, mobileEl, isAdmin) {
    if (!desktopEl || !mobileEl) return
    if (!rows.length) {
      desktopEl.innerHTML =
        '<p class="p-8 text-center text-slate-500 text-sm">등록된 공지가 없습니다.</p>'
      mobileEl.innerHTML =
        '<p class="p-6 text-center text-slate-500 text-sm">등록된 공지가 없습니다.</p>'
      return
    }

    desktopEl.innerHTML = rows
      .map(function (n) {
        var id = String(n.id)
        var badge = Number(n.is_pinned) === 1 ? '필독' : '공지'
        var tone = Number(n.is_pinned) === 1 ? 'notice' : 'notice'
        var date = formatDate(n.created_at)
        var pencil = isAdmin ? adminPencilHtml(id) : ''
        return (
          '<article class="board-row-glass cursor-pointer" tabindex="0" role="button" data-notice-id="' +
          esc(id) +
          '" aria-label="공지 상세 보기">' +
          '<div class="w-[5.5rem] shrink-0 flex items-center">' +
          '<span class="board-badge-tremor board-tone-' +
          esc(tone) +
          '">' +
          esc(badge) +
          '</span></div>' +
          '<div class="board-row-title min-w-0 inline-flex items-center flex-wrap gap-0">' +
          '<span>' +
          esc(n.title || '') +
          '</span>' +
          pencil +
          '</div>' +
          '<time class="board-row-meta w-28 shrink-0 text-right" datetime="' +
          esc(date) +
          '">' +
          esc(date) +
          '</time></article>'
        )
      })
      .join('')

    mobileEl.innerHTML = rows
      .map(function (n) {
        var id = String(n.id)
        var badge = Number(n.is_pinned) === 1 ? '필독' : '공지'
        var tone = 'notice'
        var date = formatDate(n.created_at)
        var pencil = isAdmin ? adminPencilHtml(id) : ''
        return (
          '<article class="board-card-glass cursor-pointer" tabindex="0" role="button" data-notice-id="' +
          esc(id) +
          '" aria-label="공지 상세 보기">' +
          '<div class="board-card-head">' +
          '<span class="board-badge-tremor board-tone-' +
          esc(tone) +
          '">' +
          esc(badge) +
          '</span>' +
          '<time class="board-card-date" datetime="' +
          esc(date) +
          '">' +
          esc(date) +
          '</time></div>' +
          '<h3 class="board-card-title inline-flex items-baseline flex-wrap gap-0">' +
          '<span>' +
          esc(n.title || '') +
          '</span>' +
          pencil +
          '</h3></article>'
        )
      })
      .join('')
  }

  async function init() {
    var section = document.getElementById('board-notice')
    if (!section) return

    var isAdmin = section.getAttribute('data-is-admin') === '1'
    var desktopEl = document.getElementById('community-notices-desktop-list')
    var mobileEl = document.getElementById('community-notices-mobile')
    var modal = document.getElementById('community-notice-modal')
    var titleEl = document.getElementById('community-notice-modal-title')
    var bodyEl = document.getElementById('community-notice-modal-body')

    try {
      var res = await axios.get('/api/notices', { withCredentials: true })
      var payload = res.data
      var rows = payload && payload.success && Array.isArray(payload.data) ? payload.data : []
      renderList(rows, desktopEl, mobileEl, isAdmin)
    } catch (e) {
      var msg =
        (e.response && e.response.data && e.response.data.error) || e.message || '목록을 불러오지 못했습니다.'
      if (desktopEl)
        desktopEl.innerHTML =
          '<p class="p-8 text-center text-rose-600 text-sm">' + esc(msg) + '</p>'
      if (mobileEl)
        mobileEl.innerHTML =
          '<p class="p-6 text-center text-rose-600 text-sm">' + esc(msg) + '</p>'
    }

    section.addEventListener('click', function (ev) {
      if (ev.target.closest && ev.target.closest('a.admin-magic-pencil')) return
      var row = ev.target.closest('[data-notice-id]')
      if (!row) return
      var id = row.getAttribute('data-notice-id')
      if (!id) return
      loadDetail(id, modal, titleEl, bodyEl)
    })

    if (modal) {
      var panel = modal.querySelector('[data-notice-modal-panel]')
      if (panel) {
        panel.addEventListener('click', function (e) {
          e.stopPropagation()
        })
      }
      modal.addEventListener('click', function () {
        closeModal(modal)
      })
    }
    var closeBtn = document.getElementById('community-notice-modal-close')
    if (closeBtn)
      closeBtn.addEventListener('click', function () {
        closeModal(modal)
      })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
