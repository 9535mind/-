# 🔍 마인드스토리 LMS 종합 점검 체크리스트

**작성일**: 2025-12-27  
**버전**: v1.3.2

---

## 1️⃣ 결제 시스템

### ✅ 현재 구현 상태
- [x] 결제 데이터 모델 (`payments` 테이블)
- [x] 결제 생성/조회 API
- [x] 환불 API (관리자)
- [x] 결제 내역 UI

### ⚠️ 연동 필요 (API 서비스 준비 시)
- [ ] **사업자등록번호 제공 필요**
- [ ] **계좌번호 제공 필요**
- [ ] PG사 선택 (토스페이먼츠 권장)
- [ ] 테스트 결제 연동
- [ ] 운영 결제 전환

### 📋 취소/부분취소 기능
- [x] 전액 환불 API 구현
- [x] 환불 시 권한 즉시 회수
- [ ] **부분 환불 규정 설정 필요**
  ```
  예시:
  - 학습 시작 전: 100% 환불
  - 진도 50% 미만: 50% 환불
  - 진도 50% 이상: 환불 불가
  ```

### 📧 웹훅 (Webhook) 처리
- [ ] 웹훅 엔드포인트 구현 대기
- [ ] 결제 완료 시 자동 권한 부여
- [ ] 환불 완료 시 자동 권한 회수
- [ ] 재시도 정책 (최대 5회)

### 🧾 영수증/매출전표
- [ ] PG사 자동 발행 (토스페이먼츠)
- [ ] LMS 내 영수증 조회 UI
- [ ] 거래 명세서 PDF 다운로드

**📌 Action Required**: 
1. 사업자등록번호 제공
2. 정산 계좌 정보 제공
3. PG사 선택 및 가입

---

## 2️⃣ 영상 호스팅 (Kollus/VideoCloud)

### ✅ 현재 구현 상태
- [x] 차시별 영상 URL 저장
- [x] 진도율 추적 시스템
- [x] 학습 시간 기록

### ⚠️ 실시청 시간 기반 진도율
**현재 문제점**: 페이지 열람만으로 진도 100% 가능

**해결 방법**: 
- [ ] Kollus/VideoCloud API 연동
- [ ] Player에서 실시간 시청 시간 수집
- [ ] 서버에서 진도율 검증
- [ ] 80% 이상 시청 시 완료 인정

### 🔒 보안 기능
- [ ] **DRM 기본 설정** (Kollus 자동 제공)
- [ ] **도메인 제한** 설정
  ```
  허용 도메인: mindstory.pages.dev
  ```
- [ ] 화면 캡처 방지
- [ ] 다운로드 방지

### 📊 시청 로그
- [ ] 실시청 시간 수집
- [ ] 건너뛰기 감지
- [ ] 재생 속도 제한 (1.5배속 최대)

**📌 Action Required**:
1. Kollus 또는 VideoCloud 선택
2. 계정 생성 및 사업자 인증
3. API 키 발급
4. 영상 업로드

---

## 3️⃣ 환불 처리 및 권한 회수

### ✅ 현재 구현 상태
```typescript
// 환불 API: /api/payments/:id/refund
POST /api/payments/1/refund

응답:
{
  "success": true,
  "message": "환불이 완료되었습니다."
}
```

### ✅ 자동 권한 회수
```typescript
// 환불 시 자동 실행:
1. payments 테이블: status = 'refunded'
2. enrollments 테이블: is_active = 0
3. 즉시 학습 불가능
```

### 🧪 테스트 필요
- [ ] 환불 후 "내 강의실"에서 과정 숨김 확인
- [ ] 환불 후 학습 페이지 접근 차단 확인
- [ ] 진도 데이터는 유지되는지 확인 (통계용)

**📌 Action Required**: 실제 환불 시나리오 테스트

---

## 4️⃣ 수료증 발급

### ✅ 현재 구현 상태
- [x] 수료 조건 체크 (진도율 80%)
- [x] 수료증 번호 자동 생성 (`MS-2025-0001`)
- [x] 수료증 발급 API
- [x] 수료증 조회 및 재발급

### ⚠️ 개선 필요
- [ ] **본인인증 체크** (수료증 발급 시)
  ```typescript
  // 현재: 본인인증 없이 발급 가능
  // 개선: 휴대폰 인증 후 발급
  if (!user.phone_verified) {
    throw new Error('본인인증이 필요합니다')
  }
  ```

### 📄 PDF 생성
- [ ] PDF 라이브러리 연동 (jsPDF 등)
- [ ] 수료증 템플릿 디자인
- [ ] 직인/서명 이미지 추가

