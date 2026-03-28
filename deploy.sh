#!/bin/bash

# MindStory LMS 프로덕션 배포 스크립트
# 사용법: bash deploy.sh

set -e  # 오류 발생 시 즉시 종료

echo "🚀 MindStory LMS 프로덕션 배포 시작..."
echo ""

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. 환경 확인
echo "📋 Step 1: 환경 확인..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js가 설치되어 있지 않습니다.${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm이 설치되어 있지 않습니다.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v), npm $(npm -v)${NC}"
echo ""

# 2. 의존성 확인
echo "📦 Step 2: 의존성 확인..."
if [ ! -d "node_modules" ]; then
    echo "의존성 설치 중..."
    npm install
else
    echo -e "${GREEN}✅ node_modules 존재${NC}"
fi
echo ""

# 3. 빌드
echo "🔨 Step 3: 프로젝트 빌드..."
echo "빌드 시작 (30-60초 소요)..."
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ 빌드 실패: dist 폴더가 생성되지 않았습니다.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 빌드 완료${NC}"
echo ""

# 4. R2 버킷 확인/생성
echo "🗄️ Step 4: R2 버킷 확인..."
echo "R2 버킷 목록 확인 중..."

# R2 버킷 목록 가져오기
BUCKETS=$(npx wrangler r2 bucket list 2>/dev/null || echo "")

# mindstory-videos 버킷 확인
if echo "$BUCKETS" | grep -q "mindstory-videos"; then
    echo -e "${GREEN}✅ mindstory-videos 버킷 존재${NC}"
else
    echo -e "${YELLOW}⚠️  mindstory-videos 버킷 생성 중...${NC}"
    npx wrangler r2 bucket create mindstory-videos || true
fi

# mindstory-storage 버킷 확인
if echo "$BUCKETS" | grep -q "mindstory-storage"; then
    echo -e "${GREEN}✅ mindstory-storage 버킷 존재${NC}"
else
    echo -e "${YELLOW}⚠️  mindstory-storage 버킷 생성 중...${NC}"
    npx wrangler r2 bucket create mindstory-storage || true
fi
echo ""

# 5. D1 데이터베이스 확인
echo "🗃️ Step 5: D1 데이터베이스 확인..."
echo -e "${YELLOW}⚠️  D1 데이터베이스는 수동으로 생성해야 합니다.${NC}"
echo "명령어: npx wrangler d1 create mindstory-production"
echo "생성 후 wrangler.jsonc의 database_id를 업데이트하세요."
echo ""

# 6. Pages 프로젝트 생성 확인
echo "🌐 Step 6: Cloudflare Pages 프로젝트 확인..."
echo -e "${YELLOW}⚠️  프로젝트가 없으면 생성됩니다.${NC}"
echo ""

# 7. 배포
echo "🚀 Step 7: 프로덕션 배포 시작..."
echo "배포 중 (1-2분 소요)..."
echo ""

npx wrangler pages deploy dist --project-name mslms --branch main --commit-dirty=true

echo ""
echo -e "${GREEN}✨ 배포 완료!${NC}"
echo ""

# 8. 다음 단계 안내
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📋 다음 단계:${NC}"
echo ""
echo "1. 프로덕션 URL 접속 (위에 표시된 URL)"
echo "2. 관리자 로그인:"
echo "   - 이메일: admin@mindstory.co.kr"
echo "   - 비밀번호: admin123"
echo ""
echo "3. D1 마이그레이션 적용 (처음 한 번만):"
echo "   npx wrangler d1 migrations apply mindstory-production --remote"
echo ""
echo "4. 초기 데이터 입력 (처음 한 번만):"
echo "   npx wrangler d1 execute mindstory-production --remote --file=./add_enrollments.sql"
echo ""
echo "5. 영상 업로드:"
echo "   - 관리자 페이지 → 강좌 관리 → 차시 관리"
echo "   - 또는: npx wrangler r2 object put mindstory-videos/videos/xxx.mp4 --file=./영상파일.mp4"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}🎉 축하합니다! MindStory LMS가 배포되었습니다!${NC}"
echo ""
echo "📚 상세 가이드: DEPLOYMENT_CHECKLIST.md"
echo "📖 프로덕션 가이드: PRODUCTION_DEPLOYMENT.md"
echo ""
