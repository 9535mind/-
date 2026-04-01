/**
 * AI 도우미 API (Gemini 기반)
 * /api/ai/*
 */

import { Hono } from 'hono'
import { Bindings } from '../types/database'
import { successResponse, errorResponse } from '../utils/helpers'
import { requireAdmin } from '../middleware/auth'

const ai = new Hono<{ Bindings: Bindings }>()

const DEFAULT_OPENAI_BASE = 'https://api.openai.com/v1'
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'

function normalizeOpenAIBase(raw: string): string {
  const b = (raw || '').replace(/\/$/, '')
  if (!b) return DEFAULT_OPENAI_BASE
  if (/\/v\d+(\/|$)/.test(b)) return b
  return `${b}/v1`
}

function extractGeminiText(data: unknown): string {
  if (!data || typeof data !== 'object') {
    throw new Error('Gemini 응답 형식이 올바르지 않습니다.')
  }
  const d = data as Record<string, unknown>
  const blockReason = (d.promptFeedback as { blockReason?: string } | undefined)?.blockReason
  if (blockReason) {
    throw new Error(`Gemini가 요청을 차단했습니다: ${blockReason}`)
  }
  const errObj = d.error as { message?: string; status?: string } | undefined
  if (errObj?.message) {
    throw new Error(`Gemini API: ${errObj.message}`)
  }
  const candidates = d.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error('Gemini 응답에 본문(candidates)이 없습니다.')
  }
  const parts = candidates[0]?.content?.parts
  const text = parts?.[0]?.text
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Gemini 응답에 텍스트가 없습니다.')
  }
  return text
}

/**
 * Gemini API 호출 헬퍼 함수
 */
