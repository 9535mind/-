#!/bin/bash

# 카카오 로그인 설정 검증 스크립트
# 이 스크립트는 서버 측 설정이 올바른지 자동으로 확인합니다.

echo "============================================"
echo "🔍 카카오 로그인 설정 검증 시작"
echo "============================================"
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# 1. 환경변수 확인
echo "📋 1. 환경변수 확인"
echo "-------------------------------------------"

if [ -f ".dev.vars" ]; then
    echo -e "${GREEN}✓${NC} .dev.vars 파일 존재"
    PASS_COUNT=$((PASS_COUNT + 1))
    
    # KAKAO_CLIENT_ID 확인
    if grep -q "KAKAO_CLIENT_ID=" .dev.vars; then
        CLIENT_ID=$(grep "KAKAO_CLIENT_ID=" .dev.vars | cut -d'=' -f2)
        if [ ! -z "$CLIENT_ID" ] && [ "$CLIENT_ID" != "your_kakao_rest_api_key" ]; then
            echo -e "${GREEN}✓${NC} KAKAO_CLIENT_ID: $CLIENT_ID"
            PASS_COUNT=$((PASS_COUNT + 1))
        else
            echo -e "${RED}✗${NC} KAKAO_CLIENT_ID가 기본값이거나 비어있습니다"
            FAIL_COUNT=$((FAIL_COUNT + 1))
        fi
    else
        echo -e "${RED}✗${NC} KAKAO_CLIENT_ID 누락"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
    
    # KAKAO_REDIRECT_URI 확인
    if grep -q "KAKAO_REDIRECT_URI=" .dev.vars; then
        REDIRECT_URI=$(grep "KAKAO_REDIRECT_URI=" .dev.vars | cut -d'=' -f2-)
        if [ ! -z "$REDIRECT_URI" ] && [[ "$REDIRECT_URI" == https://* ]]; then
            echo -e "${GREEN}✓${NC} KAKAO_REDIRECT_URI: $REDIRECT_URI"
            PASS_COUNT=$((PASS_COUNT + 1))
            
            # Redirect URI 검증
            if [[ "$REDIRECT_URI" == */ ]]; then
                echo -e "${YELLOW}⚠${NC}  경고: Redirect URI 끝에 슬래시(/)가 있습니다"
                WARN_COUNT=$((WARN_COUNT + 1))
            fi
            
            if [[ "$REDIRECT_URI" != *"/api/auth/kakao/callback" ]]; then
                echo -e "${YELLOW}⚠${NC}  경고: Redirect URI 경로가 /api/auth/kakao/callback이 아닙니다"
                WARN_COUNT=$((WARN_COUNT + 1))
            fi
            
            if [[ "$REDIRECT_URI" != https://* ]]; then
                echo -e "${RED}✗${NC} Redirect URI가 https로 시작하지 않습니다"
                FAIL_COUNT=$((FAIL_COUNT + 1))
            fi
        else
            echo -e "${RED}✗${NC} KAKAO_REDIRECT_URI가 비어있거나 형식이 잘못되었습니다"
            FAIL_COUNT=$((FAIL_COUNT + 1))
        fi
    else
        echo -e "${RED}✗${NC} KAKAO_REDIRECT_URI 누락"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
else
    echo -e "${RED}✗${NC} .dev.vars 파일이 없습니다"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

echo ""

# 2. 코드 파일 확인
echo "📄 2. 코드 파일 확인"
echo "-------------------------------------------"

if [ -f "src/routes/auth-kakao.ts" ]; then
    echo -e "${GREEN}✓${NC} src/routes/auth-kakao.ts 파일 존재"
    PASS_COUNT=$((PASS_COUNT + 1))
    
    # 필수 엔드포인트 확인
    if grep -q "authKakao.get('/login'" src/routes/auth-kakao.ts; then
        echo -e "${GREEN}✓${NC} /login 엔드포인트 구현됨"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo -e "${RED}✗${NC} /login 엔드포인트 누락"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
    
    if grep -q "authKakao.get('/callback'" src/routes/auth-kakao.ts; then
        echo -e "${GREEN}✓${NC} /callback 엔드포인트 구현됨"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo -e "${RED}✗${NC} /callback 엔드포인트 누락"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
else
    echo -e "${RED}✗${NC} src/routes/auth-kakao.ts 파일이 없습니다"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

echo ""

# 3. 서버 상태 확인
echo "🖥️  3. 서버 상태 확인"
echo "-------------------------------------------"

if pm2 list | grep -q "mindstory-lms"; then
    STATUS=$(pm2 list | grep "mindstory-lms" | awk '{print $10}')
    if [[ "$STATUS" == "online" ]]; then
        echo -e "${GREEN}✓${NC} 서버 실행 중 (PM2)"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo -e "${RED}✗${NC} 서버 상태: $STATUS"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
else
    echo -e "${RED}✗${NC} 서버가 실행되고 있지 않습니다"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# 서버 응답 확인
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/kakao/login | grep -q "302"; then
    echo -e "${GREEN}✓${NC} /api/auth/kakao/login 엔드포인트 응답 (302 Found)"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${RED}✗${NC} /api/auth/kakao/login 엔드포인트 응답 없음"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

echo ""

# 4. 빌드 파일 확인
echo "🔨 4. 빌드 파일 확인"
echo "-------------------------------------------"

if [ -d "dist" ]; then
    echo -e "${GREEN}✓${NC} dist 디렉토리 존재"
    PASS_COUNT=$((PASS_COUNT + 1))
    
    if [ -f "dist/_worker.js" ]; then
        echo -e "${GREEN}✓${NC} dist/_worker.js 파일 존재"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo -e "${YELLOW}⚠${NC}  dist/_worker.js 파일 없음 (빌드 필요)"
        WARN_COUNT=$((WARN_COUNT + 1))
    fi
else
    echo -e "${YELLOW}⚠${NC}  dist 디렉토리 없음 (빌드 필요)"
    WARN_COUNT=$((WARN_COUNT + 1))
fi

echo ""

# 5. 최근 로그 확인
echo "📝 5. 최근 로그 확인"
echo "-------------------------------------------"

RECENT_ERRORS=$(pm2 logs mindstory-lms --nostream --lines 100 2>/dev/null | grep -i "KAKAO.*ERROR" | wc -l)
RECENT_SUCCESS=$(pm2 logs mindstory-lms --nostream --lines 100 2>/dev/null | grep -i "KAKAO_LOGIN" | wc -l)

if [ $RECENT_SUCCESS -gt 0 ]; then
    echo -e "${GREEN}✓${NC} 최근 카카오 로그인 시도: $RECENT_SUCCESS 회"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${YELLOW}⚠${NC}  최근 카카오 로그인 시도 없음"
    WARN_COUNT=$((WARN_COUNT + 1))
fi

if [ $RECENT_ERRORS -gt 0 ]; then
    echo -e "${RED}✗${NC} 최근 카카오 에러: $RECENT_ERRORS 회"
    echo ""
    echo "최근 에러 로그:"
    pm2 logs mindstory-lms --nostream --lines 100 2>/dev/null | grep -i "KAKAO.*ERROR" | tail -5
    FAIL_COUNT=$((FAIL_COUNT + 1))
else
    echo -e "${GREEN}✓${NC} 최근 카카오 에러 없음"
    PASS_COUNT=$((PASS_COUNT + 1))
fi

echo ""
echo "============================================"
echo "📊 검증 결과"
echo "============================================"
echo -e "${GREEN}통과:${NC} $PASS_COUNT"
echo -e "${YELLOW}경고:${NC} $WARN_COUNT"
echo -e "${RED}실패:${NC} $FAIL_COUNT"
echo ""

# 종합 판정
if [ $FAIL_COUNT -eq 0 ] && [ $WARN_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ 서버 측 설정이 완벽합니다!${NC}"
    echo ""
    echo "다음 단계:"
    echo "1. 카카오 개발자 콘솔에서 다음 설정 확인:"
    echo "   - Redirect URI: $(grep "KAKAO_REDIRECT_URI=" .dev.vars 2>/dev/null | cut -d'=' -f2-)"
    echo "   - Web 플랫폼 도메인: $(grep "KAKAO_REDIRECT_URI=" .dev.vars 2>/dev/null | cut -d'=' -f2- | cut -d'/' -f1-3)"
    echo "   - 카카오 로그인 활성화: ON"
    echo "2. 테스트: https://$(grep "KAKAO_REDIRECT_URI=" .dev.vars 2>/dev/null | cut -d'=' -f2- | cut -d'/' -f3)/register"
    exit 0
elif [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${YELLOW}⚠️  서버 측 설정에 경고가 있습니다${NC}"
    echo ""
    echo "경고 사항을 확인하고 필요시 수정하세요."
    exit 1
else
    echo -e "${RED}❌ 서버 측 설정에 문제가 있습니다${NC}"
    echo ""
    echo "위의 실패 항목을 수정한 후 다시 실행하세요."
    exit 2
fi
