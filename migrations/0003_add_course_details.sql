-- 강좌 상세 정보 컬럼 추가
ALTER TABLE courses ADD COLUMN duration_days INTEGER DEFAULT 30;
ALTER TABLE courses ADD COLUMN total_lessons INTEGER DEFAULT 0;
ALTER TABLE courses ADD COLUMN total_hours REAL DEFAULT 0;

-- 기존 강좌에 실제 같은 데이터 설정
UPDATE courses SET duration_days = 30, total_lessons = 10, total_hours = 5.0 WHERE id = 1;
UPDATE courses SET duration_days = 60, total_lessons = 15, total_hours = 8.0 WHERE id = 2;
UPDATE courses SET duration_days = 7, total_lessons = 5, total_hours = 2.5 WHERE id = 3;
