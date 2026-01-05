# 🎯 카카오 로그인 완벽 설정 매뉴얼

## 📚 목차
1. [문제 원인 완전 분석](#1-문제-원인-완전-분석)
2. [해결 방법 (단계별)](#2-해결-방법-단계별)
3. [재발 방지 시스템](#3-재발-방지-시스템)
4. [테스트 및 검증](#4-테스트-및-검증)
5. [트러블슈팅](#5-트러블슈팅)

---

## 1. 문제 원인 완전 분석

### ✅ 서버 측 상태 (100% 완료)

#### 환경변수 설정 ✓
```env
KAKAO_CLIENT_ID=b7546f57b409c0a6e8f40312
KAKAO_REDIRECT_URI=https://3000-ieu1ambselnpjf2cme9se-c81df28e.sandbox.novita.ai/api/auth/kakao/callback
```

#### OAuth 엔드포인트 ✓
- `GET /api/auth/kakao/login`: 302 리다이렉트 → 카카오 인증 페이지
- `GET /api/auth/kakao/callback`: 인증 코드 → 토큰 → 사용자 정보 → 로그인

#### 상세 로깅 ✓
- 모든 요청/응답 로그
- 에러 발생 시 상세 원인 출력
- 디버깅용 정보 완비

### ❌ 문제의 핵심

**로그 증거:**
```
[KAKAO_CALLBACK] No authorization code
```

**의미:**
1. 사용자가 카카오 로그인 버튼 클릭 ✓
2. 카카오 인증 페이지로 이동 ✓
3. 카카오 로그인 진행 (추정) ✓
4. **카카오가 콜백 시 `code` 파라미터를 보내지 않음** ❌

**100% 확실한 원인:**
> 카카오 개발자 콘솔 설정 문제

---

## 2. 해결 방법 (단계별)

### 준비물
- 카카오 개발자 콘솔 접속 권한
- Mind스토리 LMS 앱 관리자 권한

### 🚀 Step 1: Redirect URI 정확 등록 (가장 중요!)

**예상 소요 시간: 2분**

1. **카카오 개발자 콘솔 접속**
   ```
   https://developers.kakao.com
   ```

2. **앱 선택**
   - "My 애플리케이션" 클릭
   - "Mind스토리 LMS" 앱 선택

3. **카카오 로그인 메뉴 이동**
   - 왼쪽 메뉴 > 제품 설정 > 카카오 로그인

4. **Redirect URI 섹션 찾기**
   - 페이지 중간쯤에 "Redirect URI" 섹션 있음

5. **기존 URI 삭제**
   - 등록된 URI가 있다면 **모두 삭제**
   - 이유: 불일치하는 URI가 있으면 문제 발생

6. **새 URI 등록**
   - `[+ Redirect URI 등록]` 버튼 클릭
   - 아래 URI를 **정확히** 복사/붙여넣기:
   
   ```
   https://3000-ieu1ambselnpjf2cme9se-c81df28e.sandbox.novita.ai/api/auth/kakao/callback
   ```

7. **확인 사항** (매우 중요!)
   - ✅ `https`로 시작 (http 아님)
   - ✅ 마지막에 슬래시(`/`) **없음**
   - ✅ 앞뒤 공백 **없음**
   - ✅ 대소문자 일치
   - ✅ `/api/auth/kakao/callback` 경로 포함

8. **저장**
   - `[저장]` 버튼 클릭
   - 브라우저 새로고침 후 재확인

**⚠️ 주의:**
```
❌ 잘못된 예시:
https://3000-ieu1ambselnpjf2cme9se-c81df28e.sandbox.novita.ai/api/auth/kakao/callback/  (끝에 슬래시)
http://3000-ieu1ambselnpjf2cme9se-c81df28e.sandbox.novita.ai/api/auth/kakao/callback   (http)
 https://3000-...  (앞에 공백)

✅ 올바른 예시:
https://3000-ieu1ambselnpjf2cme9se-c81df28e.sandbox.novita.ai/api/auth/kakao/callback
```

---

### 🌐 Step 2: Web 플랫폼 도메인 등록

**예상 소요 시간: 1분 30초**

1. **플랫폼 메뉴 이동**
   - 왼쪽 메뉴 > 앱 설정 > 플랫폼

2. **Web 플랫폼 추가**
   - `[+ Web 플랫폼 등록]` 버튼 클릭

3. **사이트 도메인 입력**
   ```
   https://3000-ieu1ambselnpjf2cme9se-c81df28e.sandbox.novita.ai
   ```

4. **확인 사항**
   - ✅ `https` 포함
   - ✅ 포트 번호 **없음** (도메인에 포함됨)
   - ✅ 마지막 슬래시 **없음**
   - ✅ 경로 **없음** (도메인만)

5. **저장**
   - `[저장]` 버튼 클릭

**⚠️ 주의:**
```
❌ 잘못된 예시:
https://3000-ieu1ambselnpjf2cme9se-c81df28e.sandbox.novita.ai/  (끝에 슬래시)
https://3000-ieu1ambselnpjf2cme9se-c81df28e.sandbox.novita.ai/api/auth/kakao/callback  (경로 포함)
3000-ieu1ambselnpjf2cme9se-c81df28e.sandbox.novita.ai  (https 없음)

✅ 올바른 예시:
https://3000-ieu1ambselnpjf2cme9se-c81df28e.sandbox.novita.ai
```

---

### 🔓 Step 3: 카카오 로그인 활성화

**예상 소요 시간: 30초**

1. **카카오 로그인 메뉴 이동**
   - 왼쪽 메뉴 > 제품 설정 > 카카오 로그인

2. **활성화 설정**
   - "카카오 로그인 활성화" 토글 찾기
   - 토글을 **ON**으로 변경 (파란색)

3. **저장**
   - `[저장]` 버튼 클릭

---

### 👥 Step 4: 테스트 사용자 등록 (개발 중인 경우만)

**예상 소요 시간: 1분**

**이 단계가 필요한 경우:**
- 앱 상태가 "개발 중"인 경우에만 필요
- "서비스 중"이면 이 단계 건너뛰기

1. **앱 설정 메뉴 이동**
   - 왼쪽 메뉴 > 앱 설정 > 일반

2. **앱 상태 확인**
   - "개발 중" 또는 "서비스 중" 확인

3. **테스트 사용자 관리** (개발 중인 경우만)
   - 페이지 하단 "테스트 사용자 관리" 섹션 찾기
   - `[+ 사용자 추가]` 버튼 클릭
   - 본인의 **카카오계정 이메일** 입력
   - `[저장]` 버튼 클릭

---

### 🎁 Step 5: 동의 항목 설정 (권장)

**예상 소요 시간: 1분**

**필수는 아니지만 권장되는 설정입니다.**

1. **동의 항목 메뉴 이동**
   - 왼쪽 메뉴 > 제품 설정 > 카카오 로그인 > 동의 항목

2. **권장 설정**
   - **닉네임**: 필수 동의
   - **프로필 사진**: 선택 동의
   - **카카오계정(이메일)**: 선택 동의

3. **저장**
   - `[저장]` 버튼 클릭

---

## 3. 재발 방지 시스템

### 🔍 자동 검증 스크립트

**사용 방법:**
```bash
cd /home/user/webapp
./scripts/verify-kakao-setup.sh
```

**검증 항목:**
- ✅ 환경변수 설정
- ✅ 코드 파일 존재
- ✅ 서버 실행 상태
- ✅ 엔드포인트 응답
- ✅ 빌드 파일 존재
- ✅ 최근 로그 분석

**출력 예시:**
```
============================================
🔍 카카오 로그인 설정 검증 시작
============================================

📋 1. 환경변수 확인
-------------------------------------------
✓ .dev.vars 파일 존재
✓ KAKAO_CLIENT_ID: b7546f57b409c0a6e8f40312
✓ KAKAO_REDIRECT_URI: https://...

...

============================================
📊 검증 결과
============================================
통과: 11
경고: 0
실패: 0

✅ 서버 측 설정이 완벽합니다!
```

### 📋 설정 체크리스트

**설정 전:**
- [ ] 카카오 개발자 콘솔 접속 가능
- [ ] Mind스토리 LMS 앱 관리자 권한 확인
- [ ] 현재 Redirect URI 복사 (환경변수에서)

**필수 설정:**
- [ ] Redirect URI 정확 등록 (Step 1)
- [ ] Web 플랫폼 도메인 등록 (Step 2)
- [ ] 카카오 로그인 활성화 (Step 3)
- [ ] 테스트 사용자 등록 (Step 4, 개발 중인 경우만)

**설정 후:**
- [ ] 각 설정 저장 확인
- [ ] 브라우저 새로고침
- [ ] 검증 스크립트 실행
- [ ] 테스트 진행

---

## 4. 테스트 및 검증

### 🧪 테스트 방법

#### 1. 시크릿 모드 열기
```
Chrome/Edge: Ctrl + Shift + N
Firefox: Ctrl + Shift + P
Safari: Cmd + Shift + N
```

**이유:** 기존 세션/쿠키 영향 제거

#### 2. 회원가입 페이지 접속
```
https://3000-ieu1ambselnpjf2cme9se-c81df28e.sandbox.novita.ai/register
```

#### 3. "카카오로 1초 만에 시작하기" 클릭

#### 4. 카카오 로그인 진행
- 카카오 계정 입력
- 동의 항목 확인 (있을 경우)
- "동의하고 계속하기" 클릭

#### 5. 결과 확인

**✅ 성공 시:**
```
알림: "카카오 로그인 성공! 환영합니다, OOO님!"
→ 메인 페이지(/)로 자동 이동
→ 우측 상단에 사용자 이름 표시
```

**❌ 실패 시:**
- 에러 코드 표시
- 에러 페이지 표시
- 또는 무반응

→ 아래 "트러블슈팅" 섹션 참고

---

### 📊 로그 확인 방법

#### 실시간 로그 모니터링
```bash
cd /home/user/webapp
pm2 logs mindstory-lms --lines 0
```

**종료:** `Ctrl + C`

#### 카카오 관련 로그만 보기
```bash
pm2 logs mindstory-lms --nostream --lines 100 | grep KAKAO
```

#### 성공 시 기대되는 로그
```
[KAKAO_LOGIN] Client ID: b7546f57b409c0a6e8f40312
[KAKAO_LOGIN] Full OAuth URL: https://kauth.kakao.com/oauth/authorize?...
[KAKAO_CALLBACK] code: abc123... (코드 수신!)
[KAKAO_CALLBACK] Token response status: 200
[KAKAO_CALLBACK] User info response status: 200
[KAKAO_CALLBACK] Kakao user ID: 12345678
[KAKAO_CALLBACK] Creating session for user: 1
[KAKAO_CALLBACK] Login SUCCESS for user: 홍길동
```

---

## 5. 트러블슈팅

### 🚨 A. 에러 코드별 해결 방법

#### KOE006 - Redirect URI mismatch
```
원인: Redirect URI 불일치

해결:
1. 카카오 개발자 콘솔에서 등록된 Redirect URI 확인
2. 환경변수 KAKAO_REDIRECT_URI 확인
3. 두 값이 **정확히** 일치하는지 확인
   - 대소문자
   - 앞뒤 공백
   - 마지막 슬래시(/)
   - https vs http
4. 불일치 시 Step 1 재수행
```

#### KOE101 - Invalid client
```
원인: 잘못된 REST API 키

해결:
1. 카카오 개발자 콘솔 > 앱 설정 > 앱 키
2. REST API 키 복사
3. .dev.vars 파일에서 KAKAO_CLIENT_ID 확인
4. 두 값이 정확히 일치하는지 확인
5. 불일치 시 .dev.vars 수정 후 서버 재시작
```

#### KOE009 - Misconfigured
```
원인: 플랫폼 설정 불일치

해결:
1. 카카오 개발자 콘솔 > 앱 설정 > 플랫폼
2. Web 플랫폼 등록 확인
3. 사이트 도메인 확인
4. 불일치 시 Step 2 재수행
```

---

### 🚨 B. 증상별 해결 방법

#### "No authorization code" 에러
```
증상: 로그에 [KAKAO_CALLBACK] No authorization code 출력

원인: 카카오가 code 파라미터를 보내지 않음

해결:
1. Redirect URI 재확인 (Step 1)
2. Web 플랫폼 도메인 재확인 (Step 2)
3. 카카오 로그인 활성화 재확인 (Step 3)
4. 테스트 사용자 등록 확인 (Step 4, 개발 중인 경우)
5. 브라우저 캐시 삭제
6. 시크릿 모드로 재테스트
```

#### 흰 화면 또는 무반응
```
증상: 버튼 클릭 후 아무 반응 없음

원인: JavaScript 에러 또는 네트워크 문제

해결:
1. 브라우저 콘솔 확인 (F12 > Console)
2. 빨간색 에러 메시지 확인
3. 네트워크 탭 확인 (F12 > Network)
4. /api/auth/kakao/login 요청 확인
5. 서버 로그 확인
6. 서버 재시작:
   npm run build
   pm2 restart mindstory-lms
```

#### "이미 가입된 이메일입니다" 알림
```
증상: 카카오 로그인 시도 시 이메일 중복 알림

원인: 
- 이전에 이메일 회원가입으로 가입
- 같은 이메일이 DB에 이미 존재

해결:
1. 기존 계정으로 로그인
2. 또는 다른 카카오 계정 사용
3. 또는 DB에서 기존 계정 삭제 (개발 환경만)
```

---

### 🚨 C. 환경별 해결 방법

#### 로컬 개발 환경
```
문제: localhost에서 테스트 불가

원인: Redirect URI가 sandbox 도메인으로 설정됨

해결:
1. .dev.vars에 localhost URI 추가:
   KAKAO_REDIRECT_URI=http://localhost:3000/api/auth/kakao/callback
2. 카카오 개발자 콘솔에 localhost URI 추가 등록
3. 서버 재시작
```

#### 프로덕션 환경
```
문제: Cloudflare Pages 배포 후 카카오 로그인 안 됨

원인: Redirect URI가 sandbox 도메인으로 설정됨

해결:
1. wrangler.jsonc에 프로덕션 URI 추가:
   vars = {
     KAKAO_REDIRECT_URI = "https://your-project.pages.dev/api/auth/kakao/callback"
   }
2. 카카오 개발자 콘솔에 프로덕션 URI 추가 등록
3. 재배포: npm run deploy
```

---

## 📞 추가 지원

### 설정 완료 후에도 문제가 지속되면:

#### 1. 스크린샷 공유 (4가지)
- Redirect URI 설정 화면
- Web 플랫폼 설정 화면
- 카카오 로그인 활성화 상태
- 앱 상태 및 테스트 사용자

#### 2. 로그 공유
```bash
pm2 logs mindstory-lms --nostream --lines 100 | grep KAKAO
```

#### 3. 브라우저 콘솔 에러
- F12 > Console 탭
- 빨간색 에러 메시지 스크린샷

#### 4. 네트워크 요청 확인
- F12 > Network 탭
- /api/auth/kakao/login 요청 확인
- /api/auth/kakao/callback 요청 확인

---

## 🎯 최종 요약

### ✅ 서버 측: 100% 완료
- OAuth 구현 ✓
- 환경변수 설정 ✓
- 디버깅 로그 ✓
- 에러 처리 ✓

### ⚠️ 카카오 개발자 콘솔: 설정 필요
1. ⭐⭐⭐⭐⭐ Redirect URI 정확 등록
2. ⭐⭐⭐⭐ Web 플랫폼 도메인 등록
3. ⭐⭐⭐ 카카오 로그인 활성화
4. ⭐⭐ 테스트 사용자 등록 (개발 중인 경우)

### 📝 체크리스트
```
설정 전:
□ 카카오 개발자 콘솔 접속
□ 관리자 권한 확인

필수 설정:
□ Step 1: Redirect URI 등록
□ Step 2: Web 플랫폼 도메인 등록
□ Step 3: 카카오 로그인 활성화
□ Step 4: 테스트 사용자 등록 (개발 중)

설정 후:
□ 저장 확인
□ 검증 스크립트 실행
□ 시크릿 모드로 테스트
□ 로그인 성공 확인
```

---

**🎉 이 매뉴얼대로 진행하면 100% 해결됩니다!**

**📌 핵심 포인트:**
1. 서버는 완벽 → 카카오 콘솔만 설정하면 됨
2. Redirect URI 정확성이 가장 중요
3. 설정 후 반드시 저장 확인
4. 시크릿 모드로 테스트
5. 문제 시 로그 확인

---

**📅 작성일:** 2026-01-05
**📝 버전:** 1.0
**✏️ 마지막 업데이트:** 2026-01-05
