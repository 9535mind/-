/**
 * MindStory AI 비서 — FAB + 채팅 패널 (POST /api/chat · OpenAI gpt-4o)
 * 사용: <head> siteAiChatWidgetStyles() · 본문 하단 siteAiChatWidgetMarkup() · siteAiChatWidgetScript()
 */

import { STATIC_JS_CACHE_QUERY } from './static-js-cache-bust'

export function siteAiChatWidgetStyles(): string {
  return `<style id="site-ai-chat-widget">
#ms-ai-chat-root {
  padding-right: env(safe-area-inset-right, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
#ms-ai-chat-fab {
  -webkit-tap-highlight-color: transparent;
}
@media (max-width: 768px) {
  #ms-ai-chat-fab {
    padding: 0 !important;
    min-width: 3.5rem !important;
    min-height: 3.5rem !important;
    width: 3.5rem !important;
    height: 3.5rem !important;
  }
  #ms-ai-chat-close {
    padding: 0.35rem !important;
    min-width: 2rem !important;
    min-height: 2rem !important;
  }
  #ms-ai-chat-send {
    padding: 0.5rem !important;
    min-width: 2.5rem !important;
    min-height: 2.5rem !important;
  }
  #ms-ai-chat-input {
    min-height: 2.5rem !important;
    font-size: 0.9rem !important;
  }
  .ms-ai-quick-btn {
    font-size: 0.7rem !important;
    line-height: 1.2 !important;
    padding: 0.35rem 0.5rem !important;
    min-height: 0 !important;
    min-width: 0 !important;
  }
}
.ms-ai-msg--user { word-break: break-word; }
.ms-ai-msg--assistant .ms-ai-msg-body { white-space: pre-wrap; word-break: break-word; }
.ms-ai-msg-body.ms-ai-loading { font-style: italic; color: rgb(100, 116, 139); }
.ms-ai-msg--error { border-color: rgba(248, 113, 113, 0.45) !important; background: rgba(254, 242, 242, 0.85) !important; color: #991b1b !important; }
</style>`
}

export function siteAiChatWidgetMarkup(): string {
  return `<!-- MindStory AI 비서 -->
<div id="ms-ai-chat-root" class="pointer-events-none fixed bottom-6 right-6 z-[9000] font-sans" aria-live="polite">
  <div class="pointer-events-auto relative">
    <div
      id="ms-ai-chat-panel"
      class="absolute bottom-16 right-0 flex h-[32rem] max-h-[min(32rem,calc(100vh-8rem))] w-[min(20rem,calc(100vw-2rem))] origin-bottom-right scale-95 flex-col overflow-hidden rounded-2xl border border-white/20 bg-white/90 opacity-0 shadow-2xl backdrop-blur-xl transition-all duration-300 ease-out pointer-events-none invisible sm:w-96 sm:max-w-none"
      role="dialog"
      aria-modal="false"
      aria-labelledby="ms-ai-chat-title"
      aria-hidden="true"
    >
      <header class="flex shrink-0 items-center justify-between gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-4 text-white">
        <h2 id="ms-ai-chat-title" class="min-w-0 truncate text-base font-bold">MindStory LMS AI 가이드</h2>
        <button
          type="button"
          id="ms-ai-chat-close"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          aria-label="채팅 닫기"
        >
          <i class="fas fa-times text-lg" aria-hidden="true"></i>
        </button>
      </header>
      <div class="min-h-0 flex-1 overflow-y-auto bg-slate-50/40 p-4" id="ms-ai-chat-messages">
        <div id="ms-ai-chat-initial-greeting" class="rounded-2xl rounded-tl-md border border-white/30 bg-white/70 px-3.5 py-2.5 text-sm leading-relaxed text-slate-700 shadow-sm backdrop-blur-sm">
          안녕하세요, 방문자님! 오직 방문자님을 위해 대기 중인 마인드스토리 전용 AI 비서입니다. 무엇을 도와드릴까요?
        </div>
      </div>
      <div class="shrink-0 border-t border-slate-200/50 bg-white/70 px-3 py-2 backdrop-blur-sm">
        <p class="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">빠른 시작</p>
        <div class="flex flex-wrap gap-1.5">
          <button type="button" class="ms-ai-quick-btn rounded-lg border border-indigo-200/80 bg-indigo-50/90 px-2 py-1 text-left text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-100/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" data-ms-prompt="Classic 과정 안내를 해주세요. 추천 대상, 학습 목표, 대표 강좌를 알려주세요.">
            Classic 과정 안내
          </button>
          <button type="button" class="ms-ai-quick-btn rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-2 py-1 text-left text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-100/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400" data-ms-prompt="Next 마스터 코스 안내를 해주세요. 전문가 대상 포인트, 실전 커리큘럼, 수강 후 기대 성과를 설명해 주세요.">
            Next 마스터 코스
          </button>
          <button type="button" class="ms-ai-quick-btn rounded-lg border border-amber-200/80 bg-amber-50/90 px-2 py-1 text-left text-slate-700 transition hover:border-amber-300 hover:bg-amber-100/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400" data-ms-prompt="공동훈련(NCS) 신청 절차를 알려주세요. 대상자, 필요 서류, 출석(mOTP), 수료 기준을 단계별로 설명해 주세요.">
            공동훈련(NCS) 신청
          </button>
        </div>
      </div>
      <form id="ms-ai-chat-form" class="flex shrink-0 gap-2 border-t border-slate-200/60 bg-white/80 p-3 backdrop-blur-sm">
        <label for="ms-ai-chat-input" class="sr-only">메시지 입력</label>
        <input
          type="text"
          id="ms-ai-chat-input"
          autocomplete="off"
          placeholder="메시지를 입력하세요…"
          class="min-w-0 flex-1 rounded-full border border-slate-200/90 bg-white/90 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/25"
        />
        <button
          type="submit"
          id="ms-ai-chat-send"
          class="inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-600 p-2.5 text-white shadow-md transition-all hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          aria-label="전송"
        >
          <i class="fas fa-paper-plane text-sm text-white" aria-hidden="true"></i>
        </button>
      </form>
    </div>
    <button
      type="button"
      id="ms-ai-chat-fab"
      class="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_0_20px_rgba(5,150,105,0.4)] transition-all duration-200 hover:-translate-y-1 hover:bg-emerald-500 hover:shadow-[0_0_28px_rgba(5,150,105,0.55)]"
      aria-label="AI 비서 열기"
      aria-expanded="false"
      aria-controls="ms-ai-chat-panel"
    >
      <i class="fas fa-comment-dots text-2xl text-white" aria-hidden="true"></i>
    </button>
  </div>
</div>
<script src="/static/js/ai-instruction.js${STATIC_JS_CACHE_QUERY}" defer></script>`
}

