# 카카오 로그인 설정 체크리스트

## 🎯 설정 진행 상황

### ✅ Step 1: 카카오 개발자 앱 생성
- [ ] https://developers.kakao.com 접속
- [ ] 카카오 로그인
- [ ] "내 애플리케이션" 메뉴 클릭
- [ ] "애플리케이션 추가하기" 버튼 클릭
- [ ] 앱 이름: `마인드스토리 LMS`
- [ ] 회사명: `(주)마인드스토리`
- [ ] "저장" 버튼 클릭
- [ ] REST API 키 복사: `____________________________________`

---

### ✅ Step 2: Redirect URI 등록
- [ ] 좌측 메뉴 "제품 설정 → 카카오 로그인" 클릭
- [ ] "활성화 설정" ON으로 변경
- [ ] "Redirect URI" 섹션에서 "Redirect URI 등록" 버튼 클릭
- [ ] 다음 두 개의 URI 추가:
  ```
  http://localhost:3000/auth/kakao/callback
  https://ms12.org/auth/kakao/callback
  ```
- [ ] "저장" 버튼 클릭

---

### ✅ Step 3: 동의 항목 설정
- [ ] 좌측 메뉴 "제품 설정 → 카카오 로그인 → 동의항목" 클릭
- [ ] **닉네임** 항목:
  - [ ] "필수 동의"로 변경
  - [ ] "사용 가능" 상태 확인
- [ ] **카카오계정(이메일)** 항목:
  - [ ] "필수 동의"로 변경
  - [ ] "사용 가능" 상태 확인
- [ ] "저장" 버튼 클릭

⚠️ **참고**: 이메일 수집을 위해 비즈니스 인증이 필요할 수 있습니다.
- 인증 없이도 테스트는 가능하지만, 실제 서비스에서는 인증 필수
- 비즈니스 인증: 사업자 등록증 업로드 → 약 1-2일 소요

---

### ✅ Step 4: 로컬 환경 변수 설정
```bash
# .dev.vars 파일 생성
cd /home/user/webapp
cat > .dev.vars << 'EOF'
# 카카오 로그인 설정
KAKAO_CLIENT_ID=여기에_복사한_REST_API_키_입력
KAKAO_REDIRECT_URI=http://localhost:3000/auth/kakao/callback

# R2 Storage 설정 (기존)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
EOF

# 서버 재시작
npm run build
pm2 restart mindstory-lms
```

---

### ✅ Step 5: 로컬 테스트
- [ ] 브라우저에서 http://localhost:3000/login 접속
- [ ] "카카오 로그인" 버튼 확인 (노란색 버튼)
- [ ] "카카오 로그인" 버튼 클릭
- [ ] 카카오 로그인 페이지로 리다이렉트 확인
- [ ] 카카오 계정으로 로그인
- [ ] 동의 항목 확인 후 "동의하고 계속하기" 클릭
- [ ] 메인 페이지로 자동 리다이렉트 확인
- [ ] 우측 상단에 사용자 이름 표시 확인

```bash
# DB에서 카카오 로그인 사용자 확인
npx wrangler d1 execute mindstory-production --local \
  --command="SELECT id, email, name, social_provider, created_at FROM users WHERE social_provider = 'kakao'"
```

---

### ✅ Step 6: Cloudflare Pages 환경 변수 설정
- [ ] https://dash.cloudflare.com 접속
- [ ] "Pages" 메뉴 클릭
- [ ] "mindstory-lms" 프로젝트 선택
- [ ] "Settings" → "Environment variables" 메뉴 클릭
- [ ] "Add variable" 버튼 클릭
- [ ] 다음 두 개의 변수 추가:

| Variable name | Value | Environment |
|--------------|-------|-------------|
| `KAKAO_CLIENT_ID` | `(복사한 REST API 키)` | Production & Preview |
| `KAKAO_REDIRECT_URI` | `https://ms12.org/auth/kakao/callback` | Production & Preview |

- [ ] "Save" 버튼 클릭

---

### ✅ Step 7: 운영 배포 및 최종 테스트
```bash
# 운영 배포
cd /home/user/webapp
npm run build
npm run deploy
```

- [ ] 운영 사이트 접속: https://mindstory-lms.pages.dev/login
- [ ] "카카오 로그인" 버튼 클릭
- [ ] 카카오 로그인 페이지로 리다이렉트 확인
- [ ] 로그인 후 메인 페이지로 리다이렉트 확인
- [ ] 모바일 브라우저에서도 테스트 (iOS Safari, Android Chrome)

```bash
# 운영 DB에서 카카오 로그인 사용자 확인
npx wrangler d1 execute mindstory-production --remote \
  --command="SELECT COUNT(*) as kakao_users FROM users WHERE social_provider = 'kakao'"
```

---

## 📊 현재 진행 상황

### ✅ 완료
- [x] DB 스키마 업데이트 (social_provider, social_id 필드 추가)
- [x] 카카오 로그인 API 구현 (/api/auth/kakao, /api/auth/kakao/callback)
- [x] 로그인 페이지 UI 추가 (카카오 로그인 버튼)
- [x] 자동 회원가입 처리
- [x] 설정 가이드 작성

### 🔄 진행 중
- [ ] 카카오 개발자 앱 생성 ← **현재 단계**
- [ ] REST API 키 발급
- [ ] Redirect URI 등록
- [ ] 동의 항목 설정

### ⏳ 대기 중
- [ ] 로컬 환경 변수 설정
- [ ] 로컬 테스트
- [ ] Cloudflare Pages 환경 변수 설정
- [ ] 운영 배포

---

## 🆘 문제 해결

### 문제: "카카오 로그인에 실패했습니다" 오류
- REST API 키가 잘못됨 → 카카오 개발자 사이트에서 재확인
- Redirect URI가 등록되지 않음 → "제품 설정 → 카카오 로그인 → Redirect URI" 확인
- 동의 항목이 설정되지 않음 → "제품 설정 → 카카오 로그인 → 동의항목" 확인

### 문제: "이메일 정보를 가져올 수 없습니다" 오류
- 비즈니스 인증이 필요함 → 카카오 개발자 사이트에서 사업자 등록증 업로드
- 임시 해결책: 카카오 ID를 이메일로 사용 (`kakao_${social_id}@kakao.com`)

### 문제: 로컬에서는 되는데 운영에서 안 됨
- Cloudflare Pages 환경 변수가 설정되지 않음
- Cloudflare Dashboard에서 환경 변수 확인 필요
- 재배포 필요: `npm run deploy`

---

## 📞 지원
- **이메일**: contact@mindstory.co.kr
- **운영 시간**: 평일 10:00 - 18:00
- **설정 가이드**: `/home/user/webapp/docs/KAKAO_LOGIN_SETUP.md`

---

**🎉 모든 설정이 완료되면 사용자들은 카카오 계정으로 간편하게 로그인할 수 있습니다!**
