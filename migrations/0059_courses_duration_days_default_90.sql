-- 신규 INSERT 시 duration_days 기본값을 90일로 통일 (앱/API 기본값과 일치)
-- SQLite 3.37+ ALTER COLUMN SET DEFAULT
ALTER TABLE courses ALTER COLUMN duration_days SET DEFAULT 90;
