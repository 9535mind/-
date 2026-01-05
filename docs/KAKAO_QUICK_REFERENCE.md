# 🔧 카카오 로그인 빠른 참조 가이드

## ⚡ 빠른 체크리스트

### 카카오 개발자 콘솔에서 확인해야 할 4가지:

#### 1️⃣ Redirect URI (가장 중요!)
```
경로: 제품 설정 > 카카오 로그인 > Redirect URI

등록할 URI:
https://3000-ieu1ambselnpjf2cme9se-c81df28e.sandbox.novita.ai/api/auth/kakao/callback

주의사항:
- https로 시작
- 마지막에 슬래시(/) 없음
- 앞뒤 공백 없음
- 정확히 복사/붙여넣기
```

#### 2️⃣ Web 플랫폼 도메인
```
경로: 앱 설정 > 플랫폼 > Web 플랫폼 등록

등록할 도메인:
https://3000-ieu1ambselnpjf2cme9se-c81df28e.sandbox.novita.ai

주의사항:
- https 포함
- 마지막 슬래시(/) 없음
- 경로 없음 (도메인만)
```

#### 3️⃣ 카카오 로그인 활성화
```
경로: 제품 설정 > 카카오 로그인

설정: 카카오 로그인 활성화 토글 → ON (파란색)
```

#### 4️⃣ 테스트 사용자 등록 (개발 중인 경우만)
```
경로: 앱 설정 > 일반 > 테스트 사용자 관리

조건: 앱 상태가 "개발 중"인 경우에만 필요
설정: 본인 카카오계정 이메일 등록
```

---

## 🧪 빠른 테스트

```bash
# 1. 검증 스크립트 실행 (서버 측 확인)
cd /home/user/webapp
./scripts/verify-kakao-setup.sh

# 2. 브라우저에서 테스트
# 시크릿 모드로 접속:
# https://3000-ieu1ambselnpjf2cme9se-c81df28e.sandbox.novita.ai/register
# → "카카오로 1초 만에 시작하기" 클릭

# 3. 로그 확인
pm2 logs mindstory-lms --nostream --lines 50 | grep KAKAO
```

---

## 🚨 문제 발생 시

### A. "No authorization code" 에러
```
→ Redirect URI 재확인
→ Web 플랫폼 도메인 재확인
→ 카카오 로그인 활성화 재확인
```

### B. KOE006 에러 (Redirect URI mismatch)
```
→ 카카오 콘솔의 Redirect URI와 환경변수 URI 정확히 일치 확인
→ 앞뒤 공백, 마지막 슬래시, 대소문자 확인
```

### C. KOE101 에러 (Invalid client)
```
→ REST API 키 재확인
→ 카카오 콘솔 > 앱 설정 > 앱 키 > REST API 키
→ .dev.vars의 KAKAO_CLIENT_ID와 일치 확인
```

---

## 📋 환경변수 확인

```bash
# 현재 환경변수 확인
cd /home/user/webapp
cat .dev.vars | grep KAKAO

# 예상 출력:
# KAKAO_CLIENT_ID=b7546f57b409c0a6e8f40312
# KAKAO_REDIRECT_URI=https://3000-ieu1ambselnpjf2cme9se-c81df28e.sandbox.novita.ai/api/auth/kakao/callback
```

---

## 🔄 서버 재시작

```bash
cd /home/user/webapp

# 빌드
npm run build

# PM2 재시작
pm2 restart mindstory-lms

# 상태 확인
pm2 list

# 로그 확인
pm2 logs mindstory-lms --nostream --lines 20
```

---

## 📞 상세 매뉴얼

```bash
# 상세 매뉴얼 보기
cat /home/user/webapp/docs/KAKAO_LOGIN_MANUAL.md

# 또는
less /home/user/webapp/docs/KAKAO_LOGIN_MANUAL.md
```

---

## 🎯 핵심 포인트

1. **서버 측은 완벽** → 카카오 콘솔만 설정하면 됨
2. **Redirect URI가 가장 중요** → 정확히 일치해야 함
3. **설정 후 반드시 저장** → 저장 버튼 클릭 확인
4. **시크릿 모드로 테스트** → 기존 세션 영향 제거

---

**✅ 4가지 설정 완료 → 5분 안에 해결!**
