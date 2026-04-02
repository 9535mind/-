-- YouTube 완성 테스트 강좌: 유료(1,000원) 고정 + 1강 무료
-- 0043보다 제목 매칭을 넓힘. duration_days/total_lessons 는 0003 미적용 DB 호환을 위해 제외.
-- courses.is_free 는 일부 운영 DB에 없어 courses UPDATE 에서 제외합니다.

UPDATE courses
SET
  price = 1000,
  updated_at = datetime('now')
WHERE title LIKE '%YouTube 완성 테스트%'
   OR replace(lower(title), ' ', '') LIKE '%youtube%완성%테스트%';

UPDATE lessons
SET
  is_free = 0,
  updated_at = datetime('now')
WHERE course_id IN (
  SELECT id
  FROM courses
  WHERE title LIKE '%YouTube 완성 테스트%'
     OR replace(lower(title), ' ', '') LIKE '%youtube%완성%테스트%'
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
         OR replace(lower(title), ' ', '') LIKE '%youtube%완성%테스트%'
    )
    GROUP BY course_id
  ) first_lesson
    ON first_lesson.course_id = l.course_id
   AND first_lesson.first_lesson_number = l.lesson_number
);
