-- 자기주도학습지도사 과정 추가
-- 생성일: 2025.12.28

-- 1. 강좌 추가
INSERT INTO courses (
  title,
  description,
  thumbnail_url,
  course_type,
  duration_days,
  total_lessons,
  total_duration_minutes,
  completion_progress_rate,
  completion_test_required,
  completion_test_pass_score,
  price,
  discount_price,
  is_free,
  status,
  published_at,
  display_order,
  is_featured,
  created_at,
  updated_at
) VALUES (
  '자기주도학습지도사 과정',
  '메타인지 기반 자기주도학습 지도 전문가 양성 과정. 학습자의 인지·정서·동기·행동을 통합적으로 접근하여 스스로 학습을 주도할 수 있도록 돕는 전문가를 양성합니다. 총 30강, 30시간 구성.',
  'https://www.genspark.ai/api/files/s/crspUXk3',
  'certificate',
  90,
  30,
  1800,
  80,
  1,
  60,
  500000,
  400000,
  0,
  'active',
  datetime('now'),
  1,
  1,
  datetime('now'),
  datetime('now')
);

-- 2. 강좌 ID 확인 (방금 추가한 강좌)
-- SELECT id FROM courses WHERE title = '자기주도학습지도사 과정';
-- 강좌 ID가 5번이라고 가정

-- 3. 샘플 차시 추가 (Module 1-6 대표 차시만)
INSERT INTO lessons (course_id, lesson_number, title, description, content_type, video_provider, video_id, video_url, video_duration_minutes, status, created_at, updated_at) VALUES
-- Module 1
(5, 1, 'Module 1-1: 메타인지란 무엇인가?', '메타인지의 개념과 자기주도학습의 핵심 원리 이해', 'video', 'r2', 'videos/self-directed-001.mp4', '/api/videos/stream/videos/self-directed-001.mp4', 35, 'active', datetime('now'), datetime('now')),
(5, 2, 'Module 1-2: 자기주도학습 시스템 구축', '효과적인 자기주도학습을 위한 시스템 설계', 'video', 'r2', 'videos/self-directed-002.mp4', '/api/videos/stream/videos/self-directed-002.mp4', 40, 'active', datetime('now'), datetime('now')),

-- Module 2
(5, 3, 'Module 2-1: 학습동기의 이해', '내재적 동기와 외재적 동기의 구분과 활용', 'video', 'r2', 'videos/self-directed-003.mp4', '/api/videos/stream/videos/self-directed-003.mp4', 30, 'active', datetime('now'), datetime('now')),
(5, 4, 'Module 2-2: 목표설정 전략', 'SMART 목표 설정과 실행 계획 수립', 'video', 'r2', 'videos/self-directed-004.mp4', '/api/videos/stream/videos/self-directed-004.mp4', 35, 'active', datetime('now'), datetime('now')),
(5, 5, 'Module 2-3: 정서 조절 기법', '학습 중 감정 관리와 스트레스 대처법', 'video', 'r2', 'videos/self-directed-005.mp4', '/api/videos/stream/videos/self-directed-005.mp4', 30, 'active', datetime('now'), datetime('now')),

-- Module 3
(5, 6, 'Module 3-1: 시간관리 원칙', '우선순위 설정과 시간 배분 전략', 'video', 'r2', 'videos/self-directed-006.mp4', '/api/videos/stream/videos/self-directed-006.mp4', 40, 'active', datetime('now'), datetime('now')),
(5, 7, 'Module 3-2: 환경 통제 기술', '효과적인 학습 환경 조성과 방해 요소 제거', 'video', 'r2', 'videos/self-directed-007.mp4', '/api/videos/stream/videos/self-directed-007.mp4', 30, 'active', datetime('now'), datetime('now')),
(5, 8, 'Module 3-3: 스터디플래너 작성법', '실전 플래너 작성과 활용 사례', 'video', 'r2', 'videos/self-directed-008.mp4', '/api/videos/stream/videos/self-directed-008.mp4', 35, 'active', datetime('now'), datetime('now')),

