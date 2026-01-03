/**
 * 외부 영상 스토리지 API 통합
 * /api/video-external/*
 * 
 * 지원 서비스:
 * - api.video: 무료 인코딩, 유료 저장/전송
 * - Vimeo: 무료 계정 (승인 필요)
 * - YouTube: 완전 무료 (쿼터 제한)
 */

import { Hono } from 'hono'
import { Bindings } from '../types/database'
import { successResponse, errorResponse } from '../utils/helpers'
import { requireAdmin } from '../middleware/auth'

const videoExternal = new Hono<{ Bindings: Bindings }>()

/**
 * POST /api/video-external/upload
 * 외부 스토리지에 영상 업로드
 * 
 * Body:
 * - file: 영상 파일 (FormData)
 * - provider: 'apivideo' | 'vimeo' | 'youtube'
 * - lesson_id: 차시 ID (선택)
 */
videoExternal.post('/upload', requireAdmin, async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File | null
    const provider = formData.get('provider') as string || 'apivideo'
    const lessonIdStr = formData.get('lesson_id') as string | null
    const lessonId = lessonIdStr ? parseInt(lessonIdStr) : null

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

    console.log('[VIDEO EXTERNAL] Upload request:', {
      provider,
      fileName: file.name,
      size: file.size,
      type: file.type,
      lessonId
    })

    let uploadResult
    switch (provider) {
      case 'apivideo':
        uploadResult = await uploadToApiVideo(c, file)
        break
      case 'vimeo':
        uploadResult = await uploadToVimeo(c, file)
        break
      case 'youtube':
        return c.json(errorResponse('YouTube는 수동 업로드 후 URL을 입력해주세요.'), 400)
      default:
        return c.json(errorResponse('지원하지 않는 provider입니다.'), 400)
    }

    // lessonId가 있으면 DB 업데이트
    if (lessonId && uploadResult.success) {
      const { DB } = c.env
      
      await DB.prepare(`
        UPDATE lessons
        SET 
          video_url = ?,
          video_type = ?,
          video_file_name = ?,
          video_file_size = ?,
          video_uploaded_at = datetime('now'),
          duration_minutes = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).bind(
        uploadResult.videoUrl,
        provider,
        file.name,
        file.size,
        uploadResult.duration || 0,
        lessonId
      ).run()

      console.log('[VIDEO EXTERNAL] Lesson updated:', lessonId)
    }

    return c.json(successResponse({
      provider,
      videoUrl: uploadResult.videoUrl,
      videoId: uploadResult.videoId,
      embedUrl: uploadResult.embedUrl,
      playerUrl: uploadResult.playerUrl,
      duration: uploadResult.duration,
      originalName: file.name,
      size: file.size,
      lessonId
    }, `${provider}에 영상이 업로드되었습니다.`))

  } catch (error: any) {
    console.error('[VIDEO EXTERNAL] Upload error:', error)
    return c.json(errorResponse(error.message || '영상 업로드에 실패했습니다.'), 500)
  }
})

/**
 * api.video에 영상 업로드
 */
async function uploadToApiVideo(c: any, file: File): Promise<{
  success: boolean
  videoUrl: string
  videoId: string
  embedUrl: string
  playerUrl: string
  duration?: number
}> {
  const apiKey = c.env.APIVIDEO_API_KEY

  if (!apiKey) {
    throw new Error('api.video API 키가 설정되지 않았습니다. .dev.vars 파일에 APIVIDEO_API_KEY를 추가해주세요.')
  }

  // 1. 영상 생성 (메타데이터)
  const createResponse = await fetch('https://ws.api.video/videos', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: file.name,
      public: false, // 비공개 영상
      mp4Support: true
    })
  })

  if (!createResponse.ok) {
    const error = await createResponse.text()
    console.error('[api.video] Create video error:', error)
    throw new Error('api.video 영상 생성 실패')
  }

  const videoData = await createResponse.json()
  const videoId = videoData.videoId

  console.log('[api.video] Video created:', videoId)

  // 2. 영상 업로드
  const uploadUrl = `https://ws.api.video/videos/${videoId}/source`
  const uploadFormData = new FormData()
  uploadFormData.append('file', file)

  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    },
    body: uploadFormData
  })

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text()
    console.error('[api.video] Upload error:', error)
    throw new Error('api.video 영상 업로드 실패')
  }

  const uploadData = await uploadResponse.json()

  console.log('[api.video] Upload complete:', uploadData)

  return {
    success: true,
    videoUrl: videoId, // lessons.video_url에 저장
    videoId: videoId,
    embedUrl: `https://embed.api.video/vod/${videoId}`,
    playerUrl: uploadData.assets?.player || `https://embed.api.video/vod/${videoId}`,
    duration: uploadData.assets?.mp4 ? Math.ceil(file.size / (1024 * 1024 * 5)) : undefined
  }
}

