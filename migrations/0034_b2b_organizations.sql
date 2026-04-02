-- B2B 기관 연동용 기본 스키마
CREATE TABLE IF NOT EXISTS organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  business_number TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_name_unique ON organizations(name);

ALTER TABLE users ADD COLUMN org_id INTEGER;
ALTER TABLE users ADD COLUMN approved INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_users_approved ON users(approved);
