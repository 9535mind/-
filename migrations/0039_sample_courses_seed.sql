-- 결제 심사용 샘플 강좌 (재실행 시 중복 삽입 방지)
-- 주의: courses 스키마는 is_published 대신 status='published'를 사용합니다.

INSERT OR IGNORE INTO courses (
  id,
  title,
  description,
  price,
  status,
  created_at,
  updated_at
) VALUES (
  900001,
  '[심사용] AI 동화 작가 과정 - 아리와 함께하는 창의력 교실',
  '인공지능을 활용하여 나만의 동화책을 만들고 ISBN 발행까지 경험하는 실전 코스입니다.',
  1000,
  'published',
  datetime('now'),
  datetime('now')
);

INSERT OR IGNORE INTO courses (
  id,
  title,
  description,
  price,
  status,
  created_at,
  updated_at
) VALUES (
  900002,
  '[심사용] 숲 체험 지도사 입문 - 편백이의 비밀 숲 여행',
  '아이들에게 자연의 소중함을 전하는 숲 체험 프로그램 설계 및 운영 노하우를 배웁니다.',
  1000,
  'published',
  datetime('now'),
  datetime('now')
);
