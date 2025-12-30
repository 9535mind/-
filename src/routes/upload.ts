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
 * POST /api/upload/image
 * 이미지 업로드 (관리자 전용)
 * Cloudflare R2에 이미지 저장
 */
upload.post('/image', requireAdmin, async (c) => {
  try {
    const { STORAGE } = c.env
    
    if (!STORAGE) {
      return c.json(errorResponse('스토리지가 설정되지 않았습니다.'), 500)
    }

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

    // 파일명 생성 (타임스탬프 + 랜덤 문자열)
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const extension = file.name.split('.').pop() || 'jpg'
    const filename = `images/${timestamp}-${randomStr}.${extension}`

    // R2에 업로드
    const arrayBuffer = await file.arrayBuffer()
    await STORAGE.put(filename, arrayBuffer, {
      httpMetadata: {
        contentType: file.type
      }
    })

    // 공개 URL 생성 (실제 프로덕션에서는 Custom Domain 사용)
    // 로컬 개발: 임시 URL
    // 프로덕션: https://storage.yourdomain.com/filename
    const imageUrl = `/api/storage/${filename}`

    return c.json(successResponse({
      url: imageUrl,
      filename: filename,
      size: file.size,
      type: file.type
    }, '이미지가 업로드되었습니다.'))

  } catch (error) {
    console.error('Upload image error:', error)
    return c.json(errorResponse('이미지 업로드에 실패했습니다.'), 500)
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

export default upload

/**
 * POST /api/upload/video
 * 영상 업로드 (관리자 전용)
 * Cloudflare R2에 영상 저장 + 메타데이터 자동 추출
 */
upload.post('/video', requireAdmin, async (c) => {
  try {
    const { VIDEO_STORAGE } = c.env
    
    if (!VIDEO_STORAGE) {
      return c.json(errorResponse('영상 스토리지가 설정되지 않았습니다.'), 500)
    }

    // FormData에서 파일 가져오기
    const formData = await c.req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return c.json(errorResponse('파일이 없습니다.'), 400)
    }

    // 파일 유효성 검사
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
    const allowedExtensions = ['.mp4', '.webm', '.mov', '.avi']
    const fileExtension = '.' + (file.name.split('.').pop()?.toLowerCase() || '')
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      return c.json(errorResponse('지원하지 않는 파일 형식입니다. (MP4, WebM, MOV, AVI만 가능)'), 400)
    }

    // 파일 크기 제한 (500MB)
    const maxSize = 500 * 1024 * 1024
    if (file.size > maxSize) {
      return c.json(errorResponse('파일 크기는 500MB 이하여야 합니다.'), 400)
    }

    // 파일명 생성 (타임스탬프 + 랜덤 문자열)
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 15)
    const extension = fileExtension.substring(1) || 'mp4'
    const filename = `videos/${timestamp}-${randomStr}.${extension}`

    console.log('[VIDEO UPLOAD] Starting upload:', {
      originalName: file.name,
      size: file.size,
      type: file.type,
      filename: filename
    })

    // R2에 업로드
    const arrayBuffer = await file.arrayBuffer()
    await VIDEO_STORAGE.put(filename, arrayBuffer, {
      httpMetadata: {
        contentType: file.type || 'video/mp4'
      }
    })

    console.log('[VIDEO UPLOAD] Upload successful:', filename)

    // 영상 메타데이터 추출 (재생 시간)
    // TODO: 실제 영상 파일에서 duration 추출 (현재는 파일 크기로 추정)
    // Cloudflare Workers에서는 FFmpeg를 실행할 수 없으므로,
    // 클라이언트에서 추출하거나 외부 서비스 사용 필요
    const estimatedDuration = Math.ceil(file.size / (1024 * 1024)) // 임시: 1MB당 1분으로 추정

    // 공개 URL 생성
    const videoUrl = filename // R2 상대 경로 저장 (GET /api/storage/videos/:filename으로 접근)

    return c.json(successResponse({
      url: videoUrl,
      filename: filename,
      size: file.size,
      type: file.type,
      duration: estimatedDuration,
      originalName: file.name
    }, '영상이 업로드되었습니다.'))

  } catch (error) {
    console.error('Upload video error:', error)
    return c.json(errorResponse('영상 업로드에 실패했습니다.'), 500)
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
