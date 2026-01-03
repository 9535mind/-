-- Lessons table (차시 관리)
CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL,
  lesson_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  video_type TEXT DEFAULT 'youtube',
  duration_minutes INTEGER DEFAULT 0,
  is_free INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);
