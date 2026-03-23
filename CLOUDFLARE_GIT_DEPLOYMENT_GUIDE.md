# 🔒 Cloudflare Pages Git 연동 배포 가이드

**제미나이의 보안 권고에 따른 안전한 배포 방식**

---

## 📌 **왜 Git 연동 방식으로 전환해야 하나요?**

### **현재 문제점 (Direct Upload)**
- ❌ 환경 변수가 코드에 하드코딩되어 보안 위험
- ❌ `_worker.js` 번들에 Secret이 평문으로 노출
- ❌ Private 저장소라도 팀원/협업자에게 Secret 공유
- ❌ GitHub 보안 스캔이 Secret 감지하여 경고
- ❌ 실수로 Public 전환 시 모든 키 폐기 필요

### **Git 연동의 장점**
- ✅ 환경 변수를 Dashboard에서 안전하게 관리
- ✅ Cloudflare가 런타임에 `c.env`로 안전하게 주입
- ✅ Secret이 코드에 절대 포함되지 않음
- ✅ `git push`만으로 자동 빌드 및 배포
- ✅ 팀 협업 시 Secret 공유 불필요

---

## 🚀 **Git 연동 배포 설정 방법**

### **Step 1: 기존 Direct Upload 프로젝트 삭제 (선택)**

**중요**: Git 연동을 위해 기존 프로젝트를 삭제하거나 새 프로젝트를 만드는 것이 권장됩니다.

```bash
# 옵션 A: 기존 프로젝트 유지하고 새 프로젝트 생성
# Cloudflare Dashboard에서 새 프로젝트 이름 사용 (예: mindstory-lms-v2)

# 옵션 B: 기존 프로젝트 삭제 후 재생성 (권장)
# Dashboard -> Workers & Pages -> mindstory-lms -> Settings -> Delete project
```

---

### **Step 2: Cloudflare Dashboard에서 Git 연동**

#### **2-1. Cloudflare Dashboard 접속**
```
🌐 URL: https://dash.cloudflare.com
📧 계정: 9535mind@gmail.com
```

#### **2-2. GitHub 연동 프로젝트 생성**
1. **Workers & Pages** 메뉴 클릭
2. **Create application** 버튼 클릭
3. **Pages** 탭 선택
4. **Connect to Git** 클릭
5. **GitHub** 선택 및 권한 승인
6. **Repository** 선택: `9535mind/-`
7. **Production branch** 설정: `main`

#### **2-3. 빌드 설정**
```
Framework preset:   None (manual configuration)
Build command:      npm run build
Build output dir:   dist
Root directory:     / (default)
```

#### **2-4. Environment Variables 설정**

**중요**: Production과 Preview 모두에 다음 8개 변수를 추가하세요.

**Production Variables** (반드시 설정):
| Variable Name | Value | Type |
|---------------|-------|------|
| `GOOGLE_CLIENT_ID` | `YOUR_GOOGLE_CLIENT_ID` | Plain text |
| `GOOGLE_CLIENT_SECRET` | `YOUR_GOOGLE_CLIENT_SECRET` | **Encrypted** |
| `GOOGLE_REDIRECT_URI` | `https://mindstory-lms.pages.dev/api/auth/google/callback` | Plain text |
| `KAKAO_CLIENT_ID` | `YOUR_KAKAO_CLIENT_ID` | Plain text |
| `KAKAO_CLIENT_SECRET` | `YOUR_KAKAO_CLIENT_SECRET` | **Encrypted** |
| `KAKAO_REDIRECT_URI` | `https://mindstory-lms.pages.dev/api/auth/kakao/callback` | Plain text |
| `GEMINI_API_KEY` | `YOUR_GEMINI_API_KEY` | **Encrypted** |
| `JWT_SECRET` | `YOUR_JWT_SECRET_KEY` | **Encrypted** |

**⚠️ 주의**: 위 표의 `YOUR_*` 값들을 실제 OAuth 콘솔에서 발급받은 값으로 교체하세요.

**환경 변수 추가 방법**:
1. **Settings** → **Environment variables** 클릭
2. **Add variables** 클릭
3. **Production** 탭에서 변수 입력
4. Secret 값은 **Encrypt** 버튼 클릭
5. 모두 추가 후 **Save** 클릭

**Preview Variables** (선택, 동일하게 설정 권장):
- Preview 배포에서도 OAuth가 작동하도록 동일한 변수 설정

---

### **Step 3: 첫 배포 트리거**

#### **3-1. Save and Deploy**
Dashboard에서 모든 설정 완료 후:
```
1. "Save and Deploy" 버튼 클릭
2. Cloudflare가 자동으로:
   - GitHub에서 코드 가져오기
   - npm install 실행
   - npm run build 실행
   - 환경 변수 주입
   - 배포 완료
```

#### **3-2. 배포 URL 확인**
```
🌐 Production URL: https://mindstory-lms.pages.dev
🌐 Branch URL: https://main.mindstory-lms.pages.dev
```

---

### **Step 4: 이후 배포 (자동화)**

Git 연동 후에는 매우 간단합니다:

```bash
# 로컬에서 코드 수정
cd /home/user/webapp
# ... 코드 수정 ...

# Git에 커밋 및 푸시
git add .
git commit -m "feat: 새 기능 추가"
git push origin main

# Cloudflare가 자동으로:
# 1. Push 이벤트 감지
# 2. 자동 빌드
# 3. 환경 변수 주입
# 4. 자동 배포
# 5. 5-10분 후 배포 완료!
```

