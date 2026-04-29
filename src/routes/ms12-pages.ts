/** MS12 /app* — 공개 모드 (계정 없음) */
import { Hono, type Context } from 'hono'
import { Bindings } from '../types/database'
import { getAuthMode } from '../utils/auth-mode'
import { SITE_PUBLIC_ORIGIN } from '../utils/oauth-public'

/** `/app` vs `/app/`·`/app/hub/` 등 끝 슬래시로 404 나지 않게 */
const p = new Hono<{ Bindings: Bindings }>({ strict: false })

/** Pages 배포·소스 ?v= 일치(배포 후 페이지 소스에 이 주석이 보이면 새 Worker) */
const MS12_BUILD = '20260429roomPasteMaterialsAiV1'
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
  body[data-ms12-route=room] .ms12-wrap{padding-bottom:max(10rem,calc(8rem + env(safe-area-inset-bottom)))}
  .ms12-live-caption-wrap{position:fixed;left:0;right:0;bottom:0;z-index:9999;padding:0 max(0.65rem, env(safe-area-inset-left)) max(0.55rem, env(safe-area-inset-bottom)) max(0.65rem, env(safe-area-inset-right));pointer-events:none}
  .ms12-live-caption-inner{pointer-events:auto;max-width:min(1120px,100%);margin:0 auto;padding:0.55rem 0.75rem 0.65rem;border-radius:0.65rem 0.65rem 0 0;background:rgba(15,23,42,0.9);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 -8px 32px rgba(0,0,0,0.18);border:1px solid rgba(255,255,255,0.08);border-bottom:0}
  .ms12-live-caption-label{margin:0 0 0.3rem 0;font-size:0.68rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.5)}
  .ms12-live-caption-text{margin:0;font-size:clamp(0.95rem,2.6vw,1.18rem);line-height:1.48;color:rgba(248,250,252,0.98);white-space:pre-wrap;word-break:break-word;max-height:6.8rem;overflow-y:auto;-webkit-overflow-scrolling:touch}
  .ms12-live-caption-text--idle{font-size:0.82rem;line-height:1.45;color:rgba(226,232,240,0.72)!important;font-weight:400}
  .ms12-room-transcript-shell:focus{outline:2px solid rgb(165 180 252);outline-offset:2px;border-radius:0.55rem}
  .ms12-room-transcript-scroll{max-height:min(52vh,28rem);overflow-y:auto;-webkit-overflow-scrolling:touch;padding:0.45rem 0.5rem 0.55rem}
  .ms12-tr-seg{display:flex;gap:0.55rem;align-items:flex-start;padding:0.42rem 0.4rem;margin-bottom:0.25rem;border-radius:0.5rem;background:transparent}
  .ms12-tr-seg--live{background:rgb(241 245 249)!important;box-shadow:inset 0 0 0 1px rgb(203 213 225)}
  .ms12-tr-avatar{flex-shrink:0;width:2.1rem;height:2.1rem;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:800}
  .ms12-tr-body{flex:1;min-width:0}
  .ms12-tr-meta{font-size:0.82rem;margin-bottom:0.18rem;color:rgb(51 65 85)}
  .ms12-tr-meta strong{font-weight:700}
  .ms12-tr-time{font-size:0.76rem;color:rgb(148 163 184);margin-left:0.35rem;font-variant-numeric:tabular-nums}
  .ms12-tr-text{font-size:0.92rem;line-height:1.52;color:rgb(30 41 59);white-space:pre-wrap;word-break:break-word}
  .ms12-tr-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
  .ms12-panel{padding:0.9rem 1rem;border:1px solid rgb(226 232 240);border-radius:0.75rem;background:#fff;}
  .ms12-notes{min-height:12rem;width:100%;padding:0.6rem 0.75rem;border:1px solid rgb(203 213 225);border-radius:0.5rem;font-size:0.95rem;resize:vertical;}
  .ms12-part-list{list-style:none;padding:0;margin:0.5rem 0 0 0;}
  .ms12-part-list li{padding:0.35rem 0;border-bottom:1px solid rgb(241 245 249);font-size:0.9rem;}
  .ms12-ai-out{min-height:4.5rem;font-size:0.88rem;white-space:pre-wrap;color:rgb(55 65 81);line-height:1.45;}
  .ms12-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:0.82rem;}
  .ms12-action-row{display:flex;flex-wrap:wrap;align-items:center;gap:0.4rem 0.6rem;padding:0.4rem 0;border-bottom:1px solid rgb(241 245 249);font-size:0.88rem;}
  .ms12-cat-picker summary{list-style:none}
  .ms12-cat-picker summary::-webkit-details-marker{display:none}
  .ms12-cat-chip{display:inline-block;padding:0.28rem 0.55rem;border-radius:0.45rem;border:1px solid rgb(226 232 240);background:rgb(255 255 255);color:rgb(51 65 85);font-size:0.8rem;cursor:pointer;font-family:inherit}
  .ms12-cat-chip:hover{border-color:rgb(165 180 252);background:rgb(238 242 255)}
  .ms12-cat-chip--on{border-color:rgb(79 70 229);background:rgb(238 242 255);color:rgb(49 46 129);font-weight:600}
  .ms12-tab-bar{display:flex;flex-wrap:wrap;gap:0.35rem;margin:0 0 0.25rem 0;align-items:center}
  .ms12-tab{display:inline-block;padding:0.38rem 0.7rem;border-radius:9999px;border:1px solid rgb(203 213 225);background:rgb(248 250 252);color:rgb(51 65 85);font-size:0.86rem;cursor:pointer;font-weight:500}
  .ms12-tab:hover{border-color:rgb(165 180 252);background:rgb(238 242 255)}
  .ms12-tab--active{background:rgb(79 70 229);color:#fff;border-color:rgb(79 70 229)}
  .ms12-tab--active:hover{background:rgb(67 56 202);color:#fff;border-color:rgb(67 56 202)}
  .ms12-subtab-bar{display:flex;flex-wrap:wrap;gap:0.3rem;margin:0.35rem 0 0.5rem 0;align-items:center}
  .ms12-subtab{display:inline-block;padding:0.28rem 0.55rem;border-radius:0.4rem;border:1px solid rgb(226 232 240);background:rgb(255 255 255);color:rgb(71 85 105);font-size:0.78rem;cursor:pointer}
  .ms12-subtab--active{border-color:rgb(129 140 248);background:rgb(238 242 255);color:rgb(49 46 129);font-weight:600}
  .ms12-toolbar{display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.75rem;}
  body[data-ms12-route=record] .ms12-wrap{max-width:min(1040px,100%)}
  .ms12-rec-back{font-size:0.88rem;text-decoration:none;color:rgb(79 70 229)}
  .ms12-rec-back:hover{text-decoration:underline}
  .ms12-rec-tagline{margin:0 0 0.5rem 0;font-size:0.92rem;color:rgb(71 85 105)}
  .ms12-rec-meta{font-size:0.82rem;color:rgb(100 116 139);margin:0 0 0.35rem 0;line-height:1.45}
  .ms12-rec-save-msg{font-size:0.82rem;color:rgb(71 85 105);min-height:1.2rem;margin-top:0.35rem}
  .ms12-rec-grid{display:grid;gap:0.75rem}
  @media(min-width:900px){.ms12-rec-grid{grid-template-columns:1fr 1fr}}
  .ms12-rec-span2{grid-column:1/-1}
  .ms12-rec-panel-title{margin:0 0 0.35rem 0;font-size:1.02rem;font-weight:700;color:rgb(30 41 59)}
  .ms12-rec-lead{margin:0 0 0.65rem 0;font-size:0.84rem;line-height:1.45;color:rgb(71 85 105)}
  .ms12-rec-actions{display:flex;flex-wrap:wrap;gap:0.45rem;margin-top:0.5rem}
  @media(max-width:639px){.ms12-rec-actions .ms12-btn{flex:1 1 100%;justify-content:center}}
  .ms12-rec-ai-hint{font-size:0.82rem;color:rgb(100 116 139);margin:0 0 0.5rem 0;padding:0.45rem 0.55rem;background:rgb(248 250 252);border-radius:0.45rem;border:1px dashed rgb(226 232 240)}
  .ms12-rec-action-table{width:100%;border-collapse:collapse;font-size:0.82rem}
  .ms12-rec-action-table th,.ms12-rec-action-table td{border:1px solid rgb(226 232 240);padding:0.35rem 0.45rem;vertical-align:top}
  .ms12-rec-action-table th{background:rgb(248 250 252);font-weight:600;text-align:left;font-size:0.76rem;color:rgb(71 85 105)}
  .ms12-rec-action-table input,.ms12-rec-action-table select{width:100%;box-sizing:border-box;font-size:0.82rem;padding:0.25rem;border-radius:0.35rem;border:1px solid rgb(203 213 225)}
  .ms12-rec-rblk{margin-bottom:0.55rem}
  .ms12-rec-rblk label{font-size:0.78rem;color:rgb(100 116 139);display:block;margin-bottom:0.2rem}
  .ms12-details-as-btn > summary{display:inline-flex;align-items:center;justify-content:flex-start;gap:0.35rem;width:100%;box-sizing:border-box;list-style:none;padding:0.5rem 0.85rem;border-radius:0.55rem;border:1px solid rgb(203 213 225);background:linear-gradient(180deg,rgb(255 255 255) 0%,rgb(248 250 252) 100%);color:rgb(51 65 85);font-size:0.88rem;font-weight:600;cursor:pointer;user-select:none;text-align:left}
  .ms12-details-as-btn > summary::-webkit-details-marker{display:none}
  .ms12-details-as-btn[open] > summary{border-color:rgb(165 180 252);background:rgb(238 242 255);color:rgb(49 46 129)}
  .ms12-details-as-btn > summary:hover{border-color:rgb(165 180 252)}
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
  _nextPath: string,
  _k: (n: string) => string,
  _g: (n: string) => string,
  _openByDefault = true,
): string {
  return ''
}

/** 레거시 템플릿 인자 호환 — OAuth 비활성화 */
function kakao(_next: string): string {
  return ''
}
function google(_next: string): string {
  return ''
}

type Ms12Route =
  | 'entry'
  | 'hub'
  | 'desk'
  | 'meeting_hub'
  | 'meeting_new'
  | 'join'
  | 'records'
  | 'room'
  | 'library'
  | 'archive'
  | 'record'
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

/** 첫 화면: 연출 + 회의 시작 */
function layoutEntry(authMode: string): string {
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
  .ms12-entry-stack{display:flex;flex-direction:column;gap:0.65rem;width:100%;max-width:22rem;margin:0 auto}
  a.ms12-entry-primary{display:flex;align-items:center;justify-content:center;width:100%;min-height:48px;padding:0.62rem 0.9rem;border-radius:0.55rem;font-weight:700;font-size:0.94rem;text-decoration:none;background:linear-gradient(180deg,rgb(15,150,130) 0%,rgb(13,110,100) 100%);color:#fff!important;border:none;font-family:inherit;box-shadow:0 2px 10px rgba(0,0,0,0.22)}
  a.ms12-entry-primary:hover{filter:brightness(1.06)}
  a.ms12-entry-secondary{display:flex;align-items:center;justify-content:center;width:100%;min-height:46px;padding:0.5rem 0.85rem;border-radius:0.55rem;font-weight:600;font-size:0.88rem;text-decoration:none;border:1px solid rgba(148,163,184,0.42);background:rgba(15,23,42,0.42);color:rgba(226,232,240,0.96)!important;font-family:inherit}
  a.ms12-entry-secondary:hover{background:rgba(30,41,59,0.62)}
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
        <nav class="ms12-entry-stack" aria-label="시작 메뉴">
          <a class="ms12-entry-primary" href="/app/meeting/new">회의 시작</a>
          <a class="ms12-entry-secondary" href="/app/join">회의 참여</a>
          <a class="ms12-entry-secondary" href="/app/records">기록 보기</a>
        </nav>
        <p id="ms12-entry-status" class="ms12-entry-status" role="status" aria-live="polite"></p>
        <p class="ms12-entry-policy-line js-ms12-policy" style="margin:0.7rem 0 0 0;font-size:0.7rem;line-height:1.45;color:rgba(186,198,220,0.88);text-align:center" aria-label="플랜 안내"></p>
      </div>
    </div>
  </div>
  ${entryMarqueeFlow()}
</body>
</html>`
}

type Ms12Context = Context<{ Bindings: Bindings }>

/** MS12 시작 화면 HTML — `src/index.tsx`에서만 `app.get('/app', renderEntryPage)`로 응답. 이 서브앱에 `p.get('/')`를 두면 `app.route('/app', …)`와 중복되어 엔트리 대신 옛 허브 HTML이 나올 수 있음. */
function renderEntryPage(c: Ms12Context) {
  return c.html(layoutEntry(getAuthMode(c)))
}

/** 레거시 대시보드 URL → 시작 화면(세 가지 동작 중심)으로 통합 */
p.get('/hub', (c) => c.redirect('/app', 302))
p.get('/home', (c) => c.redirect('/app', 302))

const DESK_INNER = `<div class="ms12-desk">
  <div class="ms12-dsk-grid">
    <nav class="ms12-dsk-nav" aria-label="주 메뉴">
      <a class="ms12-dsk-nav--on" href="/app/desk">홈</a>
      <a href="/app/meeting">회의</a>
      <a href="/app/library">문서</a>
      <a href="/app/records">기록</a>
      <a href="/app/announcements">공고</a>
      <a href="/app">더보기</a>
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
  ${loginAside('/app/desk', kakao, google)}
</div>`

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
       <p class="ms12-p" id="ms12-new-meeting-intro"><span id="ms12-new-meeting-host-label">표시 이름을 불러오는 중…</span></p>
       <form id="ms12-form-new" style="margin-top:1rem">
         <p class="ms12-p" style="font-size:0.88rem;color:rgb(100 116 139);margin:0 0 0.75rem 0">회의 제목은 날짜·번호 형식(예: 260429-01)으로 자동 채워지며 필요하면 고칠 수 있습니다.</p>
         <label class="ms12-p" style="display:block;font-weight:500">회의 제목</label>
         <input class="ms12-input" id="ms12-input-new-title" name="title" type="text" required maxlength="200" autocomplete="off" />
         <label class="ms12-p" style="display:block;margin-top:0.75rem;font-weight:500">표시 이름</label>
         <input class="ms12-input" id="ms12-input-new-displayname" name="displayName" type="text" maxlength="40" autocomplete="name" />
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
         <input class="ms12-input" id="ms12-input-join-displayname" name="displayName" type="text" maxlength="40" placeholder="없으면 방문 사용자" autocomplete="name" />
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
  const rid = c.req.param('rid')
  if (!/^[a-f0-9]+$/i.test(rid || '')) return c.text('Not Found', 404)
  return c.redirect(`/app/record/${rid}`, 302)
})

p.get('/record/:rid', (c) => {
  const id = c.req.param('rid')
  if (!/^[a-f0-9]+$/i.test(id)) {
    return c.text('Not Found', 404)
  }
  return c.html(
    layout(
      '회의 기록 — MS12',
      'record',
      `data-ms12-record-id="${escapeHtml(id)}"`,
      guestNoJs('회의 기록'),
      `${MS12_HOME_LINK}
       <a href="/app/archive" class="ms12-rec-back">← 기록 보관함</a>
       <p class="ms12-rec-tagline">회의 기록을 보고서로 정리하세요.</p>
       <h1 class="ms12-h1" style="margin:0 0 0.25rem 0;font-size:clamp(1.15rem,3.2vw,1.45rem)">
         <input class="ms12-input" id="ms12-rec-title" type="text" required style="width:100%;max-width:100%;font-weight:700;font-size:inherit;padding:0.35rem 0.5rem" />
       </h1>
       <p id="ms12-rec-meta" class="ms12-rec-meta">불러오는 중…</p>
       <p id="ms12-rec-save-global" class="ms12-rec-save-msg" role="status"></p>
       <input type="hidden" id="ms12-rec-id" value="${escapeHtml(id)}" />
       <div class="ms12-rec-grid" style="margin-top:0.65rem">
         <details class="ms12-panel ms12-rec-span2" id="ms12-rec-raw-details">
           <summary>원문 기록</summary>
           <div style="margin-top:0.5rem">
             <p class="ms12-rec-lead">회의 중 기록된 전사와 메모입니다.</p>
             <label class="ms12-muted" style="font-size:0.78rem" for="ms12-rec-tr">전사</label>
             <textarea id="ms12-rec-tr" class="ms12-notes" style="min-height:7rem;margin-top:0.2rem"></textarea>
             <label class="ms12-muted" style="font-size:0.78rem;display:block;margin-top:0.45rem" for="ms12-rec-raw">회의 메모</label>
             <textarea id="ms12-rec-raw" class="ms12-notes" required style="min-height:7rem;margin-top:0.2rem" placeholder="핵심 메모"></textarea>
             <div class="ms12-rec-actions">
               <button type="button" class="ms12-btn ms12-btn--teal" id="ms12-rec-save-raw">원문 수정 저장</button>
             </div>
             <p id="ms12-rec-msg-raw" class="ms12-rec-save-msg"></p>
           </div>
         </details>
         <section class="ms12-panel">
           <p class="ms12-rec-panel-title">회의 요약</p>
           <p class="ms12-rec-lead">회의 내용을 목적에 맞게 정리합니다.</p>
           <div id="ms12-rec-ai-sum-wrap"></div>
           <div style="margin-bottom:0.45rem">
             <button type="button" class="ms12-subtab ms12-subtab--active" data-ms12-rec-sum="basic" id="ms12-rec-tab-basic">기본 요약</button>
             <button type="button" class="ms12-subtab" data-ms12-rec-sum="action" id="ms12-rec-tab-action">실행 요약</button>
             <button type="button" class="ms12-subtab" data-ms12-rec-sum="report" id="ms12-rec-tab-report">보고 요약</button>
           </div>
           <textarea id="ms12-rec-s-basic" class="ms12-notes ms12-rec-sum-pane" style="min-height:11rem;display:block"></textarea>
           <textarea id="ms12-rec-s-action" class="ms12-notes ms12-rec-sum-pane" style="min-height:11rem;display:none"></textarea>
           <textarea id="ms12-rec-s-report" class="ms12-notes ms12-rec-sum-pane" style="min-height:11rem;display:none"></textarea>
           <div class="ms12-rec-actions">
             <button type="button" class="ms12-btn ms12-btn--teal" id="ms12-rec-ai-sum">AI 요약 생성</button>
             <button type="button" class="ms12-btn ms12-btn--muted" id="ms12-rec-save-sum">직접 수정 저장</button>
           </div>
           <p id="ms12-rec-msg-sum" class="ms12-rec-save-msg"></p>
         </section>
         <section class="ms12-panel">
           <p class="ms12-rec-panel-title">실행 항목</p>
           <p class="ms12-rec-lead">회의 후 해야 할 일을 정리합니다.</p>
           <div style="overflow-x:auto">
             <table class="ms12-rec-action-table" aria-label="실행 항목">
               <thead>
                 <tr>
                   <th style="min-width:8rem">할 일</th>
                   <th style="min-width:5rem">담당자</th>
                   <th style="min-width:6rem">기한</th>
                   <th style="min-width:5rem">상태</th>
                   <th style="min-width:7rem">근거</th>
                   <th style="width:2.5rem"></th>
                 </tr>
               </thead>
               <tbody id="ms12-rec-actions-body"></tbody>
             </table>
           </div>
           <div class="ms12-rec-actions">
             <button type="button" class="ms12-btn ms12-btn--muted" id="ms12-rec-add-action">실행 항목 추가</button>
             <button type="button" class="ms12-btn ms12-btn--teal" id="ms12-rec-save-actions">실행 항목 저장</button>
           </div>
           <p id="ms12-rec-msg-act" class="ms12-rec-save-msg"></p>
         </section>
         <section class="ms12-panel ms12-rec-span2">
           <p class="ms12-rec-panel-title">보고서 초안</p>
           <p class="ms12-rec-lead">기관 제출이나 내부 공유에 사용할 수 있는 보고서 초안입니다.</p>
           <div class="ms12-rec-rblk"><label for="ms12-rec-r-overview">① 회의 개요</label>
             <textarea id="ms12-rec-r-overview" class="ms12-notes" style="min-height:3.5rem"></textarea></div>
           <div class="ms12-rec-rblk"><label for="ms12-rec-r-purpose">② 회의 목적</label>
             <textarea id="ms12-rec-r-purpose" class="ms12-notes" style="min-height:3.5rem"></textarea></div>
           <div class="ms12-rec-rblk"><label for="ms12-rec-r-discussion">③ 주요 논의 내용</label>
             <textarea id="ms12-rec-r-discussion" class="ms12-notes" style="min-height:4rem"></textarea></div>
           <div class="ms12-rec-rblk"><label for="ms12-rec-r-decisions">④ 결정 사항</label>
             <textarea id="ms12-rec-r-decisions" class="ms12-notes" style="min-height:3.5rem"></textarea></div>
           <div class="ms12-rec-rblk"><label for="ms12-rec-r-execution">⑤ 실행 계획</label>
             <textarea id="ms12-rec-r-execution" class="ms12-notes" style="min-height:3.5rem"></textarea></div>
           <div class="ms12-rec-rblk"><label for="ms12-rec-r-schedule">⑥ 향후 일정</label>
             <textarea id="ms12-rec-r-schedule" class="ms12-notes" style="min-height:3.5rem"></textarea></div>
           <div class="ms12-rec-rblk"><label for="ms12-rec-r-conclusion">⑦ 종합 의견</label>
             <textarea id="ms12-rec-r-conclusion" class="ms12-notes" style="min-height:3.5rem"></textarea></div>
           <div class="ms12-rec-actions">
             <button type="button" class="ms12-btn ms12-btn--teal" id="ms12-rec-ai-report">보고서 초안 생성</button>
             <button type="button" class="ms12-btn ms12-btn--muted" id="ms12-rec-blank-report">빈 보고서 양식 만들기</button>
             <button type="button" class="ms12-btn ms12-btn--muted" id="ms12-rec-save-report">보고서 저장</button>
             <button type="button" class="ms12-btn ms12-btn--muted" id="ms12-rec-copy-report-only">보고서 복사</button>
           </div>
           <p id="ms12-rec-msg-report" class="ms12-rec-save-msg"></p>
         </section>
         <section class="ms12-panel ms12-rec-span2">
           <p class="ms12-rec-panel-title">활용</p>
           <p class="ms12-rec-lead">필요한 형식으로 복사해 문서에 붙여넣을 수 있습니다.</p>
           <div class="ms12-rec-actions">
             <button type="button" class="ms12-btn ms12-btn--muted" id="ms12-rec-copy-all">전체 복사</button>
             <button type="button" class="ms12-btn ms12-btn--muted" id="ms12-rec-copy-report-util">보고서 복사</button>
             <button type="button" class="ms12-btn ms12-btn--muted" id="ms12-rec-copy-minutes">회의록 복사</button>
             <button type="button" class="ms12-btn ms12-btn--muted" id="ms12-rec-copy-link">공유 링크 복사</button>
             <button type="button" class="ms12-btn ms12-btn--muted" disabled title="준비 중">PDF 다운로드 준비 중</button>
             <button type="button" class="ms12-btn ms12-btn--muted" disabled title="준비 중">Word 다운로드 준비 중</button>
           </div>
           <p id="ms12-rec-msg-copy" class="ms12-rec-save-msg"></p>
         </section>
         <details class="ms12-details-as-btn ms12-rec-span2" id="ms12-rec-meta-details">
           <summary>기록 정보 (회의 날짜 · 분류 · 공개 · 태그)</summary>
           <div style="margin-top:0.5rem;display:grid;gap:0.45rem;max-width:36rem">
             <label class="ms12-muted" style="font-size:0.78rem" for="ms12-rec-date">회의 날짜</label>
             <input class="ms12-input" id="ms12-rec-date" type="date" required />
             <label class="ms12-muted" style="font-size:0.78rem" for="ms12-rec-cat">회의 분류</label>
             <input class="ms12-input" id="ms12-rec-cat" type="text" value="일반" />
             <label class="ms12-muted" style="font-size:0.78rem" for="ms12-rec-vis">공개 수준</label>
             <select class="ms12-input" id="ms12-rec-vis" style="max-width:16rem">
               <option value="public_internal">내부 공개</option>
               <option value="restricted">제한</option>
               <option value="private_admin">관리자만</option>
             </select>
             <label class="ms12-muted" style="font-size:0.78rem" for="ms12-rec-tags">태그</label>
             <input class="ms12-input" id="ms12-rec-tags" type="text" />
             <label class="ms12-muted" style="font-size:0.78rem" for="ms12-rec-parts">참석자 (JSON, 선택)</label>
             <input class="ms12-input" id="ms12-rec-parts" type="text" placeholder='[{"name":"홍길동"}]' />
             <label class="ms12-muted" style="font-size:0.78rem" for="ms12-rec-proj">프로젝트명</label>
             <input class="ms12-input" id="ms12-rec-proj" type="text" />
             <div style="display:flex;flex-wrap:wrap;gap:0.45rem">
               <input class="ms12-input" id="ms12-rec-bud" type="text" placeholder="예산 참고" style="flex:1;min-width:8rem" />
               <input class="ms12-input" id="ms12-rec-tg" type="text" placeholder="대상 집단" style="flex:1;min-width:8rem" />
             </div>
             <button type="button" class="ms12-btn ms12-btn--teal" id="ms12-rec-save-meta" style="margin-top:0.35rem;width:fit-content">기록 정보 저장</button>
             <p id="ms12-rec-msg-meta" class="ms12-rec-save-msg"></p>
           </div>
         </details>
       </div>
       ${loginAside('/app/record/' + id, kakao, google)}`,
      getAuthMode(c),
      `/app/record/${id}`,
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
      'meeting_hub',
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
         <p class="ms12-mh-sub">기록하면 실행·문서로 이어집니다.</p>
         <button type="button" class="ms12-mh-cta" data-ms12-action="hub-start">회의 시작</button>
         <p class="ms12-mh-policy js-ms12-policy" style="margin:0.4rem auto 0;max-width:22rem;font-size:0.78rem;line-height:1.45;color:rgb(100 116 139);text-align:center" aria-label="플랜 안내"></p>
         <p id="ms12-mh-status" class="ms12-mh-status" role="status" aria-live="polite"></p>
       </section>
       <nav class="ms12-mh-secondary" aria-label="보조 메뉴" style="max-width:24rem;grid-template-columns:1fr 1fr">
         <button type="button" class="ms12-mh-sec" data-ms12-action="hub-open-join">회의 참여</button>
         <button type="button" class="ms12-mh-sec" data-ms12-action="hub-open-archive">보관함</button>
       </nav>
       <section class="ms12-mh-recent-grid" aria-label="최근 회의" style="margin-top:1.25rem">
         <div class="ms12-mh-panel" style="max-width:28rem;margin-left:auto;margin-right:auto">
           <h3>최근 회의</h3>
           <div id="ms12-home-recent" class="ms12-muted" style="font-size:0.88rem;min-height:2.5rem">불러오는 중…</div>
         </div>
       </section>
       <div class="ms12-mh-foot">
         <p class="ms12-muted" style="font-size:0.86rem;margin:0">MS12 회의록 플랫폼</p>
       </div>
       ${loginAside('/app/meeting', kakao, google)}
       </div>`,
      getAuthMode(c),
      '/app/meeting',
    ),
  ),
)

