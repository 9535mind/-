# 🎬 Cloudflare Stream 통합 가이드

## 📌 개요

Mindstory LMS는 **Cloudflare Stream**을 메인 영상 인프라로 채택하여 **완벽한 보안**과 **빠른 스트리밍**을 제공합니다.

- **배포 URL**: https://e6254bb2.mindstory-lms.pages.dev
- **프로덕션**: https://mindstory-lms.pages.dev
- **구현 일자**: 2026-01-03
- **버전**: Ver.4.0

---

## 🎯 핵심 기능

### 1️⃣ Signed URL (서명된 URL)
- **목적**: 영상 URL을 정적으로 노출하지 않고, 유효기간이 짧은 토큰으로 보호
- **구현**: RSA-256 알고리즘으로 JWT 토큰 생성
- **유효기간**: 1시간 (자동 갱신)
- **API 엔드포인트**: `/api/stream/signed-url`

### 2️⃣ 동적 워터마크
- **목적**: 영상 유출 시 추적 가능
- **표시 정보**: 사용자 ID, 이름
- **위치**: 화면 내 떠다니는 애니메이션 (10초 주기)
- **스타일**: 반투명 검정 배경, 흰색 텍스트

### 3️⃣ 커스텀 플레이어
- **배속 조절**: 0.5x ~ 2.0x
- **이어보기**: 로컬스토리지에 재생 위치 저장 (24시간 유효)
- **진도율 추적**: 5초마다 서버에 전송
- **보안 기능**: 우클릭 차단, 드래그 차단, 복사 차단

### 4️⃣ 도메인 제한 (Allowed Origins)
- **설정 위치**: Cloudflare Dashboard → Stream → Settings → Allowed Origins
- **권장 도메인**:
  - `https://mindstory-lms.pages.dev`
  - `https://www.mindstory.co.kr` (커스텀 도메인)
  - `https://localhost:3000` (개발용)

---

## 🔧 설정 방법

### 1단계: Cloudflare Stream Signing Key 생성

1. **Cloudflare Dashboard 접속**
   - https://dash.cloudflare.com/

2. **Stream → Settings → Signing Keys**
   - "Create a key" 클릭
   - **Key ID**와 **PEM-encoded private key** 복사

3. **환경변수 설정**
   ```bash
   # 개발 환경 (.dev.vars 파일 생성)
   STREAM_SIGNING_KEY_ID=your-key-id-here
   STREAM_SIGNING_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\nHere\n-----END PRIVATE KEY-----
   CLOUDFLARE_API_TOKEN=your-api-token-here
   ```

4. **프로덕션 환경 (Wrangler Secrets)**
   ```bash
   npx wrangler pages secret put STREAM_SIGNING_KEY_ID --project-name mindstory-lms
   npx wrangler pages secret put STREAM_SIGNING_PRIVATE_KEY --project-name mindstory-lms
   npx wrangler pages secret put CLOUDFLARE_API_TOKEN --project-name mindstory-lms
   ```

### 2단계: Allowed Origins 설정

1. **Cloudflare Dashboard → Stream → Settings → Allowed Origins**
2. **다음 도메인 추가**:
   - `https://mindstory-lms.pages.dev`
   - `https://www.mindstory.co.kr`
   - `https://e6254bb2.mindstory-lms.pages.dev` (현재 배포)

### 3단계: 영상 보안 설정

1. **각 영상의 Security 설정을 "Signed"로 변경**
   - Stream Dashboard → 영상 선택 → Security → Signed URLs Required

---

## 📹 사용 방법

### 관리자: 영상 업로드

1. **차시 관리 페이지** 접속: `/admin/lessons?courseId={강좌ID}`
2. **Stream 탭** 선택
3. **Stream 대시보드**에서 영상 업로드
4. **Video ID 입력** (32자리)
5. **차시 저장**

### 수강생: 영상 시청

1. **강좌 학습 페이지** 접속: `/courses/{강좌ID}/learn`
2. **차시 선택**
3. **플레이어 자동 로드**
   - Signed URL 자동 생성
   - 워터마크 자동 표시
   - 이어보기 자동 복원

---

## 📞 지원

- **이메일**: support@mindstory.co.kr
- **배포 URL**: https://e6254bb2.mindstory-lms.pages.dev

**마지막 업데이트**: 2026-01-03
