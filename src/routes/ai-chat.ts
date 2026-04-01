/**
 * MindStory LMS AI 비서 — OpenAI Chat Completions
 * POST /api/chat
 *
 * OPENAI_API_KEY: Cloudflare Pages/Workers 시크릿 또는 로컬 `.dev.vars`
 * (`npm run dev` 전에 `scripts/sync-openai-from-env.mjs`가 루트 `.env`의 값을 `.dev.vars`에 병합)
 * 키는 응답·로그·클라이언트로 노출하지 않습니다.
 */

import { Hono } from 'hono'
import type { Bindings } from '../types/database'
import { buildCourseScheduleContextBlock } from '../config/course-schedule'
import { MINDSTORY_LMS_AI_GUIDE_SYSTEM } from '../utils/ai-chat-system-prompt'

const aiChat = new Hono<{ Bindings: Bindings }>()

const MAX_USER_MESSAGE = 2000
const MAX_HISTORY_MSGS = 8
const MAX_SLICE = 1200
const DEFAULT_OPENAI_BASE = 'https://api.openai.com/v1'
const DEFAULT_OPENAI_MODEL = 'gpt-4o'

/** 호스트만 넣은 값(https://api.openai.com)도 허용 — Chat Completions는 /v1 기준 */
function normalizeOpenAIBase(raw: string): string {
  const b = raw.replace(/\/$/, '')
  if (!b) return DEFAULT_OPENAI_BASE
  if (/\/v\d+(\/|$)/.test(b)) return b
  return `${b}/v1`
}

type ChatRole = 'user' | 'assistant'

interface ChatTurn {
  role: ChatRole
  content: string
}

function trimContent(s: string, max: number): string {
  const t = (s || '').trim()
  if (t.length <= max) return t
  return t.slice(0, max) + '…'
}

function normalizeDisplayName(raw: string): string {
  const t = String(raw || '').trim().replace(/\s*님$/, '')
  if (!t) return '방문자님'
  return t + '님'
}

function isCertificateQuestion(message: string): boolean {
  const q = (message || '').toLowerCase()
  return /자격증|수료증|민간자격|공인\s*민간|국가\s*공인|자격기본법/.test(q)
}

async function logAiChatOutcome(
  db: { prepare: (s: string) => { bind: (...a: unknown[]) => { run: () => Promise<unknown> } } } | undefined,
  success: boolean,
  source = 'chat',
) {
  if (!db) return
  try {
    await db
      .prepare(`INSERT INTO ai_chat_request_logs (success, source) VALUES (?, ?)`)
      .bind(success ? 1 : 0, source.slice(0, 64))
      .run()
  } catch (e) {
    console.warn('[ai-chat] log skip', e)
  }
}

