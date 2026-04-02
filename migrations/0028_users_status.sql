-- B2B 승인 대기 등 계정 상태 (관리자 빠른 필터)
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';
