-- 출판 승인 대기열 · ISBN 자동 할당 · 정식 출판 레코드
-- 기존 isbn_inventory: isbn_number, status(AVAILABLE|USED), book_id(digital_books), assigned_at
-- book_submissions: 수강생 제출 원고 (검수 파이프라인)
-- published_books: 승인 완료 + ISBN 부여 후 스냅샷

CREATE TABLE IF NOT EXISTS book_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  author_name TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  manuscript_url TEXT NOT NULL DEFAULT '',
  author_intent TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  isbn_number TEXT,
  published_book_id INTEGER,
  rejection_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_book_submissions_status ON book_submissions(status);
CREATE INDEX IF NOT EXISTS idx_book_submissions_user ON book_submissions(user_id);

CREATE TABLE IF NOT EXISTS published_books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  author_name TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  manuscript_url TEXT NOT NULL DEFAULT '',
  isbn_number TEXT NOT NULL,
  barcode_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES book_submissions(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_published_books_user ON published_books(user_id);
CREATE INDEX IF NOT EXISTS idx_published_books_isbn ON published_books(isbn_number);

-- isbn_inventory: digital_books 외 출판 파이프라인 제출과 연결
ALTER TABLE isbn_inventory ADD COLUMN submission_id INTEGER;
