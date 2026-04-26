/** MS12 /app* — 공개·게스트 기본, OAuth 는 loginAside 만 */
import { Hono, type Context } from 'hono'
import { Bindings } from '../types/database'
import { getAuthMode } from '../utils/auth-mode'
import { SITE_PUBLIC_ORIGIN } from '../utils/oauth-public'

/** `/app` vs `/app/`·`/app/hub/` 등 끝 슬래시로 404 나지 않게 */
const p = new Hono<{ Bindings: Bindings }>({ strict: false })

/** Pages 배포·소스 ?v= 일치(배포 후 페이지 소스에 이 주석이 보이면 새 Worker) */
const MS12_BUILD = '20260425meOrphanSession'
const MS12_ACTIONS_SCRIPT = `/static/js/ms12-actions.js?v=${MS12_BUILD}`
const MS12_APP_SCRIPT = `/static/js/ms12-app.js?v=${MS12_BUILD}`
const waitBlock = '<p class="ms12-p" id="ms12-wait" style="color:rgb(100 116 139)">불러오는 중…</p>'
/** /app(엔트리)로 가는 뒤로가기: 텍스트 «시작화면» 대신 홈 아이콘 */
const MS12_HOME_LINK =
  '<a href="/app" class="ms12-home-link" title="시작 화면" aria-label="시작 화면(홈)"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></a>'

