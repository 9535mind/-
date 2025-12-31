-- Lessons table (차시 관리)
CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL,
  lesson_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  video_type TEXT DEFAULT 'youtube',
  duration_minutes INTEGER DEFAULT 0,
  is_free INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- Lesson progress table (학습 진도)
CREATE TABLE IF NOT EXISTS lesson_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enrollment_id INTEGER NOT NULL,
  lesson_id INTEGER NOT NULL,
  status TEXT DEFAULT 'not_started',
  watch_percentage INTEGER DEFAULT 0,
  last_watched_at DATETIME,
  is_completed INTEGER DEFAULT 0,
  completed_at DATETIME,
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id),
  FOREIGN KEY (lesson_id) REFERENCES lessons(id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_enrollment ON lesson_progress(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON lesson_progress(lesson_id);

-- 기존 테스트 강좌 삭제
DELETE FROM enrollments WHERE course_id IN (1, 2);
DELETE FROM courses WHERE id IN (1, 2);

-- 실제 샘플 강좌 데이터 추가 (instructor_id를 NULL로 설정)
INSERT INTO courses (id, title, description, instructor_id, thumbnail_url, status, created_at, updated_at) VALUES
(1, '마인드 타임 코칭 입문', '시간 관리의 기초부터 실전까지, 마인드 타임 코칭 방법론을 배웁니다. 자신의 시간을 효율적으로 관리하고 목표를 달성하는 방법을 익힙니다.', NULL, 'https://via.placeholder.com/400x300/667eea/ffffff?text=마인드타임코칭', 'published', datetime('now'), datetime('now')),
(2, '심리학 기초와 응용', '일상에서 활용할 수 있는 실용 심리학을 배웁니다. 자기 이해, 대인관계, 의사소통 등 다양한 주제를 다룹니다.', NULL, 'https://via.placeholder.com/400x300/764ba2/ffffff?text=심리학기초', 'published', datetime('now'), datetime('now')),
(3, '효율적인 학습 전략', '과학적으로 검증된 학습 방법과 기억력 향상 기법을 배웁니다. 효과적인 공부 방법으로 학습 효율을 극대화합니다.', NULL, 'https://via.placeholder.com/400x300/f093fb/ffffff?text=학습전략', 'published', datetime('now'), datetime('now')),
(4, '목표 설정과 달성', '명확한 목표 설정 방법과 실천 전략을 배웁니다. SMART 목표 설정법과 습관 형성 기법을 익혀 목표를 달성합니다.', NULL, 'https://via.placeholder.com/400x300/4facfe/ffffff?text=목표달성', 'published', datetime('now'), datetime('now')),
(5, '스트레스 관리와 회복탄력성', '스트레스를 효과적으로 관리하고 어려움을 극복하는 회복탄력성을 키웁니다. 마음의 건강을 지키는 실천 방법을 배웁니다.', NULL, 'https://via.placeholder.com/400x300/00f2fe/ffffff?text=스트레스관리', 'published', datetime('now'), datetime('now')),
(6, '리더십과 팀워크', '효과적인 리더십 스킬과 팀워크 향상 방법을 배웁니다. 조직에서 영향력을 발휘하고 협업하는 능력을 키웁니다.', NULL, 'https://via.placeholder.com/400x300/43e97b/ffffff?text=리더십', 'published', datetime('now'), datetime('now'));

-- 강좌별 차시(Lessons) 추가

-- 과정 1: 마인드 타임 코칭 입문
INSERT INTO lessons (course_id, lesson_number, title, description, video_url, video_type, duration_minutes, is_free) VALUES
(1, 1, '마인드 타임 코칭 소개', '마인드 타임 코칭의 개념과 중요성을 이해합니다', 'dQw4w9WgXcQ', 'youtube', 15, 1),
(1, 2, '시간 인식의 중요성', '자신의 시간 사용 패턴을 파악하는 방법', 'dQw4w9WgXcQ', 'youtube', 20, 0),
(1, 3, '우선순위 설정 기법', '중요한 일과 긴급한 일을 구분하는 방법', 'dQw4w9WgXcQ', 'youtube', 25, 0),
(1, 4, '시간 계획 수립하기', '효과적인 일일/주간 계획 세우기', 'dQw4w9WgXcQ', 'youtube', 30, 0),
(1, 5, '실천과 점검', '계획을 실천하고 점검하는 방법', 'dQw4w9WgXcQ', 'youtube', 20, 0);

-- 과정 2: 심리학 기초와 응용
INSERT INTO lessons (course_id, lesson_number, title, description, video_url, video_type, duration_minutes, is_free) VALUES
(2, 1, '심리학이란 무엇인가', '심리학의 기본 개념과 역사', 'dQw4w9WgXcQ', 'youtube', 18, 1),
(2, 2, '인간의 인지과정', '지각, 기억, 사고의 메커니즘', 'dQw4w9WgXcQ', 'youtube', 22, 0),
(2, 3, '감정과 동기', '감정의 종류와 동기 부여', 'dQw4w9WgXcQ', 'youtube', 25, 0),
(2, 4, '성격 심리학', '성격의 형성과 유형', 'dQw4w9WgXcQ', 'youtube', 28, 0),
(2, 5, '사회 심리학', '대인관계와 집단 심리', 'dQw4w9WgXcQ', 'youtube', 24, 0),
(2, 6, '발달 심리학', '인간의 전 생애 발달 과정', 'dQw4w9WgXcQ', 'youtube', 26, 0);

-- 과정 3: 효율적인 학습 전략
INSERT INTO lessons (course_id, lesson_number, title, description, video_url, video_type, duration_minutes, is_free) VALUES
(3, 1, '학습의 과학', '뇌과학이 밝혀낸 효과적인 학습 방법', 'dQw4w9WgXcQ', 'youtube', 20, 1),
(3, 2, '집중력 향상 기법', '집중력을 높이는 환경과 습관', 'dQw4w9WgXcQ', 'youtube', 22, 0),
(3, 3, '기억력 강화 전략', '장기 기억 형성을 위한 방법', 'dQw4w9WgXcQ', 'youtube', 25, 0),
(3, 4, '노트 필기 기술', '효과적인 노트 정리 방법', 'dQw4w9WgXcQ', 'youtube', 18, 0),
(3, 5, '복습과 시험 전략', '효율적인 복습과 시험 대비', 'dQw4w9WgXcQ', 'youtube', 23, 0);

-- 과정 4: 목표 설정과 달성
INSERT INTO lessons (course_id, lesson_number, title, description, video_url, video_type, duration_minutes, is_free) VALUES
(4, 1, '목표의 힘', '명확한 목표가 주는 영향', 'dQw4w9WgXcQ', 'youtube', 16, 1),
(4, 2, 'SMART 목표 설정법', '구체적이고 측정 가능한 목표 만들기', 'dQw4w9WgXcQ', 'youtube', 24, 0),
(4, 3, '실행 계획 수립', '목표를 달성하기 위한 구체적 계획', 'dQw4w9WgXcQ', 'youtube', 26, 0),
(4, 4, '습관 형성의 비밀', '좋은 습관을 만드는 과학적 방법', 'dQw4w9WgXcQ', 'youtube', 28, 0),
(4, 5, '장애물 극복하기', '목표 달성 과정의 어려움 대처', 'dQw4w9WgXcQ', 'youtube', 22, 0);

-- 과정 5: 스트레스 관리와 회복탄력성
INSERT INTO lessons (course_id, lesson_number, title, description, video_url, video_type, duration_minutes, is_free) VALUES
(5, 1, '스트레스의 이해', '스트레스의 원인과 영향', 'dQw4w9WgXcQ', 'youtube', 19, 1),
(5, 2, '스트레스 대처 전략', '건강한 스트레스 관리 방법', 'dQw4w9WgXcQ', 'youtube', 23, 0),
(5, 3, '마음챙김과 명상', '현재에 집중하는 마음챙김 훈련', 'dQw4w9WgXcQ', 'youtube', 25, 0),
(5, 4, '회복탄력성 키우기', '어려움을 극복하는 힘 기르기', 'dQw4w9WgXcQ', 'youtube', 27, 0),
(5, 5, '긍정 심리학 실천', '행복과 웰빙 증진 방법', 'dQw4w9WgXcQ', 'youtube', 21, 0);

-- 과정 6: 리더십과 팀워크
INSERT INTO lessons (course_id, lesson_number, title, description, video_url, video_type, duration_minutes, is_free) VALUES
(6, 1, '리더십의 본질', '효과적인 리더의 특징', 'dQw4w9WgXcQ', 'youtube', 20, 1),
(6, 2, '커뮤니케이션 스킬', '명확하고 설득력 있는 의사소통', 'dQw4w9WgXcQ', 'youtube', 24, 0),
(6, 3, '팀 빌딩 전략', '강한 팀을 만드는 방법', 'dQw4w9WgXcQ', 'youtube', 26, 0),
(6, 4, '갈등 관리', '팀 내 갈등을 건설적으로 해결하기', 'dQw4w9WgXcQ', 'youtube', 28, 0),
(6, 5, '동기부여와 코칭', '팀원의 잠재력을 이끌어내기', 'dQw4w9WgXcQ', 'youtube', 25, 0),
(6, 6, '변화 관리', '조직의 변화를 이끄는 리더십', 'dQw4w9WgXcQ', 'youtube', 23, 0);

-- demo@test.com 사용자의 수강 신청 업데이트 (기존 데이터 유지)
UPDATE enrollments SET course_id = 1 WHERE id = 1 AND user_id = 7;
UPDATE enrollments SET course_id = 2 WHERE id = 2 AND user_id = 7;
