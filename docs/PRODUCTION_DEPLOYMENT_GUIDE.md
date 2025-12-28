# 🚀 프로덕션 배포 가이드

**작성일**: 2025-12-28  
**버전**: Ver.2.2  
**대상**: 박종석 대표님 / 기술 담당자

---

## 📋 목차

1. [배포 전 체크리스트](#배포-전-체크리스트)
2. [도메인 선택 가이드](#도메인-선택-가이드)
3. [Cloudflare Pages 배포](#cloudflare-pages-배포)
4. [환경변수 설정](#환경변수-설정)
5. [외부 서비스 연동](#외부-서비스-연동)
6. [배포 후 테스트](#배포-후-테스트)
7. [문제 해결](#문제-해결)

---

## 배포 전 체크리스트

### ✅ 필수 준비 사항

#### 1. Cloudflare 계정
- [ ] Cloudflare 가입 완료
- [ ] 결제 정보 등록 (무료 플랜 가능)
- [ ] wrangler CLI 로그인 완료

#### 2. 카카오 Developers
- [ ] 카카오 앱 생성 완료
- [ ] REST API 키 발급 완료
- [ ] 현재 키: `b7546f57b409c0a79b940ae6e8f40312`

#### 3. 토스페이먼츠
- [ ] 가맹점 신청 완료
- [ ] Client Key 발급
- [ ] Secret Key 발급
- [ ] 사업자등록번호: 504-88-01964

#### 4. 샘플 영상
- [ ] 테스트용 영상 파일 준비 (MP4, 10분 분량)
- [ ] 실제 강의 영상 준비

---

## 도메인 선택 가이드

### Option 1: Cloudflare Pages 기본 도메인 (무료) ⭐ 권장

**URL**: `https://mindstory-lms.pages.dev`

**장점**:
- ✅ 무료
- ✅ SSL 인증서 자동
- ✅ 즉시 사용 가능
- ✅ Cloudflare CDN 자동 적용

**단점**:
- ⚠️ `.pages.dev` 도메인 (전문성 낮음)

**추천**: 초기 테스트 및 런칭용으로 적합

---

### Option 2: 기존 도메인 연결 (추천) ⭐⭐

**기존 도메인**: `mindstorys.com`

**서브도메인 추천**:
1. `lms.mindstorys.com` - LMS 전용
2. `edu.mindstorys.com` - 교육 전용
3. `academy.mindstorys.com` - 학원 느낌

**설정 방법**:
1. Cloudflare DNS에 CNAME 레코드 추가
2. Cloudflare Pages에서 커스텀 도메인 추가
3. SSL 인증서 자동 발급 (24시간 이내)

**추천**: 전문성과 브랜드 통일성

---

### Option 3: 새 도메인 구매 (선택)

**추천 도메인**:
- mindstory-lms.com
- mindstory-edu.com
- mindstory-academy.com

**비용**: 연 15,000원 ~ 30,000원

---

## Cloudflare Pages 배포

### 1️⃣ Cloudflare 계정 확인

```bash
# wrangler 로그인 상태 확인
npx wrangler whoami

# 로그인 필요 시
npx wrangler login
```

---

### 2️⃣ 프로젝트 빌드

```bash
cd /home/user/webapp

# 빌드
npm run build

# 빌드 결과 확인
ls -lh dist/
```

**예상 출력**:
```
dist/
├── _worker.js     (218KB) - 메인 서버 코드
├── _routes.json   - 라우팅 설정
└── static/        - 정적 파일
```

---

### 3️⃣ Cloudflare Pages 프로젝트 생성

```bash
# 프로젝트 생성 (처음 1회만)
npx wrangler pages project create mindstory-lms \
  --production-branch main \
  --compatibility-date 2024-01-01
```

---

### 4️⃣ 프로덕션 배포

```bash
# 배포
npx wrangler pages deploy dist --project-name mindstory-lms

# 성공 메시지 예시:
# ✅ Deployed to https://mindstory-lms.pages.dev
```

**⏱️ 소요 시간**: 2-3분

---

### 5️⃣ 배포 확인

```bash
# 배포된 URL 접속
curl https://mindstory-lms.pages.dev

# 또는 브라우저에서 접속
open https://mindstory-lms.pages.dev
```

---

## 환경변수 설정

### 🔑 필수 환경변수

#### 1. 카카오 로그인

```bash
# 카카오 Client ID
npx wrangler pages secret put KAKAO_CLIENT_ID \
  --project-name mindstory-lms

# 입력 프롬프트에서 입력: b7546f57b409c0a79b940ae6e8f40312

# 카카오 Redirect URI
npx wrangler pages secret put KAKAO_REDIRECT_URI \
  --project-name mindstory-lms

# 입력 프롬프트에서 입력: https://mindstory-lms.pages.dev/api/auth/kakao/callback
```

#### 2. 토스페이먼츠

```bash
# Toss Client Key
npx wrangler pages secret put TOSS_CLIENT_KEY \
  --project-name mindstory-lms

# 입력 프롬프트에서 입력: (토스페이먼츠에서 발급받은 키)

# Toss Secret Key
npx wrangler pages secret put TOSS_SECRET_KEY \
  --project-name mindstory-lms

# 입력 프롬프트에서 입력: (토스페이먼츠에서 발급받은 키)
```

---

### 🔍 환경변수 확인

```bash
# 등록된 환경변수 목록 확인
npx wrangler pages secret list --project-name mindstory-lms
```

**예상 출력**:
```
KAKAO_CLIENT_ID
KAKAO_REDIRECT_URI
TOSS_CLIENT_KEY
TOSS_SECRET_KEY
```

---

## 외부 서비스 연동

### 1️⃣ 카카오 Developers 설정

#### A. Redirect URI 등록

1. https://developers.kakao.com 접속
2. 내 애플리케이션 → 앱 설정 → 앱 → 플랫폼 키
3. REST API 키 클릭 → 카카오 로그인 리다이렉트 URI 섹션
4. **신규 URI 추가**:
   ```
   https://mindstory-lms.pages.dev/api/auth/kakao/callback
   ```
5. 저장

#### B. 동의 항목 설정 (선택)

1. 제품 설정 → 카카오 로그인 → 동의항목
2. **닉네임**: 필수 동의
3. **이메일**: 필수 동의 (비즈니스 인증 필요 가능)
4. 저장

---

### 2️⃣ 토스페이먼츠 설정

#### A. 웹훅 URL 등록

1. 토스페이먼츠 개발자센터 접속
2. 웹훅 설정
3. **웹훅 URL 추가**:
   ```
   https://mindstory-lms.pages.dev/api/payments-v2/webhook
   ```
4. 저장

#### B. 결제 승인 URL 설정

1. 상점 관리 → 결제 설정
2. **성공 URL**:
   ```
   https://mindstory-lms.pages.dev/payment/success
   ```
3. **실패 URL**:
   ```
   https://mindstory-lms.pages.dev/payment/fail
   ```
4. 저장

---

### 3️⃣ Cloudflare R2 설정 (영상 호스팅)

#### A. R2 버킷 생성 (이미 완료)

```bash
# 버킷 목록 확인
npx wrangler r2 bucket list

# 예상 출력:
# mindstory-videos
# mindstory-storage
```

#### B. 공개 URL 설정

1. Cloudflare 대시보드 → R2
2. `mindstory-videos` 버킷 클릭
3. Settings → Public Access → Enable Public Access
4. 공개 URL 확인: `https://pub-xxxxx.r2.dev`

---

## 배포 후 테스트

### ✅ 필수 테스트 체크리스트

#### 1. 기본 접속
```bash
# 홈페이지 접속
curl https://mindstory-lms.pages.dev

# 응답 확인 (200 OK)
```

#### 2. 회원 시스템
- [ ] 회원가입 (이메일)
- [ ] 로그인 (이메일)
- [ ] **카카오 로그인** (실제 계정으로 테스트)
- [ ] 로그아웃
- [ ] 비밀번호 변경
- [ ] 회원 탈퇴

#### 3. 과정 및 수강
- [ ] 과정 목록 조회
- [ ] 과정 상세 보기
- [ ] 수강 신청 (무료)
- [ ] 내 강의실

#### 4. 결제 시스템
- [ ] **결제 위젯 표시**
- [ ] **테스트 결제** (토스 테스트 카드)
- [ ] 결제 승인
- [ ] 결제 내역 조회
- [ ] **환불 신청**
- [ ] **환불 처리**

#### 5. 영상 시스템
- [ ] 영상 업로드 (관리자)
- [ ] 영상 재생 (PC)
- [ ] **영상 재생 (모바일)**
- [ ] 진도율 저장
- [ ] 건너뛰기 차단
- [ ] 수료 처리

#### 6. 관리자 기능
- [ ] 관리자 로그인
- [ ] 대시보드 통계
- [ ] 과정 등록
- [ ] 회원 관리
- [ ] 결제 관리

---

### 📱 모바일 테스트 (중요!)

**테스트 디바이스**:
- [ ] iPhone (Safari)
- [ ] Android (Chrome)
- [ ] iPad (Safari)

**테스트 항목**:
1. 홈페이지 레이아웃
2. 로그인/가입 폼
3. 과정 목록 스크롤
4. **영상 재생**
5. **진도율 저장**
6. **건너뛰기 차단**
7. 결제 위젯

---

## 문제 해결

### ❌ 문제 1: 카카오 로그인 실패

**증상**: "redirect_uri mismatch" 에러

**원인**: Redirect URI가 등록되지 않음

**해결**:
1. 카카오 Developers → 앱 설정 → 플랫폼 키
2. REST API 키 → 카카오 로그인 리다이렉트 URI
3. `https://mindstory-lms.pages.dev/api/auth/kakao/callback` 추가
4. 저장 후 재시도

---

### ❌ 문제 2: 결제 위젯 로드 실패

**증상**: 결제 페이지에서 위젯이 표시되지 않음

**원인**: TOSS_CLIENT_KEY 미설정

**해결**:
```bash
# Client Key 재등록
npx wrangler pages secret put TOSS_CLIENT_KEY --project-name mindstory-lms

# 환경변수 확인
npx wrangler pages secret list --project-name mindstory-lms
```

---

### ❌ 문제 3: 영상 재생 실패

**증상**: 영상이 로드되지 않음

**원인**: R2 버킷 권한 또는 CORS 설정

**해결**:
1. Cloudflare 대시보드 → R2 → mindstory-videos
2. Settings → CORS Policy 추가:
```json
[
  {
    "AllowedOrigins": ["https://mindstory-lms.pages.dev"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

---

### ❌ 문제 4: 데이터베이스 오류

**증상**: "D1 database not found" 에러

**원인**: 프로덕션 DB 마이그레이션 미적용

**해결**:
```bash
# 프로덕션 DB 마이그레이션 적용
npx wrangler d1 migrations apply mindstory-production

# 초기 데이터 삽입
npx wrangler d1 execute mindstory-production --file=./seed.sql
```

---

### ❌ 문제 5: 환경변수 반영 안됨

**증상**: 환경변수가 설정되었는데도 인식 안됨

**원인**: 재배포 필요

**해결**:
```bash
# 재배포
npx wrangler pages deploy dist --project-name mindstory-lms
```

---

## 🔄 업데이트 배포

### 코드 변경 후 재배포

```bash
# 1. 빌드
cd /home/user/webapp
npm run build

# 2. 배포
npx wrangler pages deploy dist --project-name mindstory-lms

# 3. 확인
curl https://mindstory-lms.pages.dev
```

---

### 데이터베이스 마이그레이션 추가

```bash
# 1. 마이그레이션 파일 생성
# migrations/0006_xxx.sql

# 2. 로컬 테스트
npx wrangler d1 migrations apply mindstory-production --local

# 3. 프로덕션 적용
npx wrangler d1 migrations apply mindstory-production
```

---

## 📊 배포 완료 체크리스트

### Phase 1: 초기 배포 ✅
- [ ] Cloudflare Pages 배포 완료
- [ ] 환경변수 설정 완료
- [ ] DB 마이그레이션 적용 완료
- [ ] 카카오 Redirect URI 등록 완료
- [ ] 토스페이먼츠 웹훅 등록 완료

### Phase 2: 기능 테스트 ✅
- [ ] 회원가입/로그인 테스트
- [ ] 카카오 로그인 테스트
- [ ] 결제 테스트 (토스 테스트 모드)
- [ ] 영상 재생 테스트
- [ ] 진도율 저장 테스트
- [ ] 모바일 테스트

### Phase 3: 실제 운영 준비 ✅
- [ ] 실제 강의 영상 업로드
- [ ] 실제 과정 등록
- [ ] 토스페이먼츠 실결제 모드 전환
- [ ] 공지사항 등록
- [ ] 팝업 등록

---

## 📞 배포 지원

배포 중 문제가 발생하면 아래로 연락주세요:

- **이메일**: sanj2100@naver.com
- **전화**: 062-959-9535

---

## 🎉 배포 성공 시 다음 단계

1. **도메인 커스터마이징** (선택)
   - mindstorys.com 서브도메인 연결
   - 또는 새 도메인 구매

2. **콘텐츠 준비**
   - 실제 강의 영상 업로드
   - 과정 정보 등록
   - 공지사항 작성

3. **마케팅 준비**
   - 카카오톡 채널 연동
   - SNS 연동
   - 메일 발송 준비

4. **정식 오픈** 🎊

---

**문서 버전**: 1.0  
**최종 수정일**: 2025-12-28  
**작성자**: AI Assistant

© 2025 마인드스토리 원격평생교육원. All rights reserved.