const commonStyles = `
  .ms12-wrap{max-width:48rem;margin:0 auto;padding:2rem max(1.25rem, env(safe-area-inset-left)) 2rem max(1.25rem, env(safe-area-inset-right));padding-bottom:max(2rem, calc(0.75rem + env(safe-area-inset-bottom)))}
  .ms12-home-link{display:inline-flex;align-items:center;justify-content:center;margin-bottom:0.5rem;padding:0.35rem;border-radius:0.5rem;color:rgb(71 85 105);text-decoration:none;line-height:0;vertical-align:middle;transition:color 0.15s,background 0.15s}
  .ms12-home-link:hover{color:rgb(67 56 202);background:rgb(241 245 249)}
  .ms12-home-link svg{display:block;flex-shrink:0}
  .ms12-mh{max-width:40rem;margin:0 auto;padding-bottom:0.25rem}
  .ms12-mh-top{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:1.25rem}
  @media (max-width: 639px){
    .ms12-mh-top{flex-direction:column;align-items:stretch;gap:0.75rem;margin-bottom:1rem}
    .ms12-mh-user{text-align:left}
  }
  .ms12-mh-user{flex:1;min-width:0;text-align:right}
  .ms12-mh-user-line{margin:0;font-size:0.92rem;color:rgb(51 65 85);line-height:1.45}
  .ms12-mh-user-note{margin:0.35rem 0 0 0;font-size:0.8rem;color:rgb(100 116 139);line-height:1.45;max-width:20rem;margin-left:auto}
  .ms12-mh-hero{text-align:center;padding:0.25rem 0 1rem}
  .ms12-mh-title{margin:0 0 0.5rem 0;font-size:clamp(1.35rem,4.2vw,1.85rem);font-weight:800;letter-spacing:-0.02em;color:rgb(15 23 42);line-height:1.2}
  .ms12-mh-sub{margin:0 0 1.35rem 0;font-size:0.95rem;color:rgb(100 116 139);line-height:1.55}
  a.ms12-mh-cta,button.ms12-mh-cta{display:inline-flex;align-items:center;justify-content:center;width:100%;max-width:22rem;min-height:56px;min-width:56px;padding:0.75rem 1.35rem;box-sizing:border-box;font-size:1.12rem;font-weight:700;border-radius:0.9rem;background:linear-gradient(180deg,rgb(15 150 130) 0%,rgb(13 110 100) 100%);color:#fff!important;text-decoration:none;box-shadow:0 4px 18px rgba(13,110,100,0.35);border:1px solid rgba(0,0,0,0.06);font-family:inherit;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:rgba(255,255,255,0.15);transition:transform 0.12s ease, filter 0.12s ease}
  a.ms12-mh-cta:hover,button.ms12-mh-cta:hover{filter:brightness(1.05);color:#fff!important}
  a.ms12-mh-cta:active,button.ms12-mh-cta:active{transform:scale(0.98);filter:brightness(0.94)}
  .ms12-mh-cta-hint{margin:0.65rem auto 0 auto;max-width:22rem;font-size:0.8rem;line-height:1.45;color:rgb(100 116 139);text-align:center}
  .ms12-mh-status{min-height:1.3rem;max-width:24rem;margin:0.5rem auto 0;font-size:0.8rem;line-height:1.45;color:rgb(51 65 85);text-align:center}
  .ms12-mh-quick{max-width:24rem;margin:1.1rem auto 0;padding:0.75rem 0.5rem 0.25rem;box-sizing:border-box;border-top:1px solid rgb(241 245 249)}
  .ms12-mh-quick-label{margin:0 0 0.45rem 0;font-size:0.78rem;font-weight:600;color:rgb(100 116 139);text-align:center;letter-spacing:-0.01em}
  .ms12-mh-chips{display:flex;flex-wrap:wrap;gap:0.4rem;justify-content:center}
  .ms12-mh-chip{min-height:40px;min-width:0;padding:0.35rem 0.7rem;box-sizing:border-box;font-size:0.8rem;font-weight:600;border-radius:0.55rem;border:1px solid rgb(226 232 240);background:rgb(255 255 255);color:rgb(51 65 85);font-family:inherit;cursor:pointer;touch-action:manipulation;transition:background 0.12s,border-color 0.12s}
  .ms12-mh-chip:hover{border-color:rgb(165 180 252);background:rgb(248 250 252);color:rgb(67 56 202)}
  .ms12-mh-secondary{max-width:24rem;margin:1.5rem auto 0;display:grid;grid-template-columns:1fr 1fr;gap:0.75rem}
  a.ms12-mh-sec,button.ms12-mh-sec{display:flex;align-items:center;justify-content:center;min-height:44px;padding:0.45rem 0.6rem;box-sizing:border-box;font-size:0.86rem;font-weight:600;border-radius:0.7rem;border:1px solid rgb(226 232 240);background:rgb(255 255 255);color:rgb(51 65 85)!important;text-decoration:none;text-align:center;line-height:1.25;font-family:inherit;cursor:pointer;touch-action:manipulation}
  a.ms12-mh-sec:hover,button.ms12-mh-sec:hover{border-color:rgb(165 180 252);color:rgb(67 56 202)!important;background:rgb(248 250 252)}
  .ms12-mh-card{margin-top:1.35rem;padding:1.1rem 1.15rem;border-radius:0.85rem;border:1px dashed rgb(203 213 225);background:rgb(248 250 252);text-align:center}
  .ms12-mh-card p{margin:0.35rem 0 0 0;font-size:0.9rem;color:rgb(71 85 105);line-height:1.5}
  .ms12-mh-card p:first-child{margin-top:0;font-weight:600;color:rgb(30 41 59)}
  a.ms12-mh-card-btn,button.ms12-mh-card-btn{display:inline-flex;align-items:center;justify-content:center;margin-top:0.75rem;min-height:56px;min-width:56px;padding:0.5rem 1.15rem;font-size:0.88rem;font-weight:600;border-radius:0.55rem;background:rgb(15 118 110);color:#fff!important;text-decoration:none;border:0;font-family:inherit;cursor:pointer;touch-action:manipulation;transition:transform 0.12s ease, filter 0.12s ease}
  a.ms12-mh-card-btn:hover,button.ms12-mh-card-btn:hover{filter:brightness(1.06);color:#fff!important}
  a.ms12-mh-card-btn:active,button.ms12-mh-card-btn:active{transform:scale(0.98)}
  .ms12-mh-recent-grid{margin-top:1.5rem;display:grid;gap:0.75rem}
  @media (min-width: 768px){.ms12-mh-recent-grid{grid-template-columns:repeat(3,1fr);gap:0.65rem}}
  .ms12-mh-panel{padding:0.8rem 0.9rem;border:1px solid rgb(226 232 240);border-radius:0.65rem;background:rgb(255 255 255);min-height:5.5rem}
  .ms12-mh-panel h3{margin:0 0 0.4rem 0;font-size:0.72rem;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:rgb(148 163 184)}
  .ms12-mh-foot{margin-top:1.5rem;padding:1rem 1rem;border-radius:0.75rem;border:1px solid rgb(241 245 249);background:rgb(252 252 252)}
  .ms12-mh-foot p{margin:0 0 0.5rem 0;font-size:0.86rem;color:rgb(71 85 105);line-height:1.5}
  .ms12-mh-oauth a{color:rgb(79 70 229)!important;font-weight:600;text-decoration:underline}
  .ms12-h1{font-size:1.5rem;font-weight:700;margin-bottom:0.5rem;}
  .ms12-p{color:rgb(55 65 81);line-height:1.6;}
  .ms12-btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0.5rem 1.1rem;border-radius:0.5rem;background:rgb(79 70 229);color:#fff;text-decoration:none;font-weight:500;border:none;cursor:pointer;font-size:1rem;touch-action:manipulation;box-sizing:border-box}
  .ms12-btn:hover{background:rgb(67 56 202);}
  .ms12-btn--muted{background:rgb(71 85 105);}
  .ms12-btn--teal{background:rgb(15 118 110);}
  .ms12-btn--kakao{background:#FEE500!important;color:#191919!important;border:1px solid rgba(0,0,0,0.1);font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,0.08)}
  .ms12-btn--kakao:hover{filter:brightness(0.96);color:#191919!important}
  .ms12-btn--google{display:inline-flex!important;align-items:center;justify-content:center;width:100%;gap:11px;min-height:48px;
    background:#fff!important;color:#202124!important;-webkit-text-fill-color:#202124;border:1px solid #dadce0;box-shadow:0 1px 2px rgba(0,0,0,0.06);font-weight:600;text-decoration:none;box-sizing:border-box}
  .ms12-btn--google:hover{background:rgb(248 249 250)!important;color:#202124!important;-webkit-text-fill-color:#202124}
  .ms12-btn--google .ms12-login-oauth__ic{flex-shrink:0;display:block;width:22px;height:22px}
  .ms12-btn--google .ms12-login-oauth__label{color:#202124!important;-webkit-text-fill-color:#202124}
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
  body[data-ms12-route=desk]{font-family:'Pretendard Variable',Pretendard,'Malgun Gothic',ui-sans-serif,system-ui,sans-serif}
  body[data-ms12-route=desk] .ms12-wrap{max-width:min(1120px,100%);padding-left:0.9rem;padding-right:0.9rem}
  .ms12-desk{background:linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%);border-radius:1rem;border:1px solid rgb(226 232 240);padding:0.5rem 0.65rem 1.25rem;margin-top:0.5rem;box-shadow:0 1px 3px rgba(15,23,42,0.06)}
  @media (min-width:1024px){
    .ms12-dsk-grid{display:grid;grid-template-columns:4.75rem 1fr min(19rem,32%);gap:0.9rem;align-items:start}
  }
  @media (max-width:1023px){
    .ms12-dsk-grid{display:flex;flex-direction:column;gap:1rem}
  }
  .ms12-dsk-nav{display:flex;flex-direction:column;gap:0.25rem}
  @media (max-width:1023px){
    .ms12-dsk-nav{flex-direction:row;flex-wrap:wrap;justify-content:center;gap:0.35rem;padding:0.25rem 0}
  }
  .ms12-dsk-nav a{display:block;text-align:center;padding:0.4rem 0.3rem;border-radius:0.55rem;font-size:0.72rem;font-weight:600;letter-spacing:-0.02em;color:rgb(71 85 105);text-decoration:none;border:1px solid transparent;transition:background 0.15s,color 0.15s}
  .ms12-dsk-nav a:hover{background:rgb(241 245 249);color:rgb(67 56 202)}
  .ms12-dsk-nav a.ms12-dsk-nav--on{background:rgb(255 255 255);color:rgb(67 56 202);border-color:rgb(199 210 254);box-shadow:0 1px 2px rgba(79,70,229,0.08)}
  .ms12-dsk-main{min-width:0}
  .ms12-dsk-hero{padding:0.4rem 0.2rem 0.75rem}
  .ms12-dsk-brand{margin:0 0 0.35rem 0;font-size:0.7rem;letter-spacing:0.2em;font-weight:800;font-variation-settings:'wght' 800;color:rgb(100 116 139);text-transform:uppercase}
  .ms12-dsk-time{margin:0;font-size:clamp(1.85rem,5vw,2.75rem);font-weight:800;font-variation-settings:'wght' 800;letter-spacing:-0.04em;color:rgb(15 23 42);line-height:1.1}
  .ms12-dsk-date{margin:0.25rem 0 0 0;font-size:0.88rem;font-weight:500;color:rgb(100 116 139);letter-spacing:-0.01em}
  .ms12-dsk-hi{margin:0.5rem 0 0 0;font-size:0.92rem;color:rgb(51 65 85)}
  .ms12-dsk-tiles{display:grid;grid-template-columns:repeat(2,1fr);gap:0.5rem}
  @media (min-width:480px){.ms12-dsk-tiles{grid-template-columns:repeat(3,1fr)}}
  @media (min-width:800px){.ms12-dsk-tiles{grid-template-columns:repeat(3,1fr);gap:0.6rem}}
  .ms12-dsk-tile{display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-end;min-height:4.2rem;padding:0.7rem 0.75rem;border-radius:0.9rem;border:1px solid rgb(226 232 240);background:rgb(255 255 255);text-decoration:none;font-size:0.9rem;font-weight:700;letter-spacing:-0.02em;color:rgb(30 41 59);box-shadow:0 1px 2px rgba(0,0,0,0.04);transition:box-shadow 0.15s,border-color 0.15s,transform 0.12s}
  .ms12-dsk-tile:hover{border-color:rgb(165 180 252);box-shadow:0 4px 14px rgba(79,70,229,0.12);transform:translateY(-1px)}
  .ms12-dsk-tile small{display:block;font-size:0.7rem;font-weight:500;margin-top:0.2rem;color:rgb(100 116 139)}
  .ms12-dsk-tile--pri{background:linear-gradient(145deg,rgb(79 70 229) 0%,rgb(99 102 241) 100%);color:#fff;border-color:rgb(67 56 202)}
  .ms12-dsk-tile--pri small{color:rgba(255,255,255,0.88)}
  .ms12-dsk-today{margin-top:0.9rem;padding:0.75rem 0.8rem;border-radius:0.75rem;border:1px solid rgb(226 232 240);background:rgb(255 255 255)}
  .ms12-dsk-today h2{margin:0 0 0.5rem 0;font-size:0.8rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:rgb(148 163 184)}
  .ms12-dsk-today__body{font-size:0.86rem;min-height:2.4rem}
  .ms12-dsk-today a.ms12-dsk-link{display:inline-block;margin-top:0.4rem;font-size:0.82rem;color:rgb(79 70 229);font-weight:500}
  .ms12-dsk-aside{padding:0.65rem 0.7rem;border-radius:0.75rem;border:1px solid rgb(226 232 240);background:rgb(255 255 255);align-self:stretch}
  @media (max-width:1023px){.ms12-dsk-aside{order:3}}
  .ms12-dsk-aside h3{margin:0 0 0.5rem 0;font-size:0.78rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:rgb(148 163 184)}
  .ms12-dsk-chip{display:block;margin:0.32rem 0;padding:0.4rem 0.55rem;border-radius:0.5rem;border:1px solid rgb(241 245 249);font-size:0.8rem;font-weight:500;color:rgb(71 85 105);text-decoration:none;background:rgb(248 250 252)}
  .ms12-dsk-chip:hover{border-color:rgb(199 210 254);color:rgb(67 56 202)}
  .ms12-dsk-aside p.ms12-dsk-note{margin:0.65rem 0 0 0;font-size:0.72rem;line-height:1.5;color:rgb(148 163 184)}
  .ms12-dsk-ticker{overflow:hidden;margin-top:0.9rem;border-radius:0.4rem;opacity:0.55;pointer-events:none;mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
  .ms12-dsk-ticker__in{display:inline-block;white-space:nowrap;animation:ms12DskT 95s linear infinite}
  @keyframes ms12DskT{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
  @media (prefers-reduced-motion:reduce){.ms12-dsk-ticker__in{animation:none}}
`

