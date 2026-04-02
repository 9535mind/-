/**
 * /community — GET/POST /api/posts, 상세·조회수, 글쓰기 모달
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

  function catBadge(cat) {
    var c = String(cat || '').toLowerCase()
    if (c === 'qna') return { label: 'Q&A', tone: 'qna' }
    if (c === 'review') return { label: '후기', tone: 'review' }
    return { label: '일반', tone: 'general' }
  }

  function formatBody(html) {
    if (html == null || html === '') return ''
    var s = String(html)
    if (s.indexOf('<') === -1) return esc(s).replace(/\n/g, '<br>')
    return s
  }

  function openOverlay(el) {
    if (!el) return
    el.classList.remove('hidden')
    el.classList.add('flex', 'items-center', 'justify-center')
    document.body.style.overflow = 'hidden'
  }

  function closeOverlay(el) {
    if (!el) return
    el.classList.remove('flex', 'items-center', 'justify-center')
    el.classList.add('hidden')
    document.body.style.overflow = ''
  }

  function wirePanelStop(modal, sel) {
    var panel = modal && modal.querySelector(sel)
    if (panel)
      panel.addEventListener('click', function (e) {
        e.stopPropagation()
      })
    if (modal)
      modal.addEventListener('click', function () {
        closeOverlay(modal)
      })
  }

  async function loadList(desktopEl, mobileEl) {
    try {
      var res = await axios.get('/api/posts', { withCredentials: true })
      var payload = res.data
      var rows = payload && payload.success && Array.isArray(payload.data) ? payload.data : []
      renderList(rows, desktopEl, mobileEl)
    } catch (e) {
      var msg =
        (e.response && e.response.data && e.response.data.error) || e.message || '목록을 불러오지 못했습니다.'
      if (desktopEl) desktopEl.innerHTML = '<p class="p-8 text-center text-rose-600 text-sm">' + esc(msg) + '</p>'
      if (mobileEl) mobileEl.innerHTML = '<p class="p-6 text-center text-rose-600 text-sm">' + esc(msg) + '</p>'
    }
  }

  function renderList(rows, desktopEl, mobileEl) {
    if (!desktopEl || !mobileEl) return
    if (!rows.length) {
      desktopEl.innerHTML = '<p class="p-8 text-center text-slate-500 text-sm">등록된 글이 없습니다.</p>'
      mobileEl.innerHTML = '<p class="p-6 text-center text-slate-500 text-sm">등록된 글이 없습니다.</p>'
      return
    }

    desktopEl.innerHTML = rows
      .map(function (p) {
        var id = String(p.id)
        var b = catBadge(p.category)
        var date = formatDate(p.created_at)
        var author = p.author || '—'
        return (
          '<article class="board-row-glass cursor-pointer" tabindex="0" role="button" data-post-id="' +
          esc(id) +
          '" aria-label="게시글 상세">' +
          '<div class="w-[5.5rem] shrink-0 flex items-center">' +
          '<span class="board-badge-tremor board-tone-' +
          esc(b.tone) +
          '">' +
          esc(b.label) +
          '</span></div>' +
          '<div class="board-row-title min-w-0">' +
          esc(p.title || '') +
          '</div>' +
          '<div class="w-24 shrink-0 text-center text-xs text-slate-600 truncate" title="' +
          esc(author) +
          '">' +
          esc(author) +
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
      .map(function (p) {
        var id = String(p.id)
        var b = catBadge(p.category)
        var date = formatDate(p.created_at)
        return (
          '<article class="board-card-glass cursor-pointer" tabindex="0" role="button" data-post-id="' +
          esc(id) +
          '" aria-label="게시글 상세">' +
          '<div class="board-card-head">' +
          '<span class="board-badge-tremor board-tone-' +
          esc(b.tone) +
          '">' +
          esc(b.label) +
          '</span>' +
          '<time class="board-card-date" datetime="' +
          esc(date) +
          '">' +
          esc(date) +
          '</time></div>' +
          '<h3 class="board-card-title">' +
          esc(p.title || '') +
          '</h3>' +
          '<p class="text-xs text-slate-500 mt-1">' +
          esc(p.author || '') +
          '</p></article>'
        )
      })
      .join('')
  }

  async function loadDetail(id, modal, titleEl, bodyEl) {
    titleEl.textContent = '불러오는 중…'
    bodyEl.innerHTML = '<p class="text-slate-500 text-sm">잠시만 기다려 주세요.</p>'
    openOverlay(modal)
    try {
      var res = await axios.get('/api/posts/' + encodeURIComponent(id), { withCredentials: true })
      var payload = res.data
      if (!payload || !payload.success || !payload.data) {
        var err = (payload && payload.error) || '불러오지 못했습니다.'
        titleEl.textContent = '오류'
        bodyEl.innerHTML = '<p class="text-rose-600 text-sm">' + esc(err) + '</p>'
        return
      }
      var d = payload.data
      var when = formatDate(d.created_at)
      var author = d.author || '—'
      var sub =
        '<p class="text-xs text-slate-500 mb-3">' +
        esc(author) +
        (when !== '—' ? ' · ' + esc(when) : '') +
        '</p>'
      titleEl.textContent = d.title || ''
      bodyEl.innerHTML =
        sub + '<div class="community-post-content text-slate-800 text-sm leading-relaxed">' + formatBody(d.content) + '</div>'
    } catch (e) {
      var msg =
        (e.response && e.response.data && e.response.data.error) || e.message || '네트워크 오류입니다.'
      titleEl.textContent = '오류'
      bodyEl.innerHTML = '<p class="text-rose-600 text-sm">' + esc(msg) + '</p>'
    }
  }

  async function ensureLogin() {
    try {
      var res = await axios.get('/api/auth/me', { withCredentials: true })
      var d = res.data
      if (d && d.success && d.data) return true
    } catch (e) {
      /* ignore */
    }
    return false
  }

  function openCompose(modal) {
    var subj = document.getElementById('community-post-compose-subject')
    var body = document.getElementById('community-post-compose-body')
    var cat = document.getElementById('community-post-compose-category')
    if (subj) subj.value = ''
    if (body) body.value = ''
    if (cat) cat.value = 'qna'
    openOverlay(modal)
  }

  async function init() {
    var section = document.getElementById('board-posts')
    if (!section) return

    var desktopEl = document.getElementById('community-posts-desktop-list')
    var mobileEl = document.getElementById('community-posts-mobile')
    var modal = document.getElementById('community-post-modal')
    var titleEl = document.getElementById('community-post-modal-title')
    var bodyEl = document.getElementById('community-post-modal-body')
    var composeModal = document.getElementById('community-post-compose-modal')
    var composeForm = document.getElementById('community-post-compose-form')

    await loadList(desktopEl, mobileEl)

    section.addEventListener('click', function (ev) {
      var row = ev.target.closest('[data-post-id]')
      if (!row) return
      var id = row.getAttribute('data-post-id')
      if (!id) return
      loadDetail(id, modal, titleEl, bodyEl)
    })

    wirePanelStop(modal, '[data-post-modal-panel]')
    document.getElementById('community-post-modal-close')?.addEventListener('click', function () {
      closeOverlay(modal)
    })

    wirePanelStop(composeModal, '[data-post-compose-panel]')
    document.getElementById('community-post-compose-close')?.addEventListener('click', function () {
      closeOverlay(composeModal)
    })
    document.getElementById('community-post-compose-cancel')?.addEventListener('click', function () {
      closeOverlay(composeModal)
    })

    document.getElementById('community-post-btn-write')?.addEventListener('click', async function () {
      var ok = await ensureLogin()
      if (!ok) {
        if (confirm('로그인이 필요합니다. 로그인 페이지로 이동할까요?')) {
          window.location.href = '/login?return=' + encodeURIComponent('/community#board-posts')
        }
        return
      }
      openCompose(composeModal)
    })

    if (composeForm) {
      composeForm.addEventListener('submit', async function (e) {
        e.preventDefault()
        var title = (document.getElementById('community-post-compose-subject')?.value || '').trim()
        var content = document.getElementById('community-post-compose-body')?.value || ''
        var category = document.getElementById('community-post-compose-category')?.value || 'qna'
        if (!title) {
          alert('제목을 입력해 주세요.')
          return
        }
        try {
          var res = await axios.post(
            '/api/posts',
            { title: title, content: content, category: category },
            { withCredentials: true, headers: { 'Content-Type': 'application/json' } },
          )
          var payload = res.data
          if (payload && payload.success) {
            closeOverlay(composeModal)
            await loadList(desktopEl, mobileEl)
            alert(payload.message || '등록되었습니다.')
          } else {
            alert((payload && payload.error) || '등록에 실패했습니다.')
          }
        } catch (err) {
          var msg =
            (err.response && err.response.data && err.response.data.error) ||
            err.message ||
            '등록에 실패했습니다.'
          alert(msg)
        }
      })
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
