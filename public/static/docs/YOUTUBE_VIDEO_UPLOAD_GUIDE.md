# 📹 YouTube 영상 업로드 및 연동 가이드

**작성 일시**: 2025-12-29  
**목적**: 임시 영상 시스템 구축 (테스트용)  
**예상 시간**: 30분

---

## 📋 목차
1. [YouTube Private 영상 업로드](#youtube-private-영상-업로드)
2. [영상 URL 획득](#영상-url-획득)
3. [데이터베이스 업데이트](#데이터베이스-업데이트)
4. [테스트 방법](#테스트-방법)

---

## YouTube Private 영상 업로드

### 1단계: YouTube Studio 접속

1. **YouTube Studio** 접속
   - URL: https://studio.youtube.com
   - Google 계정 로그인

2. **업로드** 버튼 클릭
   - 우측 상단 "만들기" → "동영상 업로드"

### 2단계: 영상 업로드

#### 권장 영상 사양
```
형식: MP4
해상도: 1080p (1920x1080) 이상
길이: 5-10분 (테스트용)
파일 크기: 100MB 이하
```

#### 영상 정보 입력
```
제목: [테스트] 마인드스토리 LMS 샘플 강의
설명: 마인드스토리 LMS 테스트용 샘플 영상입니다.
```

### 3단계: 공개 설정

**중요**: 반드시 **"비공개" 또는 "일부 공개"** 선택

```
공개 설정:
✓ 비공개 (Private) - 나만 볼 수 있음 [추천]
  └ 링크만 알면 누구나 볼 수 있음
  └ YouTube 검색에 노출되지 않음

또는

✓ 일부 공개 (Unlisted) - 링크가 있는 사람만 볼 수 있음
  └ YouTube 검색에 노출되지 않음
  └ 링크 공유 시에만 접근 가능
```

### 4단계: 업로드 완료

- **처리 시간**: 5-15분 (영상 길이에 따라)
- **완료 확인**: "처리 완료" 메시지 확인

---

## 영상 URL 획득

### YouTube Embed URL 형식

#### 일반 YouTube URL
```
https://www.youtube.com/watch?v=VIDEO_ID
```

#### Embed URL (LMS에서 사용)
```
https://www.youtube.com/embed/VIDEO_ID
```

### URL 변환 방법

1. **YouTube Studio에서 복사**
   ```
   1. 업로드된 영상 클릭
   2. 우측 "공유" 버튼 클릭
   3. "복사" 버튼 클릭
   ```

2. **URL 형식 변환**
   ```bash
   # 복사한 URL (예시)
   https://www.youtube.com/watch?v=dQw4w9WgXcQ
   
   # Embed URL로 변환
   https://www.youtube.com/embed/dQw4w9WgXcQ
   ```

3. **VIDEO_ID 확인**
   ```
   URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ
                                       ↑
                                   VIDEO_ID
   ```

---

## 데이터베이스 업데이트

### 방법 1: Wrangler CLI 사용 (권장)

```bash
cd /home/user/webapp

# 1. VIDEO_ID 확인 (예: dQw4w9WgXcQ)
VIDEO_ID="dQw4w9WgXcQ"

# 2. Embed URL 생성
EMBED_URL="https://www.youtube.com/embed/$VIDEO_ID"

# 3. 데이터베이스 업데이트 (차시 ID 1번)
npx wrangler d1 execute mindstory-production --local --command="
UPDATE lessons 
SET video_url = '$EMBED_URL',
    video_provider = 'youtube',
    video_id = '$VIDEO_ID'
WHERE id = 1;
"

# 4. 확인
npx wrangler d1 execute mindstory-production --local --command="
SELECT id, title, video_url, video_provider 
FROM lessons 
WHERE id = 1;
"
```

### 방법 2: SQL 파일 사용

```bash
# 1. SQL 파일 생성
cat > /tmp/update_video.sql << 'EOF'
UPDATE lessons 
SET video_url = 'https://www.youtube.com/embed/YOUR_VIDEO_ID',
    video_provider = 'youtube',
    video_id = 'YOUR_VIDEO_ID'
WHERE id = 1;

SELECT id, title, video_url FROM lessons WHERE id = 1;
EOF

# 2. 실행
npx wrangler d1 execute mindstory-production --local --file=/tmp/update_video.sql
```

### 여러 차시에 동시 업데이트

```bash
# 차시 1-5에 동일한 영상 설정 (테스트용)
npx wrangler d1 execute mindstory-production --local --command="
UPDATE lessons 
SET video_url = 'https://www.youtube.com/embed/YOUR_VIDEO_ID',
    video_provider = 'youtube',
    video_id = 'YOUR_VIDEO_ID'
WHERE id IN (1, 2, 3, 4, 5);
"
```

---

## 테스트 방법

### 1단계: 브라우저에서 접속

```
1. 로그인: student1@example.com / test123
2. "내 강의실" 클릭
3. "마인드 타임 코칭 입문" 클릭
4. 첫 번째 차시 클릭
```

### 2단계: 영상 재생 확인

#### ✅ 정상 작동 시
```
- YouTube 플레이어 표시
- 재생 버튼 클릭 가능
- 소리 정상 재생
- 전체 화면 모드 가능
```

#### ❌ 오류 발생 시

**오류 1: "동영상을 사용할 수 없습니다"**
```
원인: 공개 설정이 "비공개"로 설정됨
해결: YouTube Studio → 공개 설정 → "일부 공개" 선택
```

**오류 2: "재생 오류"**
```
원인: Embed URL 형식 오류
해결: URL 확인 - https://www.youtube.com/embed/VIDEO_ID
```

**오류 3: "iframe을 로드할 수 없습니다"**
```
원인: CSP (Content Security Policy) 차단
해결: 현재 설정에서는 발생하지 않음 (이미 허용됨)
```

### 3단계: 진도율 테스트 (현재 미구현)

```
⚠️ 주의: 진도율 자동 저장 기능은 아직 미구현 상태입니다.

현재 가능:
- 영상 시청 ✅
- 소리 재생 ✅

미구현:
- 진도율 자동 저장 ❌
- 건너뛰기 감지 ❌
```

---

## 📋 체크리스트

### YouTube 업로드
- [ ] YouTube Studio 접속
- [ ] 영상 업로드 (5-10분)
- [ ] 공개 설정: "비공개" 또는 "일부 공개"
- [ ] 처리 완료 확인

### URL 획득
- [ ] 영상 URL 복사
- [ ] VIDEO_ID 확인
- [ ] Embed URL 변환
  - [ ] 형식: `https://www.youtube.com/embed/VIDEO_ID`

### 데이터베이스 업데이트
- [ ] Wrangler CLI로 실행
- [ ] `lessons` 테이블 업데이트
- [ ] `video_url` 확인
- [ ] `video_provider` = 'youtube' 확인

### 테스트
- [ ] 로그인 확인
- [ ] 내 강의실 접속
- [ ] 차시 클릭
- [ ] 영상 재생 확인
- [ ] 소리 재생 확인

---

## 🎯 완료 기준

### 최소 기준
```
✅ 영상 1개 업로드
✅ 차시 1개에 영상 URL 연결
✅ 브라우저에서 재생 확인
✅ 소리 재생 확인
```

### 권장 기준
```
✅ 영상 3-5개 업로드
✅ 각 차시에 영상 연결
✅ 모든 차시 재생 확인
✅ 모바일에서도 테스트
```

---

## 🚀 다음 단계

### 임시 시스템 완료 후
1. ✅ 베타 테스터에게 안내
2. ✅ 피드백 수집
3. ⚠️ Cloudflare R2로 마이그레이션 준비

### Cloudflare R2 연동 (정식)
**예상 시간**: 2-4주
**작업 내용**:
1. R2 버킷 생성
2. 영상 업로드 API 구현
3. 진도율 추적 JavaScript 구현
4. 오프라인 백업 기능

---

## 📞 문의

**작성자**: AI 개발 어시스턴트  
**작성 완료**: 2025-12-29  
**다음 업데이트**: Cloudflare R2 연동 시

---

© 2025 마인드스토리 원격평생교육원. All rights reserved.
