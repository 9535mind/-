/**
 * MINDSTORY Classic / Next / Consortium (브랜드별 테마)
 * /courses/classic, /courses/next, /courses/ncs, /courses/consortium — pages의 /courses/:id 보다 먼저 등록할 것
 */

import { Context, Hono } from 'hono'
import { Bindings, User } from '../types/database'
import { optionalAuth } from '../middleware/auth'
import { resolveAdminCommandPulse } from '../utils/site-header-admin-ssr'
import { siteFooterLegalBlockHtml } from '../utils/site-footer-legal'
import {
  siteAiChatWidgetMarkup,
  siteAiChatWidgetScript,
  siteAiChatWidgetStyles,
} from '../utils/site-ai-chat-widget'
import {
  siteFloatingQuickMenuMarkup,
  siteFloatingQuickMenuScript,
  siteFloatingQuickMenuStyles,
} from '../utils/site-floating-quick-menu'
import {
  siteHeaderDrawerControlScript,
  siteHeaderFullMarkup,
  siteHeaderNavCoursesGlassStyles,
} from '../utils/site-header-courses-nav'
import { SITE_POPUP_SCRIPT_TAG } from '../utils/site-popup-script'

const app = new Hono<{ Bindings: Bindings; Variables: { user?: User } }>()
app.use('*', optionalAuth)

