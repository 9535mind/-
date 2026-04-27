# 🎓 마인드스토리 원격평생교육원 LMS 플랫폼

**Ver.2.0 - 🚀 프로세스 개선 + 수강평/별점/배속/수료증 시스템 추가! (2026.01.04)** ✨🎉

> **완전한 학습 경험!** 테스트 자동화 + API 문서 + 수강평/별점 + 배속 재생 + 수료증 발급!

> **"스스로 배우는 힘을 키우는 교육"**  
> 박종석 대표의 20년 현장 경험을 담은 **완전한 프로덕션급 LMS 플랫폼**

---

## 🆕 Ver.2.0 - 프로세스 개선 + 신규 기능 추가! (2026.01.04)

### ✨ **새로운 기능**

#### **Phase 0: 프로세스 개선 (A 옵션 요구사항)**
- ✅ **테스트 자동화 스크립트** (`test-automation.sh`) - 12개 엔드포인트 자동 테스트
- ✅ **API 설계 문서** (`docs/API_DESIGN.md`) - 전체 API 스펙 문서화
- ✅ **TypeScript 타입 완벽화** - Cloudflare Bindings 타입 정의
- ✅ **에러 핸들링 강화** (`src/utils/error-handler.ts`) - 통합 에러 처리
- ✅ **코드 주석 개선** - 모든 주요 함수에 주석 추가

#### **Phase 1: V1 완성**
- ✅ **불필요한 코드 제거** - api.video, Cloudflare Stream 관련 코드 백업 처리
- ✅ **의존성 정리** - `@api.video/nodejs-client` 제거
- ✅ **YouTube 전용 최적화** - YouTube Player에 집중

#### **Phase 2: 수강평/별점 시스템** ⭐
```typescript
// 수강평 작성 API
POST /api/courses/:courseId/reviews
{
  "rating": 5,        // 1-5점
  "comment": "정말 유익한 강의였습니다!"
}

// 수강평 목록 조회 (페이지네이션)
GET /api/courses/:courseId/reviews?page=1&limit=10

// 수강평 통계 (평균 별점, 총 개수, 분포도)
GET /api/courses/:courseId/reviews/summary
```

**기능:**
- 📊 1-5점 별점 시스템
- 💬 수강평 작성/수정/삭제
- 📈 별점 통계 (평균, 총 개수, 분포도)
- 📄 페이지네이션 지원
- 🔒 한 강좌당 1개의 리뷰만 작성 가능
- 🎨 별점 UI 컴포넌트 (course-reviews.js)

#### **Phase 3: 배속 재생 기능** ⏩
- ✅ YouTube Player playbackRate 설정 (0.5x ~ 2.0x)
- ✅ 배속 컨트롤 UI 추가 (learn-player.js)
- ✅ 사용자 선호 배속 저장 (localStorage)

**지원 배속:**
- 0.5x (느리게)
- 0.75x
- 1.0x (보통)
- 1.25x
- 1.5x
- 2.0x (빠르게)

#### **Phase 4: 수료증 발급 시스템** 🎓
```typescript
// 수료증 발급
POST /api/courses/:courseId/certificate

// 내 수료증 목록
GET /api/my/certificates

// 수료증 조회
GET /api/certificates/:number
```

**기능:**
- 📜 HTML 기반 수료증 템플릿
- 🖨️ 브라우저 인쇄 기능 (PDF 저장)
- 🔢 고유 수료증 번호 (YYYY-MM-XXXX 형식)
- ✅ 수료 조건 확인 (진도율 80% 이상)
- 🎨 전문적인 디자인 (certificate.js)

### 📊 **테스트 결과**

✅ **모든 테스트 통과! (10/10)**

| 카테고리 | 테스트 항목 | 결과 |
|---------|------------|------|
| **기본 엔드포인트** | 홈페이지 | ✅ PASS |
| | 강좌 목록 페이지 | ✅ PASS |
| | 로그인 페이지 | ✅ PASS |
| | 강좌 목록 API | ✅ PASS |
| | 헬스체크 API | ✅ PASS |
| **수강평/별점** | 수강평 목록 조회 | ✅ PASS |
| | 수강평 요약 조회 | ✅ PASS |
| | 수강평 작성 (인증) | ✅ PASS |
| **수료증** | 수료증 발급 (인증) | ✅ PASS |
| | 수료증 조회 | ✅ PASS |

### 🔧 **개선 효과**

| 항목 | Before (Ver.1.x) | After (Ver.2.0) | 개선 |
|------|------------------|-----------------|------|
| **테스트 자동화** | ❌ 없음 | ✅ 12개 | 자동 테스트 스크립트 |
| **API 문서** | ⚠️ 부족 | ✅ 완벽 | 전체 API 스펙 문서 |
| **타입 안정성** | ⚠️ 부족 | ✅ 완벽 | TypeScript 타입 정의 |
| **에러 핸들링** | ⚠️ 약함 | ✅ 강화 | 통합 에러 처리 |
| **수강평/별점** | ❌ 없음 | ✅ 추가 | 1-5점 + 통계 |
| **배속 재생** | ❌ 없음 | ✅ 추가 | 0.5x ~ 2.0x |
| **수료증 발급** | ❌ 없음 | ✅ 추가 | HTML + 인쇄 |

---

## 🔗 **배포 정보**

### **Sandbox (개발/테스트)**
```
🌐 URL: https://3000-ieu1ambselnpjf2cme9se-c81df28e.sandbox.novita.ai
📝 상태: 활성화
🔒 인증: 불필요
```

### **Cloudflare Pages (프로덕션)**
```
🌐 URL: https://mindstory.kr
📝 상태: 배포 완료
🔒 인증: 필요 (API 토큰)
```

---

