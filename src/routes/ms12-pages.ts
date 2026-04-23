/** MS12 /app* — 공개·게스트 기본, OAuth 는 loginAside 만 */
import { Hono } from 'hono'
import { Bindings } from '../types/database'
import { getAuthMode } from '../utils/auth-mode'

const p = new Hono<{ Bindings: Bindings }>()

/** Pages 배포·소스 ?v= 일치(배포 후 페이지 소스에 이 주석이 보이면 새 Worker) */
const MS12_BUILD = '20260424c'
const MS12_APP_SCRIPT = `/static/js/ms12-app.js?v=${MS12_BUILD}`
const waitBlock = '<p class="ms12-p" id="ms12-wait" style="color:rgb(100 116 139)">불러오는 중…</p>'

const commonStyles = `
  .ms12-wrap{max-width:48rem;margin:0 auto;padding:2rem 1.25rem;}
  .ms12-h1{font-size:1.5rem;font-weight:700;margin-bottom:0.5rem;}
  .ms12-p{color:rgb(55 65 81);line-height:1.6;}
  .ms12-btn{display:inline-block;margin-top:0.75rem;padding:0.5rem 1rem;border-radius:0.5rem;background:rgb(79 70 229);color:#fff;text-decoration:none;font-weight:500;border:none;cursor:pointer;font-size:1rem;}
  .ms12-btn:hover{background:rgb(67 56 202);}
  .ms12-btn--muted{background:rgb(71 85 105);}
  .ms12-btn--teal{background:rgb(15 118 110);}
  .ms12-card-grid{display:grid;gap:0.75rem;margin-top:1.25rem;}
  @media (min-width: 480px) { .ms12-card-grid--3{grid-template-columns:1fr 1fr 1fr;} }
  .ms12-big-btn{display:flex;flex-direction:column;align-items:flex-start;gap:0.25rem;padding:1rem 1.1rem;border-radius:0.75rem;border:1px solid rgb(226 232 240);background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.04);cursor:pointer;text-align:left;transition:box-shadow 0.15s,border-color 0.15s;font-size:1rem;}
  .ms12-big-btn:hover{border-color:rgb(165 180 252);box-shadow:0 4px 12px rgba(79,70,229,0.12);}
  .ms12-big-btn strong{font-size:1.05rem;color:rgb(15 23 42);}
  .ms12-big-btn span{font-size:0.82rem;font-weight:400;color:rgb(100 116 139);}
  .ms12-header-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:0.75rem;margin-bottom:0.5rem;}
  .ms12-badge{display:inline-block;font-size:0.8rem;padding:0.2rem 0.5rem;border-radius:0.35rem;background:rgb(220 252 231);color:rgb(22 101 52);font-weight:600;}
  .ms12-footer-cards{margin-top:2rem;padding-top:1.25rem;border-top:1px solid rgb(226 232 240);}
  .ms12-subtitle{font-size:0.8rem;text-transform:uppercase;letter-spacing:0.04em;color:rgb(148 163 184);margin-bottom:0.5rem;}
  .ms12-muted{font-size:0.9rem;color:rgb(100 116 139);}
  .ms12-input{width:100%;max-width:24rem;padding:0.5rem 0.65rem;border:1px solid rgb(203 213 225);border-radius:0.5rem;font-size:1rem;}
  .ms12-room-wrap{display:grid;gap:1rem;}
  @media (min-width: 768px) { .ms12-room-wrap{grid-template-columns:1fr 280px;} }
  .ms12-panel{padding:0.9rem 1rem;border:1px solid rgb(226 232 240);border-radius:0.75rem;background:#fff;}
  .ms12-notes{min-height:12rem;width:100%;padding:0.6rem 0.75rem;border:1px solid rgb(203 213 225);border-radius:0.5rem;font-size:0.95rem;resize:vertical;}
  .ms12-part-list{list-style:none;padding:0;margin:0.5rem 0 0 0;}
  .ms12-part-list li{padding:0.35rem 0;border-bottom:1px solid rgb(241 245 249);font-size:0.9rem;}
  .ms12-toolbar{display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.75rem;}
  .ms12-login-aside{clear:both;margin-top:1.75rem;padding:0.75rem 0.9rem;border-radius:0.5rem;border:1px solid rgb(241 245 249);background:rgb(248 250 252);max-width:100%}
  .ms12-login-aside summary{cursor:pointer;list-style:none;font-size:0.82rem;color:rgb(100 116 139);user-select:none}
  .ms12-login-aside summary::-webkit-details-marker{display:none}
  .ms12-login-aside[open] summary{margin-bottom:0.35rem}
  .ms12-login-aside .ms12-login-aside__links a{font-size:0.82rem;color:rgb(79 70 229)}
`

