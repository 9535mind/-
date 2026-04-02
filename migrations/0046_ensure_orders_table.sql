-- 운영 등 일부 D1에 0017_create_orders.sql 이 적용되지 않아 orders 가 없는 경우 대비 (IF NOT EXISTS 로 안전)
-- PortOne /api/portone/prepare · complete 가 이 테이블을 사용합니다.

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  merchant_uid TEXT NOT NULL UNIQUE,
  imp_uid TEXT,
  amount INTEGER NOT NULL,
  order_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  pg_provider TEXT DEFAULT 'portone',
  paid_at DATETIME,
  raw_response TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_course_id ON orders(course_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
