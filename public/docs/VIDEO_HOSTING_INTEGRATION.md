# 영상 호스팅 연동 가이드

## 📋 현재 상태

### ✅ 구현 완료
- 차시별 영상 URL 저장 (`lessons.video_url`)
- 진도율 추적 시스템 (`lesson_progress`)
- 학습 시간 기록

### ⏳ 연동 대기
- **실제 시청 시간 기반 진도율** (현재는 API 호출 기반)
- 영상 DRM/도메인 제한
- 재생 로그 수집

## 🎥 추천 영상 호스팅

### 1️⃣ Kollus (콜러스) - 강력 추천 ⭐⭐⭐⭐⭐

#### 장점
- **DRM 보안 기본 제공** (화면 캡처 방지, 다운로드 방지)
- **실시간 시청 통계** API
- **도메인/IP 제한** 기능
- **모바일 앱 SDK** 제공
- 국내 대부분의 교육 플랫폼이 사용

#### 실시청 시간 API
```javascript
// Kollus Player 초기화
const player = new KollusPlayer({
  target_id: 'video-container',
  media_content_key: 'LESSON_MCK_KEY',
  use_fullscreen: true
})

// 시청 이벤트 수집
player.on('progress', (data) => {
  const watchedTime = data.current_time // 실제 시청한 시간 (초)
  const totalTime = data.duration // 총 재생 시간
  
  // LMS에 진도율 전송
  updateProgress({
    lessonId: lessonId,
    watchedTime: watchedTime,
    progress: (watchedTime / totalTime) * 100
  })
})

// 시청 완료 이벤트
player.on('ended', () => {
  // 100% 시청 완료
  completeLesson(lessonId)
})
```

#### 도메인 제한
```
Kollus 관리자 페이지에서 설정:
✅ 허용 도메인: mindstory.pages.dev
✅ IP 제한: 특정 IP만 허용 (선택)
✅ 기간 제한: 수강 기간에만 재생 가능
```

#### 비용
- 월 기본료: 300,000원 ~ (트래픽 500GB 포함)
- 추가 트래픽: 150원/GB
- DRM 사용료: 월 50,000원 추가

#### 연동 절차
1. https://www.kollus.com 회원가입
2. 서비스 신청 (사업자등록증 필요)
3. API 키 발급
4. 영상 업로드
5. Player 연동
6. 시청 로그 수집 테스트

---

### 2️⃣ VideoCloud (비디오클라우드)

#### 장점
- Kollus 대비 저렴한 가격
- 기본 DRM 제공
- 실시간 통계

#### 실시청 시간 API
```javascript
// VideoCloud Player
const vcPlayer = new vcPlayer({
  elementId: 'video-container',
  videoId: 'VIDEO_ID',
  autoplay: false
})

// 진도율 추적
vcPlayer.on('timeupdate', (event) => {
  const currentTime = event.currentTime
  const duration = event.duration
  
  // 3초마다 서버에 진도 전송 (과부하 방지)
  if (currentTime % 3 === 0) {
    saveProgress(lessonId, currentTime, duration)
  }
})
```

#### 비용
- 월 기본료: 150,000원 ~ (트래픽 300GB)
- 추가 트래픽: 100원/GB

---

### 3️⃣ Vimeo Pro (해외)

#### 장점
- 깔끔한 UI
- 글로벌 CDN
- 저렴한 가격

#### 단점
- 한국어 지원 부족
- DRM 별도 구매 필요
- 국내 속도 다소 느림

---

## 📊 실시청 시간 기반 진도율 구현

### 현재 시스템 (API 호출 기반)
```typescript
// 문제점: 페이지만 열어도 진도 100%
POST /api/enrollments/:id/progress
{
  "lesson_id": 1,
  "progress": 100  // ❌ 실제 시청 안 해도 가능
}
```

### 개선 후 (실시청 시간 기반)
```typescript
// Kollus/VideoCloud에서 실제 시청 시간 수신
POST /api/enrollments/:id/progress
{
  "lesson_id": 1,
  "watched_seconds": 450,  // 실제 시청한 시간 (초)
  "total_seconds": 600,    // 총 영상 길이
  "progress": 75.0         // 자동 계산된 진도율
}

// 서버에서 검증
const calculatedProgress = (watched_seconds / total_seconds) * 100
if (Math.abs(progress - calculatedProgress) > 1) {
  throw new Error('진도율 불일치')
}
```