export function siteAiChatWidgetScript(): string {
  return `
(function () {
  var MAX_TURNS = 4;

  function scrollMsgs(box) {
    if (!box) return;
    try {
      box.scrollTop = box.scrollHeight;
    } catch (e) {}
  }

  function typeText(el, full, onDone) {
    var i = 0;
    var box = document.getElementById('ms-ai-chat-messages');
    function tick() {
      if (i >= full.length) {
        if (onDone) onDone();
        return;
      }
      var step = i > 240 ? 4 : 2;
      i = Math.min(i + step, full.length);
      el.textContent = full.slice(0, i);
      scrollMsgs(box);
      setTimeout(tick, 16);
    }
    tick();
  }

  function initMsAiChat() {
    var root = document.getElementById('ms-ai-chat-root');
    var fab = document.getElementById('ms-ai-chat-fab');
    var panel = document.getElementById('ms-ai-chat-panel');
    var closeBtn = document.getElementById('ms-ai-chat-close');
    var form = document.getElementById('ms-ai-chat-form');
    var input = document.getElementById('ms-ai-chat-input');
    var sendBtn = document.getElementById('ms-ai-chat-send');
    if (!root || !fab || !panel) return;

    var turns = [];
    var loading = false;

    var openClasses = ['opacity-100', 'scale-100', 'pointer-events-auto'];
    var closedClasses = ['opacity-0', 'scale-95', 'pointer-events-none', 'invisible'];

    function toHonorificName(rawName) {
      var t = String(rawName || '').trim();
      if (!t) return '방문자님';
      var plain = t.replace(/\s*님$/, '').trim();
      if (!plain) return '방문자님';
      return plain === '방문자' ? '방문자님' : plain + '님';
    }

    function readHeaderUserName() {
      var ids = ['headerUserName', 'mHeaderUserName', 'adminName'];
      for (var i = 0; i < ids.length; i++) {
        var el = document.getElementById(ids[i]);
        var txt = el && el.textContent ? el.textContent.trim() : '';
        if (txt) return txt;
      }
      return '';
    }

    function resolveGreetingName() {
      try {
        if (typeof AuthManager !== 'undefined' && AuthManager && typeof AuthManager.getUser === 'function') {
          var u = AuthManager.getUser();
          var n = u && u.name ? String(u.name).trim() : '';
          if (n) return toHonorificName(n);
        }
      } catch (e) {}
      var headerName = readHeaderUserName();
      if (headerName) return toHonorificName(headerName);
      return '방문자님';
    }

    function applyInitialGreetingName() {
      var greetingEl = document.getElementById('ms-ai-chat-initial-greeting');
      if (!greetingEl) return;
      var displayName = resolveGreetingName();
      greetingEl.textContent =
        '안녕하세요, ' +
        displayName +
        '! 오직 ' +
        displayName +
        '을 위해 대기 중인 마인드스토리 전용 AI 비서입니다. 무엇을 도와드릴까요?';
    }

    function setOpen(open) {
      root.classList.toggle('ms-ai-chat--open', open);
      fab.setAttribute('aria-expanded', open ? 'true' : 'false');
      panel.setAttribute('aria-hidden', open ? 'false' : 'true');
      var i;
      if (open) {
        for (i = 0; i < closedClasses.length; i++) panel.classList.remove(closedClasses[i]);
        for (i = 0; i < openClasses.length; i++) panel.classList.add(openClasses[i]);
        if (input) {
          setTimeout(function () {
            try { input.focus(); } catch (e) {}
          }, 200);
        }
      } else {
        for (i = 0; i < openClasses.length; i++) panel.classList.remove(openClasses[i]);
        for (i = 0; i < closedClasses.length; i++) panel.classList.add(closedClasses[i]);
      }
    }

    function setBusy(b) {
      loading = b;
      if (input) input.readOnly = b;
      if (sendBtn) {
        sendBtn.disabled = b;
        sendBtn.setAttribute('aria-busy', b ? 'true' : 'false');
        sendBtn.style.opacity = b ? '0.55' : '';
      }
    }

    function buildPayload(userText) {
      var summary = '';
      var history = [];
      if (turns.length > MAX_TURNS) {
        var drop = turns.slice(0, turns.length - MAX_TURNS);
        summary = drop
          .map(function (x) {
            return (x.user || '').slice(0, 72) + ' → ' + (x.assistant || '').slice(0, 72);
          })
          .join(' | ')
          .slice(0, 500);
      }
      var tail = turns.slice(-MAX_TURNS);
      for (var j = 0; j < tail.length; j++) {
        history.push({ role: 'user', content: tail[j].user });
        history.push({ role: 'assistant', content: tail[j].assistant });
      }
      return {
        message: userText,
        summary: summary || undefined,
        history: history,
        userName: resolveGreetingName()
      };
    }

    function appendUserBubble(text) {
      var box = document.getElementById('ms-ai-chat-messages');
      if (!box) return;
      var wrap = document.createElement('div');
      wrap.className = 'ms-ai-msg ms-ai-msg--user mb-3 ml-auto max-w-[92%] rounded-2xl rounded-tr-md bg-emerald-600 px-3.5 py-2.5 text-sm leading-relaxed text-white shadow-sm';
      wrap.textContent = text;
      box.appendChild(wrap);
      scrollMsgs(box);
    }

    function appendAssistantShell() {
      var box = document.getElementById('ms-ai-chat-messages');
      if (!box) return null;
      var wrap = document.createElement('div');
      wrap.className =
        'ms-ai-msg ms-ai-msg--assistant mb-3 max-w-[92%] rounded-2xl rounded-tl-md border border-white/30 bg-white/70 px-3.5 py-2.5 text-sm leading-relaxed text-slate-700 shadow-sm backdrop-blur-sm';
      var body = document.createElement('span');
      body.className = 'ms-ai-msg-body ms-ai-loading';
      body.textContent = 'AI 가이드가 확인 중입니다...';
      wrap.appendChild(body);
      box.appendChild(wrap);
      scrollMsgs(box);
      return body;
    }

    function sendMessage() {
      if (loading || !input) return;
      var userText = (input.value || '').trim();
      if (!userText) return;
      input.value = '';
      appendUserBubble(userText);
      var bodyEl = appendAssistantShell();
      setBusy(true);

      var payload = buildPayload(userText);
      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.text().then(function (text) {
            var data = {};
            try {
              data = text ? JSON.parse(text) : {};
            } catch (e) {
              data = { error: '서버 응답을 해석할 수 없습니다.' };
            }
            return { ok: res.ok, status: res.status, data: data };
          });
        })
        .then(function (r) {
          if (!bodyEl) return;
          if (r.ok && r.data && r.data.success && r.data.reply) {
            var reply = String(r.data.reply);
            turns.push({ user: userText, assistant: reply });
            bodyEl.classList.remove('ms-ai-loading');
            bodyEl.textContent = '';
            typeText(bodyEl, reply, function () {
              scrollMsgs(document.getElementById('ms-ai-chat-messages'));
            });
          } else {
            var err =
              (r.data && r.data.error) ||
              (r.status === 429 ? '요청이 많습니다. 잠시 후 다시 시도해 주세요.' : '답변을 불러오지 못했습니다.');
            bodyEl.classList.remove('ms-ai-loading');
            bodyEl.closest('.ms-ai-msg').classList.add('ms-ai-msg--error');
            bodyEl.textContent = err;
          }
        })
        .catch(function () {
          if (bodyEl) {
            bodyEl.classList.remove('ms-ai-loading');
            bodyEl.closest('.ms-ai-msg').classList.add('ms-ai-msg--error');
            bodyEl.textContent = '연결에 실패했습니다. 네트워크를 확인해 주세요.';
          }
        })
        .finally(function () {
          setBusy(false);
        });
    }

    fab.addEventListener('click', function () {
      setOpen(!root.classList.contains('ms-ai-chat--open'));
    });
    if (closeBtn) closeBtn.addEventListener('click', function () { setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('ms-ai-chat--open')) setOpen(false);
    });
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        sendMessage();
      });
    }
    document.querySelectorAll('.ms-ai-quick-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var t = btn.getAttribute('data-ms-prompt');
        if (input && t) {
          input.value = t;
          try {
            input.focus();
          } catch (e) {}
          sendMessage();
        }
      });
    });

    applyInitialGreetingName();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMsAiChat);
  } else {
    initMsAiChat();
  }
})();
`.trim()
}
