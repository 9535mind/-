-- Migration: 0020_create_security_events.sql
-- 목적: 클라이언트 보안 이벤트(개발자도구/탭전환/캡처 시도 등) 서버 기록

CREATE TABLE IF NOT EXISTS security_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  event_type TEXT NOT NULL,
  path TEXT,
  user_agent TEXT,
  ip TEXT,
  details_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_security_events_user
  ON security_events(user_id);

CREATE INDEX IF NOT EXISTS idx_security_events_type
  ON security_events(event_type);

CREATE INDEX IF NOT EXISTS idx_security_events_created
  ON security_events(created_at);

