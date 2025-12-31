/**
 * AI 기반 차시 일괄 생성 API
 * 
 * 기능:
 * 1. PDF/문서 업로드 → AI 분석 → 차시 자동 분할
 * 2. 영상 파일 여러 개 업로드 → 차시 자동 생성
 * 3. 엑셀/CSV 업로드 → 차시 정보 일괄 등록
 */

import { Hono } from 'hono'
import { Bindings } from '../types/database'
import { successResponse, errorResponse } from '../utils/helpers'
import { requireAdmin } from '../middleware/auth'

const aiBulkLessons = new Hono<{ Bindings: Bindings }>()

/**
 * POST /api/ai-bulk-lessons/analyze-document
 * PDF/문서 업로드 → AI가 내용 분석 → 차시별 분할
 * 
 * Body (multipart/form-data):
 * - file: PDF 또는 문서 파일
 * - course_id: 강좌 ID
 * - lesson_count: 생성할 차시 수 (선택, 기본값: AI가 자동 결정)
 */
aiBulkLessons.post('/analyze-document', requireAdmin, async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File
    const courseId = formData.get('course_id') as string
    const lessonCount = parseInt(formData.get('lesson_count') as string) || 0

    if (!file) {
      return c.json(errorResponse('파일이 필요합니다'), 400)
    }

    if (!courseId) {
      return c.json(errorResponse('강좌 ID가 필요합니다'), 400)
    }

    // 파일 타입 확인
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]

    if (!validTypes.includes(file.type)) {
      return c.json(errorResponse('지원하지 않는 파일 형식입니다. PDF, Word, Text 파일만 가능합니다.'), 400)
    }

    // 파일 내용 추출
    const fileBuffer = await file.arrayBuffer()
    const fileText = new TextDecoder().decode(fileBuffer)

    // OpenAI로 문서 분석 및 차시 분할
    const openaiApiKey = c.env.OPENAI_API_KEY
    const openaiBaseUrl = c.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'

    if (!openaiApiKey) {
      return c.json(errorResponse('OpenAI API 키가 설정되지 않았습니다'), 500)
    }

    const prompt = `다음 문서를 분석하여 학습용 강좌의 차시로 나눠주세요.

문서 내용:
"""
${fileText.slice(0, 10000)}  // 최대 10,000자
"""

${lessonCount > 0 ? `총 ${lessonCount}개의 차시로 나눠주세요.` : '적절한 수의 차시로 나눠주세요 (최소 3개, 최대 20개).'}

각 차시는 다음 형식의 JSON 배열로 반환해주세요:
[
  {
    "lesson_number": 1,
    "title": "차시 제목",
    "description": "차시 설명 (2-3문장)",
    "content": "차시 상세 내용 (마크다운 형식)",
    "video_duration_minutes": 예상 영상 길이(분),
    "order_index": 1
  },
  ...
]

중요:
- 각 차시는 독립적으로 학습 가능해야 합니다
- 차시 제목은 명확하고 구체적으로
- 설명은 학습자가 이해하기 쉽게
- 내용은 마크다운 형식으로 구조화
- JSON만 반환하고 다른 텍스트는 포함하지 마세요`

    const openaiResponse = await fetch(`${openaiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '당신은 교육 콘텐츠 전문가입니다. 문서를 분석하여 효과적인 학습 차시로 나누는 것이 전문입니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    })

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text()
      console.error('OpenAI API error:', error)
      return c.json(errorResponse('AI 분석에 실패했습니다'), 500)
    }

    const openaiData = await openaiResponse.json()
    const aiResponse = openaiData.choices[0].message.content

    // JSON 파싱
    let lessons
    try {
      // JSON 코드 블록 제거
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        lessons = JSON.parse(jsonMatch[0])
      } else {
        lessons = JSON.parse(aiResponse)
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      console.error('AI response:', aiResponse)
      return c.json(errorResponse('AI 응답 파싱에 실패했습니다'), 500)
    }

    // 차시 검증
    if (!Array.isArray(lessons) || lessons.length === 0) {
      return c.json(errorResponse('유효한 차시 데이터를 생성하지 못했습니다'), 500)
    }

    // 강좌 존재 확인
    const { env } = c
    const course = await env.DB.prepare(`
      SELECT id, title FROM courses WHERE id = ?
    `).bind(courseId).first()

    if (!course) {
      return c.json(errorResponse('강좌를 찾을 수 없습니다'), 404)
    }

    return c.json(successResponse({
      course_id: courseId,
      course_title: course.title,
      lessons: lessons,
      total_lessons: lessons.length,
      estimated_duration: lessons.reduce((sum: number, lesson: any) => 
        sum + (lesson.video_duration_minutes || 0), 0
      ),
      message: `${lessons.length}개의 차시가 생성되었습니다. 미리보기 후 저장해주세요.`
    }))

  } catch (error: any) {
    console.error('Document analysis error:', error)
    return c.json(errorResponse(
      error.message || '문서 분석에 실패했습니다'
    ), 500)
  }
})

/**
 * POST /api/ai-bulk-lessons/create-from-videos
 * 영상 파일 여러 개 업로드 → 파일명 기반 차시 자동 생성
 * 
 * Body (multipart/form-data):
 * - files[]: 영상 파일 배열
 * - course_id: 강좌 ID
 * - upload_to_apivideo: api.video에 업로드 여부 (true/false)
 */
aiBulkLessons.post('/create-from-videos', requireAdmin, async (c) => {
  try {
    const formData = await c.req.formData()
    const courseId = formData.get('course_id') as string
    const uploadToApiVideo = formData.get('upload_to_apivideo') === 'true'

    if (!courseId) {
      return c.json(errorResponse('강좌 ID가 필요합니다'), 400)
    }

    // 파일들 수집
    const files: File[] = []
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('files') && value instanceof File) {
        files.push(value)
      }
    }

    if (files.length === 0) {
      return c.json(errorResponse('영상 파일이 필요합니다'), 400)
    }

    // 파일명에서 정보 추출
    const lessons = files.map((file, index) => {
      const filename = file.name.replace(/\.[^/.]+$/, '') // 확장자 제거
      
      // 파일명 패턴 분석: "01_강좌소개.mp4", "1. 기본개념.mp4" 등
      const match = filename.match(/^(\d+)[._\s-]*(.+)$/)
      
      let lessonNumber = index + 1
      let title = filename
      
      if (match) {
        lessonNumber = parseInt(match[1])
        title = match[2].trim()
      }

      return {
        file: file,
        lesson_number: lessonNumber,
        title: title,
        description: `${title} 영상 강의`,
        file_size: file.size,
        file_type: file.type
      }
    })

    // 차시 번호로 정렬
    lessons.sort((a, b) => a.lesson_number - b.lesson_number)

    return c.json(successResponse({
      course_id: courseId,
      lessons: lessons.map(l => ({
        lesson_number: l.lesson_number,
        title: l.title,
        description: l.description,
        file_name: l.file.name,
        file_size: l.file_size,
        file_type: l.file_type
      })),
      total_lessons: lessons.length,
      upload_to_apivideo: uploadToApiVideo,
      message: `${lessons.length}개의 차시가 준비되었습니다. 미리보기 후 저장해주세요.`
    }))

  } catch (error: any) {
    console.error('Video bulk create error:', error)
    return c.json(errorResponse(
      error.message || '영상 파일 처리에 실패했습니다'
    ), 500)
  }
})

/**
 * POST /api/ai-bulk-lessons/save-lessons
 * AI가 생성한 차시들을 DB에 저장
 * 
 * Body:
 * - course_id: 강좌 ID
 * - lessons: 차시 배열
 */
aiBulkLessons.post('/save-lessons', requireAdmin, async (c) => {
  try {
    const { course_id, lessons } = await c.req.json()

    if (!course_id || !lessons || !Array.isArray(lessons)) {
      return c.json(errorResponse('필수 데이터가 누락되었습니다'), 400)
    }

    const { env } = c

    // 트랜잭션으로 일괄 저장
    const results = []
    const errors = []

    for (const lesson of lessons) {
      try {
        const result = await env.DB.prepare(`
          INSERT INTO lessons (
            course_id, lesson_number, title, description, content,
            video_duration_minutes, order_index,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).bind(
          course_id,
          lesson.lesson_number,
          lesson.title,
          lesson.description || '',
          lesson.content || '',
          lesson.video_duration_minutes || 0,
          lesson.order_index || lesson.lesson_number
        ).run()

        results.push({
          lesson_number: lesson.lesson_number,
          title: lesson.title,
          id: result.meta.last_row_id,
          success: true
        })
      } catch (error: any) {
        console.error(`Lesson ${lesson.lesson_number} save error:`, error)
        errors.push({
          lesson_number: lesson.lesson_number,
          title: lesson.title,
          error: error.message
        })
      }
    }

    return c.json(successResponse({
      success_count: results.length,
      error_count: errors.length,
      results: results,
      errors: errors,
      message: `${results.length}개의 차시가 저장되었습니다.`
    }))

  } catch (error: any) {
    console.error('Save lessons error:', error)
    return c.json(errorResponse(
      error.message || '차시 저장에 실패했습니다'
    ), 500)
  }
})

