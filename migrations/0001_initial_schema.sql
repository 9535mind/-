-- ============================================
-- 마인드스토리 원격평생교육원 데이터베이스 스키마
-- Ver.1.3 - MVP (필수 구현 기능)
-- ============================================

-- 1. 회원 테이블
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, -- 해시 처리된 비밀번호
  name TEXT NOT NULL,
  phone TEXT, -- 휴대폰 번호
  phone_verified INTEGER DEFAULT 0, -- 본인인증 여부 (0: 미인증, 1: 인증)
  phone_verified_at DATETIME, -- 본인인증 일시
  birth_date TEXT, -- 생년월일 (YYYY-MM-DD)
  role TEXT DEFAULT 'student', -- 권한: student, admin
  status TEXT DEFAULT 'active', -- 상태: active, inactive, withdrawn
  terms_agreed INTEGER DEFAULT 0, -- 이용약관 동의
  privacy_agreed INTEGER DEFAULT 0, -- 개인정보처리방침 동의
  marketing_agreed INTEGER DEFAULT 0, -- 마케팅 수신 동의
  data_retention_period INTEGER DEFAULT 3, -- 개인정보 유효기간 (년)
  last_login_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  withdrawn_at DATETIME -- 탈퇴 일시
);

-- 2. 과정 테이블 (강좌 정보)
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL, -- 과정명
  description TEXT, -- 과정 설명
  thumbnail_url TEXT, -- 썸네일 이미지 URL
  
  -- 과정 유형 (Ver.1.5 확장 대비)
  course_type TEXT DEFAULT 'general', -- general: 일반과정, certificate: 자격과정, test: 검사과정
  
  -- 수강 정보
  duration_days INTEGER DEFAULT 30, -- 수강 기간 (일)
  total_lessons INTEGER DEFAULT 0, -- 총 차시 수
  total_duration_minutes INTEGER DEFAULT 0, -- 총 학습 시간 (분)
  
  -- 수료 조건
  completion_progress_rate INTEGER DEFAULT 80, -- 수료 진도율 (기본 80%)
  -- Ver.1.5 확장 필드 (구조만 선반영)
  completion_test_required INTEGER DEFAULT 0, -- 시험 필수 여부
  completion_test_pass_score INTEGER, -- 시험 합격 점수
  
  -- 가격 정보
  price INTEGER DEFAULT 0, -- 수강료
  discount_price INTEGER, -- 할인가
  is_free INTEGER DEFAULT 0, -- 무료 여부
  
  -- 공개 상태
  status TEXT DEFAULT 'active', -- active: 공개, inactive: 비공개, draft: 임시저장
  published_at DATETIME, -- 공개 일시
  
  -- 정렬 및 추천
  display_order INTEGER DEFAULT 0, -- 표시 순서
  is_featured INTEGER DEFAULT 0, -- 추천 강좌 여부
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. 차시 테이블 (강의 콘텐츠)
CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL, -- 소속 과정
  lesson_number INTEGER NOT NULL, -- 차시 번호 (1, 2, 3...)
  title TEXT NOT NULL, -- 차시 제목
  description TEXT, -- 차시 설명
  
  -- 콘텐츠 정보
  content_type TEXT DEFAULT 'video', -- video: 영상, document: 문서, quiz: 퀴즈
  
  -- 영상 정보 (전문 호스팅 연동)
  video_provider TEXT, -- kollus, videocloud 등
  video_id TEXT, -- 전문 호스팅 영상 ID
  video_url TEXT, -- 전문 호스팅 영상 URL
  video_duration_minutes INTEGER, -- 영상 길이 (분)
  
  -- 문서 정보
  document_url TEXT, -- PDF/HWP/PPT 파일 URL (R2 저장)
  document_filename TEXT, -- 원본 파일명
  document_size_kb INTEGER, -- 파일 크기 (KB)
  allow_download INTEGER DEFAULT 0, -- 다운로드 허용 여부
  
  -- 공개 설정
  is_free_preview INTEGER DEFAULT 0, -- 무료 미리보기 여부
  status TEXT DEFAULT 'active', -- active: 공개, inactive: 비공개
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 4. 수강 신청 테이블 (Enrollment)
CREATE TABLE IF NOT EXISTS enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  
  -- 수강 상태
  status TEXT DEFAULT 'active', -- active: 수강중, completed: 수료, refunded: 환불, expired: 기간만료
  
  -- 수강 기간
  start_date DATETIME NOT NULL, -- 수강 시작일
  end_date DATETIME NOT NULL, -- 수강 종료일
  
  -- 진도율
  progress_rate DECIMAL(5,2) DEFAULT 0.00, -- 전체 진도율 (0.00 ~ 100.00)
  completed_lessons INTEGER DEFAULT 0, -- 완료한 차시 수
  total_watched_minutes INTEGER DEFAULT 0, -- 총 시청 시간 (분)
  
  -- 수료 정보
  is_completed INTEGER DEFAULT 0, -- 수료 여부
  completed_at DATETIME, -- 수료 일시
  
  -- Ver.1.5 확장 필드 (구조만 선반영)
  test_score INTEGER, -- 시험 점수
  test_passed INTEGER DEFAULT 0, -- 시험 합격 여부
  
  -- 결제 정보 연결
  payment_id INTEGER, -- 결제 테이블 참조
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (payment_id) REFERENCES payments(id),
  
  UNIQUE(user_id, course_id) -- 한 사용자는 같은 과정을 중복 수강 불가
);