## 🔑 **테스트 계정 정보**

### **관리자 계정** (추천)
```
📧 ID: admin@lms.kr
🔑 PW: admin123456
🌐 URL: https://mindstory.kr
```

**관리자 권한:**
- ✅ 모든 강좌 접근 가능
- ✅ 차시 관리 (영상 교체 가능)
- ✅ 학생 관리
- ✅ 진도율 조회
- ✅ 수강평 관리
- ✅ 수료증 발급

### **학생 계정**
```
📧 ID: student@example.com
🔑 PW: student123
🌐 URL: https://mindstory.kr
```

---

## JTT-Kinder (FOREST) — 동결

- 유아숲·GAS·시트 연동은 **완성된 독립 서비스(FOREST ZONE)**. MS12와 **통합·라우트 공유·리팩터** 없이, 승인된 변경만 한다.
- 정책·파일 목록·검증 3단계(제출 / 시트 / `_gasBuild`)는 [`docs/FOREST-FROZEN.md`](docs/FOREST-FROZEN.md) 참고. `.cursor/rules/forest-frozen.mdc` 가 동일 취지.

---

## 🚀 **로컬 개발 가이드**

### **1. 환경 설정**
```bash
# 저장소 클론
git clone https://github.com/username/webapp.git
cd webapp

# 의존성 설치
npm install
```

### **2. 데이터베이스 설정**
```bash
# 로컬 D1 데이터베이스 마이그레이션
npm run db:migrate:local

# 테스트 데이터 추가 (선택사항)
npm run db:seed
```

### **3. 개발 서버 실행**
```bash
# 빌드
npm run build

# PM2로 서비스 시작
pm2 start ecosystem.config.cjs

# 서비스 확인
curl http://localhost:3000/api/health
```

### **4. 테스트 실행**
```bash
# 자동 테스트
./test-automation.sh

# 수동 테스트
npm run test
```

---

## 📁 **프로젝트 구조**

```
webapp/
├── src/
│   ├── index.tsx              # 메인 애플리케이션
│   ├── types/
│   │   └── database.ts        # TypeScript 타입 정의
│   ├── utils/
│   │   └── error-handler.ts   # 통합 에러 처리
│   └── routes/
│       ├── auth.ts            # 인증 API
│       ├── courses.ts         # 강좌 API
│       ├── reviews.ts         # 수강평/별점 API ⭐ NEW
│       ├── certificates.ts    # 수료증 API 🎓 NEW
│       └── ...
├── public/static/js/
│   ├── learn-player.js        # 학습 플레이어 (배속 재생 포함) ⏩
│   ├── course-reviews.js      # 수강평 UI ⭐ NEW
│   ├── certificate.js         # 수료증 UI 🎓 NEW
│   └── ...
├── migrations/
│   ├── 0010_add_course_reviews.sql    # 수강평 테이블 ⭐
│   ├── 0011_add_certificates.sql      # 수료증 테이블 🎓
│   └── ...
├── docs/
│   └── API_DESIGN.md          # API 설계 문서 📝 NEW
├── test-automation.sh         # 테스트 스크립트 🧪 NEW
├── ecosystem.config.cjs       # PM2 설정
├── wrangler.jsonc            # Cloudflare 설정
└── package.json              # 의존성 관리
```

---

## 🛠️ **기술 스택**

- **Framework**: Hono (Cloudflare Workers)
- **Runtime**: Cloudflare Pages
- **Database**: Cloudflare D1 (SQLite)
- **Language**: TypeScript
- **Frontend**: TailwindCSS, Axios
- **Video**: YouTube IFrame API
- **Authentication**: JWT (Session Token)
- **Testing**: Custom Shell Scripts

---

## 📚 **API 문서**

전체 API 스펙은 `docs/API_DESIGN.md` 참조

### **주요 엔드포인트**

#### **인증 API**
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `POST /api/auth/logout` - 로그아웃
- `GET /api/auth/me` - 현재 사용자 조회

#### **강좌 API**
- `GET /api/courses` - 강좌 목록
- `GET /api/courses/:id` - 강좌 상세
- `GET /api/courses/:id/lessons` - 차시 목록

#### **수강평 API** ⭐ NEW
- `POST /api/courses/:courseId/reviews` - 수강평 작성
- `GET /api/courses/:courseId/reviews` - 수강평 목록
- `GET /api/courses/:courseId/reviews/summary` - 수강평 통계
- `PUT /api/reviews/:id` - 수강평 수정
- `DELETE /api/reviews/:id` - 수강평 삭제

#### **수료증 API** 🎓 NEW
- `POST /api/courses/:courseId/certificate` - 수료증 발급
- `GET /api/my/certificates` - 내 수료증 목록
- `GET /api/certificates/:number` - 수료증 조회

---

## 📝 **변경 이력**

### **Ver.2.0 (2026.01.04)**
- ✅ Phase 0: 프로세스 개선 (테스트 자동화, API 문서, 타입, 에러 핸들링, 주석)
- ✅ Phase 1: V1 완성 (불필요한 코드 제거, YouTube 전용 최적화)
- ✅ Phase 2: 수강평/별점 시스템 추가
- ✅ Phase 3: 배속 재생 기능 추가
- ✅ Phase 4: 수료증 발급 시스템 추가
- ✅ 모든 테스트 통과 (10/10)

### **Ver.1.x (2026.01.03)**
- 기본 LMS 기능 구현
- YouTube 영상 재생
- 진도율 추적
- 강좌 관리

---

## 📧 **연락처**

- **Email**: sanj2100@naver.com
- **Project**: 마인드스토리 원격평생교육원
- **대표**: 박종석

---

## 📄 **라이선스**

© 2026 마인드스토리 원격평생교육원. All rights reserved.
 
