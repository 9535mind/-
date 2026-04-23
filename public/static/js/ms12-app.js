/**
 * MS12 /app* — /api/auth/me 단일 진실, 확인 중(authing)/로그인됨/비로그인 3단계
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

  /** data-ms12-route 없을 때(캐시·구 HTML) location.pathname으로 보강 — /app/login에서 반드시 login 으로 */
  function getRoute() {
    var b = document.body
    var attr = b && b.getAttribute('data-ms12-route')
    if (attr) return attr
    var p = (typeof location !== 'undefined' && location.pathname) || ''
    p = p.replace(/\/$/, '') || '/'
    if (p === '/app/login') return 'login'
    if (p === '/app/meeting') return 'meeting'
    if (p === '/app' || p === '' || p === '/') return 'home'
    return 'home'
  }

  /** /app, /app/login, /app/meeting → 로그용 */
  function routePathForLog() {
    var r = getRoute()
    if (r === 'login') return '/app/login'
    if (r === 'meeting') return '/app/meeting'
    return '/app'
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
      }, 8000)
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

  async function fetchMeWithRetry(attempts, delayMs) {
    var last = null
    for (var i = 0; i < attempts; i++) {
      if (i > 0) {
        await new Promise(function (r) {
          setTimeout(r, delayMs)
        })
      }
      last = await fetchMeOnce()
      if (isAuthedFromMe(last.json)) {
        return last
      }
    }
    return last
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
              window.location.href = '/app/login'
            })
            .catch(function () {
              window.location.href = '/app/login'
            })
        })
      })(btns[i])
    }
  }

  async function run() {
    var route = getRoute()
    var hadOauth = new URLSearchParams(window.location.search || '').get('oauth_sync') === '1'

    setShellState('loading', null)

    var o = await fetchMeWithRetry(hadOauth ? 6 : 4, 150)
    if (hadOauth) {
      stripOauthParam()
    }

    var j = o && o.json
    var authed = isAuthedFromMe(j)
    var user = authed && j && j.data ? j.data : null
    if (authed) {
      try {
        localStorage.setItem('user', JSON.stringify(j.data))
      } catch (e) {}
    }

    var rpath = routePathForLog()
    if (route === 'login' && authed) {
      authLog('route=' + rpath, 'auth=authed', 'redirect=/app/meeting')
      window.location.replace('/app/meeting')
      return
    }

    if (rpath === '/app') {
      authLog('route=' + rpath, 'auth=' + (authed ? 'authed' : 'guest'))
    } else if (rpath === '/app/login') {
      authLog('route=' + rpath, 'auth=guest')
    } else {
      authLog('route=' + rpath, 'auth=' + (authed ? 'authed' : 'guest'))
    }

    if (authed) {
      setShellState('authed', user)
      wireLogout()
    } else {
      if (route === 'login') {
        applyNextToOAuthLinks()
      }
      setShellState('guest', null)
    }
  }

  function safeRun() {
    return run().catch(function (e) {
      authLog('route=' + routePathForLog(), 'error=', String((e && e.message) || e))
      setShellState('guest', null)
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', safeRun)
  } else {
    safeRun()
  }
})()
