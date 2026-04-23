/**
 * MS12 /app* — /api/auth/me + optional/demo 모드.
 * OAuth 직후(oauth_sync=1)만 레거시 경로 → /app 정리. 로그인 강제 리다이렉트 없음( mode=required 제외).
 * 데모/optional: actor 없어도 앱 셸 유지, 로컬( ms12_demo_v1 )에 회의·메모·전사·요약 백업.
 */
;(function () {
  var pageMode = 'optional'

  function isOpenAuthMode(m) {
    return m === 'optional' || m === 'disabled' || m === 'demo'
  }

  var LS = 'ms12_demo_v1'
  function readStore() {
    try {
      var s = localStorage.getItem(LS)
      if (!s) return { meetings: [], byId: {} }
      var o = JSON.parse(s)
      if (!o || typeof o !== 'object') return { meetings: [], byId: {} }
      if (!o.byId) o.byId = {}
      if (!o.meetings) o.meetings = []
      return o
    } catch (e) {
      return { meetings: [], byId: {} }
    }
  }
  function writeStore(st) {
    try {
      localStorage.setItem(LS, JSON.stringify(st))
    } catch (e) {}
  }
  function recordMeetingLocal(d) {
    if (!d || !d.id) return
    try {
      var st = readStore()
      var prev = st.byId[d.id] || {}
      st.byId[d.id] = {
        id: d.id,
        title: d.title != null ? d.title : prev.title,
        meetingCode: d.meetingCode != null ? d.meetingCode : prev.meetingCode,
        myRole: d.myRole != null ? d.myRole : prev.myRole,
        updatedAt: new Date().toISOString(),
        notes: prev.notes,
        transcript: prev.transcript,
        summary: prev.summary
      }
      var ix = st.meetings.indexOf(d.id)
      if (ix >= 0) st.meetings.splice(ix, 1)
      st.meetings.unshift(d.id)
      if (st.meetings.length > 80) st.meetings = st.meetings.slice(0, 80)
      writeStore(st)
    } catch (e) {}
  }
  function ensureLocalOnlyActorId() {
    try {
      var a = localStorage.getItem('ms12_actor')
      if (a) {
        var p = JSON.parse(a)
        if (p && p.id) return p.id
      }
    } catch (e) {}
    try {
      var l = localStorage.getItem('ms12_local_actor')
      if (l) {
        var q = JSON.parse(l)
        if (q && q.id) return q.id
      }
    } catch (e) {}
    var id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'g_' + String(Date.now()) + '_' + Math.random().toString(36).slice(2, 9)
    try {
      localStorage.setItem('ms12_local_actor', JSON.stringify({ type: 'guest', id: id, source: 'local' }))
    } catch (e) {}
    return id
  }
  function mergeMeetingRows(apiRows) {
    if (!apiRows) apiRows = []
    var st = readStore()
    var inApi = {}
    for (var i = 0; i < apiRows.length; i++) inApi[apiRows[i].id] = true
    var out = apiRows.slice()
    for (var j = 0; j < st.meetings.length; j++) {
      var id = st.meetings[j]
      if (!inApi[id] && st.byId[id]) {
        var L = st.byId[id]
        out.push({
          id: L.id,
          title: L.title,
          meetingCode: L.meetingCode,
          myRole: L.myRole || '이 브라우저',
        })
      }
    }
    return out
  }
  function saveRoomDraft(meetingId) {
    if (!meetingId) return
    var n = document.getElementById('ms12-room-notes')
    var tr = document.getElementById('ms12-room-transcript')
    var su = document.getElementById('ms12-room-summary')
    var st = readStore()
    if (!st.byId[meetingId]) st.byId[meetingId] = { id: meetingId }
    st.byId[meetingId].notes = n ? n.value : (st.byId[meetingId].notes || '')
    st.byId[meetingId].transcript = tr ? tr.value : (st.byId[meetingId].transcript || '')
    st.byId[meetingId].summary = su ? su.value : (st.byId[meetingId].summary || '')
    st.byId[meetingId].roomUpdatedAt = new Date().toISOString()
    writeStore(st)
  }
  function loadRoomDraftToDom(meetingId) {
    var st = readStore()
    var x = st.byId[meetingId] || {}
    var n = document.getElementById('ms12-room-notes')
    var tr = document.getElementById('ms12-room-transcript')
    var su = document.getElementById('ms12-room-summary')
    if (n && x.notes != null) n.value = x.notes
    if (tr && x.transcript != null) tr.value = x.transcript
    if (su && x.summary != null) su.value = x.summary
  }

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

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms)
    })
  }

  async function fetchMeOnce() {
    var fetchOpts = { credentials: 'include', cache: 'no-store' }
    var r
    if (typeof AbortController === 'undefined') {
      try {
        r = await fetch('/api/auth/me', fetchOpts)
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
        r = await fetch('/api/auth/me', Object.assign({}, fetchOpts, { signal: ctrl.signal }))
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

  function getPageAuthMode() {
    var b = document.body
    var m = b && b.getAttribute('data-ms12-auth')
    return m || 'optional'
  }

  function applyShell(phase, options) {
    options = options || {}
    var w = document.getElementById('ms12-wait')
    var g = document.getElementById('ms12-guest')
    var a = document.getElementById('ms12-authed')
    var hint = document.getElementById('ms12-guest-hint')
    authLog('route=' + getRoute(), 'shell=' + phase, options)
    if (w) w.style.display = phase === 'loading' ? 'block' : 'none'
    if (g) g.style.display = phase === 'login' ? 'block' : 'none'
    if (a) a.style.display = phase === 'app' ? 'block' : 'none'
    if (hint) {
      hint.style.display = phase === 'app' && options.isGuest ? 'block' : 'none'
    }
    var demoMode = !!options.demoMode
    var nameText = '사용자'
    if (options.user) {
      nameText = options.user.name || options.user.email || '사용자'
    } else if (options.isGuest) {
      nameText = demoMode ? '체험 사용자' : '이용자'
    }
    var nodes = document.querySelectorAll('.js-ms12-user-name')
    for (var n = 0; n < nodes.length; n++) {
      nodes[n].textContent = nameText
    }
    var sufs = document.querySelectorAll('.js-ms12-user-suffix')
    for (var s = 0; s < sufs.length; s++) {
      sufs[s].textContent = options.isGuest ? (demoMode ? ' (데모 · 임시 저장)' : '으로 사용 중') : ' 님'
    }
    var badges = document.querySelectorAll('.js-ms12-badge')
    for (var b = 0; b < badges.length; b++) {
      if (options.user) {
        badges[b].textContent = '로그인됨'
        badges[b].setAttribute('style', 'background:rgb(220 252 231);color:rgb(22 101 52)')
      } else if (options.isGuest) {
        if (demoMode) {
          badges[b].textContent = '체험 모드'
          badges[b].setAttribute('style', 'background:rgb(224 231 255);color:rgb(55 48 163)')
        } else {
          badges[b].textContent = '로그인 생략'
          badges[b].setAttribute('style', 'background:rgb(254 243 199);color:rgb(120 53 15)')
        }
      } else {
        badges[b].textContent = '준비됨'
        badges[b].setAttribute('style', 'background:rgb(220 252 231);color:rgb(22 101 52)')
      }
    }
    var lout = document.querySelectorAll('[data-ms12-logout]')
    for (var lo = 0; lo < lout.length; lo++) {
      lout[lo].style.display = options.user ? 'inline-block' : 'none'
    }
    var lnk = document.querySelectorAll('[data-ms12-login-lnk]')
    for (var li = 0; li < lnk.length; li++) {
      lnk[li].style.display = options.isGuest || !options.user ? 'inline-block' : 'none'
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

  function renderRowLinksHtml(rows) {
    return rows
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
  }
  function initHomeRecent() {
    var el = document.getElementById('ms12-home-recent')
    if (!el) return
    fetch('/api/ms12/meetings/my?limit=5', { credentials: 'include' })
      .then(function (r) {
        return r.json()
      })
      .then(function (j) {
        var apiRows = j && j.success && Array.isArray(j.data) ? j.data : null
        if (apiRows === null) {
          var loc = mergeMeetingRows([])
          if (loc.length) {
            el.innerHTML = renderRowLinksHtml(loc.slice(0, 5))
            return
          }
          el.textContent = '서버 목록을 불러오지 못했습니다. 이 브라우저에만 저장한 회의가 있으면 아래에 나타납니다.'
          return
        }
        for (var i = 0; i < apiRows.length; i++) {
          try {
            recordMeetingLocal(apiRows[i])
          } catch (e) {}
        }
        var rows = mergeMeetingRows(apiRows).slice(0, 5)
        if (!rows.length) {
          el.textContent = '최근 참여·개설한 회의가 아직 없습니다. 회의를 시작하거나 입장해 보세요.'
          return
        }
        el.innerHTML = renderRowLinksHtml(rows)
      })
      .catch(function () {
        var loc2 = mergeMeetingRows([])
        if (loc2.length) {
          el.innerHTML = renderRowLinksHtml(loc2.slice(0, 5))
        } else {
          el.textContent = '서버에 연결할 수 없을 때는 이 기기에 저장한 목록이 여기에 표시됩니다. 아직 로컬 기록이 없습니다.'
        }
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
      var dn = (fd.get('displayName') || '').toString().trim()
      var payload = { title: title }
      if (dn) payload.displayName = dn
      fetch('/api/ms12/meetings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          if (j && j.success && j.data && j.data.id) {
            try {
              recordMeetingLocal(j.data)
            } catch (e) {}
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
      var dn2 = (fd.get('displayName') || '').toString().trim()
      var joinBody = { meetingCode: code }
      if (dn2) joinBody.displayName = dn2
      fetch('/api/ms12/meetings/join', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(joinBody),
      })
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          if (j && j.success && j.data && j.data.id) {
            try {
              recordMeetingLocal(j.data)
            } catch (e) {}
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
        var raw = j && j.success && Array.isArray(j.data) ? j.data : null
        if (raw === null) {
          var loc = mergeMeetingRows([])
          if (!loc.length) {
            el.textContent = '목록을 불러올 수 없습니다. (로컬에도 이전 기록이 없으면 비어 있을 수 있습니다.)'
            return
          }
          raw = loc
        }
        for (var k = 0; k < raw.length; k++) {
          try {
            recordMeetingLocal(raw[k])
          } catch (e) {}
        }
        var rows = mergeMeetingRows(raw)
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
        var loc2 = mergeMeetingRows([])
        if (loc2.length) {
          el.innerHTML = loc2
            .map(function (row) {
              return (
                '<div style="padding:0.5rem 0;border-bottom:1px solid rgb(241 245 249)"><strong>' +
                (row.title || '제목 없음') +
                '</strong> <span class="ms12-muted" style="font-size:0.8rem">(이 브라우저)</span><br/><span class="ms12-p" style="font-size:0.85rem">코드: ' +
                (row.meetingCode || '—') +
                '</span><br/><a class="ms12-btn" style="margin-top:0.4rem" href="/app/meeting/' +
                encodeURIComponent(row.id) +
                '">회의실 열기</a></div>'
              )
            })
            .join('')
        } else {
          el.textContent = '오프라인이거나 서버에 연결할 수 없을 때, 이 기기에 저장된 기록이 없으면 비어 있을 수 있습니다.'
        }
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
    var localRow = (readStore().byId || {})[id] || null

    try {
      loadRoomDraftToDom(id)
    } catch (e) {}
    if (localRow) {
      for (var li = 0; li < titleEls.length; li++) {
        if (localRow.title) titleEls[li].textContent = localRow.title
      }
      for (var lj = 0; lj < codeEls.length; lj++) {
        if (localRow.meetingCode) codeEls[lj].textContent = localRow.meetingCode
      }
    }
    var noteEl = function () {
      return [
        document.getElementById('ms12-room-notes'),
        document.getElementById('ms12-room-transcript'),
        document.getElementById('ms12-room-summary'),
      ]
    }
    var debT = null
    function onDraftInput() {
      if (debT) clearTimeout(debT)
      debT = setTimeout(function () {
        saveRoomDraft(id)
      }, 500)
    }
    noteEl()
      .filter(Boolean)
      .forEach(function (el) {
        el.addEventListener('input', onDraftInput)
        el.addEventListener('change', onDraftInput)
      })
    var exp = document.getElementById('ms12-room-export')
    if (exp) {
      exp.addEventListener('click', function () {
        try {
          saveRoomDraft(id)
        } catch (e) {}
        var st = readStore()
        var pack = (st.byId && st.byId[id]) || {}
        var name = (pack.title || 'meeting') + '-' + id.slice(0, 8) + '.json'
        var blob = new Blob(
          [
            JSON.stringify(
              {
                version: 1,
                meetingId: id,
                title: pack.title,
                meetingCode: pack.meetingCode,
                savedAt: new Date().toISOString(),
                notes: pack.notes || '',
                transcript: pack.transcript || '',
                summary: pack.summary || '',
              },
              null,
              2
            ),
          ],
          { type: 'application/json' }
        )
        var a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = name
        a.click()
        setTimeout(function () {
          try {
            URL.revokeObjectURL(a.href)
          } catch (e) {}
        }, 2000)
      })
    }
    var flush = document.getElementById('ms12-room-flush')
    if (flush) {
      flush.addEventListener('click', function () {
        try {
          saveRoomDraft(id)
        } catch (e) {}
        var ln = document.getElementById('ms12-room-local-note')
        if (ln) {
          ln.textContent = '이 브라우저에 저장했습니다. (' + new Date().toLocaleTimeString() + ')'
        }
      })
    }

    fetch('/api/ms12/meetings/' + encodeURIComponent(id), { credentials: 'include' })
      .then(function (r) {
        return r.json().then(function (j) {
          return { status: r.status, j: j }
        })
      })
      .then(function (o) {
        if (o.status === 403) {
          if (localRow) {
            showRoomErr(
              '이 방에 서버 기준으로는 아직 입장 기록이 없을 수 있습니다. 이 브라우저에 저장해 둔 메모·전사·요약은 그대로 표시했습니다. 코드로「회의 입장」하면 동기화됩니다.'
            )
          } else {
            showRoomErr('이 방의 참석자만 내용을 볼 수 있습니다. 먼저「회의 입장」에서 코드로 입장하세요.')
            for (var t = 0; t < titleEls.length; t++) titleEls[t].textContent = '—'
            for (var c = 0; c < codeEls.length; c++) codeEls[c].textContent = '—'
          }
          return { ok: false, j: null }
        }
        if (!o.j || !o.j.success || !o.j.data) {
          if (localRow) {
            showRoomErr('서버 응답이 없어 이 기기에 저장된 정보만 표시 중입니다.')
          } else {
            showRoomErr((o.j && o.j.error) || '회의를 불러올 수 없습니다.')
          }
          return { ok: false, j: null }
        }
        var d = o.j.data
        try {
          recordMeetingLocal(d)
        } catch (e) {}
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
        if (localRow) {
          showRoomErr('네트워크가 불안정해 이 기기에 저장된 내용만 사용합니다.')
        } else {
          showRoomErr('요청이 실패했습니다.')
        }
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

    applyShell('loading', {})
    var o = await fetchMeOnce()
    var j = o && o.json
    pageMode = (j && j.authMode) || getPageAuthMode()

    var authed = isAuthedFromMe(j)
    if (hadOauth && !authed) {
      authLog('oauth_sync retry /api/auth/me')
      var delays = [40, 100, 200, 400, 700]
      for (var ri = 0; ri < delays.length; ri++) {
        await sleep(delays[ri])
        o = await fetchMeOnce()
        j = o && o.json
        authed = isAuthedFromMe(j)
        if (authed) break
        pageMode = (j && j.authMode) || pageMode
      }
    }
    var openMode = isOpenAuthMode(pageMode)
    if (openMode && !authed && (o.status === 0 || (o.status >= 500 && o.status < 600))) {
      var lid = ensureLocalOnlyActorId()
      j = {
        success: true,
        data: null,
        authMode: pageMode,
        actor: { type: 'guest', id: lid, source: 'offline' },
      }
      authed = false
      authLog('me failed or offline; continue as local demo_guest', lid)
    }
    var user = authed && j && j.data ? j.data : null
    var isGuest = openMode && !authed
    var demoMode = pageMode === 'demo'
    if (j && j.actor && j.actor.type === 'guest') {
      try {
        localStorage.setItem('ms12_actor', JSON.stringify(j.actor))
      } catch (e) {}
    }
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
        try {
          var origin2 = window.location && window.location.origin
          if (origin2 && origin2.indexOf('http') === 0) {
            location.replace(origin2 + '/app' + (window.location.search || ''))
          } else {
            location.replace('/app' + (window.location.search || ''))
          }
        } catch (e) {
          location.replace('/app' + (window.location.search || ''))
        }
        return
      }
    }
    if (hadOauth) {
      stripOauthParam()
    }

    var showApp = openMode || authed
    if (pageMode === 'required' && !authed) {
      var r0 = getRoute()
      if (r0 === 'meeting' || r0 === 'home' || r0 === 'meeting_new' || r0 === 'join' || r0 === 'records' || r0 === 'meeting_room') {
        applyNextToOAuthLinks()
      }
      applyShell('login', {})
      return
    }
    if (showApp) {
      applyShell('app', { user: user, isGuest: !!isGuest, demoMode: demoMode })
      wireLogout()
      initAuthedPage()
    } else {
      applyShell('login', {})
    }
    authLog('no other auto redirect', routePath())
  }

  function safeRun() {
    return run().catch(function (e) {
      authLog('route=' + routePath(), 'error=', String((e && e.message) || e))
      if (getPageAuthMode() === 'required') {
        applyShell('login', {})
      } else {
        var dm = getPageAuthMode() === 'demo'
        try {
          ensureLocalOnlyActorId()
        } catch (err) {}
        applyShell('app', { user: null, isGuest: true, demoMode: dm })
        initAuthedPage()
      }
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', safeRun)
  } else {
    safeRun()
  }
})()
