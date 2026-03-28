-- Migration: 0018_create_lesson_progress.sql
-- 목적: 학습 플레이어 진도 저장을 위한 lesson_progress 테이블 생성

CREATE TABLE IF NOT EXISTS lesson_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enrollment_id INTEGER NOT NULL,
  lesson_id INTEGER NOT NULL,
  watch_percentage INTEGER NOT NULL DEFAULT 0,
  last_position_seconds INTEGER NOT NULL DEFAULT 0,
  watch_time_seconds INTEGER NOT NULL DEFAULT 0,
  is_completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  last_watched_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id),
  FOREIGN KEY (lesson_id) REFERENCES lessons(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lesson_progress_enrollment_lesson
  ON lesson_progress(enrollment_id, lesson_id);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_enrollment
  ON lesson_progress(enrollment_id);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson
  ON lesson_progress(lesson_id);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_completed
  ON lesson_progress(is_completed);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_updated
  ON lesson_progress(updated_at);

CREATE TRIGGER IF NOT EXISTS trg_lesson_progress_updated_at
AFTER UPDATE ON lesson_progress
FOR EACH ROW
BEGIN
  UPDATE lesson_progress
  SET updated_at = datetime('now')
  WHERE id = NEW.id;
END;

