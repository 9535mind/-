-- MINDSTORY Classic / Next 브랜드, 디지털 도서, ISBN 재고

ALTER TABLE courses ADD COLUMN category_group TEXT NOT NULL DEFAULT 'CLASSIC';
ALTER TABLE courses ADD COLUMN course_subtype TEXT NOT NULL DEFAULT 'COUNSELING';
ALTER TABLE courses ADD COLUMN feature_flags TEXT NOT NULL DEFAULT '{}';
ALTER TABLE courses ADD COLUMN isbn_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE courses ADD COLUMN highlight_classic INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_courses_category_group ON courses(category_group);
CREATE INDEX IF NOT EXISTS idx_courses_highlight_classic ON courses(highlight_classic);

CREATE TABLE IF NOT EXISTS digital_books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  course_id INTEGER,
  isbn_number TEXT,
  title TEXT NOT NULL,
  content_json TEXT NOT NULL DEFAULT '{}',
  barcode_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE INDEX IF NOT EXISTS idx_digital_books_user ON digital_books(user_id);
CREATE INDEX IF NOT EXISTS idx_digital_books_course ON digital_books(course_id);

CREATE TABLE IF NOT EXISTS isbn_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  isbn_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'AVAILABLE',
  assigned_at DATETIME,
  book_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES digital_books(id)
);

CREATE INDEX IF NOT EXISTS idx_isbn_status ON isbn_inventory(status);
