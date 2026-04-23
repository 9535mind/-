/**
 * MS12 — /app, /app/login, /app/meeting. 클라이언트: ms12-app.js + GET /api/auth/me 단일 진실
 */
import { Hono } from 'hono'
import { Bindings } from '../types/database'

const p = new Hono<{ Bindings: Bindings }>()

const MS12_APP_SCRIPT = '/static/js/ms12-app.js?v=20260423g'
const waitBlock =
  '<p class="ms12-p" id="ms12-wait" style="color:rgb(100 116 139)">로그인 상태 확인 중…</p>'

type Ms12Route = 'login' | 'meeting'

function layout(title: string, route: Ms12Route, guest: string, authed: string) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${title}</title>
  <link rel="stylesheet" href="/static/css/app.css" />
  <script src="${MS12_APP_SCRIPT}" defer></script>
  <style>
    .ms12-wrap{max-width:48rem;margin:0 auto;padding:2rem 1.25rem;}
    .ms12-h1{font-size:1.5rem;font-weight:700;margin-bottom:0.5rem;}
    .ms12-p{color:rgb(55 65 81);line-height:1.6;}
    .ms12-btn{display:inline-block;margin-top:0.75rem;padding:0.5rem 1rem;border-radius:0.5rem;background:rgb(79 70 229);color:#fff;text-decoration:none;font-weight:500;border:none;cursor:pointer;font-size:1rem;}
    .ms12-btn:hover{background:rgb(67 56 202);}
    .ms12-btn--muted{background:rgb(71 85 105);}
  </style>
</head>
<body class="bg-slate-50 min-h-screen" data-ms12-route="${route}">
  <div class="ms12-wrap">
    <noscript>
      <p class="ms12-p">JavaScript 를 켜 주세요. 로그인: <a href="/app/login">/app/login</a></p>
    </noscript>
    ${waitBlock}
    <div id="ms12-guest" style="display:none">${guest}</div>
    <div id="ms12-authed" style="display:none">${authed}</div>
  </div>
</body>
</html>`
}

/** /app — 클라이언트가 /api/auth/me로 게스트/인증 분기(리다이렉트 없음) */
p.get('/', (c) =>
  c.html(
    layout(
      'MS12',
      'home',
      `<h1 class="ms12-h1">MS12</h1>
       <p class="ms12-p">회의·협업 플랫폼입니다. 아래에서 로그인하거나 회의에 들어가세요.</p>
       <a class="ms12-btn" href="/app/login?next=%2Fapp%2Fmeeting">로그인</a>
       <a class="ms12-btn" href="/app/login?next=%2Fapp%2Fmeeting" style="margin-left:0.5rem;background:rgb(15 118 110)">회의 입장</a>`,
      `<h1 class="ms12-h1">MS12</h1>
       <p class="ms12-p">안녕하세요, <span class="js-ms12-user-name">회원</span>님</p>
       <a class="ms12-btn" href="/app/meeting" style="background:rgb(15 118 110)">회의로</a>
       <button type="button" class="ms12-btn ms12-btn--muted" data-ms12-logout style="margin-left:0.5rem" title="로그아웃">로그아웃</button>`,
    ),
  ),
)

p.get('/login', (c) =>
  c.html(
    layout(
      '로그인 — MS12',
      'login',
      `<h1 class="ms12-h1">로그인</h1>
       <p class="ms12-p">카카오 계정으로 로그인합니다.</p>
       <a class="ms12-btn" href="/api/auth/kakao/login">카카오로 계속</a>
       <p class="ms12-p" style="margin-top:1rem;font-size:0.875rem;">Google 계정: <a href="/api/auth/google/login" class="text-indigo-600 underline">Google로 계속</a></p>
       <p class="ms12-p" style="margin-top:1.5rem;"><a href="/" class="text-slate-500">← 시작</a></p>`,
      `<h1 class="ms12-h1">이동 중…</h1>
       <p class="ms12-p" style="color:rgb(100 116 139)">로그인됨. 잠시만요.</p>`,
    ),
  )
)

/** /app/meeting — 서버 302(비로그인) 금지: OAuth 직후 쿠키·D1 늦음일 때 /meeting↔/login 이 무한 리다이렉트. 게스트/인증 UI는 ms12-app + /api/auth/me. */
p.get('/meeting', (c) =>
  c.html(
    layout(
      '회의 — MS12',
      'meeting',
      `<h1 class="ms12-h1">회의</h1>
       <p class="ms12-p">로그인이 필요합니다. <a class="text-indigo-600 underline" href="/app/login?next=%2Fapp%2Fmeeting">로그인</a></p>`,
      `<h1 class="ms12-h1">회의</h1>
       <p class="ms12-p">여기에 회의 UI가 연결됩니다. (백로그/프론트 연동 전 자리 표시)</p>
       <p class="ms12-p" style="margin-top:0.5rem">계정: <span class="js-ms12-user-name" style="font-weight:600">—</span></p>
       <a class="ms12-btn ms12-btn--muted" href="/" style="margin-left:0.5rem" title="ms12.org">← 시작</a>
       <button type="button" class="ms12-btn ms12-btn--muted" data-ms12-logout style="margin-left:0.5rem">로그아웃</button>`,
    ),
  ),
)

export default p
