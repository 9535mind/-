-- YouTube 완성 테스트 강좌: 1,000원 유료 + 1강 무료(lessons)
-- duration_days / total_lessons 는 migrations/0003_add_course_details.sql 적용 후에만 존재하므로 여기서는 건드리지 않습니다.
-- courses.is_free 는 일부 운영 DB에 없어 courses UPDATE 에서 제외합니다.

UPDATE courses
SET
  price = 1000,
  updated_at = datetime('now')
WHERE title LIKE '%YouTube 완성 테스트%';

-- 해당 강좌 차시: 전부 유료로 초기화 후, 첫 차시만 무료 미리보기
UPDATE lessons
SET
  is_free = 0,
  updated_at = datetime('now')
WHERE course_id IN (
  SELECT id
  FROM courses
  WHERE title LIKE '%YouTube 완성 테스트%'
);

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
      WHERE title LIKE '%YouTube 완성 테스트%'
    )
    GROUP BY course_id
  ) first_lesson
    ON first_lesson.course_id = l.course_id
   AND first_lesson.first_lesson_number = l.lesson_number
);