p.get('/meeting/:id', (c) => {
  const rid = c.req.param('id')
  if (rid === 'new' || !/^[a-f0-9]+$/i.test(rid || '')) return c.text('Not Found', 404)
  return c.redirect(`/app/room/${rid}`, 302)
})

p.get('/room/:id', (c) => {
  const id = c.req.param('id')
  if (id === 'new' || !/^[a-f0-9]+$/i.test(id)) {
    return c.text('Not Found', 404)
  }
  return c.html(
    layout(
      '회의 — MS12',
      'room',
      `data-ms12-meeting-id="${escapeHtml(id)}"`,
      guestNoJs('회의'),
      `${MS12_HOME_LINK}
       <h1 class="ms12-h1" style="margin-bottom:0.35rem;line-height:1.3">
         <span class="js-ms12-room-host-line" style="display:block;font-size:0.78rem;font-weight:600;color:rgb(100 116 139);margin-bottom:0.35rem">주관 회의</span>
         <span class="ms12-room-title js-ms12-room-title">—</span>
       </h1>
       <p class="ms12-p">회의 코드 <code class="js-ms12-room-code">—</code><span class="ms12-muted" style="font-size:0.82rem"> (같은 방 참가자 모두 동일)</span> · 내 표시 이름 <span class="js-ms12-user-name" style="font-weight:600">—</span><span class="js-ms12-user-suffix">님</span></p>
       <p class="ms12-p ms12-muted" style="font-size:0.82rem;display:none" id="ms12-room-login-hint"></p>
       <div id="ms12-room-invite" class="ms12-panel" style="display:none;margin:0.5rem 0;max-width:40rem;padding:0.75rem 1rem;border:1px solid rgb(199 210 254);background:rgb(238 242 255);font-size:0.88rem" role="region" aria-label="초대">
         <p class="ms12-p" style="font-weight:600;margin:0 0 0.35rem 0">회의가 시작되었습니다. 팀원을 초대하세요.</p>
         <p class="ms12-muted" style="font-size:0.8rem;margin:0 0 0.5rem 0">초대 링크(코드: <code class="js-ms12-invite-code">—</code>)</p>
         <p style="word-break:break-all;font-size:0.82rem;margin:0.25rem 0 0.6rem" id="ms12-invite-url-line"><a class="text-indigo-600" id="ms12-invite-url" href="#" rel="nofollow">—</a></p>
         <div style="display:flex;flex-wrap:wrap;gap:0.45rem;align-items:center">
           <button type="button" class="ms12-btn" id="ms12-invite-copy" style="font-size:0.84rem">링크 복사</button>
           <a class="ms12-btn ms12-btn--muted" id="ms12-invite-kakao" href="#" rel="noopener noreferrer" target="_blank" style="font-size:0.84rem;text-decoration:none;box-sizing:border-box">링크 공유</a>
           <a class="ms12-btn ms12-btn--muted" id="ms12-invite-sms" href="#" style="font-size:0.84rem;text-decoration:none;box-sizing:border-box">문자로 보내기</a>
         </div>
       </div>
       <div id="ms12-room-free-notice" class="ms12-panel" style="display:none;margin:0.5rem 0;max-width:40rem;padding:0.5rem 0.75rem;border:1px solid rgb(251 191 36);background:rgb(255 251 235);font-size:0.86rem;line-height:1.45" role="status"></div>
       <div class="ms12-room-wrap" style="margin-top:0.75rem">
         <div>
           <div class="ms12-panel">
             <p class="ms12-p" style="font-weight:600;margin:0 0 0.5rem 0">회의록</p>
             <p class="ms12-p" style="font-size:0.82rem;margin:0 0 0.35rem 0" id="ms12-stt-hint">«음성 켜기»를 누르면 브라우저에서 마이크 권한을 요청합니다. 발언은 화자·시각과 함께 아래 회의록에 쌓이고, 화면 하단 실시간 자막에는 최근 내용이 표시됩니다.</p>
             <div class="ms12-toolbar" style="margin:0 0 0.4rem 0">
               <button type="button" class="ms12-btn ms12-btn--teal" id="ms12-stt-toggle">음성 켜기</button>
               <span class="ms12-muted ms12-mono" id="ms12-stt-status" style="font-size:0.8rem">준비 중…</span>
               <span id="ms12-stt-stream-wrap" style="display:none;margin-left:0.45rem;font-size:0.8rem;color:rgb(71 85 105)">
                 <label style="cursor:pointer;user-select:none;vertical-align:middle">
                   <input type="checkbox" id="ms12-stt-use-stream" style="width:auto;vertical-align:middle;margin-right:0.25rem"/>클라우드 실시간 STT
                 </label>
               </span>
             </div>
             <p class="ms12-muted" style="font-size:0.78rem;margin:0 0 0.35rem 0">발언 목록 · 전체 보관 (위로 스크롤하면 이전 발언 유지)</p>
             <div class="ms12-room-transcript-shell" id="ms12-room-transcript-shell" tabindex="0">
               <div class="ms12-room-transcript-scroll" id="ms12-room-transcript-scroll">
                 <div id="ms12-room-transcript-list" role="log" aria-live="polite" aria-relevant="additions"></div>
               </div>
             </div>
             <textarea class="ms12-notes ms12-tr-sr-only" id="ms12-room-transcript" rows="3" tabindex="-1" aria-hidden="true" autocomplete="off"></textarea>
             <div class="ms12-panel ms12-room-quick-add" style="margin-top:0.45rem;padding:0.55rem 0.65rem;border-style:dashed;border-color:rgb(203 213 225)">
               <p class="ms12-muted" style="font-size:0.76rem;margin:0 0 0.4rem 0;line-height:1.45">텍스트 붙여넣기 · 짧게 입력한 뒤 아래 버튼으로 회의 내용에 넣을 수 있습니다.</p>
               <div class="ms12-toolbar" style="flex-wrap:wrap;gap:0.35rem;align-items:stretch;margin:0">
                 <input type="text" id="ms12-room-quick-text" class="ms12-input" style="flex:1;min-width:12rem;margin:0;font-size:0.88rem" placeholder="붙여넣거나 한 줄 입력…" autocomplete="off" maxlength="8000" />
                 <button type="button" class="ms12-btn ms12-btn--muted" id="ms12-room-quick-to-notes" style="font-size:0.82rem;margin:0">메모에 추가</button>
                 <button type="button" class="ms12-btn ms12-btn--teal" id="ms12-room-quick-to-transcript" style="font-size:0.82rem;margin:0">회의록에 추가</button>
               </div>
               <p id="ms12-room-quick-msg" class="ms12-muted" style="font-size:0.74rem;margin:0.35rem 0 0 0;min-height:1rem;line-height:1.4" role="status"></p>
             </div>
             <div class="ms12-panel ms12-room-materials" style="margin-top:0.45rem;padding:0.55rem 0.65rem">
               <p style="font-weight:600;margin:0 0 0.3rem 0;font-size:0.9rem">회의 자료</p>
               <p class="ms12-muted" style="font-size:0.76rem;margin:0 0 0.45rem 0;line-height:1.45">파일 이름·작은 텍스트 미리보기는 이 기기에 함께 보관합니다. 「서버에 회의 저장」 시 메모 하단에 목록이 자동으로 붙습니다. 큰 파일은 <a href="/app/library" class="text-indigo-600" style="text-decoration:underline">문서 창고</a>에 올린 뒤 링크를 메모에 적어 주세요.</p>
               <input type="file" id="ms12-room-material-input" multiple style="font-size:0.82rem;max-width:100%" />
               <ul id="ms12-room-material-list" style="margin:0.45rem 0 0 1rem;padding:0;font-size:0.82rem;line-height:1.45"></ul>
               <p id="ms12-room-material-msg" class="ms12-muted" style="font-size:0.74rem;margin:0.35rem 0 0 0;min-height:1rem;line-height:1.4"></p>
             </div>
             <section class="ms12-panel ms12-room-ai-sum-preview" style="margin-top:0.45rem;padding:0.55rem 0.65rem;border:1px solid rgb(199 210 254);background:rgb(248 250 255)">
               <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:0.35rem;align-items:center;margin-bottom:0.35rem">
                 <p style="font-weight:600;margin:0;font-size:0.9rem">AI 요약</p>
                 <button type="button" class="ms12-btn ms12-btn--teal" id="ms12-room-ai-sum-now" style="font-size:0.82rem;margin:0;display:none">지금 요약 갱신</button>
               </div>
               <p id="ms12-room-ai-sum-hint" class="ms12-muted" style="font-size:0.76rem;margin:0 0 0.45rem 0;line-height:1.45">메모·회의록이 쌓이면 여기에 요약 미리보기가 표시됩니다. 서버에 AI 키가 있으면 자동으로 갱신되거나 아래 버튼으로 즉시 요청할 수 있습니다.</p>
               <div id="ms12-room-ai-sum-preview-body" class="ms12-muted" style="font-size:0.82rem;line-height:1.45;white-space:pre-wrap;max-height:14rem;overflow:auto;border-radius:0.35rem;padding:0.45rem;background:#fff;border:1px solid rgb(226 232 240)">—</div>
               <p class="ms12-muted" style="font-size:0.74rem;margin:0.45rem 0 0 0;line-height:1.45">세부 수정은 아래 「수동 요약」란에서 할 수 있습니다.</p>
             </section>
             <p class="ms12-p" style="font-weight:600;margin:0.75rem 0 0.4rem 0">회의 메모</p>
             <textarea class="ms12-notes" id="ms12-room-notes" placeholder="핵심 메모 (자동 저장)" style="min-height:8rem"></textarea>
             <div class="ms12-toolbar" style="margin-top:0.6rem">
               <button type="button" class="ms12-btn ms12-btn--muted" id="ms12-room-flush">이 브라우저에 임시 저장 · JSON 받기</button>
             </div>
             <p class="ms12-muted" id="ms12-room-flush-msg" style="font-size:0.78rem;min-height:1rem;margin:0.35rem 0 0 0"></p>
             <p class="ms12-muted" style="font-size:0.77rem;margin:0.55rem 0 0 0;line-height:1.45;color:rgb(100 116 139)">회의록·메모 아래에 키워드·태그를 적어 두면 나중에 찾기 좋습니다. 서버에 반영할 때는 아래 「서버에 회의 저장」 블록의 태그 칸에 같은 단어를 넣으면 보관함 검색에 도움이 됩니다.</p>
           </div>
             <details class="ms12-panel ms12-details-as-btn" style="margin-top:0.75rem">
             <summary>수동 요약 (기본 · 실행 · 보고)</summary>
             <div style="margin-top:0.5rem">
               <p class="ms12-muted" id="ms12-live-summary-status" style="font-size:0.76rem;margin:0 0 0.55rem 0;display:none"></p>
               <p class="ms12-muted" style="font-size:0.82rem;margin:0 0 0.65rem 0">메모·회의록이 쌓이면 서버 AI가 주기적으로 아래 세 칸을 갱신합니다. 직접 수정한 내용도 다음 갱신에 참고됩니다.</p>
               <label class="ms12-muted" style="font-size:0.78rem;display:block;margin:0 0 0.15rem 0" for="ms12-room-summary-basic">기본 요약</label>
               <textarea class="ms12-notes" id="ms12-room-summary-basic" placeholder="기본 요약 (자동 저장)" style="min-height:4rem;margin-bottom:0.65rem" aria-label="기본 요약"></textarea>
               <label class="ms12-muted" style="font-size:0.78rem;display:block;margin:0 0 0.15rem 0" for="ms12-room-summary-action">실행 요약</label>
               <textarea class="ms12-notes" id="ms12-room-summary-action" placeholder="실행 요약" style="min-height:4rem;margin-bottom:0.65rem" aria-label="실행 요약"></textarea>
               <label class="ms12-muted" style="font-size:0.78rem;display:block;margin:0 0 0.15rem 0" for="ms12-room-summary-report">보고 요약</label>
               <textarea class="ms12-notes" id="ms12-room-summary-report" placeholder="보고 요약" style="min-height:4rem" aria-label="보고 요약"></textarea>
             </div>
           </details>
         </div>
         <aside>
           <div class="ms12-panel" id="ms12-part-wrap">
             <p class="ms12-p" style="font-weight:600;margin:0 0 0.25rem 0">참석자 <span class="js-ms12-part-count">0</span>명</p>
             <ul class="ms12-part-list js-ms12-part-list"><li>불러오는 중…</li></ul>
           </div>
         </aside>
       </div>
       <div id="ms12-live-caption-wrap" class="ms12-live-caption-wrap" role="region" aria-label="실시간 음성 자막">
         <div class="ms12-live-caption-inner">
           <p class="ms12-live-caption-label">실시간 자막</p>
           <p id="ms12-live-caption-text" class="ms12-live-caption-text ms12-live-caption-text--idle" aria-live="polite">«음성 켜기» 후 발언 내용이 여기(화면 하단)와 위 회의록에 함께 표시됩니다.</p>
         </div>
       </div>
       <div id="ms12-linked-ann" class="ms12-panel" style="display:none;margin:0.75rem 0;max-width:40rem;padding:0.75rem 1rem;border:1px solid rgb(199 210 254);background:rgb(238 242 255)">
         <p class="ms12-p" style="font-weight:600;margin:0 0 0.25rem 0">연결된 공모·지원 공고</p>
         <p class="ms12-p" id="ms12-linked-ann-line" style="font-size:0.9rem;margin:0"></p>
         <a id="ms12-linked-ann-link" class="text-indigo-600" style="font-size:0.88rem;text-decoration:underline;display:none" href="#">공고 상세</a>
       </div>
       <details class="ms12-panel ms12-details-as-btn" style="margin:0.75rem 0 0.75rem 0;max-width:32rem">
         <summary>서버에 회의 저장 (보관함·제목·날짜)</summary>
         <div style="margin-top:0.45rem">
         <p class="ms12-muted" style="font-size:0.8rem;margin:0 0 0.4rem 0">필수 항목을 채운 뒤 저장하면 <a href="/app/archive" class="text-indigo-600" style="text-decoration:underline">회의 보관함</a>에 쌓입니다. 목록에서 열어 덮어쓰기·참고할 수 있습니다.</p>
         <input class="ms12-input" id="ms12-save-title" type="text" placeholder="예: 260428 회의" maxlength="200" style="max-width:100%"/>
         <div style="display:grid;gap:0.35rem;margin-top:0.4rem;max-width:22rem">
           <label class="ms12-muted" style="font-size:0.8rem">회의 날짜</label>
           <input class="ms12-input" id="ms12-save-meeting-date" type="date" />
           <label class="ms12-muted" style="font-size:0.8rem">회의 분류</label>
           <input class="ms12-input" id="ms12-save-category" type="text" value="일반" maxlength="80" autocomplete="off" style="max-width:100%"/>
           <details class="ms12-cat-picker" style="margin:0;border:1px solid rgb(226 232 240);border-radius:0.5rem;padding:0.45rem 0.55rem;background:rgb(248 250 252)">
             <summary style="cursor:pointer;font-size:0.82rem;font-weight:600;color:rgb(71 85 105);user-select:none">미리 정해 둔 분류에서 고르기 · 직접 추가</summary>
             <div id="ms12-cat-chip-wrap" style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-top:0.5rem"></div>
             <div style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-top:0.45rem;align-items:center">
               <input class="ms12-input" id="ms12-save-category-add-input" type="text" placeholder="새 분류(추가 후 계속 사용)" maxlength="40" style="flex:1;min-width:8rem;margin:0;font-size:0.88rem"/>
               <button type="button" class="ms12-btn ms12-btn--muted" id="ms12-save-category-add-btn" style="font-size:0.82rem;padding:0.35rem 0.55rem;min-height:auto">추가</button>
             </div>
           </details>
           <datalist id="ms12-cat-dl"></datalist>
           <label class="ms12-muted" style="font-size:0.8rem">태그 <span style="font-weight:400;color:rgb(148 163 184)">(보관함 검색·주제별 묶기, 쉼표로 구분)</span></label>
           <input class="ms12-input" id="ms12-save-tags" type="text" placeholder="예: 부모교육, 공모, 점검" />
           <label class="ms12-muted" style="font-size:0.8rem">공개 수준</label>
           <select class="ms12-input" id="ms12-save-vis" style="max-width:16rem">
             <option value="public_internal">내부 전체(기본)</option>
             <option value="restricted">제한</option>
             <option value="private_admin">관리자만</option>
           </select>
         </div>
         <div style="display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center;margin-top:0.5rem">
         <button type="button" class="ms12-btn ms12-btn--teal" id="ms12-meeting-save-server">서버에 회의 저장</button>
         <button type="button" class="ms12-btn ms12-btn--muted" id="ms12-room-end-meeting">회의 종료</button>
         </div>
         <div style="margin-top:0.35rem;display:flex;flex-wrap:wrap;gap:0.75rem;align-items:baseline;font-size:0.82rem">
           <span class="ms12-muted" id="ms12-save-server-msg" style="margin:0"></span>
           <span class="ms12-muted" id="ms12-room-end-msg" style="min-height:1.2rem;margin:0" role="status" aria-live="polite"></span>
         </div>
         </div>
       </details>
       ${loginAside('/app/room/' + id, kakao, google)}
       <p id="ms12-room-err" class="ms12-p" style="color:rgb(185 28 28);display:none"></p>`,
      getAuthMode(c),
      `/app/room/${id}`,
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

/** 레거시 `/app/login` → 회의 허브 */
p.get('/login', (c) => {
  const q = new URL(c.req.url).search || ''
  return c.redirect('/app' + q, 302)
})

export { renderEntryPage }
export default p
