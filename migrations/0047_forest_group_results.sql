-- 유아숲 4군자 집단 특성(기관·반 단위, 개인 실명 미저장)
CREATE TABLE IF NOT EXISTS forest_group_results (
  id TEXT PRIMARY KEY NOT NULL,
  institution_name TEXT NOT NULL,
  group_name TEXT NOT NULL DEFAULT '',
  test_type TEXT NOT NULL DEFAULT '',
  scores TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_forest_group_institution ON forest_group_results (institution_name);
CREATE INDEX IF NOT EXISTS idx_forest_group_created ON forest_group_results (created_at);
CREATE INDEX IF NOT EXISTS idx_forest_group_test_type ON forest_group_results (test_type);
