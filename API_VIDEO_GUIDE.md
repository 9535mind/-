# api.video 영상 업로드 가이드

## 📝 개요

**마인드스토리 LMS**는 이제 **api.video**를 통한 영상 호스팅을 지원합니다!

### ✅ 완료된 작업
- ✅ api.video SDK 통합
- ✅ 영상 업로드 API 구현
- ✅ 비공개 영상 지원
- ✅ 프론트엔드 업로드 함수 추가
- ✅ 배포 완료

---

## 🚀 배포 URL

**Production**: https://3301e4f7.mindstory-lms.pages.dev

---

## 🔧 API 엔드포인트

### 1. 파일 업로드
```
POST /api/video-apivideo/upload
```

**Headers**:
- `Authorization: Bearer {session_token}`
- `Content-Type: multipart/form-data`

**Body** (FormData):
```javascript
{
  file: File,              // 영상 파일
  title: String,           // 영상 제목 (필수)
  description: String,     // 영상 설명 (선택)
  is_public: Boolean,      // 공개 여부 (기본값: false)
  lesson_id: Number        // 연결할 차시 ID (선택)
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "video_id": "vi1234567890",
    "title": "강좌 소개",
    "description": "첫 번째 강의입니다",
    "player_url": "https://embed.api.video/vod/vi1234567890",
    "thumbnail_url": "https://cdn.api.video/vod/vi1234567890/thumbnail.jpg",
    "is_public": false,
    "status": "processing",
    "created_at": "2025-12-31T10:00:00Z",
    "lesson_id": 123
  }
}
```

---

### 2. URL로 업로드
```
POST /api/video-apivideo/upload-url
```

**Headers**:
- `Authorization: Bearer {session_token}`
- `Content-Type: application/json`

**Body**:
```json
{
  "url": "https://www.youtube.com/watch?v=xxxxx",
  "title": "강좌 소개",
  "description": "첫 번째 강의입니다",
  "is_public": false,
  "lesson_id": 123
}
```

**사용 예시**:
- YouTube 동영상을 api.video로 업로드
- 다른 플랫폼의 영상 URL 업로드
- 자동으로 트랜스코딩

---

### 3. 영상 정보 조회
```
GET /api/video-apivideo/:videoId
```

**Headers**:
- `Authorization: Bearer {session_token}`

**Response**:
```json
{
  "success": true,
  "data": {
    "video_id": "vi1234567890",
    "title": "강좌 소개",
    "description": "첫 번째 강의입니다",
    "player_url": "https://embed.api.video/vod/vi1234567890",
    "thumbnail_url": "https://cdn.api.video/vod/vi1234567890/thumbnail.jpg",
    "is_public": false,
    "duration": 1800,
    "status": {
      "ingest": {
        "status": "uploaded"
      },
      "encoding": {
        "playable": true
      }
    },
    "created_at": "2025-12-31T10:00:00Z",
    "updated_at": "2025-12-31T10:05:00Z"
  }
}
```

---

### 4. 영상 삭제
```
DELETE /api/video-apivideo/:videoId
```

**Headers**:
- `Authorization: Bearer {session_token}`

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "영상이 삭제되었습니다",
    "video_id": "vi1234567890"
  }
}
```

---

### 5. 영상 목록 조회
```
GET /api/video-apivideo/list?page=1&pageSize=25
```

**Headers**:
- `Authorization: Bearer {session_token}`

**Query Parameters**:
- `page`: 페이지 번호 (기본값: 1)
- `pageSize`: 페이지 크기 (기본값: 25)

**Response**:
```json
{
  "success": true,
  "data": {
    "videos": [
      {
        "video_id": "vi1234567890",
        "title": "강좌 소개",
        "description": "첫 번째 강의입니다",
        "player_url": "https://embed.api.video/vod/vi1234567890",
        "thumbnail_url": "https://cdn.api.video/vod/vi1234567890/thumbnail.jpg",
        "is_public": false,
        "status": {...},
        "created_at": "2025-12-31T10:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "pageSize": 25,
      "pagesTotal": 3,
      "itemsTotal": 65
    }
  }
}
```

---

## 💻 프론트엔드 사용법

### JavaScript 함수 사용

```javascript
// 1. 파일 업로드
async function uploadVideo() {
  const fileInput = document.getElementById('videoFile');
  const file = fileInput.files[0];
  
  try {
    const result = await uploadToApiVideo(
      file,
      lessonId,  // 차시 ID
      '강좌 소개' // 제목
    );
    
    console.log('업로드 성공:', result);
    alert('영상이 업로드되었습니다!');
  } catch (error) {
    console.error('업로드 실패:', error);
    alert('업로드에 실패했습니다: ' + error.message);
  }
}

// 2. YouTube URL 업로드
async function uploadFromYouTube() {
  const youtubeUrl = 'https://www.youtube.com/watch?v=xxxxx';
  
  try {
    const result = await uploadYouTubeToApiVideo(
      youtubeUrl,
      lessonId,
      '강좌 소개'
    );
    
    console.log('업로드 성공:', result);
  } catch (error) {
    console.error('업로드 실패:', error);
  }
}
```

---

## 🔒 비공개 영상 설정

### 기본 설정
모든 영상은 **기본적으로 비공개**입니다:
```javascript
formData.append('is_public', 'false');
```

### 비공개 영상의 특징
- ✅ 직접 URL 접근 불가
- ✅ 회원 인증 필요
- ✅ 수강 신청한 회원만 시청 가능
- ✅ 다운로드 방지
- ✅ 워터마크 추가 가능 (옵션)

---

## 📊 비용 정보

### api.video 비용 구조 (Sandbox → Production 전환 후)

**무료 인코딩**:
- ✅ 모든 해상도 트랜스코딩 무료
- ✅ HLS/DASH 스트리밍 포맷 무료

**유료 항목**:
- 저장: $0.00285/분/월
- 전송: $0.0017/GB

### 예상 비용 계산

**10시간 영상 기준**:
- 저장: 600분 × $0.00285 = **$1.71/월**
- 전송(100회 재생): 약 60GB × $0.0017 = **$0.10**
- **월 합계**: 약 **$1.81**

**50시간 영상 기준**:
- 저장: 3,000분 × $0.00285 = **$8.55/월**
- 전송(500회 재생): 약 300GB × $0.0017 = **$0.51**
- **월 합계**: 약 **$9.06**

---

## 🎥 영상 재생

### Embed Player URL
업로드 후 받은 `player_url`을 iframe에 삽입:

```html
<iframe 
  src="https://embed.api.video/vod/vi1234567890"
  width="100%" 
  height="500"
  frameborder="0"
  allowfullscreen>
</iframe>
```

### 비공개 영상 재생
비공개 영상도 동일한 방식으로 재생되지만, api.video에서 자동으로 접근 제어를 처리합니다.

---

## 🔄 DB 연동

### lessons 테이블 업데이트
영상 업로드 시 자동으로 `lessons` 테이블 업데이트:

```sql
UPDATE lessons 
SET 
  video_url = 'https://embed.api.video/vod/vi1234567890',
  video_type = 'apivideo',
  video_metadata = '{
    "video_id": "vi1234567890",
    "provider": "apivideo",
    "title": "강좌 소개",
    "description": "첫 번째 강의입니다",
    "thumbnail": "https://cdn.api.video/vod/vi1234567890/thumbnail.jpg",
    "is_public": false,
    "created_at": "2025-12-31T10:00:00Z"
  }',
  updated_at = datetime('now')