-- Module 4
(5, 9, 'Module 4-1: 교과서 정독법', '효과적인 교과서 읽기 전략', 'video', 'r2', 'videos/self-directed-009.mp4', '/api/videos/stream/videos/self-directed-009.mp4', 40, 'active', datetime('now'), datetime('now')),
(5, 10, 'Module 4-2: 예습-수업-복습 3단계 전략', '학습 사이클의 완성', 'video', 'r2', 'videos/self-directed-010.mp4', '/api/videos/stream/videos/self-directed-010.mp4', 35, 'active', datetime('now'), datetime('now')),

-- Module 5
(5, 11, 'Module 5-1: 기억 전략의 이해', '단기기억과 장기기억 원리', 'video', 'r2', 'videos/self-directed-011.mp4', '/api/videos/stream/videos/self-directed-011.mp4', 30, 'active', datetime('now'), datetime('now')),
(5, 12, 'Module 5-2: 노트 정리 기술', '코넬 노트법과 실전 활용', 'video', 'r2', 'videos/self-directed-012.mp4', '/api/videos/stream/videos/self-directed-012.mp4', 35, 'active', datetime('now'), datetime('now')),
(5, 13, 'Module 5-3: 마인드맵 작성법', '시각적 정리 도구 활용', 'video', 'r2', 'videos/self-directed-013.mp4', '/api/videos/stream/videos/self-directed-013.mp4', 30, 'active', datetime('now'), datetime('now')),

-- Module 6
(5, 14, 'Module 6-1: 시험 전략 수립', '효과적인 시험 준비와 실전 전략', 'video', 'r2', 'videos/self-directed-014.mp4', '/api/videos/stream/videos/self-directed-014.mp4', 40, 'active', datetime('now'), datetime('now')),
(5, 15, 'Module 6-2: 오답 분석 기법', '틀린 문제를 통한 학습 전략', 'video', 'r2', 'videos/self-directed-015.mp4', '/api/videos/stream/videos/self-directed-015.mp4', 35, 'active', datetime('now'), datetime('now')),
(5, 16, 'Module 6-3: 상담 사례 적용', '실제 상담 사례와 지도 실무', 'video', 'r2', 'videos/self-directed-016.mp4', '/api/videos/stream/videos/self-directed-016.mp4', 40, 'active', datetime('now'), datetime('now'));

-- 4. 민간자격증 연계 (자기주도학습지도사 1급/2급)
-- 이미 certification_types 테이블에 추가 필요
INSERT OR IGNORE INTO certification_types (
  name,
  code,
  category,
  description,
  requirements,
  issuer_type,
  issuer_name,
  issuer_registration_number,
  price,
  validity_period_months,
  is_active,
  display_order,
  created_at,
  updated_at
) VALUES (
  '자기주도학습지도사 1급',
  'SDL-L1',
  'education',
  '메타인지 기반 자기주도학습 지도 전문가 자격증 (1급). 평생교육협회 등록 민간자격 (제2013-2368호)',
  '{"min_completion": 80, "test_required": true, "test_pass_score": 60, "partner_org": "평생교육협회"}',
  'partner',
  '평생교육협회',
  '제2013-2368호',
  100000,
  0,
  1,
  5,
  datetime('now'),
  datetime('now')
),
(
  '자기주도학습지도사 2급',
  'SDL-L2',
  'education',
  '메타인지 기반 자기주도학습 지도 전문가 자격증 (2급). 평생교육협회 등록 민간자격 (제2013-2368호)',
  '{"min_completion": 80, "test_required": true, "test_pass_score": 60, "partner_org": "평생교육협회"}',
  'partner',
  '평생교육협회',
  '제2013-2368호',
  80000,
  0,
  1,
  6,
  datetime('now'),
  datetime('now')
);

-- 5. 자격증과 강좌 연결
-- certification_courses 테이블에 연결
-- INSERT INTO certification_courses (certification_type_id, course_id, is_required) VALUES
-- (자격증ID, 5, 1);
