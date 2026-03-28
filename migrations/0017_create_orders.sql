-- PortOne 등 PG 주문 기록 (강의 구매)
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
