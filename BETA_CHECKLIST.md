# 🚀 베타 서비스 시작 체크리스트

## ✅ 완료된 항목

### 1. 보안 강화
- [x] **환경 변수 분리**: API 키는 Git에 포함되지 않음 (`.dev.vars` 사용)
- [x] **Rate Limiting**: IP 기반 요청 제한 완전 구현
  - 로그인/회원가입: 1분에 10회
  - 일반 API: 1분에 100회
  - 읽기 API: 1분에 200회
- [x] **세션 보안**: HttpOnly + Secure + SameSite 쿠키 적용
- [x] **CORS 설정**: 개발 환경 구성 완료

### 2. 핵심 기능
- [x] 회원가입/로그인 (이메일 + 카카오 + 구글)
- [x] 강좌 목록/상세 조회
- [x] 무료 강좌 수강신청
- [x] 학습 페이지 (YouTube 플레이어)
- [x] 관리자 대시보드

### 3. 데이터베이스
- [x] Cloudflare D1 SQLite 구성
- [x] 마이그레이션 스크립트 준비
- [x] 테스트 데이터 시딩

### 4. 배포 준비
- [x] Git 저장소 정리 (민감한 정보 제거)
- [x] GitHub 백업 완료
- [x] 로컬 백업 완료 (tar.gz)
- [x] README 및 문서 작성

---

## 🔧 배포 전 필수 작업

### 1. Cloudflare API Key 설정 (최초 1회)
```bash
# Deploy 탭에서 Cloudflare API Key 설정 필요
# 설정 후 다음 명령어로 확인:
npx wrangler whoami
```

### 2. Cloudflare Secrets 등록
```bash
# 프로젝트 생성
npx wrangler pages project create mindstory-lms --production-branch main

# 각 환경 변수 등록
npx wrangler pages secret put KAKAO_CLIENT_ID --project-name mindstory-lms
npx wrangler pages secret put KAKAO_REDIRECT_URI --project-name mindstory-lms
npx wrangler pages secret put GOOGLE_CLIENT_ID --project-name mindstory-lms
npx wrangler pages secret put GOOGLE_CLIENT_SECRET --project-name mindstory-lms
npx wrangler pages secret put GOOGLE_REDIRECT_URI --project-name mindstory-lms
npx wrangler pages secret put OPENAI_BASE_URL --project-name mindstory-lms
npx wrangler pages secret put OPENAI_API_KEY --project-name mindstory-lms
npx wrangler pages secret put APIVIDEO_API_KEY --project-name mindstory-lms
npx wrangler pages secret put APIVIDEO_BASE_URL --project-name mindstory-lms
npx wrangler pages secret put CLOUDFLARE_ACCOUNT_ID --project-name mindstory-lms

# Secrets 등록 확인
npx wrangler pages secret list --project-name mindstory-lms
```

### 3. CORS 도메인 제한 (src/index.tsx 수정)
현재는 개발용으로 모든 도메인 허용(`origin: '*'`)되어 있습니다.
프로덕션 배포 시 반드시 도메인을 제한하세요:

```typescript
// src/index.tsx 수정
const allowedOrigins = [
  'https://mindstory-lms.pages.dev',           // Cloudflare Pages 기본 도메인
  'https://your-custom-domain.com',            // 커스텀 도메인 (있는 경우)
]

app.use('/api/*', cors({
  origin: (origin) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return origin
    }
    return null
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
}))
```

### 4. 리다이렉트 URI 업데이트
카카오/구글 개발자 콘솔에서 리다이렉트 URI를 프로덕션 도메인으로 추가:

**카카오 로그인**
- 카카오 개발자 콘솔: https://developers.kakao.com
- 내 애플리케이션 > 제품 설정 > 카카오 로그인
- Redirect URI 추가: `https://mindstory-lms.pages.dev/api/auth/kakao/callback`

**구글 로그인**
- Google Cloud Console: https://console.cloud.google.com
- APIs & Services > Credentials > OAuth 2.0 클라이언트
- 승인된 리디렉션 URI 추가: `https://mindstory-lms.pages.dev/api/auth/google/callback`

### 5. D1 데이터베이스 마이그레이션
```bash
# 프로덕션 데이터베이스에 마이그레이션 적용
npx wrangler d1 migrations apply mindstory-production

# 관리자 계정 생성 (초기 설정)
npx wrangler d1 execute mindstory-production --file=./migrations/0002_add_admin_user.sql

# 샘플 강좌 추가 (선택)
npx wrangler d1 execute mindstory-production --file=./migrations/0003_add_course_details.sql
```

---

## 🚀 배포 실행

### 1. 빌드
```bash
cd /home/user/webapp
npm run build
```

### 2. 배포
```bash
npx wrangler pages deploy dist --project-name mindstory-lms
```

### 3. 배포 URL 확인
배포 완료 후 다음 URL로 접속 가능:
- **기본 URL**: `https://mindstory-lms.pages.dev`
- **브랜치 URL**: `https://main.mindstory-lms.pages.dev`

