/**
 * 영상 관리 API 라우트
 * /api/videos/*
 * Cloudflare R2 기반 커스텀 비디오 플레이어 시스템
 */

import { Hono } from 'hono'
import { Bindings } from '../types/database'
import { successResponse, errorResponse } from '../utils/helpers'
import { requireAuth } from '../middleware/auth'

const videos = new Hono<{ Bindings: Bindings }>()

/**
 * POST /api/videos/upload-url
 * 영상 업로드용 임시 URL 생성 (관리자 전용)
 */
videos.post('/upload-url', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    
    // 관리자 권한 확인
    if (user.role !== 'admin') {
      return c.json(errorResponse('관리자 권한이 필요합니다.'), 403)
    }

    const { filename, content_type } = await c.req.json<{
      filename: string
      content_type: string
    }>()

    if (!filename) {
      return c.json(errorResponse('파일명이 필요합니다.'), 400)
    }

    // 파일 확장자 체크
    const validExtensions = ['.mp4', '.webm', '.mov', '.avi']
    const hasValidExtension = validExtensions.some(ext => filename.toLowerCase().endsWith(ext))
    
    if (!hasValidExtension) {
      return c.json(errorResponse('지원하지 않는 파일 형식입니다. (MP4, WebM, MOV, AVI만 가능)'), 400)
    }

    // 고유한 파일명 생성 (타임스탬프 + 랜덤)
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const extension = filename.substring(filename.lastIndexOf('.'))
    const uniqueFilename = `videos/${timestamp}-${randomId}${extension}`

    return c.json(successResponse({
      upload_key: uniqueFilename,
      filename: filename,
      message: '업로드 준비 완료. 파일을 선택하여 업로드하세요.'
    }))

  } catch (error) {
    console.error('Upload URL generation error:', error)
    return c.json(errorResponse('업로드 URL 생성에 실패했습니다.'), 500)
  }
})

/**
 * POST /api/videos/upload
 * 직접 영상 파일 업로드 (멀티파트 폼)
 */
videos.post('/upload', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    
    if (user.role !== 'admin') {
      return c.json(errorResponse('관리자 권한이 필요합니다.'), 403)
    }

    // 멀티파트 폼 데이터 파싱
    const formData = await c.req.formData()
    const file = formData.get('video') as File
    
    if (!file) {
      return c.json(errorResponse('영상 파일이 필요합니다.'), 400)
    }

    // 파일 확장자 체크
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
    if (!validTypes.includes(file.type)) {
      return c.json(errorResponse('지원하지 않는 파일 형식입니다. (MP4, WebM, MOV, AVI만 가능)'), 400)
    }

    // 파일 크기 체크 (500MB 제한)
    const maxSize = 500 * 1024 * 1024
    if (file.size > maxSize) {
      return c.json(errorResponse('파일 크기는 500MB를 초과할 수 없습니다.'), 400)
    }

    // 고유한 파일명 생성
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const extension = file.name.substring(file.name.lastIndexOf('.'))
    const uniqueFilename = `videos/${timestamp}-${randomId}${extension}`

    // ArrayBuffer로 변환
    const fileData = await file.arrayBuffer()

    // R2에 업로드
    const { VIDEO_STORAGE } = c.env
    await VIDEO_STORAGE.put(uniqueFilename, fileData, {
      httpMetadata: {
        contentType: file.type
      }
    })

    return c.json(successResponse({
      video_key: uniqueFilename,
      filename: file.name,
      size: file.size,
      content_type: file.type,
      message: '영상이 업로드되었습니다.'
    }))

  } catch (error) {
    console.error('Video upload error:', error)
    return c.json(errorResponse('영상 업로드에 실패했습니다.'), 500)
  }
})

/**
 * PUT /api/videos/upload/:key
 * 실제 영상 파일 업로드 (청크 방식)
 */
