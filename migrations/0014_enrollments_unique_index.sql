-- 중복 수강 방지: (user_id, course_id) 유니크 제약
-- Migration: 0014_enrollments_unique_index.sql

CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollments_user_course
ON enrollments(user_id, course_id);
