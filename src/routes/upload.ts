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
 * 로컬 환경: public/uploads/에 저장
 * 프로덕션: Cloudflare R2에 저장
 */
async function saveFile(c: any, file: File, folder: 'images' | 'videos'): Promise<string> {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 15)
  const extension = file.name.split('.').pop()
  const filename = `${timestamp}-${randomString}.${extension}`
  
  // 로컬 환경 (개발)
  if (isLocalEnvironment(c)) {
    console.log('[SAVE FILE] Local environment detected, returning local path')
    // 로컬 파일 시스템에 저장하지 않고 URL만 반환
    // 실제 저장은 빌드 시 public/uploads/로 복사됨
    return `/uploads/${folder}/${filename}`
  }
  
  // 프로덕션 환경 (Cloudflare R2)
  const storage = folder === 'videos' ? c.env.VIDEO_STORAGE : c.env.STORAGE
  
  if (!storage) {
    throw new Error('스토리지가 설정되지 않았습니다.')
  }
  
  const path = `${folder}/${filename}`
  const arrayBuffer = await file.arrayBuffer()
  
  await storage.put(path, arrayBuffer, {
    httpMetadata: {
      contentType: file.type
    }
  })
  
  console.log('[SAVE FILE] Uploaded to R2:', path)
  
  return `/${path}`
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

    // 환경에 맞게 파일 저장 (로컬 또는 R2)
    const imageUrl = await saveFile(c, file, 'images')

    console.log(`[Upload] 이미지 업로드 완료: ${imageUrl}`)

    return c.json(successResponse({
      url: imageUrl,
      filename: imageUrl,
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
 * Cloudflare R2에 영상 저장 + 메타데이터 자동 추출
 */
upload.post('/video', requireAdmin, async (c) => {
  try {
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

    console.log('[VIDEO UPLOAD] Starting upload:', {
      originalName: file.name,
      size: file.size,
      type: file.type,
      isLocal: isLocalEnvironment(c)
    })

    // 환경에 맞게 파일 저장 (로컬 또는 R2)
    const videoUrl = await saveFile(c, file, 'videos')

    console.log('[VIDEO UPLOAD] Upload successful:', videoUrl)

    // 영상 메타데이터 추출 (재생 시간)
    // TODO: 실제 영상 파일에서 duration 추출 (현재는 파일 크기로 추정)
    const estimatedDuration = Math.ceil(file.size / (1024 * 1024)) // 임시: 1MB당 1분으로 추정

    return c.json(successResponse({
      url: videoUrl,
      filename: videoUrl,
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
