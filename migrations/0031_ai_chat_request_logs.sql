-- AI 비서 응답 성공/실패 로그 (관제탑 시스템 대시보드 KPI용)
CREATE TABLE IF NOT EXISTS ai_chat_request_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  success INTEGER NOT NULL DEFAULT 1,
  source TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_logs_created ON ai_chat_request_logs(created_at);