aiChat.post('/chat', async (c) => {
  const { DB } = c.env
  const apiKey = (c.env.OPENAI_API_KEY || '').trim()
  if (!apiKey) {
    return c.json(
      { success: false, error: 'AI 서비스 키가 설정되지 않았습니다. 관리자에게 문의해 주세요.' },
      503
    )
  }

  const base = normalizeOpenAIBase(c.env.OPENAI_BASE_URL || DEFAULT_OPENAI_BASE).replace(/\/$/, '')
  const model = (c.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL).trim() || DEFAULT_OPENAI_MODEL

  let body: {
    message?: string
    summary?: string
    history?: ChatTurn[]
    userName?: string
  }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: '요청 형식이 올바르지 않습니다.' }, 400)
  }

  const userMessage = trimContent(String(body.message || ''), MAX_USER_MESSAGE)
  if (!userMessage) {
    return c.json({ success: false, error: '메시지를 입력해 주세요.' }, 400)
  }

  const summaryRaw = trimContent(String(body.summary || ''), 800)
  const userNameRaw = trimContent(String(body.userName || ''), 80)
  const displayName = normalizeDisplayName(userNameRaw)
  const historyIn = Array.isArray(body.history) ? body.history : []

  // 자격증 관련 질문은 모호한 답변을 방지하기 위해 고정 가이드 우선 반환
  if (isCertificateQuestion(userMessage)) {
    const fixedReply =
      `${displayName}, 자격증 취득에 대해 명확히 안내해 드립니다.\n\n` +
      `마인드스토리의 공식 입장은 다음과 같습니다.\n` +
      `- 국가 공인/공인 민간 자격증은 마인드스토리에서 직접 발행하지 않습니다.\n` +
      `- 다만, **자격기본법**에 의한 **등록 민간자격증**과 연계된 과정을 운영하고 있습니다.\n` +
      `- 과정별 발급 주체, 등록번호, 취득 조건(출석·평가·실습)은 상이할 수 있어, 최종 기준은 각 과정 상세 페이지에 안내된 내용을 기준으로 합니다.\n\n` +
      `제가 ${displayName}을 위해 과정별 자격 연계 여부와 준비 절차를 상세히 찾아보겠습니다.`
    await logAiChatOutcome(DB, true, 'cert_guide')
    return c.json({ success: true, reply: fixedReply })
  }

  let siteDataBlock = ''
  let courseRowCount = -1
  try {
    const listed = await DB.prepare(
      `SELECT id, title, category_group FROM courses WHERE status = 'published' ORDER BY IFNULL(display_order, 0) ASC, id ASC`
    ).all<{ id: number; title: string; category_group: string | null }>()
    const rows = listed.results || []
    courseRowCount = rows.length
    siteDataBlock = buildCourseScheduleContextBlock(rows)
    if (courseRowCount === 0) {
      console.warn('[ai-chat] D1 courses: 공개 강좌 0건 — 브랜드·카탈로그 URL만 컨텍스트에 포함')
    }
  } catch (e) {
    console.warn('[ai-chat] course schedule context (D1 오류, 브랜드 블록만 사용)', e)
    siteDataBlock = buildCourseScheduleContextBlock([])
    courseRowCount = -2
  }

  const messages: { role: 'system' | ChatRole; content: string }[] = [
    { role: 'system', content: MINDSTORY_LMS_AI_GUIDE_SYSTEM },
    { role: 'system', content: siteDataBlock }
  ]

  if (summaryRaw) {
    messages.push({
      role: 'system',
      content:
        '아래는 이전 대화의 초간략 요약이다. 맥락 참고만 하고, 지금 질문에 직접 답하라.\n' + summaryRaw
    })
  }
  if (userNameRaw) {
    messages.push({
      role: 'system',
      content:
        '현재 대화 중인 사용자의 표시 이름은 "' +
        displayName +
        '"이다. 답변 첫 문장에서 매번은 아니고 가끔만 이름을 자연스럽게 언급해도 된다. 예: "' +
        displayName +
        ', 요청하신 정보를 찾았습니다."'
    })
  }

  const history: ChatTurn[] = historyIn
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
    .slice(-MAX_HISTORY_MSGS)
    .map((m) => ({
      role: m.role,
      content: trimContent(String(m.content || ''), MAX_SLICE)
    }))

  for (const m of history) {
    if (m.content) messages.push({ role: m.role, content: m.content })
  }

  messages.push({ role: 'user', content: userMessage })

  try {
    console.log('[ai-chat] LLM 전송 직전 messages 전문', {
      model,
      courseRowCount,
      messageCount: messages.length,
      roles: messages.map((m) => m.role),
      messages: messages.map((m) => ({ role: m.role, content: m.content }))
    })

    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages,
        temperature: 0.25,
        max_tokens: 650
      })
    })

    if (!res.ok) {
      await res.text().catch(() => '')
      console.error('[ai-chat] OpenAI HTTP', res.status)
      await logAiChatOutcome(DB, false, 'openai_http')
      return c.json(
        { success: false, error: '일시적으로 답변을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.' },
        502
      )
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const reply = trimContent(String(data.choices?.[0]?.message?.content || '').trim(), 8000)
    if (!reply) {
      await logAiChatOutcome(DB, false, 'empty_reply')
      return c.json({ success: false, error: '빈 응답이 반환되었습니다.' }, 502)
    }

    await logAiChatOutcome(DB, true, 'openai')
    return c.json({ success: true, reply })
  } catch (e) {
    console.error('[ai-chat]', e)
    await logAiChatOutcome(DB, false, 'exception')
    return c.json({ success: false, error: '네트워크 오류가 발생했습니다.' }, 502)
  }
})

export default aiChat