videos.put('/upload/:key', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    
    if (user.role !== 'admin') {
      return c.json(errorResponse('관리자 권한이 필요합니다.'), 403)
    }

    const key = c.req.param('key')
    const { VIDEO_STORAGE } = c.env

    // 요청 본문을 ArrayBuffer로 읽기
    const fileData = await c.req.arrayBuffer()

    if (!fileData || fileData.byteLength === 0) {
      return c.json(errorResponse('파일 데이터가 없습니다.'), 400)
    }

    // 파일 크기 체크 (500MB 제한)
    const maxSize = 500 * 1024 * 1024 // 500MB
    if (fileData.byteLength > maxSize) {
      return c.json(errorResponse('파일 크기는 500MB를 초과할 수 없습니다.'), 400)
    }

    // R2에 업로드
    await VIDEO_STORAGE.put(key, fileData, {
      httpMetadata: {
        contentType: c.req.header('content-type') || 'video/mp4'
      }
    })

    return c.json(successResponse({
      key,
      size: fileData.byteLength,
      message: '영상이 업로드되었습니다.'
    }))

  } catch (error) {
    console.error('Video upload error:', error)
    return c.json(errorResponse('영상 업로드에 실패했습니다.'), 500)
  }
})

/**
 * POST /api/videos/lesson
 * 차시에 영상 연결
 */
