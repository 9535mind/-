# 📅 2025-12-29 개발 내역 - Ver.2.4.0

## 🎯 주요 업데이트

### ✨ 관리자 모드/수강생 모드 전환 기능

**관리자가 클릭 한 번으로 관리자 화면과 수강생 화면을 자유롭게 전환할 수 있습니다!**

#### 구현 내용

1. **수강생 화면 (메인 페이지, 과정 안내, 내 강의실)**
   - 헤더에 **'관리자 모드'** 버튼 추가 (관리자만 보임)
   - 클릭 시 → `/admin/dashboard`로 이동
   - 버튼 색상: 파란색 (기본 스타일)

2. **관리자 화면 (`/admin/*`)**
   - 헤더 우측 상단에 **'수강생 모드'** 버튼 추가 (초록색)
   - 클릭 시 → `/` (메인 페이지)로 이동
   - 버튼 색상: 초록색 (`bg-green-500`)

#### UI 예시

**수강생 모드 (메인 페이지)**:
```
┌─────────────────────────────────────────────────────────────────┐
│ 마인드스토리 원격평생교육원                                      │
│                                                                 │
│ 홈 | 과정 안내 | 내 강의실 | [관리자 모드] 박종석 대표님 | 로그아웃 │
└─────────────────────────────────────────────────────────────────┘
```

**관리자 모드 (대시보드)**:
```
┌─────────────────────────────────────────────────────────────────┐
│ 관리자 대시보드                   [수강생 모드] 박종석 대표 [로그아웃] │
└─────────────────────────────────────────────────────────────────┘
```

#### 사용 시나리오

1. **수강생 화면 테스트**
   - 관리자가 실제 수강생이 보는 화면 확인
   - 과정 목록, 상세 페이지, 내 강의실 체험

2. **과정 신청 테스트**
   - 수강 신청부터 학습까지 전체 프로세스 체험
   - 결제 프로세스 확인

3. **문제 발생 시 빠른 전환**
   - 수강생 문제 확인 → 즉시 관리자 모드로 해결
   - 관리자 대시보드에서 데이터 확인

4. **빠른 모드 전환**
   - 클릭 한 번으로 관리/학습 모드 전환
   - 업무 효율 향상

---

### ✨ 로그인 후 역할 기반 리디렉트

**사용자 역할에 따라 자동으로 적절한 페이지로 이동합니다!**

#### 구현 내용

1. **관리자 로그인**
   - `/api/auth/login` 성공 시 → `/admin/dashboard`로 자동 이동
   - 관리자는 대시보드를 기본 시작 페이지로 설정

2. **일반 사용자 로그인**
   - `/api/auth/login` 성공 시 → `/my-courses`로 자동 이동
   - 수강생은 내 강의실을 기본 시작 페이지로 설정

3. **리디렉트 파라미터 우선**
   - URL에 `?redirect=/path` 파라미터가 있으면 해당 경로로 이동
   - 예: `/login?redirect=/courses/1` → 로그인 후 `/courses/1`로 이동

#### 코드 구조

```typescript
// src/routes/pages.ts - 로그인 페이지
if (result.data.success) {
  AuthManager.saveSession(result.data.session_token, result.data.user);
  
  const redirectUrl = new URLSearchParams(window.location.search).get('redirect');
  if (redirectUrl) {
    window.location.href = redirectUrl;
  } else {
    // 역할 기반 리디렉트
    if (result.data.user.role === 'admin') {
      window.location.href = '/admin/dashboard';
    } else {
      window.location.href = '/my-courses';
    }
  }
}
```

---

## 🐛 버그 수정

### 1️⃣ 관리자 헤더 링크 표시 문제 해결 ✅

**문제**: 로그인 후 관리자 링크가 보이지 않음

**원인**:
1. 401 인증 오류 - `/api/enrollments/my` 호출 시 Authorization 헤더 누락
2. `requireAuth()` 함수 참조 오류 - 정의되지 않은 함수 호출
3. `updateHeader()` 중복 호출 - 메인 페이지에서 2번 실행
4. 브라우저 캐시 문제 - 이전 버전 JS 파일 사용

**해결**:
1. ✅ **Authorization 헤더 추가** (`src/routes/pages-my.ts`)
   ```javascript
   const token = AuthManager.getSessionToken();
   const response = await axios.get('/api/enrollments/my?status=' + status, {
     headers: {
       'Authorization': `Bearer ${token}`
     }
   });
   ```

2. ✅ **requireAuth() 오류 수정** (`src/routes/pages-my.ts`)
   ```javascript
   // 이전: if (!requireAuth()) { ... }
   // 수정: if (!AuthManager.isLoggedIn()) { ... }
   ```

3. ✅ **updateHeader() 중복 제거** (`src/routes/pages.ts`)
   - `getCommonFoot()`에서 중복 호출 제거
   - 메인 페이지에서 1번만 호출

4. ✅ **캐시 무효화** (타임스탬프 버전 쿼리)
   ```html
   <script src="/static/js/auth.js?v=2025122913"></script>
   ```

### 2️⃣ /admin 경로 404 오류 해결 ✅

**문제**: `/admin` 접근 시 404 Not Found

**원인**: `/admin` 라우트가 정의되지 않음

**해결**: `/admin/dashboard`로 리디렉트 추가
```typescript
// src/routes/pages-admin.ts
pages.get('/admin', (c) => {
  return c.redirect('/admin/dashboard', 302);
});
```

