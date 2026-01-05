# 📹 영상 시스템 설정 가이드

## Cloudflare R2 + 커스텀 플레이어 시스템

마인드스토리 LMS는 **Cloudflare R2**를 사용하여 영상을 저장하고 스트리밍합니다.
완전 무료로 시작할 수 있으며, 월 10GB까지 무료입니다.

---

## 🚀 Step 1: Cloudflare R2 버킷 생성

### 1-1. Cloudflare 대시보드 접속
1. https://dash.cloudflare.com 접속
2. 로그인 (이미 Pages 사용 중이므로 같은 계정)

### 1-2. R2 메뉴 이동
1. 좌측 메뉴에서 **R2** 클릭
2. **Create bucket** 버튼 클릭

### 1-3. 첫 번째 버킷 생성 (영상용)
```
Bucket name: mindstory-videos
Location: Automatic (권장)
```
- **Create bucket** 클릭

### 1-4. 두 번째 버킷 생성 (문서용)
```
Bucket name: mindstory-storage  
Location: Automatic (권장)
```
- **Create bucket** 클릭

---

## 📝 Step 2: R2 API 토큰 생성

### 2-1. API 토큰 메뉴
1. R2 페이지에서 **Manage R2 API Tokens** 클릭
2. **Create API token** 버튼 클릭

### 2-2. 토큰 설정
```
Token name: mindstory-lms-token
Permissions: 
  ✅ Object Read & Write
Specify bucket(s): 
  ✅ mindstory-videos
  ✅ mindstory-storage
TTL: Forever (또는 원하는 기간)
```

### 2-3. 토큰 정보 저장
**중요: 아래 정보를 안전하게 보관하세요!**

생성 후 다음 정보가 표시됩니다:
```
Access Key ID: xxxxxxxxxxxxx
Secret Access Key: yyyyyyyyyyyy
Endpoint: https://xxxxx.r2.cloudflarestorage.com
```

---

## 💻 Step 3: 로컬 개발 환경 설정

### 3-1. .dev.vars 파일 생성
프로젝트 루트에 `.dev.vars` 파일 생성:

```bash
cd /home/user/webapp
nano .dev.vars
```

### 3-2. 환경 변수 입력
```env
# Cloudflare R2 설정
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id  
R2_SECRET_ACCESS_KEY=your_secret_access_key
```

**주의: `.dev.vars` 파일은 절대 Git에 커밋하지 마세요!**

---

## 🎬 Step 4: 영상 업로드 방법

### 방법 A: 관리자 페이지에서 업로드 (권장)

1. 관리자 로그인
2. `/admin/courses` → 강좌 선택
3. 차시 관리 페이지
4. **영상 업로드** 버튼 클릭
5. 영상 파일 선택 (MP4 권장)
6. 업로드 완료

### 방법 B: wrangler CLI로 직접 업로드

```bash
# 영상 업로드
npx wrangler r2 object put mindstory-videos/videos/my-video.mp4 --file=/path/to/video.mp4

# 업로드 확인
npx wrangler r2 object list mindstory-videos
```

---

## 📊 Step 5: 로컬 테스트

### 5-1. 로컬 R2 에뮬레이션
Wrangler는 로컬 R2를 자동으로 에뮬레이션합니다:

```bash
npm run dev  # 또는
npx wrangler pages dev dist --d1=mindstory-production --local --r2=VIDEO_STORAGE --r2=STORAGE
```

### 5-2. 영상 시청 테스트
1. 학생 계정으로 로그인
2. 수강 중인 강좌의 차시 클릭
3. 영상 플레이어 확인
4. 재생/일시정지/진도율 확인

---

## 🌐 Step 6: 운영 환경 배포

### 6-1. Cloudflare Pages에 R2 바인딩 추가

**Cloudflare Dashboard에서:**
1. Pages → mindstory-lms 프로젝트 선택
2. Settings → Functions → R2 bucket bindings
3. **Add binding** 클릭

**첫 번째 바인딩:**
```
Variable name: VIDEO_STORAGE
R2 bucket: mindstory-videos
```

**두 번째 바인딩:**
```
Variable name: STORAGE
R2 bucket: mindstory-storage
```

### 6-2. 배포
```bash
npm run deploy
```

---

## 📈 Step 7: 비용 모니터링

### 무료 한도
- 저장: 10GB/월
- Class A 작업 (업로드): 100만 건/월
- Class B 작업 (다운로드): 1천만 건/월

### 예상 비용 (초과 시)
```
저장 (10GB 초과): $0.015/GB/월
  → 100GB = 약 1,400원/월

Class A (업로드, 100만 건 초과): $4.50/100만 건
  → 거의 초과 안 함

Class B (다운로드, 1천만 건 초과): $0.36/100만 건
  → 수강생 100명 = 거의 무료
```

### 비용 확인
1. Cloudflare Dashboard → R2
2. **Usage** 탭 클릭
3. 실시간 사용량 확인

---

## 🔧 문제 해결

### Q: 영상이 재생되지 않아요
**A:** 다음을 확인하세요:
1. R2 바인딩이 올바른지 (wrangler.jsonc)
2. 영상이 R2에 업로드되었는지
3. 수강권이 있는지
4. 브라우저 콘솔에 에러가 있는지

### Q: 업로드가 너무 느려요
**A:** 영상 파일 최적화 권장:
- 해상도: 1080p 이하
- 비트레이트: 2-5 Mbps
- 코덱: H.264
- 파일 크기: 강의 1시간당 300MB 이하

### Q: 진도율이 저장 안 돼요
**A:** 
1. 로그인 상태 확인
2. 수강 신청 확인
3. 브라우저 쿠키/로컬스토리지 확인

---

## 🎯 추천 영상 설정

### 촬영/편집 시
- **해상도**: 1920x1080 (Full HD)
- **프레임레이트**: 30fps
- **비트레이트**: 3-5 Mbps
- **오디오**: AAC, 128 kbps

### 인코딩 설정 (HandBrake 기준)
```
포맷: MP4
비디오 코덱: H.264
프레임레이트: 30fps
화질: RF 23 (권장)
오디오: AAC, 128 kbps
```

### 예상 파일 크기
- 10분 영상: 약 50MB
- 30분 영상: 약 150MB
- 1시간 영상: 약 300MB

---

## 📋 체크리스트

운영 시작 전 확인사항:

- [ ] Cloudflare R2 버킷 2개 생성 (videos, storage)
- [ ] R2 API 토큰 생성 및 안전 보관
- [ ] wrangler.jsonc에 R2 바인딩 설정
- [ ] .dev.vars 환경 변수 설정
- [ ] Cloudflare Pages에 R2 바인딩 추가
- [ ] 테스트 영상 업로드 및 재생 확인
- [ ] 진도율 추적 확인
- [ ] 모바일 환경 테스트
- [ ] 비용 모니터링 설정

---

## 🆘 지원

문제가 발생하면:
1. 브라우저 콘솔 확인 (F12)
2. PM2 로그 확인: `pm2 logs mindstory-lms --nostream`
3. Cloudflare Dashboard → R2 → 사용량 확인

---

## 📌 다음 단계

영상 시스템이 준비되면:
1. 첫 강좌 영상 업로드
2. 테스트 계정으로 시청 테스트
3. 진도율 및 수료 확인
4. 수강생 초대 시작!

**3개월 후 수강생이 늘면:**
→ Cloudflare Stream (월 1만원)으로 업그레이드 고려

**1년 후 정상화되면:**
→ Kollus (월 5만원)로 최종 업그레이드 고려

---

**시작하세요! 💪**