async function shell(c: Context, title: string, bodyClass: string, inner: string): Promise<string> {
  const adminCommandPulse = await resolveAdminCommandPulse(c)
  const adminChrome = (c.get('user') as User | undefined)?.role === 'admin'
  const bodyAttr = adminChrome ? ' data-ms-admin-chrome="1"' : ''
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — 마인드스토리</title>
  <link rel="stylesheet" href="/static/css/app.css" />
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script src="/static/js/auth.js?v=20260329-admin-name"></script>
  <script src="/static/js/utils.js"></script>
  ${siteHeaderNavCoursesGlassStyles()}
  ${siteFloatingQuickMenuStyles()}
</head>
<body class="${bodyClass} min-h-screen"${bodyAttr}>
  ${siteHeaderFullMarkup({ variant: 'brand', adminCommandPulse })}
  ${inner}
  <footer class="mt-16 border-t border-black/10 py-10 bg-white/60">
    <div class="max-w-7xl mx-auto px-4 text-sm text-slate-600">
      ${siteFooterLegalBlockHtml()}
    </div>
  </footer>
  ${siteFloatingQuickMenuMarkup()}
  ${siteAiChatWidgetMarkup()}
  <script>
    document.addEventListener('DOMContentLoaded', function () {
      ${siteHeaderDrawerControlScript('brand')}
      ${siteFloatingQuickMenuScript()}
      ${siteAiChatWidgetScript()}
    })
  </script>
  ${SITE_POPUP_SCRIPT_TAG}
</body>
</html>`
}

app.get('/courses/classic', async (c) => {
  return c.html(
    await shell(
      c,
      'MINDSTORY Classic',
      'theme-legacy bg-mst-surface',
      `
  <main class="max-w-7xl mx-auto px-4 py-12">
    <div class="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div>
        <span class="text-mst-accent font-semibold text-sm tracking-widest uppercase">Heritage</span>
        <h1 class="text-3xl md:text-4xl font-bold text-mst-navy mt-2 tracking-tight">Classic 강좌</h1>
        <p class="text-slate-600 mt-2 max-w-2xl leading-relaxed">본질의 깊이 — 상담·진로·학습의 기록이 쌓이는 차분한 여정입니다.</p>
      </div>
      <div class="rounded-xl bg-white border border-mst-line px-4 py-2 text-xs text-slate-600 shadow-sm shrink-0">헤리티지 모드 · 딥 네이비 액센트</div>
    </div>
    <div id="gridClassic" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
    <script>
      (async function() {
        function msLineTokens(cg) {
          var parts = String(cg || 'CLASSIC').toUpperCase().replace(/\\s/g, '').split(/[,，]/).filter(Boolean)
          var al = ['CLASSIC', 'NEXT', 'NCS']
          var o = []
          parts.forEach(function (p) { if (al.indexOf(p) >= 0 && o.indexOf(p) < 0) o.push(p) })
          return o.length ? o : ['CLASSIC']
        }
        function msLineBadgesClassic(cg) {
          return msLineTokens(cg).map(function (k) {
            var cls = k === 'NEXT' ? 'bg-violet-100 text-violet-800' : k === 'NCS' ? 'bg-amber-100 text-amber-900' : 'bg-slate-200/90 text-mst-navy'
            var lab = k === 'CLASSIC' ? 'Classic' : k === 'NEXT' ? 'Next' : 'NCS'
            return '<span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ' + cls + '">' + lab + '</span>'
          }).join(' ')
        }
        function msLineLabelStr(cg) {
          return msLineTokens(cg).map(function (k) {
            return k === 'NEXT' ? 'Next' : k === 'NCS' ? 'NCS' : 'Classic'
          }).join(' · ')
        }
        try {
          var msAdmin = document.body.getAttribute('data-ms-admin-chrome') === '1'
          try { if (localStorage.getItem('mindstory_view_mode') === 'student') msAdmin = false } catch (e) {}
          var res = await axios.get('/api/courses?category_group=CLASSIC')
          var list = res.data.data || []
          var el = document.getElementById('gridClassic')
          if (!list.length) { el.innerHTML = '<p class="text-slate-500">등록된 Classic 강좌가 없습니다.</p>'; return }
          el.innerHTML = list.map(function(course) {
            var pencil = msAdmin
              ? '<a href="/admin/course/edit/' + course.id + '" class="admin-magic-pencil shrink-0 mt-0.5" title="관리자 수정" aria-label="강좌 수정"><i class="fas fa-pencil-alt" aria-hidden="true"></i></a>'
              : ''
            return '<article class="rounded-2xl border border-slate-200/90 bg-white shadow-sm hover:shadow-md transition overflow-hidden group">' +
              '<a href="/courses/' + course.id + '" class="block relative aspect-[16/10] w-full overflow-hidden bg-slate-900">' +
              '<img src="' + (course.thumbnail_url || '/static/images/course-placeholder.svg') + '" alt="" class="absolute inset-0 w-full h-full object-cover transition duration-500 group-hover:scale-[1.03]" onerror="this.src=\'/static/images/course-placeholder.svg\'" />' +
              '<div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none"></div>' +
              '<div class="absolute bottom-0 left-0 right-0 p-4 md:p-5">' +
              '<h2 class="font-bold text-white text-lg md:text-xl leading-snug line-clamp-2 drop-shadow-sm">' + (course.title || '') + '</h2>' +
              '<div class="flex flex-wrap gap-1 mt-2">' + msLineBadgesClassic(course.category_group) + '</div>' +
              '<p class="text-sm text-gray-300 mt-2 line-clamp-1">' + msLineLabelStr(course.category_group) + ' · 마인드스토리 강좌</p>' +
              '</div></a>' +
              '<div class="p-5">' +
              '<p class="text-sm text-slate-600 flex items-start gap-1">' +
              '<span class="line-clamp-2 flex-1 min-w-0">' + (course.description || '') + '</span>' + pencil + '</p>' +
              '<a href="/courses/' + course.id + '" class="mt-4 inline-block rounded-lg bg-mst-navy text-white px-4 py-2 text-sm font-semibold hover:bg-mst-navy-light">자세히</a>' +
              '</div></article>'
          }).join('')
        } catch (e) {
          document.getElementById('gridClassic').innerHTML = '<p class="text-red-600">목록을 불러오지 못했습니다.</p>'
        }
      })()
    </script>
  </main>`,
    ),
  )
})

app.get('/courses/next', async (c) => {
  return c.html(
    await shell(
      c,
      'MINDSTORY Next',
      'theme-next bg-slate-50',
      `
  <main class="max-w-7xl mx-auto px-4 py-12">
    <div class="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div>
        <span class="text-next-accent font-semibold text-sm tracking-widest uppercase">Next</span>
        <h1 class="text-3xl md:text-4xl font-bold text-next-ink mt-2 tracking-tight">Next 강좌</h1>
        <p class="text-slate-600 mt-2 max-w-2xl leading-relaxed">미래의 확장 — AI 동화·기술·창작으로 이어지는 세련된 학습 라인입니다.</p>
      </div>
      <div class="rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs text-slate-500 shadow-sm shrink-0">라이트 모드 · 블루 포인트</div>
    </div>
    <div id="gridNext" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
    <script>
      (async function() {
        function msLineTokens(cg) {
          var parts = String(cg || 'CLASSIC').toUpperCase().replace(/\\s/g, '').split(/[,，]/).filter(Boolean)
          var al = ['CLASSIC', 'NEXT', 'NCS']
          var o = []
          parts.forEach(function (p) { if (al.indexOf(p) >= 0 && o.indexOf(p) < 0) o.push(p) })
          return o.length ? o : ['CLASSIC']
        }
        function msLineBadgesNext(cg) {
          return msLineTokens(cg).map(function (k) {
            var cls = k === 'NEXT' ? 'bg-violet-100 text-violet-800' : k === 'NCS' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700'
            var lab = k === 'CLASSIC' ? 'Classic' : k === 'NEXT' ? 'Next' : 'NCS'
            return '<span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ' + cls + '">' + lab + '</span>'
          }).join(' ')
        }
        function msLineLabelStrNext(cg) {
          return msLineTokens(cg).map(function (k) {
            return k === 'NEXT' ? 'Next' : k === 'NCS' ? 'NCS' : 'Classic'
          }).join(' · ')
        }
        try {
          var msAdmin = document.body.getAttribute('data-ms-admin-chrome') === '1'
          try { if (localStorage.getItem('mindstory_view_mode') === 'student') msAdmin = false } catch (e) {}
          var res = await axios.get('/api/courses?category_group=NEXT')
          var list = res.data.data || []
          var el = document.getElementById('gridNext')
          if (!list.length) { el.innerHTML = '<p class="text-slate-600">등록된 Next 강좌가 없습니다.</p>'; return }
          el.innerHTML = list.map(function(course) {
            var pencil = msAdmin
              ? '<a href="/admin/course/edit/' + course.id + '" class="admin-magic-pencil shrink-0 mt-0.5" title="관리자 수정" aria-label="강좌 수정"><i class="fas fa-pencil-alt" aria-hidden="true"></i></a>'
              : ''
            return '<article class="rounded-2xl border border-slate-200 bg-white shadow-md hover:border-next-accent/40 hover:shadow-lg transition overflow-hidden group">' +
              '<div class="h-2 bg-gradient-to-r from-next-accent to-slate-400"></div>' +
              '<a href="/courses/' + course.id + '" class="block relative aspect-[16/10] w-full overflow-hidden bg-slate-900">' +
              '<img src="' + (course.thumbnail_url || '/static/images/course-placeholder.svg') + '" alt="" class="absolute inset-0 w-full h-full object-cover transition duration-500 group-hover:scale-[1.03]" onerror="this.src=\'/static/images/course-placeholder.svg\'" />' +
              '<div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none"></div>' +
              '<div class="absolute bottom-0 left-0 right-0 p-4 md:p-5">' +
              '<h2 class="font-bold text-white text-lg md:text-xl leading-snug line-clamp-2 drop-shadow-sm">' + (course.title || '') + '</h2>' +
              '<div class="flex flex-wrap gap-1 mt-2">' + msLineBadgesNext(course.category_group) + '</div>' +
              '<p class="text-sm text-gray-300 mt-2 line-clamp-1">' + msLineLabelStrNext(course.category_group) + ' · 마인드스토리 강좌</p>' +
              '</div></a>' +
              '<div class="p-5">' +
              '<p class="text-sm text-slate-600 flex items-start gap-1">' +
              '<span class="line-clamp-2 flex-1 min-w-0">' + (course.description || '') + '</span>' + pencil + '</p>' +
              '<a href="/courses/' + course.id + '" class="mt-4 inline-block rounded-lg bg-next-accent text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700">자세히</a>' +
              '</div></article>'
          }).join('')
        } catch (e) {
          document.getElementById('gridNext').innerHTML = '<p class="text-red-600">목록을 불러오지 못했습니다.</p>'
        }
      })()
    </script>
  </main>`,
    ),
  )
})

app.get('/courses/ncs', async (c) => {
  return c.html(
    await shell(
      c,
      'NCS 직업훈련',
      'bg-gradient-to-b from-amber-50/80 via-white to-slate-50',
      `
  <main class="max-w-7xl mx-auto px-4 py-12">
    <div class="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div>
        <span class="text-amber-800 font-semibold text-sm tracking-widest uppercase">NCS</span>
        <h1 class="text-3xl md:text-4xl font-bold text-amber-950 mt-2 tracking-tight">국가직무능력표준 연계 강좌</h1>
        <p class="text-slate-700 mt-2 max-w-2xl leading-relaxed">산업인력공단 및 직업훈련과 연계될 수 있는 과정입니다. 세부 훈련·평가·출석 규정은 각 강좌 공지를 따릅니다.</p>
      </div>
      <div class="rounded-xl bg-white border border-amber-200/80 px-4 py-2 text-xs text-amber-900/80 shadow-sm shrink-0">NCS · 직업훈련</div>
    </div>
    <div id="gridNcs" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
    <script>
      (async function() {
        function msLineTokens(cg) {
          var parts = String(cg || 'CLASSIC').toUpperCase().replace(/\\s/g, '').split(/[,，]/).filter(Boolean)
          var al = ['CLASSIC', 'NEXT', 'NCS']
          var o = []
          parts.forEach(function (p) { if (al.indexOf(p) >= 0 && o.indexOf(p) < 0) o.push(p) })
          return o.length ? o : ['CLASSIC']
        }
        function msLineBadgesNcs(cg) {
          return msLineTokens(cg).map(function (k) {
            var cls = k === 'NEXT' ? 'bg-violet-100 text-violet-800' : k === 'NCS' ? 'bg-amber-200 text-amber-950' : 'bg-slate-100 text-slate-700'
            var lab = k === 'CLASSIC' ? 'Classic' : k === 'NEXT' ? 'Next' : 'NCS'
            return '<span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ' + cls + '">' + lab + '</span>'
          }).join(' ')
        }
        function msLineLabelStrNcs(cg) {
          return msLineTokens(cg).map(function (k) {
            return k === 'NEXT' ? 'Next' : k === 'NCS' ? 'NCS' : 'Classic'
          }).join(' · ')
        }
        try {
          var msAdmin = document.body.getAttribute('data-ms-admin-chrome') === '1'
          try { if (localStorage.getItem('mindstory_view_mode') === 'student') msAdmin = false } catch (e) {}
          var res = await axios.get('/api/courses?category_group=NCS')
          var list = res.data.data || []
          var el = document.getElementById('gridNcs')
          if (!list.length) { el.innerHTML = '<p class="text-slate-600">등록된 NCS 강좌가 없습니다.</p>'; return }
          el.innerHTML = list.map(function(course) {
            var pencil = msAdmin
              ? '<a href="/admin/course/edit/' + course.id + '" class="admin-magic-pencil shrink-0 mt-0.5" title="관리자 수정" aria-label="강좌 수정"><i class="fas fa-pencil-alt" aria-hidden="true"></i></a>'
              : ''
            return '<article class="rounded-2xl border border-amber-200/70 bg-white shadow-md hover:shadow-lg transition overflow-hidden group">' +
              '<div class="h-2 bg-gradient-to-r from-amber-500 to-amber-700"></div>' +
              '<a href="/courses/' + course.id + '" class="block relative aspect-[16/10] w-full overflow-hidden bg-slate-900">' +
              '<img src="' + (course.thumbnail_url || '/static/images/course-placeholder.svg') + '" alt="" class="absolute inset-0 w-full h-full object-cover transition duration-500 group-hover:scale-[1.03]" onerror="this.src=\'/static/images/course-placeholder.svg\'" />' +
              '<div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none"></div>' +
              '<div class="absolute bottom-0 left-0 right-0 p-4 md:p-5">' +
              '<h2 class="font-bold text-white text-lg md:text-xl leading-snug line-clamp-2 drop-shadow-sm">' + (course.title || '') + '</h2>' +
              '<div class="flex flex-wrap gap-1 mt-2">' + msLineBadgesNcs(course.category_group) + '</div>' +
              '<p class="text-sm text-gray-300 mt-2 line-clamp-1">' + msLineLabelStrNcs(course.category_group) + ' · 마인드스토리 강좌</p>' +
              '</div></a>' +
              '<div class="p-5">' +
              '<p class="text-sm text-slate-600 flex items-start gap-1">' +
              '<span class="line-clamp-2 flex-1 min-w-0">' + (course.description || '') + '</span>' + pencil + '</p>' +
              '<a href="/courses/' + course.id + '" class="mt-4 inline-block rounded-lg bg-amber-700 text-white px-4 py-2 text-sm font-semibold hover:bg-amber-800">자세히</a>' +
              '</div></article>'
          }).join('')
        } catch (e) {
          document.getElementById('gridNcs').innerHTML = '<p class="text-red-600">목록을 불러오지 못했습니다.</p>'
        }
      })()
    </script>
  </main>`,
    ),
  )
})

app.get('/courses/consortium', async (c) => {
  return c.html(
    await shell(
      c,
      'MindStory Consortium',
      'bg-gradient-to-b from-white via-slate-50 to-indigo-50/40',
      `
  <main class="max-w-7xl mx-auto px-4 py-12">
    <div class="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
      <div class="flex gap-4 min-w-0">
        <div class="shrink-0 w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-2xl shadow-sm ring-1 ring-indigo-200/60" aria-hidden="true">
          <i class="fas fa-handshake"></i>
        </div>
        <div class="min-w-0">
          <span class="text-indigo-700 font-semibold text-sm tracking-widest uppercase">Consortium</span>
          <h1 class="text-3xl md:text-4xl font-bold text-indigo-950 mt-2 tracking-tight">기업 및 기관 공동훈련 과정</h1>
          <p class="text-slate-700 mt-3 max-w-2xl leading-relaxed">협약 기업 임직원 및 기관 단체 수강생을 위한 전용 맞춤형 교육 서비스입니다. 산업인력공단 협약·NCS 직업훈련 등은 공지 및 담당 창구 안내를 따릅니다.</p>
        </div>
      </div>
      <div class="rounded-xl bg-white/90 border border-indigo-200/60 px-4 py-2 text-xs text-indigo-900/80 shadow-sm shrink-0 ring-1 ring-indigo-100">공동훈련 · 맞춤 운영</div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
      <div class="rounded-2xl border border-indigo-200/50 bg-white/80 backdrop-blur-sm p-6 shadow-sm">
        <div class="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3"><i class="fas fa-building"></i></div>
        <h2 class="font-bold text-indigo-950">협약·단체</h2>
        <p class="text-sm text-slate-600 mt-2 leading-relaxed">기업·기관 단위 도입 및 교육 일정은 별도 협의로 진행됩니다.</p>
      </div>
      <div class="rounded-2xl border border-indigo-200/50 bg-white/80 backdrop-blur-sm p-6 shadow-sm">
        <div class="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3"><i class="fas fa-clipboard-check"></i></div>
        <h2 class="font-bold text-indigo-950">출석·수료</h2>
        <p class="text-sm text-slate-600 mt-2 leading-relaxed">mOTP 등 본인 인증 출석, 진도·평가 기준은 과정 공지를 확인해 주세요.</p>
      </div>
      <div class="rounded-2xl border border-indigo-200/50 bg-white/80 backdrop-blur-sm p-6 shadow-sm">
        <div class="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3"><i class="fas fa-circle-question"></i></div>
        <h2 class="font-bold text-indigo-950">문의</h2>
        <p class="text-sm text-slate-600 mt-2 leading-relaxed">서류·일정 문의는 공지·FAQ와 고객 안내 채널을 이용해 주세요.</p>
      </div>
    </div>
    <div class="rounded-2xl border border-indigo-300/40 bg-white/90 p-8 text-center shadow-md ring-1 ring-indigo-100/80">
      <p class="text-slate-700 mb-6">Classic·Next·NCS 강좌 목록은 각 카탈로그에서 확인하실 수 있습니다. 공동훈련 관련 공지는 커뮤니티에서 업데이트됩니다.</p>
      <div class="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
        <a href="/community" class="inline-flex items-center justify-center rounded-xl bg-indigo-600 text-white px-6 py-3 font-semibold hover:bg-indigo-700 transition shadow-sm">공지 · FAQ 보기</a>
        <a href="/legacy/mindstory-landing#signature-lineup" class="inline-flex items-center justify-center rounded-xl border border-indigo-300 bg-indigo-50/90 text-indigo-900 px-6 py-3 font-semibold hover:bg-indigo-100 transition">시그니처 라인업으로</a>
        <a href="/courses/classic" class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 px-6 py-3 font-semibold hover:bg-slate-50 transition">Classic 강좌</a>
        <a href="/courses/next" class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 px-6 py-3 font-semibold hover:bg-slate-50 transition">Next 강좌</a>
        <a href="/courses/ncs" class="inline-flex items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-950 px-6 py-3 font-semibold hover:bg-amber-100 transition">NCS 강좌</a>
      </div>
    </div>
  </main>`,
    ),
  )
})

export default app
