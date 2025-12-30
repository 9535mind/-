# 🚀 프로덕션 배포 가이드

## 왜 프로덕션 배포가 필요한가?

**샌드박스 환경의 한계**:
- Wrangler Pages Dev는 **개발 전용** 서버
- 대용량 파일(20분 영상, 100MB+) 처리 시 느리거나 타임아웃 발생
- 로컬 파일 시스템 사용으로 확장성 제한

**프로덕션 환경의 장점**:
- ✅ Cloudflare 글로벌 CDN (전 세계 275+ 데이터센터)
- ✅ R2 Storage (대용량 영상 최적화)
- ✅ 자동 스케일링
- ✅ HTTP/3, Brotli 압축, 스마트 라우팅
- ✅ 99.99% 가동시간 보장

---

## 📦 배포 전 준비사항

### 1. Cloudflare 계정 설정

1. **Cloudflare 가입**: https://dash.cloudflare.com/sign-up
2. **API 토큰 생성**:
   - Dashboard → My Profile → API Tokens
   - "Create Token" → "Edit Cloudflare Workers" 템플릿 사용
   - 권한: `Account.Cloudflare Pages` = Edit
   - 토큰 복사 (한 번만 표시됨!)

### 2. R2 Storage 생성 (영상 저장용)

```bash
# R2 버킷 생성
npx wrangler r2 bucket create mindstory-videos
npx wrangler r2 bucket create mindstory-storage

# 생성 확인
npx wrangler r2 bucket list
```

### 3. D1 Database 생성 (프로덕션용)

```bash
# D1 데이터베이스 생성
npx wrangler d1 create mindstory-production

# 출력된 database_id를 wrangler.jsonc에 복사
# "database_id": "your-database-id-here"

# 마이그레이션 적용
npx wrangler d1 migrations apply mindstory-production
```

---

## 🚀 배포 실행

### 1. 빌드

```bash
npm run build
```

### 2. Cloudflare Pages 프로젝트 생성

```bash
npx wrangler pages project create mindstory-lms \
  --production-branch main \
  --compatibility-date 2025-12-27
```

### 3. 배포

```bash
# 프로덕션 배포
npx wrangler pages deploy dist --project-name mindstory-lms

# 배포 완료 후 URL 확인
# https://mindstory-lms.pages.dev
```

### 4. 환경 변수 설정

```bash
# API 키 등 민감 정보 설정
npx wrangler pages secret put OPENAI_API_KEY --project-name mindstory-lms
npx wrangler pages secret put DATABASE_URL --project-name mindstory-lms
```

---

## 📹 영상 업로드 방법 (프로덕션)

### 방법 1: 관리자 페이지에서 업로드 (권장)

1. **프로덕션 사이트 접속**: https://mindstory-lms.pages.dev
2. **관리자 로그인**: admin@mindstory.co.kr / admin123
3. **강좌 관리 → 차시 관리**
4. **"차시 수정" 클릭**
5. **영상 파일 선택** (500MB까지 지원)
6. **"저장" 클릭**

→ 자동으로 Cloudflare R2에 업로드
→ 글로벌 CDN으로 즉시 서빙 시작

### 방법 2: API 직접 호출

```bash
# curl로 직접 업로드
curl -X POST https://mindstory-lms.pages.dev/api/upload/video \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "file=@/path/to/video.mp4"
```

### 방법 3: Wrangler CLI로 R2 직접 업로드

```bash
# R2에 직접 업로드
npx wrangler r2 object put mindstory-videos/videos/lesson1.mp4 \
  --file=/path/to/video.mp4 \
  --content-type=video/mp4

# 업로드 확인
npx wrangler r2 object get mindstory-videos/videos/lesson1.mp4
```

---

## 🔧 배포 후 설정

### 1. 커스텀 도메인 연결 (선택사항)

```bash
npx wrangler pages domain add lms.mindstory.co.kr \
  --project-name mindstory-lms
```

### 2. 데이터베이스 마이그레이션 (프로덕션)

```bash
# 로컬에서 테스트한 마이그레이션을 프로덕션에 적용
npx wrangler d1 migrations apply mindstory-production --remote
```

### 3. 초기 데이터 입력

```bash
# 강좌, 사용자 등 초기 데이터
npx wrangler d1 execute mindstory-production --remote \
  --file=./add_enrollments.sql
```

---

## 📊 모니터링 및 로그

### 실시간 로그 확인

```bash
# Pages 로그 확인
npx wrangler pages deployment tail --project-name mindstory-lms
```

### Cloudflare Dashboard에서 확인

- **Analytics**: 트래픽, 대역폭, 요청 수
- **Logs**: 실시간 로그 스트리밍
- **R2 Usage**: 저장 용량, 다운로드 통계

---

## 🎯 예상 비용

### Cloudflare Pages (무료 플랜)

- ✅ 무제한 요청
- ✅ 무제한 대역폭
- ✅ 500 빌드/월
- ✅ 100GB 파일 스토리지

### R2 Storage (무료 할당량)

- ✅ 10GB 저장 공간/월
- ✅ 1백만 Class A 작업/월 (업로드)
- ✅ 10백만 Class B 작업/월 (다운로드)

**실제 사용 예시**:
- 20분 영상 100개 = 약 5GB → **무료**
- 월 1만 회 재생 → **무료**

---

## ❓ 문제 해결

### 배포 실패 시

```bash
# 로그 확인
npx wrangler pages deployment tail

# 빌드 재시도
rm -rf dist .wrangler
npm run build
npx wrangler pages deploy dist
```

### 영상 재생 안 될 때

1. **R2 바인딩 확인**: wrangler.jsonc의 r2_buckets 설정
2. **CORS 설정 확인**: R2 버킷 CORS 정책
3. **파일 존재 확인**: `npx wrangler r2 object list mindstory-videos`

### Database 오류 시

```bash
# 마이그레이션 상태 확인
npx wrangler d1 migrations list mindstory-production

# 마이그레이션 재적용
npx wrangler d1 migrations apply mindstory-production --remote
```

---

## 🎉 배포 완료 체크리스트

- [ ] Cloudflare 계정 생성
- [ ] API 토큰 생성
- [ ] R2 버킷 생성 (mindstory-videos, mindstory-storage)
- [ ] D1 데이터베이스 생성 (mindstory-production)
- [ ] wrangler.jsonc 업데이트 (database_id)
- [ ] 빌드 성공 (`npm run build`)
- [ ] Pages 프로젝트 생성
- [ ] 배포 성공 (`npx wrangler pages deploy`)
- [ ] 마이그레이션 적용 (--remote)
- [ ] 관리자 로그인 테스트
- [ ] 영상 업로드 테스트
- [ ] 영상 재생 테스트
- [ ] 커스텀 도메인 연결 (선택사항)

---

## 📞 지원

문제가 발생하면:
1. 이 문서의 문제 해결 섹션 참조
2. Cloudflare Discord: https://discord.gg/cloudflaredev
3. Cloudflare Docs: https://developers.cloudflare.com/pages

---

**배포 완료 후 실제 사용자에게 공유할 수 있는 프로덕션 URL을 받게 됩니다!** 🎉
