-- 오프라인 모임 안내 전용 필드 (강좌 상세에서 신청 버튼 노출 기준)
ALTER TABLE courses ADD COLUMN offline_info TEXT;
UPDATE courses
SET offline_info = schedule_info
WHERE (offline_info IS NULL OR trim(offline_info) = '')
  AND schedule_info IS NOT NULL
  AND trim(schedule_info) != '';