function guestNoJs(heading: string): string {
  return `<h1 class="ms12-h1">${heading}</h1>
  <p class="ms12-p" style="font-size:0.9rem">JS 필요. <a href="/app" class="text-indigo-600">이동</a></p>`
}

function loginAside(
  nextPath: string,
  k: (n: string) => string,
  g: (n: string) => string,
  openByDefault = true
): string {
  return `<aside class="ms12-login-aside" aria-label="계정·로그인(선택)">
  <details${openByDefault ? ' open' : ''}>
    <summary>계정 · 로그인 (선택)</summary>
    <p class="ms12-login-aside__links" style="margin:0.4rem 0 0 0;line-height:1.5">기기를 바꿔도 이어 쓰려면 연동할 수 있습니다.
      <a href="${k(nextPath)}" data-ms12-login-lnk${OAUTH_A_ATTRS}>카카오</a> ·
      <a href="${g(nextPath)}" data-ms12-login-lnk${OAUTH_A_ATTRS}>Google</a>
    </p>
  </details>
  <p class="ms12-js-logout-line" style="margin:0.6rem 0 0 0">
    <button type="button" class="ms12-btn ms12-btn--muted" style="font-size:0.8rem;padding:0.3rem 0.6rem" data-ms12-logout>로그아웃</button>
  </p>
</aside>`
}