async function callGemini(apiKey: string, baseURL: string, prompt: string, systemInstruction?: string) {
  const response = await fetch(`${baseURL}/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048
      }
    })
  })

  const rawText = await response.text()
  let data: unknown
  try {
    data = rawText ? JSON.parse(rawText) : {}
  } catch {
    console.error('Gemini raw (non-JSON):', rawText.slice(0, 500))
    throw new Error('Gemini 응답을 해석하지 못했습니다.')
  }

  if (!response.ok) {
    console.error('Gemini API HTTP', response.status, rawText.slice(0, 800))
    try {
      extractGeminiText(data)
    } catch (e) {
      if (e instanceof Error) throw e
    }
    throw new Error(`Gemini API 오류 (HTTP ${response.status})`)
  }

  return extractGeminiText(data)
}

/**
 * OpenAI Chat Completions — GEMINI 미설정 시 설명 생성 등에 사용
 */
async function callOpenAIChat(
  env: Bindings,
  system: string,
  user: string,
): Promise<string> {
  const apiKey = (env.OPENAI_API_KEY || '').trim()
  if (!apiKey) {
    throw new Error('NO_AI_KEY')
  }
  const base = normalizeOpenAIBase(env.OPENAI_BASE_URL || DEFAULT_OPENAI_BASE).replace(/\/$/, '')
  const model = (env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL).trim() || DEFAULT_OPENAI_MODEL

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.65,
      max_tokens: 1200,
    }),
  })

  const raw = await res.text()
  let parsed: { choices?: Array<{ message?: { content?: string } }> } | null = null
  try {
    parsed = raw ? JSON.parse(raw) : null
  } catch {
    console.error('OpenAI non-JSON:', raw.slice(0, 400))
    throw new Error('OpenAI 응답을 해석하지 못했습니다.')
  }

  if (!res.ok) {
    console.error('OpenAI HTTP', res.status, raw.slice(0, 600))
    throw new Error(`OpenAI API 오류 (HTTP ${res.status})`)
  }

  const out = parsed?.choices?.[0]?.message?.content
  if (typeof out !== 'string' || !out.trim()) {
    throw new Error('OpenAI 응답에 본문이 없습니다.')
  }
  return out.trim()
}

/** 강좌/차시 설명용: Gemini 우선, 실패 시 OpenAI(키 있을 때), 둘 다 없으면 NO_AI_KEY */
async function generateTextGeminiOrOpenAI(
  c: { env: Bindings },
  prompt: string,
  systemInstruction: string,
): Promise<string> {
  const geminiKey = (c.env.GEMINI_API_KEY || '').trim()
  const baseURL = c.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta'
  const openaiKey = (c.env.OPENAI_API_KEY || '').trim()

  if (geminiKey) {
    try {
      return await callGemini(geminiKey, baseURL, prompt, systemInstruction)
    } catch (e) {
      if (openaiKey) {
        console.warn('[ai] Gemini failed, falling back to OpenAI:', e instanceof Error ? e.message : e)
        return callOpenAIChat(c.env, systemInstruction, prompt)
      }
      throw e
    }
  }
  if (openaiKey) {
    return callOpenAIChat(c.env, systemInstruction, prompt)
  }
  throw new Error('NO_AI_KEY')
}


/**
 * POST /api/ai/generate-course
 * AI 기반 강좌 정보 생성 (관리자 전용)
 */
ai.post('/generate-course', requireAdmin, async (c) => {
  try {
    const body = await c.req.json<{
      topic: string
      target_audience?: string
      difficulty?: 'beginner' | 'intermediate' | 'advanced'
      duration?: number
    }>()

    const { topic, target_audience, difficulty = 'beginner', duration = 30 } = body

    if (!topic) {
      return c.json(errorResponse('주제를 입력해주세요.'), 400)
    }

    // Gemini API 키 확인
    const apiKey = c.env.GEMINI_API_KEY
    const baseURL = c.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta'

    if (!apiKey) {
      return c.json(errorResponse('Gemini API 키가 설정되지 않았습니다. GenSpark에서 API 키를 설정해주세요.'), 400)
    }

    const difficultyMap = {
      'beginner': '초급',
      'intermediate': '중급',
      'advanced': '고급'
    }

    const prompt = `다음 정보를 바탕으로 온라인 강좌를 기획해주세요:

주제: ${topic}
대상: ${target_audience || '일반 성인'}
난이도: ${difficultyMap[difficulty]}
수강 기간: ${duration}일

다음 JSON 형식으로 응답해주세요:
{
  "title": "강좌 제목 (50자 이내)",
  "description": "강좌 설명 (200자 이내)",
  "course_type": "general 또는 certificate",
  "lessons": [
    {
      "lesson_number": 1,
      "title": "차시 제목",
      "description": "차시 설명",
      "video_duration_minutes": 30
    }
  ]
}

**중요**: 
1. title은 매력적이고 명확해야 합니다
2. description은 수강생이 얻을 수 있는 가치를 강조해야 합니다
3. lessons는 최소 5개, 최대 10개로 구성해주세요
4. 각 차시는 논리적 순서로 배열되어야 합니다
5. 한국어로 작성해주세요`

    const systemInstruction = '당신은 온라인 교육 전문가입니다. 효과적인 강좌를 기획하고 구성하는 데 능숙합니다.'

    const content = await callGemini(apiKey, baseURL, prompt, systemInstruction)

    // JSON 파싱 시도
    let courseData
    try {
      // ```json ... ``` 마크다운 블록 제거
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content
      courseData = JSON.parse(jsonStr.trim())
    } catch (error) {
      console.error('JSON parse error:', error)
      return c.json(errorResponse('AI 응답 파싱에 실패했습니다. 다시 시도해주세요.'), 500)
    }

    return c.json(successResponse(courseData, 'AI 기반 강좌가 생성되었습니다.'))

  } catch (error) {
    console.error('Generate course error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

/**
 * POST /api/ai/generate-lesson
 * AI 기반 차시 정보 생성 (관리자 전용)
 */
ai.post('/generate-lesson', requireAdmin, async (c) => {
  try {
    const body = await c.req.json<{
      course_title: string
      lesson_number: number
      topic?: string
    }>()

    const { course_title, lesson_number, topic } = body

    if (!course_title || !lesson_number) {
      return c.json(errorResponse('강좌 제목과 차시 번호를 입력해주세요.'), 400)
    }

    // Gemini API 키 확인
    const apiKey = c.env.GEMINI_API_KEY
    const baseURL = c.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta'

    if (!apiKey) {
      return c.json(errorResponse('Gemini API 키가 설정되지 않았습니다. GenSpark에서 API 키를 설정해주세요.'), 400)
    }

    const prompt = `다음 강좌의 ${lesson_number}차시를 기획해주세요:

강좌 제목: ${course_title}
차시 번호: ${lesson_number}
${topic ? `주제: ${topic}` : ''}

다음 JSON 형식으로 응답해주세요:
{
  "title": "차시 제목 (30자 이내)",
  "description": "차시 설명 (100자 이내)",
  "video_duration_minutes": 추천 영상 시간 (분)
}

**중요**: 
1. title은 명확하고 학습 목표가 드러나야 합니다
2. description은 이 차시에서 배울 내용을 구체적으로 설명해야 합니다
3. video_duration_minutes는 15~60분 사이로 추천해주세요
4. 한국어로 작성해주세요`

    const systemInstruction = '당신은 온라인 교육 전문가입니다. 효과적인 차시를 기획하고 구성하는 데 능숙합니다.'

    const content = await callGemini(apiKey, baseURL, prompt, systemInstruction)

    // JSON 파싱 시도
    let lessonData
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content
      lessonData = JSON.parse(jsonStr.trim())
    } catch (error) {
      console.error('JSON parse error:', error)
      return c.json(errorResponse('AI 응답 파싱에 실패했습니다. 다시 시도해주세요.'), 500)
    }

    return c.json(successResponse(lessonData, 'AI 기반 차시가 생성되었습니다.'))

  } catch (error) {
    console.error('Generate lesson error:', error)
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

/**
 * POST /api/ai/generate-description
 * AI 기반 강좌 설명 생성 (관리자 전용)
 */
ai.post('/generate-description', requireAdmin, async (c) => {
  try {
    const body = await c.req.json<{ title: string }>()
    const { title } = body

    if (!title) {
      return c.json(errorResponse('강좌명을 입력해주세요.'), 400)
    }

    const prompt = `다음 강좌명에 어울리는 온라인 강좌 상세 설명을 작성해주세요.

강좌명: ${title}

요구사항:
- 전체 3~5줄(문단) 내외. 각 줄은 한두 문장 정도로 읽기 좋게 나누세요.
- 강좌 목적, 주요 학습 내용, 수강 대상, 기대 효과를 자연스럽게 포함
- 전문적이면서 친근한 톤, 한국어

JSON 형식으로만 응답:
{
  "description": "줄바꿈(\\n)으로 구분된 설명 전문"
}`

    const systemInstruction = '당신은 온라인 교육 과정 설명 전문가입니다. 주어진 강좌명에 대해 매력적이고 명확한 설명을 작성합니다.'

    const content = await generateTextGeminiOrOpenAI(c, prompt, systemInstruction)

    // JSON 파싱
    let description
    try {
      // 코드 블록 제거
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
      const jsonStr = jsonMatch ? jsonMatch[1] : content

      const parsed = JSON.parse(jsonStr)
      description = parsed.description
    } catch (e) {
      // JSON 파싱 실패 시 전체 텍스트를 설명으로 사용
      description = content.trim()
    }

    return c.json(successResponse({ description }, 'AI 기반 설명이 생성되었습니다.'))

  } catch (error) {
    console.error('Generate description error:', error)
    const msg = error instanceof Error ? error.message : '서버 오류가 발생했습니다.'
    if (msg === 'NO_AI_KEY') {
      return c.json(
        errorResponse(
          'AI 키가 설정되지 않았습니다. Cloudflare에 GEMINI_API_KEY 또는 OPENAI_API_KEY를 설정해 주세요.',
        ),
        503,
      )
    }
    return c.json(errorResponse(msg), 502)
  }
})

/**
 * POST /api/ai/generate-lesson-description
 * AI 기반 차시 설명 생성 (관리자 전용)
 */
ai.post('/generate-lesson-description', requireAdmin, async (c) => {
  try {
    const body = await c.req.json<{ title: string; courseTitle?: string }>()
    const { title, courseTitle } = body

    if (!title) {
      return c.json(errorResponse('차시 제목을 입력해주세요.'), 400)
    }

    const prompt = `다음 차시에 대한 명확하고 구체적인 설명을 작성해주세요:

${courseTitle ? `강좌명: ${courseTitle}` : ''}
차시 제목: ${title}

요구사항:
- 100-150자 내외로 작성
- 이 차시에서 배울 구체적인 내용 포함
- 학습 목표와 핵심 개념 명시
- 학습자 관점에서 작성
- 명확하고 간결한 문장

JSON 형식으로 응답:
{
  "description": "차시 설명"
}`

    const systemInstruction = '당신은 온라인 교육 차시 설명 전문가입니다. 주어진 차시 제목에 대해 학습자가 쉽게 이해할 수 있는 명확한 설명을 작성합니다.'

    const content = await generateTextGeminiOrOpenAI(c, prompt, systemInstruction)

    // JSON 파싱
    let description
    try {
      // 코드 블록 제거
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
      const jsonStr = jsonMatch ? jsonMatch[1] : content

      const parsed = JSON.parse(jsonStr)
      description = parsed.description
    } catch (e) {
      // JSON 파싱 실패 시 전체 텍스트를 설명으로 사용
      description = content.trim()
    }

    return c.json(successResponse({ description }, 'AI 기반 차시 설명이 생성되었습니다.'))

  } catch (error) {
    console.error('Generate lesson description error:', error)
    const msg = error instanceof Error ? error.message : '서버 오류가 발생했습니다.'
    if (msg === 'NO_AI_KEY') {
      return c.json(
        errorResponse(
          'AI 키가 설정되지 않았습니다. Cloudflare에 GEMINI_API_KEY 또는 OPENAI_API_KEY를 설정해 주세요.',
        ),
        503,
      )
    }
    return c.json(errorResponse(msg), 502)
  }
})

export default ai
