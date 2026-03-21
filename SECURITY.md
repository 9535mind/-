# 🔐 MindStory LMS 보안 가이드

## 📋 목차
1. [환경 변수(Secrets) 관리](#1-환경-변수secrets-관리)
2. [CORS 설정](#2-cors-설정)
3. [Rate Limiting](#3-rate-limiting)
4. [세션 보안](#4-세션-보안)
5. [베타 서비스 체크리스트](#5-베타-서비스-체크리스트)

---

## 1. 환경 변수(Secrets) 관리

### ✅ 현재 상태
- 모든 민감한 API 키는 `wrangler.jsonc`의 `vars` 섹션에 **플레이스홀더**로만 저장됨
- 실제 키는 **절대 Git에 커밋되지 않음**
- 로컬 개발: `.dev.vars` 파일 사용 (gitignore에 포함)
- 프로덕션: Cloudflare Secrets 사용

### 📝 로컬 개발 설정
```bash
# .dev.vars 파일 생성 (이 파일은 Git에 커밋되지 않습니다)
KAKAO_CLIENT_ID=your_kakao_client_id
KAKAO_REDIRECT_URI=http://localhost:3000/api/auth/kakao/callback
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-proj-your_openai_key
APIVIDEO_API_KEY=your_apivideo_key
APIVIDEO_BASE_URL=https://ws.api.video
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
```

### 🚀 프로덕션 배포 (Cloudflare Secrets)
```bash
# Cloudflare API Key 설정 (최초 1회만)
# Deploy 탭에서 Cloudflare API Key 설정 필요

# 각 환경 변수를 Cloudflare Secrets로 등록
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

# Secrets 목록 확인
npx wrangler pages secret list --project-name mindstory-lms
```

### ⚠️ 주의사항
1. **절대 Git에 커밋하지 마세요**: `.dev.vars` 파일은 `.gitignore`에 포함되어 있습니다
2. **플레이스홀더만 커밋**: `wrangler.jsonc`에는 `"your-api-key"` 형태의 플레이스홀더만 포함
3. **정기적으로 키 교체**: 3-6개월마다 API 키 재발급 권장
4. **최소 권한 원칙**: 각 API 키는 필요한 최소한의 권한만 부여

---

## 2. CORS 설정

### ✅ 현재 상태
프로덕션 배포 시 CORS를 **엄격하게 제한**해야 합니다.

### 📝 개발 환경 (현재)
```typescript
// src/index.tsx
app.use('/api/*', cors({
  origin: '*',  // ⚠️ 개발 전용 - 모든 도메인 허용
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
}))
```

### 🚀 프로덕션 환경 (권장)
```typescript
// src/index.tsx
const allowedOrigins = [
  'https://mindstory-lms.pages.dev',           // Cloudflare Pages 기본 도메인
  'https://your-custom-domain.com',            // 커스텀 도메인
  'https://www.your-custom-domain.com'
]

app.use('/api/*', cors({
  origin: (origin) => {
    // Origin이 허용 목록에 있는지 확인
    if (!origin || allowedOrigins.includes(origin)) {
      return origin
    }
    return null  // 허용되지 않은 도메인 차단
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400  // 24시간 캐싱
}))
```

### ⚠️ 주의사항
1. **프로덕션 배포 전 필수**: 반드시 허용 도메인 목록으로 변경
2. **credentials: true**: 쿠키 기반 세션 사용 시 필수
3. **Origin 검증**: 요청 출처를 반드시 검증

---

## 3. Rate Limiting

### ✅ 현재 상태
IP 기반 Rate Limiting이 **완전 구현**되어 있습니다.

### 📝 구현된 Rate Limiter
```typescript
// src/middleware/rate-limiter.ts

// 1. 엄격한 제한 (로그인, 회원가입)
export const strictRateLimiter = rateLimiter({
  windowMs: 60000,   // 1분
  max: 10,           // 10회
  message: '요청이 너무 많습니다. 1분 후 다시 시도해주세요.'
})

// 2. 일반 제한 (일반 API)
export const generalRateLimiter = rateLimiter({
  windowMs: 60000,   // 1분
  max: 100,          // 100회
  message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
})

// 3. 관대한 제한 (읽기 전용 API)
export const lenientRateLimiter = rateLimiter({
  windowMs: 60000,   // 1분
  max: 200,          // 200회
  message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
})
```

### 📊 적용된 엔드포인트
| 엔드포인트 | 제한 (1분) | 설명 |
|---------|----------|------|
| `/api/auth/login` | 10회 | 로그인 시도 제한 |
| `/api/auth/register` | 10회 | 회원가입 제한 |
| `/api/auth/kakao/*` | 10회 | 카카오 로그인 제한 |
| `/api/auth/google/*` | 10회 | 구글 로그인 제한 |
| `/api/courses` | 100회 | 강좌 목록 조회 |
| `/api/enrollments` | 100회 | 수강신청 API |
| `/api/auth/me` | 200회 | 사용자 정보 조회 |

### 📈 응답 헤더
모든 API 응답에 Rate Limit 정보가 포함됩니다:
```
X-RateLimit-Limit: 100          # 최대 허용 횟수
X-RateLimit-Remaining: 95       # 남은 횟수
X-RateLimit-Reset: 2026-03-21T08:45:00.000Z  # 리셋 시각
```

### 🚫 제한 초과 시 응답
```json
{
  "success": false,
  "error": "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
  "retryAfter": 45  // 초 단위
}
```
HTTP Status: `429 Too Many Requests`

### ⚠️ 주의사항
1. **프로덕션 환경**: 현재 메모리 기반 스토어 사용 → Cloudflare KV로 업그레이드 권장
2. **IP 추출 순서**: `cf-connecting-ip` → `x-forwarded-for` → `x-real-ip`
3. **정리 작업**: 1분마다 만료된 엔트리 자동 삭제

---

## 4. 세션 보안

### ✅ 현재 상태
안전한 세션 관리가 구현되어 있습니다.

### 🔐 세션 쿠키 설정
```typescript
// HttpOnly + Secure 쿠키
c.header('Set-Cookie', 
  `session_token=${sessionToken}; ` +
  `HttpOnly; ` +           // JavaScript 접근 차단
  `Secure; ` +             // HTTPS만 전송
  `SameSite=Lax; ` +       // CSRF 방어
  `Path=/; ` +
  `Max-Age=${30 * 24 * 60 * 60}`  // 30일
)
```

### 📊 세션 정보
- **저장 위치**: Cloudflare D1 Database (`sessions` 테이블)
- **만료 시간**: 30일 (자동 로그인)
- **쿠키 속성**:
  - `HttpOnly`: ✅ XSS 공격 방어
  - `Secure`: ✅ HTTPS 전송만 허용
  - `SameSite=Lax`: ✅ CSRF 공격 방어

### 🔄 세션 검증 흐름
1. 클라이언트 요청 시 쿠키에서 `session_token` 추출
2. DB에서 세션 조회 및 만료 시간 검증
3. 유효한 세션인 경우 사용자 정보 반환
4. 만료된 세션은 자동 삭제

---

## 5. 베타 서비스 체크리스트

### ✅ 보안 준비 완료
- [x] **환경 변수 분리**: 민감한 키는 Git에 포함되지 않음
- [x] **CORS 설정**: 개발 환경 설정 완료 (프로덕션 배포 시 도메인 제한 필요)
- [x] **Rate Limiting**: IP 기반 요청 제한 완전 구현
- [x] **세션 보안**: HttpOnly + Secure 쿠키 적용
- [x] **Git 히스토리 정리**: 민감한 정보 완전 제거됨

### 🚀 배포 전 필수 작업
1. **Cloudflare API Key 설정**
   ```bash
   # Deploy 탭에서 Cloudflare API Key 설정
   ```

2. **Secrets 등록**
   ```bash
   npx wrangler pages secret put KAKAO_CLIENT_ID --project-name mindstory-lms
   npx wrangler pages secret put GOOGLE_CLIENT_ID --project-name mindstory-lms
   npx wrangler pages secret put OPENAI_API_KEY --project-name mindstory-lms
   # ... 나머지 환경 변수들
   ```

3. **CORS 도메인 제한** (src/index.tsx 수정)
   ```typescript
   const allowedOrigins = [
     'https://mindstory-lms.pages.dev',
     'https://your-domain.com'
   ]
   ```

4. **빌드 & 배포**
   ```bash
   npm run build
   npx wrangler pages deploy dist --project-name mindstory-lms
   ```

### 📋 베타 서비스 시작 전 최종 확인
- [ ] Cloudflare Secrets 모두 등록됨
- [ ] CORS 도메인 제한 적용됨
- [ ] Rate Limiting 정상 작동 확인
- [ ] HTTPS 적용 확인
- [ ] 세션 쿠키 Secure 플래그 활성화 확인
- [ ] 테스트 계정으로 전체 기능 테스트
- [ ] 에러 모니터링 설정 (선택)

### ⚠️ 베타 서비스 제한사항
현재 베타 버전에서는 다음 기능이 제한됩니다:
- ❌ 결제 시스템 (무료 강좌만 제공)
- ❌ 비밀번호 재설정 (이메일 인증)
- ❌ 학습 진도 추적
- ❌ 수료증 발급

무료 강좌로 **50-100명 규모의 베타 테스트**를 진행할 수 있습니다.

---

## 📞 문의
보안 관련 문제 발견 시 즉시 보고해주세요.

**작성일**: 2026-03-21  
**버전**: Beta v1.0