type Ms12Route =
  | 'entry'
  | 'hub'
  | 'desk'
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
  authMode: string,
  /** 공식 URL(`https://ms12.org/...`) — 검색·북마크용 canonical */
  canonicalPath?: string
) {
  const can =
    canonicalPath && canonicalPath.length > 0
      ? `${SITE_PUBLIC_ORIGIN}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`
      : ''
  const canTag = can
    ? `  <link rel="canonical" href="${can}"/>\n`
    : ''
  return `<!DOCTYPE html>
<!-- m:${MS12_BUILD} -->
<html lang="ko">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${title}</title>
${canTag}  <link rel="stylesheet" href="/static/css/app.css" />
  <link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" />
  <script src="${MS12_ACTIONS_SCRIPT}" defer></script>
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
const google = (next: string) => `/api/auth/google/start?next=${oauthNext(next)}`
/** iframe·인앱 브라우저에서 OAuth가 막히는 것 방지 — 항상 최상위 창에서 시작 */
const OAUTH_A_ATTRS = ' target="_top" rel="noopener noreferrer"'
/** OAuth·이메일 로그인 후 기본 복귀(로그인 직후 첫 화면 — 데스크) */
const POST_LOGIN_LANDING = '/app/meeting'

const ENTRY_MARQUEE_LINES: readonly [string, string, string] = [
  '회의를 기록하면, 생각이 정리됩니다.',
  '생각이 정리되면, 실행이 쉬워집니다.',
  '실행이 쉬워지면, 성과가 만들어집니다.',
]
/** 한 줄(강 흐름)로 이어서 두 세그먼트의 너비를 정확히 맞춤 → -50% 루프 */
const ENTRY_MARQUEE_RIVER = ENTRY_MARQUEE_LINES.join('   ·   ')

function entryMarqueeSeg(ariaHidden: boolean): string {
  const ah = ariaHidden ? ' aria-hidden="true"' : ''
  return `<div class="ms-marquee-seg"${ah}>${ENTRY_MARQUEE_RIVER}</div>`
}

/** 하단: 동일 문단 2개 → track translateX(-50%) 로 오른쪽→왼쪽 무한 */
function entryMarqueeFlow(): string {
  return `<div class="ms-marquee">
  <div class="ms-marquee-track">
    ${entryMarqueeSeg(false)}
    ${entryMarqueeSeg(true)}
  </div>
</div>`
}

/** 첫 화면: 연출(어두운 캔버스) + MS Platform + 로그인, 하단 느린 흐름 문구 */
function layoutEntry(authMode: string): string {
  const emailLogin = `/app/login?next=${oauthNext(POST_LOGIN_LANDING)}`

  const entryStyles = `
  .ms12-entry-root{min-height:100dvh;overflow-x:hidden;position:relative;
    background:radial-gradient(120% 80% at 50% 20%,#0c1222 0%,#04060d 45%,#020308 100%);
    color:rgba(255,255,255,0.88);
    font-family:'Pretendard Variable',Pretendard,'Apple SD Gothic Neo','Malgun Gothic',ui-sans-serif,system-ui,sans-serif}
  .ms12-entry-wait#ms12-wait{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:20;
    color:rgba(226,232,240,0.75);font-size:0.9rem;letter-spacing:0.12em}
  .ms12-entry-aurora{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
  .ms12-entry-blob{position:absolute;border-radius:50%;filter:blur(72px);opacity:0.38;will-change:transform;
    animation:ms12Eblob 4.75s ease-in-out infinite}
  .ms12-entry-blob--a{width:min(55vmin,28rem);height:min(55vmin,28rem);left:-8%;top:6%;background:#312e81;
    animation-delay:-0.63s}
  .ms12-entry-blob--b{width:min(45vmin,22rem);height:min(45vmin,22rem);right:-6%;top:32%;background:#134e4a;opacity:0.32;
    animation-delay:-2.12s;animation-duration:5.25s}
  .ms12-entry-blob--c{width:min(50vmin,26rem);height:min(50vmin,26rem);left:18%;bottom:-5%;background:#4c1d95;opacity:0.28;
    animation-delay:-3.25s;animation-duration:6s}
  .ms12-entry-shard{position:absolute;inset:0;background:
    linear-gradient(125deg,transparent 40%,rgba(255,255,255,0.03) 48%,rgba(255,255,255,0.07) 50%,rgba(255,255,255,0.02) 52%,transparent 60%);
    mix-blend:overlay;animation:ms12Eshard 3s ease-in-out infinite;opacity:0.9}
  .ms12-entry-veil{position:absolute;inset:0;background:radial-gradient(ellipse 90% 60% at 50% 45%,transparent 0%,rgba(2,3,8,0.5) 100%)}
  @keyframes ms12Eblob{0%,100%{transform:translate(0,0) scale(1) rotate(0)}35%{transform:translate(3%,-2%) scale(1.06) rotate(2deg)}70%{transform:translate(-2%,3%) scale(0.95) rotate(-1.5deg)}}
  @keyframes ms12Eshard{0%,100%{transform:translateX(-4%) translateY(1%)}50%{transform:translateX(4%) translateY(-1%)}}
  .ms12-entry-center{position:relative;z-index:2;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;
    padding:2rem 1.25rem 9rem;box-sizing:border-box}
  .ms12-entry-title-wrap{text-align:center;animation:ms12Etitle 0.62s ease forwards;opacity:0}
  @keyframes ms12Etitle{to{opacity:1}}
  .ms12-entry-h1{line-height:1.02;margin:0;padding:0}
  .ms12-entry-title-line{display:inline-flex;align-items:baseline;justify-content:center;flex-wrap:wrap;column-gap:0.14em;row-gap:0.06em;
    font-family:'Pretendard Variable',Pretendard,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;
    font-variation-settings:'wght' 800;
    -webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;
    text-shadow:0 0 32px rgba(165,180,252,0.2),0 1px 0 rgba(15,23,42,0.4)}
  .ms12-entry-title__ms,.ms12-entry-title__plat{font-weight:800;font-style:normal;opacity:0.96;
    text-transform:none;color:rgba(240,244,255,0.96)}
  .ms12-entry-title__ms{font-size:clamp(1.9rem,5.2vw,3rem);letter-spacing:-0.04em;flex-shrink:0}
  .ms12-entry-title__plat{font-size:clamp(1.5rem,3.7vw,2.15rem);letter-spacing:-0.035em}
  .ms12-entry-hero-h1{margin:0 0 0.45rem 0;padding:0;font-size:clamp(1.12rem,3.8vw,1.4rem);font-weight:700;line-height:1.38;text-align:center;
    color:rgba(248,250,252,0.98);max-width:22rem;letter-spacing:-0.025em}
  .ms12-entry-kicker{margin:0 0 0.9rem 0;padding:0;font-size:0.7rem;letter-spacing:0.2em;opacity:0.38;text-align:center}
  .ms12-entry-startbtn{display:block;width:100%;text-align:center;box-sizing:border-box;padding:0.62rem 0.9rem;min-height:48px;
    border-radius:0.55rem;font-weight:700;font-size:0.94rem;border:none;cursor:pointer;
    background:linear-gradient(180deg,rgb(15,150,130) 0%,rgb(13,110,100) 100%);color:#fff;font-family:inherit;
    box-shadow:0 2px 10px rgba(0,0,0,0.22)}
  .ms12-entry-startbtn:hover{filter:brightness(1.06)}
  .ms12-entry-chips{display:flex;flex-wrap:wrap;gap:0.4rem;justify-content:center;margin:0.8rem 0 0 0}
  .ms12-entry-chip{min-height:38px;padding:0.3rem 0.7rem;font-size:0.78rem;font-weight:600;border-radius:0.5rem;
    border:1px solid rgba(148,163,184,0.38);background:rgba(15,23,42,0.55);color:rgba(226,232,240,0.95);font-family:inherit;cursor:pointer}
  .ms12-entry-chip:hover{background:rgba(30,41,59,0.75)}
  .ms12-entry-status{min-height:1.2rem;font-size:0.74rem;text-align:center;color:rgba(203,213,225,0.9);margin:0.5rem 0 0 0;letter-spacing:0.02em}
  .ms12-entry-card{margin-top:1.4rem;max-width:20rem;width:100%;padding:1.05rem 1.15rem;border-radius:1rem;
    background:rgba(15,23,42,0.45);border:1px solid rgba(148,163,184,0.2);backdrop-filter:blur(12px) saturate(1.2);
    -webkit-backdrop-filter:blur(12px) saturate(1.2);
    box-shadow:0 8px 32px rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.06);
    animation:ms12Ecard 0.225s ease 0.11s both}
  @keyframes ms12Ecard{from{opacity:0;transform:translateY(12px) scale(0.98)}to{opacity:1;transform:none}}
  .ms12-entry-card__p{margin:0 0 0.65rem 0;font-size:0.8rem;opacity:0.65;line-height:1.45;letter-spacing:0.02em}
  .ms12-entry-oauth-btns{display:flex;flex-direction:column;gap:0.65rem;width:100%;margin:0.4rem 0 0 0}
  .ms12-entry-kakao{display:block;width:100%;text-align:center;box-sizing:border-box;padding:0.6rem 0.9rem;min-height:48px;border-radius:0.55rem;font-weight:600;font-size:0.9rem;font-family:inherit;text-decoration:none;
    background:#FEE500!important;color:#191919!important;border:1px solid rgba(0,0,0,0.08);box-shadow:0 1px 2px rgba(0,0,0,0.1)}
  .ms12-entry-kakao:hover{filter:brightness(0.97)}
  .ms12-entry-googlebtn{box-sizing:border-box;width:100%;min-height:48px;padding:0.6rem 0.9rem;border-radius:0.55rem;font-weight:600;font-size:0.9rem;font-family:inherit;text-decoration:none;
    display:inline-flex;align-items:center;justify-content:center;gap:0.55rem;line-height:1.25;
    background-color:#fff!important;color:#202124!important;border:1px solid #dadce0;box-shadow:0 1px 2px rgba(0,0,0,0.06);
    -webkit-text-fill-color:#202124}
  .ms12-entry-googlebtn:hover{background-color:#f8f9fa!important}
  .ms12-entry-card a.ms12-entry-googlebtn{color:#202124!important;background-color:#fff!important;-webkit-text-fill-color:#202124}
  .ms12-entry-googlebtn .ms12-entry-oauth__label{color:#202124!important;-webkit-text-fill-color:#202124}
  .ms12-entry-oauth__ic{flex-shrink:0;display:block;width:20px;height:20px}
  .ms12-entry-or{margin:0.85rem 0 0.45rem 0;font-size:0.68rem;letter-spacing:0.15em;opacity:0.45;text-align:center}
  .ms12-entry-mail-sec{display:block;margin:0.15rem 0 0 0;padding:0.4rem 0.35rem;text-align:center;font-size:0.82rem;color:#a5b4fc;text-decoration:underline;opacity:0.95}
  .ms12-entry-mail-sec:hover{color:#c7d2fe}
  .ms12-entry-root .ms-marquee{position:fixed;left:0;right:0;bottom:calc(2rem + env(safe-area-inset-bottom, 0px));
    overflow:hidden;z-index:25;pointer-events:none;max-width:100%;width:100%;
    -webkit-transform:translateZ(0);transform:translateZ(0)}
  .ms12-entry-root .ms-marquee-track{
    display:flex;flex-direction:row;flex-wrap:nowrap;width:max-content;max-width:none;
    align-items:center;
    animation:ms12MarqueeFlow 8.25s linear 0s infinite;
    -webkit-animation:ms12MarqueeFlow 8.25s linear 0s infinite;
    animation-play-state:running;
    will-change:transform;backface-visibility:hidden;
    -webkit-backface-visibility:hidden}
  .ms12-entry-root .ms-marquee-seg{
    flex:0 0 auto;box-sizing:content-box;white-space:nowrap;flex-shrink:0;
    padding-right:clamp(2.5rem,7vw,5.5rem);
    font-size:clamp(14px,1.3vw,22px);
    color:rgba(255,255,255,0.62);letter-spacing:-0.02em;
    text-shadow:0 0 12px rgba(150,180,255,0.18)}
  @keyframes ms12MarqueeFlow{
    0%{-webkit-transform:translate3d(0,0,0);transform:translate3d(0,0,0)}
    100%{-webkit-transform:translate3d(-50%,0,0);transform:translate3d(-50%,0,0)}}
  @media (prefers-reduced-motion:reduce){
    .ms12-entry-blob,.ms12-entry-shard,.ms12-entry-title-wrap,.ms12-entry-card{animation:none!important;opacity:1!important;transform:none!important}
    .ms12-entry-root .ms-marquee-track{animation-duration:14.5s!important;-webkit-animation-duration:14.5s!important}
  }
  .ms12-entry-card .ms12-js-logout-line{margin:0.5rem 0 0 0}
  .ms12-entry-card .ms12-btn--muted{background:rgba(51,65,85,0.6);color:#e2e8f0}
  .ms12-entry-breadcrumb{margin-top:1.25rem;font-size:0.7rem;opacity:0.35;letter-spacing:0.1em}
  .ms12-entry-breadcrumb a{color:rgba(199,210,254,0.6);text-decoration:none}
  .ms12-entry-breadcrumb a:hover{color:rgba(199,210,254,0.9)}
  `

  return `<!DOCTYPE html>
<!-- m:${MS12_BUILD} -->
<html lang="ko">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>MS Platform</title>
  <link rel="canonical" href="${SITE_PUBLIC_ORIGIN}/app"/>
  <link rel="stylesheet" href="/static/css/app.css" />
  <link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" />
  <script src="${MS12_ACTIONS_SCRIPT}" defer></script>
  <script src="${MS12_APP_SCRIPT}" defer></script>
  <style>
    ${entryStyles}
  </style>
</head>
<body class="ms12-entry-root" data-ms12-route="entry" data-ms12-auth="${authMode}">
  <div class="ms12-entry-aurora" aria-hidden="true">
    <div class="ms12-entry-blob ms12-entry-blob--a"></div>
    <div class="ms12-entry-blob ms12-entry-blob--b"></div>
    <div class="ms12-entry-blob ms12-entry-blob--c"></div>
    <div class="ms12-entry-shard"></div>
    <div class="ms12-entry-veil"></div>
  </div>
  <p class="ms12-entry-wait" id="ms12-wait" style="color:rgba(203,213,225,0.8);display:none">불러오는 중…</p>
  <div id="ms12-guest" style="display:none">${guestNoJs('MS Platform')}</div>
  <div id="ms12-authed" style="display:block">
    <div class="ms12-entry-center">
      <div class="ms12-entry-title-wrap">
        <h1 class="ms12-entry-hero-h1" id="ms12-entry-hero">회의를 시작하고 바로 기록하세요</h1>
        <p class="ms12-entry-kicker" lang="en">MS Platform</p>
      </div>
      <div class="ms12-entry-card" id="ms12-entry-login">
        <button type="button" class="ms12-entry-startbtn" data-ms12-entry-qs="start" aria-label="새 회의로 시작">회의 시작</button>
        <p id="ms12-entry-status" class="ms12-entry-status" role="status" aria-live="polite"></p>
        <div class="ms12-entry-oauth-btns">
          <a class="ms12-entry-kakao" href="${kakao(POST_LOGIN_LANDING)}" data-ms12-login-lnk${OAUTH_A_ATTRS}>카카오로 계속하기</a>
          <a class="ms12-entry-googlebtn" href="${google(POST_LOGIN_LANDING)}" data-ms12-login-lnk${OAUTH_A_ATTRS}><svg class="ms12-entry-oauth__ic" width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.8 7.18l7.73 6c4.51-4.18 7.11-10.32 7.11-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg><span class="ms12-entry-oauth__label">Google로 계속하기</span></a>
        </div>
        <p class="ms12-entry-or" data-ms12-login-lnk>또는</p>
        <a class="ms12-entry-mail-sec" href="${emailLogin}" data-ms12-login-lnk>이메일·비밀번호로 로그인</a>
        <p class="ms12-entry-card__p ms12-js-login-only-copy" data-ms12-login-lnk style="margin-top:0.85rem">로그인하면 서버에 저장·초대 링크·다른 기기에서 이어쓰기가 됩니다.</p>
        <div class="ms12-entry-chips" aria-label="빠른 시작">
          <button type="button" class="ms12-entry-chip" data-ms12-entry-qs="quick" data-ms12-type="team" data-ms12-title="팀 회의">팀</button>
          <button type="button" class="ms12-entry-chip" data-ms12-entry-qs="quick" data-ms12-type="class" data-ms12-title="수업 회의">수업</button>
          <button type="button" class="ms12-entry-chip" data-ms12-entry-qs="quick" data-ms12-type="counseling" data-ms12-title="상담 기록">상담</button>
          <button type="button" class="ms12-entry-chip" data-ms12-entry-qs="quick" data-ms12-type="planning" data-ms12-title="기획 회의">기획</button>
        </div>
        <p class="ms12-entry-policy-line js-ms12-policy" style="margin:0.7rem 0 0 0;font-size:0.7rem;line-height:1.45;color:rgba(186,198,220,0.88);text-align:center" aria-label="플랜 안내"></p>
        <p class="ms12-js-logout-line" style="margin-top:0.9rem;text-align:center">
          <button type="button" class="ms12-btn ms12-btn--muted" style="font-size:0.78rem;padding:0.28rem 0.6rem" data-ms12-logout>로그아웃</button>
        </p>
      </div>
      <p class="ms12-entry-breadcrumb"><a href="/app/meeting">로그인 후 회의</a> · <a href="/app/hub">전체 메뉴</a></p>
    </div>
  </div>
  ${entryMarqueeFlow()}
</body>
</html>`
}

type Ms12Context = Context<{ Bindings: Bindings }>

/** 첫 화면 HTML. 루트 `/app`·`/app/` 는 `index` 에서 직접 `get` 으로 연결(서브 `route`만으로는 루트가 안 잡힌 Pages·엣지 케이스 대비) */
function renderEntryPage(c: Ms12Context) {
  return c.html(layoutEntry(getAuthMode(c)))
}

const HUB_INNER = `<div class="ms12-header-row">
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
       ${loginAside('/app/hub', kakao, google)}`

const DESK_INNER = `<div class="ms12-desk">
  <div class="ms12-dsk-grid">
    <nav class="ms12-dsk-nav" aria-label="주 메뉴">
      <a class="ms12-dsk-nav--on" href="/app/desk">홈</a>
      <a href="/app/meeting">회의</a>
      <a href="/app/library">문서</a>
      <a href="/app/records">기록</a>
      <a href="/app/announcements">공고</a>
      <a href="/app/hub">더보기</a>
    </nav>
    <main class="ms12-dsk-main">
      <header class="ms12-dsk-hero">
        <p class="ms12-dsk-brand">MS Platform</p>
        <p id="ms12-dsk-time" class="ms12-dsk-time">—:—</p>
        <p id="ms12-dsk-date" class="ms12-dsk-date">—</p>
        <p class="ms12-dsk-hi"><span class="js-ms12-user-name" style="font-weight:700">—</span><span class="js-ms12-user-suffix">님</span>, 환영합니다.</p>
      </header>
      <div class="ms12-dsk-tiles">
        <a class="ms12-dsk-tile ms12-dsk-tile--pri" href="/app/meeting/new"><span>새 회의</span><small>코드 자동 발급</small></a>
        <a class="ms12-dsk-tile" href="/app/join"><span>참여</span><small>초대 코드</small></a>
        <a class="ms12-dsk-tile" href="/app/records"><span>기록</span><small>요약·목록</small></a>
        <a class="ms12-dsk-tile" href="/app/library"><span>문서</span><small>창고·검색</small></a>
        <a class="ms12-dsk-tile" href="/app/archive"><span>보관</span><small>스냅샷</small></a>
        <a class="ms12-dsk-tile" href="/app/announcements"><span>공고</span><small>공모·지원</small></a>
      </div>
      <section class="ms12-dsk-today" aria-labelledby="ms12-dsk-recent-h">
        <h2 id="ms12-dsk-recent-h">최근 회의</h2>
        <div id="ms12-home-recent" class="ms12-dsk-today__body ms12-muted">불러오는 중…</div>
        <a class="ms12-dsk-link" href="/app/meeting">회의·허브로 →</a>
      </section>
    </main>
    <aside class="ms12-dsk-aside" aria-label="빠른 안내">
      <h3>바로가기</h3>
      <a class="ms12-dsk-chip" href="/app/meeting/new">새 회의로 안건 논의</a>
      <a class="ms12-dsk-chip" href="/app/library">문서 창고 검색·결합</a>
      <a class="ms12-dsk-chip" href="/app/records">기록·실행 항목</a>
      <h3>문서 찾기</h3>
      <form class="ms12-toolbar" action="/app/library" method="get" style="margin:0.35rem 0 0.75rem;flex-wrap:wrap;align-items:center;gap:0.4rem">
        <input class="ms12-input" name="q" type="search" placeholder="창고 검색" autocomplete="off" style="min-width:7rem;flex:1" />
        <button type="submit" class="ms12-btn" style="margin:0">검색</button>
      </form>
      <p class="ms12-dsk-note">MS12는 팀·기관의 회의·기록·문서를 한 흐름으로 이어 주는 내부용 도구입니다. 자동·AI 요약은 참고용이며, 공유·제출 전에 반드시 확인하세요.</p>
    </aside>
  </div>
  <div class="ms12-dsk-ticker" aria-hidden="true">
    <div class="ms12-dsk-ticker__in">MS Platform — 회의 · 기록 · 문서  ·  MS Platform — 회의 · 기록 · 문서  ·  MS Platform — 회의 · 기록 · 문서  ·  MS Platform — 회의 · 기록 · 문서  ·  MS Platform — 회의 · 기록 · 문서  ·  MS Platform — 회의 · 기록 · 문서  ·  </div>
  </div>
  ${loginAside('/app/meeting', kakao, google)}
</div>`

/** 예전 대시보드(카드·요약) — /app /app/hub */
p.get('/hub', (c) =>
  c.html(
    layout(
      'MS12 — 대시보드',
      'hub',
      '',
      guestNoJs('MS12'),
      HUB_INNER,
      getAuthMode(c),
      '/app/hub',
    ),
  ),
)

p.get('/home', (c) => c.redirect('/app/hub', 302))

/** 로그인 직후 첫 화면 — 사이드 내비·시계·빠른 작업(오피스 홈 유형, MS12 전용) */
p.get('/desk', (c) =>
  c.html(
    layout(
      'MS12 — 홈',
      'desk',
      '',
      guestNoJs('홈'),
      DESK_INNER,
      getAuthMode(c),
    ),
  ),
)

p.get('/meeting/new', (c) =>
  c.html(
    layout(
      '새 회의 — MS12',
      'meeting_new',
      '',
      guestNoJs('새 회의'),
      `${MS12_HOME_LINK}
       <h1 class="ms12-h1">새 회의</h1>
       <p class="ms12-p">제목을 입력하면 회의 코드가 자동으로 만들어지고, <span class="js-ms12-user-name" style="font-weight:600">—</span> 님은 호스트로 입장됩니다.</p>
       <form id="ms12-form-new" style="margin-top:1rem">
         <p class="ms12-p" style="font-size:0.88rem;color:rgb(100 116 139);margin:0 0 0.75rem 0">여기서 제목을 입력한 뒤「회의 열기」로 회의방이 만들어집니다.</p>
         <label class="ms12-p" style="display:block;font-weight:500">회의 제목</label>
         <input class="ms12-input" name="title" type="text" required maxlength="200" placeholder="예: 4월 운영 모임" />
         <label class="ms12-p" style="display:block;margin-top:0.75rem;font-weight:500">호스트로 표시할 이름(선택·게스트)</label>
         <input class="ms12-input" id="ms12-input-new-displayname" name="displayName" type="text" maxlength="40" placeholder="없으면 '게스트'" autocomplete="name" />
         <p style="margin-top:1rem"><button type="submit" class="ms12-btn ms12-btn--teal">회의 열기</button></p>
       </form>
       ${loginAside('/app/meeting/new', kakao, google)}`,
      getAuthMode(c),
      '/app/meeting/new',
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
      `${MS12_HOME_LINK}
       <h1 class="ms12-h1">회의 입장</h1>
       <p class="ms12-p">초대받은 <strong>회의 코드</strong>를 넣으면, <span class="js-ms12-user-name" style="font-weight:600">—</span> 님 이름으로 참석자 목록에 올라갑니다.</p>
       <form id="ms12-form-join" style="margin-top:1rem">
         <label class="ms12-p" style="display:block;font-weight:500">회의 코드</label>
         <input class="ms12-input" name="code" type="text" required autocomplete="off" placeholder="8자리 코드" />
         <label class="ms12-p" style="display:block;margin-top:0.75rem;font-weight:500">목록에 쓸 이름(선택)</label>
         <input class="ms12-input" id="ms12-input-join-displayname" name="displayName" type="text" maxlength="40" placeholder="없으면 '게스트'" autocomplete="name" />
         <p style="margin-top:1rem"><button type="submit" class="ms12-btn">입장</button></p>
       </form>
       <p id="ms12-join-err" class="ms12-p" style="color:rgb(185 28 28);display:none"></p>
       ${loginAside('/app/join', kakao, google)}`,
      getAuthMode(c),
      '/app/join',
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
      `${MS12_HOME_LINK}
       <h1 class="ms12-h1">회의 기록</h1>
       <p class="ms12-p">참여한 회의·저장·요약(연동 예정)을 한곳에 모읍니다. 아래는 참여·개설한 모임 기준입니다.</p>
       <div id="ms12-records-list" class="ms12-p" style="margin-top:1rem">불러오는 중…</div>
       ${loginAside('/app/records', kakao, google)}`,
      getAuthMode(c),
      '/app/records',
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
      `${MS12_HOME_LINK}
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
      '/app/archive',
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
      `/app/meeting-record/${id}`,
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
      `${MS12_HOME_LINK}
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
      `<div class="ms12-mh">
       <header class="ms12-mh-top">
         <div>${MS12_HOME_LINK}</div>
         <div class="ms12-mh-user">
           <p class="ms12-mh-user-line" style="margin:0">표시 이름: <span class="js-ms12-user-name" style="font-weight:700">—</span><span class="js-ms12-user-suffix" style="font-weight:400"></span></p>
         </div>
       </header>
       <section class="ms12-mh-hero" aria-labelledby="ms12-mh-title">
         <h1 id="ms12-mh-title" class="ms12-mh-title">오늘 회의를 시작하세요</h1>
         <p class="ms12-mh-sub">기록하면 실행·문서로 이어집니다. 로그인 후 개설 시 서버 저장·초대가 됩니다.</p>
         <button type="button" class="ms12-mh-cta" data-ms12-action="meeting-start">회의 시작</button>
         <p class="ms12-mh-cta-hint">로그인 전에는 안내에 따라 로그인한 뒤 같은 흐름으로 개설됩니다.</p>
         <p class="ms12-mh-policy js-ms12-policy" style="margin:0.4rem auto 0;max-width:22rem;font-size:0.78rem;line-height:1.45;color:rgb(100 116 139);text-align:center" aria-label="플랜 안내"></p>
         <p id="ms12-mh-status" class="ms12-mh-status" role="status" aria-live="polite"></p>
         <div class="ms12-mh-quick" aria-label="빠른 시작">
           <p class="ms12-mh-quick-label">빠른 시작</p>
           <div class="ms12-mh-chips">
             <button type="button" class="ms12-mh-chip" data-ms12-action="meeting-start-quick" data-ms12-type="team" data-ms12-title="팀 회의">팀</button>
             <button type="button" class="ms12-mh-chip" data-ms12-action="meeting-start-quick" data-ms12-type="class" data-ms12-title="수업 회의">수업</button>
             <button type="button" class="ms12-mh-chip" data-ms12-action="meeting-start-quick" data-ms12-type="counseling" data-ms12-title="상담 기록">상담</button>
             <button type="button" class="ms12-mh-chip" data-ms12-action="meeting-start-quick" data-ms12-type="planning" data-ms12-title="기획 회의">기획</button>
           </div>
         </div>
       </section>
       <nav class="ms12-mh-secondary" aria-label="보조 메뉴">
         <button type="button" class="ms12-mh-sec" data-ms12-action="meeting-join">회의 참여</button>
         <button type="button" class="ms12-mh-sec" data-ms12-action="records-open">기록 보기</button>
         <button type="button" class="ms12-mh-sec" data-ms12-action="app-archive">회의 보관함</button>
         <button type="button" class="ms12-mh-sec" data-ms12-action="app-library">문서 보관함</button>
       </nav>
       <div class="ms12-mh-card" role="status" aria-live="polite">
         <p style="margin:0;font-size:0.95rem">아직 진행 중인 회의가 없습니다.</p>
         <p>새 회의를 시작하거나, 코드로 회의에 참여하세요.</p>
         <button type="button" class="ms12-mh-card-btn" data-ms12-action="meeting-start">새 회의 시작</button>
       </div>
       <section class="ms12-mh-recent-grid" aria-label="최근 항목">
         <div class="ms12-mh-panel">
           <h3>최근 회의</h3>
           <div id="ms12-home-recent" class="ms12-muted" style="font-size:0.88rem;min-height:2.5rem">불러오는 중…</div>
         </div>
         <div class="ms12-mh-panel">
           <h3>최근 문서</h3>
           <div id="ms12-dash-docs" class="ms12-muted" style="font-size:0.88rem;min-height:2.5rem">불러오는 중…</div>
         </div>
         <div class="ms12-mh-panel">
           <h3>미완료 실행 항목</h3>
           <div id="ms12-dash-actions" class="ms12-muted" style="font-size:0.88rem;min-height:2.5rem">불러오는 중…</div>
         </div>
       </section>
       <div class="ms12-mh-foot">
         <p class="js-ms12-mh-guest-line" style="display:none">로그인 없이 참여·이 기기 메모는 가능하고, <strong>회의 개설</strong>·서버 기록·보관함은 로그인 후 이용할 수 있습니다.</p>
         <p class="js-ms12-mh-auth-line" style="display:none">기록·보관이 계정에 연결됩니다.</p>
         <p class="ms12-mh-oauth js-ms12-mh-guest-line" style="display:none;margin-top:0.5rem">
           <a href="${kakao('/app/meeting')}" data-ms12-login-lnk${OAUTH_A_ATTRS}>카카오</a> · <a href="${google('/app/meeting')}" data-ms12-login-lnk${OAUTH_A_ATTRS}>Google</a>
         </p>
       </div>
       ${loginAside('/app/meeting', kakao, google)}
       </div>`,
      getAuthMode(c),
      '/app/meeting',
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
      `${MS12_HOME_LINK}
       <h1 class="ms12-h1">회의 <span class="ms12-room-title js-ms12-room-title">—</span></h1>
       <p class="ms12-p">코드: <code class="js-ms12-room-code">—</code> · <span class="js-ms12-user-name" style="font-weight:600">—</span> 님</p>
       <p class="ms12-p ms12-muted" style="font-size:0.82rem;display:none" id="ms12-room-login-hint">서버에 기록을 저장·보관하려면 로그인이 필요합니다.</p>
       <div id="ms12-room-invite" class="ms12-panel" style="display:none;margin:0.5rem 0;max-width:40rem;padding:0.75rem 1rem;border:1px solid rgb(199 210 254);background:rgb(238 242 255);font-size:0.88rem" role="region" aria-label="초대">
         <p class="ms12-p" style="font-weight:600;margin:0 0 0.35rem 0">회의가 시작되었습니다. 팀원을 초대하세요.</p>
         <p class="ms12-muted" style="font-size:0.8rem;margin:0 0 0.5rem 0">초대 링크(코드: <code class="js-ms12-invite-code">—</code>)</p>
         <p style="word-break:break-all;font-size:0.82rem;margin:0.25rem 0 0.6rem" id="ms12-invite-url-line"><a class="text-indigo-600" id="ms12-invite-url" href="#" rel="nofollow">—</a></p>
         <div style="display:flex;flex-wrap:wrap;gap:0.45rem;align-items:center">
           <button type="button" class="ms12-btn" id="ms12-invite-copy" style="font-size:0.84rem">링크 복사</button>
           <a class="ms12-btn ms12-btn--muted" id="ms12-invite-kakao" href="#" rel="noopener noreferrer" target="_blank" style="font-size:0.84rem;text-decoration:none;box-sizing:border-box">카카오로 공유</a>
           <a class="ms12-btn ms12-btn--muted" id="ms12-invite-sms" href="#" style="font-size:0.84rem;text-decoration:none;box-sizing:border-box">문자로 보내기</a>
         </div>
       </div>
       <div id="ms12-room-free-notice" class="ms12-panel" style="display:none;margin:0.5rem 0;max-width:40rem;padding:0.5rem 0.75rem;border:1px solid rgb(251 191 36);background:rgb(255 251 235);font-size:0.86rem;line-height:1.45" role="status"></div>
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
                 <textarea id="ms12-ai-sug-basic" class="ms12-input" rows="2" style="width:100%;min-height:2.4rem;max-width:100%;font-size:0.86rem;white-space:pre-wrap;resize:vertical" placeholder="AI 기본 제안(직접 수정)"></textarea>
                 <p class="ms12-muted" style="font-size:0.75rem;margin:0.5rem 0 0.3rem 0">AI·실행 (직접 수정 가능)</p>
                 <textarea id="ms12-ai-sug-action" class="ms12-input" rows="2" style="width:100%;min-height:2.4rem;max-width:100%;font-size:0.86rem;white-space:pre-wrap;resize:vertical" placeholder="AI 실행 제안(직접 수정)"></textarea>
                 <p class="ms12-muted" style="font-size:0.75rem;margin:0.5rem 0 0.3rem 0">AI·보고 (직접 수정 가능)</p>
                 <textarea id="ms12-ai-sug-report" class="ms12-input" rows="2" style="width:100%;min-height:2.4rem;max-width:100%;font-size:0.86rem;white-space:pre-wrap;resize:vertical" placeholder="AI 보고 제안(직접 수정)"></textarea>
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
      `/app/meeting/${id}`,
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
      `${MS12_HOME_LINK}
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
      '/app/announcements',
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
      `/app/announcements/${aid}`,
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
      `${MS12_HOME_LINK}
       <h1 class="ms12-h1">로그인</h1>
       <p class="ms12-p">계정을 연결하면 기기를 바꿔도 이어 쓰기·동기화에 유리합니다. 로그인 없이도 회의·로컬 저장은 가능합니다.</p>
       <p id="ms12-login-next-hint" class="ms12-muted" style="font-size:0.86rem;margin:0.35rem 0 0;display:none"></p>
       <div class="ms12-panel" id="ms12-login-known" style="display:none;margin-top:0.75rem">
         <p class="ms12-p" style="font-weight:600;margin:0 0 0.35rem 0">이미 로그인된 상태입니다</p>
         <p class="ms12-muted" style="font-size:0.9rem;margin:0 0 0.5rem 0">회의장으로 가거나, 첫 화면·새 회의로 이동할 수 있습니다. (이 페이지에선 자동 이동하지 않습니다.)</p>
         <a class="ms12-btn" href="/app/meeting">회의 허브</a>
         <a class="ms12-btn ms12-btn--teal" href="/app/meeting/new" style="margin-left:0.5rem">새 회의</a>
         <a class="ms12-btn ms12-btn--muted" href="/app" style="margin-left:0.5rem">시작(연출)</a>
         <a class="ms12-btn ms12-btn--muted" href="/app/hub" style="margin-left:0.5rem">대시보드</a>
       </div>
       <div id="ms12-login-pending" style="margin-top:0.75rem">
         <p class="ms12-p" style="font-weight:600;margin:0 0 0.35rem 0">카카오·Google</p>
         <p class="ms12-muted" style="font-size:0.86rem;margin:0 0 0.5rem 0">가장 빠르게 입장·연결합니다.</p>
         <p style="margin-top:0.5rem;max-width:22rem">
           <a class="ms12-btn ms12-btn--kakao" href="${kakao('/app/login')}" data-ms12-login-lnk${OAUTH_A_ATTRS} style="display:block;width:100%;text-align:center;box-sizing:border-box">카카오로 계속하기</a>
         </p>
         <p style="margin-top:0.65rem;max-width:22rem">
           <a class="ms12-btn ms12-btn--google" href="${google('/app/login')}" data-ms12-login-lnk${OAUTH_A_ATTRS}><svg class="ms12-login-oauth__ic" width="22" height="22" viewBox="0 0 48 48" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.8 7.18l7.73 6c4.51-4.18 7.11-10.32 7.11-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg><span class="ms12-login-oauth__label">Google로 계속하기</span></a>
         </p>
         <p class="ms12-muted" style="text-align:center;margin:1rem 0 0.6rem 0;font-size:0.8rem;letter-spacing:0.12em;opacity:0.75">또는</p>
         <p class="ms12-p" style="font-weight:600;margin:0 0 0.35rem 0">이메일 로그인 <span class="ms12-muted" style="font-size:0.8rem;font-weight:400">(이 사이트에 가입한 계정)</span></p>
         <p class="ms12-muted" style="font-size:0.86rem;margin:0 0 0.4rem 0">이메일·비밀번호는 회원가입 후에만 사용됩니다.</p>
         <form id="ms12-login-email-form" class="ms12-panel" style="max-width:22rem;padding:0.75rem;margin:0" autocomplete="on">
           <label class="ms12-muted" style="font-size:0.8rem;display:block" for="ms12-login-email">이메일</label>
           <input class="ms12-input" id="ms12-login-email" name="email" type="email" inputmode="email" autocomplete="username" required style="width:100%;max-width:100%;margin:0.2rem 0 0.5rem" />
           <label class="ms12-muted" style="font-size:0.8rem;display:block" for="ms12-login-password">비밀번호</label>
           <input class="ms12-input" id="ms12-login-password" name="password" type="password" autocomplete="current-password" required style="width:100%;max-width:100%;margin:0.2rem 0 0.5rem" />
           <button type="submit" class="ms12-btn ms12-btn--teal" id="ms12-login-email-submit" style="margin:0.35rem 0 0 0">이메일로 로그인</button>
           <p id="ms12-login-email-msg" class="ms12-p" style="font-size:0.86rem;margin:0.5rem 0 0;min-height:1.1rem" aria-live="polite"></p>
         </form>
         <p class="ms12-muted" style="font-size:0.82rem;margin:0.6rem 0 0.25rem 0">이메일 계정이 없다면 <a href="/register" class="text-indigo-600" style="text-decoration:underline">회원가입</a> 후 위에서 로그인하세요.</p>
       </div>
       ${loginAside('/app/login', kakao, google)}`,
      mode,
      '/app/login',
    ),
  )
})

export { renderEntryPage }
export default p