### 진도율 계산 정책
```typescript
// 80% 이상 시청 시 해당 차시 완료로 인정
const isLessonCompleted = (watchedSeconds: number, totalSeconds: number) => {
  return (watchedSeconds / totalSeconds) >= 0.8
}

// 빨리감기 방지: 재생 속도 제한
const MAX_PLAYBACK_RATE = 1.5 // 1.5배속까지만 허용

// 건너뛰기 방지: 연속 시청 체크
// 예: 0초 → 100초 → 200초 (정상)
//    0초 → 300초 (비정상, 건너뛰기 감지)
```

## 🔒 보안 기능

### 1. DRM (Digital Rights Management)
```
✅ 화면 캡처 방지
✅ 다운로드 방지
✅ 우클릭 방지
✅ 개발자 도구 차단
```

### 2. 도메인 제한
```javascript
// Kollus 설정 예시
{
  "allowed_domains": [
    "mindstory.pages.dev",
    "www.mindstory.co.kr"
  ],
  "block_external": true
}
```

### 3. 동시 접속 제한
```typescript
// user_sessions 테이블 활용
// 동일 사용자가 2개 이상 기기에서 동시 시청 불가

const checkConcurrentSessions = async (userId: number) => {
  const activeSessions = await DB.prepare(`
    SELECT COUNT(*) as count
    FROM user_sessions
    WHERE user_id = ? 
      AND is_active = 1
      AND last_activity > datetime('now', '-5 minutes')
  `).bind(userId).first()
  
  if (activeSessions.count >= 1) {
    throw new Error('다른 기기에서 이미 학습 중입니다')
  }
}
```

### 4. IP/지역 제한 (선택)
```
특정 국가에서만 재생 허용
예: 한국(KR)만 허용
```

## 📱 모바일 대응

### Kollus Mobile SDK
```javascript
// React Native / Flutter 앱 개발 시
import KollusMobileSDK from 'kollus-mobile-sdk'

// iOS/Android 네이티브 플레이어 제공
// 백그라운드 재생 방지
// PIP(Picture-in-Picture) 차단
```

### 웹 모바일
```html
<!-- 반응형 플레이어 -->
<div id="video-container" style="width: 100%; max-width: 800px;"></div>

<script>
// 모바일 감지
const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent)

// 모바일에서 전체화면 자동 실행
if (isMobile) {
  player.enterFullscreen()
}
</script>
```

## 📊 시청 로그 수집

### 수집 데이터
```typescript
interface ViewingLog {
  user_id: number
  lesson_id: number
  session_id: string
  
  // 시청 정보
  watched_seconds: number // 실제 시청 시간
  total_seconds: number   // 총 영상 길이
  progress: number        // 진도율 (%)
  
  // 재생 정보
  playback_rate: number   // 재생 속도 (1.0 = 정상)
  seek_count: number      // 건너뛰기 횟수
  pause_count: number     // 일시정지 횟수
  
  // 디바이스 정보
  device_type: string     // PC, Mobile, Tablet
  os: string              // Windows, iOS, Android
  browser: string         // Chrome, Safari, etc.
  
  // 네트워크 정보
  ip_address: string
  country: string         // KR
  
  started_at: string      // 시청 시작 시간
  ended_at: string        // 시청 종료 시간
}
```

### 로그 저장
```sql
CREATE TABLE IF NOT EXISTS viewing_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  lesson_id INTEGER NOT NULL,
  session_id TEXT NOT NULL,
  
  watched_seconds INTEGER NOT NULL,
  total_seconds INTEGER NOT NULL,
  progress REAL NOT NULL,
  
  playback_rate REAL DEFAULT 1.0,
  seek_count INTEGER DEFAULT 0,
  pause_count INTEGER DEFAULT 0,
  
  device_type TEXT,
  os TEXT,
  browser TEXT,
  ip_address TEXT,
  
  started_at DATETIME NOT NULL,
  ended_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (lesson_id) REFERENCES lessons(id)
);

CREATE INDEX idx_viewing_logs_user ON viewing_logs(user_id);
CREATE INDEX idx_viewing_logs_lesson ON viewing_logs(lesson_id);
```

