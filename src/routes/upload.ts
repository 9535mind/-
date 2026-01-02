/**
 * 파일 업로드 관련 API
 * /api/upload/*
 */

import { Hono } from 'hono'
import { Bindings } from '../types/database'
import { successResponse, errorResponse } from '../utils/helpers'
import { requireAdmin } from '../middleware/auth'

const upload = new Hono<{ Bindings: Bindings }>()

/**
 * 로컬 환경 확인 (Cloudflare R2 사용 불가능한 경우)
 */
function isLocalEnvironment(c: any): boolean {
  return !c.env.STORAGE && !c.env.VIDEO_STORAGE
}

/**
 * 파일 저장 헬퍼 함수
 * R2 Storage 없이 lesson_id와 연결하여 DB에 메타데이터만 저장
 * 실제 파일은 외부 URL 또는 YouTube 사용
 */
async function generateVideoMetadata(file: File): Promise<{
  filename: string
  size: number
  mimeType: string
  estimatedDuration: number
}> {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 15)
  const extension = file.name.split('.').pop()
  const filename = `${timestamp}-${randomString}.${extension}`
  
  // 영상 duration 추정 (임시: 파일 크기 기반)
  const estimatedDuration = Math.max(1, Math.ceil(file.size / (1024 * 1024 * 5))) // 5MB당 1분으로 추정
  
  return {
    filename,
    size: file.size,
    mimeType: file.type,
    estimatedDuration
  }
}

/**
 * POST /api/upload/image
 * 이미지 업로드 (관리자 전용)
 * Cloudflare R2에 이미지 저장
 */
upload.post('/image', requireAdmin, async (c) => {
  try {
    // FormData에서 파일 가져오기
    const formData = await c.req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return c.json(errorResponse('파일이 없습니다.'), 400)
    }

    // 파일 유효성 검사
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return c.json(errorResponse('지원하지 않는 파일 형식입니다. (JPG, PNG, GIF, WebP만 가능)'), 400)
    }

    // 파일 크기 제한 (5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return c.json(errorResponse('파일 크기는 5MB 이하여야 합니다.'), 400)
    }

    // R2 Storage 사용 가능 여부 확인
    if (!c.env.R2) {
      console.warn('[Upload] R2 바인딩이 없습니다. Placeholder 사용')
      const placeholderUrl = `https://via.placeholder.com/800x600/667eea/ffffff?text=${encodeURIComponent(file.name)}`
      return c.json(successResponse({
        url: placeholderUrl,
        filename: file.name,
        size: file.size,
        type: file.type
      }, '이미지가 업로드되었습니다. (R2 미설정 - Placeholder)'))
    }

    // 파일 이름 생성
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop()
    const filename = `images/${timestamp}-${randomString}.${extension}`

    // R2에 파일 업로드
    const arrayBuffer = await file.arrayBuffer()
    await c.env.R2.put(filename, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    })

    // 공개 URL 생성 (R2 커스텀 도메인 또는 Cloudflare 도메인)
    const publicUrl = `https://pub-e65cd92cfb3a4f1ba4d6b67d8c88e689.r2.dev/${filename}`

    console.log(`[Upload] 이미지 R2 업로드 성공: ${publicUrl}`)

    return c.json(successResponse({
      url: publicUrl,
      filename: file.name,
      size: file.size,
      type: file.type
    }, '이미지가 업로드되었습니다.'))

  } catch (error) {
    console.error('Upload image error:', error)
    return c.json(errorResponse('이미지 업로드에 실패했습니다.'), 500)
  }
})

/**
 * POST /api/upload/video
 * 영상 업로드 (관리자 전용)
 * R2 없이 메타데이터만 저장 + lesson_id와 연결
 */