**Dashboard에서 배포 확인**:
- Workers & Pages → mindstory-lms → Deployments
- 실시간 빌드 로그 확인 가능

---

## 🧪 **배포 후 테스트**

### **Google 로그인 테스트**
```bash
# 1. Google 로그인 API 확인
curl -I https://mindstory-lms.pages.dev/api/auth/google/login
# Expected: HTTP/2 302 (Google OAuth로 리다이렉트)

# 2. 브라우저에서 테스트
https://mindstory-lms.pages.dev/login
# Google 로그인 버튼 클릭 → Google 계정 선택 → 대시보드 이동
```

### **Kakao 로그인 테스트**
```bash
# 1. Kakao 로그인 API 확인
curl -I https://mindstory-lms.pages.dev/api/auth/kakao/login
# Expected: HTTP/2 302 (Kakao OAuth로 리다이렉트)

# 2. 브라우저에서 테스트
https://mindstory-lms.pages.dev/login
# Kakao 로그인 버튼 클릭 → Kakao 계정 선택 → 대시보드 이동
```

---

## 🔧 **환경 변수 업데이트 방법**

### **Dashboard에서 변경**
```
1. Workers & Pages → mindstory-lms → Settings → Environment variables
2. 변경할 변수의 "Edit" 클릭
3. 새 값 입력 후 "Save"
4. 자동으로 다음 배포부터 적용
```

### **Wrangler CLI로 변경** (고급)
```bash
# Secret 추가/변경
npx wrangler pages secret put GOOGLE_CLIENT_SECRET --project-name mindstory-lms
# 프롬프트에 Secret 값 입력

# Secret 목록 확인
npx wrangler pages secret list --project-name mindstory-lms

# Secret 삭제
npx wrangler pages secret delete GOOGLE_CLIENT_SECRET --project-name mindstory-lms
```

---

## 📊 **Git 연동 vs Direct Upload 비교**

| 항목 | Git 연동 (권장) | Direct Upload (현재) |
|------|-----------------|----------------------|
| **보안** | ✅ Secret이 코드에 없음 | ❌ 코드에 하드코딩 |
| **환경 변수** | ✅ Dashboard에서 관리 | ❌ 빌드 타임에 번들링 |
| **배포 방법** | ✅ `git push`만 하면 됨 | ❌ `npm run build` + `wrangler deploy` |
| **자동화** | ✅ GitHub Actions 가능 | ❌ 수동 배포 필요 |
| **팀 협업** | ✅ Secret 공유 불필요 | ❌ 모든 팀원에게 Secret 공유 |
| **변경 관리** | ✅ Dashboard에서 즉시 변경 | ❌ 코드 수정 후 재배포 |

---

## 🚨 **트러블슈팅**

### **문제 1: "Git에 연결" 버튼이 보이지 않음**
**원인**: 기존에 Direct Upload로 프로젝트를 생성했기 때문  
**해결**: 
1. 기존 프로젝트 삭제
2. Dashboard에서 "Connect to Git"으로 새 프로젝트 생성

### **문제 2: 환경 변수가 적용되지 않음**
**원인**: Preview 환경에는 Preview 변수가 필요  
**해결**: 
1. Settings → Environment variables
2. **Preview** 탭에도 동일한 변수 추가

### **문제 3: Google OAuth 리다이렉트 URI 불일치**
**원인**: `GOOGLE_REDIRECT_URI`가 실제 도메인과 다름  
**해결**:
```bash
# Production URL 확인
https://mindstory-lms.pages.dev

# Dashboard에서 변수 수정
GOOGLE_REDIRECT_URI = https://mindstory-lms.pages.dev/api/auth/google/callback
```

### **문제 4: 빌드 실패**
**원인**: `package.json` 또는 빌드 명령어 오류  
**해결**:
1. Dashboard → Deployments → 실패한 배포 클릭
2. 빌드 로그 확인
3. 로컬에서 `npm run build` 테스트

---

## 📚 **참고 문서**

- [Cloudflare Pages 공식 문서](https://developers.cloudflare.com/pages/)
- [환경 변수 설정 가이드](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Git 통합 가이드](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [Wrangler CLI 문서](https://developers.cloudflare.com/workers/wrangler/)

---

## ✅ **체크리스트**

Git 연동 배포를 완료했다면 다음을 확인하세요:

- [ ] Cloudflare Dashboard에서 Git 연동 완료
- [ ] Production 환경 변수 8개 모두 설정
- [ ] Preview 환경 변수 설정 (선택)
- [ ] 첫 배포 성공 확인
- [ ] Google 로그인 테스트 통과
- [ ] Kakao 로그인 테스트 통과
- [ ] `git push`로 자동 배포 확인
- [ ] 코드에서 `src/config/env.ts` 삭제됨
- [ ] `wrangler.jsonc`에 `vars` 섹션 없음
- [ ] `.gitignore`에 `.env` 파일 포함

---

## 🎉 **완료!**

이제 안전하고 자동화된 배포 환경이 구축되었습니다!

**핵심 이점**:
- ✅ Secret이 코드에 노출되지 않음
- ✅ `git push` 한 번으로 자동 배포
- ✅ Dashboard에서 환경 변수 즉시 변경
- ✅ 팀 협업 시 보안 유지

**다음 단계**:
1. 로컬에서 새 기능 개발
2. `git push origin main`
3. 5-10분 후 자동 배포 완료!

---

**작성일**: 2026.03.22  
**작성자**: AI Assistant (제미나이 권고 반영)  
**버전**: 1.0
