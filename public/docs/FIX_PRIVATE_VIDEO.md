# 🔧 비공개 동영상 문제 해결 가이드

## 문제 상황
- **증상**: "비공개 동영상입니다" 오류 메시지
- **원인**: YouTube 영상이 비공개 또는 제한된 접근 권한으로 설정됨
- **영향**: 학습자가 해당 차시의 영상을 시청할 수 없음

---

## 📋 해결 방법

### **방법 1: 관리자 UI에서 공개 영상으로 변경 (권장)**

#### 1단계: 관리자 로그인
```
URL: https://cbb2cd46.mindstory-lms.pages.dev/admin/dashboard
계정: admin@lms.kr
비밀번호: admin123456
```

#### 2단계: 차시 관리 페이지 이동
1. 좌측 메뉴에서 **"강좌 관리"** 클릭
2. 해당 강좌(예: "마인드 타임 코칭 입문") 찾기
3. **"차시 관리"** 버튼 클릭

#### 3단계: 문제 차시 수정
1. **10차시** 찾기
2. **"수정"** 버튼 클릭
3. **YouTube 탭** 선택
4. 기존 비공개 영상 URL 삭제

#### 4단계: 공개 YouTube 영상 입력
**테스트용 공개 영상 예시:**

| 영상 제목 | YouTube URL | Video ID |
|----------|-------------|----------|
| 샘플 강의 영상 | `https://www.youtube.com/watch?v=dQw4w9WgXcQ` | `dQw4w9WgXcQ` |
| TED 강연 | `https://www.youtube.com/watch?v=8S0FDjFBj8o` | `8S0FDjFBj8o` |
| 교육용 영상 | `https://www.youtube.com/watch?v=_OBlgSz8sSM` | `_OBlgSz8sSM` |

**입력 방법:**
```
YouTube 영상 URL 또는 ID 입력란:
https://www.youtube.com/watch?v=dQw4w9WgXcQ

또는

dQw4w9WgXcQ
```

#### 5단계: 미리보기 및 저장
1. **"미리보기"** 버튼 클릭 → 영상이 정상 재생되는지 확인
2. **"저장"** 버튼 클릭

#### 6단계: 학습 페이지에서 확인
1. 수강생 계정으로 로그인 (`student@example.com` / `student123`)
2. 해당 강좌 → 학습 시작
3. 10차시 클릭
4. ✅ 영상이 정상적으로 재생되는지 확인

---

### **방법 2: YouTube 영상 공개 설정 변경**

**현재 비공개 영상을 계속 사용하고 싶다면:**

#### YouTube Studio에서 공개 설정 변경
1. [YouTube Studio](https://studio.youtube.com) 접속
2. 좌측 메뉴 **"콘텐츠"** 클릭
3. 해당 영상 찾기
4. **공개 상태** 클릭
5. 다음 중 선택:
   - **공개** ✅ (누구나 시청 가능)
   - **일부 공개** ⚠️ (링크를 아는 사람만 시청)
   - ~~**비공개**~~ ❌ (본인만 시청 가능 - 사용 불가)
6. **저장** 클릭

**권장 설정:**
- **LMS 전용 영상**: "일부 공개" (Unlisted)
- **홍보용 영상**: "공개" (Public)

---

### **방법 3: Cloudflare Stream으로 마이그레이션 (장기 해결책)**

**비공개 영상 문제를 근본적으로 해결하려면:**

#### Cloudflare Stream 장점
- ✅ **완전한 보안**: 비공개 영상을 안전하게 스트리밍
- ✅ **Signed URL**: 유효기간 있는 토큰으로 접근 제어
- ✅ **도메인 제한**: LMS 도메인에서만 재생 가능
- ✅ **워터마크**: 사용자 정보 표시로 유출 방지

#### 마이그레이션 절차
1. **Cloudflare Dashboard** 접속
   - URL: https://dash.cloudflare.com/2e8c2335c9dc802347fb23b9d608d4f4/stream

2. **영상 업로드**
   - "Upload Video" 클릭
   - MP4/MOV 파일 업로드 (최대 30GB)
   - 업로드 완료 후 **Video ID** 복사

3. **관리자 UI에서 설정**
   - 차시 관리 → 수정
   - **CF Stream 탭** 선택
   - Video ID 입력
   - 저장

4. **보안 설정 (선택사항)**
   - Stream Settings → Signing Keys → Create Key
   - `STREAM_SIGNING_KEY_ID`, `STREAM_SIGNING_PRIVATE_KEY` 환경변수 설정
   - Allowed Origins 추가: `https://mindstory-lms.pages.dev`

---

## 🎯 빠른 해결 (30초)

```bash
# 관리자 페이지 접속
https://cbb2cd46.mindstory-lms.pages.dev/admin/dashboard

# 로그인
admin@lms.kr / admin123456

# 강좌 관리 → 차시 관리 → 10차시 수정
# YouTube URL 변경:
https://www.youtube.com/watch?v=dQw4w9WgXcQ

# 저장 → 완료!
```

---

## 📊 영상 공개 설정 비교

| 설정 | 접근성 | LMS 사용 | 보안 | 권장도 |
|------|--------|---------|------|--------|
| **공개 (Public)** | 누구나 | ✅ | ❌ 낮음 | 홍보용 |
| **일부 공개 (Unlisted)** | 링크 보유자 | ✅ | ⚠️ 중간 | LMS 일반 |
| **비공개 (Private)** | 본인만 | ❌ | - | 사용 불가 |
| **Cloudflare Stream** | 토큰 보유자 | ✅ | ✅ 높음 | LMS 유료 |

---

## ⚠️ 주의사항

### YouTube 일부 공개 (Unlisted) 사용 시
- ✅ **장점**: 링크만 알면 시청 가능
- ⚠️ **단점**: 
  - URL이 노출되면 누구나 시청 가능
  - 다운로드 가능 (browser extension)
  - 진도율 추적만 가능, 유출 추적 불가

### Cloudflare Stream 사용 시
- ✅ **장점**: 
  - Signed URL로 접근 제어
  - 다운로드 차단
  - 워터마크로 유출 추적
  - 도메인 제한
- ⚠️ **비용**: 
  - 저장: $5/1,000분
  - 재생: $1/1,000분
  - 월 예상: ~$15 (1,000분 기준)

---

## 🔍 문제 진단

### 현재 영상이 비공개인지 확인하는 방법

1. **YouTube에서 직접 확인**
   ```
   https://www.youtube.com/watch?v=VIDEO_ID
   ```
   - "비공개 동영상입니다" → ❌ 비공개
   - "이 동영상은 일부에게만 공개됩니다" → ⚠️ 일부 공개 (OK)
   - 정상 재생 → ✅ 공개

2. **관리자 페이지에서 미리보기**
   - 차시 관리 → 수정 → 미리보기
   - 영상이 로드되지 않으면 → ❌ 비공개
   - 영상이 재생되면 → ✅ 사용 가능

---

## 📚 관련 문서

- [Cloudflare Stream 전략](/home/user/webapp/docs/CLOUDFLARE_STREAM_STRATEGY.md)
- [Cloudflare Stream 사용 가이드](/home/user/webapp/docs/CLOUDFLARE_STREAM_GUIDE.md)
- [README Ver.4.1](/home/user/webapp/README.md)

---

**작성일**: 2026-01-03  
**작성자**: Genspark AI Agent  
**버전**: 1.0
