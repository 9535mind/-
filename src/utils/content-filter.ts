/**
 * 콘텐츠 필터링 및 불법 영상 차단 시스템
 * 부적절한 콘텐츠, 불법 영상, 저작권 침해 콘텐츠 차단
 */

/**
 * 금지된 키워드 목록 (한글/영어)
 */
const BLOCKED_KEYWORDS = [
  // 성인 콘텐츠
  '성인', '야동', '포르노', 'porn', 'adult', 'xxx', 'sex', 'nude', '19금',
  '음란', '외설', '선정적', 'erotic', 'hentai',
  
  // 불법 도박
  '불법도박', '사설토토', '토토사이트', '카지노', 'casino', 'gambling',
  '도박', '베팅', 'betting',
  
  // 마약/약물
  '마약', '대마초', '필로폰', 'drug', 'cocaine', '해시시', '환각제',
  
  // 폭력/범죄
  '살인', '자살', 'suicide', '테러', 'terror', '폭행', 'violence',
  
  // 저작권 침해 (일반적인 경우)
  '무료다운', '토렌트', 'torrent', '불법다운', 'crack', 'keygen',
  '무단배포', '해적판', 'piracy',
  
  // 혐오/차별
  '인종차별', '성차별', '혐오', 'hate speech',
]

/**
 * 의심스러운 URL 패턴
 */
const SUSPICIOUS_URL_PATTERNS = [
  /porn/i,
  /xxx/i,
  /adult/i,
  /casino/i,
  /bet(ting)?/i,
  /torrent/i,
  /crack/i,
  /piracy/i,
  /illegal/i,
]

/**
 * 승인된 영상 플랫폼 도메인
 */
const APPROVED_VIDEO_PLATFORMS = [
  'youtube.com',
  'youtu.be',
  'api.video',
  'embed.api.video',
  'stream.cloudflare.com',
  'videodelivery.net', // Cloudflare Stream
  'vimeo.com',
  'player.vimeo.com',
]

/**
 * 제목 및 설명 필터링
 */
export function filterContentText(text: string): {
  isAllowed: boolean
  reason?: string
  blockedKeyword?: string
} {
  if (!text) {
    return { isAllowed: true }
  }

  const lowerText = text.toLowerCase()

  // 금지 키워드 검사
  for (const keyword of BLOCKED_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      return {
        isAllowed: false,
        reason: '부적절한 콘텐츠가 감지되었습니다.',
        blockedKeyword: keyword
      }
    }
  }

  return { isAllowed: true }
}

/**
 * 영상 URL 검증
 */
export function validateVideoUrl(url: string): {
  isAllowed: boolean
  reason?: string
  platform?: string
} {
  if (!url) {
    return { isAllowed: true }
  }

  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()

    // 1. 승인된 플랫폼 확인
    const isApprovedPlatform = APPROVED_VIDEO_PLATFORMS.some(platform => 
      hostname.includes(platform)
    )

    if (!isApprovedPlatform) {
      return {
        isAllowed: false,
        reason: '승인되지 않은 영상 플랫폼입니다. YouTube, api.video, Cloudflare Stream만 사용 가능합니다.'
      }
    }

    // 2. 의심스러운 URL 패턴 검사
    const fullUrl = url.toLowerCase()
    for (const pattern of SUSPICIOUS_URL_PATTERNS) {
      if (pattern.test(fullUrl)) {
        return {
          isAllowed: false,
          reason: '부적절한 콘텐츠가 감지되었습니다.'
        }
      }
    }

    // 3. 플랫폼 식별
    let platform = 'unknown'
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      platform = 'youtube'
    } else if (hostname.includes('api.video')) {
      platform = 'apivideo'
    } else if (hostname.includes('cloudflare.com') || hostname.includes('videodelivery.net')) {
      platform = 'stream'
    } else if (hostname.includes('vimeo.com')) {
      platform = 'vimeo'
    }

    return {
      isAllowed: true,
      platform
    }

  } catch (error) {
    return {
      isAllowed: false,
      reason: '유효하지 않은 URL 형식입니다.'
    }
  }
}

/**
 * 전체 강좌/차시 콘텐츠 검증
 */
export function validateLessonContent(data: {
  title?: string
  description?: string
  video_url?: string
}): {
  isAllowed: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // 제목 검증
  if (data.title) {
    const titleCheck = filterContentText(data.title)
    if (!titleCheck.isAllowed) {
      errors.push(`제목: ${titleCheck.reason}`)
    }
  }

  // 설명 검증
  if (data.description) {
    const descCheck = filterContentText(data.description)
    if (!descCheck.isAllowed) {
      errors.push(`설명: ${descCheck.reason}`)
    }
  }

  // 영상 URL 검증
  if (data.video_url) {
    const urlCheck = validateVideoUrl(data.video_url)
    if (!urlCheck.isAllowed) {
      errors.push(`영상 URL: ${urlCheck.reason}`)
    } else if (urlCheck.platform === 'unknown') {
      warnings.push('알 수 없는 영상 플랫폼입니다. 재생이 불가능할 수 있습니다.')
    }
  }

  return {
    isAllowed: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * YouTube URL에서 비디오 ID 추출 및 검증
 */
export function extractYouTubeId(url: string): string | null {
  try {
    const urlObj = new URL(url)
    
    // youtu.be 형식
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1)
    }
    
    // youtube.com 형식
    if (urlObj.hostname.includes('youtube.com')) {
      return urlObj.searchParams.get('v')
    }
    
    return null
  } catch {
    return null
  }
}

/**
 * api.video URL에서 비디오 ID 추출
 */
export function extractApiVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url)
    
    // embed.api.video/vod/vi... 형식
    if (urlObj.hostname.includes('api.video')) {
      const pathParts = urlObj.pathname.split('/')
      const videoId = pathParts[pathParts.length - 1]
      
      // vi로 시작하는 ID만 허용
      if (videoId && videoId.startsWith('vi')) {
        return videoId
      }
    }
    
    return null
  } catch {
    return null
  }
}
