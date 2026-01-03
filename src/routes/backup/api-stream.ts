import { Hono } from 'hono'
import jwt from 'jsonwebtoken'

type Bindings = {
  DB: D1Database;
  R2: R2Bucket;
}

const app = new Hono<{ Bindings: Bindings }>()

// Cloudflare Stream Signed URL 생성
app.post('/signed-url', async (c) => {
  try {
    const { videoId, userId, userName } = await c.req.json()
    
    if (!videoId) {
      return c.json({ error: 'videoId is required' }, 400)
    }

    // 환경변수에서 Stream 설정 가져오기
    const accountId = '2e8c2335c9dc802347fb23b9d608d4f4' // Cloudflare Account ID
    const signingKeyId = process.env.STREAM_SIGNING_KEY_ID || 'DEMO_KEY_ID'
    const signingPrivateKey = process.env.STREAM_SIGNING_PRIVATE_KEY || ''

    // 데모 모드 확인
    const isDemoMode = !signingPrivateKey || signingPrivateKey === ''

    if (isDemoMode) {
      console.warn('⚠️ Stream Signing Key가 설정되지 않았습니다. 데모 URL을 반환합니다.')
      
      // 데모 모드: 일반 Stream URL 반환
      return c.json({
        success: true,
        demo: true,
        message: 'Stream Signing Key가 설정되지 않아 일반 URL을 반환합니다.',
        signedUrl: `https://customer-${accountId}.cloudflarestream.com/${videoId}/manifest/video.m3u8`,
        embedUrl: `https://customer-${accountId}.cloudflarestream.com/${videoId}/iframe`,
        expiresAt: null,
        videoId,
        userId,
        userName
      })
    }

    // JWT 토큰 생성 (1시간 유효)
    const expiresAt = Math.floor(Date.now() / 1000) + (60 * 60) // 1시간 후
    
    const payload = {
      sub: videoId,
      kid: signingKeyId,
      exp: expiresAt,
      nbf: Math.floor(Date.now() / 1000), // 현재 시간부터 유효
      downloadable: false, // 다운로드 차단
      accessRules: [
        {
          type: 'ip.geoip.country',
          action: 'allow',
          country: ['KR'] // 한국에서만 접근 허용 (선택사항)
        }
      ],
      // 워터마크용 사용자 정보
      userInfo: {
        userId,
        userName
      }
    }

    // RS256 알고리즘으로 JWT 생성
    const token = jwt.sign(payload, signingPrivateKey, {
      algorithm: 'RS256',
      keyid: signingKeyId
    })

    // Signed URL 생성
    const signedUrl = `https://customer-${accountId}.cloudflarestream.com/${token}/manifest/video.m3u8`
    const embedUrl = `https://customer-${accountId}.cloudflarestream.com/${token}/iframe`

    console.log(`✅ Signed URL 생성 완료: ${videoId} (유효기간: 1시간, 사용자: ${userName})`)

    return c.json({
      success: true,
      demo: false,
      signedUrl,
      embedUrl,
      expiresAt,
      videoId,
      userId,
      userName
    })

  } catch (error) {
    console.error('❌ Signed URL 생성 실패:', error)
    return c.json({ 
      error: 'Signed URL 생성 실패', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, 500)
  }
})

// Stream 영상 업로드 URL 생성 (TUS 프로토콜)
app.post('/upload-url', async (c) => {
  try {
    const { title, duration } = await c.req.json()
    
    const accountId = '2e8c2335c9dc802347fb23b9d608d4f4'
    const apiToken = process.env.CLOUDFLARE_API_TOKEN || ''

    if (!apiToken) {
      return c.json({ 
        error: 'CLOUDFLARE_API_TOKEN이 설정되지 않았습니다.',
        guide: 'Cloudflare Dashboard → My Profile → API Tokens에서 생성하세요.'
      }, 500)
    }

    // Cloudflare Stream API를 통해 업로드 URL 생성
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          maxDurationSeconds: duration || 3600, // 기본 1시간
          requireSignedURLs: true, // Signed URL 필수
          meta: {
            name: title || 'Untitled Video'
          }
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Stream 업로드 URL 생성 실패:', data)
      return c.json({ error: 'Stream API 호출 실패', details: data }, 500)
    }

    console.log(`✅ Stream 업로드 URL 생성 완료: ${data.result.uid}`)

    return c.json({
      success: true,
      uploadUrl: data.result.uploadURL,
      videoId: data.result.uid
    })

  } catch (error) {
    console.error('❌ 업로드 URL 생성 실패:', error)
    return c.json({ 
      error: '업로드 URL 생성 실패', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, 500)
  }
})

// Stream 영상 목록 조회
app.get('/videos', async (c) => {
  try {
    const accountId = '2e8c2335c9dc802347fb23b9d608d4f4'
    const apiToken = process.env.CLOUDFLARE_API_TOKEN || ''

    if (!apiToken) {
      return c.json({ 
        error: 'CLOUDFLARE_API_TOKEN이 설정되지 않았습니다.'
      }, 500)
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`
        }
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return c.json({ error: 'Stream API 호출 실패', details: data }, 500)
    }

    return c.json({
      success: true,
      videos: data.result
    })

  } catch (error) {
    console.error('❌ 영상 목록 조회 실패:', error)
    return c.json({ 
      error: '영상 목록 조회 실패', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, 500)
  }
})

export default app
