# 카카오 로그인 설정 가이드

## 목차
1. [카카오 개발자 앱 생성](#1-카카오-개발자-앱-생성)
2. [환경 변수 설정](#2-환경-변수-설정)
3. [로컬 테스트](#3-로컬-테스트)
4. [운영 배포](#4-운영-배포)
5. [문제 해결](#5-문제-해결)

---

## 1. 카카오 개발자 앱 생성

### Step 1: 카카오 개발자 사이트 접속
1. **https://developers.kakao.com** 접속
2. **카카오계정으로 로그인**
3. **내 애플리케이션** 메뉴 클릭

### Step 2: 앱 생성
1. **애플리케이션 추가하기** 버튼 클릭
2. **앱 이름**: `마인드스토리 LMS` (또는 원하는 이름)
3. **회사명**: `(주)마인드스토리`
4. **생성** 버튼 클릭

### Step 3: REST API 키 확인
1. 생성된 앱을 클릭
2. **앱 설정 → 요약 정보** 메뉴
3. **REST API 키** 복사 (예: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)

### Step 4: Redirect URI 설정
1. **제품 설정 → 카카오 로그인** 메뉴
2. **Redirect URI** 섹션에서 **Redirect URI 등록** 클릭
3. 다음 두 개의 URI를 등록:
   ```
   http://localhost:3000/api/auth/kakao/callback
   https://mindstory-lms.pages.dev/api/auth/kakao/callback
   ```
   (운영 도메인이 다르면 해당 도메인으로 변경)

### Step 5: 동의 항목 설정
1. **제품 설정 → 카카오 로그인 → 동의항목** 메뉴
2. 다음 항목을 **필수 동의**로 설정:
   - **닉네임** (profile_nickname) - 필수
   - **카카오계정(이메일)** (account_email) - 필수
3. **저장** 버튼 클릭

### Step 6: 비즈니스 인증 (선택 사항)
- 이메일 수집을 위해서는 **비즈니스 인증**이 필요할 수 있습니다
- 인증 없이도 테스트는 가능하지만, 실제 서비스에서는 인증 필수
- **비즈니스 인증**: 사업자 등록증 업로드 → 약 1-2일 소요

---

## 2. 환경 변수 설정

### 로컬 개발 환경 (.dev.vars)

**Step 1: .dev.vars 파일 생성**
```bash
cd /home/user/webapp
cat > .dev.vars << 'EOF'
# 카카오 로그인 설정
KAKAO_CLIENT_ID=여기에_REST_API_키_입력
KAKAO_REDIRECT_URI=http://localhost:3000/api/auth/kakao/callback

# R2 Storage 설정 (기존)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
EOF
```

**Step 2: .gitignore 확인**
```bash
# .dev.vars가 Git에 커밋되지 않도록 확인
cat .gitignore | grep .dev.vars
```

### 운영 환경 (Cloudflare Pages)

**Step 1: Cloudflare Dashboard 접속**
1. **https://dash.cloudflare.com** 접속
2. **Pages** 메뉴 → `mindstory-lms` 프로젝트 선택
3. **Settings** → **Environment variables** 메뉴

**Step 2: 환경 변수 추가**
1. **Add variable** 버튼 클릭
2. 다음 두 개의 변수를 추가:

| Variable name | Value | Environment |
|--------------|-------|-------------|
| `KAKAO_CLIENT_ID` | `a1b2c3d4...` (REST API 키) | Production & Preview |
| `KAKAO_REDIRECT_URI` | `https://mindstory-lms.pages.dev/api/auth/kakao/callback` | Production & Preview |

3. **Save** 버튼 클릭

---

## 3. 로컬 테스트

### Step 1: 서버 재시작
```bash
cd /home/user/webapp

# 빌드
npm run build

# PM2 재시작
pm2 restart mindstory-lms

# 로그 확인
pm2 logs mindstory-lms --nostream
```

### Step 2: 로그인 페이지 접속
1. **브라우저에서 http://localhost:3000/login 접속**
2. **카카오 로그인** 버튼 확인 (노란색 버튼)

### Step 3: 카카오 로그인 테스트
1. **카카오 로그인** 버튼 클릭
2. 카카오 로그인 페이지로 리다이렉트
3. 카카오 계정으로 로그인
4. 동의 항목 확인 후 **동의하고 계속하기** 클릭
5. 자동으로 회원가입/로그인 완료
6. 메인 페이지로 리다이렉트

### Step 4: 사용자 정보 확인
```bash
# 로컬 DB에서 카카오 로그인 사용자 확인
cd /home/user/webapp
npx wrangler d1 execute mindstory-production --local \
  --command="SELECT id, email, name, social_provider, created_at FROM users WHERE social_provider = 'kakao'"
```

---

## 4. 운영 배포

### Step 1: 배포 전 체크리스트
- [x] 카카오 개발자 앱 생성
- [x] REST API 키 확인
- [x] Redirect URI 등록 (운영 도메인)
- [x] 동의 항목 설정 (닉네임, 이메일)
- [x] Cloudflare Pages 환경 변수 설정
- [ ] 비즈니스 인증 완료 (선택 사항)

### Step 2: 운영 배포
```bash
cd /home/user/webapp

# 빌드
npm run build

# 운영 배포
npm run deploy
```

### Step 3: 운영 환경 테스트
1. **운영 사이트 접속**: `https://mindstory-lms.pages.dev/login`
2. **카카오 로그인** 버튼 클릭
3. 카카오 로그인 페이지로 리다이렉트
4. 로그인 후 메인 페이지로 리다이렉트 확인

### Step 4: 운영 DB 확인
```bash
# 운영 DB에서 카카오 로그인 사용자 확인
npx wrangler d1 execute mindstory-production --remote \
  --command="SELECT COUNT(*) as kakao_users FROM users WHERE social_provider = 'kakao'"
```

---

## 5. 문제 해결

### 문제 1: "카카오 로그인에 실패했습니다" 오류

**원인 1: REST API 키가 잘못됨**
- 해결: 카카오 개발자 사이트에서 REST API 키 재확인
- 환경 변수 `KAKAO_CLIENT_ID` 값이 올바른지 확인

**원인 2: Redirect URI가 등록되지 않음**
- 해결: 카카오 개발자 사이트에서 Redirect URI 등록 확인
- **제품 설정 → 카카오 로그인 → Redirect URI** 메뉴에서 확인

**원인 3: 동의 항목이 설정되지 않음**
- 해결: 닉네임과 이메일을 필수 동의로 설정
- **제품 설정 → 카카오 로그인 → 동의항목** 메뉴에서 확인

### 문제 2: "이메일 정보를 가져올 수 없습니다" 오류

**원인: 비즈니스 인증이 필요함**
- 해결: 카카오 개발자 사이트에서 비즈니스 인증 진행
- **내 애플리케이션 → 비즈니스** 메뉴에서 사업자 등록증 업로드
- 승인까지 1-2일 소요

**임시 해결책**
- 카카오 ID를 이메일로 사용: `kakao_${social_id}@kakao.com`
- 코드는 이미 이 방식으로 구현됨

### 문제 3: 로컬에서는 되는데 운영에서 안 됨

**원인: Cloudflare Pages 환경 변수가 설정되지 않음**
- 해결: Cloudflare Dashboard에서 환경 변수 확인
  1. https://dash.cloudflare.com
  2. Pages → mindstory-lms → Settings → Environment variables
  3. `KAKAO_CLIENT_ID`와 `KAKAO_REDIRECT_URI` 값 확인

**재배포 필요**
```bash
npm run deploy
```

### 문제 4: 중복 계정 문제

**시나리오**: 이미 이메일로 가입한 사용자가 카카오로 로그인
- 현재 동작: 별도 계정 생성
- 향후 개선 예정: 이메일 기반 계정 연동

**임시 해결책**
- 사용자에게 기존 로그인 방법 사용 안내
- 또는 관리자가 DB에서 수동으로 계정 병합

---

## 참고 자료

### 카카오 로그인 공식 문서
- **REST API 가이드**: https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api
- **Redirect URI 설정**: https://developers.kakao.com/docs/latest/ko/kakaologin/prerequisite#redirect-uri
- **동의 항목 설정**: https://developers.kakao.com/docs/latest/ko/kakaologin/prerequisite#consent-item

### 프로젝트 관련 문서
- **회원 인증 API**: `/home/user/webapp/src/routes/auth-kakao.ts`
- **로그인 페이지**: `/home/user/webapp/src/routes/pages.ts` (GET /login)
- **DB 스키마**: `/home/user/webapp/migrations/0004_add_social_login.sql`

### 지원
- **이메일**: contact@mindstory.co.kr
- **운영 시간**: 평일 10:00 - 18:00

---

## 체크리스트 (운영 시작 전)

### 카카오 개발자 설정
- [ ] 카카오 개발자 앱 생성
- [ ] REST API 키 복사
- [ ] Redirect URI 등록 (로컬 + 운영)
- [ ] 동의 항목 설정 (닉네임, 이메일)
- [ ] 비즈니스 인증 (선택 사항, 1-2일 소요)

### 환경 변수 설정
- [ ] .dev.vars 파일 생성 (로컬)
- [ ] Cloudflare Pages 환경 변수 추가 (운영)
- [ ] .gitignore에 .dev.vars 추가 확인

### 테스트
- [ ] 로컬 카카오 로그인 테스트
- [ ] 회원가입 자동 처리 확인
- [ ] 로그인 후 메인 페이지 리다이렉트 확인
- [ ] DB에 사용자 정보 저장 확인

### 운영 배포
- [ ] 운영 환경 배포 (`npm run deploy`)
- [ ] 운영 사이트에서 카카오 로그인 테스트
- [ ] 모바일 브라우저 테스트 (iOS Safari, Android Chrome)
- [ ] 에러 로그 모니터링

---

**🎉 카카오 로그인 설정 완료!**

이제 사용자들은 카카오 계정으로 간편하게 로그인할 수 있습니다.