function guestNoJs(heading: string): string {
  return `<h1 class="ms12-h1">${heading}</h1>
  <p class="ms12-p" style="font-size:0.9rem">JS 필요. <a href="/app" class="text-indigo-600">이동</a></p>`
}

function loginAside(nextPath: string, k: (n: string) => string, g: (n: string) => string): string {
  return `<aside class="ms12-login-aside" aria-label="계정·로그인(선택)">
  <details>
    <summary>계정 · 로그인 (선택)</summary>
    <p class="ms12-login-aside__links" style="margin:0.4rem 0 0 0;line-height:1.5">기기를 바꿔도 이어 쓰려면 연동할 수 있습니다.
      <a href="${k(nextPath)}" data-ms12-login-lnk>카카오</a> ·
      <a href="${g(nextPath)}" data-ms12-login-lnk>Google</a>
    </p>
  </details>
  <p class="ms12-js-logout-line" style="margin:0.6rem 0 0 0">
    <button type="button" class="ms12-btn ms12-btn--muted" style="font-size:0.8rem;padding:0.3rem 0.6rem" data-ms12-logout>로그아웃</button>
  </p>
</aside>`
}

type Ms12Route =
  | 'home'
  | 'meeting'
  | 'meeting_new'
  | 'join'
  | 'records'
  | 'meeting_room'

function layout(
  title: string,
  route: Ms12Route,
  extraBody: string,
  guest: string,
  authed: string,
  authMode: string
) {
  return `<!DOCTYPE html>
<!-- m:${MS12_BUILD} -->
<html lang="ko">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${title}</title>
  <link rel="stylesheet" href="/static/css/app.css" />
  <script src="${MS12_APP_SCRIPT}" defer></script>
  <style>
    ${commonStyles}
  </style>
</head>
<body class="bg-slate-50 min-h-screen" data-ms12-route="${route}" data-ms12-auth="${authMode}" ${extraBody}>
  <div class="ms12-wrap">
    <noscript>
      <p class="ms12-p">JavaScript 를 켜 주세요. <a href="/app">MS12</a></p>
    </noscript>
    ${waitBlock}
    <div id="ms12-guest" style="display:none">${guest}</div>
    <div id="ms12-authed" style="display:none">${authed}</div>
  </div>
  <script>
  (function () {
    var w = document.getElementById('ms12-wait')
    if (w) w.style.display = 'none'
    var a = document.getElementById('ms12-authed')
    if (a) a.style.display = 'block'
    var g = document.getElementById('ms12-guest')
    if (g) g.style.display = 'none'
  })()
  </script>
</body>
</html>`
}

const oauthNext = (path: string) => encodeURIComponent(path)
const kakao = (next: string) => `/api/auth/kakao/login?next=${oauthNext(next)}`
const google = (next: string) => `/api/auth/google/login?next=${oauthNext(next)}`

/** MS12 홈 */
p.get('/', (c) => {
  const mode = getAuthMode(c)
  return c.html(
    layout(
      'MS12',
      'home',
      '',
      guestNoJs('MS12'),
      `<div class="ms12-header-row">
         <h1 class="ms12-h1" style="margin:0">MS12</h1>
         <div><span class="ms12-badge js-ms12-badge" style="background:rgb(220 252 231);color:rgb(22 101 52)">준비됨</span></div>
       </div>
       <p class="ms12-p" style="margin-top:0.5rem">안녕하세요, <span class="js-ms12-user-name" style="font-weight:600">—</span> <span class="js-ms12-user-suffix" style="font-weight:400">님</span></p>
       <p class="ms12-p ms12-muted" style="margin-top:0.25rem">회의를 열고, 입장하거나, 기록을 열어보세요.</p>
       <div class="ms12-card-grid ms12-card-grid--3" style="margin-top:1rem">
         <a class="ms12-big-btn" href="/app/meeting/new" style="text-decoration:none">
           <strong>회의 시작</strong><span>새로운 모임·회의를 만듭니다</span>
         </a>
         <a class="ms12-big-btn" href="/app/join" style="text-decoration:none">
           <strong>회의 입장</strong><span>코드로 열린 회의에 참여합니다</span>
         </a>
         <a class="ms12-big-btn" href="/app/records" style="text-decoration:none">
           <strong>회의 기록</strong><span>참여·저장·요약을 봅니다</span>
         </a>
       </div>
       <div id="ms12-resume" class="ms12-muted" style="display:none;margin-bottom:0.75rem;padding:0.5rem 0.75rem;border-radius:0.5rem;border:1px solid rgb(226 232 240);background:rgb(248 250 252)"></div>
       <div class="ms12-footer-cards">
         <p class="ms12-subtitle">최근 흐름</p>
         <div id="ms12-home-recent" class="ms12-muted" style="min-height:2.5rem">불러오는 중…</div>
       </div>
       ${loginAside('/app', kakao, google)}`,
      mode,
    ),
  )
})