## 🚀 연동 단계

### Step 1: Kollus 계정 생성 및 설정 ✅
1. https://www.kollus.com 회원가입
2. 사업자 정보 등록
3. 서비스 신청서 작성
4. API 키 발급 (Service Account)

### Step 2: 영상 업로드 ✅
1. Kollus 관리자 페이지 접속
2. 카테고리 생성 (과정별)
3. 영상 파일 업로드 (MP4 권장)
4. 인코딩 완료 대기 (10분~1시간)
5. Media Content Key (MCK) 확인

### Step 3: Player 연동 ✅
```html
<!-- Kollus Player 라이브러리 -->
<script src="https://v.kr.kollus.com/s?jwt=YOUR_JWT_TOKEN"></script>

<div id="kollus-player"></div>

<script>
const player = new KollusPlayer({
  target_id: 'kollus-player',
  media_content_key: 'MCK_FROM_KOLLUS',
  
  // 보안 설정
  disable_seek: false,        // 건너뛰기 허용
  disable_playback_rate: false, // 배속 허용 (1.5배까지)
  disable_screenshot: true,   // 화면캡처 방지
  
  // UI 설정
  use_fullscreen: true,
  use_title: true,
  use_logo: false,
  
  // 이벤트 핸들러
  callback: {
    on_progress: function(data) {
      // 3초마다 진도 저장
      if (Math.floor(data.current_time) % 3 === 0) {
        saveProgress(lessonId, data.current_time, data.duration)
      }
    },
    on_ended: function() {
      completeLesson(lessonId)
    }
  }
})
</script>
```

### Step 4: 진도율 API 개선 ✅
```typescript
// /api/enrollments/:id/progress 수정
app.post('/:id/progress', requireAuth, async (c) => {
  const { DB } = c.env
  const user = c.get('user')
  const enrollmentId = parseInt(c.req.param('id'))
  const { 
    lesson_id, 
    watched_seconds,  // 실제 시청 시간 (Kollus에서 전송)
    total_seconds,    // 총 영상 길이
    session_id 
  } = await c.req.json()

  // 진도율 계산 (서버에서 검증)
  const progress = (watched_seconds / total_seconds) * 100
  
  // 80% 이상 시청 시 완료 처리
  const is_completed = progress >= 80 ? 1 : 0
  
  // DB 저장
  await DB.prepare(`
    INSERT INTO lesson_progress (
      enrollment_id, lesson_id, watched_seconds, 
      total_seconds, progress, is_completed, session_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(enrollment_id, lesson_id) 
    DO UPDATE SET 
      watched_seconds = excluded.watched_seconds,
      progress = excluded.progress,
      is_completed = excluded.is_completed,
      session_id = excluded.session_id,
      last_watched_at = datetime('now')
  `).bind(
    enrollmentId, lesson_id, watched_seconds,
    total_seconds, progress, is_completed, session_id
  ).run()
  
  // 시청 로그 저장
  await saveViewingLog({
    user_id: user.id,
    lesson_id,
    session_id,
    watched_seconds,
    total_seconds,
    progress
  })

  return c.json({ success: true, progress })
})
```

### Step 5: 테스트 ✅
- [ ] 영상 재생 확인
- [ ] 진도율 저장 확인 (3초마다)
- [ ] 80% 시청 시 완료 처리 확인
- [ ] 건너뛰기 감지 확인
- [ ] 모바일 재생 확인

## 📞 문의처

### Kollus 지원
- 전화: 1566-5658
- 이메일: support@kollus.com
- 개발자 문서: https://developers.kollus.com

### VideoCloud 지원
- 전화: 02-6952-3400
- 이메일: help@videocloud.kr

---

**작성일**: 2025-12-27  
**작성자**: 개발팀  
**버전**: 1.0
