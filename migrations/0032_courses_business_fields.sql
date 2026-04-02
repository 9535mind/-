-- 강좌 실무 필드 보강
-- 참고: thumbnail_url, price는 기존 스키마/마이그레이션에 이미 존재
-- discount_price는 반드시 아래 UPDATE·인덱스보다 먼저 추가 (0012에서는 제거됨)

ALTER TABLE courses ADD COLUMN discount_price INTEGER DEFAULT NULL;
ALTER TABLE courses ADD COLUMN sale_price INTEGER;
ALTER TABLE courses ADD COLUMN certificate_id INTEGER;
ALTER TABLE courses ADD COLUMN validity_unlimited INTEGER NOT NULL DEFAULT 0;
ALTER TABLE courses ADD COLUMN difficulty TEXT DEFAULT 'beginner';

-- 기존 discount_price 값이 있으면 sale_price로 1회 이관
UPDATE courses
SET sale_price = discount_price
WHERE sale_price IS NULL
  AND discount_price IS NOT NULL;
