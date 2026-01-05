# 📸 이미지 교체 완전 가이드

## 목차
1. [과정 썸네일 이미지 교체](#1-과정-썸네일-이미지-교체)
2. [히어로 섹션 배경 이미지 교체](#2-히어로-섹션-배경-이미지-교체)
3. [팝업 이미지 교체](#3-팝업-이미지-교체)
4. [이미지 URL 획득 방법](#4-이미지-url-획득-방법)

---

## 1. 과정 썸네일 이미지 교체

### 📋 현재 상태
- **자기주도학습 지도사 과정** 썸네일: AI 생성 이미지
- **다른 과정들**: 기본 아이콘

### 🔧 교체 방법

#### Step 1: 교체할 이미지 준비
1. **이미지 업로드**:
   - GenSpark AI에 이미지 파일 업로드
   - 또는 외부 이미지 호스팅 서비스 사용 (Cloudflare R2, Imgur 등)

2. **이미지 URL 복사**:
   - 업로드 후 받은 URL 복사
   - 예: `https://www.genspark.ai/api/files/s/XXXXX`

#### Step 2: 데이터베이스 업데이트

**Wrangler CLI 사용:**
```bash
# Sandbox에서 작업
cd /home/user/webapp

# 로컬 데이터베이스 업데이트
npx wrangler d1 execute mindstory-production --local --command="
UPDATE courses 
SET thumbnail_url = '여기에_새_이미지_URL_붙여넣기'
WHERE title = '자기주도학습 지도사 과정'
"

# PM2 재시작
pm2 restart mindstory-lms
```

**여러 과정 한번에 업데이트:**
```bash
# SQL 파일 생성
cat > /tmp/update_thumbnails.sql << 'EOF'
-- 자기주도학습 지도사 과정
UPDATE courses SET thumbnail_url = '이미지_URL_1' WHERE title = '자기주도학습 지도사 과정';

-- 마인드 타임 코칭 입문
UPDATE courses SET thumbnail_url = '이미지_URL_2' WHERE title = '마인드 타임 코칭 입문';

-- 부모-자녀 대화법
UPDATE courses SET thumbnail_url = '이미지_URL_3' WHERE title = '부모-자녀 대화법';
EOF

# 실행
npx wrangler d1 execute mindstory-production --local --file=/tmp/update_thumbnails.sql

# 재시작
pm2 restart mindstory-lms
```

---

## 2. 히어로 섹션 배경 이미지 교체

### 📋 현재 상태
- **현재 이미지**: 대표님이 제공하신 자연 경관 사진
- **위치**: 홈페이지 최상단 "마음을 이해하고 성장하는 여정" 섹션

### 🔧 교체 방법

#### Step 1: 이미지 파일 준비
- 권장 크기: **1920x1080px** 이상 (16:9 비율)
- 파일 형식: JPG, PNG, WebP
- 용량: 500KB 이하 (빠른 로딩)

#### Step 2: 코드 파일 수정

**파일 위치**: `/home/user/webapp/src/index.tsx`

**수정 부분**:
```typescript
// 현재 (158번째 줄 근처)
<section class="section-image hero-gradient text-white py-32" 
  style="background-image: url('https://www.genspark.ai/api/files/s/Nx5k1tgA');">

// 변경 후
<section class="section-image hero-gradient text-white py-32" 
  style="background-image: url('여기에_새_이미지_URL_붙여넣기');">
```

**전체 수정 명령어**:
```bash
cd /home/user/webapp

# 백업 먼저
cp src/index.tsx src/index.tsx.backup

# Bash에서 직접 수정 (URL 교체)
# 아래 명령어에서 NEW_IMAGE_URL을 실제 URL로 변경하세요
NEW_IMAGE_URL="https://your-image-url.com/image.jpg"

sed -i "s|https://www.genspark.ai/api/files/s/Nx5k1tgA|$NEW_IMAGE_URL|g" src/index.tsx

# 빌드 및 재시작
npm run build
pm2 restart mindstory-lms
```

---

## 3. 팝업 이미지 교체

### 📋 현재 상태
- **팝업 제목**: "마인드스토리와 함께하는 특별한 성장 여정"
- **현재 이미지**: 전문 코칭 멘토링 이미지

### 🔧 교체 방법

#### Step 1: 팝업 ID 확인
```bash
cd /home/user/webapp

npx wrangler d1 execute mindstory-production --local --command="
SELECT id, title, image_url 
FROM popups 
WHERE title LIKE '%마인드스토리%'
LIMIT 5
"
```

#### Step 2: 이미지 URL 업데이트
```bash
# 팝업 ID가 3번이라고 가정
npx wrangler d1 execute mindstory-production --local --command="
UPDATE popups 
SET image_url = '여기에_새_이미지_URL_붙여넣기'
WHERE id = 3
"

# 재시작
pm2 restart mindstory-lms
```

---

## 4. 이미지 URL 획득 방법

### 방법 A: GenSpark AI 업로드

1. **채팅창에 이미지 첨부**:
   ```
   이 이미지를 업로드해주세요
   [이미지 파일 첨부]
   ```

2. **URL 받기**:
   - 저 (AI)가 이미지를 처리하고 URL 제공
   - 형식: `https://www.genspark.ai/api/files/s/XXXXX`

### 방법 B: Cloudflare R2 (무료 10GB)

**프로덕션 환경에서 권장**

1. **R2 버킷 확인**:
```bash
npx wrangler r2 bucket list
```

2. **이미지 업로드**:
```bash
# 로컬 이미지 파일을 R2에 업로드
npx wrangler r2 object put mindstory-storage/images/hero-background.jpg --file=/path/to/image.jpg
```

3. **Public URL 생성**:
   - Cloudflare 대시보드에서 R2 Public URL 설정
   - 또는 Workers를 통한 프록시 설정

### 방법 C: 외부 이미지 호스팅

**무료 서비스:**
- **Imgur**: https://imgur.com/upload (무료, 빠름)
- **Cloudinary**: https://cloudinary.com (무료 플랜 10GB)
- **ImageKit**: https://imagekit.io (무료 플랜 20GB)

**사용 방법:**
1. 위 서비스 중 하나 선택
2. 이미지 업로드
3. 제공된 Direct URL 복사
4. 위의 방법으로 교체

---

## 5. 이미지 최적화 팁

### 권장 사양

| 위치 | 권장 크기 | 비율 | 최대 용량 |
|------|-----------|------|-----------|
| **히어로 배경** | 1920x1080px | 16:9 | 500KB |
| **과정 썸네일** | 800x450px | 16:9 | 200KB |
| **팝업 이미지** | 600x400px | 3:2 | 150KB |

### 최적화 도구

**온라인 도구:**
- **TinyPNG**: https://tinypng.com (PNG/JPG 압축)
- **Squoosh**: https://squoosh.app (구글 제공, 다양한 형식)
- **Compressor.io**: https://compressor.io (무료 압축)

**명령어 (ImageMagick 사용):**
```bash
# 이미지 리사이즈 + 압축
convert input.jpg -resize 1920x1080 -quality 85 output.jpg

# WebP 변환 (더 작은 용량)
convert input.jpg -quality 80 output.webp
```

---

## 6. 실전 예제

### 예제 1: 자기주도학습 과정 썸네일 교체

```bash
# 1. 이미지 URL 획득 (대표님이 준비)
NEW_THUMB="https://www.genspark.ai/api/files/s/ABC123XYZ"

# 2. 데이터베이스 업데이트
cd /home/user/webapp
npx wrangler d1 execute mindstory-production --local --command="
UPDATE courses 
SET thumbnail_url = '$NEW_THUMB'
WHERE title = '자기주도학습 지도사 과정'
"

# 3. 재시작
pm2 restart mindstory-lms

# 4. 확인
curl http://localhost:3000/api/courses/featured | grep thumbnail_url
```

### 예제 2: 히어로 배경 이미지 교체

```bash
# 1. 새 배경 이미지 URL
NEW_HERO="https://your-image-url.com/hero-bg.jpg"

# 2. 파일 수정
cd /home/user/webapp
sed -i "s|Nx5k1tgA|ABC123XYZ|g" src/index.tsx

# 또는 전체 URL 교체
sed -i "s|https://www.genspark.ai/api/files/s/Nx5k1tgA|$NEW_HERO|g" src/index.tsx

# 3. 빌드 및 재시작
npm run build
pm2 restart mindstory-lms

# 4. 확인
curl http://localhost:3000 | grep "background-image"
```

### 예제 3: 여러 이미지 한번에 교체

```bash
cd /home/user/webapp

# SQL 파일 생성
cat > /tmp/batch_update_images.sql << 'EOF'
-- 과정 썸네일들
UPDATE courses SET thumbnail_url = 'URL_1' WHERE id = 1;
UPDATE courses SET thumbnail_url = 'URL_2' WHERE id = 2;
UPDATE courses SET thumbnail_url = 'URL_3' WHERE id = 5;

-- 팝업 이미지
UPDATE popups SET image_url = 'URL_4' WHERE id = 3;
EOF

# 실행
npx wrangler d1 execute mindstory-production --local --file=/tmp/batch_update_images.sql

# 코드 파일 수정 (히어로)
sed -i 's/OLD_URL/NEW_URL/g' src/index.tsx

# 빌드 및 재시작
npm run build
pm2 restart mindstory-lms
```

---

## 7. 트러블슈팅

### 문제 1: 이미지가 표시되지 않음

**원인**: CORS 정책 또는 잘못된 URL

**해결**:
```bash
# 1. URL 확인
curl -I "이미지_URL"

# 2. CORS 허용 여부 확인
# GenSpark AI 파일은 CORS 허용됨

# 3. 브라우저 콘솔 확인
# F12 → Console 탭에서 에러 확인
```

### 문제 2: 이미지가 느리게 로드됨

**원인**: 파일 크기가 너무 큼

**해결**:
```bash
# 이미지 최적화
convert large-image.jpg -resize 1920x1080 -quality 80 optimized.jpg

# WebP 변환 (더 작은 용량)
convert image.jpg -quality 80 image.webp
```

### 문제 3: 변경 사항이 반영되지 않음

**원인**: 브라우저 캐시 또는 빌드 누락

**해결**:
```bash
# 1. 완전히 재빌드
cd /home/user/webapp
rm -rf dist .wrangler/tmp
npm run build
pm2 restart mindstory-lms

# 2. 브라우저 캐시 삭제
# Ctrl + Shift + R (Windows/Linux)
# Cmd + Shift + R (Mac)
```

---

## 8. 프로덕션 배포 시 주의사항

### 로컬 vs 프로덕션 차이

**로컬 (Sandbox):**
- 데이터베이스: `.wrangler/state/v3/d1`
- 변경 후 `pm2 restart` 필요

**프로덕션 (Cloudflare Pages):**
- 데이터베이스: Cloudflare D1 원격
- 변경 후 `--remote` 플래그 사용
- 코드 변경 시 재배포 필요

**프로덕션 업데이트 예시:**
```bash
# 1. 원격 DB 업데이트
npx wrangler d1 execute mindstory-production --remote --command="
UPDATE courses SET thumbnail_url = 'NEW_URL' WHERE id = 5
"

# 2. 코드 변경 후 배포
cd /home/user/webapp
git add src/index.tsx
git commit -m "Update hero background image"
npm run build
npx wrangler pages deploy dist --project-name mindstory-lms
```

---

## 9. 빠른 참조표

| 작업 | 명령어 템플릿 |
|------|---------------|
| **과정 썸네일** | `UPDATE courses SET thumbnail_url = 'URL' WHERE id = X` |
| **히어로 배경** | `sed -i 's/OLD_URL/NEW_URL/g' src/index.tsx` |
| **팝업 이미지** | `UPDATE popups SET image_url = 'URL' WHERE id = X` |
| **빌드+재시작** | `npm run build && pm2 restart mindstory-lms` |
| **이미지 확인** | `curl http://localhost:3000 \| grep "이미지_파일명"` |

---

## 10. 문의 및 지원

**이미지 교체 관련 문의**:
- 대표님이 이미지 파일을 채팅창에 첨부해주시면
- 저 (AI)가 직접 업로드하고 URL 제공
- 그 URL을 위 방법대로 교체하시면 됩니다!

**추가 도움이 필요하시면**:
```
"[이미지명] 사진을 [위치]에 교체하고 싶어요"
예: "히어로 배경 사진을 새 사진으로 교체하고 싶어요"
```

---

**마지막 업데이트**: 2025.12.28  
**작성자**: GenSpark AI Assistant
