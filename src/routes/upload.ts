/**
 * 파일 업로드 관련 API
 * /api/upload/*
 */

import { Hono } from 'hono'
import { Bindings } from '../types/database'
import { successResponse, errorResponse } from '../utils/helpers'
import { requireAdmin } from '../middleware/auth'
import { uploadImageFileToR2 } from '../utils/r2-image-upload'
import { uploadVideoFileToR2 } from '../utils/r2-video-upload'

const upload = new Hono<{ Bindings: Bindings }>()

/**
 * 로컬 환경 확인 (Cloudflare R2 사용 불가능한 경우)
 */
function isLocalEnvironment(c: { env: Bindings }): boolean {
  return !c.env.R2
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

    if (!c.env.R2) {
      console.warn('[Upload] R2 바인딩이 없습니다. Placeholder 사용')
      const placeholderUrl = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect fill='%23667eea' width='800' height='600'/%3E%3Ctext fill='%23ffffff' font-family='Arial' font-size='24' text-anchor='middle' x='400' y='300'%3E${encodeURIComponent(file.name)}%3C/text%3E%3C/svg%3E`
      return c.json(successResponse({
        url: placeholderUrl,
        filename: file.name,
        size: file.size,
        type: file.type
      }, '이미지가 업로드되었습니다. (R2 미설정 - Placeholder)'))
    }

    try {
      const { url: publicUrl } = await uploadImageFileToR2(c.env, file, 'images')
      console.log(`[Upload] 이미지 R2 업로드 성공: ${publicUrl}`)
      return c.json(successResponse({
        url: publicUrl,
        filename: file.name,
        size: file.size,
        type: file.type
      }, '이미지가 업로드되었습니다.'))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg === 'UNSUPPORTED_TYPE') {
        return c.json(errorResponse('지원하지 않는 파일 형식입니다. (JPG, PNG, GIF, WebP만 가능)'), 400)
      }
      if (msg === 'FILE_TOO_LARGE') {
        return c.json(errorResponse('파일 크기는 5MB 이하여야 합니다.'), 400)
      }
      throw e
    }

  } catch (error) {
    console.error('Upload image error:', error)
    return c.json(errorResponse('이미지 업로드에 실패했습니다.'), 500)
  }
})

/**
 * POST /api/upload/video
 * 영상 업로드 (관리자 전용) — R2에 저장 후 lessons.video_url·video_type=R2 반영
 */
upload.post('/video', requireAdmin, async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File | null
    const lessonIdStr = formData.get('lesson_id') as string | null

    if (!file) {
      return c.json(errorResponse('파일이 없습니다.'), 400)
    }

    const lessonId = lessonIdStr ? parseInt(lessonIdStr, 10) : null

    if (!c.env.R2) {
      return c.json(
        errorResponse('동영상 업로드(R2)가 설정되지 않았습니다. 유튜브 링크로 등록해 주세요.'),
        503,
      )
    }

    const allowedExtensions = ['.mp4', '.webm', '.mov', '.avi', '.m4v']
    const fileExtension = '.' + (file.name.split('.').pop()?.toLowerCase() || '')
    if (!allowedExtensions.includes(fileExtension)) {
      return c.json(errorResponse('지원하지 않는 파일 형식입니다. (MP4, WebM, MOV, AVI 등)'), 400)
    }

    console.log('[VIDEO UPLOAD] R2 upload:', {
      originalName: file.name,
      size: file.size,
      type: file.type,
      lessonId,
    })

    let publicUrl: string
    try {
      const { url } = await uploadVideoFileToR2(c.env, file, 'courses')
      publicUrl = url
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg === 'UNSUPPORTED_VIDEO_TYPE') {
        return c.json(errorResponse('지원하지 않는 동영상 형식입니다.'), 400)
      }
      if (msg === 'VIDEO_TOO_LARGE') {
        return c.json(errorResponse('파일이 너무 큽니다. (최대 500MB)'), 400)
      }
      throw e
    }

    const estimatedDuration = Math.max(1, Math.ceil(file.size / (1024 * 1024 * 5)))

    if (lessonId && Number.isFinite(lessonId)) {
      const { DB } = c.env
      await DB.prepare(
        `
        UPDATE lessons
        SET 
          video_url = ?,
          video_type = 'R2',
          video_file_name = ?,
          video_file_size = ?,
          video_mime_type = ?,
          video_uploaded_at = datetime('now'),
          duration_minutes = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `,
      )
        .bind(
          publicUrl,
          file.name,
          file.size,
          file.type || 'video/mp4',
          estimatedDuration,
          lessonId,
        )
        .run()
    }

    return c.json(
      successResponse(
        {
          url: publicUrl,
          filename: file.name,
          size: file.size,
          type: file.type || 'video/mp4',
          duration: estimatedDuration,
          originalName: file.name,
          lessonId,
        },
        '영상이 업로드되었습니다.',
      ),
    )
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
    const bucket = c.env.R2
    if (!bucket) {
      return c.notFound()
    }

    // URL에서 파일 경로 추출
    const path = c.req.path.replace('/api/storage/', '')

    // R2에서 파일 가져오기
    const object = await bucket.get(path)

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
 * R2(c.env.R2)에서 영상 파일 가져오기
 */
upload.get('/storage/videos/*', async (c) => {
  try {
    const bucket = c.env.R2
    if (!bucket) {
      return c.notFound()
    }

    // URL에서 파일 경로 추출
    const path = c.req.path.replace('/api/storage/', '')

    console.log('[VIDEO STORAGE] Fetching:', path)

    // R2에서 파일 가져오기
    const object = await bucket.get(path)

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
 * R2(c.env.R2)에서 영상 파일 삭제 (관리자 전용)
 */
upload.delete('/storage/videos/*', requireAdmin, async (c) => {
  try {
    const bucket = c.env.R2
    if (!bucket) {
      return c.json(errorResponse('영상 스토리지가 설정되지 않았습니다.'), 500)
    }

    // URL에서 파일 경로 추출
    const path = c.req.path.replace('/api/storage/', '')

    console.log('[VIDEO DELETE] Deleting:', path)

    // R2에서 파일 존재 확인
    const object = await bucket.get(path)
    
    if (!object) {
      console.log('[VIDEO DELETE] Not found:', path)
      return c.json(errorResponse('파일을 찾을 수 없습니다.'), 404)
    }

    // R2에서 파일 삭제
    await bucket.delete(path)
    
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
