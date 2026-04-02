-- 심사용 샘플 강좌(0039): 2·3강 추가, 총 3강·30일 표시, 1강 무료 미리보기

-- [심사용] AI 동화 작가 과정 — 2강, 3강 (유료 잠금)
INSERT INTO lessons (course_id, lesson_number, title, description, video_url, is_free, created_at, updated_at)
SELECT c.id, 2, '아리와 함께하는 스토리 뼈대 만들기 (결제 전용)', NULL, NULL, 0, datetime('now'), datetime('now')
FROM courses c
WHERE c.title LIKE '[심사용] AI 동화 작가 과정%'
  AND NOT EXISTS (SELECT 1 FROM lessons l WHERE l.course_id = c.id AND l.lesson_number = 2);

INSERT INTO lessons (course_id, lesson_number, title, description, video_url, is_free, created_at, updated_at)
SELECT c.id, 3, '나만의 동화책 완성 및 발행하기', NULL, NULL, 0, datetime('now'), datetime('now')
FROM courses c
WHERE c.title LIKE '[심사용] AI 동화 작가 과정%'
  AND NOT EXISTS (SELECT 1 FROM lessons l WHERE l.course_id = c.id AND l.lesson_number = 3);

-- [심사용] 숲 체험 지도사 입문 — 2강, 3강 (유료 잠금)
INSERT INTO lessons (course_id, lesson_number, title, description, video_url, is_free, created_at, updated_at)
SELECT c.id, 2, '편백이와 숲 속 피톤치드 체험 (결제 전용)', NULL, NULL, 0, datetime('now'), datetime('now')
FROM courses c
WHERE c.title LIKE '[심사용] 숲 체험 지도사 입문%'
  AND NOT EXISTS (SELECT 1 FROM lessons l WHERE l.course_id = c.id AND l.lesson_number = 2);

INSERT INTO lessons (course_id, lesson_number, title, description, video_url, is_free, created_at, updated_at)
SELECT c.id, 3, '축령이와 함께하는 자연 생태 놀이', NULL, NULL, 0, datetime('now'), datetime('now')
FROM courses c
WHERE c.title LIKE '[심사용] 숲 체험 지도사 입문%'
  AND NOT EXISTS (SELECT 1 FROM lessons l WHERE l.course_id = c.id AND l.lesson_number = 3);

-- 이미 있던 2·3강이라도 유료로 고정
UPDATE lessons
SET
  is_free = 0,
  updated_at = datetime('now')
WHERE lesson_number IN (2, 3)
  AND course_id IN (
    SELECT id
    FROM courses
    WHERE title LIKE '[심사용] AI 동화 작가 과정%'
       OR title LIKE '[심사용] 숲 체험 지도사 입문%'
  );

-- total_lessons / duration_days 는 0003_add_course_details 적용 DB에서만 존재 → 여기서는 갱신하지 않음(스키마 없으면 실패 방지).
-- 필요 시 0003 적용 후 수동: UPDATE courses SET total_lessons=3, duration_days=30 WHERE title LIKE '[심사용]%';

UPDATE courses
SET updated_at = datetime('now')
WHERE title LIKE '[심사용] AI 동화 작가 과정%'
   OR title LIKE '[심사용] 숲 체험 지도사 입문%';

UPDATE lessons
SET
  is_free = 1,
  updated_at = datetime('now')
WHERE lesson_number = 1
  AND course_id IN (
    SELECT id
    FROM courses
    WHERE title LIKE '[심사용] AI 동화 작가 과정%'
       OR title LIKE '[심사용] 숲 체험 지도사 입문%'
  );