### 3️⃣ 내 강의실 API 401 오류 해결 ✅

**문제**: `/api/enrollments/my?status=active` 호출 시 401 Unauthorized

**원인**: Authorization 헤더 누락

**해결**: 모든 API 호출에 Authorization 헤더 추가
```javascript
const token = AuthManager.getSessionToken();
axios.get(url, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

## 📝 Git 커밋 이력 (오늘)

```
6cdbef0 docs: README 업데이트 - Ver.2.4.0 관리자 모드/수강생 모드 전환 기능 추가
cb8d8ca feat: 관리자 모드/수강생 모드 전환 기능 추가 - 헤더에 전환 버튼 추가
14af1b6 feat: 로그인 후 사용자 역할에 따른 리디렉트 - 관리자는 대시보드, 일반 사용자는 내 강의실
a8e7f95 fix: /admin 경로 404 오류 해결 - /admin/dashboard로 리디렉트 추가
a48681d fix: 내 강의실 API 호출 시 Authorization 헤더 추가 - 401 오류 해결
420769a fix: 디버그 로그 제거 및 캐시 버스팅 버전 업데이트 (v=2025122913)
5334bfa fix: 캐시 버스팅 타임스탬프 업데이트 (v=20251229122947) - 브라우저 캐시 강제 갱신
8f0f622 fix: my-courses 페이지 requireAuth 오류 수정 - AuthManager.isLoggedIn() 사용
e387f2e fix: JS 파일 캐시 무효화를 위한 버전 쿼리 파라미터 추가 (v=20251229)
700de70 debug: 메인 페이지 localStorage 및 updateHeader 디버그 로그 추가
fe39f4d fix: 메인 페이지(/) 헤더에 관리자 링크 추가
3dd292a fix: 관리자 헤더 링크 표시 로직 개선 - updateHeader() 중복 제거
```

**총 12개 커밋 (2025-12-29)**

---

## 🧪 테스트 방법

### 1. 관리자 모드/수강생 모드 전환 테스트

#### Step 1: 관리자 로그인
```
URL: https://3000-ieu1ambselnpjf2cme9se-c81df28e.sandbox.novita.ai/login
이메일: parkjs@mindstory.co.kr
비밀번호: Admin1234!
```

#### Step 2: 자동 리디렉트 확인
- 로그인 후 자동으로 `/admin/dashboard`로 이동
- 관리자 대시보드 표시 확인

#### Step 3: 수강생 모드 전환
1. 헤더 우측 상단의 **[수강생 모드]** 버튼 클릭
2. 메인 페이지(`/`)로 이동 확인
3. 헤더에 **[관리자 모드]** 버튼 표시 확인

#### Step 4: 관리자 모드 복귀
1. 헤더의 **[관리자 모드]** 버튼 클릭
2. 관리자 대시보드(`/admin/dashboard`)로 이동 확인

### 2. 역할 기반 리디렉트 테스트

#### 관리자 계정
```
이메일: parkjs@mindstory.co.kr
비밀번호: Admin1234!
→ 로그인 후 /admin/dashboard로 이동
```

#### 일반 사용자 계정
```
이메일: student1@example.com
비밀번호: test123
→ 로그인 후 /my-courses로 이동
```

### 3. 버그 수정 확인

#### 401 오류 확인
1. 로그인 후 **내 강의실** 클릭
2. F12 → Console 확인
3. **401 오류 없음** 확인 ✅

#### 관리자 링크 표시 확인
1. 관리자 로그인 후 메인 페이지 이동
2. 헤더에 **[관리자 모드]** 버튼 표시 확인 ✅

---

## 📊 현재 시스템 상태

### ✅ 완벽 작동 기능
1. ✅ **로그인/회원가입**: 이메일 + Google OAuth + 카카오 OAuth
2. ✅ **수강신청**: 무료 즉시, 유료 결제 후 가능
3. ✅ **내 강의실**: 수강 목록 조회 (401 오류 해결)
4. ✅ **관리자 대시보드**: 실시간 통계 로딩
5. ✅ **관리자 회원 관리**: 목록/검색/상세
6. ✅ **관리자 결제 관리**: 내역/통계
7. ✅ **관리자 수강 관리**: 진도율 표시
8. ✅ **관리자 강좌 관리**: CRUD API
9. ✅ **관리자 모드/수강생 모드 전환**: 클릭 한 번으로 전환
10. ✅ **역할 기반 리디렉트**: 관리자 → 대시보드, 일반 → 내 강의실

### ⚠️ 주의사항
- Google 로그인 사용자는 이메일/비밀번호 로그인 불가 (의도된 동작)
- Toss Payments 테스트 키 필요 (실제 결제 연동 대기)

---

## 🌐 접속 정보

### 개발 환경
- **Sandbox URL**: https://3000-ieu1ambselnpjf2cme9se-c81df28e.sandbox.novita.ai
- **로컬**: http://localhost:3000

### 테스트 계정
- **관리자**: parkjs@mindstory.co.kr / Admin1234!
- **학생1**: student1@example.com / test123
- **학생2**: student2@example.com / test123

---

## 📞 문의

- **이메일**: sanj2100@naver.com
- **전화**: 062-959-9535
- **웹사이트**: https://www.mindstorys.com

---

© 2025 마인드스토리 원격평생교육원. All rights reserved.
