# 환경 변수 설정 가이드

이 프로젝트를 실행하려면 다음 환경 변수들을 설정해야 합니다.

## 📝 .dev.vars 파일 생성

프로젝트 루트에 `.dev.vars` 파일을 생성하고 다음 내용을 입력하세요:

```bash
# Kakao OAuth
KAKAO_CLIENT_ID=your-kakao-client-id
KAKAO_REDIRECT_URI=http://localhost:3000/auth/kakao/callback

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Gemini API
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GEMINI_API_KEY=your-gemini-api-key

# API Video
APIVIDEO_API_KEY=your-apivideo-api-key
APIVIDEO_BASE_URL=https://sandbox.api.video

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
```

## 🔑 API 키 발급 방법

### 1. Kakao Developers
- https://developers.kakao.com
- 애플리케이션 생성 → REST API 키 복사

### 2. Google Cloud Console
- https://console.cloud.google.com
- OAuth 2.0 클라이언트 ID 생성

### 3. Google Gemini
- https://aistudio.google.com/app/apikey
- API 키 생성 (무료 사용 가능)

### 4. Cloudflare
- https://dash.cloudflare.com
- API 토큰 생성 (Workers, Pages 권한)

## ⚠️ 주의사항

- `.dev.vars` 파일은 **절대 Git에 커밋하지 마세요**
- 프로덕션 환경에서는 Cloudflare Dashboard에서 환경 변수를 설정하세요
- API 키는 타인과 공유하지 마세요
