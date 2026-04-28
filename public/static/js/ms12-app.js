/**
 * MS12 /app* — 공개 모드(/api/auth/me), 방문 사용자 표시.
 * oauth_sync=1 쿼리는 제거 후 회의 허브 유지.
 * 로컬(ms12_demo_v1)에 회의·메모·전사·요약 백업.
 */
;(function () {
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('unhandledrejection', function (ev) {
      var r = ev && ev.reason
      if (
        r &&
        typeof r === 'object' &&
        r.code === 403 &&
        r.httpError === false &&
        (r.httpStatus === 200 || r.httpStatus === 0)
      ) {
        try {
          ev.preventDefault()
        } catch (e) {}
      }
    })
  }
  var pageMode = 'demo'
  /** run() 확정 후 UI 표시 이름 등에 사용 */
  var _lastIsAuthed = false
  /** 회의실 문서 초안 유형(탭) — saveRoomDraft에서 draftByKind에 반영 */
  var g_ms12DraftKind = 'report_int'
  var g_ms12DraftMeeting = ''

  var _nativeFetch = typeof fetch === 'function' ? fetch : null
  /** 동일 출처 API — 쿠키 포함·응답 캐시 방지(no-store) */
  function ms12Fetch(input, init) {
    if (!_nativeFetch) {
      return Promise.reject(new Error('fetch unavailable'))
    }
    init = init || {}
    var o = {}
    for (var k in init) {
      if (Object.prototype.hasOwnProperty.call(init, k)) o[k] = init[k]
    }
    o.credentials = 'include'
    if (o.cache === undefined) o.cache = 'no-store'
    return _nativeFetch(input, o)
  }

  function ms12DateTitleStem() {
    var d = new Date()
    var y = String(d.getFullYear()).slice(-2)
    var mo = ('0' + (d.getMonth() + 1)).slice(-2)
    var da = ('0' + d.getDate()).slice(-2)
    return y + mo + da
  }
  /** 같은 날 새 회의를 만들 때마다 260428 회의 → 260428-1 회의 식으로 증가 */
  function ms12NextMeetingTitleForToday() {
    var dayKey = ms12DateTitleStem()
    var key = 'ms12_title_seq_' + dayKey
    var seq = 0
    try {
      seq = parseInt(sessionStorage.getItem(key) || '0', 10) || 0
    } catch (e) {}
    seq += 1
    try {
      sessionStorage.setItem(key, String(seq))
    } catch (e2) {}
    if (seq <= 1) return dayKey + ' 회의'
    return dayKey + '-' + (seq - 1) + ' 회의'
  }
  /** 방마다 한 번만 할당한 서버 저장용 제목(기존 «새 회의» 대체용) */
  function ms12SuggestedTitleOncePerRoom(roomId) {
    var k = 'ms12_room_save_title_' + String(roomId || '')
    try {
      var ex = sessionStorage.getItem(k)
      if (ex) return ex
      var t = ms12NextMeetingTitleForToday()
      sessionStorage.setItem(k, t)
      return t
    } catch (e) {
      return ms12DateTitleStem() + ' 회의'
    }
  }
  function ms12DisplayTitle(roomId, rawTitle) {
    var t = rawTitle != null ? String(rawTitle).trim() : ''
    if (!t || t === '새 회의') return ms12SuggestedTitleOncePerRoom(roomId)
    return t
  }

  var MS12_CAT_STORE = 'ms12_category_user_v1'
  var MS12_CAT_DEFAULTS = ['일반', '운영회의', '기획', '사업', '상담']
  function ms12CategoryListMerged() {
    var raw = []
    try {
      raw = JSON.parse(localStorage.getItem(MS12_CAT_STORE) || '[]')
    } catch (e) {}
    if (!Array.isArray(raw)) raw = []
    var out = MS12_CAT_DEFAULTS.slice()
    for (var i = 0; i < raw.length; i++) {
      var x = raw[i] != null ? String(raw[i]).trim() : ''
      if (x && out.indexOf(x) < 0) out.push(x)
    }
    return out
  }
  function ms12CategoryPersistExtra(name) {
    var n = String(name || '').trim()
    if (!n || MS12_CAT_DEFAULTS.indexOf(n) >= 0) return
    var cur = []
    try {
      cur = JSON.parse(localStorage.getItem(MS12_CAT_STORE) || '[]')
    } catch (e2) {}
    if (!Array.isArray(cur)) cur = []
    if (cur.indexOf(n) >= 0) return
    cur.push(n)
    try {
      localStorage.setItem(MS12_CAT_STORE, JSON.stringify(cur))
    } catch (e3) {}
  }
  function ms12FillCategoryDatalist(dl, list) {
    if (!dl) return
    dl.innerHTML = ''
    for (var i = 0; i < list.length; i++) {
      var o = document.createElement('option')
      o.value = list[i]
      dl.appendChild(o)
    }
  }
  function initMeetingCategoryPickers() {
    var inp = document.getElementById('ms12-save-category')
    var wrap = document.getElementById('ms12-cat-chip-wrap')
    var dl = document.getElementById('ms12-cat-dl')
    var addIn = document.getElementById('ms12-save-category-add-input')
    var addBtn = document.getElementById('ms12-save-category-add-btn')
    if (!inp || !wrap) return
    function paint() {
      var list = ms12CategoryListMerged()
      ms12FillCategoryDatalist(dl, list)
      var cur = String(inp.value || '').trim()
      wrap.innerHTML = ''
      for (var ci = 0; ci < list.length; ci++) {
        ;(function (label) {
          var b = document.createElement('button')
          b.type = 'button'
          b.className = 'ms12-cat-chip' + (cur === label ? ' ms12-cat-chip--on' : '')
          b.textContent = label
          b.addEventListener('click', function () {
            inp.value = label
            paint()
          })
        })(list[ci])
      }
    }
    inp.addEventListener('input', paint)
    inp.addEventListener('change', paint)
    function addOne() {
      var v = addIn && addIn.value ? String(addIn.value).trim() : ''
      if (!v) return
      ms12CategoryPersistExtra(v)
      inp.value = v
      if (addIn) addIn.value = ''
      paint()
    }
    if (addBtn) addBtn.addEventListener('click', addOne)
    paint()
  }

  function isOpenAuthMode(m) {
    return (
      m === 'public' ||
      m === 'optional' ||
      m === 'disabled' ||
      m === 'demo' ||
      m === 'required'
    )
  }

  var activeStoreKey = 'ms12_demo_v1'
  function actorKeyFromMe(j) {
    if (j && j.data && j.data != null && typeof j.data === 'object' && !Array.isArray(j.data)) {
      if (j.data.type === 'public') {
        return 'g:' + ensureLocalOnlyActorId()
      }
      if (j.data.type === 'guest' && j.data.id != null && j.data.id !== '') {
        return 'g:' + String(j.data.id)
      }
      var dId = j.data.id
      if (dId != null && dId !== '') {
        var n = typeof dId === 'number' && isFinite(dId) ? dId : parseInt(String(dId), 10)
        if (typeof n === 'number' && isFinite(n) && n >= 1) return 'u:' + String(n)
      }
    }
    if (j && j.actor && j.actor.type === 'public' && j.actor.id) return 'g:' + ensureLocalOnlyActorId()
    if (j && j.actor && j.actor.type === 'user' && j.actor.id) return 'u:' + j.actor.id
    return 'g:' + ensureLocalOnlyActorId()
  }
  function migrateLegacyStore() {
    try {
      var leg = localStorage.getItem('ms12_demo_v1')
      if (!leg) return
      if (localStorage.getItem(activeStoreKey)) return
      localStorage.setItem(activeStoreKey, leg)
    } catch (e) {}
  }
  function readStore() {
    try {
      var s = localStorage.getItem(activeStoreKey)
      if (!s) return { meetings: [], byId: {}, lastWorkId: null, lastWorkAt: null }
      var o = JSON.parse(s)
      if (!o || typeof o !== 'object') return { meetings: [], byId: {}, lastWorkId: null, lastWorkAt: null }
      if (!o.byId) o.byId = {}
      if (!o.meetings) o.meetings = []
      return o
    } catch (e) {
      return { meetings: [], byId: {}, lastWorkId: null, lastWorkAt: null }
    }
  }
  function writeStore(st) {
    try {
      localStorage.setItem(activeStoreKey, JSON.stringify(st))
    } catch (e) {}
  }
  /** 서버 randomId(9byte hex) / randomMeetingCode 와 동일 규칙 — 로컬 전용 열기용 */
  function randomHexMeetingId() {
    var u = new Uint8Array(9)
    try {
      crypto.getRandomValues(u)
    } catch (e) {
      u = new Uint8Array(9)
      for (var i = 0; i < 9; i++) u[i] = (Math.random() * 256) | 0
    }
    return Array.from(u, function (b) {
      return b.toString(16).padStart(2, '0')
    }).join('')
  }
  var CODE_ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  function randomMeetingCode8() {
    var u = new Uint8Array(8)
    try {
      crypto.getRandomValues(u)
    } catch (e) {
      for (var j = 0; j < 8; j++) u[j] = (Math.random() * 256) | 0
    }
    var s = ''
    for (var k = 0; k < 8; k++) s += CODE_ALPH[u[k] % CODE_ALPH.length]
    return s
  }
  /** POST 실패·오류 시에도 회의 화면은 반드시 연다(로컬만) */
  function openMeetingLocalOnly(title, displayName) {
    var id = randomHexMeetingId()
    var code = randomMeetingCode8()
    var role = (displayName && String(displayName).trim()) || '이 기기(로컬)'
    try {
      recordMeetingLocal({ id: id, title: title, meetingCode: code, myRole: role })
    } catch (e) {}
    try {
      sessionStorage.setItem('ms12_local_only', '1')
    } catch (e) {}
    window.location.href = '/app/meeting/' + encodeURIComponent(id)
  }

  function recordMeetingLocal(d) {
    if (!d || !d.id) return
    try {
      var st = readStore()
      var prev = st.byId[d.id] || {}
      var now = new Date().toISOString()
      st.byId[d.id] = {
        id: d.id,
        title: d.title != null ? d.title : prev.title,
        meetingCode: d.meetingCode != null ? d.meetingCode : prev.meetingCode,
        myRole: d.myRole != null ? d.myRole : prev.myRole,
        updatedAt: now,
        notes: prev.notes,
        transcript: prev.transcript,
        summary: prev.summary,
        actionItemsLocal: prev.actionItemsLocal
      }
      st.lastWorkId = d.id
      st.lastWorkAt = now
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
      localStorage.setItem('ms12_local_actor', JSON.stringify({ type: 'public', id: id, source: 'local' }))
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
  function combinedSummaryFromDom() {
    var s0 = document.getElementById('ms12-room-summary-basic')
    var s1 = document.getElementById('ms12-room-summary-action')
    var s2 = document.getElementById('ms12-room-summary-report')
    var b = s0 ? String(s0.value || '').trim() : ''
    var a = s1 ? String(s1.value || '').trim() : ''
    var r = s2 ? String(s2.value || '').trim() : ''
    var parts = []
    if (b) parts.push('## 기본 요약\n' + (s0 ? s0.value : ''))
    if (a) parts.push('## 실행 요약\n' + (s1 ? s1.value : ''))
    if (r) parts.push('## 보고 요약\n' + (s2 ? s2.value : ''))
    return parts.join('\n\n')
  }

  function saveRoomDraft(meetingId) {
    if (!meetingId) return
    var n = document.getElementById('ms12-room-notes')
    var tr = document.getElementById('ms12-room-transcript')
    var sb = document.getElementById('ms12-room-summary-basic')
    var sa = document.getElementById('ms12-room-summary-action')
    var sr = document.getElementById('ms12-room-summary-report')
    var st = readStore()
    if (!st.byId[meetingId]) st.byId[meetingId] = { id: meetingId }
    st.byId[meetingId].notes = n ? n.value : (st.byId[meetingId].notes || '')
    st.byId[meetingId].transcript = tr ? tr.value : (st.byId[meetingId].transcript || '')
    if (sb) st.byId[meetingId].summaryBasic = sb.value
    if (sa) st.byId[meetingId].summaryAction = sa.value
    if (sr) st.byId[meetingId].summaryReport = sr.value
    if (st.byId[meetingId].summary != null && st.byId[meetingId].summary && !st.byId[meetingId].summaryBasic) {
      st.byId[meetingId].summaryBasic = st.byId[meetingId].summary
    }
    st.byId[meetingId].summary = combinedSummaryFromDom()
    var sbAi = document.getElementById('ms12-ai-sug-basic')
    var saAi = document.getElementById('ms12-ai-sug-action')
    var srAi = document.getElementById('ms12-ai-sug-report')
    if (sbAi) st.byId[meetingId].aiSugBasic = sbAi.value
    if (saAi) st.byId[meetingId].aiSugAction = saAi.value
    if (srAi) st.byId[meetingId].aiSugReport = srAi.value
    var aDraft = document.getElementById('ms12-ai-action-draft')
    if (aDraft) st.byId[meetingId].actionItemsDraft = aDraft.value
    var dout = document.getElementById('ms12-room-draft-out')
    if (dout && g_ms12DraftMeeting === meetingId) {
      st.byId[meetingId].draftByKind = st.byId[meetingId].draftByKind || {}
      st.byId[meetingId].draftByKind[g_ms12DraftKind] = dout.value
    }
    var t = new Date().toISOString()
    st.byId[meetingId].roomUpdatedAt = t
    st.byId[meetingId].updatedAt = t
    st.lastWorkId = meetingId
    st.lastWorkAt = t
    writeStore(st)
  }
  function loadRoomDraftToDom(meetingId) {
    var st = readStore()
    var x = st.byId[meetingId] || {}
    var n = document.getElementById('ms12-room-notes')
    var tr = document.getElementById('ms12-room-transcript')
    var sb = document.getElementById('ms12-room-summary-basic')
    var sa = document.getElementById('ms12-room-summary-action')
    var sr = document.getElementById('ms12-room-summary-report')
    if (n && x.notes != null) n.value = x.notes
    if (tr && x.transcript != null) tr.value = x.transcript
    if (sb) {
      if (x.summaryBasic != null) sb.value = x.summaryBasic
      else if (x.summary != null) sb.value = x.summary
    }
    if (sa && x.summaryAction != null) sa.value = x.summaryAction
    if (sr && x.summaryReport != null) sr.value = x.summaryReport
  }

  function authLog() {
    try {
      if (typeof localStorage === 'undefined' || localStorage.getItem('ms12_debug') !== '1') return
    } catch (e) {
      return
    }
    var a = ['[ms12]'].concat(
      Array.prototype.slice.call(arguments).map(function (x) {
        return x === null || x === undefined ? String(x) : x
      })
    )
    if (typeof console !== 'undefined' && console.log) {
      console.log(a.join(' '))
    }
  }

  function jsonFromResponse(r) {
    if (!r) return Promise.resolve(null)
    try {
      if (typeof r.json !== 'function') return Promise.resolve(null)
    } catch (e) {
      return Promise.resolve(null)
    }
    return r.json().catch(function () {
      return null
    })
  }

  /** 텍스트 노드 클릭 시 target 에 closest 없음 → 부모 요소로 보정 */
  function clickTargetElement(ev) {
    var t = ev && ev.target
    if (!t) return null
    return t.nodeType === 1 ? t : t.parentElement
  }

  function getRoute() {
    var b = document.body
    var attr = b && b.getAttribute('data-ms12-route')
    if (attr) return attr
    var p = (typeof location !== 'undefined' && location.pathname) || ''
    p = p.replace(/\/$/, '') || '/'
    if (p === '/' || p === '/app') return 'entry'
    if (p === '/app/desk') return 'desk'
    if (p === '/app/hub' || p === '/app/home') return 'hub'
    if (p === '/app/meeting/new') return 'meeting_new'
    if (p === '/app/join') return 'join'
    if (p === '/app/records') return 'records'
    if (p === '/app/library') return 'library'
    if (p === '/app/archive') return 'archive'
    if (p === '/app/announcements') return 'announcements'
    if (p.indexOf('/app/announcements/') === 0) return 'announcement_detail'
    if (p.indexOf('/app/meeting-record/') === 0) return 'meeting_record'
    if (p === '/app/meeting') return 'meeting'
    if (p.indexOf('/app/meeting/') === 0) return 'meeting_room'
    return 'hub'
  }

  function routePath() {
    return typeof location !== 'undefined' && location.pathname ? location.pathname : '/app'
  }

  /**
   * 계정 로그인 없음 — 항상 비세션(표시만 방문 사용자).
   */
  function isAuthedFromMe(json) {
    return false
  }

  /** 화면 표시 이름 — 서버 type public/guest → 방문 사용자 */
  function displayNameFromUser(u) {
    if (!u || typeof u !== 'object') return '방문 사용자'
    if (u.type === 'guest' || u.type === 'public')
      return (u.name != null && String(u.name).trim()) || '방문 사용자'
    var name = (u.name != null && String(u.name).trim()) || ''
    if (name) return name
    var em = (u.email != null && String(u.email).trim()) || ''
    if (em) {
      var at = em.indexOf('@')
      return at > 0 ? em.slice(0, at) : em
    }
    var co = (u.company_name != null && String(u.company_name).trim()) || ''
    if (co) return co
    return '방문 사용자'
  }

  function applyNextToOAuthLinks() {
    var next = new URLSearchParams(window.location.search || '').get('next')
    if (!next) return
    if (next.indexOf('..') >= 0 || !next.startsWith('/')) return
    var list = document.querySelectorAll('a[href^="/api/auth/kakao/login"],a[href^="/api/auth/google/login"]')
    for (var i = 0; i < list.length; i++) {
      var el = list[i]
      var h = el.getAttribute('href') || ''
      try {
        var u = new URL(h, typeof location !== 'undefined' ? location.origin : 'https://localhost')
        u.searchParams.set('next', next)
        el.setAttribute('href', u.pathname + u.search)
      } catch (e) {
        if (h.indexOf('next=') < 0) {
          el.setAttribute('href', h + (h.indexOf('?') >= 0 ? '&' : '?') + 'next=' + encodeURIComponent(next))
        }
      }
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
        r = await ms12Fetch('/api/auth/me', fetchOpts)
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
        r = await ms12Fetch('/api/auth/me', Object.assign({}, fetchOpts, { signal: ctrl.signal }))
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
    return m || 'demo'
  }

  function applyShell(phase, options) {
    options = options || {}
    var w = document.getElementById('ms12-wait')
    var g = document.getElementById('ms12-guest')
    var a = document.getElementById('ms12-authed')
    authLog('route=' + getRoute(), 'shell=' + phase, options)
    if (w) w.style.display = phase === 'loading' ? 'block' : 'none'
    if (g) g.style.display = phase === 'login' ? 'block' : 'none'
    if (a) a.style.display = phase === 'app' ? 'block' : 'none'
    var demoMode = !!options.demoMode
    var sessionAuthed = !!options.sessionAuthed
    var guestId = !!options.guestIdentified
    var loggedIn = sessionAuthed
    var nameText = '방문 사용자'
    if (loggedIn) {
      nameText = displayNameFromUser(options.user) || (options.user && options.user.name) || '방문 사용자'
    } else if (guestId && options.user) {
      nameText = displayNameFromUser(options.user)
    } else if (options.isGuest) {
      nameText = '방문 사용자'
    }
    var nodes = document.querySelectorAll('.js-ms12-user-name')
    for (var n = 0; n < nodes.length; n++) {
      nodes[n].textContent = nameText
    }
    var sufs = document.querySelectorAll('.js-ms12-user-suffix')
    for (var s = 0; s < sufs.length; s++) {
      sufs[s].textContent = loggedIn || guestId || !options.isGuest ? '님' : ''
    }
    var badges = document.querySelectorAll('.js-ms12-badge')
    for (var b = 0; b < badges.length; b++) {
      badges[b].textContent = '방문 사용자'
      badges[b].setAttribute('style', 'background:rgb(241 245 249);color:rgb(71 85 105)')
    }
    var dets = document.querySelectorAll('.ms12-login-aside details')
    var lix = 0
    for (lix = 0; lix < dets.length; lix++) {
      dets[lix].style.display = 'none'
    }
    var ll = document.querySelectorAll('.ms12-js-logout-line')
    for (var lj = 0; lj < ll.length; lj++) {
      ll[lj].style.display = 'none'
    }
    var lout = document.querySelectorAll('[data-ms12-logout], #ms12-logout')
    for (var lo = 0; lo < lout.length; lo++) {
      lout[lo].style.display = 'none'
    }
    var lnk = document.querySelectorAll('[data-ms12-login-lnk]')
    for (var li = 0; li < lnk.length; li++) {
      lnk[li].style.display = 'none'
    }
    var entryHost = document.getElementById('ms12-entry-login')
    if (entryHost) {
      entryHost.removeAttribute('data-ms12-entry-session')
      var oaH = document.querySelector('.ms12-entry-oauth-btns')
      if (oaH) oaH.style.display = 'none'
    }
    try {
      document.body.setAttribute('data-ms12-logged-in', '0')
      document.body.setAttribute('data-ms12-guest-identified', guestId ? '1' : '0')
    } catch (e) {}
    var elg = document.getElementById('ms12-logout')
    if (elg) elg.style.display = 'none'
  }

  function ensureMs12LogoutButton() {
    var btn = document.getElementById('ms12-logout')
    if (!btn) {
      btn = document.createElement('button')
      btn.type = 'button'
      btn.id = 'ms12-logout'
      btn.setAttribute('data-ms12-logout', '1')
      btn.setAttribute('aria-label', '로그아웃')
      btn.textContent = '로그아웃'
      btn.className = 'ms12-btn'
      btn.style.cssText = 'margin-left:0.45rem;vertical-align:baseline;font-size:0.88rem;'
      var nameEl = document.querySelector('.js-ms12-user-name')
      if (nameEl && nameEl.parentNode) {
        nameEl.parentNode.insertBefore(btn, nameEl.nextSibling)
      } else {
        var host = document.getElementById('ms12-authed') || document.body
        host.insertBefore(btn, host.firstChild)
      }
    }
    btn.style.display = 'inline-block'
  }

  function wireLogout() {
    var btns = document.querySelectorAll('[data-ms12-logout], #ms12-logout')
    for (var i = 0; i < btns.length; i++) {
      ;(function (btn) {
        if (btn.getAttribute('data-ms12-logout-wired') === '1') return
        btn.setAttribute('data-ms12-logout-wired', '1')
        btn.addEventListener('click', function () {
          ms12Fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
            .then(function (r) {
              try {
                localStorage.removeItem('user')
              } catch (e) {}
              try {
                localStorage.removeItem('ms12_actor')
              } catch (e2) {}
              if (r && r.ok) {
                if (typeof location !== 'undefined' && location.reload) {
                  location.reload()
                } else {
                  window.location.href = '/app/meeting'
                }
                return
              }
              if (typeof location !== 'undefined' && location.reload) {
                location.reload()
              } else {
                window.location.href = '/app/meeting'
              }
            })
            .catch(function () {
              if (typeof location !== 'undefined' && location.reload) {
                location.reload()
              } else {
                window.location.href = '/app/meeting'
              }
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
  function initResumeBlock() {
    var el = document.getElementById('ms12-resume')
    if (!el) return
    var st = readStore()
    var id = st.lastWorkId
    var row = id && st.byId && st.byId[id] ? st.byId[id] : null
    if (!row || !row.id) {
      el.style.display = 'none'
      el.innerHTML = ''
      return
    }
    el.style.display = 'block'
    el.innerHTML =
      '<span style="font-size:0.88rem">최근 작업</span><br/><strong>' +
      (row.title || '회의') +
      '</strong> · 코드 ' +
      (row.meetingCode || '—') +
      ' · <a class="text-indigo-600 underline font-medium" href="/app/meeting/' +
      encodeURIComponent(row.id) +
      '">이어서 열기</a>'
  }

  function initDeskHome() {
    var tEl = document.getElementById('ms12-dsk-time')
    var dEl = document.getElementById('ms12-dsk-date')
    function tick() {
      var d = new Date()
      if (tEl) {
        tEl.textContent = d.toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      }
      if (dEl) {
        dEl.textContent = d.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        })
      }
    }
    tick()
    setInterval(tick, 20000)
    initHomeRecent()
  }

  function initHomeRecent() {
    var el = document.getElementById('ms12-home-recent')
    if (!el) return
    initResumeBlock()
    ms12Fetch('/api/ms12/meetings/my?limit=5', { credentials: 'include' })
      .then(function (r) {
        return jsonFromResponse(r)
      })
      .then(function (j) {
        var apiRows = j && j.success && Array.isArray(j.data) ? j.data : null
        if (apiRows === null) {
          var loc = mergeMeetingRows([])
          if (loc.length) {
            el.innerHTML = renderRowLinksHtml(loc.slice(0, 5))
            initResumeBlock()
            return
          }
          el.textContent = '서버 목록을 불러오지 못했습니다. 이 브라우저에만 저장한 회의가 있으면 아래에 나타납니다.'
          initResumeBlock()
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
          initResumeBlock()
          return
        }
        el.innerHTML = renderRowLinksHtml(rows)
        initResumeBlock()
      })
      .catch(function () {
        var loc2 = mergeMeetingRows([])
        if (loc2.length) {
          el.innerHTML = renderRowLinksHtml(loc2.slice(0, 5))
        } else {
          el.textContent = '서버에 연결할 수 없을 때는 이 기기에 저장한 목록이 여기에 표시됩니다. 아직 로컬 기록이 없습니다.'
        }
        initResumeBlock()
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
      ms12Fetch('/api/ms12/meetings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(function (r) {
          return jsonFromResponse(r).then(function (j) {
            return { ok: r.ok, j: j }
          })
        })
        .then(function (o) {
          var j = o && o.j
          if (j && j.success && j.data && j.data.id) {
            try {
              recordMeetingLocal(j.data)
            } catch (e) {}
            window.location.href = '/app/meeting/' + encodeURIComponent(j.data.id)
            return
          }
          authLog('create meeting: server did not return id, open local only', (j && j.error) || '')
          openMeetingLocalOnly(title, dn)
        })
        .catch(function (err) {
          authLog('create meeting: fetch error, open local only', err)
          openMeetingLocalOnly(title, dn)
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
      ms12Fetch('/api/ms12/meetings/join', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(joinBody),
      })
        .then(function (r) {
          return jsonFromResponse(r)
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
    ms12Fetch('/api/ms12/meetings/my?limit=50', { credentials: 'include' })
      .then(function (r) {
        return jsonFromResponse(r)
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
  var roomServerOk = false

  function localActionId() {
    return (
      'local_' +
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, '').slice(0, 20)
        : String(Date.now()) + '_' + Math.random().toString(36).slice(2, 9))
    )
  }

  function getLocalActionItemsOnly(mid) {
    var st = readStore()
    var list = (st.byId && st.byId[mid] && st.byId[mid].actionItemsLocal) || []
    return Array.isArray(list) ? list : []
  }

  function setLocalActionItemsOnly(mid, items) {
    var st = readStore()
    if (!st.byId[mid]) st.byId[mid] = { id: mid }
    st.byId[mid].actionItemsLocal = items
    writeStore(st)
  }

  function normalizeItem(it) {
    if (!it) return null
    return {
      id: it.id,
      title: (it.title || '').trim() || '—',
      taskDetail: (it.taskDetail != null && it.taskDetail !== '' ? it.taskDetail : it.task_detail) || '',
      assignee: (it.assignee || '').trim(),
      dueAt: (it.dueAt != null && it.dueAt !== '') ? String(it.dueAt) : (it.due_at != null ? String(it.due_at) : ''),
      status: it.status === 'done' || it.status === 'open' ? it.status : 'open',
      priority: (it.priority || 'normal') + '',
      itemCategory: (it.itemCategory || it.item_category || 'required') + '',
      _local: !!it._local
    }
  }

  function mergeActionLists(server, stored) {
    var s = (server || []).map(normalizeItem).filter(Boolean)
    var loc = (stored || []).map(normalizeItem).filter(function (x) {
      return x && x._local
    })
    for (var j = 0; j < loc.length; j++) s.push(loc[j])
    return s
  }

  function formatDue(d) {
    if (!d) return ''
    var t = String(d)
    if (t.length >= 10) return t.slice(0, 10)
    return t
  }

  function renderActionList(el, items, onToggle, options) {
    if (!el) return
    var roomId = options && options.roomId ? String(options.roomId) : ''
    var rows = (items || []).filter(Boolean)
    if (!rows.length) {
      el.innerHTML = '<span class="ms12-muted" style="font-size:0.88rem">아직 없습니다. 아래에 추가하거나 AI 초안을 반영하세요.</span>'
      return
    }
    el.innerHTML = rows
      .map(function (it) {
        var iid = String(it.id).replace(/"/g, '')
        var loc = it._local ? '1' : '0'
        var done = it.status === 'done'
        if (done) {
          return (
            '<div class="ms12-action-row" style="margin:0.35rem 0;padding-bottom:0.35rem;border-bottom:1px solid rgb(241 245 249)">' +
            '<span style="text-decoration:line-through;opacity:0.75">' +
            escapeForHtml(it.title) +
            '</span>' +
            (it.taskDetail
              ? ' <span class="ms12-muted" style="font-size:0.8rem">(' +
                escapeForHtml(
                  String(it.taskDetail).length > 48
                    ? String(it.taskDetail).slice(0, 45) + '…'
                    : String(it.taskDetail)
                ) +
                ')</span>'
              : '') +
            '</div>'
          )
        }
        return (
          '<div class="ms12-action-row" style="margin:0.4rem 0;padding-bottom:0.4rem;border-bottom:1px solid rgb(241 245 249)" data-ms12-act-row="1" data-mid="' +
          escapeAttr(roomId) +
          '">' +
          '<div style="display:flex;flex-wrap:wrap;gap:0.35rem;align-items:center;width:100%">' +
          '<input type="text" class="ms12-input" data-ms12-act-field="title" data-ms12-act-id="' +
          iid +
          '" data-ms12-act-local="' +
          loc +
          '" value="' +
          escapeAttr(it.title) +
          '" style="min-width:10rem;flex:1 1 12rem" title="제목" />' +
          '<input type="text" class="ms12-input" data-ms12-act-field="taskDetail" data-ms12-act-id="' +
          iid +
          '" data-ms12-act-local="' +
          loc +
          '" value="' +
          escapeAttr(it.taskDetail) +
          '" style="min-width:8rem;flex:1 1 7rem" placeholder="상세" />' +
          '<input type="text" class="ms12-input" data-ms12-act-field="assignee" data-ms12-act-id="' +
          iid +
          '" data-ms12-act-local="' +
          loc +
          '" value="' +
          escapeAttr(it.assignee) +
          '" style="max-width:8rem" placeholder="담당" />' +
          '<input type="date" class="ms12-input" data-ms12-act-field="dueAt" data-ms12-act-id="' +
          iid +
          '" data-ms12-act-local="' +
          loc +
          '" value="' +
          escapeAttr(formatDueForInput(it.dueAt)) +
          '" style="max-width:10.5rem" />' +
          '<button type="button" class="ms12-btn ms12-btn--muted" style="font-size:0.78rem;padding:0.2rem 0.45rem" data-ms12-act="1" data-item-id="' +
          iid +
          '" data-local="' +
          loc +
          '">완료</button>' +
          '</div></div>'
        )
      })
      .join('')
    if (typeof onToggle === 'function') {
      var btns = el.querySelectorAll('[data-ms12-act]')
      for (var b = 0; b < btns.length; b++) {
        ;(function (btn) {
          btn.addEventListener('click', function () {
            var isLoc = btn.getAttribute('data-local') === '1'
            var raw = btn.getAttribute('data-item-id') || ''
            onToggle(isLoc ? raw : parseInt(raw, 10), isLoc)
          })
        })(btns[b])
      }
    }
  }

  function escapeForHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function escapeAttr(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
  }

  function formatDueForInput(d) {
    if (!d) return ''
    var t = String(d)
    if (t.length >= 10) return t.slice(0, 10)
    return t
  }

  /** AI 제안 칸 — div 또는 textarea */
  function setSugText(el, text) {
    if (!el) return
    var t = text == null ? '' : String(text)
    if (t === '') t = '—'
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') el.value = t
    else el.textContent = t
  }
  function getSugText(el) {
    if (!el) return ''
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return String(el.value || '').trim()
    return String(el.textContent || '').trim()
  }

  function initHomeDashboard() {
    var docs = document.getElementById('ms12-dash-docs')
    var acts = document.getElementById('ms12-dash-actions')
    if (docs) {
      ms12Fetch('/api/ms12/documents?limit=5', { credentials: 'include' })
        .then(function (r) {
          return jsonFromResponse(r)
        })
        .then(function (j) {
          var items = j && j.success && j.data && j.data.items ? j.data.items : null
          if (items && items.length) {
            docs.innerHTML = items
              .map(function (it) {
                var t = escapeForHtml((it.title || '—') + '')
                var line =
                  '<div style="padding:0.2rem 0;border-bottom:1px solid rgb(241 245 249)"><strong>#' +
                  String(it.id) +
                  '</strong> ' +
                  t
                if (it.docType) {
                  line +=
                    ' <span class="ms12-muted" style="font-size:0.8rem">· ' +
                    escapeForHtml(String(it.docType)) +
                    '</span>'
                }
                if (it.fileUrl) {
                  line +=
                    ' <a class="text-indigo-600" style="font-size:0.82rem;text-decoration:underline" href="' +
                    escapeForHtml(String(it.fileUrl)) +
                    '" target="_blank" rel="noopener">열기</a>'
                }
                return line + '</div>'
              })
              .join('')
          } else {
            docs.textContent = '등록된 문서가 없거나 목록을 불러오지 못했습니다.'
          }
        })
        .catch(function () {
          docs.textContent = '문서 목록을 불러오지 못했습니다.'
        })
    }
    if (acts) {
      ms12Fetch('/api/ms12/my/open-action-items?limit=12', { credentials: 'include' })
        .then(function (r) {
          return jsonFromResponse(r)
        })
        .then(function (j) {
          var items = j && j.success && j.data && j.data.items ? j.data.items : null
          if (items && items.length) {
            acts.innerHTML = items
              .map(function (it) {
                var href = '/app/meeting/' + encodeURIComponent(it.meetingId)
                var room = escapeForHtml((it.roomTitle || '회의') + '')
                var title = escapeForHtml((it.title || '—') + '')
                var due = it.dueAt ? ' · ' + escapeForHtml(formatDue(String(it.dueAt))) : ''
                var asg = it.assignee ? ' · ' + escapeForHtml(String(it.assignee)) : ''
                return (
                  '<div style="padding:0.2rem 0;border-bottom:1px solid rgb(241 245 249)"><a class="text-indigo-600" style="text-decoration:underline" href="' +
                  href +
                  '">' +
                  room +
                  '</a> — ' +
                  title +
                  '<span class="ms12-muted" style="font-size:0.8rem">' +
                  asg +
                  due +
                  '</span></div>'
                )
              })
              .join('')
          } else {
            acts.textContent =
              '미완료 항목이 없거나, 참가한 회의가 없으면 비어 있을 수 있습니다.'
          }
        })
        .catch(function () {
          acts.textContent = '실행 항목을 불러오지 못했습니다.'
        })
    }
    var qf = document.getElementById('ms12-home-quick-search')
    if (qf) {
      qf.addEventListener('submit', function (e) {
        e.preventDefault()
        var fd = new FormData(qf)
        var q = (fd.get('q') || '').toString().trim()
        if (q) {
          window.location.href = '/app/library?q=' + encodeURIComponent(q)
        } else {
          window.location.href = '/app/library'
        }
      })
    }
  }

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
    return ms12Fetch('/api/ms12/meetings/' + encodeURIComponent(id) + '/participants', {
      credentials: 'include',
    })
      .then(function (r) {
        return jsonFromResponse(r)
      })
      .then(function (j) {
        return j
      })
      .catch(function () {
        return { success: false }
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
    var hostLine = document.querySelector('.js-ms12-room-host-line')
    if (hostLine) {
      var hostName = ''
      for (var hi = 0; hi < list.length; hi++) {
        if (list[hi].role === 'host' && list[hi].displayName) {
          hostName = String(list[hi].displayName).trim()
          break
        }
      }
      hostLine.textContent = hostName ? hostName + ' 님이 주관하는 회의' : '주관 회의'
    }
  }

  function initMeetingRoom() {
    var b = document.body
    if (!b || b.getAttribute('data-ms12-route') !== 'meeting_room') return
    var id = b.getAttribute('data-ms12-meeting-id') || ''
    if (!id) return
    roomServerOk = false
    var lastMergedActions = []
    var lastServerActionItems = []
    var titleEls = document.querySelectorAll('.js-ms12-room-title')
    var codeEls = document.querySelectorAll('.js-ms12-room-code')
    var localRow = (readStore().byId || {})[id] || null

    try {
      if (sessionStorage.getItem('ms12_local_only') === '1') {
        sessionStorage.removeItem('ms12_local_only')
      }
    } catch (e) {}

    try {
      loadRoomDraftToDom(id)
    } catch (e) {}
    g_ms12DraftMeeting = id
    g_ms12DraftKind = 'report_int'
    try {
      var st0 = readStore()
      var lr0 = st0.byId && st0.byId[id]
      var dout0 = document.getElementById('ms12-room-draft-out')
      if (dout0 && lr0 && lr0.draftByKind && lr0.draftByKind['report_int'] != null) {
        dout0.value = String(lr0.draftByKind['report_int'])
      }
    } catch (e) {}
    if (localRow) {
      for (var li = 0; li < titleEls.length; li++) {
        if (localRow.title) titleEls[li].textContent = ms12DisplayTitle(id, localRow.title)
      }
      for (var lj = 0; lj < codeEls.length; lj++) {
        if (localRow.meetingCode) codeEls[lj].textContent = localRow.meetingCode
      }
    }
    var noteEl = function () {
      return [
        document.getElementById('ms12-room-notes'),
        document.getElementById('ms12-room-transcript'),
        document.getElementById('ms12-room-summary-basic'),
        document.getElementById('ms12-room-summary-action'),
        document.getElementById('ms12-room-summary-report'),
        document.getElementById('ms12-ai-sug-basic'),
        document.getElementById('ms12-ai-sug-action'),
        document.getElementById('ms12-ai-sug-report'),
        document.getElementById('ms12-ai-action-draft'),
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
                summaryBasic: pack.summaryBasic,
                summaryAction: pack.summaryAction,
                summaryReport: pack.summaryReport,
                draftByKind: pack.draftByKind,
                aiSugBasic: pack.aiSugBasic,
                aiSugAction: pack.aiSugAction,
                aiSugReport: pack.aiSugReport,
                actionItemsDraft: pack.actionItemsDraft,
                actionItems: lastMergedActions && lastMergedActions.length
                  ? lastMergedActions
                  : mergeActionLists([], getLocalActionItemsOnly(id)),
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
    var flushMsg = document.getElementById('ms12-room-flush-msg')
    if (flush) {
      flush.addEventListener('click', function () {
        try {
          saveRoomDraft(id)
        } catch (e) {}
        if (flushMsg) {
          flushMsg.textContent = '이 브라우저에 저장했습니다. (' + new Date().toLocaleTimeString() + ')'
        }
      })
    }

    function roomTabKeyFromEl(btn) {
      return btn.getAttribute('data-ms12-room-tab')
    }
    function switchRoomTab(key) {
      var panels = document.querySelectorAll('.ms12-rpanel')
      var tabs = document.querySelectorAll('[data-ms12-room-tab]')
      for (var i = 0; i < tabs.length; i++) {
        var t = tabs[i]
        var k = roomTabKeyFromEl(t)
        var on = k === key
        if (on) {
          t.classList.add('ms12-tab--active')
          t.setAttribute('aria-selected', 'true')
        } else {
          t.classList.remove('ms12-tab--active')
          t.setAttribute('aria-selected', 'false')
        }
      }
      for (var j = 0; j < panels.length; j++) {
        var p = panels[j]
        if (p.getAttribute('data-panel') === key) p.style.display = 'block'
        else p.style.display = 'none'
      }
      if (key === 'actions') {
        try {
          loadActionItems()
        } catch (e) {}
      }
    }
    var tabBtns = document.querySelectorAll('[data-ms12-room-tab]')
    for (var tix = 0; tix < tabBtns.length; tix++) {
      ;(function (btn) {
        btn.addEventListener('click', function () {
          var k = roomTabKeyFromEl(btn)
          if (k) switchRoomTab(k)
        })
      })(tabBtns[tix])
    }

    var DRAFT_KIND_LABEL = {
      report_int: '내부 보고',
      report_ext: '대외 보고',
      action_plan: '실행계획',
      result_report: '결과보고',
      proposal: '제안서',
      press: '보도자료',
      blog: '블로그',
      social: 'SNS',
    }
    function flushDraftKind() {
      var out = document.getElementById('ms12-room-draft-out')
      if (!out || g_ms12DraftMeeting !== id) return
      var st = readStore()
      if (!st.byId[id]) st.byId[id] = { id: id }
      st.byId[id].draftByKind = st.byId[id].draftByKind || {}
      st.byId[id].draftByKind[g_ms12DraftKind] = out.value
      writeStore(st)
    }
    function showDraftKind(kind) {
      flushDraftKind()
      g_ms12DraftKind = kind
      var st = readStore()
      var v = (st.byId[id] && st.byId[id].draftByKind && st.byId[id].draftByKind[kind]) || ''
      var out2 = document.getElementById('ms12-room-draft-out')
      if (out2) out2.value = v
      var sub = document.querySelectorAll('[data-ms12-draft-kind]')
      for (var s = 0; s < sub.length; s++) {
        var sk = sub[s].getAttribute('data-ms12-draft-kind')
        if (sk === kind) sub[s].classList.add('ms12-subtab--active')
        else sub[s].classList.remove('ms12-subtab--active')
      }
      var lab = document.getElementById('ms12-draft-cur-label')
      if (lab) lab.textContent = '· ' + (DRAFT_KIND_LABEL[kind] || kind)
    }
    var subTabs = document.querySelectorAll('[data-ms12-draft-kind]')
    for (var si = 0; si < subTabs.length; si++) {
      ;(function (btn) {
        btn.addEventListener('click', function () {
          var k = btn.getAttribute('data-ms12-draft-kind')
          if (k) showDraftKind(k)
        })
      })(subTabs[si])
    }
    var doutForInput = document.getElementById('ms12-room-draft-out')
    if (doutForInput) {
      var debDraft = null
      doutForInput.addEventListener('input', function () {
        if (debDraft) clearTimeout(debDraft)
        debDraft = setTimeout(function () {
          try {
            saveRoomDraft(id)
          } catch (e) {}
        }, 500)
      })
    }

    var autoSumTimer = null
    var lastAutoHash = ''
    var sugB = document.getElementById('ms12-ai-sug-basic')
    var sugA = document.getElementById('ms12-ai-sug-action')
    var sugR = document.getElementById('ms12-ai-sug-report')
    var statEl = document.getElementById('ms12-ai-auto-status')
    function runAutoSummaryNow() {
      if (!roomServerOk) {
        if (statEl) {
          statEl.textContent =
            '서버에 참가한 방에서만 AI 자동요약 API를 씁니다. (코드로 입장·세션)'
        }
        return
      }
      var n = document.getElementById('ms12-room-notes')
      var tr = document.getElementById('ms12-room-transcript')
      var sba = document.getElementById('ms12-room-summary-basic')
      var sac = document.getElementById('ms12-room-summary-action')
      var srp = document.getElementById('ms12-room-summary-report')
      var notes = n ? n.value : ''
      var trans = tr ? tr.value : ''
      if (!String(notes + trans).trim() || String(notes + trans).trim().length < 30) {
        if (statEl) statEl.textContent = '메모·전사를 조금 더 입력하세요. (최소 약 30자)'
        return
      }
      if (statEl) statEl.textContent = 'AI 요약 요청 중…'
      ms12Fetch('/api/ms12/meetings/' + encodeURIComponent(id) + '/auto-summary', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: notes,
          transcript: trans,
          summaryBasic: sba ? sba.value : '',
          summaryAction: sac ? sac.value : '',
          summaryReport: srp ? srp.value : '',
        }),
      })
        .then(function (r) {
          return jsonFromResponse(r)
        })
        .then(function (j) {
          if (j && j.success && j.data) {
            setSugText(sugB, j.data.summaryBasic || '—')
            setSugText(sugA, j.data.summaryAction || '—')
            setSugText(sugR, j.data.summaryReport || '—')
            if (statEl) {
              statEl.textContent =
                '갱신 ' + new Date().toLocaleTimeString() + (j.data.source ? ' · ' + j.data.source : '')
            }
            try {
              tryFillActionItemsDraft()
            } catch (e) {}
            try {
              saveRoomDraft(id)
            } catch (e2) {}
          } else {
            if (statEl) statEl.textContent = (j && j.error) || '실패'
          }
        })
        .catch(function () {
          if (statEl) statEl.textContent = '요청 실패'
        })
    }
    function refillActionItemsDraft(isManual) {
      if (!roomServerOk) {
        if (isManual && statEl) statEl.textContent = '서버에 참가한 방에서만 사용할 수 있습니다. (코드로 입장)'
        return
      }
      var n = document.getElementById('ms12-room-notes')
      var tr = document.getElementById('ms12-room-transcript')
      var sba = document.getElementById('ms12-room-summary-basic')
      var sac = document.getElementById('ms12-room-summary-action')
      var srp = document.getElementById('ms12-room-summary-report')
      var draft = document.getElementById('ms12-ai-action-draft')
      if (!draft) return
      if (isManual && statEl) statEl.textContent = '실행 항목 AI 제안 중…'
      var sb0 = sba ? sba.value : ''
      var sa0 = sac ? sac.value : ''
      var sr0 = srp ? srp.value : ''
      var notes = n ? n.value : ''
      var trans = tr ? tr.value : ''
      if (String(notes + trans + sb0 + sa0 + sr0).trim().length < 15) {
        if (isManual && statEl) statEl.textContent = '메모·전사·요약을 조금 더 입력하세요.'
        return
      }
      ms12Fetch('/api/ms12/meetings/' + encodeURIComponent(id) + '/action-items/ai-suggest', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: notes,
          transcript: trans,
          summaryBasic: sb0,
          summaryAction: sa0,
          summaryReport: sr0,
        }),
      })
        .then(function (r) {
          return jsonFromResponse(r)
        })
        .then(function (j) {
          if (j && j.success && j.data) {
            var items = j.data.items || []
            draft.value = items.length
              ? JSON.stringify(items, null, 2)
              : '[ ]  /* AI가 항목을 찾지 못했습니다. */'
            try {
              saveRoomDraft(id)
            } catch (e) {}
            if (isManual && statEl) {
              statEl.textContent =
                '실행 항목 초안 갱신 (' + items.length + '건) ' + new Date().toLocaleTimeString()
            } else if (statEl && items.length) {
              statEl.textContent = statEl.textContent + ' · 실행 항목 초안'
            }
          } else {
            if (isManual && statEl) statEl.textContent = (j && j.error) || '실행 항목 제안 실패'
          }
        })
        .catch(function () {
          if (isManual && statEl) statEl.textContent = '요청 실패'
        })
    }
    function tryFillActionItemsDraft() {
      var syncEl = document.getElementById('ms12-ai-action-sync')
      if (syncEl && !syncEl.checked) return
      refillActionItemsDraft(false)
    }
    var summaryTabBusy = false
    function showSummaryTabUI(kind) {
      var k =
        kind === 'action' || kind === 'report' || kind === 'basic' ? kind : 'basic'
      var wraps = document.querySelectorAll('[data-ms12-summary-wrap]')
      for (var wi = 0; wi < wraps.length; wi++) {
        var w = wraps[wi]
        var wk = w.getAttribute('data-ms12-summary-wrap')
        w.style.display = wk === k ? 'block' : 'none'
      }
      var tabs = document.querySelectorAll('[data-ms12-summary-tab]')
      for (var ti = 0; ti < tabs.length; ti++) {
        var tbtn = tabs[ti]
        var tk = tbtn.getAttribute('data-ms12-summary-tab')
        var on = tk === k
        if (on) tbtn.classList.add('ms12-subtab--active')
        else tbtn.classList.remove('ms12-subtab--active')
        tbtn.setAttribute('aria-selected', on ? 'true' : 'false')
      }
    }
    function runAutoSummaryForFocus(focus) {
      if (summaryTabBusy) return
      if (!roomServerOk) {
        if (statEl) {
          statEl.textContent =
            '서버에 참가한 방에서만 AI 자동요약 API를 씁니다. (코드로 입장·세션)'
        }
        return
      }
      var n = document.getElementById('ms12-room-notes')
      var tr = document.getElementById('ms12-room-transcript')
      var sba = document.getElementById('ms12-room-summary-basic')
      var sac = document.getElementById('ms12-room-summary-action')
      var srp = document.getElementById('ms12-room-summary-report')
      var notes = n ? n.value : ''
      var trans = tr ? tr.value : ''
      if (!String(notes + trans).trim() || String(notes + trans).trim().length < 30) {
        if (statEl) statEl.textContent = '메모·전사를 조금 더 입력하세요. (최소 약 30자)'
        return
      }
      var label =
        focus === 'basic'
          ? '기본요약'
          : focus === 'action'
            ? '실행요약'
            : '보고요약'
      if (statEl) statEl.textContent = label + ' AI 정리 중…'
      summaryTabBusy = true
      ms12Fetch('/api/ms12/meetings/' + encodeURIComponent(id) + '/auto-summary', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: notes,
          transcript: trans,
          summaryBasic: sba ? sba.value : '',
          summaryAction: sac ? sac.value : '',
          summaryReport: srp ? srp.value : '',
          focus: focus,
        }),
      })
        .then(function (r) {
          return jsonFromResponse(r)
        })
        .then(function (j) {
          if (j && j.success && j.data) {
            var d = j.data
            if (d.summaryBasic && focus === 'basic') {
              setSugText(sugB, d.summaryBasic)
              if (sba) sba.value = d.summaryBasic
            } else if (d.summaryAction && focus === 'action') {
              setSugText(sugA, d.summaryAction)
              if (sac) sac.value = d.summaryAction
            } else if (d.summaryReport && focus === 'report') {
              setSugText(sugR, d.summaryReport)
              if (srp) srp.value = d.summaryReport
            }
            if (statEl) {
              statEl.textContent =
                label +
                ' 반영 ' +
                new Date().toLocaleTimeString() +
                (d.source ? ' · ' + d.source : '')
            }
            try {
              saveRoomDraft(id)
            } catch (e) {}
          } else {
            if (statEl) statEl.textContent = (j && j.error) || '실패'
          }
        })
        .catch(function () {
          if (statEl) statEl.textContent = '요청 실패'
        })
        .finally(function () {
          summaryTabBusy = false
        })
    }
    var sumTabBtns = document.querySelectorAll('[data-ms12-summary-tab]')
    for (var sti = 0; sti < sumTabBtns.length; sti++) {
      ;(function (btn) {
        btn.addEventListener('click', function () {
          var k = btn.getAttribute('data-ms12-summary-tab')
          if (k === 'basic' || k === 'action' || k === 'report') {
            showSummaryTabUI(k)
            runAutoSummaryForFocus(k)
          }
        })
      })(sumTabBtns[sti])
    }
    function scheduleAutoSummary() {
      var n = document.getElementById('ms12-room-notes')
      var tr = document.getElementById('ms12-room-transcript')
      var h = String((n && n.value) || '') + '|' + String((tr && tr.value) || '')
      if (h.length < 40) return
      if (autoSumTimer) clearTimeout(autoSumTimer)
      autoSumTimer = setTimeout(function () {
        if (h === lastAutoHash) return
        lastAutoHash = h
        runAutoSummaryNow()
      }, 90000)
    }
    var nAuto = document.getElementById('ms12-room-notes')
    var trAuto = document.getElementById('ms12-room-transcript')
    if (nAuto) nAuto.addEventListener('input', scheduleAutoSummary)
    if (trAuto) trAuto.addEventListener('input', scheduleAutoSummary)
    var btnAiNow = document.getElementById('ms12-ai-summary-now')
    if (btnAiNow) btnAiNow.addEventListener('click', function () { runAutoSummaryNow() })
    var btnApply = document.getElementById('ms12-ai-summary-apply')
    if (btnApply) {
      btnApply.addEventListener('click', function () {
        var sba2 = document.getElementById('ms12-room-summary-basic')
        var sac2 = document.getElementById('ms12-room-summary-action')
        var srp2 = document.getElementById('ms12-room-summary-report')
        var tb = getSugText(sugB)
        var ta = getSugText(sugA)
        var trg = getSugText(sugR)
        if (sugB && sba2 && tb && tb !== '—') sba2.value = tb
        if (sugA && sac2 && ta && ta !== '—') sac2.value = ta
        if (sugR && srp2 && trg && trg !== '—') srp2.value = trg
        try {
          saveRoomDraft(id)
        } catch (e) {}
        if (statEl) statEl.textContent = '수동 요약 필드에 반영했습니다. «서버에 회의 저장»으로 백업하세요.'
      })
    }

    var actListEl = document.getElementById('ms12-actions-list')
    var actForm = document.getElementById('ms12-action-form')
    var aiQ = document.getElementById('ms12-ai-q')
    var aiSend = document.getElementById('ms12-ai-send')
    var aiOut = document.getElementById('ms12-ai-answer')
    var aiErr = document.getElementById('ms12-ai-err')

    function paintActions(serverItems) {
      lastServerActionItems = serverItems && serverItems.length ? serverItems.slice() : []
      var merged = mergeActionLists(lastServerActionItems, getLocalActionItemsOnly(id))
      lastMergedActions = merged
      renderActionList(
        actListEl,
        merged,
        function (itemId, isLocal) {
        if (isLocal) {
          var locList = getLocalActionItemsOnly(id)
          var next = locList.map(function (x) {
            if (!x || !x._local) return x
            if (String(x.id) !== String(itemId)) return x
            return Object.assign({}, x, { status: 'done' })
          })
          setLocalActionItemsOnly(id, next)
          loadActionItems()
          return
        }
        ms12Fetch(
          '/api/ms12/meetings/' + encodeURIComponent(id) + '/action-items/' + encodeURIComponent(itemId),
          {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'done' }),
          }
        )
          .then(function (r) {
            return jsonFromResponse(r)
          })
          .then(function (j) {
            if (j && j.success) {
              return ms12Fetch('/api/ms12/meetings/' + encodeURIComponent(id) + '/action-items', {
                credentials: 'include',
              })
            }
            return null
          })
          .then(function (r) {
            if (!r) return
            return jsonFromResponse(r)
          })
          .then(function (j) {
            if (j && j.success && j.data && j.data.items) {
              paintActions(j.data.items)
            }
          })
          .catch(function () {})
        },
        { roomId: id }
      )
    }

    var actFieldTimer = null
    function saveActionItemField(itemId, isLocal, field, value) {
      if (isLocal) {
        var list = getLocalActionItemsOnly(id)
        var next = list.map(function (x) {
          if (!x || String(x.id) !== String(itemId)) return x
          var o = Object.assign({}, x)
          if (field === 'title') o.title = value
          else if (field === 'taskDetail') o.taskDetail = value
          else if (field === 'assignee') o.assignee = value
          else if (field === 'dueAt') o.dueAt = value
          return o
        })
        setLocalActionItemsOnly(id, next)
        paintActions(lastServerActionItems)
        return
      }
      var numId = parseInt(String(itemId), 10)
      if (!numId) return
      var payload = {}
      if (field === 'title') payload.title = value
      if (field === 'taskDetail') payload.taskDetail = value
      if (field === 'assignee') payload.assignee = value ? value : null
      if (field === 'dueAt') payload.dueAt = value ? value : null
      if (field === 'title' && !String(value || '').trim()) return
      ms12Fetch(
        '/api/ms12/meetings/' + encodeURIComponent(id) + '/action-items/' + encodeURIComponent(numId),
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
        .then(function (r) {
          return jsonFromResponse(r)
        })
        .then(function (j) {
          if (j && j.success) loadActionItems()
        })
        .catch(function () {})
    }
    if (actListEl && !actListEl._ms12ActInp) {
      actListEl._ms12ActInp = true
      actListEl.addEventListener('input', function (ev) {
        var t = ev.target
        if (!t || !t.getAttribute('data-ms12-act-field')) return
        var itemId = t.getAttribute('data-ms12-act-id')
        var isLoc = t.getAttribute('data-ms12-act-local') === '1'
        var field = t.getAttribute('data-ms12-act-field')
        var val = t.value
        clearTimeout(actFieldTimer)
        actFieldTimer = setTimeout(function () {
          saveActionItemField(itemId, isLoc, field, val)
        }, 700)
      })
    }

    function applyActionItemsFromDraft() {
      var draft = document.getElementById('ms12-ai-action-draft')
      var btnActAp = document.getElementById('ms12-ai-action-apply')
      if (!draft || !String(draft.value).trim()) {
        if (statEl) statEl.textContent = '실행 항목 초안이 비어 있습니다.'
        return
      }
      var items
      try {
        var rawJ = String(draft.value)
          .replace(/\/\/[^\n]*/g, '')
          .replace(/\/\*[\s\S]*?\*\//g, '')
        items = JSON.parse(rawJ)
      } catch (e) {
        if (statEl) statEl.textContent = 'JSON 형식이 올바르지 않습니다.'
        return
      }
      if (!Array.isArray(items)) {
        if (statEl) statEl.textContent = '최상위는 [...] 배열이어야 합니다.'
        return
      }
      var valid = items.filter(function (it) {
        return it && String(it.title || '').trim()
      })
      if (!valid.length) {
        if (statEl) statEl.textContent = 'title이 있는 항목이 없습니다.'
        return
      }
      if (!roomServerOk) {
        var st0 = getLocalActionItemsOnly(id)
        for (var q = 0; q < valid.length; q++) {
          var w = valid[q]
          st0.push({
            id: localActionId(),
            title: String(w.title).trim(),
            taskDetail: w.taskDetail ? String(w.taskDetail) : '',
            assignee: w.assignee ? String(w.assignee) : '',
            dueAt: w.dueAt ? String(w.dueAt).slice(0, 10) : '',
            status: 'open',
            priority: 'normal',
            itemCategory: 'required',
            _local: true,
          })
        }
        setLocalActionItemsOnly(id, st0)
        paintActions([])
        if (statEl) statEl.textContent = '이 기기에만 실행 항목 ' + valid.length + '건 추가(서버 미연동)'
        return
      }
      if (btnActAp) btnActAp.disabled = true
      var n = 0
      function runOne() {
        if (n >= valid.length) {
          if (btnActAp) btnActAp.disabled = false
          loadActionItems()
          if (statEl) statEl.textContent = '실행 항목 ' + valid.length + '건을 서버에 반영했습니다.'
          return
        }
        var w = valid[n++]
        var p = { title: String(w.title).trim() }
        if (w.taskDetail) p.taskDetail = String(w.taskDetail)
        if (w.assignee) p.assignee = String(w.assignee)
        if (w.dueAt) p.dueAt = String(w.dueAt).slice(0, 10)
        ms12Fetch('/api/ms12/meetings/' + encodeURIComponent(id) + '/action-items', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p),
        })
          .then(function (r) {
            return jsonFromResponse(r)
          })
          .then(function (j) {
            if (j && j.success) runOne()
            else {
              if (btnActAp) btnActAp.disabled = false
              if (statEl) statEl.textContent = (j && j.error) || '일부 항목 추가에 실패했습니다.'
            }
          })
          .catch(function () {
            if (btnActAp) btnActAp.disabled = false
            if (statEl) statEl.textContent = '요청 실패'
          })
      }
      runOne()
    }
    var btnActGen = document.getElementById('ms12-ai-action-gen')
    var btnActApplyEl = document.getElementById('ms12-ai-action-apply')
    if (btnActGen) {
      btnActGen.addEventListener('click', function () {
        refillActionItemsDraft(true)
      })
    }
    if (btnActApplyEl) {
      btnActApplyEl.addEventListener('click', function () {
        applyActionItemsFromDraft()
      })
    }

    function loadActionItems() {
      ms12Fetch('/api/ms12/meetings/' + encodeURIComponent(id) + '/action-items', { credentials: 'include' })
        .then(function (r) {
          return jsonFromResponse(r)
        })
        .then(function (j) {
          if (j && j.success && j.data && j.data.items) {
            paintActions(j.data.items)
          } else {
            paintActions([])
          }
        })
        .catch(function () {
          paintActions([])
        })
    }

    if (actForm) {
      actForm.addEventListener('submit', function (e) {
        e.preventDefault()
        var titleIn = actForm.querySelector('input[name="title"]')
        var assIn = actForm.querySelector('input[name="assignee"]')
        var dueIn = actForm.querySelector('input[name="dueAt"]')
        var t = (titleIn && titleIn.value) ? String(titleIn.value).trim() : ''
        if (!t) return
        var taskIn = actForm.querySelector('input[name="taskDetail"]')
        var prIn = actForm.querySelector('select[name="priority"]')
        var icIn = actForm.querySelector('select[name="itemCategory"]')
        var payload = { title: t }
        if (taskIn && taskIn.value) payload.taskDetail = String(taskIn.value).trim()
        if (assIn && assIn.value) payload.assignee = String(assIn.value).trim()
        if (dueIn && dueIn.value) payload.dueAt = String(dueIn.value)
        if (prIn && prIn.value) payload.priority = String(prIn.value).trim()
        if (icIn && icIn.value) payload.itemCategory = String(icIn.value).trim()
        ms12Fetch('/api/ms12/meetings/' + encodeURIComponent(id) + '/action-items', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
          .then(function (r) {
            return jsonFromResponse(r)
          })
          .then(function (j) {
            if (j && j.success && j.data) {
              if (titleIn) titleIn.value = ''
              if (taskIn) taskIn.value = ''
              if (assIn) assIn.value = ''
              if (dueIn) dueIn.value = ''
              return ms12Fetch('/api/ms12/meetings/' + encodeURIComponent(id) + '/action-items', {
                credentials: 'include',
              })
            }
            var o = { title: t, id: localActionId(), status: 'open' }
            if (payload.taskDetail) o.taskDetail = payload.taskDetail
            if (payload.assignee) o.assignee = payload.assignee
            if (payload.dueAt) o.dueAt = payload.dueAt
            if (payload.priority) o.priority = payload.priority
            if (payload.itemCategory) o.itemCategory = payload.itemCategory
            o._local = true
            var st = getLocalActionItemsOnly(id)
            st.push(o)
            setLocalActionItemsOnly(id, st)
            paintActions([])
            return null
          })
          .then(function (r) {
            if (!r) return
            return jsonFromResponse(r)
          })
          .then(function (j) {
            if (j && j.success && j.data && j.data.items) {
              paintActions(j.data.items)
            }
          })
          .catch(function () {
            var o2 = { title: t, id: localActionId(), status: 'open' }
            if (payload.taskDetail) o2.taskDetail = payload.taskDetail
            if (payload.assignee) o2.assignee = payload.assignee
            if (payload.dueAt) o2.dueAt = payload.dueAt
            if (payload.priority) o2.priority = payload.priority
            if (payload.itemCategory) o2.itemCategory = payload.itemCategory
            o2._local = true
            var st2 = getLocalActionItemsOnly(id)
            st2.push(o2)
            setLocalActionItemsOnly(id, st2)
            paintActions([])
          })
      })
    }

    if (aiSend && aiQ && aiOut) {
      aiSend.addEventListener('click', function () {
        if (aiErr) {
          aiErr.style.display = 'none'
          aiErr.textContent = ''
        }
        var q = (aiQ.value || '').toString().trim()
        if (!q) return
        var n = document.getElementById('ms12-room-notes')
        var tr2 = document.getElementById('ms12-room-transcript')
        var notes = n ? n.value : ''
        var transcript = tr2 ? tr2.value : ''
        var summary = combinedSummaryFromDom()
        if (!notes.trim() && !transcript.trim() && !summary.trim()) {
          if (aiErr) {
            aiErr.textContent = '메모·전사·요약 중 하나는 채운 뒤 질의해 주세요.'
            aiErr.style.display = 'block'
          }
          return
        }
        aiSend.disabled = true
        if (aiOut) aiOut.textContent = '응답을 기다리는 중…'
        ms12Fetch('/api/ms12/meetings/' + encodeURIComponent(id) + '/ai-qa', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: q, notes: notes, transcript: transcript, summary: summary }),
        })
          .then(function (r) {
            return jsonFromResponse(r)
          })
          .then(function (j) {
            if (j && j.success && j.data && j.data.answer) {
              if (aiOut) aiOut.textContent = j.data.answer
            } else {
              var er = (j && (j.error || j.message)) || '응답을 받지 못했습니다.'
              if (aiOut) aiOut.textContent = '—'
              if (aiErr) {
                aiErr.textContent = String(er)
                aiErr.style.display = 'block'
              }
            }
          })
          .catch(function () {
            if (aiOut) aiOut.textContent = '—'
            if (aiErr) {
              aiErr.textContent = '요청이 실패했습니다.'
              aiErr.style.display = 'block'
            }
          })
          .finally(function () {
            aiSend.disabled = false
          })
      })
    }

    var sttBtn = document.getElementById('ms12-stt-toggle')
    var sttSt = document.getElementById('ms12-stt-status')
    var sttHint = document.getElementById('ms12-stt-hint')
    var trEl = document.getElementById('ms12-room-transcript')
    var Rec =
      (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) || null
    if (!Rec) {
      if (sttHint) {
        sttHint.textContent = '이 브라우저는 Web Speech 를 지원하지 않아 음성 전사는 사용할 수 없습니다.'
      }
      if (sttBtn) sttBtn.style.display = 'none'
    } else if (sttBtn && trEl) {
      var recog = new Rec()
      var sttOn = false
      /** 음성 시작 시점의 사용자 입력(전사창 스냅샷) */
      var sttUserBase = ''
      /** 이번 세션에서 확정된 전사 누적 */
      var sttFinalAccum = ''
      function joinWithGap(left, right) {
        var L = left != null ? String(left) : ''
        var R = right != null ? String(right) : ''
        if (!R) return L
        if (!L) return R
        if (/\s$/.test(L) || /^\s/.test(R)) return L + R
        return L + ' ' + R
      }
      recog.lang = 'ko-KR'
      recog.continuous = true
      recog.interimResults = true
      try {
        recog.maxAlternatives = 1
      } catch (e) {}
      function setSttUi(listening) {
        sttBtn.textContent = listening ? '음성 끄기' : '음성 켜기'
        if (sttSt) sttSt.textContent = listening ? '듣는 중' : '대기'
      }
      function startListening() {
        sttUserBase = trEl.value != null ? String(trEl.value) : ''
        sttFinalAccum = ''
        sttOn = true
        setSttUi(true)
        try {
          recog.start()
        } catch (e) {
          sttOn = false
          setSttUi(false)
          if (sttSt) sttSt.textContent = '시작 실패 — 버튼을 다시 누르세요'
          if (sttHint) {
            sttHint.textContent =
              '음성 인식을 켤 수 없습니다. 브라우저가 자동 시작을 막은 경우 아래 «음성 켜기»를 눌러 주세요.'
          }
        }
      }
      function stopListening() {
        sttOn = false
        setSttUi(false)
        try {
          recog.stop()
        } catch (e) {}
      }
      recog.onresult = function (ev) {
        var interim = ''
        for (var ri = ev.resultIndex; ri < ev.results.length; ri++) {
          var seg = (ev.results[ri] && ev.results[ri][0] && ev.results[ri][0].transcript) || ''
          if (ev.results[ri].isFinal) {
            sttFinalAccum += seg
          } else {
            interim += seg
          }
        }
        var committed = joinWithGap(sttUserBase, sttFinalAccum)
        trEl.value = joinWithGap(committed, interim)
        try {
          saveRoomDraft(id)
        } catch (e) {}
      }
      recog.onerror = function (e) {
        var code = e && e.error
        if (sttSt) sttSt.textContent = code || (e && e.message) || '오류'
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          sttOn = false
          setSttUi(false)
          if (sttHint) {
            sttHint.textContent =
              '마이크가 거절되었습니다. 주소창 자물쇠에서 마이크를 허용한 뒤 «음성 켜기»를 눌러 주세요.'
          }
        }
      }
      recog.onend = function () {
        if (sttOn) {
          try {
            recog.start()
          } catch (e) {}
        }
      }
      function requestMicThenStart() {
        if (sttSt) sttSt.textContent = '마이크 준비 중…'
        var done = function () {
          startListening()
          if (sttHint && sttOn) {
            sttHint.textContent =
              '마이크·음성 전사가 켜졌습니다. 필요할 때만 «음성 끄기»를 누르세요.'
          }
        }
        if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
          navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then(function (stream) {
              try {
                stream.getTracks().forEach(function (t) {
                  t.stop()
                })
              } catch (e) {}
              done()
            })
            .catch(function () {
              if (sttSt) sttSt.textContent = '대기'
              if (sttHint) {
                sttHint.textContent =
                  '마이크를 허용해야 전사가 켜집니다. 주소창 자물쇠에서 허용한 뒤 «음성 켜기»를 눌러 주세요.'
              }
            })
        } else {
          done()
        }
      }
      sttBtn.addEventListener('click', function () {
        if (sttOn) {
          stopListening()
          if (sttHint) {
            sttHint.textContent = '음성 전사를 껐습니다. 다시 켜려면 «음성 켜기»를 누르세요.'
          }
        } else {
          requestMicThenStart()
        }
      })
      if (sttHint) {
        sttHint.textContent =
          '회의실에서는 마이크·음성 전사가 기본으로 켜집니다. HTTPS 환경에서 Chrome·Edge 사용을 권장합니다.'
      }
      setTimeout(function () {
        try {
          requestMicThenStart()
        } catch (e) {
          if (sttSt) sttSt.textContent = '대기'
          if (sttHint) {
            sttHint.textContent =
              '자동으로 마이크를 켤 수 없습니다. «음성 켜기»를 눌러 주세요.'
          }
        }
      }, 450)
    }

    var saveTitleEl = document.getElementById('ms12-save-title')
    var saveDateEl = document.getElementById('ms12-save-meeting-date')
    var saveServerMsg = document.getElementById('ms12-save-server-msg')
    var saveBtn = document.getElementById('ms12-meeting-save-server')
    if (saveDateEl) {
      try {
        if (!saveDateEl.value) saveDateEl.value = new Date().toISOString().slice(0, 10)
      } catch (e) {}
    }
    if (saveTitleEl) {
      if (localRow && localRow.title) {
        var lt0 = String(localRow.title).trim()
        saveTitleEl.value = lt0 === '새 회의' ? ms12SuggestedTitleOncePerRoom(id) : localRow.title
      } else if (!String(saveTitleEl.value || '').trim()) {
        saveTitleEl.value = ms12SuggestedTitleOncePerRoom(id)
      }
    }
    initMeetingCategoryPickers()
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var titleS = saveTitleEl && saveTitleEl.value ? String(saveTitleEl.value).trim() : ''
        var n = document.getElementById('ms12-room-notes')
        var trs = document.getElementById('ms12-room-transcript')
        var sba = document.getElementById('ms12-room-summary-basic')
        var sac = document.getElementById('ms12-room-summary-action')
        var srp = document.getElementById('ms12-room-summary-report')
        var raw = n ? n.value : ''
        if (!titleS) {
          if (saveServerMsg) saveServerMsg.textContent = '회의 제목을 입력하세요.'
          return
        }
        if (!String(raw).trim()) {
          if (saveServerMsg) saveServerMsg.textContent = '회의 메모(원문)을 입력하세요.'
          return
        }
        if (!saveDateEl || !String(saveDateEl.value).trim()) {
          if (saveServerMsg) saveServerMsg.textContent = '회의 날짜를 선택하세요.'
          return
        }
        var catEl = document.getElementById('ms12-save-category')
        var tagEl = document.getElementById('ms12-save-tags')
        var visEl = document.getElementById('ms12-save-vis')
        var cat = (catEl && catEl.value) ? String(catEl.value).trim() : '일반'
        var tag = tagEl && tagEl.value ? String(tagEl.value).trim() : ''
        var vis = visEl && visEl.value ? String(visEl.value) : 'public_internal'
        var recKey = 'ms12_record_for_room_' + id
        var existing = null
        try {
          existing = sessionStorage.getItem(recKey)
        } catch (e) {}
        var method = existing ? 'PATCH' : 'POST'
        var url = existing
          ? '/api/ms12/meeting-records/' + encodeURIComponent(existing)
          : '/api/ms12/meeting-records'
        var body = {
          title: titleS,
          meetingDate: saveDateEl.value,
          category: cat,
          rawNotes: String(raw).trim(),
          transcript: trs && trs.value ? String(trs.value) : null,
          tags: tag || null,
          visibility: vis,
          summaryBasic: sba && sba.value ? String(sba.value) : null,
          summaryAction: sac && sac.value ? String(sac.value) : null,
          summaryReport: srp && srp.value ? String(srp.value) : null,
        }
        if (method === 'POST') {
          body.roomId = id
        }
        if (saveServerMsg) saveServerMsg.textContent = '저장 중…'
        ms12Fetch(url, {
          method: method,
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
          .then(function (r) {
            return jsonFromResponse(r)
          })
          .then(function (j) {
            if (j && j.success && j.data && j.data.id) {
              try {
                sessionStorage.setItem(recKey, j.data.id)
              } catch (e) {}
              if (saveServerMsg) {
                saveServerMsg.textContent =
                  '보관함에 저장했습니다. «회의 보관함»에서 다시 열 수 있습니다.'
              }
            } else {
              if (saveServerMsg) saveServerMsg.textContent = (j && (j.error || j.message)) || '저장 실패'
            }
          })
          .catch(function () {
            if (saveServerMsg) saveServerMsg.textContent = '오프라인이거나 요청이 실패했습니다.'
          })
      })
    }

    var draftOut = document.getElementById('ms12-room-draft-out')
    function roomDraftBody() {
      var n0 = document.getElementById('ms12-room-notes')
      var tr0 = document.getElementById('ms12-room-transcript')
      return {
        notes: n0 ? n0.value : '',
        transcript: tr0 ? tr0.value : '',
        summary: combinedSummaryFromDom(),
      }
    }
    function postRoomDraft(path, extra, dkind) {
      if (!draftOut) return
      var b = roomDraftBody()
      if (!b.notes.trim() && !b.transcript.trim() && !b.summary.trim()) {
        draftOut.value = '메모·전사·요약 중 하나에 내용이 있어야 합니다.'
        return
      }
      draftOut.value = '초안을 생성하는 중…'
      ms12Fetch('/api/ms12/meetings/' + encodeURIComponent(id) + path, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({}, b, extra || {})),
      })
        .then(function (r) {
          return jsonFromResponse(r)
        })
        .then(function (j) {
          if (j && j.success && j.data && j.data.draft) {
            var text = j.data.draft
            draftOut.value = text
            if (dkind) {
              g_ms12DraftKind = dkind
              var st = readStore()
              if (!st.byId[id]) st.byId[id] = { id: id }
              st.byId[id].draftByKind = st.byId[id].draftByKind || {}
              st.byId[id].draftByKind[dkind] = text
              writeStore(st)
              var sub = document.querySelectorAll('[data-ms12-draft-kind]')
              for (var sx = 0; sx < sub.length; sx++) {
                var sk = sub[sx].getAttribute('data-ms12-draft-kind')
                if (sk === dkind) sub[sx].classList.add('ms12-subtab--active')
                else sub[sx].classList.remove('ms12-subtab--active')
              }
              var lab2 = document.getElementById('ms12-draft-cur-label')
              if (lab2) lab2.textContent = '· ' + (DRAFT_KIND_LABEL[dkind] || dkind)
            }
            try {
              saveRoomDraft(id)
            } catch (e) {}
          } else {
            draftOut.value = (j && (j.error || j.message)) || '오류'
          }
        })
        .catch(function () {
          draftOut.value = '요청이 실패했습니다.'
        })
    }
    var bindDraft = function (elId, path, extra, dkind) {
      var el = document.getElementById(elId)
      if (el) {
        el.addEventListener('click', function () {
          if (dkind) showDraftKind(dkind)
          postRoomDraft(path, extra || {}, dkind)
        })
      }
    }
    bindDraft('ms12-draft-report-int', '/report-draft', { kind: 'internal' }, 'report_int')
    bindDraft('ms12-draft-report-ext', '/report-draft', { kind: 'external' }, 'report_ext')
    bindDraft('ms12-draft-action-plan', '/report-draft', { kind: 'action_plan' }, 'action_plan')
    bindDraft('ms12-draft-result', '/report-draft', { kind: 'result_report' }, 'result_report')
    bindDraft('ms12-draft-proposal', '/report-draft', { kind: 'proposal' }, 'proposal')
    bindDraft('ms12-draft-press', '/content-draft', { channel: 'press' }, 'press')
    bindDraft('ms12-draft-blog', '/content-draft', { channel: 'blog' }, 'blog')
    bindDraft('ms12-draft-social', '/content-draft', { channel: 'social' }, 'social')
    var genCur = document.getElementById('ms12-draft-gen-current')
    if (genCur) {
      genCur.addEventListener('click', function () {
        var m = {
          report_int: ['/report-draft', { kind: 'internal' }, 'report_int'],
          report_ext: ['/report-draft', { kind: 'external' }, 'report_ext'],
          action_plan: ['/report-draft', { kind: 'action_plan' }, 'action_plan'],
          result_report: ['/report-draft', { kind: 'result_report' }, 'result_report'],
          proposal: ['/report-draft', { kind: 'proposal' }, 'proposal'],
          press: ['/content-draft', { channel: 'press' }, 'press'],
          blog: ['/content-draft', { channel: 'blog' }, 'blog'],
          social: ['/content-draft', { channel: 'social' }, 'social'],
        }
        var row = m[g_ms12DraftKind]
        if (row) postRoomDraft(row[0], row[1], row[2])
      })
    }

    loadActionItems()

    ms12Fetch('/api/ms12/meetings/' + encodeURIComponent(id), { credentials: 'include' })
      .then(function (r) {
        return jsonFromResponse(r).then(function (j) {
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
        roomServerOk = true
        try {
          recordMeetingLocal(d)
        } catch (e) {}
        for (var i = 0; i < titleEls.length; i++)
          titleEls[i].textContent = ms12DisplayTitle(id, d.title || '회의')
        if (saveTitleEl) {
          var sv = d.title != null ? String(d.title).trim() : ''
          if (!sv || sv === '새 회의') saveTitleEl.value = ms12SuggestedTitleOncePerRoom(id)
          else saveTitleEl.value = sv
        }
        for (var jn = 0; jn < codeEls.length; jn++) codeEls[jn].textContent = d.meetingCode || '—'
        var lnkB = document.getElementById('ms12-linked-ann')
        var lnkL = document.getElementById('ms12-linked-ann-line')
        var lnkA = document.getElementById('ms12-linked-ann-link')
        if (d.linkedAnnouncement && lnkB && lnkL) {
          lnkB.style.display = 'block'
          lnkL.textContent =
            (d.linkedAnnouncement.title || '—') +
            ' · ' +
            (d.linkedAnnouncement.organization || '') +
            (d.linkedAnnouncement.sourceUrl ? ' · 원문 링크 있음' : '')
          if (lnkA && d.linkedAnnouncement.id) {
            lnkA.href = '/app/announcements/' + encodeURIComponent(d.linkedAnnouncement.id)
            lnkA.style.display = 'inline'
          }
        } else if (lnkB) {
          lnkB.style.display = 'none'
          if (lnkA) lnkA.style.display = 'none'
        }
        showRoomErr('')
        return loadParticipants(id)
          .then(function (j) {
            return { ok: true, j: j }
          })
          .catch(function () {
            return { ok: true, j: { success: false, data: { participants: [] } } }
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

  function sanitizeAppNext() {
    var sp = new URLSearchParams(typeof location !== 'undefined' && location.search ? location.search : '')
    var nxt = sp.get('next')
    if (!nxt || nxt.indexOf('..') >= 0) return null
    nxt = nxt.split('#')[0] || ''
    if (!nxt || nxt.charAt(0) !== '/') return null
    return nxt
  }

  function initLoginPage() {
    try {
      window.location.replace('/app/meeting')
    } catch (e) {}
  }

  function initAnnouncementsList() {
    var form = document.getElementById('ms12-ann-filter')
    var listEl = document.getElementById('ms12-ann-list')
    var nlBtn = document.getElementById('ms12-ann-nl-btn')
    var nlTa = document.getElementById('ms12-ann-nl')
    var nlNote = document.getElementById('ms12-ann-nl-note')
    function loadFromForm() {
      if (!form || !listEl) return
      var fd = new FormData(form)
      var u = new URLSearchParams()
      var q = (fd.get('q') || '').toString().trim()
      var source = (fd.get('source') || '').toString().trim()
      var region = (fd.get('region') || '').toString().trim()
      var budgetMaxWon = (fd.get('budgetMaxWon') || '').toString().trim()
      var da = (fd.get('deadlineAfter') || '').toString().trim()
      var db = (fd.get('deadlineBefore') || '').toString().trim()
      if (q) u.set('q', q)
      if (source) u.set('source', source)
      if (region) u.set('region', region)
      if (budgetMaxWon) u.set('budgetMaxWon', budgetMaxWon)
      if (da) u.set('deadlineAfter', da)
      if (db) u.set('deadlineBefore', db)
      u.set('limit', '40')
      listEl.textContent = '불러오는 중…'
      ms12Fetch('/api/ms12/announcements?' + u.toString(), { credentials: 'include' })
        .then(function (r) {
          return jsonFromResponse(r)
        })
        .then(function (j) {
          var items = j && j.success && j.data && j.data.items ? j.data.items : []
          if (!items.length) {
            listEl.textContent = '결과가 없습니다. 필터를 넓히거나 수집·ingest를 확인하세요.'
            return
          }
          listEl.innerHTML = items
            .map(function (it) {
              var won =
                it.budgetMaxWon != null
                  ? Number(it.budgetMaxWon).toLocaleString() + '원 이하'
                  : '예산 미기재'
              return (
                '<div class="ms12-p" style="padding:0.45rem 0;border-bottom:1px solid rgb(241 245 249)"><a class="text-indigo-600" style="font-weight:600;text-decoration:underline" href="/app/announcements/' +
                encodeURIComponent(it.id) +
                '">' +
                escapeForHtml(String(it.title || '—')) +
                '</a><br/><span class="ms12-muted" style="font-size:0.85rem">' +
                escapeForHtml(String(it.organization || '')) +
                ' · ' +
                won +
                ' · 마갤 ' +
                escapeForHtml(String(it.deadline || '—')) +
                ' · ' +
                escapeForHtml(String(it.region || '—')) +
                '</span></div>'
              )
            })
            .join('')
        })
        .catch(function () {
          listEl.textContent = '목록을 불러오지 못했습니다.'
        })
    }
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault()
        loadFromForm()
      })
    }
    if (nlBtn && nlTa) {
      nlBtn.addEventListener('click', function () {
        var q0 = (nlTa.value || '').toString().trim()
        if (!q0) return
        if (nlNote) {
          nlNote.style.display = 'block'
          nlNote.textContent = '해석 중…'
        }
        ms12Fetch('/api/ms12/announcements/parse-query', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: q0, useAi: true }),
        })
          .then(function (r) {
            return jsonFromResponse(r)
          })
          .then(function (j) {
            var f = j && j.data && j.data.filters ? j.data.filters : {}
            if (form) {
              if (f.q != null) {
                var iq = form.querySelector('input[name="q"]')
                if (iq) iq.value = String(f.q)
              }
              if (f.budgetMaxWon != null) {
                var b = form.querySelector('input[name="budgetMaxWon"]')
                if (b) b.value = String(f.budgetMaxWon)
              }
              if (f.region != null) {
                var reg = form.querySelector('input[name="region"]')
                if (reg) reg.value = String(f.region)
              }
              if (f.source != null) {
                var sel = form.querySelector('select[name="source"]')
                if (sel) sel.value = String(f.source)
              }
            }
            if (nlNote) {
              nlNote.textContent = (j.data && j.data.source === 'ai' ? 'AI 해석 적용' : '휴리스틱 적용') + (j.data && j.data.note === 'NO_AI_KEY' ? ' (AI 키 없음)' : '')
            }
            loadFromForm()
          })
          .catch(function () {
            if (nlNote) nlNote.textContent = '해석 요청 실패. 필터를 직접 입력하세요.'
          })
      })
    }
    loadFromForm()
  }

  function initAnnouncementDetail() {
    var b = document.body
    if (!b || b.getAttribute('data-ms12-route') !== 'announcement_detail') return
    var id = b.getAttribute('data-ms12-announcement-id') || ''
    if (!id) return
    var titleEl = document.getElementById('ms12-ann-d-title')
    var bodyEl = document.getElementById('ms12-ann-d-body')
    var btnMeet = document.getElementById('ms12-ann-start-meeting')
    var btnProp = document.getElementById('ms12-ann-proposal-btn')
    var out = document.getElementById('ms12-ann-proposal-out')
    var msg = document.getElementById('ms12-ann-proposal-msg')
    var roomIn = document.getElementById('ms12-ann-room-id')
    var mrIn = document.getElementById('ms12-ann-mr-id')
    var docIn = document.getElementById('ms12-ann-doc-ids')
    ms12Fetch('/api/ms12/announcements/' + encodeURIComponent(id), { credentials: 'include' })
      .then(function (r) {
        return jsonFromResponse(r)
      })
      .then(function (j) {
        if (!j || !j.success || !j.data) {
          if (bodyEl) bodyEl.textContent = (j && j.error) || '불러오지 못했습니다.'
          return
        }
        var d = j.data
        if (titleEl) titleEl.textContent = d.title || '공고'
        if (bodyEl) {
          var lines = [
            '기관: ' + (d.organization || '—'),
            '예산(상한): ' +
              (d.budgetMaxWon != null ? Number(d.budgetMaxWon).toLocaleString() + '원' : '—') +
              (d.budgetNote ? ' (' + d.budgetNote + ')' : ''),
            '지원·규모: ' + (d.supportAmount || '—'),
            '대상: ' + (d.targetAudience || '—'),
            '지역: ' + (d.region || '—'),
            '마감: ' + (d.deadline || '—'),
            '유형: ' + (d.category || '—') + ' · 키워드: ' + (d.keywords || '—'),
            '원문: ' + (d.sourceUrl || ''),
          ]
          bodyEl.innerHTML =
            '<p class="ms12-p" style="white-space:pre-wrap">' +
            lines.map(escapeForHtml).join('\n') +
            '</p>' +
            (d.rawExcerpt
              ? '<p class="ms12-p" style="margin-top:0.5rem"><strong>요약</strong><br/>' + escapeForHtml(d.rawExcerpt) + '</p>'
              : '')
        }
      })
      .catch(function () {
        if (bodyEl) bodyEl.textContent = '요청 실패'
      })
    if (btnMeet) {
      btnMeet.addEventListener('click', function () {
        ms12Fetch('/api/ms12/announcements/' + encodeURIComponent(id), { credentials: 'include' })
          .then(function (r) {
            return jsonFromResponse(r)
          })
          .then(function (j) {
            if (!j || !j.success || !j.data) {
              alert((j && j.error) || '공고를 확인할 수 없습니다.')
              return
            }
            var t0 = (j.data.title || '공고').toString()
            var t = '[공고] ' + t0
            if (t.length > 200) t = t.slice(0, 197) + '…'
            return ms12Fetch('/api/ms12/meetings', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: t, announcementId: id }),
            })
              .then(function (r) {
                return jsonFromResponse(r).then(function (j2) {
                  return { ok: r.ok, j: j2 }
                })
              })
          })
          .then(function (o) {
            if (!o || !o.j || !o.j.success || !o.j.data || !o.j.data.id) {
              alert((o && o.j && o.j.error) || '회의를 만들지 못했습니다.')
              return
            }
            try {
              sessionStorage.setItem('ms12_proposal_room_for_ann_' + id, o.j.data.id)
            } catch (e) {}
            window.location.href = '/app/meeting/' + encodeURIComponent(o.j.data.id)
          })
          .catch(function () {
            alert('요청이 실패했습니다.')
          })
      })
    }
    if (btnProp) {
      btnProp.addEventListener('click', function () {
        if (msg) msg.textContent = '생성 중…'
        if (out) out.value = ''
        var payload = { extraNotes: '' }
        if (roomIn && roomIn.value && roomIn.value.trim()) payload.roomId = roomIn.value.trim()
        if (mrIn && mrIn.value && mrIn.value.trim()) payload.meetingRecordId = mrIn.value.trim()
        if (docIn && docIn.value && docIn.value.trim()) {
          var ids = docIn.value
            .split(/[,\s]+/)
            .map(function (s) {
              return parseInt(s, 10)
            })
            .filter(function (n) {
              return n > 0
            })
          if (ids.length) payload.documentIds = ids
        }
        try {
          var sid = sessionStorage.getItem('ms12_proposal_room_for_ann_' + id)
          if (sid && !payload.roomId) payload.roomId = sid
        } catch (e) {}
        ms12Fetch('/api/ms12/announcements/' + encodeURIComponent(id) + '/proposal-draft', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
          .then(function (r) {
            return jsonFromResponse(r)
          })
          .then(function (j) {
            if (j && j.success && j.data && j.data.draft) {
              if (out) out.value = j.data.draft
              if (msg) msg.textContent = '완료 (복사·편집 후 저장하세요)'
            } else {
              if (msg) msg.textContent = (j && (j.error || j.message)) || '실패'
            }
          })
          .catch(function () {
            if (msg) msg.textContent = '요청 실패'
          })
      })
    }
    try {
      var sr = sessionStorage.getItem('ms12_proposal_room_for_ann_' + id)
      if (sr && roomIn && !roomIn.value) roomIn.value = sr
    } catch (e) {}
  }

  /** 레거시 sessionStorage pending 재시도(오류 시 저장했던 경우) */
  function consumePendingCreateMeeting() {
    var A = typeof globalThis !== 'undefined' && globalThis.Ms12Actions
    if (!A || typeof A.createMeeting !== 'function') return
    var raw
    try {
      raw = sessionStorage.getItem('ms12_pending_create_meeting')
    } catch (e) {
      return
    }
    if (!raw) return
    var o
    try {
      o = JSON.parse(raw)
    } catch (e) {
      try {
        sessionStorage.removeItem('ms12_pending_create_meeting')
      } catch (e2) {}
      return
    }
    if (!o || typeof o !== 'object' || !o.title) {
      try {
        sessionStorage.removeItem('ms12_pending_create_meeting')
      } catch (e) {}
      return
    }
    try {
      sessionStorage.removeItem('ms12_pending_create_meeting')
    } catch (e) {}
    A.createMeeting({
      title: String(o.title),
      type: o.type != null ? String(o.type) : undefined,
      displayName: o.displayName != null ? String(o.displayName) : undefined,
    })
  }

  function initEntryPage() {
    var card = document.getElementById('ms12-entry-login')
    var statusEl = document.getElementById('ms12-entry-status')
    if (!card) return
    function setSt(t) {
      if (statusEl) statusEl.textContent = t || ''
    }
    function doCreate(title, type) {
      var A = typeof globalThis !== 'undefined' && globalThis.Ms12Actions
      if (!A || typeof A.createMeeting !== 'function') {
        setSt('잠시 후 다시 시도해 주세요.')
        return
      }
      setSt('회의를 준비하는 중…')
      var payload = { title: title || ms12NextMeetingTitleForToday() }
      if (type) payload.type = type
      A.createMeeting(payload)
        .then(function (res) {
          if (res && res.kind === 'error') setSt((res && res.error) || '회의를 시작할 수 없습니다.')
          else setSt('')
        })
        .catch(function () {
          setSt('요청에 실패했습니다.')
        })
    }
    card.addEventListener('click', function (ev) {
      var base = clickTargetElement(ev)
      if (!base || !base.closest) return
      var trig = base.closest('[data-ms12-entry-qs]')
      if (!trig) return
      var qs = trig.getAttribute('data-ms12-entry-qs')
      if (!qs) return
      ev.preventDefault()
      if (qs === 'start') {
        doCreate(ms12NextMeetingTitleForToday(), '')
        return
      }
      if (qs === 'quick') {
        doCreate(
          trig.getAttribute('data-ms12-title') || ms12NextMeetingTitleForToday(),
          trig.getAttribute('data-ms12-type') || ''
        )
      }
    })
  }

  function initMeetingHub() {
    var hubStatus = document.getElementById('ms12-mh-status')
    function setHubStatus(msg) {
      if (hubStatus) hubStatus.textContent = msg || ''
    }
    document.body.addEventListener('click', function (ev) {
      var base = clickTargetElement(ev)
      if (!base || !base.closest) return
      if (getRoute() !== 'meeting') return
      var el = base.closest('[data-ms12-action]')
      if (!el) return
      var A = typeof globalThis !== 'undefined' && globalThis.Ms12Actions
      if (!A || typeof A.createMeeting !== 'function') {
        setHubStatus('프로그램을 불러오지 못했습니다. 페이지를 새로고침 해 주세요.')
        return
      }
      var act = el.getAttribute('data-ms12-action') || ''
      if (!act) return
      ev.preventDefault()
      function runCreate(payload) {
        setHubStatus('회의를 준비하는 중…')
        A.createMeeting(payload)
          .then(function (res) {
            if (res && res.kind === 'error')
              setHubStatus((res && res.error) || '회의를 시작할 수 없습니다.')
            else setHubStatus('')
          })
          .catch(function () {
            setHubStatus('요청에 실패했습니다.')
          })
      }
      if (act === 'meeting-start') {
        runCreate({ title: ms12NextMeetingTitleForToday() })
        return
      }
      if (act === 'meeting-start-quick') {
        runCreate({
          title: el.getAttribute('data-ms12-title') || ms12NextMeetingTitleForToday(),
          type: el.getAttribute('data-ms12-type') || undefined,
        })
        return
      }
      if (act === 'meeting-join' && A.openAppPath) A.openAppPath('/app/join')
      else if (act === 'records-open' && A.openAppPath) A.openAppPath('/app/records')
      else if (act === 'app-archive' && A.openAppPath) A.openAppPath('/app/archive')
      else if (act === 'app-library' && A.openAppPath) A.openAppPath('/app/library')
    })
  }

  function initAuthedPage() {
    var route = getRoute()
    if (route === 'entry') initEntryPage()
    if (route === 'meeting') initMeetingHub()
    if (route === 'desk') {
      initDeskHome()
    }
    if (route === 'hub') {
      initHomeRecent()
      initHomeDashboard()
    }
    if (route === 'meeting_new') initFormNew()
    if (route === 'join') initFormJoin()
    if (route === 'records') initRecordsList()
    if (route === 'meeting_room') initMeetingRoom()
    if (route === 'library') initLibrary()
    if (route === 'archive') initArchive()
    if (route === 'meeting_record') initMeetingRecord()
    if (route === 'login') initLoginPage()
    if (route === 'announcements') initAnnouncementsList()
    if (route === 'announcement_detail') initAnnouncementDetail()
  }

  function renderArchiveRows(items) {
    if (!items || !items.length) {
      return '<p class="ms12-muted">저장된 회의가 없습니다.</p>'
    }
    return items
      .map(function (it) {
        return (
          '<div class="ms12-p" style="padding:0.4rem 0;border-bottom:1px solid rgb(241 245 249)"><a href="/app/meeting-record/' +
          encodeURIComponent(it.id) +
          '" class="text-indigo-600" style="text-decoration:underline;font-weight:600">' +
          escapeForHtml((it.title || '—') + '') +
          '</a> <span class="ms12-muted" style="font-size:0.85rem">' +
          (it.meetingDate || '—') +
          ' · ' +
          escapeForHtml((it.category || '') + '') +
          (it.tags
            ? ' · ' + escapeForHtml((it.tags || '') + '')
            : '') +
          '</span></div>'
        )
      })
      .join('')
  }

  function initArchive() {
    var el = document.getElementById('ms12-ar-list')
    var f = document.getElementById('ms12-ar-filter')
    function load() {
      var p = { limit: 50, sort: 'updated_desc' }
      if (f) {
        var fd = new FormData(f)
        p.q = (fd.get('q') || '').toString().trim()
        p.category = (fd.get('category') || '').toString().trim()
        p.tag = (fd.get('tag') || '').toString().trim()
        p.dateFrom = (fd.get('dateFrom') || '').toString().trim()
        p.dateTo = (fd.get('dateTo') || '').toString().trim()
        p.sort = (fd.get('sort') || 'updated_desc').toString()
      }
      var u = new URLSearchParams()
      Object.keys(p).forEach(function (k) {
        if (p[k]) u.set(k, p[k])
      })
      if (el) el.textContent = '불러오는 중…'
      ms12Fetch('/api/ms12/meeting-records?' + u.toString(), { credentials: 'include' })
        .then(function (r) {
          return jsonFromResponse(r)
        })
        .then(function (j) {
          if (j && j.success && j.data && j.data.items) {
            if (el) el.innerHTML = renderArchiveRows(j.data.items)
          } else {
            if (el) el.textContent = (j && j.error) || '오류'
          }
        })
        .catch(function () {
          if (el) el.textContent = '불러오지 못했습니다.'
        })
    }
    if (f) {
      f.addEventListener('submit', function (ev) {
        ev.preventDefault()
        load()
      })
    }
    load()
  }

  function initMeetingRecord() {
    var b = document.body
    var rid = b.getAttribute('data-ms12-record-id') || ''
    if (!rid) return
    var f = document.getElementById('ms12-mr-form')
    var msg = document.getElementById('ms12-mr-msg')
    var meta = document.getElementById('ms12-mr-meta')
    ms12Fetch('/api/ms12/meeting-records/' + encodeURIComponent(rid), { credentials: 'include' })
      .then(function (r) {
        return jsonFromResponse(r)
      })
      .then(function (j) {
        if (!j || !j.success || !j.data) {
          if (meta) meta.textContent = (j && j.error) || '불러올 수 없습니다.'
          return
        }
        var d = j.data
        if (meta) {
          meta.textContent =
            '최종 수정: ' + (d.updatedAt || '—') + ' · 공개: ' + (d.visibility || '—')
        }
        var M = {
          'ms12-mr-title': d.title,
          'ms12-mr-date': (d.meetingDate || '').slice(0, 10),
          'ms12-mr-cat': d.category,
          'ms12-mr-parts': d.participantsJson || '',
          'ms12-mr-vis': d.visibility,
          'ms12-mr-tags': d.tags || '',
          'ms12-mr-proj': d.projectName || '',
          'ms12-mr-bud': d.budgetRef || '',
          'ms12-mr-tg': d.targetGroup || '',
          'ms12-mr-raw': d.rawNotes || '',
          'ms12-mr-tr': d.transcript || '',
          'ms12-mr-fin': d.finalNotes || '',
          'ms12-mr-s0': d.summaryBasic || '',
          'ms12-mr-s1': d.summaryAction || '',
          'ms12-mr-s2': d.summaryReport || '',
        }
        Object.keys(M).forEach(function (k) {
          var el2 = document.getElementById(k)
          if (el2) el2.value = M[k] != null ? M[k] : ''
        })
      })
    if (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault()
        if (msg) msg.textContent = '저장 중…'
        var fd = new FormData(f)
        var payload = {
          title: (fd.get('title') || '').toString().trim(),
          meetingDate: (fd.get('meetingDate') || '').toString().trim(),
          category: (fd.get('category') || '').toString().trim() || '일반',
          participantsJson: (fd.get('participantsJson') || '').toString().trim() || null,
          visibility: (fd.get('visibility') || 'public_internal').toString(),
          tags: (fd.get('tags') || '').toString().trim() || null,
          projectName: (fd.get('projectName') || '').toString().trim() || null,
          budgetRef: (fd.get('budgetRef') || '').toString().trim() || null,
          targetGroup: (fd.get('targetGroup') || '').toString().trim() || null,
          rawNotes: (fd.get('rawNotes') || '').toString(),
          transcript: (fd.get('transcript') || '').toString() || null,
          finalNotes: (fd.get('finalNotes') || '').toString() || null,
          summaryBasic: (fd.get('summaryBasic') || '').toString() || null,
          summaryAction: (fd.get('summaryAction') || '').toString() || null,
          summaryReport: (fd.get('summaryReport') || '').toString() || null,
        }
        ms12Fetch('/api/ms12/meeting-records/' + encodeURIComponent(rid), {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
          .then(function (r) {
            return jsonFromResponse(r)
          })
          .then(function (j) {
            if (j && j.success) {
              if (msg) msg.textContent = '저장됨 ' + new Date().toLocaleTimeString()
            } else {
              if (msg) msg.textContent = (j && j.error) || '실패'
            }
          })
          .catch(function () {
            if (msg) msg.textContent = '요청 실패'
          })
      })
    }
  }

  function renderDocRows(items) {
    if (!items || !items.length) {
      return '<p class="ms12-muted" style="font-size:0.9rem">자료가 없습니다.</p>'
    }
    return items
      .map(function (it) {
        var line =
          (it.id != null ? '<strong>#' + String(it.id) + '</strong> ' : '') +
          escapeForHtml((it.title || '—') + '') +
          (it.docType ? ' <span class="ms12-muted">· ' + escapeForHtml(String(it.docType)) + '</span>' : '') +
          (it.year != null ? ' <span class="ms12-muted">· ' + it.year + '년</span>' : '') +
          (it.budgetWon != null ? ' <span class="ms12-muted">· 예산 ' + it.budgetWon + '원</span>' : '')
        var link = it.fileUrl
          ? ' <a class="text-indigo-600" style="text-decoration:underline;font-size:0.86rem" href="' +
            escapeForHtml(String(it.fileUrl)) +
            '" target="_blank" rel="noopener">파일</a>'
          : ''
        var del = ''
        return '<div class="ms12-p" style="padding:0.4rem 0;border-bottom:1px solid rgb(241 245 249);font-size:0.9rem">' + line + link + del + '</div>'
      })
      .join('')
  }

  function initLibrary() {
    var listEl = document.getElementById('ms12-lib-list')
    var errEl = document.getElementById('ms12-lib-err')
    var form = document.getElementById('ms12-lib-search')
    var nlBtn = document.getElementById('ms12-lib-nl-btn')
    var nlTa = document.getElementById('ms12-lib-nl')
    var upForm = document.getElementById('ms12-lib-up')
    var upMsg = document.getElementById('ms12-lib-up-msg')
    var combBtn = document.getElementById('ms12-lib-combine')
    var combIds = document.getElementById('ms12-lib-combine-ids')
    var combOut = document.getElementById('ms12-lib-combine-out')

    function showErr(m) {
      if (!errEl) return
      if (m) {
        errEl.textContent = m
        errEl.style.display = 'block'
      } else {
        errEl.style.display = 'none'
        errEl.textContent = ''
      }
    }

    function loadList(q) {
      q = q || {}
      var u = new URLSearchParams()
      if (q.q) u.set('q', q.q)
      if (q.docType) u.set('docType', q.docType)
      if (q.year) u.set('year', q.year)
      u.set('limit', '30')
      if (listEl) listEl.textContent = '불러오는 중…'
      ms12Fetch('/api/ms12/documents?' + u.toString(), { credentials: 'include' })
        .then(function (r) {
          return jsonFromResponse(r)
        })
        .then(function (j) {
          if (j && j.success && j.data && j.data.items) {
            if (listEl) listEl.innerHTML = renderDocRows(j.data.items)
            showErr('')
          } else {
            if (listEl) listEl.textContent = (j && j.error) || '오류'
          }
        })
        .catch(function () {
          if (listEl) listEl.textContent = '불러오지 못했습니다.'
        })
    }
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault()
        var fd = new FormData(form)
        loadList({
          q: (fd.get('q') || '').toString().trim(),
          docType: (fd.get('docType') || '').toString().trim(),
          year: (fd.get('year') || '').toString().trim(),
        })
      })
    }
    if (nlBtn && nlTa) {
      nlBtn.addEventListener('click', function () {
        var q = (nlTa.value || '').toString().trim()
        if (!q) return
        showErr('')
        if (listEl) listEl.textContent = 'AI 검색 중…'
        ms12Fetch('/api/ms12/documents/ai-search', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: q, limit: 30 }),
        })
          .then(function (r) {
            return jsonFromResponse(r)
          })
          .then(function (j) {
            if (j && j.success && j.data && j.data.items) {
              var hdr =
                (j.data.filters
                  ? '<p class="ms12-muted" style="font-size:0.8rem">해석: ' +
                    escapeForHtml(JSON.stringify(j.data.filters)) +
                    '</p>'
                  : '') || ''
              if (listEl) listEl.innerHTML = hdr + renderDocRows(j.data.items)
            } else {
              var er = (j && (j.error || j.message)) || '실패'
              showErr(String(er))
              if (listEl) listEl.textContent = '—'
            }
          })
          .catch(function () {
            showErr('요청이 실패했습니다.')
            if (listEl) listEl.textContent = '—'
          })
      })
    }
    if (upForm) {
      upForm.addEventListener('submit', function (e) {
        e.preventDefault()
        if (upMsg) upMsg.textContent = '업로드 중…'
        var fd2 = new FormData(upForm)
        ms12Fetch('/api/ms12/documents', {
          method: 'POST',
          credentials: 'include',
          body: fd2,
        })
          .then(function (r) {
            return jsonFromResponse(r)
          })
          .then(function (j) {
            if (j && j.success) {
              if (upMsg) upMsg.textContent = '저장됨(#' + (j.data && j.data.id) + ').'
              try {
                upForm.reset()
              } catch (e) {}
              loadList({})
            } else {
              if (upMsg) upMsg.textContent = (j && (j.error || j.message)) || '실패'
            }
          })
          .catch(function () {
            if (upMsg) upMsg.textContent = '요청 실패'
          })
      })
    }
    if (combBtn && combIds && combOut) {
      combBtn.addEventListener('click', function () {
        var raw = (combIds.value || '')
          .toString()
          .split(/[,\s]+/)
          .map(function (s) {
            return parseInt(s, 10)
          })
          .filter(function (n) {
            return n > 0
          })
        if (raw.length < 2) {
          combOut.value = 'id를 2개 이상 넣으세요.'
          return
        }
        combOut.value = '생성 중…'
        ms12Fetch('/api/ms12/documents/combine-draft', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentIds: raw }),
        })
          .then(function (r) {
            return jsonFromResponse(r)
          })
          .then(function (j) {
            if (j && j.success && j.data && j.data.draft) {
              combOut.value = j.data.draft
            } else {
              combOut.value = (j && (j.error || j.message)) || '실패'
            }
          })
          .catch(function () {
            combOut.value = '요청 실패'
          })
      })
    }
    var spLib = new URLSearchParams(
      typeof location !== 'undefined' && location.search ? location.search : ''
    )
    var preQ = spLib.get('q')
    if (preQ && form) {
      var qIn = form.querySelector('input[name="q"]')
      if (qIn) qIn.value = preQ
      loadList({ q: preQ.trim() })
    } else {
      loadList({})
    }
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
        actor: { type: 'public', id: lid, source: 'offline' },
      }
      authed = false
      authLog('me failed or offline; continue as local public actor', lid)
    }
    if (openMode && !authed && j && j.success && j.data == null && (!j.actor || j.actor == null)) {
      var lid3 = ensureLocalOnlyActorId()
      j = Object.assign({}, j, { actor: { type: 'public', id: lid3, source: 'local' } })
    }
    var guestIdentified = !!(
      j &&
      j.data &&
      j.data.id &&
      (j.data.type === 'guest' || j.data.type === 'public')
    )
    var user = null
    if (authed && j && j.data) user = j.data
    else if (guestIdentified) user = j.data
    var isAnon = !authed && !guestIdentified
    _lastIsAuthed = authed
    var demoMode = isAnon || pageMode === 'demo'
    if (j && j.actor && (j.actor.type === 'guest' || j.actor.type === 'public')) {
      try {
        localStorage.setItem('ms12_actor', JSON.stringify(j.actor))
      } catch (e) {}
    }
    if (authed) {
      try {
        localStorage.setItem('user', JSON.stringify(j.data))
      } catch (e) {}
    }

    if (hadOauth) {
      stripOauthParam()
    }

    var showApp = openMode || authed || guestIdentified
    if (showApp) {
      applyNextToOAuthLinks()
      applyShell('app', {
        user: user,
        isGuest: isAnon,
        guestIdentified: guestIdentified,
        sessionAuthed: authed,
        demoMode: demoMode,
      })
      wireLogout()
      initAuthedPage()
      if (authed) {
        try {
          consumePendingCreateMeeting()
        } catch (e) {}
      }
    } else {
      applyNextToOAuthLinks()
      applyShell('app', { user: null, isGuest: true, demoMode: true })
      wireLogout()
      initAuthedPage()
    }
  }

  function safeRun() {
    return run().catch(function (e) {
      authLog('route=' + routePath(), 'error=', String((e && e.message) || e))
      var dm = getPageAuthMode() === 'demo'
      try {
        ensureLocalOnlyActorId()
      } catch (err) {}
      _lastIsAuthed = false
      applyShell('app', { user: null, isGuest: true, demoMode: dm })
      wireLogout()
      initAuthedPage()
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', safeRun)
  } else {
    safeRun()
  }
})()
