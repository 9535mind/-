-- Migration: 0019_create_phone_verification_codes.sql
-- 목적: 회원가입(전화번호) 인증코드 발송/검증을 위한 저장 테이블

CREATE TABLE IF NOT EXISTS phone_verification_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'register',
  is_verified INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  verified_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_phone_verification_phone
  ON phone_verification_codes(phone);

CREATE INDEX IF NOT EXISTS idx_phone_verification_expires
  ON phone_verification_codes(expires_at);

