/** MS12 /app* — 공개·게스트 기본, OAuth 는 loginAside 만 */
import { Hono } from 'hono'
import { Bindings } from '../types/database'
import { getAuthMode } from '../utils/auth-mode'

const p = new Hono<{ Bindings: Bindings }>()

/** Pages 배포·소스 ?v= 일치(배포 후 페이지 소스에 이 주석이 보이면 새 Worker) */
const MS12_BUILD = '20260422q'
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
  @media (min-width: 640px) { .ms12-card-grid--2x2{grid-template-columns:1fr 1fr;} }
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
  .ms12-ai-out{min-height:4.5rem;font-size:0.88rem;white-space:pre-wrap;color:rgb(55 65 81);line-height:1.45;}
  .ms12-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:0.82rem;}
  .ms12-action-row{display:flex;flex-wrap:wrap;align-items:center;gap:0.4rem 0.6rem;padding:0.4rem 0;border-bottom:1px solid rgb(241 245 249);font-size:0.88rem;}
  .ms12-tab-bar{display:flex;flex-wrap:wrap;gap:0.35rem;margin:0 0 0.25rem 0;align-items:center}
  .ms12-tab{display:inline-block;padding:0.38rem 0.7rem;border-radius:9999px;border:1px solid rgb(203 213 225);background:rgb(248 250 252);color:rgb(51 65 85);font-size:0.86rem;cursor:pointer;font-weight:500}
  .ms12-tab:hover{border-color:rgb(165 180 252);background:rgb(238 242 255)}
  .ms12-tab--active{background:rgb(79 70 229);color:#fff;border-color:rgb(79 70 229)}
  .ms12-tab--active:hover{background:rgb(67 56 202);color:#fff;border-color:rgb(67 56 202)}
  .ms12-subtab-bar{display:flex;flex-wrap:wrap;gap:0.3rem;margin:0.35rem 0 0.5rem 0;align-items:center}
  .ms12-subtab{display:inline-block;padding:0.28rem 0.55rem;border-radius:0.4rem;border:1px solid rgb(226 232 240);background:rgb(255 255 255);color:rgb(71 85 105);font-size:0.78rem;cursor:pointer}
  .ms12-subtab--active{border-color:rgb(129 140 248);background:rgb(238 242 255);color:rgb(49 46 129);font-weight:600}
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
  | 'library'
  | 'archive'
  | 'meeting_record'
  | 'login'

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
       <p class="ms12-p ms12-muted" style="margin-top:0.25rem">회의·기록·문서·보관함까지 한 흐름으로 이용할 수 있습니다. (<a href="/app/login" class="text-indigo-600" style="text-decoration:underline">로그인</a>은 선택입니다.)</p>
       <p class="ms12-subtitle" style="margin-top:1.25rem">빠른 작업</p>
       <div class="ms12-card-grid" style="margin-top:0.5rem;grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">
         <a class="ms12-big-btn" href="/app/meeting/new" style="text-decoration:none">
           <strong>회의 시작</strong><span>새 모임·회의(코드 자동 발급)</span>
         </a>
         <a class="ms12-big-btn" href="/app/join" style="text-decoration:none">
           <strong>회의 참여</strong><span>초대 코드로 입장</span>
         </a>
         <a class="ms12-big-btn" href="/app/records" style="text-decoration:none">
           <strong>기록 보기</strong><span>참여·저장·요약(기록·목록)</span>
         </a>
         <a class="ms12-big-btn" href="/app/library" style="text-decoration:none">
           <strong>문서 보관함</strong><span>기관 문서·검색·AI·결합</span>
         </a>
         <a class="ms12-big-btn" href="/app/archive" style="text-decoration:none">
           <strong>회의 보관함</strong><span>서버에 저장한 회의 스냅샷</span>
         </a>
         <a class="ms12-big-btn" href="/app/announcements" style="text-decoration:none">
           <strong>공모사업 찾기</strong><span>구조화 공고·검색·회의·제안서 연결</span>
         </a>
       </div>
       <p class="ms12-p" style="margin-top:0.75rem"><a href="/app/meeting" class="text-indigo-600" style="text-decoration:underline">회의 허브</a> · <a href="/app/library" class="text-indigo-600" style="text-decoration:underline">문서</a> · <a href="/app/archive" class="text-indigo-600" style="text-decoration:underline">보관</a></p>
       <p class="ms12-subtitle" style="margin-top:1.5rem">대시보드</p>
       <div class="ms12-card-grid ms12-card-grid--2x2" style="margin-top:0.5rem">
         <div class="ms12-panel" style="margin:0;padding:0.85rem 1rem">
           <p class="ms12-p" style="font-weight:600;margin:0 0 0.35rem 0">최근 문서</p>
           <div id="ms12-dash-docs" class="ms12-muted" style="font-size:0.88rem;min-height:2.5rem">불러오는 중…</div>
           <p style="margin-top:0.5rem"><a class="text-indigo-600" style="font-size:0.88rem;text-decoration:underline" href="/app/library">문서 보관함 열기</a></p>
         </div>
         <div class="ms12-panel" style="margin:0;padding:0.85rem 1rem">
           <p class="ms12-p" style="font-weight:600;margin:0 0 0.35rem 0">미완료 실행 항목</p>
           <div id="ms12-dash-actions" class="ms12-muted" style="font-size:0.88rem;min-height:2.5rem">불러오는 중…</div>
           <p style="margin-top:0.5rem"><a class="text-indigo-600" style="font-size:0.88rem;text-decoration:underline" href="/app/records">기록·회의 목록</a></p>
         </div>
       </div>
       <div class="ms12-panel" style="margin-top:0.75rem;padding:0.85rem 1rem">
         <p class="ms12-p" style="font-weight:600;margin:0 0 0.35rem 0">빠른 검색 (문서 창고)</p>
         <form id="ms12-home-quick-search" class="ms12-toolbar" style="margin:0;flex-wrap:wrap;align-items:center;gap:0.5rem">
           <input class="ms12-input" name="q" type="search" placeholder="키워드·제목" style="max-width:14rem" />
           <button type="submit" class="ms12-btn" style="margin:0">이동</button>
         </form>
         <p class="ms12-muted" style="font-size:0.8rem;margin:0.35rem 0 0 0">제출 시 문서 보관함으로 이동합니다(자동 리다이렉트 아님).</p>
       </div>
       <div id="ms12-resume" class="ms12-muted" style="display:none;margin-top:0.5rem;margin-bottom:0.75rem;padding:0.5rem 0.75rem;border-radius:0.5rem;border:1px solid rgb(226 232 240);background:rgb(248 250 252)"></div>
       <div class="ms12-footer-cards">
         <p class="ms12-subtitle">최근 회의</p>
         <div id="ms12-home-recent" class="ms12-muted" style="min-height:2.5rem">세션을 확인하는 중…</div>
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

p.get('/archive', (c) =>
  c.html(
    layout(
      '회의 보관함 — MS12',
      'archive',
      '',
      guestNoJs('회의 보관함'),
      `<a href="/app" class="ms12-p" style="display:inline-block;margin-bottom:0.5rem">← 시작화면</a>
       <h1 class="ms12-h1">회의 보관함</h1>
       <p class="ms12-p">저장한 회의를 날짜·분류·태그·검색어로 다시 열 수 있습니다. (D1 0079)</p>
       <form id="ms12-ar-filter" class="ms12-toolbar" style="margin:0.75rem 0;flex-wrap:wrap;align-items:center;gap:0.5rem">
         <input class="ms12-input" name="q" type="search" placeholder="검색어" style="max-width:12rem" />
         <input class="ms12-input" name="category" type="text" placeholder="분류" style="max-width:8rem" />
         <input class="ms12-input" name="tag" type="text" placeholder="태그" style="max-width:8rem" />
         <input class="ms12-input" name="dateFrom" type="date" style="max-width:11rem" />
         <span class="ms12-muted">~</span>
         <input class="ms12-input" name="dateTo" type="date" style="max-width:11rem" />
         <select class="ms12-input" name="sort" style="max-width:10rem">
           <option value="updated_desc">최신 수정</option>
           <option value="date_desc">회의일 최신</option>
           <option value="date_asc">회의일 오래된</option>
           <option value="title_asc">제목</option>
           <option value="category_asc">분류</option>
         </select>
         <button type="submit" class="ms12-btn" style="margin:0">불러오기</button>
       </form>
       <div id="ms12-ar-list" class="ms12-p">불러오는 중…</div>
       ${loginAside('/app/archive', kakao, google)}`,
      getAuthMode(c),
    ),
  ),
)

p.get('/meeting-record/:rid', (c) => {
  const id = c.req.param('rid')
  if (!/^[a-f0-9]+$/i.test(id)) {
    return c.text('Not Found', 404)
  }
  return c.html(
    layout(
      '회의 기록 — MS12',
      'meeting_record',
      `data-ms12-record-id="${escapeHtml(id)}"`,
      guestNoJs('회의 기록'),
      `<a href="/app/archive" class="ms12-p" style="display:inline-block;margin-bottom:0.5rem">← 보관함</a>
       <h1 class="ms12-h1">회의 기록</h1>
       <p class="ms12-muted" id="ms12-mr-meta" style="font-size:0.88rem">불러오는 중…</p>
       <form id="ms12-mr-form" style="margin-top:0.75rem;max-width:40rem" autocomplete="off">
         <input type="hidden" name="id" id="ms12-mr-id" value="${escapeHtml(id)}"/>
         <label class="ms12-p" style="font-weight:500;display:block">제목</label>
         <input class="ms12-input" name="title" id="ms12-mr-title" type="text" required style="max-width:100%"/>
         <label class="ms12-p" style="font-weight:500;display:block;margin-top:0.5rem">회의 날짜</label>
         <input class="ms12-input" name="meetingDate" id="ms12-mr-date" type="date" required />
         <label class="ms12-p" style="font-weight:500;display:block;margin-top:0.5rem">분류</label>
         <input class="ms12-input" name="category" id="ms12-mr-cat" type="text" value="일반" />
         <label class="ms12-p" style="font-weight:500;display:block;margin-top:0.5rem">참석자 (JSON 배열, 선택)</label>
         <input class="ms12-input" name="participantsJson" id="ms12-mr-parts" type="text" placeholder='[{"name":"홍길동"}]' style="max-width:100%"/>
         <label class="ms12-p" style="font-weight:500;display:block;margin-top:0.5rem">공개</label>
         <select class="ms12-input" name="visibility" id="ms12-mr-vis" style="max-width:16rem">
           <option value="public_internal">내부 공개</option>
           <option value="restricted">제한</option>
           <option value="private_admin">관리자만</option>
         </select>
         <label class="ms12-p" style="font-weight:500;display:block;margin-top:0.5rem">태그</label>
         <input class="ms12-input" name="tags" id="ms12-mr-tags" type="text" />
         <label class="ms12-p" style="font-weight:500;display:block;margin-top:0.5rem">프로젝트·예산·대상</label>
         <input class="ms12-input" name="projectName" id="ms12-mr-proj" type="text" placeholder="프로젝트" style="max-width:100%"/>
         <div style="display:flex;flex-wrap:wrap;gap:0.5rem">
           <input class="ms12-input" name="budgetRef" id="ms12-mr-bud" type="text" placeholder="예산 참고" style="min-width:8rem" />
           <input class="ms12-input" name="targetGroup" id="ms12-mr-tg" type="text" placeholder="대상 집단" style="min-width:8rem" />
         </div>
         <p class="ms12-p" style="font-weight:600;margin:0.75rem 0 0.25rem 0">회의 원문</p>
         <textarea class="ms12-notes" name="rawNotes" id="ms12-mr-raw" required placeholder="필수" style="min-height:6rem"></textarea>
         <p class="ms12-p" style="font-weight:600;margin:0.5rem 0 0.25rem 0">녹취·전사</p>
         <textarea class="ms12-notes" name="transcript" id="ms12-mr-tr" style="min-height:5rem"></textarea>
         <p class="ms12-p" style="font-weight:600;margin:0.5rem 0 0.25rem 0">최종 정리본(선택)</p>
         <textarea class="ms12-notes" name="finalNotes" id="ms12-mr-fin" style="min-height:4rem"></textarea>
         <p class="ms12-p" style="font-weight:600;margin:0.5rem 0 0.25rem 0">요약</p>
         <textarea class="ms12-notes" name="summaryBasic" id="ms12-mr-s0" placeholder="기본 요약" style="min-height:3rem"></textarea>
         <textarea class="ms12-notes" name="summaryAction" id="ms12-mr-s1" placeholder="실행 요약" style="min-height:3rem"></textarea>
         <textarea class="ms12-notes" name="summaryReport" id="ms12-mr-s2" placeholder="보고 요약" style="min-height:3rem"></textarea>
         <p style="margin-top:0.75rem">
           <button type="submit" class="ms12-btn">재저장</button>
           <span class="ms12-muted" id="ms12-mr-msg" style="margin-left:0.5rem;font-size:0.88rem"></span>
         </p>
       </form>
       ${loginAside('/app/meeting-record/' + id, kakao, google)}`,
      getAuthMode(c),
    ),
  )
})

p.get('/library', (c) =>
  c.html(
    layout(
      '문서 자산 — MS12',
      'library',
      '',
      guestNoJs('문서 자산'),
      `<a href="/app" class="ms12-p" style="display:inline-block;margin-bottom:0.5rem">← 시작화면</a>
       <h1 class="ms12-h1">문서 자산</h1>
       <p class="ms12-p">제안서·기획서·보고서 메타를 구조화해 저장하고, 키워드·AI 자연어로 찾고, 문서를 결합해 초안을 만듭니다. (D1 0077·R2·AI 키가 필요한 기능이 있습니다.)</p>
       <div class="ms12-panel" style="margin-top:0.75rem">
         <p class="ms12-p" style="font-weight:600">검색</p>
         <form id="ms12-lib-search" class="ms12-toolbar" style="align-items:center;margin:0.4rem 0;flex-wrap:wrap">
           <input class="ms12-input" name="q" type="search" placeholder="키워드" style="max-width:12rem" />
           <input class="ms12-input" name="docType" type="text" placeholder="유형(제안서·기획서·결과보고서·기타)" style="max-width:14rem" list="ms12-doctypes" />
           <input class="ms12-input" name="year" type="number" placeholder="연도" style="max-width:6rem" min="1990" max="2100" />
           <button type="submit" class="ms12-btn" style="margin:0">목록</button>
         </form>
         <datalist id="ms12-doctypes">
           <option value="제안서"></option>
           <option value="기획서"></option>
           <option value="결과보고서"></option>
           <option value="기타"></option>
         </datalist>
         <p class="ms12-p" style="font-weight:600;margin:0.75rem 0 0.25rem 0">자연어 검색 (AI)</p>
         <textarea class="ms12-input" id="ms12-lib-nl" rows="2" placeholder="예: 예산 1천만원 이하 2023년 제안서" style="max-width:100%;min-height:2.5rem"></textarea>
         <button type="button" class="ms12-btn ms12-btn--teal" id="ms12-lib-nl-btn" style="margin-top:0.4rem">AI로 찾기</button>
         <div id="ms12-lib-err" class="ms12-p" style="color:rgb(185 28 28);display:none;font-size:0.88rem"></div>
         <div id="ms12-lib-list" class="ms12-p" style="margin-top:0.5rem;min-height:2rem">불러오는 중…</div>
       </div>
       <div class="ms12-panel" style="margin-top:0.75rem">
         <p class="ms12-p" style="font-weight:600">새로 등록 (파일 + 메타)</p>
         <form id="ms12-lib-up" enctype="multipart/form-data" style="display:grid;gap:0.5rem;max-width:32rem">
           <input class="ms12-input" name="file" type="file" required />
           <input class="ms12-input" name="title" type="text" placeholder="제목" required />
           <div style="display:flex;flex-wrap:wrap;gap:0.4rem">
             <input class="ms12-input" name="docType" type="text" placeholder="문서 유형" value="기타" list="ms12-doctypes" style="max-width:10rem" />
             <input class="ms12-input" name="year" type="number" placeholder="연도" style="max-width:6rem" min="1990" max="2100" />
             <input class="ms12-input" name="keywords" type="text" placeholder="키워드(쉼표)" style="min-width:10rem" />
           </div>
           <input class="ms12-input" name="outcomeSummary" type="text" placeholder="한 줄 성과/요약(선택)" style="max-width:100%" />
           <input class="ms12-input" name="meetingId" type="text" placeholder="연결 회의 ID(선택, hex)" pattern="[a-fA-F0-9]+" style="max-width:100%" />
           <button type="submit" class="ms12-btn" style="margin:0">업로드</button>
         </form>
         <p id="ms12-lib-up-msg" class="ms12-muted" style="font-size:0.86rem;margin-top:0.35rem"></p>
       </div>
       <div class="ms12-panel" style="margin-top:0.75rem">
         <p class="ms12-p" style="font-weight:600">문서 결합 초안 (AI, 2개 이상 id)</p>
         <p class="ms12-muted" style="font-size:0.85rem">목록에 표시된 id를 쉼표로 넣으세요. 예: 1,2,3</p>
         <input class="ms12-input" id="ms12-lib-combine-ids" type="text" placeholder="1,2" style="max-width:20rem" />
         <button type="button" class="ms12-btn ms12-btn--muted" id="ms12-lib-combine" style="margin:0.4rem 0 0 0">초안 생성</button>
         <textarea class="ms12-notes" id="ms12-lib-combine-out" readonly placeholder="결합 초안" style="min-height:8rem;margin-top:0.5rem;font-size:0.88rem"></textarea>
       </div>
       ${loginAside('/app/library', kakao, google)}`,
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
      `<a href="/app" class="ms12-p" style="display:inline-block;margin-bottom:0.5rem">← 시작화면</a>
       <h1 class="ms12-h1">회의 허브</h1>
       <p class="ms12-p">새로 만들거나 코드로 참여하거나, 기록·문서·보관함으로 이어갈 수 있습니다.</p>
       <p class="ms12-p" style="margin-top:0.5rem">표시 이름: <span class="js-ms12-user-name" style="font-weight:600">—</span> <span class="js-ms12-user-suffix" style="font-weight:400">님</span></p>
       <p style="margin-top:0.75rem">
         <a class="ms12-btn" href="/app/meeting/new" style="background:rgb(15 118 110)">회의 시작</a>
         <a class="ms12-btn" href="/app/join" style="margin-left:0.5rem">회의 참여</a>
         <a class="ms12-btn" href="/app/records" style="margin-left:0.5rem">기록 보기</a>
       </p>
       <p style="margin-top:0.5rem">
         <a class="ms12-btn ms12-btn--muted" href="/app/archive">회의 보관함</a>
         <a class="ms12-btn ms12-btn--muted" href="/app/library" style="margin-left:0.5rem">문서 보관함</a>
       </p>
       <p class="ms12-muted" style="margin-top:0.75rem;font-size:0.88rem">회의실: 메모·전사·요약(기본/실행/보고)·서버 보관, 실행 항목, AI 질의·문서 초안(보고·계획·제안·홍보), 참석자 목록.</p>
       <p style="margin-top:0.5rem"><a href="/app" class="ms12-p">← 시작화면</a></p>
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
       <div id="ms12-linked-ann" class="ms12-panel" style="display:none;margin:0.75rem 0;max-width:40rem;padding:0.75rem 1rem;border:1px solid rgb(199 210 254);background:rgb(238 242 255)">
         <p class="ms12-p" style="font-weight:600;margin:0 0 0.25rem 0">연결된 공모·지원 공고</p>
         <p class="ms12-p" id="ms12-linked-ann-line" style="font-size:0.9rem;margin:0"></p>
         <a id="ms12-linked-ann-link" class="text-indigo-600" style="font-size:0.88rem;text-decoration:underline;display:none" href="#">공고 상세</a>
       </div>
       <div class="ms12-panel" style="margin:0.75rem 0 0.75rem 0;max-width:32rem">
         <p class="ms12-p" style="font-weight:600;margin:0 0 0.35rem 0">서버 보관함에 저장</p>
         <p class="ms12-muted" style="font-size:0.8rem;margin:0 0 0.4rem 0">제목·날짜·분류·메모(원문)는 필수입니다. 저장 후 <a href="/app/archive" class="text-indigo-600" style="text-decoration:underline">회의 보관함</a>에서 불러올 수 있습니다.</p>
         <input class="ms12-input" id="ms12-save-title" type="text" placeholder="회의 제목" maxlength="200" style="max-width:100%"/>
         <div style="display:grid;gap:0.35rem;margin-top:0.4rem;max-width:22rem">
           <label class="ms12-muted" style="font-size:0.8rem">회의 날짜</label>
           <input class="ms12-input" id="ms12-save-meeting-date" type="date" />
           <label class="ms12-muted" style="font-size:0.8rem">회의 분류</label>
           <input class="ms12-input" id="ms12-save-category" type="text" value="일반" list="ms12-cat-dl" />
           <datalist id="ms12-cat-dl">
             <option value="일반"></option>
             <option value="운영회의"></option>
             <option value="기획"></option>
             <option value="사업"></option>
             <option value="상담"></option>
           </datalist>
           <label class="ms12-muted" style="font-size:0.8rem">태그(쉼표)</label>
           <input class="ms12-input" id="ms12-save-tags" type="text" placeholder="부모교육,공모" />
           <label class="ms12-muted" style="font-size:0.8rem">공개 수준</label>
           <select class="ms12-input" id="ms12-save-vis" style="max-width:16rem">
             <option value="public_internal">내부 전체(기본)</option>
             <option value="restricted">제한</option>
             <option value="private_admin">관리자만</option>
           </select>
         </div>
         <button type="button" class="ms12-btn ms12-btn--teal" id="ms12-meeting-save-server" style="margin-top:0.5rem">서버에 회의 저장</button>
         <p class="ms12-muted" id="ms12-save-server-msg" style="font-size:0.8rem;margin:0.35rem 0 0 0"></p>
       </div>
       <div class="ms12-room-wrap" style="margin-top:0.75rem">
         <div>
           <div class="ms12-panel" style="padding:0.55rem 0.7rem 0.35rem 0.7rem">
             <div class="ms12-tab-bar" role="tablist" aria-label="회의 섹션">
               <button type="button" class="ms12-tab ms12-tab--active" data-ms12-room-tab="memo" id="ms12-tab-memo" aria-selected="true">메모·전사</button>
               <button type="button" class="ms12-tab" data-ms12-room-tab="summary" id="ms12-tab-summary" aria-selected="false">요약</button>
               <button type="button" class="ms12-tab" data-ms12-room-tab="actions" id="ms12-tab-actions" aria-selected="false">실행 항목</button>
               <button type="button" class="ms12-tab" data-ms12-room-tab="drafts" id="ms12-tab-drafts" aria-selected="false">문서 초안</button>
             </div>
           </div>
           <div id="ms12-rpanel-memo" class="ms12-rpanel" data-panel="memo">
             <div class="ms12-panel" style="margin-top:0.35rem">
             <p class="ms12-p" style="font-weight:600;margin:0 0 0.5rem 0">회의 메모</p>
             <textarea class="ms12-notes" id="ms12-room-notes" placeholder="핵심 메모 (자동 저장)"></textarea>
             <p class="ms12-p" style="font-weight:600;margin:0.75rem 0 0.4rem 0">전사</p>
             <p class="ms12-p" style="font-size:0.82rem;margin:0 0 0.35rem 0" id="ms12-stt-hint">회의실에 들어오면 마이크 권한을 요청한 뒤 음성 전사가 자동으로 켜집니다. (Chrome·Edge 권장 · HTTPS 필요)</p>
             <div class="ms12-toolbar" style="margin:0 0 0.4rem 0">
               <button type="button" class="ms12-btn ms12-btn--teal" id="ms12-stt-toggle">음성 켜기</button>
               <span class="ms12-muted ms12-mono" id="ms12-stt-status" style="font-size:0.8rem">준비 중…</span>
             </div>
             <textarea class="ms12-notes" id="ms12-room-transcript" placeholder="전사문 (입력·붙여넣기·음성, 자동 저장)" style="min-height:6rem"></textarea>
             <div class="ms12-toolbar" style="margin-top:0.6rem">
               <button type="button" class="ms12-btn ms12-btn--muted" id="ms12-room-flush">지금 이 브라우저에 저장</button>
               <button type="button" class="ms12-btn" id="ms12-room-export">JSON 내보내기</button>
             </div>
             </div>
           </div>
           <div id="ms12-rpanel-summary" class="ms12-rpanel" data-panel="summary" style="display:none">
             <div class="ms12-panel" style="margin-top:0.35rem">
               <p class="ms12-p" style="font-weight:600;margin:0 0 0.35rem 0">AI 제안 (메모·전사 기반, 자동·수동)</p>
               <p class="ms12-muted" id="ms12-ai-auto-status" style="font-size:0.8rem;margin:0 0 0.4rem 0">입력이 멈춘 뒤 약 90초마다(참가자·API 키 있을 때) 갱신을 시도합니다. 또는 아래를 누르세요.</p>
               <div class="ms12-toolbar" style="margin:0 0 0.5rem 0">
                 <button type="button" class="ms12-btn ms12-btn--teal" id="ms12-ai-summary-now" style="margin:0">지금 AI 요약 받기</button>
                 <button type="button" class="ms12-btn" id="ms12-ai-summary-apply" style="margin:0">AI 제안 → 아래 요약에 반영</button>
               </div>
               <div class="ms12-panel" style="margin:0.35rem 0 0.75rem 0;padding:0.6rem 0.75rem;background:rgb(248 250 252)">
                 <p class="ms12-muted" style="font-size:0.75rem;margin:0 0 0.3rem 0">AI·기본 (직접 수정 가능)</p>
                 <textarea id="ms12-ai-sug-basic" class="ms12-input" rows="2" style="width:100%;min-height:2.4rem;max-width:100%;font-size:0.86rem;white-space:pre-wrap;resize:vertical" placeholder="—">—</textarea>
                 <p class="ms12-muted" style="font-size:0.75rem;margin:0.5rem 0 0.3rem 0">AI·실행 (직접 수정 가능)</p>
                 <textarea id="ms12-ai-sug-action" class="ms12-input" rows="2" style="width:100%;min-height:2.4rem;max-width:100%;font-size:0.86rem;white-space:pre-wrap;resize:vertical" placeholder="—">—</textarea>
                 <p class="ms12-muted" style="font-size:0.75rem;margin:0.5rem 0 0.3rem 0">AI·보고 (직접 수정 가능)</p>
                 <textarea id="ms12-ai-sug-report" class="ms12-input" rows="2" style="width:100%;min-height:2.4rem;max-width:100%;font-size:0.86rem;white-space:pre-wrap;resize:vertical" placeholder="—">—</textarea>
               </div>
               <p class="ms12-p" style="font-weight:600;margin:0.5rem 0 0.35rem 0">수정·저장용 요약 (3단)</p>
             <p class="ms12-muted" style="font-size:0.8rem;margin:0 0 0.4rem 0">탭을 누르면 해당 유형만 AI로 정리·아래에 반영됩니다. (자동 저장) 전체 3단은 위「지금 AI 요약 받기」에서 한꺼번에 갱신됩니다.</p>
             <div class="ms12-subtab-bar" role="tablist" aria-label="요약 유형" style="margin:0.35rem 0 0.5rem 0;flex-wrap:wrap">
               <button type="button" class="ms12-subtab ms12-subtab--active" data-ms12-summary-tab="basic" id="ms12-sum-tab-basic" role="tab" aria-selected="true">기본요약</button>
               <button type="button" class="ms12-subtab" data-ms12-summary-tab="action" id="ms12-sum-tab-action" role="tab" aria-selected="false">실행요약</button>
               <button type="button" class="ms12-subtab" data-ms12-summary-tab="report" id="ms12-sum-tab-report" role="tab" aria-selected="false">보고요약</button>
             </div>
             <div data-ms12-summary-wrap="basic" class="ms12-summary-wrap" style="display:block">
             <label class="ms12-muted" style="font-size:0.78rem;display:block;margin:0 0 0.15rem 0" for="ms12-room-summary-basic">기본 요약</label>
             <textarea class="ms12-notes" id="ms12-room-summary-basic" placeholder="기본 요약 (자동 저장)" style="min-height:5rem" aria-label="기본 요약"></textarea>
             </div>
             <div data-ms12-summary-wrap="action" class="ms12-summary-wrap" style="display:none">
             <label class="ms12-muted" style="font-size:0.78rem;display:block;margin:0 0 0.15rem 0" for="ms12-room-summary-action">실행 요약</label>
             <textarea class="ms12-notes" id="ms12-room-summary-action" placeholder="실행 요약" style="min-height:5rem" aria-label="실행 요약"></textarea>
             </div>
             <div data-ms12-summary-wrap="report" class="ms12-summary-wrap" style="display:none">
             <label class="ms12-muted" style="font-size:0.78rem;display:block;margin:0 0 0.15rem 0" for="ms12-room-summary-report">보고 요약</label>
             <textarea class="ms12-notes" id="ms12-room-summary-report" placeholder="보고 요약" style="min-height:5rem" aria-label="보고 요약"></textarea>
             </div>
             <p class="ms12-p" style="font-weight:600;margin:0.75rem 0 0.35rem 0">실행 항목 (AI 초안)</p>
             <p class="ms12-muted" style="font-size:0.8rem;margin:0 0 0.4rem 0">메모·전사·3단 요약을 바탕으로 AI가 후보를 만듭니다. 아래 JSON을 고친 뒤 «서버에 반영»하세요. <strong>실행 항목</strong> 탭 목록에서도 제목·상세·담당·기한을 바로 고칠 수 있습니다.</p>
             <label class="ms12-muted" style="font-size:0.78rem;display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;margin:0 0 0.4rem 0">
               <input type="checkbox" id="ms12-ai-action-sync" checked style="width:auto" /> 전체 AI 요약(90초·또는「지금 받기」)과 함께 실행 항목 초안도 채움
             </label>
             <div class="ms12-toolbar" style="margin:0 0 0.5rem 0;flex-wrap:wrap;gap:0.4rem;align-items:center">
               <button type="button" class="ms12-btn" id="ms12-ai-action-gen" style="margin:0">실행 항목 AI 제안</button>
               <button type="button" class="ms12-btn ms12-btn--teal" id="ms12-ai-action-apply" style="margin:0">초안 → 서버 실행 항목에 추가</button>
             </div>
             <textarea class="ms12-notes" id="ms12-ai-action-draft" style="min-height:6.5rem;font-size:0.85rem" placeholder='[ { "title": "…", "taskDetail": "", "assignee": "", "dueAt": "" } ] JSON 배열, 수정 후 반영' aria-label="실행 항목 AI 초안"></textarea>
             </div>
           </div>
           <div id="ms12-rpanel-actions" class="ms12-rpanel" data-panel="actions" style="display:none">
             <div class="ms12-panel" style="margin-top:0.35rem">
               <p class="ms12-p" style="font-weight:600;margin:0 0 0.5rem 0">실행 항목 (정리·추가)</p>
               <p class="ms12-muted" style="font-size:0.8rem;margin:0 0 0.5rem 0">할 일·담당·기한·완료를 한곳에서 봅니다. 서버 동기화는 참가자일 때만 됩니다.</p>
               <div id="ms12-actions-list" class="ms12-muted" style="font-size:0.88rem;min-height:1.5rem">불러오는 중…</div>
               <form id="ms12-action-form" style="margin-top:0.6rem;display:grid;gap:0.4rem" autocomplete="off">
                 <input class="ms12-input" name="title" type="text" placeholder="할 일" maxlength="500" required style="max-width:100%"/>
                 <input class="ms12-input" name="taskDetail" type="text" placeholder="세부 설명(선택)" style="max-width:100%"/>
                 <div style="display:flex;flex-wrap:wrap;gap:0.4rem;align-items:center">
                   <input class="ms12-input" name="assignee" type="text" placeholder="담당(선택)" maxlength="120" style="max-width:12rem"/>
                   <input class="ms12-input" name="dueAt" type="date" style="max-width:11rem"/>
                   <select class="ms12-input" name="priority" style="max-width:7rem" title="우선순위">
                     <option value="low">낮음</option>
                     <option value="normal" selected>보통</option>
                     <option value="high">높음</option>
                   </select>
                   <select class="ms12-input" name="itemCategory" style="max-width:8rem" title="구분">
                     <option value="required" selected>필수</option>
                     <option value="assist">협조</option>
                     <option value="optional">선택</option>
                   </select>
                 </div>
                 <button type="submit" class="ms12-btn" style="margin-top:0.25rem">추가</button>
               </form>
             </div>
           </div>
           <div id="ms12-rpanel-drafts" class="ms12-rpanel" data-panel="drafts" style="display:none">
             <div class="ms12-panel" style="margin-top:0.35rem">
               <p class="ms12-p" style="font-weight:600;margin:0 0 0.4rem 0">문서 초안 (AI)</p>
               <p class="ms12-muted" style="font-size:0.8rem;margin:0 0 0.5rem 0">유형을 탭으로 고른 뒤, 버튼으로 생성합니다. 전환 시 해당 유형에 저장한 초안이 표시됩니다(브라우저에 유지).</p>
               <p class="ms12-muted" style="font-size:0.75rem;margin:0 0 0.25rem 0">보고·계획·제안</p>
               <div class="ms12-subtab-bar" data-ms12-draft-group="a">
                 <button type="button" class="ms12-subtab ms12-subtab--active" data-ms12-draft-kind="report_int" title="내부 보고">내부 보고</button>
                 <button type="button" class="ms12-subtab" data-ms12-draft-kind="report_ext" title="대외 보고">대외</button>
                 <button type="button" class="ms12-subtab" data-ms12-draft-kind="action_plan" title="실행계획">실행계획</button>
                 <button type="button" class="ms12-subtab" data-ms12-draft-kind="result_report" title="결과">결과</button>
                 <button type="button" class="ms12-subtab" data-ms12-draft-kind="proposal" title="제안">제안</button>
               </div>
               <p class="ms12-muted" style="font-size:0.75rem;margin:0.4rem 0 0.25rem 0">홍보·콘텐츠</p>
               <div class="ms12-subtab-bar" data-ms12-draft-group="b">
                 <button type="button" class="ms12-subtab" data-ms12-draft-kind="press" title="보도">보도</button>
                 <button type="button" class="ms12-subtab" data-ms12-draft-kind="blog" title="블로그">블로그</button>
                 <button type="button" class="ms12-subtab" data-ms12-draft-kind="social" title="SNS">SNS</button>
               </div>
               <div class="ms12-toolbar" style="margin:0.5rem 0;flex-wrap:wrap;gap:0.4rem;align-items:center">
                 <button type="button" class="ms12-btn ms12-btn--muted" id="ms12-draft-gen-current" style="margin:0">선택 유형으로 생성</button>
                 <span class="ms12-muted" id="ms12-draft-cur-label" style="font-size:0.78rem">· 내부 보고</span>
               </div>
               <p class="ms12-toolbar" style="margin:0;flex-wrap:wrap;gap:0.3rem;align-items:center">
                 <span class="ms12-muted" style="font-size:0.78rem">또는 직접:</span>
                 <button type="button" class="ms12-btn ms12-btn--muted" id="ms12-draft-report-int" style="margin:0">내부</button>
                 <button type="button" class="ms12-btn ms12-btn--muted" id="ms12-draft-report-ext" style="margin:0">대외</button>
                 <button type="button" class="ms12-btn ms12-btn--muted" id="ms12-draft-action-plan" style="margin:0">계획</button>
                 <button type="button" class="ms12-btn ms12-btn--muted" id="ms12-draft-result" style="margin:0">결과</button>
                 <button type="button" class="ms12-btn ms12-btn--muted" id="ms12-draft-proposal" style="margin:0">제안</button>
                 <button type="button" class="ms12-btn ms12-btn--muted" id="ms12-draft-press" style="margin:0">보도</button>
                 <button type="button" class="ms12-btn ms12-btn--muted" id="ms12-draft-blog" style="margin:0">블로그</button>
                 <button type="button" class="ms12-btn ms12-btn--muted" id="ms12-draft-social" style="margin:0">SNS</button>
               </div>
             <textarea class="ms12-notes" id="ms12-room-draft-out" readonly placeholder="초안이 여기에 표시됩니다. 전환·저장·재생성 시 유지됩니다." style="min-height:9rem;margin-top:0.35rem;font-size:0.88rem"></textarea>
             </div>
           </div>
         </div>
         <aside>
           <div class="ms12-panel" id="ms12-part-wrap">
             <p class="ms12-p" style="font-weight:600;margin:0 0 0.25rem 0">참석자 <span class="js-ms12-part-count">0</span>명</p>
             <ul class="ms12-part-list js-ms12-part-list"><li>불러오는 중…</li></ul>
           </div>
           <div class="ms12-panel" style="margin-top:0.75rem" id="ms12-ai-wrap">
             <p class="ms12-p" style="font-weight:600;margin:0 0 0.35rem 0">회의 AI 질의</p>
             <p class="ms12-muted" style="font-size:0.8rem;margin:0 0 0.4rem 0">왼쪽 메모·전사·요약을 바탕으로 답합니다. 키가 없으면 서버가 503을 반환할 수 있습니다.</p>
             <textarea class="ms12-input" id="ms12-ai-q" placeholder="이 회의에서 결정한 점은?" rows="3" style="min-height:4rem;max-width:100%;resize:vertical"></textarea>
             <div class="ms12-toolbar" style="margin-top:0.5rem">
               <button type="button" class="ms12-btn" id="ms12-ai-send">질문 보내기</button>
             </div>
             <p class="ms12-p" style="font-weight:600;margin:0.6rem 0 0.25rem 0;font-size:0.9rem">답변</p>
             <div class="ms12-ai-out" id="ms12-ai-answer">—</div>
             <p class="ms12-p ms12-muted" id="ms12-ai-err" style="color:rgb(185 28 28);display:none;font-size:0.85rem"></p>
           </div>
         </aside>
       </div>
       ${loginAside('/app/meeting/' + id, kakao, google)}
       <p id="ms12-room-err" class="ms12-p" style="color:rgb(185 28 28);display:none"></p>`,
      getAuthMode(c),
    ),
  )
})

p.get('/announcements', (c) =>
  c.html(
    layout(
      '공모사업 — MS12',
      'announcements',
      '',
      guestNoJs('공모사업'),
      `<a href="/app" class="ms12-p" style="display:inline-block;margin-bottom:0.5rem">← 시작화면</a>
       <h1 class="ms12-h1">공모·지원사업</h1>
       <p class="ms12-p">공고는 <strong>구조화(D1)</strong>된 뒤 검색·회의·제안서로 연결됩니다. 수집은 기관 API·RSS·배치 크롤 → <code>POST /api/ms12/announcements/ingest</code>로 적재합니다.</p>
       <div class="ms12-panel" style="margin-top:0.75rem">
         <p class="ms12-p" style="font-weight:600;margin:0 0 0.35rem 0">자연어 질의 (조건 풀기)</p>
         <textarea class="ms12-input" id="ms12-ann-nl" rows="2" placeholder="예: 예산 1천만원 이하 공모사업, 광주 지역, 초등학생 대상" style="max-width:100%;min-height:2.5rem"></textarea>
         <button type="button" class="ms12-btn ms12-btn--teal" id="ms12-ann-nl-btn" style="margin-top:0.4rem">AI로 해석(키 있을 때)</button>
         <p class="ms12-muted" id="ms12-ann-nl-note" style="font-size:0.8rem;margin:0.35rem 0 0 0;display:none"></p>
       </div>
       <form id="ms12-ann-filter" class="ms12-toolbar" style="margin:0.75rem 0;flex-wrap:wrap;align-items:center;gap:0.5rem">
         <input class="ms12-input" name="q" type="search" placeholder="키워드" style="max-width:12rem" />
         <select class="ms12-input" name="source" style="max-width:10rem">
           <option value="">기관(전체)</option>
           <option value="mohw">보건복지부</option>
           <option value="moe">교육청</option>
           <option value="mogef">여성가족부</option>
           <option value="chest">사회복지공동모금회</option>
           <option value="lottery">복권기금</option>
         </select>
         <input class="ms12-input" name="region" type="text" placeholder="지역" style="max-width:7rem" />
         <input class="ms12-input" name="budgetMaxWon" type="number" placeholder="예산 상한(원)" min="0" style="max-width:9rem" />
         <input class="ms12-input" name="deadlineAfter" type="date" style="max-width:11rem" />
         <span class="ms12-muted">~</span>
         <input class="ms12-input" name="deadlineBefore" type="date" style="max-width:11rem" />
         <button type="submit" class="ms12-btn" style="margin:0">검색</button>
       </form>
       <p class="ms12-muted" style="font-size:0.8rem"><a class="text-indigo-600" style="text-decoration:underline" href="/api/ms12/announcements/collect/status" target="_blank" rel="noopener">수집·정책 안내</a> (JSON)</p>
       <div id="ms12-ann-list" class="ms12-p" style="margin-top:0.5rem;min-height:3rem">불러오는 중…</div>
       ${loginAside('/app/announcements', kakao, google)}`,
      getAuthMode(c),
    ),
  ),
)

p.get('/announcements/:aid', (c) => {
  const aid = c.req.param('aid')
  if (!aid || aid.length > 96) {
    return c.text('Not Found', 404)
  }
  return c.html(
    layout(
      '공고 — MS12',
      'announcement_detail',
      `data-ms12-announcement-id="${escapeHtml(aid)}"`,
      guestNoJs('공고'),
      `<a href="/app/announcements" class="ms12-p" style="display:inline-block;margin-bottom:0.5rem">← 공고 목록</a>
       <h1 class="ms12-h1" id="ms12-ann-d-title">공고</h1>
       <div id="ms12-ann-d-body" class="ms12-muted" style="font-size:0.9rem">불러오는 중…</div>
       <p style="margin-top:1rem">
         <button type="button" class="ms12-btn ms12-btn--teal" id="ms12-ann-start-meeting">이 공고로 회의 시작</button>
         <a class="ms12-btn" href="/app/library" style="margin-left:0.5rem">문서 창고</a>
       </p>
       <div class="ms12-panel" style="margin-top:0.75rem;max-width:40rem">
         <p class="ms12-p" style="font-weight:600">제안서 초안 (AI)</p>
         <p class="ms12-muted" style="font-size:0.8rem">공고 + (선택) 연 회의·저장 기록·문서 id 를 합쳐 초안을 씁니다. 회의를 먼저 시작한 뒤, 방 ID를 넣을 수 있습니다.</p>
         <input class="ms12-input" id="ms12-ann-room-id" type="text" placeholder="회의방 ID(선택, hex)" pattern="[a-fA-F0-9]+" style="max-width:100%;margin-top:0.4rem" />
         <input class="ms12-input" id="ms12-ann-mr-id" type="text" placeholder="회의 기록 id(선택, hex)" style="max-width:100%;margin-top:0.4rem" />
         <input class="ms12-input" id="ms12-ann-doc-ids" type="text" placeholder="문서 id 쉼표(선택) 예: 1,2" style="max-width:100%;margin-top:0.4rem" />
         <button type="button" class="ms12-btn" id="ms12-ann-proposal-btn" style="margin-top:0.5rem">제안서 초안 생성</button>
         <p class="ms12-muted" id="ms12-ann-proposal-msg" style="font-size:0.8rem;margin:0.35rem 0 0 0"></p>
         <textarea class="ms12-notes" id="ms12-ann-proposal-out" readonly placeholder="초안" style="min-height:10rem;margin-top:0.5rem;font-size:0.88rem"></textarea>
       </div>
       ${loginAside('/app/announcements/' + aid, kakao, google)}`,
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

/** /app/login — 수동 이동 전용(자동 redirect 없음). JS가 /api/auth/me로 이미 로그인 여부 표시 */
p.get('/login', (c) => {
  const mode = getAuthMode(c)
  return c.html(
    layout(
      '로그인 — MS12',
      'login',
      '',
      guestNoJs('로그인'),
      `<a href="/app" class="ms12-p" style="display:inline-block;margin-bottom:0.5rem">← 시작화면</a>
       <h1 class="ms12-h1">로그인</h1>
       <p class="ms12-p">계정을 연결하면 기기를 바꿔도 이어 쓰기·동기화에 유리합니다. 로그인 없이도 회의·로컬 저장은 가능합니다.</p>
       <div class="ms12-panel" id="ms12-login-known" style="display:none;margin-top:0.75rem">
         <p class="ms12-p" style="font-weight:600;margin:0 0 0.35rem 0">이미 로그인된 상태입니다</p>
         <p class="ms12-muted" style="font-size:0.9rem;margin:0 0 0.5rem 0">시작화면이나 회의로 이동해 주세요. (자동 이동은 하지 않습니다.)</p>
         <a class="ms12-btn" href="/app">시작화면</a>
         <a class="ms12-btn ms12-btn--teal" href="/app/meeting/new" style="margin-left:0.5rem">새 회의</a>
         <a class="ms12-btn ms12-btn--muted" href="/app/meeting" style="margin-left:0.5rem">회의 허브</a>
       </div>
       <div id="ms12-login-pending" style="margin-top:0.75rem">
         <p class="ms12-p" style="font-weight:500">소셜 로그인</p>
         <p style="margin-top:0.5rem">
           <a class="ms12-btn" href="${kakao('/app/login')}">카카오</a>
           <a class="ms12-btn ms12-btn--muted" href="${google('/app/login')}" style="margin-left:0.5rem">Google</a>
         </p>
       </div>
       ${loginAside('/app/login', kakao, google)}`,
      mode,
    ),
  )
})

export default p
