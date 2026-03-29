/**
 * MINDSTORY Classic / Next 강좌 목록 (브랜드별 테마)
 * /courses/classic, /courses/next — pages의 /courses/:id 보다 먼저 등록할 것
 */

import { Context, Hono } from 'hono'
import { Bindings, User } from '../types/database'
import { optionalAuth } from '../middleware/auth'
import { resolveAdminCommandPulse } from '../utils/site-header-admin-ssr'
import { siteFooterLegalBlockHtml } from '../utils/site-footer-legal'
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
  <script>
    document.addEventListener('DOMContentLoaded', function () {
      ${siteHeaderDrawerControlScript('brand')}
      ${siteFloatingQuickMenuScript()}
    })
  </script>
</body>
</html>`
}

app.get('/courses/classic', async (c) => {
  return c.html(
    await shell(
      c,
      'MINDSTORY Classic',
      'theme-classic bg-classic-cream',
      `
  <main class="max-w-7xl mx-auto px-4 py-12">
    <div class="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div>
        <span class="text-classic-sage font-semibold text-sm tracking-widest uppercase">Heritage</span>
        <h1 class="text-3xl md:text-4xl font-bold text-classic-forest mt-2 tracking-tight">Classic 강좌</h1>
        <p class="text-classic-forest/80 mt-2 max-w-2xl leading-relaxed">본질의 깊이 — 상담·진로·학습의 기록이 쌓이는 차분한 여정입니다.</p>
      </div>
      <div class="rounded-xl bg-white border border-classic-sage/25 px-4 py-2 text-xs text-classic-forest/70 shadow-sm shrink-0">헤리티지 모드 · 세이지 포인트</div>
    </div>
    <div id="gridClassic" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
    <script>
      (async function() {
        try {
          var msAdmin = document.body.getAttribute('data-ms-admin-chrome') === '1'
          var res = await axios.get('/api/courses?category_group=CLASSIC')
          var list = res.data.data || []
          var el = document.getElementById('gridClassic')
          if (!list.length) { el.innerHTML = '<p class="text-classic-forest/70">등록된 Classic 강좌가 없습니다.</p>'; return }
          el.innerHTML = list.map(function(course) {
            var pencil = msAdmin
              ? '<a href="/admin/course/edit/' + course.id + '" class="admin-magic-pencil shrink-0 mt-0.5" title="관리자 수정" aria-label="강좌 수정"><i class="fas fa-pencil-alt" aria-hidden="true"></i></a>'
              : ''
            return '<article class="rounded-2xl border border-classic-sage/25 bg-white shadow-sm hover:shadow-md transition overflow-hidden">' +
              '<img src="' + (course.thumbnail_url || '/static/images/course-placeholder.svg') + '" class="w-full h-44 object-cover" alt="" />' +
              '<div class="p-5">' +
              '<h2 class="font-bold text-classic-forest text-lg">' + (course.title || '') + '</h2>' +
              '<p class="text-sm text-classic-forest/70 mt-2 flex items-start gap-1">' +
              '<span class="line-clamp-2 flex-1 min-w-0">' + (course.description || '') + '</span>' + pencil + '</p>' +
              '<a href="/courses/' + course.id + '" class="mt-4 inline-block rounded-lg bg-classic-sage text-white px-4 py-2 text-sm font-semibold hover:opacity-90">자세히</a>' +
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
        try {
          var msAdmin = document.body.getAttribute('data-ms-admin-chrome') === '1'
          var res = await axios.get('/api/courses?category_group=NEXT')
          var list = res.data.data || []
          var el = document.getElementById('gridNext')
          if (!list.length) { el.innerHTML = '<p class="text-slate-600">등록된 Next 강좌가 없습니다.</p>'; return }
          el.innerHTML = list.map(function(course) {
            var pencil = msAdmin
              ? '<a href="/admin/course/edit/' + course.id + '" class="admin-magic-pencil shrink-0 mt-0.5" title="관리자 수정" aria-label="강좌 수정"><i class="fas fa-pencil-alt" aria-hidden="true"></i></a>'
              : ''
            return '<article class="rounded-2xl border border-slate-200 bg-white shadow-md hover:border-next-accent/40 hover:shadow-lg transition overflow-hidden">' +
              '<div class="h-2 bg-gradient-to-r from-next-accent to-slate-400"></div>' +
              '<img src="' + (course.thumbnail_url || '/static/images/course-placeholder.svg') + '" class="w-full h-44 object-cover bg-slate-100" alt="" />' +
              '<div class="p-5">' +
              '<h2 class="font-bold text-next-ink text-lg">' + (course.title || '') + '</h2>' +
              '<p class="text-sm text-slate-600 mt-2 flex items-start gap-1">' +
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

export default app
