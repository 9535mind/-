-- Add pricing and course details to courses table
-- Migration: 0010_add_course_pricing.sql

-- Add price column (NULL = 무료, 숫자 = 유료)
ALTER TABLE courses ADD COLUMN price INTEGER DEFAULT NULL;

-- Add total lessons count
ALTER TABLE courses ADD COLUMN total_lessons INTEGER DEFAULT 0;

-- Add total duration in minutes
ALTER TABLE courses ADD COLUMN total_duration_minutes INTEGER DEFAULT 0;

-- Add category for filtering
ALTER TABLE courses ADD COLUMN category TEXT DEFAULT NULL;

-- Add difficulty level
ALTER TABLE courses ADD COLUMN difficulty TEXT DEFAULT 'beginner'; -- beginner, intermediate, advanced

-- Add completion requirement (percentage)
ALTER TABLE courses ADD COLUMN completion_requirement INTEGER DEFAULT 80;

-- Add certificate availability
ALTER TABLE courses ADD COLUMN certificate_enabled INTEGER DEFAULT 1;

-- Add enrolled count for display
ALTER TABLE courses ADD COLUMN enrolled_count INTEGER DEFAULT 0;

-- Create index for price filtering
CREATE INDEX IF NOT EXISTS idx_courses_price ON courses(price);

-- Create index for category filtering  
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);

-- Create index for status
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