-- 5. 학습 진도 테이블 (Lesson Progress)
CREATE TABLE IF NOT EXISTS lesson_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enrollment_id INTEGER NOT NULL,
  lesson_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL, -- 중복이지만 조회 성능을 위해 추가
  
  -- 진도 상태
  status TEXT DEFAULT 'not_started', -- not_started: 미시작, in_progress: 학습중, completed: 완료
  
  -- 시청 정보
  last_watched_position INTEGER DEFAULT 0, -- 마지막 시청 위치 (초)
  total_watched_seconds INTEGER DEFAULT 0, -- 총 시청 시간 (초)
  watch_percentage DECIMAL(5,2) DEFAULT 0.00, -- 시청 비율 (0.00 ~ 100.00)
  
  -- 완료 정보
  is_completed INTEGER DEFAULT 0, -- 완료 여부 (80% 이상 시청)
  completed_at DATETIME, -- 완료 일시
  
  -- 접속 정보
  access_count INTEGER DEFAULT 0, -- 접속 횟수
  first_accessed_at DATETIME, -- 최초 접속 일시
  last_accessed_at DATETIME, -- 마지막 접속 일시
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  UNIQUE(enrollment_id, lesson_id) -- 하나의 수강신청에서 같은 차시는 하나의 진도만
);

-- 6. 결제 테이블
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  
  -- 주문 정보
  order_id TEXT UNIQUE NOT NULL, -- 주문번호 (MS-20250101-0001)
  order_name TEXT NOT NULL, -- 주문명
  
  -- 결제 금액
  amount INTEGER NOT NULL, -- 결제 금액
  discount_amount INTEGER DEFAULT 0, -- 할인 금액
  final_amount INTEGER NOT NULL, -- 최종 결제 금액
  
  -- 결제 수단
  payment_method TEXT, -- card: 카드, bank: 계좌이체, vbank: 가상계좌, phone: 휴대폰
  
  -- PG 연동 정보 (API 연동 준비)
  pg_provider TEXT, -- tosspayments, inicis, kcp 등
  pg_transaction_id TEXT, -- PG사 거래 ID
  pg_response TEXT, -- PG사 응답 JSON (전체)
  
  -- 결제 상태
  status TEXT DEFAULT 'pending', -- pending: 대기, completed: 완료, failed: 실패, cancelled: 취소, refunded: 환불
  
  -- 결제/환불 일시
  paid_at DATETIME, -- 결제 완료 일시
  refunded_at DATETIME, -- 환불 일시
  refund_amount INTEGER, -- 환불 금액
  refund_reason TEXT, -- 환불 사유
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- 7. 수료증 테이블
CREATE TABLE IF NOT EXISTS certificates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  enrollment_id INTEGER NOT NULL,
  
  -- 수료증 정보
  certificate_number TEXT UNIQUE NOT NULL, -- 수료증 번호 (MS-2025-0001)
  issue_date DATE NOT NULL, -- 발급일
  
  -- 수료 정보
  completion_date DATE NOT NULL, -- 수료일
  progress_rate DECIMAL(5,2) NOT NULL, -- 수료 시점 진도율
  
  -- Ver.1.5 확장 필드
  test_score INTEGER, -- 시험 점수 (있는 경우)
  
  -- 수료증 파일
  pdf_url TEXT, -- PDF 수료증 파일 URL (R2 저장)
  
  -- 발급 정보
  issued_by TEXT DEFAULT '마인드스토리원격평생교육원', -- 발급 기관
  issuer_name TEXT, -- 발급자 성명
  issuer_position TEXT, -- 발급자 직위
  
  -- 재발급 관리
  reissue_count INTEGER DEFAULT 0, -- 재발급 횟수
  original_certificate_id INTEGER, -- 원본 수료증 ID (재발급인 경우)
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id),
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id),
  FOREIGN KEY (original_certificate_id) REFERENCES certificates(id)
);

-- 8. 동시 접속 제어 테이블 (세션 관리)
CREATE TABLE IF NOT EXISTS user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_token TEXT UNIQUE NOT NULL, -- 세션 토큰 (UUID)
  
  -- 접속 정보
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT, -- web, mobile, tablet
  
  -- 세션 상태
  is_active INTEGER DEFAULT 1, -- 활성 세션 여부
  last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- 학습 중인 콘텐츠
  current_course_id INTEGER,
  current_lesson_id INTEGER,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL, -- 세션 만료 시간
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 9. 관리자 활동 로그 (감사 추적)
CREATE TABLE IF NOT EXISTS admin_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL, -- 관리자 user_id
  action_type TEXT NOT NULL, -- create, update, delete, refund 등
  target_type TEXT NOT NULL, -- user, course, enrollment, payment 등
  target_id INTEGER, -- 대상 ID
  
  -- 변경 내용
  changes TEXT, -- JSON 형식으로 변경 사항 기록
  
  -- 접속 정보
  ip_address TEXT,
  user_agent TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (admin_id) REFERENCES users(id)
);

-- ============================================
-- 인덱스 생성 (성능 최적화)
-- ============================================

-- 회원 관련
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- 과정 관련
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_course_type ON courses(course_type);
CREATE INDEX IF NOT EXISTS idx_courses_display_order ON courses(display_order);

-- 차시 관련
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_lesson_number ON lessons(course_id, lesson_number);

-- 수강 신청 관련
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_dates ON enrollments(start_date, end_date);

-- 학습 진도 관련
CREATE INDEX IF NOT EXISTS idx_lesson_progress_enrollment_id ON lesson_progress(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_id ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id ON lesson_progress(lesson_id);

-- 결제 관련
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- 수료증 관련
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_certificate_number ON certificates(certificate_number);

-- 세션 관련
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(is_active, expires_at);