/**
 * Vimeo에 영상 업로드
 */
async function uploadToVimeo(c: any, file: File): Promise<{
  success: boolean
  videoUrl: string
  videoId: string
  embedUrl: string
  playerUrl: string
  duration?: number
}> {
  const accessToken = c.env.VIMEO_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error('Vimeo Access Token이 설정되지 않았습니다. .dev.vars 파일에 VIMEO_ACCESS_TOKEN을 추가해주세요.')
  }

  // 1. 업로드 티켓 생성
  const createResponse = await fetch('https://api.vimeo.com/me/videos', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.vimeo.*+json;version=3.4'
    },
    body: JSON.stringify({
      upload: {
        approach: 'post',
        size: file.size
      },
      name: file.name,
      privacy: {
        view: 'unlisted' // 비공개 (링크만 접근 가능)
      }
    })
  })

  if (!createResponse.ok) {
    const error = await createResponse.text()
    console.error('[Vimeo] Create upload error:', error)
    throw new Error('Vimeo 업로드 티켓 생성 실패')
  }

  const uploadTicket = await createResponse.json()
  const uploadLink = uploadTicket.upload.upload_link
  const videoUri = uploadTicket.uri
  const videoId = videoUri.split('/').pop()

  console.log('[Vimeo] Upload ticket created:', videoId)

  // 2. 영상 업로드
  const uploadFormData = new FormData()
  uploadFormData.append('file_data', file)

  const uploadResponse = await fetch(uploadLink, {
    method: 'POST',
    body: uploadFormData
  })

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text()
    console.error('[Vimeo] Upload error:', error)
    throw new Error('Vimeo 영상 업로드 실패')
  }

  console.log('[Vimeo] Upload complete:', videoId)

  return {
    success: true,
    videoUrl: videoId, // lessons.video_url에 저장
    videoId: videoId,
    embedUrl: `https://player.vimeo.com/video/${videoId}`,
    playerUrl: `https://vimeo.com/${videoId}`,
    duration: Math.ceil(file.size / (1024 * 1024 * 5))
  }
}

/**
 * GET /api/video-external/status/:provider/:videoId
 * 영상 처리 상태 확인
 */
videoExternal.get('/status/:provider/:videoId', requireAdmin, async (c) => {
  try {
    const provider = c.req.param('provider')
    const videoId = c.req.param('videoId')

    let status
    switch (provider) {
      case 'apivideo':
        status = await getApiVideoStatus(c, videoId)
        break
      case 'vimeo':
        status = await getVimeoStatus(c, videoId)
        break
      default:
        return c.json(errorResponse('지원하지 않는 provider입니다.'), 400)
    }

    return c.json(successResponse(status))

  } catch (error: any) {
    console.error('[VIDEO EXTERNAL] Status check error:', error)
    return c.json(errorResponse(error.message || '상태 확인에 실패했습니다.'), 500)
  }
})

async function getApiVideoStatus(c: any, videoId: string) {
  const apiKey = c.env.APIVIDEO_API_KEY

  const response = await fetch(`https://ws.api.video/videos/${videoId}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  })

  if (!response.ok) {
    throw new Error('api.video 상태 확인 실패')
  }

  const data = await response.json()
  
  return {
    status: data.assets?.mp4 ? 'ready' : 'processing',
    videoId: data.videoId,
    embedUrl: `https://embed.api.video/vod/${data.videoId}`,
    duration: data.assets?.mp4 ? undefined : null
  }
}

async function getVimeoStatus(c: any, videoId: string) {
  const accessToken = c.env.VIMEO_ACCESS_TOKEN

  const response = await fetch(`https://api.vimeo.com/videos/${videoId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.vimeo.*+json;version=3.4'
    }
  })

  if (!response.ok) {
    throw new Error('Vimeo 상태 확인 실패')
  }

  const data = await response.json()
  
  return {
    status: data.status === 'available' ? 'ready' : 'processing',
    videoId: videoId,
    embedUrl: `https://player.vimeo.com/video/${videoId}`,
    duration: data.duration
  }
}

export default videoExternal
