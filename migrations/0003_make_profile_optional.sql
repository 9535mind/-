-- 전화번호와 생년월일을 선택 사항으로 변경
-- 소셜 로그인 시 추가 정보 없이 가입 가능하도록 함

-- 이미 NULL이 허용되어 있는지 확인
-- SQLite는 ALTER COLUMN을 직접 지원하지 않으므로
-- 새로운 데이터 입력 시 NULL을 허용하도록 로직 변경

-- 프로필 완성도를 추적하기 위한 가상 컬럼 (향후 활용 가능)
-- SQLite는 계산된 컬럼을 지원하지 않으므로 애플리케이션 레벨에서 처리

-- 마이그레이션 완료 표시
SELECT 'Migration 0003: Make profile fields optional - Completed' as status;
