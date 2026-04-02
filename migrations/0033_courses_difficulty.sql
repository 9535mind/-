-- 난이도 컬럼: mindstory-production 등 기존 DB에는 이미 존재(duplicate column 방지).
-- 신규 전체 마이그레이션은 0032_courses_business_fields.sql의 ADD COLUMN difficulty로 반영됨.
-- 이 파일은 마이그레이션 체인 상 순서 유지 및 이미 적용된 환경과의 호환을 위한 no-op.
SELECT 1 AS migration_0033_noop;