videos.post('/lesson', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    
    if (user.role !== 'admin') {
      return c.json(errorResponse('관리자 권한이 필요합니다.'), 403)
    }

    const { lesson_id, video_key, duration_minutes } = await c.req.json<{
      lesson_id: number
      video_key: string
      duration_minutes: number
    }>()

    if (!lesson_id || !video_key) {
      return c.json(errorResponse('필수 정보가 누락되었습니다.'), 400)
    }

    const { DB } = c.env

    // 차시 존재 확인
    const lesson = await DB.prepare(`
      SELECT id FROM lessons WHERE id = ?
    `).bind(lesson_id).first()

    if (!lesson) {
      return c.json(errorResponse('존재하지 않는 차시입니다.'), 404)
    }

    // 차시 정보 업데이트
    await DB.prepare(`
      UPDATE lessons 
      SET video_provider = 'r2',
          video_url = ?,
          video_duration_minutes = ?,
          content_type = 'video',
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(video_key, duration_minutes || 0, lesson_id).run()

    return c.json(successResponse({
      lesson_id,
      video_key,
      message: '영상이 차시에 등록되었습니다.'
    }))

  } catch (error) {
    console.error('Link video to lesson error:', error)
    return c.json(errorResponse('영상 등록에 실패했습니다.'), 500)
  }
})

/**
 * GET /api/videos/play/:lesson_id
 * 영상 재생용 임시 URL 생성 (학생용)
 */
videos.get('/play/:lesson_id', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const lessonId = parseInt(c.req.param('lesson_id'))
    const { DB } = c.env

    // 차시 정보 조회
    const lesson = await DB.prepare(`
      SELECT l.*, c.id as course_id, c.title as course_title
      FROM lessons l
      JOIN courses c ON l.course_id = c.id
      WHERE l.id = ? AND l.status = 'active'
    `).bind(lessonId).first<any>()

    if (!lesson) {
      return c.json(errorResponse('존재하지 않는 차시입니다.'), 404)
    }

    // 무료 미리보기가 아닌 경우 수강권 확인
    if (lesson.is_free_preview !== 1) {
      const enrollment = await DB.prepare(`
        SELECT id, status, end_date
        FROM enrollments
        WHERE user_id = ? AND course_id = ? AND status = 'active'
      `).bind(user.id, lesson.course_id).first<any>()

      if (!enrollment) {
        return c.json(errorResponse('수강권이 없습니다.'), 403)
      }

      // 수강 기간 확인
      const endDate = new Date(enrollment.end_date)
      if (endDate < new Date()) {
        return c.json(errorResponse('수강 기간이 만료되었습니다.'), 403)
      }
    }

    // 영상 URL이 R2인 경우
    if (lesson.video_provider === 'r2' && lesson.video_url) {
      // 임시 URL 생성은 프론트엔드에서 처리
      return c.json(successResponse({
        lesson_id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        video_key: lesson.video_url,
        duration_minutes: lesson.video_duration_minutes,
        course_title: lesson.course_title,
        video_provider: 'r2'
      }))
    }

    // 외부 영상 (Kollus 등)
    if (lesson.video_url) {
      return c.json(successResponse({
        lesson_id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        video_url: lesson.video_url,
        duration_minutes: lesson.video_duration_minutes,
        course_title: lesson.course_title,
        video_provider: lesson.video_provider || 'external'
      }))
    }

    return c.json(errorResponse('영상 정보가 없습니다.'), 404)

  } catch (error) {
    console.error('Get video play info error:', error)
    return c.json(errorResponse('영상 정보 조회에 실패했습니다.'), 500)
  }
})

/**
 * GET /api/videos/stream/:key
 * R2에서 영상 스트리밍 (Range 요청 지원)
 */
videos.get('/stream/:key', requireAuth, async (c) => {
  try {
    const key = c.req.param('key')
    const { VIDEO_STORAGE, DB } = c.env
    const user = c.get('user')

    // 권한 확인: 차시 정보 조회
    const lesson = await DB.prepare(`
      SELECT l.*, c.id as course_id
      FROM lessons l
      JOIN courses c ON l.course_id = c.id
      WHERE l.video_url = ? AND l.status = 'active'
    `).bind(key).first<any>()

    if (!lesson) {
      return c.json(errorResponse('존재하지 않는 영상입니다.'), 404)
    }

    // 무료 미리보기가 아닌 경우 수강권 확인
    if (lesson.is_free_preview !== 1) {
      const enrollment = await DB.prepare(`
        SELECT id, status, end_date
        FROM enrollments
        WHERE user_id = ? AND course_id = ? AND status = 'active'
      `).bind(user.id, lesson.course_id).first<any>()

      if (!enrollment) {
        return new Response('Unauthorized', { status: 403 })
      }

      const endDate = new Date(enrollment.end_date)
      if (endDate < new Date()) {
        return new Response('Enrollment expired', { status: 403 })
      }
    }

    // R2에서 객체 가져오기
    const object = await VIDEO_STORAGE.get(key)

    if (!object) {
      return new Response('Video not found', { status: 404 })
    }

    // Range 요청 지원
    const range = c.req.header('range')
    
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : object.size - 1
      const chunkSize = (end - start) + 1

      const headers = new Headers({
        'Content-Range': `bytes ${start}-${end}/${object.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
        'Content-Type': object.httpMetadata?.contentType || 'video/mp4',
        'Cache-Control': 'private, max-age=3600'
      })

      // Range 요청은 object.slice를 사용해야 함
      const rangeObject = await VIDEO_STORAGE.get(key, {
        range: { offset: start, length: chunkSize }
      })

      if (!rangeObject) {
        return new Response('Range not satisfiable', { status: 416 })
      }

      return new Response(rangeObject.body, {
        status: 206,
        headers
      })
    }

    // 전체 영상 반환
    const headers = new Headers({
      'Content-Length': object.size.toString(),
      'Content-Type': object.httpMetadata?.contentType || 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600'
    })

    return new Response(object.body, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('Video streaming error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
})

/**
 * DELETE /api/videos/:key
 * 영상 삭제 (관리자 전용)
 */
videos.delete('/:key', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    
    if (user.role !== 'admin') {
      return c.json(errorResponse('관리자 권한이 필요합니다.'), 403)
    }

    const key = c.req.param('key')
    const { VIDEO_STORAGE, DB } = c.env

    // 해당 영상을 사용하는 차시가 있는지 확인
    const lessonsUsingVideo = await DB.prepare(`
      SELECT COUNT(*) as count
      FROM lessons
      WHERE video_url = ?
    `).bind(key).first<{ count: number }>()

    if (lessonsUsingVideo && lessonsUsingVideo.count > 0) {
      return c.json(errorResponse('이 영상을 사용 중인 차시가 있습니다. 먼저 차시에서 영상을 제거해주세요.'), 400)
    }

    // R2에서 삭제
    await VIDEO_STORAGE.delete(key)

    return c.json(successResponse(null, '영상이 삭제되었습니다.'))

  } catch (error) {
    console.error('Video delete error:', error)
    return c.json(errorResponse('영상 삭제에 실패했습니다.'), 500)
  }
})

export default videos