p.get('/home', (c) => c.redirect('/app', 302))

p.get('/meeting/new', (c) =>
  c.html(
    layout(
      '새 회의 — MS12',
      'meeting_new',
      '',
      guestNoJs('새 회의'),
      `<a href="/app" class="ms12-p" style="display:inline-block;margin-bottom:0.5rem">← 시작화면</a>
       <h1 class="ms12-h1">새 회의</h1>
       <p class="ms12-p">제목을 입력하면 회의 코드가 자동으로 만들어지고, <span class="js-ms12-user-name" style="font-weight:600">—</span> 님은 호스트로 입장됩니다.</p>
       <form id="ms12-form-new" style="margin-top:1rem">
         <label class="ms12-p" style="display:block;font-weight:500">회의 제목</label>
         <input class="ms12-input" name="title" type="text" required maxlength="200" placeholder="예: 4월 운영 모임" />
         <label class="ms12-p" style="display:block;margin-top:0.75rem;font-weight:500">호스트로 표시할 이름(선택·게스트)</label>
         <input class="ms12-input" name="displayName" type="text" maxlength="40" placeholder="없으면 '게스트'" />
         <p style="margin-top:1rem"><button type="submit" class="ms12-btn ms12-btn--teal">회의 열기</button></p>
       </form>
       ${loginAside('/app/meeting/new', kakao, google)}`,
      getAuthMode(c),
    ),
  ),
)

p.get('/join', (c) =>
  c.html(
    layout(
      '회의 입장 — MS12',
      'join',
      '',
      guestNoJs('회의 입장'),
      `<a href="/app" class="ms12-p" style="display:inline-block;margin-bottom:0.5rem">← 시작화면</a>
       <h1 class="ms12-h1">회의 입장</h1>
       <p class="ms12-p">초대받은 <strong>회의 코드</strong>를 넣으면, <span class="js-ms12-user-name" style="font-weight:600">—</span> 님 이름으로 참석자 목록에 올라갑니다.</p>
       <form id="ms12-form-join" style="margin-top:1rem">
         <label class="ms12-p" style="display:block;font-weight:500">회의 코드</label>
         <input class="ms12-input" name="code" type="text" required autocomplete="off" placeholder="8자리 코드" />
         <label class="ms12-p" style="display:block;margin-top:0.75rem;font-weight:500">목록에 쓸 이름(선택)</label>
         <input class="ms12-input" name="displayName" type="text" maxlength="40" placeholder="없으면 '게스트'" />
         <p style="margin-top:1rem"><button type="submit" class="ms12-btn">입장</button></p>
       </form>
       <p id="ms12-join-err" class="ms12-p" style="color:rgb(185 28 28);display:none"></p>
       ${loginAside('/app/join', kakao, google)}`,
      getAuthMode(c),
    ),
  ),
)

p.get('/records', (c) =>
  c.html(
    layout(
      '회의 기록 — MS12',
      'records',
      '',
      guestNoJs('회의 기록'),
      `<a href="/app" class="ms12-p" style="display:inline-block;margin-bottom:0.5rem">← 시작화면</a>
       <h1 class="ms12-h1">회의 기록</h1>
       <p class="ms12-p">참여한 회의·저장·요약(연동 예정)을 한곳에 모읍니다. 아래는 참여·개설한 모임 기준입니다.</p>
       <div id="ms12-records-list" class="ms12-p" style="margin-top:1rem">불러오는 중…</div>
       ${loginAside('/app/records', kakao, google)}`,
      getAuthMode(c),
    ),
  ),
)