**📌 Action Required**:
1. 본인인증 API 연동 (Pass, NICE)
2. 수료증 디자인 시안 제공
3. 직인/서명 이미지 파일 제공

---

## 5️⃣ PDF 다운로드 보안

### ⚠️ 현재 문제점
```
URL만 알면 누구나 다운로드 가능:
/static/certificates/MS-2025-0001.pdf
```

### ✅ 보안 개선 방안
```typescript
// 1. 임시 다운로드 URL 생성
GET /api/certificates/:id/download
→ 응답: { "url": "/download/abc123xyz", "expires_at": "2025-12-27T15:00:00Z" }

// 2. 임시 URL로 다운로드 (1회성, 10분 유효)
GET /download/abc123xyz
→ PDF 파일 전송 후 토큰 만료

// 3. 세션 체크
if (!isLoggedIn || !isOwner) {
  return 403 Forbidden
}
```

**📌 Action Required**: 다운로드 보안 로직 구현

---

## 6️⃣ 동일 ID 동시 접속 차단

### ✅ 현재 구현 상태
- [x] `user_sessions` 테이블 존재
- [x] 로그인 시 세션 생성

### ⚠️ 개선 필요
```typescript
// 로그인 시 기존 세션 확인
const activeSessions = await DB.prepare(`
  SELECT COUNT(*) as count
  FROM user_sessions
  WHERE user_id = ? 
    AND is_active = 1
    AND last_activity > datetime('now', '-10 minutes')
`).bind(userId).first()

if (activeSessions.count >= 1) {
  // 기존 세션 강제 로그아웃
  await DB.prepare(`
    UPDATE user_sessions
    SET is_active = 0
    WHERE user_id = ? AND is_active = 1
  `).bind(userId).run()
  
  // 알림: "다른 기기에서 로그인되어 기존 세션이 종료되었습니다."
}
```

**📌 Action Required**: 동시 접속 차단 로직 추가

---

## 7️⃣ 관리자 보안

### ✅ 현재 구현 상태
- [x] 관리자 권한 체크 (`role = 'admin'`)
- [x] JWT 토큰 인증

### ⚠️ 개선 필요

#### A. 비밀번호 정책
```typescript
// 회원가입/비밀번호 변경 시 검증
const passwordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true
}

// 예: "Admin123!"
```

#### B. 관리자 URL 변경
```typescript
// 현재: /api/admin/*
// 개선: /api/secure-admin-{RANDOM_CODE}/*

// wrangler.jsonc 환경 변수
{
  "vars": {
    "ADMIN_URL_PREFIX": "secure-admin-a7b3c9"
  }
}
```

#### C. IP 제한 (선택)
```typescript
const ALLOWED_ADMIN_IPS = [
  '123.45.67.89',  // 사무실 IP
  '192.168.1.1'    // 자택 IP
]

if (!ALLOWED_ADMIN_IPS.includes(clientIP)) {
  return c.json({ error: '접근 권한이 없습니다' }, 403)
}
```

**📌 Action Required**:
1. 비밀번호 정책 적용
2. 관리자 URL 변경 결정
3. IP 제한 필요 여부 결정

---

## 8️⃣ 필수 약관 페이지

### ⚠️ 현재 상태: 미작성

### ✅ 필수 약관
1. **이용약관** (`/terms`)
   - 서비스 이용 규칙
   - 회원 가입 조건
   - 금지 행위
   - 서비스 제한/중단

2. **개인정보처리방침** (`/privacy`)
   - 수집 항목: 이름, 이메일, 휴대폰, 결제정보
   - 이용 목적: 회원 관리, 과정 운영, 수료증 발급
   - 보관 기간: 회원 탈퇴 시까지
   - 제3자 제공: PG사, 본인인증사, 영상 호스팅사

3. **환불규정** (`/refund`)
   - 전액 환불 조건
   - 부분 환불 조건
   - 환불 불가 조건
   - 환불 처리 기간

4. **수료/수료증 발급 기준** (`/certification`)
   - 진도율 80% 이상
   - 본인인증 필수
   - 수료증 번호 규칙
   - 재발급 정책

**📌 Action Required**: 약관 작성 (법무팀 검토 권장)

---

## 9️⃣ 백업 및 복구

### ✅ 현재 백업
- [x] Git 버전 관리
- [x] 프로젝트 tar.gz 백업

### ⚠️ 개선 필요

#### A. 자동 백업 스크립트
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/user/backups"

# 1. 데이터베이스 백업
wrangler d1 export mindstory-production --local --output="$BACKUP_DIR/db_$DATE.sql"

