-- ============================================
-- 마인드스토리 LMS 테스트 데이터
-- ============================================

-- 1. 관리자 계정 생성
-- 비밀번호: admin123 (SHA-256 해시)
INSERT INTO users (email, password, name, phone, role, status, terms_agreed, privacy_agreed) VALUES 
('admin@mindstory.co.kr', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', '박종석 (관리자)', '062-959-9535', 'admin', 'active', 1, 1);

-- 2. 테스트 학생 계정 (비밀번호: test123)
INSERT INTO users (email, password, name, phone, role, status, phone_verified, phone_verified_at, birth_date, terms_agreed, privacy_agreed) VALUES 
('student1@example.com', 'ecd71870d1963316a97e3ac3408c9835ad8cf0f3c1bc703527c30265534f75ae', '김민수', '01011112222', 'student', 'active', 1, CURRENT_TIMESTAMP, '1990-01-15', 1, 1),
('student2@example.com', 'ecd71870d1963316a97e3ac3408c9835ad8cf0f3c1bc703527c30265534f75ae', '이영희', '01022223333', 'student', 'active', 1, CURRENT_TIMESTAMP, '1992-05-20', 1, 1),
('student3@example.com', 'ecd71870d1963316a97e3ac3408c9835ad8cf0f3c1bc703527c30265534f75ae', '박철수', '01033334444', 'student', 'active', 0, NULL, '1988-09-10', 1, 1);

-- 3. 샘플 과정 생성
INSERT INTO courses (title, description, thumbnail_url, course_type, duration_days, total_lessons, total_duration_minutes, completion_progress_rate, price, discount_price, is_free, status, published_at, display_order, is_featured) VALUES 
(
  '마인드 타임 코칭 입문',
  '시간 관리와 심리학을 결합한 마인드 타임 코칭의 기초를 배우는 과정입니다. 효율적인 시간 활용과 목표 달성을 위한 실전 코칭 기법을 학습합니다.',
  '/static/images/course-mindtime-basic.jpg',
  'general',
  30,
  10,
  300,
  80,
  150000,
  120000,
  0,
  'active',
  CURRENT_TIMESTAMP,
  1,
  1
),
(
  '부모-자녀 대화법',
  '효과적인 부모-자녀 소통을 위한 대화 기법과 심리학적 접근법을 배웁니다. 건강한 가족 관계 형성을 위한 필수 과정입니다.',
  '/static/images/course-parent-child.jpg',
  'general',
  30,
  8,
  240,
  80,
  100000,
  80000,
  0,
  'active',
  CURRENT_TIMESTAMP,
  2,
  1
),
(
  '감정코칭 전문가 과정',
  '감정코칭의 이론과 실습을 통해 전문가 역량을 키우는 심화 과정입니다. 수료 후 감정코칭 전문가로 활동할 수 있습니다.',
  '/static/images/course-emotion-coaching.jpg',
  'certificate',
  60,
  15,
  450,
  80,
  300000,
  250000,
  0,
  'active',
  CURRENT_TIMESTAMP,
  3,
  0
),
(
  '무료 체험 과정: 마인드스토리 소개',
  '마인드스토리 교육원의 교육 철학과 주요 프로그램을 소개하는 무료 체험 과정입니다.',
  '/static/images/course-intro.jpg',
  'general',
  7,
  3,
  30,
  80,
  0,
  0,
  1,
  'active',
  CURRENT_TIMESTAMP,
  0,
  1
);

-- 4. 차시 생성 (각 과정별)

-- 과정 1: 마인드 타임 코칭 입문 (10개 차시)
INSERT INTO lessons (course_id, lesson_number, title, description, content_type, video_provider, video_id, video_duration_minutes, status, is_free_preview) VALUES 
(1, 1, '마인드 타임 코칭이란?', '마인드 타임 코칭의 개념과 필요성에 대해 이해합니다.', 'video', 'kollus', 'video_001', 30, 'active', 1),
(1, 2, '시간 인식의 심리학', '시간에 대한 심리학적 이해와 개인별 시간 인식 차이', 'video', 'kollus', 'video_002', 35, 'active', 0),
(1, 3, '목표 설정의 기술', 'SMART 목표 설정법과 실천 전략', 'video', 'kollus', 'video_003', 28, 'active', 0),
(1, 4, '시간 낭비 패턴 분석', '개인의 시간 낭비 패턴을 찾아내고 개선하기', 'video', 'kollus', 'video_004', 32, 'active', 0),
(1, 5, '우선순위 매트릭스', '아이젠하워 매트릭스를 활용한 우선순위 관리', 'video', 'kollus', 'video_005', 30, 'active', 0),
(1, 6, '집중력 향상 기법', '몰입 상태 만들기와 집중력 유지 전략', 'video', 'kollus', 'video_006', 28, 'active', 0),
(1, 7, '습관 형성의 과학', '21일 법칙과 효과적인 습관 만들기', 'video', 'kollus', 'video_007', 33, 'active', 0),
(1, 8, '에너지 관리', '시간 관리를 넘어 에너지 관리로', 'video', 'kollus', 'video_008', 29, 'active', 0),
(1, 9, '코칭 대화 기법', '타인의 시간 관리를 돕는 코칭 스킬', 'video', 'kollus', 'video_009', 31, 'active', 0),
(1, 10, '실전 적용 사례', '마인드 타임 코칭 성공 사례와 적용 방법', 'video', 'kollus', 'video_010', 34, 'active', 0);

-- 과정 2: 부모-자녀 대화법 (8개 차시)
INSERT INTO lessons (course_id, lesson_number, title, description, content_type, video_provider, video_id, video_duration_minutes, status, is_free_preview) VALUES 
(2, 1, '효과적인 대화의 시작', '부모-자녀 대화의 중요성과 기본 원칙', 'video', 'kollus', 'video_101', 28, 'active', 1),
(2, 2, '경청의 기술', '아이의 마음을 여는 적극적 경청법', 'video', 'kollus', 'video_102', 32, 'active', 0),
(2, 3, '감정 공감하기', '아이의 감정을 인정하고 공감하는 방법', 'video', 'kollus', 'video_103', 30, 'active', 0),
(2, 4, '나-전달법 활용', '비난하지 않고 의견을 전달하는 대화법', 'video', 'kollus', 'video_104', 29, 'active', 0),
(2, 5, '긍정적 피드백', '칭찬과 격려의 올바른 방법', 'video', 'kollus', 'video_105', 31, 'active', 0),
(2, 6, '갈등 해결 대화', '의견 충돌 시 건설적으로 대화하기', 'video', 'kollus', 'video_106', 33, 'active', 0),
(2, 7, '연령별 대화 전략', '아이의 발달 단계에 맞는 대화법', 'video', 'kollus', 'video_107', 35, 'active', 0),
(2, 8, '일상 속 실천', '매일 10분 대화 루틴 만들기', 'video', 'kollus', 'video_108', 27, 'active', 0);

-- 과정 3: 감정코칭 전문가 과정 (15개 차시)
INSERT INTO lessons (course_id, lesson_number, title, description, content_type, video_provider, video_id, video_duration_minutes, status, is_free_preview) VALUES 
(3, 1, '감정코칭의 이해', '감정코칭의 정의와 철학적 배경', 'video', 'kollus', 'video_201', 35, 'active', 1),
(3, 2, '감정의 심리학', '기본 감정과 복합 감정의 이해', 'video', 'kollus', 'video_202', 32, 'active', 0),
(3, 3, '감정 인식 훈련', '자신과 타인의 감정 알아차리기', 'video', 'kollus', 'video_203', 28, 'active', 0),
(3, 4, '감정 표현 방법', '건강한 감정 표현 기술', 'video', 'kollus', 'video_204', 30, 'active', 0),
(3, 5, '감정 조절 전략', '부정적 감정 다루기', 'video', 'kollus', 'video_205', 33, 'active', 0),
(3, 6, '공감 능력 키우기', '진정한 공감의 기술', 'video', 'kollus', 'video_206', 31, 'active', 0),
(3, 7, '아동 감정코칭', '어린이를 위한 감정코칭 실습', 'video', 'kollus', 'video_207', 36, 'active', 0),
(3, 8, '청소년 감정코칭', '사춘기 자녀 감정코칭', 'video', 'kollus', 'video_208', 34, 'active', 0),
(3, 9, '부부 감정코칭', '배우자와의 감정 소통', 'video', 'kollus', 'video_209', 29, 'active', 0),
(3, 10, '직장 내 감정코칭', '업무 관계에서의 감정 관리', 'video', 'kollus', 'video_210', 32, 'active', 0),
(3, 11, '위기 상황 대응', '극심한 감정 상태 코칭', 'video', 'kollus', 'video_211', 35, 'active', 0),
(3, 12, '코칭 대화 실습 1', '역할극을 통한 코칭 연습', 'video', 'kollus', 'video_212', 40, 'active', 0),
(3, 13, '코칭 대화 실습 2', '실전 케이스 스터디', 'video', 'kollus', 'video_213', 38, 'active', 0),
(3, 14, '전문가 윤리', '감정코칭 전문가의 윤리 강령', 'video', 'kollus', 'video_214', 25, 'active', 0),
(3, 15, '실무 적용 가이드', '감정코칭 전문가로서의 첫걸음', 'video', 'kollus', 'video_215', 30, 'active', 0);

-- 과정 4: 무료 체험 과정 (3개 차시)
INSERT INTO lessons (course_id, lesson_number, title, description, content_type, video_provider, video_id, video_duration_minutes, status, is_free_preview) VALUES 
(4, 1, '마인드스토리 소개', '마인드스토리 교육원의 비전과 미션', 'video', 'kollus', 'video_301', 10, 'active', 1),
(4, 2, '교육 프로그램 안내', '주요 교육 과정 소개', 'video', 'kollus', 'video_302', 10, 'active', 1),
(4, 3, '수강 방법 가이드', '플랫폼 사용법과 학습 팁', 'video', 'kollus', 'video_303', 10, 'active', 1);

-- 5. 테스트 수강 신청 및 진도
-- 학생1: 과정1 수강 중 (진도율 45%)
INSERT INTO enrollments (user_id, course_id, status, start_date, end_date, progress_rate, completed_lessons, total_watched_minutes, payment_id) VALUES 
(2, 1, 'active', datetime('now'), datetime('now', '+30 days'), 45.00, 4, 125, NULL);

-- 학생2: 과정2 수료 완료
INSERT INTO enrollments (user_id, course_id, status, start_date, end_date, progress_rate, completed_lessons, total_watched_minutes, is_completed, completed_at, payment_id) VALUES 
(3, 2, 'completed', datetime('now', '-25 days'), datetime('now', '+5 days'), 100.00, 8, 240, 1, datetime('now', '-2 days'), NULL);

-- 학생3: 무료 과정 수강 시작
INSERT INTO enrollments (user_id, course_id, status, start_date, end_date, progress_rate, completed_lessons, total_watched_minutes, payment_id) VALUES 
(4, 4, 'active', datetime('now'), datetime('now', '+7 days'), 33.33, 1, 10, NULL);

-- 6. 학습 진도 데이터
-- 학생1의 과정1 진도
INSERT INTO lesson_progress (enrollment_id, lesson_id, user_id, status, last_watched_position, total_watched_seconds, watch_percentage, is_completed, completed_at, access_count, first_accessed_at, last_accessed_at) VALUES 
(1, 1, 2, 'completed', 1800, 1800, 100.00, 1, datetime('now', '-3 days'), 2, datetime('now', '-4 days'), datetime('now', '-3 days')),
(1, 2, 2, 'completed', 2100, 2100, 100.00, 1, datetime('now', '-3 days'), 1, datetime('now', '-3 days'), datetime('now', '-3 days')),
(1, 3, 2, 'completed', 1680, 1680, 100.00, 1, datetime('now', '-2 days'), 1, datetime('now', '-2 days'), datetime('now', '-2 days')),
(1, 4, 2, 'completed', 1920, 1920, 100.00, 1, datetime('now', '-1 days'), 1, datetime('now', '-1 days'), datetime('now', '-1 days')),
(1, 5, 2, 'in_progress', 900, 900, 50.00, 0, NULL, 1, datetime('now'), datetime('now'));

-- 7. 결제 데이터
INSERT INTO payments (user_id, course_id, order_id, order_name, amount, discount_amount, final_amount, payment_method, pg_provider, status, paid_at) VALUES 
(2, 1, 'MS-20250115-0001', '마인드 타임 코칭 입문', 150000, 30000, 120000, 'card', 'tosspayments', 'completed', datetime('now', '-5 days')),
(3, 2, 'MS-20250110-0001', '부모-자녀 대화법', 100000, 20000, 80000, 'bank', 'tosspayments', 'completed', datetime('now', '-25 days'));

-- 8. 수료증 발급
INSERT INTO certificates (user_id, course_id, enrollment_id, certificate_number, issue_date, completion_date, progress_rate, issued_by, issuer_name, issuer_position) VALUES 
(3, 2, 2, 'MS-2025-0001', date('now'), date('now', '-2 days'), 100.00, '마인드스토리원격평생교육원', '김원장', '원장');

-- 9. 활성 세션 생성
INSERT INTO user_sessions (user_id, session_token, ip_address, device_type, is_active, current_course_id, current_lesson_id, expires_at) VALUES 
(2, 'session-uuid-student1-001', '192.168.1.100', 'web', 1, 1, 5, datetime('now', '+1 day'));