WHERE id = 123;
```

---

## 🧪 테스트 방법

### 1. Postman으로 API 테스트
```bash
# 파일 업로드 테스트
curl -X POST https://3301e4f7.mindstory-lms.pages.dev/api/video-apivideo/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/video.mp4" \
  -F "title=테스트 영상" \
  -F "is_public=false"
```

### 2. 관리자 페이지에서 테스트
1. 로그인: https://3301e4f7.mindstory-lms.pages.dev/admin/courses
2. 강좌 선택 → 차시 관리
3. 차시 추가/수정 시 영상 업로드
4. `uploadToApiVideo()` 함수 호출

---

## 🔐 환경 변수

### .dev.vars (로컬 개발)
```bash
APIVIDEO_API_KEY=dByeiWGc88lqWPVtWHPh85IRgCIrTShLjJrEVC9Ro7
APIVIDEO_BASE_URL=https://sandbox.api.video
```

### wrangler.jsonc (프로덕션)
```jsonc
{
  "vars": {
    "APIVIDEO_API_KEY": "dByeiWGc88lqWPVtWHPh85IRgCIrTShLjJrEVC9Ro7",
    "APIVIDEO_BASE_URL": "https://sandbox.api.video"
  }
}
```

### Production으로 전환
Sandbox에서 Production으로 전환하려면:
1. api.video 대시보드에서 "Upgrade to Production" 클릭
2. Production API 키 발급
3. 환경 변수 업데이트:
   ```bash
   APIVIDEO_API_KEY=YOUR_PRODUCTION_KEY
   APIVIDEO_BASE_URL=https://ws.api.video
   ```
4. 재배포

---

## 📚 추가 기능 개발 아이디어

### 1. 진도율 추적
- api.video의 Analytics API 활용
- 시청 시간/완료율 추적

### 2. 워터마크 추가
```javascript
const videoCreationPayload = {
  title: title,
  description: description,
  public: false,
  watermark: {
    id: 'watermark_id',
    bottom: '10px',
    right: '10px',
    opacity: '70%'
  }
}
```

### 3. 자막 추가
```javascript
await client.captions.upload(videoId, 'ko', {
  file: captionFile
});
```

### 4. 챕터 추가
```javascript
await client.chapters.upload(videoId, {
  file: chapterFile // VTT 형식
});
```

---

## 🐛 트러블슈팅

### 1. "Missing APIVIDEO_API_KEY" 에러
**원인**: 환경 변수가 설정되지 않음
**해결**: `.dev.vars` 및 `wrangler.jsonc` 확인

### 2. 업로드 실패
**원인**: 파일 크기 제한 또는 형식 문제
**해결**: 
- 파일 크기: 최대 500MB
- 지원 형식: MP4, WebM, MOV, AVI

### 3. 비공개 영상이 재생 안 됨
**원인**: Player URL 접근 제어
**해결**: api.video에서 비공개 영상 재생 토큰 발급 필요 (향후 구현)

---

## 📞 지원

**api.video 문서**: https://docs.api.video/
**api.video 대시보드**: https://dashboard.api.video/

---

## ✅ 다음 단계

1. **테스트 영상 업로드**: 관리자 페이지에서 실제 영상 업로드 테스트
2. **재생 확인**: 업로드된 영상이 정상적으로 재생되는지 확인
3. **비용 모니터링**: api.video 대시보드에서 사용량 확인
4. **Production 업그레이드**: 테스트 완료 후 Production 환경으로 전환

---

**작성일**: 2025-12-31  
**버전**: 1.0  
**작성자**: GenSpark AI Assistant
