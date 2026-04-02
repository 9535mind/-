-- 커뮤니티 게시글 + 공지·게시 시드 (마인드스토리 실전 데이터)
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT,
  author TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  is_published INTEGER NOT NULL DEFAULT 1,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_posts_category_created ON posts(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(is_published);

-- 공지 (필독이 목록 상단에 오도록 시험 일정을 먼저 삽입)
INSERT INTO notices (title, content, is_pinned, is_published, view_count, target_org_id, created_at, updated_at)
SELECT
  '[자격증] AI 동화 작가 지도사 2급 시험 일정',
  '오는 2026년 5월 25일, 온라인 자격 시험이 시행됩니다. 진도율 80% 이상을 완료한 수강생은 사전에 시험 신청을 완료해 주세요.',
  1,
  1,
  0,
  NULL,
  datetime('now', '-2 days'),
  datetime('now', '-2 days')
WHERE NOT EXISTS (SELECT 1 FROM notices WHERE title = '[자격증] AI 동화 작가 지도사 2급 시험 일정');

INSERT INTO notices (title, content, is_pinned, is_published, view_count, target_org_id, created_at, updated_at)
SELECT
  '[필독] 마인드스토리 LMS 정식 오픈 안내',
  '2026년 4월, 지식과 감성이 만나는 마인드스토리의 문이 열립니다. 마인드스토리 학습관리시스템(LMS)이 정식 가동되며, AI 동화 작가 과정 및 숲 체험 프로그램 예약 방법을 공지사항과 이용 가이드에서 안내드립니다. 전체 수강생은 반드시 확인해 주시기 바랍니다.',
  1,
  1,
  0,
  NULL,
  datetime('now', '-1 days'),
  datetime('now', '-1 days')
WHERE NOT EXISTS (SELECT 1 FROM notices WHERE title = '[필독] 마인드스토리 LMS 정식 오픈 안내');

INSERT INTO posts (title, content, author, category, is_published, view_count, created_at, updated_at)
SELECT
  '[후기] 숲 캐릭터 ''편백이'' 수업 후기',
  '아이들의 반응이 폭발적입니다. AI 캐릭터의 힘을 느꼈네요.',
  '김지혜',
  'review',
  1,
  0,
  datetime('now', '-12 hours'),
  datetime('now', '-12 hours')
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = '[후기] 숲 캐릭터 ''편백이'' 수업 후기');

INSERT INTO posts (title, content, author, category, is_published, view_count, created_at, updated_at)
SELECT
  '[질문] ISBN 발행 시 AI 명시 의무',
  '아이들 동화책 판권지 구성법이 궁금합니다.',
  '이현우',
  'qna',
  1,
  0,
  datetime('now', '-6 hours'),
  datetime('now', '-6 hours')
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = '[질문] ISBN 발행 시 AI 명시 의무');
