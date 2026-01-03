/**
 * 영상 관리 API 라우트
 * /api/videos/*
 * YouTube 전용 (Phase 2 - Simplified)
 */

import { Hono } from 'hono'
import { Bindings } from '../types/database'
import { successResponse, errorResponse } from '../utils/helpers'
import { requireAuth } from '../middleware/auth'

const videos = new Hono<{ Bindings: Bindings }>()

/**
 * POST /api/videos/validate-youtube
 * YouTube URL 유효성 검증
 */
videos.post('/validate-youtube', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    
    if (user.role !== 'admin') {
      return c.json(errorResponse('관리자 권한이 필요합니다.'), 403)
    }

    const { url } = await c.req.json<{ url: string }>()
    
    if (!url) {
      return c.json(errorResponse('YouTube URL이 필요합니다.'), 400)
    }

    // YouTube ID 추출 (다양한 형식 지원)
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/  // 직접 ID 입력
    ]

    let videoId = null
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        videoId = match[1]
        break
      }
    }

    if (!videoId) {
      return c.json(errorResponse('유효하지 않은 YouTube URL입니다.'), 400)
    }

    return c.json(successResponse({
      video_id: videoId,
      video_url: videoId,
      video_provider: 'youtube',
      embed_url: `https://www.youtube.com/embed/${videoId}`,
      thumbnail_url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    }))

  } catch (error) {
    console.error('YouTube validation error:', error)
    return c.json(errorResponse('YouTube URL 검증에 실패했습니다.'), 500)
  }
})

/**
 * GET /api/videos/:videoId/info
 * YouTube 영상 정보 조회 (공개 API 없이 기본 정보만 제공)
 */
videos.get('/:videoId/info', async (c) => {
  try {
    const videoId = c.req.param('videoId')

    if (!videoId || videoId.length !== 11) {
      return c.json(errorResponse('유효하지 않은 영상 ID입니다.'), 400)
    }

    return c.json(successResponse({
      video_id: videoId,
      provider: 'youtube',
      embed_url: `https://www.youtube.com/embed/${videoId}`,
      watch_url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail_url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    }))

  } catch (error) {
    console.error('Video info error:', error)
    return c.json(errorResponse('영상 정보 조회에 실패했습니다.'), 500)
  }
})

export default videos
