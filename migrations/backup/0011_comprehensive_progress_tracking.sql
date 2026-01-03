-- Comprehensive Progress Tracking System
-- Migration: 0011_comprehensive_progress_tracking.sql
-- Date: 2026-01-01
-- Purpose: Add both course-level and lesson-level progress tracking

-- ============================================
-- Part 1: Extend enrollments table
-- ============================================

-- Add course-level progress tracking columns
ALTER TABLE enrollments ADD COLUMN total_lessons INTEGER DEFAULT 0;
ALTER TABLE enrollments ADD COLUMN completed_lessons INTEGER DEFAULT 0;
ALTER TABLE enrollments ADD COLUMN last_lesson_id INTEGER DEFAULT NULL;
ALTER TABLE enrollments ADD COLUMN last_watched_at DATETIME DEFAULT NULL;
ALTER TABLE enrollments ADD COLUMN total_watch_time_seconds INTEGER DEFAULT 0;
ALTER TABLE enrollments ADD COLUMN completion_rate INTEGER DEFAULT 0;
ALTER TABLE enrollments ADD COLUMN certificate_issued INTEGER DEFAULT 0;
ALTER TABLE enrollments ADD COLUMN certificate_issued_at DATETIME DEFAULT NULL;

-- Create indexes for enrollments
CREATE INDEX IF NOT EXISTS idx_enrollments_progress ON enrollments(progress);
CREATE INDEX IF NOT EXISTS idx_enrollments_completion ON enrollments(completion_rate);
CREATE INDEX IF NOT EXISTS idx_enrollments_last_watched ON enrollments(last_watched_at);
CREATE INDEX IF NOT EXISTS idx_enrollments_certificate ON enrollments(certificate_issued);

-- ============================================
-- Part 2: Create lesson_progress table
-- ============================================

-- Detailed lesson-level progress tracking
CREATE TABLE IF NOT EXISTS lesson_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enrollment_id INTEGER NOT NULL,
  lesson_id INTEGER NOT NULL,
  
  -- Progress metrics
  watch_percentage INTEGER DEFAULT 0,
  last_position_seconds INTEGER DEFAULT 0,
  watch_time_seconds INTEGER DEFAULT 0,
  
  -- Completion status
  is_completed INTEGER DEFAULT 0,
  completed_at DATETIME DEFAULT NULL,
  
  -- Timestamps
  first_watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one record per enrollment-lesson combination
  UNIQUE(enrollment_id, lesson_id)
);

-- Create indexes for lesson_progress
CREATE INDEX IF NOT EXISTS idx_lesson_progress_enrollment ON lesson_progress(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_completed ON lesson_progress(is_completed);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_updated ON lesson_progress(updated_at);

-- ============================================
-- Part 3: Create triggers for auto-update
-- ============================================

-- Trigger: Update enrollments when lesson_progress changes
CREATE TRIGGER IF NOT EXISTS update_enrollment_progress_on_lesson_complete
AFTER UPDATE OF is_completed ON lesson_progress
WHEN NEW.is_completed = 1 AND OLD.is_completed = 0
BEGIN
  -- Update completed_lessons count
  UPDATE enrollments
  SET 
    completed_lessons = (
      SELECT COUNT(*)
      FROM lesson_progress
      WHERE enrollment_id = NEW.enrollment_id
        AND is_completed = 1
    ),
    last_lesson_id = NEW.lesson_id,
    last_watched_at = CURRENT_TIMESTAMP,
    completion_rate = (
      SELECT CAST(COUNT(CASE WHEN is_completed = 1 THEN 1 END) AS REAL) * 100 / COUNT(*)
      FROM lesson_progress
      WHERE enrollment_id = NEW.enrollment_id
    ),
    progress = (
      SELECT CAST(COUNT(CASE WHEN is_completed = 1 THEN 1 END) AS REAL) * 100 / COUNT(*)
      FROM lesson_progress
      WHERE enrollment_id = NEW.enrollment_id
    ),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.enrollment_id;
END;

-- Trigger: Update last_watched_at when watch progress changes
CREATE TRIGGER IF NOT EXISTS update_enrollment_last_watched
AFTER UPDATE OF last_position_seconds ON lesson_progress
BEGIN
  UPDATE enrollments
  SET 
    last_watched_at = CURRENT_TIMESTAMP,
    last_lesson_id = NEW.lesson_id,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.enrollment_id;
END;

-- Trigger: Auto-update lesson_progress.updated_at
CREATE TRIGGER IF NOT EXISTS update_lesson_progress_timestamp
AFTER UPDATE ON lesson_progress
FOR EACH ROW
BEGIN
  UPDATE lesson_progress
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
END;
