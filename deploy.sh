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

# 4. R2 / D1 (자동 생성 안 함 — 불필요한 리소스·이름 불일치 방지)
echo "🗄️ Step 4: 스토리지·DB 안내..."
echo -e "${BLUE}   R2 바인딩은 wrangler.toml 의 bucket_name(mindstory-lms)만 사용합니다.${NC}"
echo -e "${BLUE}   예전 스크립트가 만들던 mindstory-videos / mindstory-storage 는 더 이상 자동 생성하지 않습니다.${NC}"
echo -e "${YELLOW}   D1(mindstory-production)은 최초 1회 수동 생성·wrangler.toml database_id 반영이 필요합니다.${NC}"
echo ""

# 5. 단일 Pages 프로젝트 배포 주의
echo "🌐 Step 5: Pages 배포 대상..."
echo -e "${GREEN}   프로젝트 이름: mslms (production branch: main)${NC}"
echo -e "${YELLOW}   Git 연동 Pages와 CLI 배포를 동시에 쓰면 배포가 이중으로 쌓일 수 있습니다.${NC}"
echo -e "${YELLOW}   미리보기 호스트가 과다하면 Cloudflare Dashboard → mslms → Settings → Builds 를 확인하세요.${NC}"
echo ""

# 6. 배포
echo "🚀 Step 6: 프로덕션 배포 시작..."
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
echo "📚 배포·단일 사이트 정리: wrangler.toml 상단 주석 참고"
echo ""