---

## 🧪 배포 후 테스트

### 1. 기본 기능 테스트
```bash
# 홈페이지 접속
curl -I https://mindstory-lms.pages.dev/

# API 테스트
curl https://mindstory-lms.pages.dev/api/courses

# Rate Limit 헤더 확인
curl -I https://mindstory-lms.pages.dev/api/courses
```

### 2. 브라우저 테스트
- [ ] 홈페이지 로딩 확인
- [ ] 회원가입 (이메일)
- [ ] 로그인 (이메일)
- [ ] 카카오 로그인
- [ ] 구글 로그인
- [ ] 강좌 목록 조회
- [ ] 강좌 상세 페이지
- [ ] 무료 강좌 수강신청
- [ ] 학습 페이지 (YouTube 재생)
- [ ] 관리자 로그인 (`mindstory@admin.kr` / `admin1234`)
- [ ] 관리자 대시보드

### 3. 보안 테스트
- [ ] HTTPS 적용 확인
- [ ] Rate Limiting 작동 확인 (로그인 11번 시도)
- [ ] 세션 쿠키 HttpOnly + Secure 확인
- [ ] CORS 도메인 제한 확인
- [ ] 비정상 요청 차단 확인

---

## ⚠️ 베타 서비스 제한사항

현재 베타 버전에서는 다음 기능이 **제한**됩니다:

### 미구현 기능
- ❌ **결제 시스템**: 유료 강좌 구매 불가 (무료 강좌만 제공)
- ❌ **비밀번호 재설정**: 이메일 인증 미구현
- ❌ **학습 진도 추적**: 진도율 저장 안 됨
- ❌ **수료증 발급**: 수료증 생성 기능 없음
- ❌ **강좌 수정 UI**: 관리자가 웹에서 강좌 수정 불가 (DB 직접 수정 필요)

### 알려진 제한
- 📱 **모바일 최적화 부족**: 반응형 디자인 미흡
- 🎨 **UI/UX 개선 필요**: 디자인 완성도 낮음
- 📧 **이메일 알림 없음**: 회원가입/수강신청 알림 없음
- 📊 **분석 기능 부족**: 상세한 학습 통계 없음

---

## 🎯 베타 테스트 목표

### 테스트 규모
- **목표 사용자**: 50-100명
- **테스트 기간**: 2-4주
- **제공 강좌**: 무료 강좌 3-5개

### 수집할 피드백
1. 회원가입/로그인 경험
2. 강좌 찾기 및 수강신청 과정
3. 학습 페이지 사용성 (YouTube 플레이어)
4. 모바일 사용 경험
5. 버그 및 에러 리포트
6. 추가 기능 요청

---

## 📊 모니터링

### 확인할 지표
- 가입자 수
- 일일 활성 사용자 (DAU)
- 수강신청 수
- 강좌별 학습 완료율 (추후 구현)
- API 에러율
- Rate Limit 초과 횟수

### 로그 확인
```bash
# Cloudflare Pages 로그 확인
npx wrangler pages deployment tail --project-name mindstory-lms
```

---

## 📝 다음 단계 (베타 이후)

### 우선순위 1 (필수)
1. **결제 시스템 완성**: Toss Payments 통합
2. **보안 강화**: CSRF 토큰, XSS 방어
3. **비밀번호 재설정**: 이메일 인증 구현
4. **이용약관/개인정보처리방침**: 법적 문서 추가

### 우선순위 2 (중요)
5. **학습 진도 추적**: 실시간 진도율 저장
6. **이메일 알림**: SendGrid/Resend 통합
7. **강좌 관리 UI**: 관리자 웹 인터페이스
8. **모바일 최적화**: 반응형 디자인 개선

### 우선순위 3 (개선)
9. **수료증 발급**: PDF 생성 기능
10. **리뷰 시스템**: 강좌 평가 및 후기
11. **분석 대시보드**: 상세한 학습 통계
12. **성능 최적화**: 이미지 최적화, CDN, 캐싱

---

## ✅ 최종 배포 체크리스트

배포 전 모든 항목을 확인하세요:

- [ ] Cloudflare API Key 설정 완료
- [ ] Cloudflare Secrets 모두 등록 완료
- [ ] CORS 도메인 제한 적용 완료
- [ ] 카카오/구글 리다이렉트 URI 업데이트 완료
- [ ] D1 데이터베이스 마이그레이션 완료
- [ ] 관리자 계정 생성 완료
- [ ] 빌드 성공 확인
- [ ] 배포 성공 확인
- [ ] HTTPS 접속 확인
- [ ] 주요 기능 브라우저 테스트 완료
- [ ] Rate Limiting 작동 확인
- [ ] 세션 보안 확인
- [ ] 에러 처리 테스트 완료

모든 항목이 체크되면 **베타 서비스를 시작**할 수 있습니다! 🎉

---

**작성일**: 2026-03-21  
**버전**: Beta v1.0  
**상태**: 배포 준비 완료 ✅
