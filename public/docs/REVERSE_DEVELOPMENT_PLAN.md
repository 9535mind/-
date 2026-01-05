# 📘 마인드스토리 LMS 개발 계획서 (역기획)

**작성 일시**: 2025-12-29  
**프로젝트 버전**: Ver.2.4.0  
**작성 목적**: 이미 개발된 시스템을 기반으로 향후 재사용 및 유지보수를 위한 개발 계획서  
**대상 독자**: 개발자, 프로젝트 관리자, 유지보수 담당자

---

## 📋 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [기술 스택](#기술-스택)
3. [시스템 아키텍처](#시스템-아키텍처)
4. [데이터베이스 설계](#데이터베이스-설계)
5. [API 설계](#api-설계)
6. [기능 명세](#기능-명세)
7. [개발 단계별 계획](#개발-단계별-계획)
8. [배포 전략](#배포-전략)
9. [유지보수 계획](#유지보수-계획)

---

## 프로젝트 개요

### 프로젝트 정보
- **프로젝트명**: 마인드스토리 원격평생교육원 LMS
- **프로젝트 코드명**: webapp
- **프로젝트 타입**: 온라인 학습 관리 시스템 (LMS)
- **개발 환경**: Cloudflare Workers/Pages (Edge Computing)
- **프로그래밍 언어**: TypeScript
- **데이터베이스**: Cloudflare D1 (SQLite)

### 프로젝트 목표
1. **대표 1인 운영 가능한 LMS**
   - 관리자 대시보드로 모든 기능 제어
   - 자동화된 수강/결제/수료 프로세스
   - 최소한의 수동 작업

2. **확장 가능한 구조**
   - 심리검사/상담/자격 과정 확장 대비
   - 모듈화된 코드 구조
   - API 기반 아키텍처

3. **운영 안정성 우선**
   - 초기 법적 리스크 제거
   - 검증된 기술만 사용
   - 프로덕션급 보안

---

## 기술 스택

### Frontend
```yaml
UI Framework: Hono (SSR)
CSS Framework: Tailwind CSS (CDN)
Icons: Font Awesome 6.4.0
HTTP Client: Axios 1.6.0
Utils: Lodash, Day.js
```

### Backend
```yaml
Framework: Hono 4.0.0
Runtime: Cloudflare Workers
Language: TypeScript 5.0.0
Build Tool: Vite 5.0.0
```

### Database
```yaml
Database: Cloudflare D1 (SQLite)
ORM: None (Raw SQL)
Migration: Wrangler D1 Migrations
```

### DevOps
```yaml
Deployment: Cloudflare Pages
CI/CD: Git + Wrangler
Process Manager: PM2 (로컬 개발용)
Version Control: Git
```

### External Services (연동 대기)
```yaml
Payment: Toss Payments (테스트 키 설정됨)
SMS: Pass/NICE (구조 준비됨)
Video: Cloudflare R2 (구조 준비됨)
Email: SendGrid/Resend (미구현)
```

---

## 시스템 아키텍처

### 전체 구조도
```
┌─────────────────────────────────────────┐
│           Cloudflare Edge               │
├─────────────────────────────────────────┤
│  Cloudflare Pages (정적 배포)           │
│  ├─ Frontend (SSR + CDN 라이브러리)     │
│  └─ Cloudflare Workers (백엔드 API)     │
├─────────────────────────────────────────┤
│  Cloudflare D1 (SQLite Database)        │
│  ├─ users (회원)                        │
│  ├─ courses (강좌)                      │
│  ├─ lessons (차시)                      │
│  ├─ enrollments (수강)                  │
│  ├─ payments (결제)                     │
│  ├─ certificates (수료증)                │
│  ├─ user_sessions (세션)                │
│  └─ popups (팝업)                       │
├─────────────────────────────────────────┤
│  External APIs                          │
│  ├─ Toss Payments (결제)                │
│  ├─ Google OAuth (소셜 로그인)          │
│  ├─ Kakao OAuth (소셜 로그인)           │
│  └─ Pass/NICE (본인인증, 연동 대기)    │
└─────────────────────────────────────────┘
```

### 디렉토리 구조
```
webapp/
├── src/
│   ├── index.tsx              # 메인 진입점
│   ├── routes/                # API & 페이지 라우트
│   │   ├── auth.ts           # 인증 API
│   │   ├── auth-google.ts    # Google OAuth
│   │   ├── auth-kakao.ts     # Kakao OAuth
│   │   ├── courses.ts        # 강좌 API
│   │   ├── enrollments.ts    # 수강 API
│   │   ├── payments.ts       # 결제 API
│   │   ├── payments-v2.ts    # Toss Payments
│   │   ├── certificates.ts   # 수료증 API
│   │   ├── admin.ts          # 관리자 API
│   │   ├── pages.ts          # 프론트 페이지
│   │   ├── pages-my.ts       # 내 강의실
│   │   └── pages-admin.ts    # 관리자 페이지
│   ├── middleware/            # 미들웨어
│   │   └── auth.ts           # 인증 미들웨어
│   ├── types/                 # TypeScript 타입
│   │   └── database.ts       # DB 타입 정의
│   └── utils/                 # 유틸리티
│       ├── helpers.ts        # 공통 함수
│       └── toss-payments.ts  # 결제 유틸
├── public/                    # 정적 파일
│   └── static/
│       ├── js/               # JavaScript
│       │   ├── auth.js       # 인증 공통
│       │   ├── utils.js      # 유틸리티
│       │   ├── admin-dashboard.js
│       │   └── admin-courses.js
│       └── styles.css        # 커스텀 CSS
├── migrations/                # DB 마이그레이션
│   ├── 0001_initial_schema.sql
│   ├── 0002_add_popups.sql
│   ├── 0003_add_certifications.sql
│   ├── 0004_add_social_login.sql
│   └── 0005_add_user_deletion.sql
├── docs/                      # 문서
│   ├── README.md
│   ├── COMPREHENSIVE_SYSTEM_AUDIT.md
│   ├── DEVELOPMENT_SUMMARY.json
│   └── TODAY_DEVELOPMENT.md
├── wrangler.jsonc             # Cloudflare 설정
├── vite.config.ts             # Vite 설정
├── package.json               # 의존성
├── tsconfig.json              # TypeScript 설정
└── ecosystem.config.cjs       # PM2 설정 (개발용)
```

---

## 데이터베이스 설계

### ERD (Entity Relationship Diagram)
```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   users     │───┬───│ enrollments │───────│   courses   │
└─────────────┘   │   └─────────────┘       └─────────────┘
                  │            │                     │
                  │            │                     │
                  │   ┌─────────────┐       ┌─────────────┐
                  ├───│  payments   │       │   lessons   │
                  │   └─────────────┘       └─────────────┘
                  │            │
                  │   ┌─────────────┐
                  └───│ certificates│
                      └─────────────┘
```

### 주요 테이블

#### 1. users (회원)
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT NOT NULL,
  phone TEXT,
  birth_date DATE,
  role TEXT DEFAULT 'student', -- 'student' | 'admin'
  status TEXT DEFAULT 'active', -- 'active' | 'inactive' | 'withdrawn'
  social_provider TEXT, -- 'google' | 'kakao'
  social_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  deletion_reason TEXT
);
```

#### 2. courses (강좌)
```sql
CREATE TABLE courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  course_type TEXT DEFAULT 'general', -- 'general' | 'certificate'
  duration_days INTEGER DEFAULT 30,
  price INTEGER DEFAULT 0,
  discount_price INTEGER,
  is_free INTEGER DEFAULT 0,
  is_featured INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active' | 'inactive' | 'draft'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. lessons (차시)
```sql
CREATE TABLE lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  content_type TEXT DEFAULT 'video', -- 'video' | 'text' | 'quiz'
  video_provider TEXT, -- 'cloudflare_r2' | 'youtube' | 'vimeo'
  video_id TEXT,
  video_url TEXT,
  video_duration_minutes INTEGER,
  is_free_preview INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id)
);
```

#### 4. enrollments (수강신청)
```sql
CREATE TABLE enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  status TEXT DEFAULT 'active', -- 'active' | 'completed' | 'expired'
  start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  end_date DATETIME,
  progress_rate INTEGER DEFAULT 0,
  completed_lessons INTEGER DEFAULT 0,
  is_completed INTEGER DEFAULT 0,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (course_id) REFERENCES courses(id)
);
```

#### 5. payments (결제)
```sql
CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  enrollment_id INTEGER,
  order_id TEXT UNIQUE NOT NULL,
  payment_key TEXT,
  amount INTEGER NOT NULL,
  final_amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending' | 'completed' | 'failed' | 'refunded'
  payment_method TEXT,
  approved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (course_id) REFERENCES courses(id)
);
```

#### 6. certificates (수료증)
```sql
CREATE TABLE certificates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  enrollment_id INTEGER NOT NULL,
  certificate_number TEXT UNIQUE NOT NULL,
  issue_date DATE NOT NULL,
  status TEXT DEFAULT 'active', -- 'active' | 'revoked'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (course_id) REFERENCES courses(id),
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id)
);
```

---

## API 설계

### 인증 API (`/api/auth`)
| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| POST | /register | 회원가입 | ❌ |
| POST | /login | 로그인 | ❌ |
| POST | /logout | 로그아웃 | ✅ |
| GET | /me | 내 정보 조회 | ✅ |
| PUT | /profile | 프로필 수정 | ✅ |
| POST | /change-password | 비밀번호 변경 | ✅ |
| POST | /withdrawal | 회원 탈퇴 | ✅ |

### 소셜 로그인 API
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /api/auth/google/login | Google 로그인 시작 |
| GET | /api/auth/google/callback | Google 콜백 |
| GET | /api/auth/kakao/login | 카카오 로그인 시작 |
| GET | /api/auth/kakao/callback | 카카오 콜백 |

### 강좌 API (`/api/courses`)
| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | / | 강좌 목록 | ❌ |
| GET | /featured | 추천 강좌 | ❌ |
| GET | /:id | 강좌 상세 | ❌ |
| GET | /:id/lessons | 차시 목록 | 선택 |

### 수강 API (`/api/enrollments`)
| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | /my | 내 수강 목록 | ✅ |
| POST | / | 수강 신청 | ✅ |
| POST | /:id/progress | 진도 저장 | ✅ |
| POST | /:id/complete | 수강 완료 | ✅ |

### 결제 API (`/api/payments`)
| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | /my | 내 결제 내역 | ✅ |
| POST | / | 결제 생성 | ✅ |
| POST | /confirm | 결제 승인 | ✅ |
| POST | /:id/refund | 환불 | 관리자 |

### 수료증 API (`/api/certificates`)
| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | /my | 내 수료증 목록 | ✅ |
| POST | / | 수료증 발급 | ✅ |
| GET | /:id | 수료증 조회 | ✅ |

### 관리자 API (`/api/admin`)
| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | /dashboard | 대시보드 통계 | 관리자 |
| GET | /users | 회원 목록 | 관리자 |
| GET | /enrollments | 수강 목록 | 관리자 |
| GET | /payments | 결제 목록 | 관리자 |
| GET | /courses | 강좌 목록 | 관리자 |
| POST | /courses | 강좌 생성 | 관리자 |
| PUT | /courses/:id | 강좌 수정 | 관리자 |
| DELETE | /courses/:id | 강좌 삭제 | 관리자 |

---

## 기능 명세

### 1단계: 인증 시스템 (완료 ✅)

#### 1.1 회원가입
**기능 설명**: 이메일 또는 소셜 로그인으로 회원가입
**구현 파일**: `src/routes/auth.ts`, `src/routes/pages.ts`

**입력 항목**:
- 이메일 (필수, 중복 체크)
- 비밀번호 (필수, 6자 이상, 영문+숫자)
- 이름 (필수)
- 전화번호 (선택)
- 생년월일 (선택)

**처리 흐름**:
1. 입력 검증
2. 이메일 중복 체크
3. 비밀번호 해시 (bcrypt)
4. DB 저장
5. 자동 로그인 (세션 토큰 발급)

**소스 코드 예시**:
```typescript
// src/routes/auth.ts
auth.post('/register', async (c) => {
  const { email, password, name, phone, birth_date } = await c.req.json()
  
  // 검증
  if (!email || !password || !name) {
    return c.json(errorResponse('필수 항목을 입력해주세요'), 400)
  }
  
  // 중복 체크
  const existing = await DB.prepare(
    `SELECT id FROM users WHERE email = ?`
  ).bind(email).first()
  
  if (existing) {
    return c.json(errorResponse('이미 가입된 이메일입니다'), 400)
  }
  
  // 비밀번호 해시
  const hashedPassword = await bcrypt.hash(password, 10)
  
  // DB 저장
  const result = await DB.prepare(`
    INSERT INTO users (email, password_hash, name, phone, birth_date)
    VALUES (?, ?, ?, ?, ?)
  `).bind(email, hashedPassword, name, phone, birth_date).run()
  
  return c.json(successResponse({ id: result.meta.last_row_id }))
})
```

#### 1.2 로그인
**기능 설명**: 이메일/비밀번호 또는 소셜 로그인
**구현 파일**: `src/routes/auth.ts`

**처리 흐름**:
1. 이메일로 사용자 조회
2. 비밀번호 검증
3. 세션 토큰 생성 (UUID)
4. user_sessions 테이블에 저장
5. 토큰 반환

#### 1.3 로그아웃
**기능 설명**: 세션 토큰 무효화
**구현 파일**: `src/routes/auth.ts`

#### 1.4 프로필 수정
**기능 설명**: 이름, 전화번호 수정
**구현 파일**: `src/routes/auth.ts`

#### 1.5 비밀번호 변경
**기능 설명**: 현재 비밀번호 확인 후 새 비밀번호 설정
**구현 파일**: `src/routes/auth.ts`

#### 1.6 회원 탈퇴
**기능 설명**: 소프트 삭제 (30일 보관)
**구현 파일**: `src/routes/auth.ts`

**처리 흐름**:
1. 수강/결제 진행 중 확인
2. 진행 중이면 차단
3. deleted_at 업데이트
4. deletion_reason 저장
5. 세션 무효화

---

### 2단계: 강좌 시스템 (완료 ✅)

#### 2.1 강좌 목록
**기능 설명**: 공개 강좌 목록 조회
**구현 파일**: `src/routes/courses.ts`

**필터링**:
- 상태: 활성/비활성
- 유형: 무료/유료
- 추천: 메인 노출 여부

#### 2.2 강좌 상세
**기능 설명**: 강좌 정보 + 차시 목록
**구현 파일**: `src/routes/courses.ts`

**응답 데이터**:
```json
{
  "course": {
    "id": 1,
    "title": "마인드 타임 코칭 입문",
    "description": "...",
    "price": 150000,
    "discount_price": 120000,
    "is_free": 0
  },
  "lessons": [
    {
      "id": 1,
      "title": "마인드 타임 코칭이란?",
      "order_index": 1,
      "video_duration_minutes": 30,
      "is_free_preview": 1
    }
  ]
}
```

#### 2.3 차시 관리
**기능 설명**: 관리자가 차시 생성/수정/삭제
**구현 파일**: `src/routes/courses.ts`

---

### 3단계: 수강 시스템 (완료 ✅)

#### 3.1 수강 신청
**기능 설명**: 무료 즉시, 유료 결제 후 수강
**구현 파일**: `src/routes/enrollments.ts`

**처리 흐름**:
1. 중복 신청 체크
2. 무료 강좌: 즉시 수강 생성
3. 유료 강좌: 결제 후 수강 생성
4. 수강 기간 자동 설정 (duration_days)

#### 3.2 내 강의실
**기능 설명**: 수강 목록 + 진도율
**구현 파일**: `src/routes/enrollments.ts`, `src/routes/pages-my.ts`

**표시 정보**:
- 강좌명
- 진도율 (%)
- 수강 기간 (남은 일수)
- 수료 여부

#### 3.3 진도율 추적
**기능 설명**: 차시별 학습 진도 저장
**구현 파일**: `src/routes/enrollments.ts`

**진도 계산**:
```typescript
progress_rate = (completed_lessons / total_lessons) * 100
```

#### 3.4 수료 처리
**기능 설명**: 80% 이상 시 자동 수료
**구현 파일**: `src/routes/enrollments.ts`

---

### 4단계: 결제 시스템 (95% 완료 ✅)

#### 4.1 결제 생성
**기능 설명**: Toss Payments 결제 요청
**구현 파일**: `src/routes/payments-v2.ts`

**처리 흐름**:
1. 강좌 정보 조회
2. orderId 생성 (UUID)
3. DB에 결제 정보 저장 (status: pending)
4. Toss Payments 결제창 리디렉트

#### 4.2 결제 승인
**기능 설명**: Toss Payments 결제 승인 API 호출
**구현 파일**: `src/routes/payments-v2.ts`

**처리 흐름**:
1. paymentKey, orderId, amount 검증
2. Toss API 호출
3. 승인 성공 시 DB 업데이트 (status: completed)
4. 수강 신청 자동 생성

#### 4.3 환불 처리
**기능 설명**: 진도율 기반 환불 금액 계산
**구현 파일**: `src/routes/payments.ts`

**환불 규정**:
```typescript
if (progress_rate === 0 && days_since_enrollment <= 7) {
  refund_amount = 100% // 전액 환불
} else if (progress_rate < 50) {
  refund_amount = 50% // 50% 환불
} else {
  refund_amount = 0% // 환불 불가
}
```

---

### 5단계: 수료증 시스템 (완료 ✅)

#### 5.1 수료증 발급
**기능 설명**: 수료 조건 충족 시 자동 발급
**구현 파일**: `src/routes/certificates.ts`

**수료 조건**:
- 진도율 80% 이상
- 수강 기간 내

**수료증 번호 생성**:
```typescript
certificate_number = `MS-${year}-${String(sequence).padStart(4, '0')}`
// 예: MS-2025-0001
```

#### 5.2 수료증 조회
**기능 설명**: 내 수료증 목록 + PDF 다운로드
**구현 파일**: `src/routes/certificates.ts`

---

### 6단계: 관리자 시스템 (완료 ✅)

#### 6.1 대시보드
**기능 설명**: 실시간 통계
**구현 파일**: `src/routes/admin.ts`, `src/routes/pages-admin.ts`

**통계 항목**:
- 총 회원 수
- 총 강좌 수
- 활성 수강 수
- 총 매출
- 최근 수강 신청
- 인기 강좌 순위

#### 6.2 회원 관리
**기능 설명**: 회원 목록 + 검색
**구현 파일**: `src/routes/admin.ts`, `src/routes/pages-admin.ts`

**기능**:
- 검색 (이름/이메일)
- 권한 필터 (관리자/학생)
- 상태 필터 (활성/비활성)

#### 6.3 강좌 관리 (NEW!)
**기능 설명**: 강좌 CRUD + 차시 관리
**구현 파일**: `src/routes/admin.ts`, `src/routes/pages-admin.ts`

**기능**:
- 강좌 생성/수정/삭제
- 썸네일 URL 입력
- 가격 설정
- 무료/유료 전환
- 메인 노출 설정
- 수강생 수 표시

#### 6.4 결제 관리
**기능 설명**: 결제 내역 + 환불 처리
**구현 파일**: `src/routes/admin.ts`, `src/routes/pages-admin.ts`

#### 6.5 수강 관리
**기능 설명**: 수강 목록 + 진도율 확인
**구현 파일**: `src/routes/admin.ts`, `src/routes/pages-admin.ts`

---

## 개발 단계별 계획

### Phase 1: 기본 기능 (완료 ✅)
**기간**: 1-2주  
**목표**: MVP (최소 기능 프로덕트)

- [x] 프로젝트 초기 설정
- [x] 데이터베이스 설계
- [x] 회원가입/로그인
- [x] 강좌 목록/상세
- [x] 수강 신청 (무료)

### Phase 2: 결제 연동 (완료 ✅)
**기간**: 1주  
**목표**: 유료 강좌 판매

- [x] Toss Payments 연동
- [x] 결제 API 구현
- [x] 환불 규정 적용

### Phase 3: 학습 시스템 (구조 완료 ✅, 영상 미구현 ⚠️)
**기간**: 2-3주  
**목표**: 온라인 학습 기능

- [x] 차시 시스템
- [ ] 영상 업로드 (Cloudflare R2)
- [ ] 영상 재생 플레이어
- [x] 진도율 추적 (구조)
- [x] 수료 처리

### Phase 4: 관리자 기능 (완료 ✅)
**기간**: 1-2주  
**목표**: 운영 자동화

- [x] 대시보드 통계
- [x] 회원 관리
- [x] 결제 관리
- [x] 수강 관리
- [x] 강좌 관리 (NEW!)

### Phase 5: 소셜 로그인 (완료 ✅)
**기간**: 1주  
**목표**: 회원가입 장벽 낮추기

- [x] Google OAuth 2.0
- [x] Kakao OAuth 2.0
- [x] 점진적 프로파일링

### Phase 6: 회원 관리 (완료 ✅)
**기간**: 1주  
**목표**: 사용자 편의성

- [x] 프로필 수정
- [x] 비밀번호 변경
- [x] 회원 탈퇴

### Phase 7: UX 개선 (완료 ✅)
**기간**: 2-3일  
**목표**: 사용성 향상

- [x] 관리자/수강생 모드 전환
- [x] 반응형 디자인
- [x] 토스트 알림

---

## 배포 전략

### 로컬 개발 환경
```bash
# 프로젝트 클론
git clone https://github.com/username/webapp.git
cd webapp

# 의존성 설치
npm install

# 데이터베이스 마이그레이션
npx wrangler d1 migrations apply mindstory-production --local

# 테스트 데이터 삽입
npx wrangler d1 execute mindstory-production --local --file=./seed.sql

# 개발 서버 시작 (PM2)
npm run build
pm2 start ecosystem.config.cjs

# 접속
http://localhost:3000
```

### 프로덕션 배포
```bash
# 1. Cloudflare 계정 설정
wrangler login

# 2. D1 데이터베이스 생성
wrangler d1 create mindstory-production

# 3. wrangler.jsonc에 database_id 추가

# 4. 마이그레이션 실행
wrangler d1 migrations apply mindstory-production

# 5. 빌드
npm run build

# 6. Cloudflare Pages 프로젝트 생성
wrangler pages project create mindstory-lms \
  --production-branch main \
  --compatibility-date 2024-01-01

# 7. 배포
wrangler pages deploy dist --project-name mindstory-lms

# 8. 환경 변수 설정
wrangler pages secret put TOSS_SECRET_KEY --project-name mindstory-lms
wrangler pages secret put GOOGLE_CLIENT_SECRET --project-name mindstory-lms
wrangler pages secret put KAKAO_CLIENT_SECRET --project-name mindstory-lms
```

---

## 유지보수 계획

### 일일 점검 (Daily)
- [ ] 서버 상태 모니터링
- [ ] 오류 로그 확인
- [ ] 신규 회원가입/결제 확인

### 주간 점검 (Weekly)
- [ ] 데이터베이스 백업
- [ ] 결제 내역 정산
- [ ] 사용자 피드백 확인

### 월간 점검 (Monthly)
- [ ] 성능 최적화
- [ ] 보안 패치 적용
- [ ] 통계 리포트 작성

### 분기별 점검 (Quarterly)
- [ ] 주요 기능 업데이트
- [ ] 데이터베이스 최적화
- [ ] 법적 요구사항 검토

---

## 확장 계획

### 단기 (1-3개월)
- [ ] 영상 시스템 완성
- [ ] 본인인증 연동
- [ ] 이메일 발송
- [ ] 후기 시스템

### 중기 (3-6개월)
- [ ] 모바일 앱
- [ ] 심리검사 기능
- [ ] 온라인 상담 예약
- [ ] 커뮤니티 게시판

### 장기 (6-12개월)
- [ ] AI 챗봇 상담
- [ ] 라이브 강의
- [ ] 다국어 지원
- [ ] 해외 결제 지원

---

## 📞 기술 지원

**문의**: AI 개발 어시스턴트 (GenSpark)  
**작성 완료**: 2025-12-29  
**다음 업데이트 예정**: 주요 기능 추가 시

---

© 2025 마인드스토리 원격평생교육원. All rights reserved.
