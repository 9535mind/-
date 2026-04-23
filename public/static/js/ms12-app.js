/**
 * MS12 /app* — /api/auth/me 단일 진실.
 * OAuth 직후(oauth_sync=1)는 예전 /app/meeting·/app/login 랜딩만 /app(시작화면)로 정리.
 * 그 외 자동 location 이동 없음(로그아웃은 사용자 클릭).
 */
;(function () {
  function authLog() {
    var a = ['[ms12-auth]'].concat(
      Array.prototype.slice.call(arguments).map(function (x) {
        return x === null || x === undefined ? String(x) : x
      })
    )
    if (typeof console !== 'undefined' && console.log) {
      console.log(a.join(' '))
    }
  }

  function getRoute() {
    var b = document.body
    var attr = b && b.getAttribute('data-ms12-route')
    if (attr) return attr
    var p = (typeof location !== 'undefined' && location.pathname) || ''
    p = p.replace(/\/$/, '') || '/'
    if (p === '/app' || p === '/app/home') return 'home'
    if (p === '/app/meeting/new') return 'meeting_new'
    if (p === '/app/join') return 'join'
    if (p === '/app/records') return 'records'
    if (p === '/app/meeting') return 'meeting'
    if (p.indexOf('/app/meeting/') === 0) return 'meeting_room'
    return 'home'
  }

  function routePath() {
    return typeof location !== 'undefined' && location.pathname ? location.pathname : '/app'
  }

  function isAuthedFromMe(json) {
    if (!json || json.success !== true) return false
    var d = json.data
    if (d == null) return false
    if (typeof d !== 'object' || Array.isArray(d)) return false
    return (
      d.id != null ||
      !!d.email ||
      !!d.session_token ||
      d.role != null ||
      !!d.name
    )
  }

  function applyNextToOAuthLinks() {
    var next = new URLSearchParams(window.location.search || '').get('next')
    if (!next) return
    if (next.indexOf('..') >= 0 || !next.startsWith('/')) return
    var q = 'next=' + encodeURIComponent(next)
    var list = document.querySelectorAll('a[href^="/api/auth/kakao/login"],a[href^="/api/auth/google/login"]')
    for (var i = 0; i < list.length; i++) {
      var el = list[i]
      var h = el.getAttribute('href') || ''
      if (h.indexOf('next=') >= 0) continue
      el.setAttribute('href', h + (h.indexOf('?') >= 0 ? '&' : '?') + q)
    }
  }

  async function fetchMeOnce() {
    var r
    if (typeof AbortController === 'undefined') {
      try {
        r = await fetch('/api/auth/me', { credentials: 'include' })
      } catch (e) {
        return { status: 0, json: null, _err: e }
      }
    } else {
      var ctrl = new AbortController()
      var t = setTimeout(function () {
        try {
          ctrl.abort()
        } catch (e) {}
      }, 10000)
      try {
        r = await fetch('/api/auth/me', { credentials: 'include', signal: ctrl.signal })
      } catch (e) {
        clearTimeout(t)
        return { status: 0, json: null, _err: e }
      }
      clearTimeout(t)
    }
    var j = null
    try {
      j = await r.json()
    } catch (e) {
      j = null
    }
    return { status: r.status, json: j }
  }

  function stripOauthParam() {
    var p = new URLSearchParams(window.location.search || '')
    if (p.get('oauth_sync') !== '1') return
    p.delete('oauth_sync')
    var q = p.toString()
    var u = window.location.pathname + (q ? '?' + q : '') + (window.location.hash || '')
    try {
      window.history.replaceState({}, '', u)
    } catch (e) {}
  }

  function setShellState(state, user) {
    authLog('route=' + getRoute(), 'state=' + state)
    var w = document.getElementById('ms12-wait')
    var g = document.getElementById('ms12-guest')
    var a = document.getElementById('ms12-authed')
    if (w) w.style.display = state === 'loading' ? 'block' : 'none'
    if (g) g.style.display = state === 'guest' ? 'block' : 'none'
    if (a) a.style.display = state === 'authed' ? 'block' : 'none'
    if (state === 'authed' && user) {
      var nodes = document.querySelectorAll('.js-ms12-user-name')
      for (var n = 0; n < nodes.length; n++) {
        nodes[n].textContent = user.name || user.email || '사용자'
      }
    }
  }

  function wireLogout() {
    var btns = document.querySelectorAll('[data-ms12-logout]')
    for (var i = 0; i < btns.length; i++) {
      ;(function (btn) {
        if (btn.getAttribute('data-ms12-logout-wired') === '1') return
        btn.setAttribute('data-ms12-logout-wired', '1')
        btn.addEventListener('click', function () {
          fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
            .then(function () {
              try {
                localStorage.removeItem('user')
              } catch (e) {}
              window.location.href = '/app'
            })
            .catch(function () {
              window.location.href = '/app'
            })
        })
      })(btns[i])
    }
  }

  function initHomeRecent() {
    var el = document.getElementById('ms12-home-recent')
    if (!el) return
    fetch('/api/ms12/meetings/my?limit=5', { credentials: 'include' })
      .then(function (r) {
        return r.json()
      })
      .then(function (j) {
        if (!j || !j.success || !j.data) {
          el.textContent = '목록을 불러오지 못했습니다.'
          return
        }
        var rows = j.data
        if (!rows.length) {
          el.textContent = '최근 참여·개설한 회의가 아직 없습니다. 회의를 시작하거나 입장해 보세요.'
          return
        }
        el.innerHTML = rows
          .map(function (row) {
            var t = (row.title || '제목 없음') + ' · ' + (row.meetingCode || '') + ' · ' + (row.myRole || '')
            return (
              '<div style="padding:0.35rem 0;border-bottom:1px solid rgb(241 245 249)"><a href="/app/meeting/' +
              encodeURIComponent(row.id) +
              '" class="text-indigo-600" style="text-decoration:underline">' +
              t +
              '</a></div>'
            )
          })
          .join('')
      })
      .catch(function () {
        el.textContent = '최근 회의를 불러올 수 없습니다.'
      })
  }

  function initFormNew() {
    var f = document.getElementById('ms12-form-new')
    if (!f) return
    f.addEventListener('submit', function (e) {
      e.preventDefault()
      var fd = new FormData(f)
      var title = (fd.get('title') || '').toString().trim()
      if (!title) return
      fetch('/api/ms12/meetings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title }),
      })
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          if (j && j.success && j.data && j.data.id) {
            window.location.href = '/app/meeting/' + encodeURIComponent(j.data.id)
            return
          }
          var msg = (j && (j.error || j.message)) || '회의를 만들 수 없습니다.'
          alert(msg)
        })
        .catch(function () {
          alert('요청이 실패했습니다.')
        })
    })
  }

  function initFormJoin() {
    var f = document.getElementById('ms12-form-join')
    var err = document.getElementById('ms12-join-err')
    if (!f) return
    f.addEventListener('submit', function (e) {
      e.preventDefault()
      if (err) {
        err.style.display = 'none'
        err.textContent = ''
      }
      var fd = new FormData(f)
      var code = (fd.get('code') || '').toString()
      if (!code.trim()) return
      fetch('/api/ms12/meetings/join', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingCode: code }),
      })
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          if (j && j.success && j.data && j.data.id) {
            window.location.href = '/app/meeting/' + encodeURIComponent(j.data.id)
            return
          }
          var msg = (j && (j.error || j.message)) || '입장할 수 없습니다.'
          if (err) {
            err.textContent = msg
            err.style.display = 'block'
          } else {
            alert(msg)
          }
        })
        .catch(function () {
          var m = '요청이 실패했습니다.'
          if (err) {
            err.textContent = m
            err.style.display = 'block'
          } else {
            alert(m)
          }
        })
    })
  }

  function initRecordsList() {
    var el = document.getElementById('ms12-records-list')
    if (!el) return
    fetch('/api/ms12/meetings/my?limit=50', { credentials: 'include' })
      .then(function (r) {
        return r.json()
      })
      .then(function (j) {
        if (!j || !j.success || !j.data) {
          el.textContent = '목록을 불러올 수 없습니다.'
          return
        }
        var rows = j.data
        if (!rows.length) {
          el.textContent = '아직 참여·개설한 회의가 없습니다. 시작화면에서 회의를 만들거나 입장해 보세요.'
          return
        }
        el.innerHTML = rows
          .map(function (row) {
            return (
              '<div style="padding:0.5rem 0;border-bottom:1px solid rgb(241 245 249)"><strong>' +
              (row.title || '제목 없음') +
              '</strong><br/><span class="ms12-p" style="font-size:0.85rem">코드: ' +
              (row.meetingCode || '—') +
              ' · 내 역할: ' +
              (row.myRole || '—') +
              '</span><br/><a class="ms12-btn" style="margin-top:0.4rem" href="/app/meeting/' +
              encodeURIComponent(row.id) +
              '">회의실 열기</a></div>'
            )
          })
          .join('')
      })
      .catch(function () {
        el.textContent = '목록을 불러올 수 없습니다.'
      })
  }

  var roomTimer = null

  function showRoomErr(m) {
    var err = document.getElementById('ms12-room-err')
    if (err) {
      err.textContent = m
      err.style.display = m ? 'block' : 'none'
    } else if (m) {
      console.warn(m)
    }
  }

  function loadParticipants(id) {
    return fetch('/api/ms12/meetings/' + encodeURIComponent(id) + '/participants', {
      credentials: 'include',
    }).then(function (r) {
      return r.json()
    })
  }

  function renderParts(j) {
    var ul = document.querySelector('.js-ms12-part-list')
    var cEl = document.querySelector('.js-ms12-part-count')
    if (!ul) return
    if (!j || !j.success || !j.data || !j.data.participants) {
      ul.innerHTML = '<li>—</li>'
      return
    }
    var list = j.data.participants
    var present = 0
    for (var i = 0; i < list.length; i++) {
      if (list[i].isPresent) present++
    }
    if (cEl) cEl.textContent = String(present)
    ul.innerHTML = list
      .map(function (p) {
        if (!p.isPresent) return ''
        var label = p.displayName || '참가자'
        if (p.role === 'host') label += ' (호스트)'
        return '<li>' + label + '</li>'
      })
      .filter(Boolean)
      .join('')
    if (ul.innerHTML === '') {
      ul.innerHTML = '<li>참석자가 없습니다.</li>'
    }
  }

  function initMeetingRoom() {
    var b = document.body
    if (!b || b.getAttribute('data-ms12-route') !== 'meeting_room') return
    var id = b.getAttribute('data-ms12-meeting-id') || ''
    if (!id) return
    var titleEls = document.querySelectorAll('.js-ms12-room-title')
    var codeEls = document.querySelectorAll('.js-ms12-room-code')

    fetch('/api/ms12/meetings/' + encodeURIComponent(id), { credentials: 'include' })
      .then(function (r) {
        return r.json().then(function (j) {
          return { status: r.status, j: j }
        })
      })
      .then(function (o) {
        if (o.status === 403) {
          showRoomErr('이 방의 참석자만 내용을 볼 수 있습니다. 먼저「회의 입장」에서 코드로 입장하세요.')
          for (var t = 0; t < titleEls.length; t++) titleEls[t].textContent = '—'
          for (var c = 0; c < codeEls.length; c++) codeEls[c].textContent = '—'
          return { ok: false }
        }
        if (!o.j || !o.j.success || !o.j.data) {
          showRoomErr((o.j && o.j.error) || '회의를 불러올 수 없습니다.')
          return { ok: false }
        }
        var d = o.j.data
        for (var i = 0; i < titleEls.length; i++) titleEls[i].textContent = d.title || '회의'
        for (var jn = 0; jn < codeEls.length; jn++) codeEls[jn].textContent = d.meetingCode || '—'
        showRoomErr('')
        return loadParticipants(id).then(function (j) {
          return { ok: true, j: j }
        })
      })
      .then(function (result) {
        if (result && result.j) renderParts(result.j)
        if (!result || !result.ok) return
        if (roomTimer) clearInterval(roomTimer)
        roomTimer = setInterval(function () {
          loadParticipants(id)
            .then(function (j) {
              renderParts(j)
            })
            .catch(function () {})
        }, 5000)
      })
      .catch(function () {
        showRoomErr('요청이 실패했습니다.')
      })
  }

  function initAuthedPage() {
    var route = getRoute()
    if (route === 'home') initHomeRecent()
    if (route === 'meeting_new') initFormNew()
    if (route === 'join') initFormJoin()
    if (route === 'records') initRecordsList()
    if (route === 'meeting_room') initMeetingRoom()
  }

  async function run() {
    var hadOauth = new URLSearchParams(window.location.search || '').get('oauth_sync') === '1'

    setShellState('loading', null)
    var o
    if (hadOauth) {
      o = await fetchMeOnce()
      authLog('oauth_sync handled')
    } else {
      o = await fetchMeOnce()
    }

    var j = o && o.json
    var authed = isAuthedFromMe(j)
    var user = authed && j && j.data ? j.data : null
    if (authed) {
      try {
        localStorage.setItem('user', JSON.stringify(j.data))
      } catch (e) {}
    }

    if (hadOauth && authed) {
      var normPath =
        (typeof location !== 'undefined' &&
          location.pathname &&
          location.pathname.replace(/\/$/, '')) ||
        ''
      if (!normPath) normPath = '/'
      if (normPath === '/app/login' || normPath === '/app/meeting') {
        authLog('post-oauth legacy', '→', '/app')
        location.replace('/app' + (window.location.search || ''))
        return
      }
    }
    if (hadOauth) {
      stripOauthParam()
    }

    if (authed) {
      setShellState('authed', user)
      wireLogout()
      initAuthedPage()
    } else {
      var r0 = getRoute()
      if (
        r0 === 'meeting' ||
        r0 === 'home' ||
        r0 === 'meeting_new' ||
        r0 === 'join' ||
        r0 === 'records' ||
        r0 === 'meeting_room'
      ) {
        applyNextToOAuthLinks()
      }
      setShellState('guest', null)
    }
    authLog('no other auto redirect', routePath())
  }

  function safeRun() {
    return run().catch(function (e) {
      authLog('route=' + routePath(), 'error=', String((e && e.message) || e))
      setShellState('guest', null)
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', safeRun)
  } else {
    safeRun()
  }
})()
