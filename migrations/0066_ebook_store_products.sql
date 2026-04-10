-- 전자책(e-book) 스토어 상품 메타데이터 (ISBN·표지·가격 등)
-- 결제·뷰어 연동은 별도 단계에서 orders / R2 키와 연결합니다.

CREATE TABLE IF NOT EXISTS ebook_store_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT '',
  isbn TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  cover_image_url TEXT,
  description TEXT,
  pdf_object_key TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ebook_store_products_status ON ebook_store_products(status);
CREATE INDEX IF NOT EXISTS idx_ebook_store_products_updated ON ebook_store_products(updated_at);