upload.post('/video', requireAdmin, async (c) => {
  try {
    // FormData에서 파일 가져오기
    const formData = await c.req.formData()
    const file = formData.get('file') as File | null
    const lessonIdStr = formData.get('lesson_id') as string | null

    if (!file) {
      return c.json(errorResponse('파일이 없습니다.'), 400)
    }

    // lesson_id 확인 (선택적)
    const lessonId = lessonIdStr ? parseInt(lessonIdStr) : null

    // 파일 유효성 검사
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
    const allowedExtensions = ['.mp4', '.webm', '.mov', '.avi']
    const fileExtension = '.' + (file.name.split('.').pop()?.toLowerCase() || '')
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      return c.json(errorResponse('지원하지 않는 파일 형식입니다. (MP4, WebM, MOV, AVI만 가능)'), 400)
    }

    // 파일 크기 제한 (50MB) - R2 없으므로 제한
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return c.json(errorResponse('파일 크기는 50MB 이하여야 합니다. 대용량 영상은 YouTube URL을 사용하세요.'), 400)
    }

    console.log('[VIDEO UPLOAD] Starting upload:', {
      originalName: file.name,
      size: file.size,
      type: file.type,
      lessonId
    })

    // 메타데이터 생성
    const metadata = await generateVideoMetadata(file)

    // lessonId가 있으면 DB 업데이트
    if (lessonId) {
      const { DB } = c.env
      
      // lesson에 영상 메타데이터 저장
      await DB.prepare(`
        UPDATE lessons
        SET 
          video_file_name = ?,
          video_file_size = ?,
          video_mime_type = ?,
          video_uploaded_at = datetime('now'),
          video_type = 'upload',
          duration_minutes = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).bind(
        metadata.filename,
        metadata.size,
        metadata.mimeType,
        metadata.estimatedDuration,
        lessonId
      ).run()

      console.log('[VIDEO UPLOAD] Metadata saved to lesson:', lessonId)
    }

    // 임시 URL (실제로는 외부 스토리지 또는 YouTube 사용 권장)
    const placeholderUrl = `#uploaded-${metadata.filename}`

    return c.json(successResponse({
      url: placeholderUrl,
      filename: metadata.filename,
      size: metadata.size,
      type: metadata.mimeType,
      duration: metadata.estimatedDuration,
      originalName: file.name,
      lessonId: lessonId,
      message: 'R2 Storage 활성화 시 실제 업로드 가능. 현재는 메타데이터만 저장됨.'
    }, '영상 메타데이터가 저장되었습니다. YouTube URL 또는 외부 URL을 사용해주세요.'))

  } catch (error) {
    console.error('Upload video error:', error)
    return c.json(errorResponse('영상 업로드에 실패했습니다.'), 500)
  }
})

/**
 * GET /api/storage/:path
 * R2 스토리지에서 파일 가져오기
 */
upload.get('/storage/*', async (c) => {
  try {
    const { STORAGE } = c.env
    
    if (!STORAGE) {
      return c.notFound()
    }

    // URL에서 파일 경로 추출
    const path = c.req.path.replace('/api/storage/', '')

    // R2에서 파일 가져오기
    const object = await STORAGE.get(path)

    if (!object) {
      return c.notFound()
    }

    // 파일 반환
    const headers = new Headers()
    if (object.httpMetadata?.contentType) {
      headers.set('Content-Type', object.httpMetadata.contentType)
    }
    headers.set('Cache-Control', 'public, max-age=31536000')

    return new Response(object.body, { headers })

  } catch (error) {
    console.error('Get storage file error:', error)
    return c.notFound()
  }
})

/**
 * GET /api/storage/videos/:filename
 * R2 VIDEO_STORAGE에서 영상 파일 가져오기
 */
upload.get('/storage/videos/*', async (c) => {
  try {
    const { VIDEO_STORAGE } = c.env
    
    if (!VIDEO_STORAGE) {
      return c.notFound()
    }

    // URL에서 파일 경로 추출
    const path = c.req.path.replace('/api/storage/', '')

    console.log('[VIDEO STORAGE] Fetching:', path)

    // R2에서 파일 가져오기
    const object = await VIDEO_STORAGE.get(path)

    if (!object) {
      console.log('[VIDEO STORAGE] Not found:', path)
      return c.notFound()
    }

    console.log('[VIDEO STORAGE] Found:', path, 'size:', object.size)

    // Range 요청 지원 (스트리밍을 위해 필요)
    const range = c.req.header('Range')
    
    if (range) {
      // Range 요청 처리
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : object.size - 1
      const chunkSize = end - start + 1

      return new Response(object.body, {
        status: 206,
        headers: {
          'Content-Type': object.httpMetadata?.contentType || 'video/mp4',
          'Content-Length': chunkSize.toString(),
          'Content-Range': `bytes ${start}-${end}/${object.size}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000',
        }
      })
    }

    // 전체 파일 반환
    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'video/mp4',
        'Content-Length': object.size.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
      }
    })

  } catch (error) {
    console.error('Get video storage error:', error)
    return c.notFound()
  }
})

/**
 * DELETE /api/storage/videos/:path
 * R2 VIDEO_STORAGE에서 영상 파일 삭제 (관리자 전용)
 */
upload.delete('/storage/videos/*', requireAdmin, async (c) => {
  try {
    const { VIDEO_STORAGE } = c.env
    
    if (!VIDEO_STORAGE) {
      return c.json(errorResponse('영상 스토리지가 설정되지 않았습니다.'), 500)
    }

    // URL에서 파일 경로 추출
    const path = c.req.path.replace('/api/storage/', '')

    console.log('[VIDEO DELETE] Deleting:', path)

    // R2에서 파일 존재 확인
    const object = await VIDEO_STORAGE.get(path)
    
    if (!object) {
      console.log('[VIDEO DELETE] Not found:', path)
      return c.json(errorResponse('파일을 찾을 수 없습니다.'), 404)
    }

    // R2에서 파일 삭제
    await VIDEO_STORAGE.delete(path)
    
    console.log('[VIDEO DELETE] Deleted successfully:', path)

    return c.json(successResponse({ 
      path: path,
      message: '영상이 삭제되었습니다.' 
    }))

  } catch (error) {
    console.error('Delete video storage error:', error)
    return c.json(errorResponse('영상 삭제 중 오류가 발생했습니다.'), 500)
  }
})

export default upload
