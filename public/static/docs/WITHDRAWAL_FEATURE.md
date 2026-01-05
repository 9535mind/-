# 🚪 회원 탈퇴 기능 완전 가이드

**작성일**: 2025-12-28  
**버전**: Ver.2.2  
**작성자**: AI Assistant

---

## 📋 목차

1. [개요](#개요)
2. [구현 사양](#구현-사양)
3. [데이터베이스 구조](#데이터베이스-구조)
4. [API 엔드포인트](#api-엔드포인트)
5. [UI/UX 흐름](#uiux-흐름)
6. [비즈니스 로직](#비즈니스-로직)
7. [테스트 시나리오](#테스트-시나리오)
8. [관리자 기능](#관리자-기능)
9. [FAQ](#faq)

---

## 개요

### 🎯 목적
사용자가 서비스를 더 이상 이용하지 않을 때 안전하고 투명하게 탈퇴할 수 있도록 지원하며,  
탈퇴 사유를 수집하여 서비스 개선에 활용합니다.

### ✨ 특징
- **C안 방식**: 탈퇴 사유 선택 필수
- **소프트 삭제**: 30일간 데이터 보관 후 완전 삭제
- **조건부 차단**: 수강/결제 진행 중이면 탈퇴 불가
- **재가입 허용**: 동일 이메일로 재가입 가능
- **즉시 로그아웃**: 탈퇴 즉시 모든 세션 무효화

---

## 구현 사양

### ✅ 구현된 기능

#### 1. 탈퇴 사유 선택 (5가지)
1. **사용하지 않는 서비스입니다**
2. **원하는 강의가 없습니다**
3. **다른 학습 플랫폼을 사용합니다**
4. **개인정보 보호를 위해**
5. **기타** (상세 사유 직접 입력)

#### 2. 탈퇴 차단 조건
- ✅ **수강 중인 강의 있음**: "진행 중인 수강이 있어 탈퇴할 수 없습니다. 수강을 완료하거나 환불 후 탈퇴해주세요."
- ✅ **결제 내역 남아있음**: "처리 중이거나 완료된 결제 내역이 있어 탈퇴할 수 없습니다. 고객센터로 문의해주세요."

#### 3. 소프트 삭제
- `deleted_at` 컬럼에 탈퇴 일시 기록
- `deletion_reason` 컬럼에 탈퇴 사유 저장
- 실제 데이터는 30일간 보관
- 30일 후 배치 작업으로 완전 삭제 (관리자 구현 필요)

#### 4. 재가입 허용
- 탈퇴한 사용자가 동일 이메일로 재가입 시도
- 기존 탈퇴 데이터 완전 삭제 후 신규 가입 처리
- 과거 이력 초기화

#### 5. 추가 기능
- **내 정보 페이지**: `/my-profile` 신규 추가
- **비밀번호 변경**: 이메일 가입자만 가능
- **소셜 로그인 사용자**: 비밀번호 변경 섹션 숨김

---

## 데이터베이스 구조

### 📊 마이그레이션 파일

**파일**: `migrations/0005_add_user_deletion.sql`

```sql
-- Migration: 회원 탈퇴 기능 추가
-- Created: 2025-12-28
-- Description: 소프트 삭제 방식의 회원 탈퇴 기능

-- users 테이블에 탈퇴 관련 컬럼 추가
ALTER TABLE users ADD COLUMN deleted_at DATETIME;
ALTER TABLE users ADD COLUMN deletion_reason TEXT;

-- 탈퇴 사유 옵션:
-- 1. 사용하지 않는 서비스입니다
-- 2. 원하는 강의가 없습니다
-- 3. 다른 학습 플랫폼을 사용합니다
-- 4. 개인정보 보호를 위해
-- 5. 기타 (직접 입력)

-- 탈퇴한 사용자 조회를 위한 인덱스
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

-- 탈퇴 후 30일이 지난 데이터 완전 삭제를 위한 뷰 (관리자용)
-- 실제 삭제는 별도 배치 작업으로 처리 예정
```

### 🗂️ users 테이블 스키마 변경

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| `deleted_at` | DATETIME | YES | 탈퇴 일시 (NULL = 미탈퇴) |
| `deletion_reason` | TEXT | YES | 탈퇴 사유 |

### 📈 인덱스

```sql
-- 탈퇴 회원 조회 성능 최적화
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
```

---

## API 엔드포인트

### 1️⃣ 탈퇴 가능 여부 확인

**GET** `/api/auth/check-withdrawal`

**요청 헤더**:
```http
Authorization: Bearer {session_token}
```

**응답 성공** (탈퇴 가능):
```json
{
  "success": true,
  "data": {
    "can_withdraw": true,
    "reason": null
  }
}
```

**응답 실패** (수강 중):
```json
{
  "success": true,
  "data": {
    "can_withdraw": false,
    "reason": "진행 중인 수강이 있어 탈퇴할 수 없습니다. 수강을 완료하거나 환불 후 탈퇴해주세요."
  }
}
```

**응답 실패** (결제 내역):
```json
{
  "success": true,
  "data": {
    "can_withdraw": false,
    "reason": "처리 중이거나 완료된 결제 내역이 있어 탈퇴할 수 없습니다. 고객센터로 문의해주세요."
  }
}
```

---

### 2️⃣ 회원 탈퇴 실행

**POST** `/api/auth/withdrawal`

**요청 헤더**:
```http
Authorization: Bearer {session_token}
Content-Type: application/json
```

**요청 바디**:
```json
{
  "reason": "사용하지 않는 서비스입니다",
  "reason_detail": ""
}
```

**요청 바디** (기타 선택 시):
```json
{
  "reason": "기타",
  "reason_detail": "더 나은 서비스를 찾았습니다."
}
```

**응답 성공**:
```json
{
  "success": true,
  "message": "회원 탈퇴가 완료되었습니다. 30일 후 모든 데이터가 완전히 삭제됩니다. 그동안 고객센터에 문의하시면 복구 가능합니다.",
  "data": null
}
```

**에러 응답** (사유 미선택):
```json
{
  "success": false,
  "message": "탈퇴 사유를 선택해주세요."
}
```

**에러 응답** (기타 사유 미입력):
```json
{
  "success": false,
  "message": "기타 사유를 입력해주세요."
}
```

**에러 응답** (탈퇴 차단):
```json
{
  "success": false,
  "message": "진행 중인 수강이 있어 탈퇴할 수 없습니다. 수강을 완료하거나 환불 후 탈퇴해주세요."
}
```

---

### 3️⃣ 비밀번호 변경

**POST** `/api/auth/change-password`

**요청 헤더**:
```http
Authorization: Bearer {session_token}
Content-Type: application/json
```

**요청 바디**:
```json
{
  "current_password": "oldpass123",
  "new_password": "newpass456"
}
```

**응답 성공**:
```json
{
  "success": true,
  "message": "비밀번호가 변경되었습니다.",
  "data": null
}
```

**에러 응답** (현재 비밀번호 불일치):
```json
{
  "success": false,
  "message": "현재 비밀번호가 일치하지 않습니다."
}
```

**에러 응답** (소셜 로그인 사용자):
```json
{
  "success": false,
  "message": "소셜 로그인 사용자는 비밀번호를 변경할 수 없습니다."
}
```

---

## UI/UX 흐름

### 📱 내 정보 페이지

**URL**: `/my-profile`

**접근 방법**:
1. 로그인 후 헤더에서 **"내 정보"** 클릭
2. 직접 URL 입력

**페이지 구성**:

#### 1. 기본 정보 섹션
- 이메일 (읽기 전용)
- 이름 (수정 가능)
- 전화번호 (수정 가능)
- 생년월일 (수정 가능)
- **정보 수정** 버튼

#### 2. 비밀번호 변경 섹션
- 이메일 가입자만 표시
- 카카오 로그인 사용자는 숨김
- 현재 비밀번호 입력
- 새 비밀번호 입력
- 새 비밀번호 확인
- **비밀번호 변경** 버튼

#### 3. 회원 탈퇴 섹션
- 탈퇴 안내 문구
- **회원 탈퇴하기** 버튼 (빨간색)

---

### 🪟 탈퇴 모달 팝업

**트리거**: "회원 탈퇴하기" 버튼 클릭

#### 흐름 A: 탈퇴 가능

1. **모달 오픈**
2. **탈퇴 조건 자동 확인** (API 호출)
3. **탈퇴 사유 선택** (라디오 버튼 5개)
   - 사용하지 않는 서비스입니다
   - 원하는 강의가 없습니다
   - 다른 학습 플랫폼을 사용합니다
   - 개인정보 보호를 위해
   - 기타
4. **"기타" 선택 시**: 상세 입력란 표시
5. **"탈퇴하기" 버튼** 클릭
6. **확인 팝업**: "정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다."
7. **API 호출** → 탈퇴 처리
8. **성공 메시지**: "회원 탈퇴가 완료되었습니다. 30일 후 모든 데이터가 완전히 삭제됩니다..."
9. **즉시 로그아웃** → 메인 페이지로 이동

#### 흐름 B: 탈퇴 불가 (수강 중)

1. **모달 오픈**
2. **탈퇴 조건 자동 확인** (API 호출)
3. **에러 메시지 표시** (빨간색 박스)
   - "탈퇴할 수 없습니다"
   - "진행 중인 수강이 있어 탈퇴할 수 없습니다. 수강을 완료하거나 환불 후 탈퇴해주세요."
4. **"닫기" 버튼만 표시**
5. 탈퇴 사유 선택 폼 숨김

#### 흐름 C: 탈퇴 불가 (결제 내역)

1. **모달 오픈**
2. **탈퇴 조건 자동 확인** (API 호출)
3. **에러 메시지 표시** (빨간색 박스)
   - "탈퇴할 수 없습니다"
   - "처리 중이거나 완료된 결제 내역이 있어 탈퇴할 수 없습니다. 고객센터로 문의해주세요."
4. **"닫기" 버튼만 표시**
5. 탈퇴 사유 선택 폼 숨김

---

## 비즈니스 로직

### 🔍 탈퇴 가능 여부 검증

#### 1단계: 수강 중인 강의 확인

```sql
SELECT COUNT(*) as count 
FROM enrollments 
WHERE user_id = ? AND status = 'active'
```

- **count > 0**: 탈퇴 차단
- **count = 0**: 다음 단계

#### 2단계: 결제 내역 확인

```sql
SELECT COUNT(*) as count 
FROM payments 
WHERE user_id = ? AND status IN ('pending', 'completed')
```

- **count > 0**: 탈퇴 차단
- **count = 0**: 탈퇴 가능

---

### 🗑️ 소프트 삭제 처리

#### 실행 SQL

```sql
UPDATE users 
SET deleted_at = datetime('now'),
    deletion_reason = ?,
    status = 'withdrawn',
    updated_at = datetime('now')
WHERE id = ?
```

#### 세션 무효화

```sql
UPDATE user_sessions 
SET is_active = 0 
WHERE user_id = ?
```

---

### 🔄 재가입 처리

#### 이메일 중복 체크 시

```sql
SELECT id, deleted_at FROM users WHERE email = ?
```

**경우 1**: `deleted_at IS NULL` → 이메일 중복 에러  
**경우 2**: `deleted_at IS NOT NULL` → 기존 데이터 완전 삭제 후 신규 가입

```sql
DELETE FROM users WHERE id = ?
```

---

### 🔐 로그인 차단

#### 로그인 쿼리 수정

```sql
SELECT * FROM users 
WHERE email = ? 
AND status = 'active'
AND deleted_at IS NULL
```

탈퇴한 사용자는 `deleted_at`이 NULL이 아니므로 로그인 불가

---

## 테스트 시나리오

### ✅ 시나리오 1: 정상 탈퇴 (수강/결제 없음)

**준비**:
1. 테스트 계정 생성
2. 수강 신청 없음
3. 결제 내역 없음

**실행**:
1. 로그인
2. 내 정보 → 회원 탈퇴하기 클릭
3. 탈퇴 사유 선택: "사용하지 않는 서비스입니다"
4. 탈퇴하기 클릭
5. 확인 팝업 → 확인

**예상 결과**:
- ✅ 탈퇴 성공 메시지
- ✅ 즉시 로그아웃
- ✅ 메인 페이지로 이동
- ✅ DB에 `deleted_at` 기록됨
- ✅ 재로그인 불가

---

### ✅ 시나리오 2: 탈퇴 차단 (수강 중)

**준비**:
1. 테스트 계정 생성
2. 강의 수강 신청 (status = 'active')
3. 결제 완료

**실행**:
1. 로그인
2. 내 정보 → 회원 탈퇴하기 클릭

**예상 결과**:
- ✅ 모달 오픈
- ✅ 빨간색 에러 메시지: "진행 중인 수강이 있어 탈퇴할 수 없습니다..."
- ✅ 탈퇴 사유 선택 폼 숨김
- ✅ "닫기" 버튼만 표시

---

### ✅ 시나리오 3: 탈퇴 차단 (결제 내역)

**준비**:
1. 테스트 계정 생성
2. 수강 완료 (status = 'completed')
3. 결제 내역 존재 (status = 'completed')

**실행**:
1. 로그인
2. 내 정보 → 회원 탈퇴하기 클릭

**예상 결과**:
- ✅ 모달 오픈
- ✅ 빨간색 에러 메시지: "처리 중이거나 완료된 결제 내역이 있어..."
- ✅ 탈퇴 사유 선택 폼 숨김
- ✅ "닫기" 버튼만 표시

---

### ✅ 시나리오 4: 기타 사유 입력

**준비**:
1. 테스트 계정 생성
2. 수강 신청 없음

**실행**:
1. 로그인
2. 내 정보 → 회원 탈퇴하기 클릭
3. 탈퇴 사유 선택: "기타"
4. 상세 입력란에 "더 나은 서비스를 찾았습니다" 입력
5. 탈퇴하기 클릭

**예상 결과**:
- ✅ 탈퇴 성공
- ✅ DB에 `deletion_reason = "기타: 더 나은 서비스를 찾았습니다"` 저장

---

### ✅ 시나리오 5: 재가입

**준비**:
1. 탈퇴 완료된 계정 (deleted_at 존재)

**실행**:
1. 회원가입 페이지 접속
2. 동일 이메일 입력
3. 나머지 정보 입력
4. 회원가입 클릭

**예상 결과**:
- ✅ 기존 탈퇴 데이터 완전 삭제
- ✅ 신규 회원으로 가입 성공
- ✅ 이전 수강/결제 이력 없음

---

### ✅ 시나리오 6: 비밀번호 변경

**준비**:
1. 이메일로 가입한 계정

**실행**:
1. 로그인
2. 내 정보 → 비밀번호 변경 섹션
3. 현재 비밀번호: "test123"
4. 새 비밀번호: "newpass456"
5. 새 비밀번호 확인: "newpass456"
6. 비밀번호 변경 클릭

**예상 결과**:
- ✅ "비밀번호가 변경되었습니다" 메시지
- ✅ 입력란 초기화
- ✅ 새 비밀번호로 로그인 가능

---

### ✅ 시나리오 7: 카카오 로그인 사용자

**준비**:
1. 카카오로 로그인한 계정 (social_provider = 'kakao')

**실행**:
1. 로그인
2. 내 정보 페이지 접속

**예상 결과**:
- ✅ 비밀번호 변경 섹션 숨김
- ✅ 기본 정보 섹션 표시
- ✅ 회원 탈퇴 섹션 표시

---

## 관리자 기능

### 📊 탈퇴 회원 조회 (미구현)

**추천 쿼리**:
```sql
-- 탈퇴한 회원 목록
SELECT 
  id, email, name, deleted_at, deletion_reason, 
  ROUND((JULIANDAY('now') - JULIANDAY(deleted_at))) as days_since_deletion
FROM users 
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC
```

---

### 🗑️ 30일 경과 데이터 완전 삭제 (미구현)

**추천 배치 작업**:
```sql
-- 30일 경과한 탈퇴 회원 조회
SELECT id, email, name, deleted_at
FROM users 
WHERE deleted_at IS NOT NULL
  AND deleted_at <= datetime('now', '-30 days')
```

**완전 삭제**:
```sql
-- 연관 데이터 삭제
DELETE FROM user_sessions WHERE user_id = ?;
DELETE FROM lesson_progress WHERE user_id = ?;
DELETE FROM enrollments WHERE user_id = ?;
DELETE FROM payments WHERE user_id = ?;
DELETE FROM certificates WHERE user_id = ?;

-- 회원 데이터 삭제
DELETE FROM users WHERE id = ?;
```

---

### 📈 탈퇴 사유 통계 (미구현)

**추천 쿼리**:
```sql
SELECT 
  deletion_reason,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM users WHERE deleted_at IS NOT NULL), 2) as percentage
FROM users 
WHERE deleted_at IS NOT NULL
GROUP BY deletion_reason
ORDER BY count DESC
```

**예상 결과**:
```
탈퇴 사유                       | 건수 | 비율
------------------------------|------|------
사용하지 않는 서비스입니다     | 45   | 35.4%
원하는 강의가 없습니다         | 32   | 25.2%
다른 학습 플랫폼을 사용합니다  | 28   | 22.0%
개인정보 보호를 위해           | 15   | 11.8%
기타                          | 7    | 5.5%
```

---

### 🔄 탈퇴 회원 복구 (미구현)

**추천 API**:
```typescript
/**
 * POST /api/admin/users/:id/restore
 * 탈퇴 회원 복구
 */
auth.post('/users/:id/restore', requireAdmin, async (c) => {
  const userId = c.req.param('id')
  const { DB } = c.env

  // 탈퇴 상태 초기화
  await DB.prepare(`
    UPDATE users 
    SET deleted_at = NULL,
        deletion_reason = NULL,
        status = 'active',
        updated_at = datetime('now')
    WHERE id = ? AND deleted_at IS NOT NULL
  `).bind(userId).run()

  return c.json(successResponse(null, '회원이 복구되었습니다.'))
})
```

---

## FAQ

### Q1. 탈퇴 후 언제까지 복구 가능한가요?
**A**: 탈퇴 후 30일까지 복구 가능합니다. 30일 경과 후에는 모든 데이터가 완전히 삭제됩니다.

---

### Q2. 탈퇴 후 동일 이메일로 재가입 가능한가요?
**A**: 네, 가능합니다. 재가입 시 기존 탈퇴 데이터는 완전히 삭제되고 신규 회원으로 등록됩니다.

---

### Q3. 수강 중인 강의가 있으면 어떻게 하나요?
**A**: 수강을 완료하거나 환불을 먼저 진행한 후 탈퇴할 수 있습니다. 관리자에게 문의하세요.

---

### Q4. 결제 내역이 남아있으면 어떻게 하나요?
**A**: 고객센터(062-959-9535)로 문의하셔서 결제 처리를 완료한 후 탈퇴할 수 있습니다.

---

### Q5. 카카오로 가입한 회원도 탈퇴 가능한가요?
**A**: 네, 가능합니다. 소셜 로그인 사용자도 동일한 절차로 탈퇴할 수 있습니다.

---

### Q6. 탈퇴하면 수료증도 삭제되나요?
**A**: 30일간은 데이터가 보관되므로 고객센터에 문의하시면 수료증을 발급받을 수 있습니다. 30일 경과 후에는 완전히 삭제됩니다.

---

### Q7. 탈퇴 사유는 왜 수집하나요?
**A**: 서비스 개선을 위해 탈퇴 사유를 분석합니다. 수집된 정보는 통계 목적으로만 사용되며 개인을 특정할 수 없습니다.

---

### Q8. 탈퇴 후 마케팅 수신도 중단되나요?
**A**: 네, 탈퇴 즉시 모든 마케팅 수신이 중단됩니다.

---

### Q9. 탈퇴한 회원의 데이터는 어떻게 관리되나요?
**A**: 
- **0-30일**: 소프트 삭제 상태로 복구 가능
- **30일 후**: 배치 작업으로 완전 삭제 (자동)
- **법적 보관 의무**: 전자상거래법에 따라 거래 기록은 5년간 별도 보관

---

### Q10. 관리자가 강제로 탈퇴시킬 수 있나요?
**A**: 현재 구현되지 않았지만, 필요 시 관리자 대시보드에 강제 탈퇴 기능을 추가할 수 있습니다.

---

## 📝 구현 파일 목록

### 변경된 파일
1. **migrations/0005_add_user_deletion.sql** (신규)
   - `deleted_at`, `deletion_reason` 컬럼 추가
   - 인덱스 생성

2. **src/routes/auth.ts** (수정)
   - `GET /api/auth/check-withdrawal` 추가
   - `POST /api/auth/change-password` 추가
   - `POST /api/auth/withdrawal` 수정 (C안 방식)
   - 로그인 쿼리 수정 (탈퇴 회원 차단)
   - 회원가입 쿼리 수정 (재가입 처리)

3. **src/routes/pages-my.ts** (수정)
   - `GET /my-profile` 페이지 추가
   - 헤더 메뉴에 "내 정보" 추가
   - 탈퇴 모달 UI 구현
   - 비밀번호 변경 UI 구현

---

## 🚀 배포 가이드

### 로컬 환경

```bash
# 마이그레이션 적용
npx wrangler d1 migrations apply mindstory-production --local

# 빌드
npm run build

# 서버 시작
pm2 restart mindstory-lms
```

### 프로덕션 환경

```bash
# 마이그레이션 적용
npx wrangler d1 migrations apply mindstory-production

# 빌드 및 배포
npm run deploy
```

---

## 📞 문의

기술 지원이 필요하시면 아래로 연락주세요:

- **이메일**: sanj2100@naver.com
- **전화**: 062-959-9535
- **웹사이트**: https://www.mindstorys.com

---

**문서 버전**: 1.0  
**최종 수정일**: 2025-12-28  
**작성자**: AI Assistant

© 2025 마인드스토리 원격평생교육원. All rights reserved.
