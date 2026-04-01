-- YouTube 포함 강좌 유료화 + 1강 무료 맛보기
-- 현재 스키마 기준:
-- - courses: price, status('published')
-- - lessons: lesson_number, is_free

-- 1) YouTube 강좌 유료화
UPDATE courses
SET
  price = 1000,
  updated_at = datetime('now')
WHERE title LIKE '%YouTube%';

-- 2) 해당 강좌의 차시는 기본 유료로 초기화
UPDATE lessons
SET
  is_free = 0,
  updated_at = datetime('now')
WHERE course_id IN (
  SELECT id
  FROM courses
  WHERE title LIKE '%YouTube%'
);

-- 3) 각 강좌의 첫 번째 차시(lesson_number 최소)만 무료 맛보기로 설정
UPDATE lessons
SET
  is_free = 1,
  updated_at = datetime('now')
WHERE id IN (
  SELECT l.id
  FROM lessons l
  JOIN (
    SELECT course_id, MIN(lesson_number) AS first_lesson_number
    FROM lessons
    WHERE course_id IN (
      SELECT id
      FROM courses
      WHERE title LIKE '%YouTube%'
    )
    GROUP BY course_id
  ) first_lesson
    ON first_lesson.course_id = l.course_id
   AND first_lesson.first_lesson_number = l.lesson_number
);
