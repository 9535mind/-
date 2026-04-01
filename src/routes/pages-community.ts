/**
 * 공지사항 · FAQ (커뮤니티) — PC 글래스 리스트 / 모바일 카드
 * GET /community
 */

import { Hono } from 'hono'
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
  adminMagicPencilHtml,
  siteHeaderDrawerControlScript,
  siteHeaderFullMarkup,
  siteHeaderNavCoursesGlassStyles,
} from '../utils/site-header-courses-nav'
import { SITE_POPUP_SCRIPT_TAG } from '../utils/site-popup-script'

const app = new Hono<{ Bindings: Bindings; Variables: { user?: User } }>()
app.use('*', optionalAuth)

type BoardTone = 'notice' | 'event' | 'faq'

interface BoardItem {
  id: string
  badge: string
  tone: BoardTone
  title: string
  date: string
  excerpt?: string
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const FAQS: BoardItem[] = [
  {
    id: 'f1',
    badge: 'FAQ',
    tone: 'faq',
    title: '수강 신청 후 바로 학습을 시작할 수 있나요?',
    date: '2026-01-15',
    excerpt: '결제·승인이 완료되면 내 강의실에서 바로 시작할 수 있습니다.',
  },
  {
    id: 'f2',
    badge: 'FAQ',
    tone: 'faq',
    title: '모바일에서도 동영상 시청이 가능한가요?',
    date: '2026-01-15',
    excerpt: '최신 모바일 브라우저에서 시청 가능합니다.',
  },
  {
    id: 'f3',
    badge: 'FAQ',
    tone: 'faq',
    title: '수료증은 어떻게 발급되나요?',
    date: '2026-01-10',
    excerpt: '과정별 기준 충족 시 마이페이지에서 발급 신청할 수 있습니다.',
  },
  {
    id: 'f4',
    badge: 'FAQ',
    tone: 'faq',
    title: '환불은 어떤 절차로 진행되나요?',
    date: '2026-01-05',
    excerpt: '환불규정 페이지의 기간·방법을 확인해 주세요.',
  },
]

function boardCommunityStyles(): string {
  return `<style id="site-community-board">
@keyframes boardSteelTremor {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(0.5px, -0.45px); }
  50% { transform: translate(-0.45px, 0.55px); }
  75% { transform: translate(0.48px, 0.4px); }
}
.board-badge-tremor {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0.2rem 0.65rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.board-tone-notice { background: rgba(99, 102, 241, 0.18); color: #4338ca; }
.board-tone-event { background: rgba(245, 158, 11, 0.2); color: #b45309; }
.board-tone-faq { background: rgba(16, 185, 129, 0.18); color: #047857; }
.board-tone-qna { background: rgba(59, 130, 246, 0.2); color: #1d4ed8; }
.board-tone-review { background: rgba(236, 72, 153, 0.18); color: #9d174d; }
.board-tone-general { background: rgba(100, 116, 139, 0.2); color: #334155; }
.board-row-glass:hover .board-badge-tremor,
.board-row-glass:focus-within .board-badge-tremor,
.board-badge-tremor:hover,
.board-badge-tremor:focus-visible {
  animation: boardSteelTremor 0.1s linear 0s 12 forwards;
  animation-fill-mode: forwards;
}
.board-card-glass:active .board-badge-tremor,
.board-card-glass:focus-within .board-badge-tremor {
  animation: boardSteelTremor 0.1s linear 0s 12 forwards;
  animation-fill-mode: forwards;
}
.board-glass-shell {
  border-radius: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 10px 40px rgba(15, 23, 42, 0.06);
  overflow: hidden;
}
.board-row-glass {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.95rem 1.25rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.22);
  transition: background-color 0.15s ease;
}
.board-row-glass:last-child { border-bottom: none; }
.board-row-glass:hover { background: rgba(255, 255, 255, 0.65); }
.board-row-title { font-weight: 600; color: #0f172a; flex: 1; min-width: 0; }
.board-row-meta { font-size: 0.8rem; color: #64748b; white-space: nowrap; }
.board-card-glass {
  border-radius: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  padding: 1rem 1.1rem;
  box-shadow: 0 6px 24px rgba(15, 23, 42, 0.06);
  -webkit-tap-highlight-color: transparent;
}
.board-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.5rem; }
.board-card-title { font-weight: 700; color: #0f172a; font-size: 1rem; line-height: 1.45; flex: 1; min-width: 0; word-break: keep-all; }
.board-card-date { font-size: 0.75rem; color: #94a3b8; white-space: nowrap; }
.board-card-excerpt { font-size: 0.875rem; color: #475569; line-height: 1.5; word-break: keep-all; }
.community-notice-content img { max-width: 100%; height: auto; }
.community-notice-content a { color: #4f46e5; text-decoration: underline; }
.community-post-content img { max-width: 100%; height: auto; }
.community-post-content a { color: #4f46e5; text-decoration: underline; }
</style>`
}

function noticeSectionHtml(isAdmin: boolean): string {
  const adminAttr = isAdmin ? '1' : '0'
  return `
<section id="board-notice" class="scroll-mt-28 mb-14" data-is-admin="${adminAttr}">
  <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-5">
    <div>
      <h2 class="text-2xl font-bold text-slate-900">공지사항</h2>
      <p class="text-sm text-slate-600 mt-1">교육원 운영 및 서비스 안내입니다. (게시된 공지만 표시됩니다.)</p>
    </div>
  </div>
  <div class="hidden md:block board-glass-shell">
    <div class="flex px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/40 bg-white/30">
      <span class="w-[5.5rem] shrink-0">구분</span>
      <span class="flex-1">제목</span>
      <span class="w-28 text-right shrink-0">등록일</span>
    </div>
    <div id="community-notices-desktop-list">
      <p class="p-8 text-center text-slate-500 text-sm">불러오는 중…</p>
    </div>
  </div>
  <div id="community-notices-mobile" class="md:hidden space-y-3 px-0.5">
    <p class="p-6 text-center text-slate-500 text-sm">불러오는 중…</p>
  </div>
</section>
<div id="community-notice-modal" class="fixed inset-0 z-[60] hidden p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="community-notice-modal-title">
  <div data-notice-modal-panel class="relative z-10 bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[88vh] overflow-hidden flex flex-col border border-slate-200">
    <div class="flex justify-between items-start gap-2 p-4 border-b border-slate-100 shrink-0">
      <h2 id="community-notice-modal-title" class="text-lg font-bold text-slate-900 pr-2 leading-snug"></h2>
      <button type="button" id="community-notice-modal-close" class="text-slate-500 hover:text-slate-800 text-2xl leading-none shrink-0 p-1 -m-1 rounded" aria-label="닫기">&times;</button>
    </div>
    <div id="community-notice-modal-body" class="p-4 overflow-y-auto text-sm"></div>
  </div>
</div>`
}

function renderDesktopRows(items: BoardItem[], isAdmin: boolean): string {
  return items
    .map(
      (it) => `
<article class="board-row-glass" tabindex="0" id="post-${esc(it.id)}">
  <div class="w-[5.5rem] shrink-0 flex items-center">
    <span class="board-badge-tremor board-tone-${it.tone}">${esc(it.badge)}</span>
  </div>
  <div class="board-row-title min-w-0 inline-flex items-center flex-wrap gap-0">
    <span>${esc(it.title)}</span>
    ${
      isAdmin
        ? adminMagicPencilHtml(
            `/admin/notice/edit/${encodeURIComponent(it.id)}`,
            `항목 수정 (${it.id})`,
          )
        : ''
    }
  </div>
  <time class="board-row-meta w-28 shrink-0 text-right" datetime="${esc(it.date)}">${esc(it.date)}</time>
</article>`,
    )
    .join('')
}

function renderMobileCards(items: BoardItem[], isAdmin: boolean): string {
  return items
    .map(
      (it) => `
<article class="board-card-glass" tabindex="0" id="mpost-${esc(it.id)}">
  <div class="board-card-head">
    <span class="board-badge-tremor board-tone-${it.tone}">${esc(it.badge)}</span>
    <time class="board-card-date" datetime="${esc(it.date)}">${esc(it.date)}</time>
  </div>
  <h3 class="board-card-title inline-flex items-baseline flex-wrap gap-0">
    <span>${esc(it.title)}</span>
    ${
      isAdmin
        ? adminMagicPencilHtml(
            `/admin/notice/edit/${encodeURIComponent(it.id)}`,
            `항목 수정 (${it.id})`,
          )
        : ''
    }
  </h3>
  ${it.excerpt ? `<p class="board-card-excerpt mt-2">${esc(it.excerpt)}</p>` : ''}
</article>`,
    )
    .join('')
}

function sectionBlock(
  sectionId: string,
  heading: string,
  sub: string,
  items: BoardItem[],
  isAdmin: boolean,
): string {
  return `
<section id="${sectionId}" class="scroll-mt-28 mb-14">
  <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-5">
    <div>
      <h2 class="text-2xl font-bold text-slate-900">${heading}</h2>
      <p class="text-sm text-slate-600 mt-1">${sub}</p>
    </div>
  </div>
  <div class="hidden md:block board-glass-shell">
    <div class="flex px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/40 bg-white/30">
      <span class="w-[5.5rem] shrink-0">구분</span>
      <span class="flex-1">제목</span>
      <span class="w-28 text-right shrink-0">등록일</span>
    </div>
    ${renderDesktopRows(items, isAdmin)}
  </div>
  <div class="md:hidden space-y-3 px-0.5">
    ${renderMobileCards(items, isAdmin)}
  </div>
</section>`
}

app.get('/community', async (c) => {
  const adminCommandPulse = await resolveAdminCommandPulse(c)
  const isAdmin = (c.get('user') as User | undefined)?.role === 'admin'
  const main = `
<main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-6">
  <header class="mb-8">
    <h1 class="text-3xl font-bold text-slate-900">공지사항 · 커뮤니티 · FAQ</h1>
    <p class="text-slate-600 mt-2">운영 소식, 회원 게시글, 자주 묻는 질문을 한곳에서 확인하세요.</p>
  </header>
  <nav class="sticky top-[calc(env(safe-area-inset-top,0px)+4.5rem)] z-30 md:top-24 flex flex-wrap gap-2 mb-10 p-1 rounded-xl bg-white/70 backdrop-blur-md border border-slate-200/50 shadow-sm" aria-label="섹션 이동">
    <a href="#board-notice" class="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">공지사항</a>
    <a href="#board-posts" class="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors">커뮤니티</a>
    <a href="#board-faq" class="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors">FAQ</a>
  </nav>
  ${noticeSectionHtml(isAdmin)}
  ${postsSectionHtml()}
  ${sectionBlock('board-faq', '자주 묻는 질문', '수강·결제·학습 환경 관련 질문입니다.', FAQS)}
</main>`

  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>공지사항 · 커뮤니티 · FAQ - 마인드스토리 원격평생교육원</title>
  <link rel="stylesheet" href="/static/css/app.css" />
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script src="/static/js/auth.js?v=20260329-admin-name"></script>
  <script src="/static/js/utils.js?v=20260328-1"></script>
  <script src="/static/js/community-notices.js?v=20260331-notices-api" defer></script>
  <script src="/static/js/community-posts.js?v=20260331-posts" defer></script>
  ${siteHeaderNavCoursesGlassStyles()}
  ${siteFloatingQuickMenuStyles()}
  ${siteAiChatWidgetStyles()}
  ${boardCommunityStyles()}
</head>
<body class="bg-slate-50">
  ${siteHeaderFullMarkup({ variant: 'pages', adminCommandPulse })}
  ${main}
  <footer class="bg-gray-800 text-white py-8 mt-4">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      ${siteFooterLegalBlockHtml()}
      <p class="mt-4 pt-4 border-t border-gray-700 text-center text-xs text-gray-500">
        © 2026 마인드스토리 원격평생교육원. All rights reserved.
      </p>
    </div>
  </footer>
  ${siteFloatingQuickMenuMarkup()}
  ${siteAiChatWidgetMarkup()}
  <script>
    document.addEventListener('DOMContentLoaded', function () {
      ${siteHeaderDrawerControlScript('pages')}
      ${siteFloatingQuickMenuScript()}
      ${siteAiChatWidgetScript()}
    });
  </script>
  ${SITE_POPUP_SCRIPT_TAG}
</body>
</html>`)
})

export default app
