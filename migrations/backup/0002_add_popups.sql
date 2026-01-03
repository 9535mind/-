-- ============================================
-- 팝업 공지사항 테이블 추가
-- ============================================

CREATE TABLE IF NOT EXISTS popups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 기본 정보
  title TEXT NOT NULL, -- 팝업 제목
  content TEXT, -- 팝업 내용 (HTML 지원)
  image_url TEXT, -- 팝업 이미지 URL
  
  -- 링크 설정
  link_url TEXT, -- 클릭 시 이동할 URL
  link_text TEXT, -- 링크 버튼 텍스트
  
  -- 표시 기간
  start_date DATETIME NOT NULL, -- 시작 일시
  end_date DATETIME NOT NULL, -- 종료 일시
  
  -- 우선순위 (낮을수록 먼저 표시)
  priority INTEGER DEFAULT 0,
  
  -- 표시 형식 (modal: 모달, banner: 배너, slide: 슬라이드)
  display_type TEXT DEFAULT 'modal',
  
  -- 활성화 여부
  is_active INTEGER DEFAULT 1,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_popups_active ON popups(is_active);
CREATE INDEX IF NOT EXISTS idx_popups_dates ON popups(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_popups_priority ON popups(priority);

-- 샘플 팝업 데이터
INSERT INTO popups (title, content, image_url, link_url, link_text, priority, start_date, end_date, is_active) VALUES 
(
  '🎉 신규 강좌 오픈!',
  '<div class="text-center"><h3 class="text-2xl font-bold mb-4 text-indigo-600">마인드 타임 코칭 입문</h3><p class="text-gray-700 mb-4">시간 관리와 심리학을 결합한 특별한 강좌가 오픈되었습니다!</p><p class="text-lg font-semibold text-green-600">특별 할인가: 120,000원</p></div>',
  'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=500',
  '/courses/1',
  '자세히 보기',
  1,
  datetime('now', '-1 day'),
  datetime('now', '+30 days'),
  1
),
(
  '📢 수강생 모집 안내',
  '<div class="text-center"><h3 class="text-2xl font-bold mb-4 text-purple-600">2025년 1월 정기 과정</h3><p class="text-gray-700 mb-4">부모-자녀 대화법과 감정코칭 전문가 과정 수강생을 모집합니다.</p><p class="text-sm text-gray-500">조기 마감될 수 있으니 서둘러 신청하세요!</p></div>',
  'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=500',
  '/#courses',
  '수강 신청하기',
  2,
  datetime('now', '-1 day'),
  datetime('now', '+30 days'),
  1
);
