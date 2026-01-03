-- ============================================
-- 민간자격 시스템 마이그레이션 (Fixed)
-- ============================================

-- 1. 민간자격 종류 테이블
CREATE TABLE IF NOT EXISTS certification_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  requirements TEXT,
  issuer_type TEXT DEFAULT 'direct',
  issuer_name TEXT NOT NULL DEFAULT '(주)마인드스토리',
  issuer_registration_number TEXT,
  certificate_template TEXT,
  price INTEGER DEFAULT 0,
  validity_period_months INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. 민간자격 - 강좌 연결 테이블
CREATE TABLE IF NOT EXISTS certification_courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  certification_type_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  is_required INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (certification_type_id) REFERENCES certification_types(id),
  FOREIGN KEY (course_id) REFERENCES courses(id),
  UNIQUE(certification_type_id, course_id)
);

-- 3. 민간자격 신청 테이블
CREATE TABLE IF NOT EXISTS certification_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  certification_type_id INTEGER NOT NULL,
  application_number TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending',
  application_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  applicant_name TEXT NOT NULL,
  applicant_phone TEXT NOT NULL,
  applicant_email TEXT NOT NULL,
  applicant_birth_date TEXT,
  applicant_address TEXT,
  reviewer_id INTEGER,
  review_date DATETIME,
  review_notes TEXT,
  rejection_reason TEXT,
  issue_date DATETIME,
  certificate_number TEXT UNIQUE,
  certificate_pdf_url TEXT,
  expiry_date DATETIME,
  payment_id INTEGER,
  payment_status TEXT DEFAULT 'unpaid',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (certification_type_id) REFERENCES certification_types(id),
  FOREIGN KEY (reviewer_id) REFERENCES users(id),
  FOREIGN KEY (payment_id) REFERENCES payments(id)
);

-- 4. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_cert_types_active ON certification_types(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_cert_courses_type ON certification_courses(certification_type_id);
CREATE INDEX IF NOT EXISTS idx_cert_courses_course ON certification_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_cert_apps_user ON certification_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_cert_apps_type ON certification_applications(certification_type_id);
CREATE INDEX IF NOT EXISTS idx_cert_apps_status ON certification_applications(status);
