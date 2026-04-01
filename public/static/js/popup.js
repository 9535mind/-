/**
 * 팝업 공지 — GET /api/popups/active (이미지·링크만)
 * 오늘 하루 보지 않기: localStorage + POST /close (쿠키 동기화)
 */
;(function () {
  'use strict'

  var LS_KEY = 'mslms_popup_hide_day_v1'
  var ROOT_ID = 'mslms-site-popup-root'

  function pad2(n) {
    return n < 10 ? '0' + n : '' + n
  }

  function localYmd() {
    var d = new Date()
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
  }

  function getHideMap() {
    try {
      var raw = localStorage.getItem(LS_KEY)
      var o = raw ? JSON.parse(raw) : {}
      return o && typeof o === 'object' ? o : {}
    } catch (e) {
      return {}
    }
  }

  function isHiddenToday(popupId) {
    return getHideMap()[String(popupId)] === localYmd()
  }

  function setHiddenToday(popupId) {
    var m = getHideMap()
    m[String(popupId)] = localYmd()
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(m))
    } catch (e) {
      /* ignore quota */
    }
  }

  function escapeHtml(s) {
    if (s == null) return ''
    var d = document.createElement('div')
    d.textContent = String(s)
    return d.innerHTML
  }

  function safeUrl(url) {
    if (!url || typeof url !== 'string') return ''
    var u = url.trim()
    if (u.indexOf('/') === 0) return u
    if (u.indexOf('https://') === 0 || u.indexOf('http://') === 0) return u
    return ''
  }

  function postJson(path, body) {
    return fetch(path, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body != null ? JSON.stringify(body) : '{}',
    }).catch(function () {})
  }

  function trackView(id) {
    return postJson('/api/popups/' + encodeURIComponent(id) + '/view', {})
  }

  function trackClick(id) {
    return postJson('/api/popups/' + encodeURIComponent(id) + '/click', {})
  }

  function removeRoot() {
    var el = document.getElementById(ROOT_ID)
    if (el && el.parentNode) el.parentNode.removeChild(el)
  }

  function closePopup(popupId, dontShowToday) {
    removeRoot()
    if (dontShowToday) {
      setHiddenToday(popupId)
      void postJson('/api/popups/' + encodeURIComponent(popupId) + '/close', { dontShowToday: true })
    }
  }

  function showPopup(p, onDone) {
    var id = p.id
    var title = p.title || ''
    var img = safeUrl(p.image_url || '')
    var link = safeUrl(p.link_url || '')
    var linkText = (p.link_text && String(p.link_text).trim()) || '자세히 보기'
    var displayType = String(p.display_type || 'modal').toLowerCase()

    void trackView(id)

    var root = document.createElement('div')
    root.id = ROOT_ID
    root.setAttribute('role', 'dialog')
    root.setAttribute('aria-modal', 'true')
    root.setAttribute('aria-label', title || '팝업')

    var banner = displayType === 'banner'

    var wrap = document.createElement('div')
    if (banner) {
      wrap.className =
        'fixed top-0 left-0 right-0 z-[95] flex flex-wrap items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 shadow-md'
    } else {
      wrap.className =
        'fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/50'
    }

    var card = document.createElement('div')
    if (banner) {
      card.className = 'flex flex-1 flex-wrap items-center gap-4 min-w-0 max-w-6xl mx-auto'
    } else {
      card.className =
        'relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200'
    }

    var closeBtn = document.createElement('button')
    closeBtn.type = 'button'
    closeBtn.className =
      (banner ? 'shrink-0 ' : 'absolute top-3 right-3 ') +
      'rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 text-xl leading-none'
    closeBtn.setAttribute('aria-label', '닫기')
    closeBtn.innerHTML = '&times;'

    var inner = document.createElement('div')
    inner.className = banner ? 'flex flex-1 flex-wrap items-center gap-4 min-w-0' : 'p-6 pt-12'

    if (img) {
      var figure = document.createElement('div')
      figure.className = banner ? 'shrink-0 max-h-20' : 'mb-4 rounded-xl overflow-hidden border border-slate-100'
      var im = document.createElement('img')
      im.src = img
      im.alt = ''
      im.className = banner ? 'max-h-20 w-auto object-contain' : 'w-full h-auto object-cover max-h-64'
      im.loading = 'lazy'
      figure.appendChild(im)
      inner.appendChild(figure)
    }

    var textBlock = document.createElement('div')
    textBlock.className = 'min-w-0 flex-1'
    if (title) {
      var h = document.createElement('p')
      h.className = 'text-base font-semibold text-slate-900'
      h.innerHTML = escapeHtml(title)
      textBlock.appendChild(h)
    }

    if (link) {
      var a = document.createElement('a')
      a.href = link
      a.className =
        'inline-flex mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 underline underline-offset-2'
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      a.textContent = linkText
      a.addEventListener('click', function () {
        void trackClick(id)
      })
      textBlock.appendChild(a)
    }

    inner.appendChild(textBlock)

    var footer = document.createElement('div')
    footer.className = banner
      ? 'flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end'
      : 'mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'

    var chkWrap = document.createElement('label')
    chkWrap.className = 'flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none'
    var chk = document.createElement('input')
    chk.type = 'checkbox'
    chk.className = 'rounded border-slate-300 text-indigo-600'
    var chkSpan = document.createElement('span')
    chkSpan.textContent = '오늘 하루 보지 않기'
    chkWrap.appendChild(chk)
    chkWrap.appendChild(chkSpan)

    var closeAction = document.createElement('button')
    closeAction.type = 'button'
    closeAction.className =
      'rounded-lg bg-slate-100 text-slate-800 px-4 py-2 text-sm font-medium hover:bg-slate-200'
    closeAction.textContent = '닫기'

    function doClose() {
      closePopup(id, chk.checked)
      if (typeof onDone === 'function') onDone()
    }

    closeBtn.addEventListener('click', doClose)
    closeAction.addEventListener('click', doClose)

    footer.appendChild(chkWrap)
    footer.appendChild(closeAction)

    if (banner) {
      card.appendChild(inner)
      card.appendChild(footer)
      wrap.appendChild(card)
      wrap.appendChild(closeBtn)
    } else {
      card.appendChild(closeBtn)
      card.appendChild(inner)
      card.appendChild(footer)
      var dialog = document.createElement('div')
      dialog.className = 'relative w-full max-w-lg'
      dialog.appendChild(card)
      wrap.appendChild(dialog)
    }

    wrap.addEventListener('click', function (ev) {
      if (!banner && ev.target === wrap) doClose()
    })

    root.appendChild(wrap)
    document.body.appendChild(root)
  }

  function loadPopups() {
    return fetch('/api/popups/active', { credentials: 'include', headers: { Accept: 'application/json' } })
      .then(function (r) {
        return r.json()
      })
      .then(function (j) {
        if (!j || !j.success || !Array.isArray(j.data)) return
        var list = j.data.filter(function (p) {
          return p && p.id != null && !isHiddenToday(p.id)
        })
        if (!list.length) return

        function runQueue(i) {
          if (i >= list.length) return
          showPopup(list[i], function () {
            runQueue(i + 1)
          })
        }
        runQueue(0)
      })
  }

  window.PopupManager = {
    loadPopups: function () {
      return loadPopups().catch(function () {})
    },
    createPopup: function () {
      return null
    },
    closePopup: function (id, dontShowToday) {
      closePopup(id, !!dontShowToday)
    },
    trackView: function (id) {
      return trackView(id)
    },
    trackClick: function (id) {
      return trackClick(id)
    },
    isTodayClosed: function (popupId) {
      return isHiddenToday(popupId)
    },
    setTodayClosed: function (popupId) {
      setHiddenToday(popupId)
    },
  }

  function boot() {
    void loadPopups().catch(function () {})
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot)
  } else {
    boot()
  }
})()
