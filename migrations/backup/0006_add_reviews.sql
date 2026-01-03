-- 강좌 리뷰 테이블
CREATE TABLE IF NOT EXISTS course_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  enrollment_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_visible INTEGER DEFAULT 1, -- 1: 공개, 0: 비공개
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
  UNIQUE(user_id, course_id) -- 한 사용자가 한 강좌에 하나의 리뷰만
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_course_reviews_course_id ON course_reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_course_reviews_user_id ON course_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_course_reviews_rating ON course_reviews(rating);
