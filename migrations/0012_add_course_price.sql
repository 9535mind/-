-- 강좌 가격 컬럼 추가
-- 2026-01-04: 강좌별 가격 정보 지원

ALTER TABLE courses ADD COLUMN price INTEGER DEFAULT 0;
-- discount_price는 migrations/0032_courses_business_fields.sql에서 추가 (sale_price·이관과 함께 정리)
ALTER TABLE courses ADD COLUMN is_free INTEGER DEFAULT 0;

-- 기존 데이터 업데이트 (예시)
UPDATE courses SET price = 100000, is_free = 0 WHERE price = 0;
