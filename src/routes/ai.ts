/**
 * AI 도우미 API
 * /api/ai/*
 */

import { Hono } from 'hono'
import { Bindings } from '../types/database'
import { successResponse, errorResponse } from '../utils/helpers'
import { requireAdmin } from '../middleware/auth'

const ai = new Hono<{ Bindings: Bindings }>()

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

    // OpenAI API 키 확인
    const apiKey = c.env.OPENAI_API_KEY
    const baseURL = c.env.OPENAI_BASE_URL || 'https://www.genspark.ai/api/llm_proxy/v1'

    if (!apiKey) {
      return c.json(errorResponse('OpenAI API 키가 설정되지 않았습니다. GenSpark에서 API 키를 설정해주세요.'), 400)
    }

    // OpenAI API 호출 (fetch 사용 - Cloudflare Workers 환경)
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

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-5',
        messages: [
          { role: 'system', content: '당신은 온라인 교육 전문가입니다. 효과적인 강좌를 기획하고 구성하는 데 능숙합니다.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenAI API error:', error)
      return c.json(errorResponse('AI 생성에 실패했습니다.'), 500)
    }

    const data = await response.json()
    const content = data.choices[0].message.content

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

    // OpenAI API 키 확인
    const apiKey = c.env.OPENAI_API_KEY
    const baseURL = c.env.OPENAI_BASE_URL || 'https://www.genspark.ai/api/llm_proxy/v1'

    if (!apiKey) {
      return c.json(errorResponse('OpenAI API 키가 설정되지 않았습니다. GenSpark에서 API 키를 설정해주세요.'), 400)
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

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-5',
        messages: [
          { role: 'system', content: '당신은 온라인 교육 전문가입니다. 효과적인 차시를 기획하고 구성하는 데 능숙합니다.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenAI API error:', error)
      return c.json(errorResponse('AI 생성에 실패했습니다.'), 500)
    }

    const data = await response.json()
    const content = data.choices[0].message.content

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

    // OpenAI API 키 확인
    const apiKey = c.env.OPENAI_API_KEY
    const baseURL = c.env.OPENAI_BASE_URL || 'https://www.genspark.ai/api/llm_proxy/v1'

    if (!apiKey) {
      return c.json(errorResponse('OpenAI API 키가 설정되지 않았습니다.'), 400)
    }

    const prompt = `다음 강좌명에 대한 매력적인 강좌 설명을 작성해주세요:

강좌명: ${title}

요구사항:
- 200-300자 내외로 작성
- 강좌의 목적과 주요 학습 내용 포함
- 수강 대상과 기대 효과 포함
- 전문적이면서도 친근한 톤
- 명확하고 간결한 문장

JSON 형식으로 응답:
{
  "description": "강좌 설명"
}`

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '당신은 온라인 교육 과정 설명 전문가입니다. 주어진 강좌명에 대해 매력적이고 명확한 설명을 작성합니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI API error:', errorText)
      return c.json(errorResponse('AI 생성에 실패했습니다.'), 500)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      return c.json(errorResponse('AI 응답을 받지 못했습니다.'), 500)
    }

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
    return c.json(errorResponse('서버 오류가 발생했습니다.'), 500)
  }
})

export default ai