p.get('/meeting', (c) =>
  c.html(
    layout(
      '회의 — MS12',
      'meeting',
      '',
      guestNoJs('회의'),
      `<h1 class="ms12-h1">회의</h1>
       <p class="ms12-p">시작화면에서 <strong>회의 시작 / 회의 입장</strong>을 이용하시거나, 아래로 바로 갈 수 있습니다.</p>
       <p class="ms12-p" style="margin-top:0.5rem">계정: <span class="js-ms12-user-name" style="font-weight:600">—</span></p>
       <p style="margin-top:0.75rem">
         <a class="ms12-btn" href="/app/meeting/new" style="background:rgb(15 118 110)">새 회의</a>
         <a class="ms12-btn" href="/app/join" style="margin-left:0.5rem">회의 입장</a>
         <a class="ms12-btn ms12-btn--muted" href="/app/records" style="margin-left:0.5rem">회의 기록</a>
       </p>
       <p style="margin-top:1rem"><a href="/app" class="ms12-p">← 시작화면</a></p>
       ${loginAside('/app/meeting', kakao, google)}`,
      getAuthMode(c),
    ),
  ),
)

p.get('/meeting/:id', (c) => {
  const id = c.req.param('id')
  if (id === 'new' || !/^[a-f0-9]+$/i.test(id)) {
    return c.text('Not Found', 404)
  }
  return c.html(
    layout(
      '회의 — MS12',
      'meeting_room',
      `data-ms12-meeting-id="${escapeHtml(id)}"`,
      guestNoJs('회의'),
      `<a href="/app" class="ms12-p" style="display:inline-block;margin-bottom:0.5rem">← 시작화면</a>
       <h1 class="ms12-h1">회의 <span class="ms12-room-title js-ms12-room-title">—</span></h1>
       <p class="ms12-p">코드: <code class="js-ms12-room-code">—</code> · <span class="js-ms12-user-name" style="font-weight:600">—</span> 님</p>
       <p class="ms12-p ms12-muted" style="font-size:0.88rem" id="ms12-room-local-note">핵심 메모·전사·요약은 이 브라우저에 자동 저장됩니다.</p>
       <div class="ms12-room-wrap" style="margin-top:0.75rem">
         <div>
           <div class="ms12-panel">
             <p class="ms12-p" style="font-weight:600;margin:0 0 0.5rem 0">회의 메모</p>
             <textarea class="ms12-notes" id="ms12-room-notes" placeholder="핵심 메모 (자동 저장)"></textarea>
             <p class="ms12-p" style="font-weight:600;margin:0.75rem 0 0.4rem 0">전사</p>
             <textarea class="ms12-notes" id="ms12-room-transcript" placeholder="전사문 (데모: 입력·붙여넣기, 자동 저장)" style="min-height:6rem"></textarea>
             <p class="ms12-p" style="font-weight:600;margin:0.75rem 0 0.4rem 0">요약</p>
             <textarea class="ms12-notes" id="ms12-room-summary" placeholder="요약 (자동 저장)" style="min-height:6rem"></textarea>
             <div class="ms12-toolbar">
               <button type="button" class="ms12-btn ms12-btn--muted" id="ms12-room-flush">지금 이 브라우저에 저장</button>
               <button type="button" class="ms12-btn" id="ms12-room-export">JSON 내보내기</button>
             </div>
           </div>
         </div>
         <aside>
           <div class="ms12-panel" id="ms12-part-wrap">
             <p class="ms12-p" style="font-weight:600;margin:0 0 0.25rem 0">참석자 <span class="js-ms12-part-count">0</span>명</p>
             <ul class="ms12-part-list js-ms12-part-list"><li>불러오는 중…</li></ul>
           </div>
         </aside>
       </div>
       ${loginAside('/app/meeting/' + id, kakao, google)}
       <p id="ms12-room-err" class="ms12-p" style="color:rgb(185 28 28);display:none"></p>`,
      getAuthMode(c),
    ),
  )
})

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** /app/login — 로그인 랜딩 없이 /app(사용 화면)로만. 쿼리(오류 등)는 유지 */
p.get('/login', (c) => {
  const q = new URL(c.req.url).search || ''
  return c.redirect(`/app${q}`, 302)
})

export default p
