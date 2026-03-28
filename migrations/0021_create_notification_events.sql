-- Migration: 0021_create_notification_events.sql
-- 목적: 결제/환불 등 알림 발송 이벤트 기록 (외부 SMS/Email 연동 전 단계)

CREATE TABLE IF NOT EXISTS notification_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  channel TEXT NOT NULL, -- 'email' | 'sms' | 'log'
  event_type TEXT NOT NULL, -- 'payment_completed' | 'refund_completed' | etc
  status TEXT NOT NULL DEFAULT 'queued', -- 'queued' | 'sent' | 'failed'
  to_address TEXT,
  subject TEXT,
  body TEXT,
  related_order_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at TEXT,
  error_message TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (related_order_id) REFERENCES orders(id)
);

CREATE INDEX IF NOT EXISTS idx_notification_events_user
  ON notification_events(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_events_type
  ON notification_events(event_type);

CREATE INDEX IF NOT EXISTS idx_notification_events_status
  ON notification_events(status);