/**
 * GET /api/ai-bulk-lessons/csv-template
 * 차시 일괄 등록용 CSV 템플릿 다운로드
 */
aiBulkLessons.get('/csv-template', requireAdmin, async (c) => {
  const template = `lesson_number,title,description,content,video_url,video_duration_minutes,order_index
1,강좌 소개,첫 번째 차시입니다,강좌의 전체 개요를 설명합니다,,30,1
2,기본 개념,두 번째 차시입니다,기본 개념을 학습합니다,,45,2
3,실습 예제,세 번째 차시입니다,실제 예제를 따라해봅니다,,60,3`

  return new Response(template, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="lessons_template.csv"'
    }
  })
})

/**
 * POST /api/ai-bulk-lessons/upload-csv
 * CSV 파일 업로드 → 차시 일괄 등록
 */
aiBulkLessons.post('/upload-csv', requireAdmin, async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File
    const courseId = formData.get('course_id') as string

    if (!file || !courseId) {
      return c.json(errorResponse('파일과 강좌 ID가 필요합니다'), 400)
    }

    // CSV 파싱
    const csvText = await file.text()
    const lines = csvText.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      return c.json(errorResponse('CSV 파일이 비어있습니다'), 400)
    }

    const headers = lines[0].split(',')
    const lessons = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',')
      const lesson: any = {}
      
      headers.forEach((header, index) => {
        lesson[header.trim()] = values[index]?.trim() || ''
      })

      lessons.push(lesson)
    }

    return c.json(successResponse({
      course_id: courseId,
      lessons: lessons,
      total_lessons: lessons.length,
      message: `${lessons.length}개의 차시 데이터를 불러왔습니다.`
    }))

  } catch (error: any) {
    console.error('CSV upload error:', error)
    return c.json(errorResponse(
      error.message || 'CSV 파일 처리에 실패했습니다'
    ), 500)
  }
})

export default aiBulkLessons