# 2. 업로드 파일 백업 (R2 사용 시)
# wrangler r2 object get webapp-bucket ...

# 3. 설정 파일 백업
cp wrangler.jsonc "$BACKUP_DIR/wrangler_$DATE.jsonc"

# 4. 30일 이상 백업 삭제
find "$BACKUP_DIR" -name "*.sql" -mtime +30 -delete

echo "백업 완료: $BACKUP_DIR/db_$DATE.sql"
```

#### B. 복구 절차 문서화
```markdown
## 복구 방법

### 1. 데이터베이스 복구
cd /home/user/webapp
wrangler d1 execute mindstory-production --local --file=backup_20250127.sql

### 2. 코드 복구
tar -xzf mindstory-lms-v1.3.2.tar.gz
cd webapp
npm install
npm run build

### 3. 서비스 재시작
pm2 restart mindstory-lms
```

**📌 Action Required**:
1. 백업 스크립트 작성
2. 복구 절차 테스트
3. 백업 주기 결정 (일일/주간)

---

## 🔟 모바일 E2E 테스트

### 테스트 시나리오
```
1. 회원가입
   - 모바일에서 회원가입
   - 이메일 형식 검증
   - 비밀번호 8자 이상

2. 로그인
   - 모바일에서 로그인
   - JWT 토큰 저장
   - "내 강의실" 접근

3. 과정 신청
   - 과정 목록 조회
   - 과정 상세 페이지
   - 수강 신청 버튼

4. 결제 (모의)
   - 결제 페이지 이동
   - 결제 정보 입력
   - 결제 완료 확인

5. 학습
   - "내 강의실" 접속
   - 차시 선택
   - 영상 재생
   - 진도율 저장 (3초마다)

6. 수료
   - 모든 차시 80% 이상 시청
   - 수료 처리 확인
   - 수료증 발급

7. 수료증 다운로드
   - PDF 다운로드
   - 모바일에서 열람 가능
   - 카카오톡/이메일 공유
```

### 체크리스트
- [ ] 회원가입 → 로그인
- [ ] 과정 목록 조회
- [ ] 과정 상세 페이지
- [ ] 수강 신청
- [ ] 결제 (모의)
- [ ] 내 강의실 접근
- [ ] 영상 재생
- [ ] 진도율 저장
- [ ] 수료 처리
- [ ] 수료증 발급
- [ ] 수료증 다운로드

**📌 Action Required**: 실제 모바일 기기로 전체 플로우 테스트

---

## 📊 최종 점검 요약

| 항목 | 상태 | 필요 조치 |
|------|------|-----------|
| 결제 시스템 | ⚠️ 연동 대기 | 사업자정보/계좌 제공 필요 |
| 영상 호스팅 | ⚠️ 연동 대기 | Kollus 계정 생성 필요 |
| 환불 처리 | ✅ 구현 완료 | 테스트 필요 |
| 수료증 발급 | ⚠️ 부분 완료 | 본인인증/PDF 생성 필요 |
| PDF 보안 | ❌ 미구현 | 임시 URL 방식 구현 필요 |
| 동시 접속 차단 | ⚠️ 부분 완료 | 로직 개선 필요 |
| 관리자 보안 | ⚠️ 부분 완료 | 비밀번호 정책/URL 변경 |
| 약관 페이지 | ❌ 미작성 | 법무 검토 후 작성 |
| 백업/복구 | ⚠️ 수동 | 자동화 스크립트 필요 |
| 모바일 E2E | ❌ 미테스트 | 실기기 테스트 필요 |

---

## 🚀 우선순위 로드맵

### Phase 1: 핵심 기능 완성 (1-2주)
1. ✅ 약관 페이지 작성 및 게시
2. ✅ 본인인증 API 연동 준비
3. ✅ PDF 다운로드 보안 적용
4. ✅ 동시 접속 차단 적용
5. ✅ 관리자 비밀번호 정책

### Phase 2: 외부 서비스 연동 (2-3주)
1. ⏳ PG 결제 연동 (토스페이먼츠)
2. ⏳ 영상 호스팅 연동 (Kollus)
3. ⏳ 본인인증 API 연동 (Pass/NICE)
4. ⏳ SMS 발송 (선택)

### Phase 3: 운영 준비 (1주)
1. ⏳ 모바일 E2E 테스트
2. ⏳ 백업 자동화
3. ⏳ 모니터링 설정
4. ⏳ 운영 매뉴얼 작성

---

**최종 업데이트**: 2025-12-27  
**다음 업데이트 예정**: 외부 API 연동 완료 후
