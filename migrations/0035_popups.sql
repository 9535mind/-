-- 팝업 공지 (관제탑 CRUD + 사이트 노출)
-- 기존 popups가 예전 스키마면 CREATE TABLE IF NOT EXISTS는 아무것도 안 하므로,
-- target_audience / org_id는 반드시 ALTER로 보강한 뒤 인덱스를 만든다.

CREATE TABLE IF NOT EXISTS popups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT,
  image_url TEXT,
  link_url TEXT,
  link_text TEXT,
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  display_type TEXT NOT NULL DEFAULT 'modal',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE popups ADD COLUMN target_audience TEXT NOT NULL DEFAULT 'all';
ALTER TABLE popups ADD COLUMN org_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_popups_active ON popups(is_active);
CREATE INDEX IF NOT EXISTS idx_popups_dates ON popups(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_popups_priority ON popups(priority);
CREATE INDEX IF NOT EXISTS idx_popups_target_org ON popups(target_audience, org_id);
