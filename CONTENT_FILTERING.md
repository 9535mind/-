# 🛡️ 콘텐츠 필터링 시스템

Mindstory LMS의 불법 영상 및 부적절한 콘텐츠 차단 시스템 문서

---

## 📋 개요

본 시스템은 **교육 플랫폼의 안전성과 합법성**을 보장하기 위해 다음을 차단합니다:
- 성인 콘텐츠
- 불법 도박
- 마약/약물 관련
- 폭력/범죄
- 저작권 침해
- 혐오/차별 콘텐츠

---

## 🔍 필터링 방식

### 1️⃣ 키워드 필터링

**차단 키워드 (일부 예시):**
```
성인, 야동, 포르노, porn, adult, xxx
불법도박, 사설토토, 카지노, gambling
마약, 대마초, 필로폰, drug
살인, 자살, 테러, violence
토렌트, 불법다운, crack, piracy
```

**적용 대상:**
- 강좌 제목
- 강좌 설명
- 차시 제목
- 차시 설명

---

### 2️⃣ URL 검증

**승인된 영상 플랫폼만 허용:**
```
✅ YouTube (youtube.com, youtu.be)
✅ api.video (api.video, embed.api.video)
✅ Cloudflare Stream (stream.cloudflare.com, videodelivery.net)
✅ Vimeo (vimeo.com, player.vimeo.com)

❌ 기타 모든 도메인 차단
```

**의심스러운 URL 패턴 차단:**
```
/porn/i
/xxx/i
/adult/i
/casino/i
/torrent/i
/illegal/i
```

---

### 3️⃣ 실시간 검증

**차시 생성 시:**
1. 제목 키워드 검사
2. 설명 키워드 검사
3. 영상 URL 플랫폼 검증
4. 영상 URL 패턴 검사

**차시 수정 시:**
- 동일한 검증 프로세스 적용

---

## 🚫 차단 예시

### 예시 1: 부적절한 제목
```
입력: "성인용 영어 회화 강좌"
결과: ❌ 차단
이유: "성인" 키워드 감지
해결: "성인용" → "어른을 위한" 또는 "일반" 으로 변경
```

### 예시 2: 비승인 플랫폼
```
입력: https://illegal-video-site.com/video.mp4
결과: ❌ 차단
이유: 승인되지 않은 플랫폼
해결: YouTube, api.video, Cloudflare Stream 사용
```

### 예시 3: 의심스러운 URL
```
입력: https://youtube.com/watch?v=abc&torrent=true
결과: ❌ 차단
이유: "torrent" 패턴 감지
```

---

## ✅ 허용 예시

### 정상적인 교육 콘텐츠
```
제목: "초등학생을 위한 영어 기초"
설명: "쉽고 재미있는 영어 학습"
영상: https://youtube.com/watch?v=abc123
결과: ✅ 허용
```

### 전문 교육 콘텐츠
```
제목: "성인 학습자를 위한 파이썬"
→ ❌ "성인" 키워드 때문에 차단됨

해결책:
제목: "직장인을 위한 파이썬"
또는
제목: "어른을 위한 파이썬 프로그래밍"
결과: ✅ 허용
```

---

## 🔧 기술 구현

### 파일 위치
```
src/utils/content-filter.ts
```

### 주요 함수

#### 1. `filterContentText(text: string)`
텍스트 콘텐츠 필터링
```typescript
const result = filterContentText("강좌 제목")
// { isAllowed: boolean, reason?: string, blockedKeyword?: string }
```

#### 2. `validateVideoUrl(url: string)`
영상 URL 검증
```typescript
const result = validateVideoUrl("https://youtube.com/...")
// { isAllowed: boolean, reason?: string, platform?: string }
```

#### 3. `validateLessonContent(data)`
전체 차시 콘텐츠 검증
```typescript
const result = validateLessonContent({
  title: "강좌 제목",
  description: "강좌 설명",
  video_url: "영상 URL"
})
// { isAllowed: boolean, errors: string[], warnings: string[] }
```

---

## 📊 적용 현황

### 적용된 API
- ✅ `POST /api/courses/:id/lessons` (차시 생성)
- ✅ `PUT /api/courses/:courseId/lessons/:lessonId` (차시 수정)

### 적용 예정
- 강좌 제목/설명 (courses.ts)
- 사용자 프로필 (auth.ts)
- 공지사항/게시판 (향후)

---

## 🔄 업데이트 방법

### 키워드 추가
```typescript
// src/utils/content-filter.ts

const BLOCKED_KEYWORDS = [
  // ... 기존 키워드
  '새로운차단키워드',
  'new_blocked_keyword'
]
```

### 플랫폼 추가
```typescript
const APPROVED_VIDEO_PLATFORMS = [
  // ... 기존 플랫폼
  'new-platform.com'
]
```

### URL 패턴 추가
```typescript
const SUSPICIOUS_URL_PATTERNS = [
  // ... 기존 패턴
  /new-pattern/i
]
```

---

## ⚠️ 주의사항

### False Positive (오탐)
일부 정상적인 교육 콘텐츠가 차단될 수 있습니다:

**예시:**
- "성인 교육" → "성인" 키워드로 차단
- "도박 이론 강의" → "도박" 키워드로 차단

**해결책:**
- 제목/설명을 다르게 표현
- 필요 시 키워드 목록 조정
- 화이트리스트 기능 추가 (향후)

---

## 📈 로그 및 모니터링

### 차단 로그
```typescript
console.warn('🚫 부적절한 콘텐츠 차단:', { 
  title, 
  errors: contentValidation.errors 
})
```

### 경고 로그
```typescript
console.warn('⚠️ 콘텐츠 경고:', contentValidation.warnings)
```

### Cloudflare 대시보드
```
Analytics → Logs → Workers Logs
필터: "부적절한 콘텐츠" 또는 "차단"
```

---

## 🎯 미래 개선 사항

### 1. AI 기반 콘텐츠 분석
- OpenAI Moderation API 통합
- 이미지/썸네일 자동 검사
- 영상 콘텐츠 자동 분석

### 2. 신고 시스템
- 사용자 신고 기능
- 관리자 검토 대시보드
- 차단 이력 추적

### 3. 화이트리스트
- 신뢰할 수 있는 채널 등록
- 교육 기관 인증
- 자동 승인 시스템

### 4. 다국어 지원
- 영어 외 언어 키워드
- 지역별 규제 준수
- 국제 표준 적용

---

## 📞 문의

필터링 시스템 관련 문의:
- 오탐 신고
- 키워드 추가/삭제 요청
- 플랫폼 추가 요청

---

## 📝 변경 이력

### v1.0 (2026-01-02)
- ✅ 초기 시스템 구축
- ✅ 키워드 필터링
- ✅ URL 검증
- ✅ 차시 생성/수정 API 적용

### 향후 계획
- AI 콘텐츠 분석 통합
- 사용자 신고 시스템
- 관리자 대시보드
