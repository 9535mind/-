/**
 * 마인드스토리 LMS 데이터베이스 타입 정의
 */

// Cloudflare Bindings
export type Bindings = {
  DB: D1Database;
  R2: R2Bucket;             // Primary R2 Storage for all files
  VIDEO_STORAGE?: R2Bucket; // For course videos (optional, legacy)
  STORAGE?: R2Bucket;       // For PDFs, certificates, documents (optional, legacy)
  APIVIDEO_API_KEY?: string; // api.video API key
  APIVIDEO_BASE_URL?: string; // api.video base URL
  GEMINI_API_KEY?: string;   // Gemini API key
  GEMINI_BASE_URL?: string;  // Gemini API base URL
  /** MindStory LMS AI 비서 (OpenAI Chat Completions) — 시크릿, 코드에 넣지 말 것 */
  OPENAI_API_KEY?: string;
  /** 기본 https://api.openai.com/v1 */
  OPENAI_BASE_URL?: string;
  /** 기본 gpt-4o */
  OPENAI_MODEL?: string;
  TOSS_SECRET_KEY?: string;  // Toss Payments secret key
  /** PortOne(구 아임포트) — https://admin.portone.io */
  PORTONE_IMP_KEY?: string;
  PORTONE_IMP_SECRET?: string;
  /** 고객사 식별코드 — 클라이언트 IMP.init()에 사용 */
  PORTONE_IMP_CODE?: string;
  /** 예: html5_inicis, kakaopay 등 (가맹점 콘솔 PG 설정과 일치) */
  PORTONE_PG?: string;
  
  // OAuth (Google)
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  
  // OAuth (Kakao)
  KAKAO_CLIENT_ID?: string;
  KAKAO_CLIENT_SECRET?: string;
  KAKAO_REDIRECT_URI?: string;

  /** 공개 사이트 URL(참고용·디버그; OAuth 콜백은 코드 상수 사용) */
  NEXT_PUBLIC_SITE_URL?: string;
  
  // JWT
  JWT_SECRET?: string;
}

// User Types
export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  phone?: string;
  phone_verified: number; // 0 or 1
  phone_verified_at?: string;
  birth_date?: string;
  role: 'student' | 'admin';
  status: 'active' | 'inactive' | 'withdrawn';
  approved?: number;
  org_id?: number | null;
  company_name?: string;
  terms_agreed: number;
  privacy_agreed: number;
  marketing_agreed: number;
  data_retention_period: number;
  last_login_at?: string;
  social_provider?: string;
  social_id?: string;
  profile_image_url?: string;
  password_reset_required?: number;
  deleted_at?: string;
  deletion_reason?: string;
  created_at: string;
  updated_at: string;
  withdrawn_at?: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  birth_date?: string;
  terms_agreed: number;
  privacy_agreed: number;
  marketing_agreed?: number;
}

// Course Types
/** 카탈로그 라인 — DB에는 CSV(예: CLASSIC,NCS,NEXT)로 저장 가능 */
export type CategoryGroup = 'CLASSIC' | 'NEXT' | 'NCS' | string
export type CourseSubtype = 'COUNSELING' | 'CAREER' | 'FAIRY_TALE' | 'TECH'

export interface Course {
  id: number;
  title: string;
  description?: string;
  thumbnail_url?: string;
  course_type: 'general' | 'certificate' | 'test';
  duration_days: number;
  total_lessons: number;
  total_duration_minutes: number;
  completion_progress_rate: number;
  completion_test_required: number;
  completion_test_pass_score?: number;
  price: number;
  sale_price?: number | null;
  discount_price?: number;
  is_free: number;
  status: 'active' | 'inactive' | 'draft' | 'published';
  certificate_id?: number | null;
  validity_unlimited?: number;
  published_at?: string;
  display_order: number;
  is_featured: number;
  /** MINDSTORY 브랜드: Classic(상담·진로 중심) / Next(AI·창작) */
  category_group?: CategoryGroup | string;
  course_subtype?: CourseSubtype | string;
  /** JSON 문자열: { "isbn_auto": true, "ai_editor": true } */
  feature_flags?: string;
  /** Next 동화 등 ISBN 자동 할당 허용 */
  isbn_enabled?: number;
  /** Classic 메인 노출 우선순위(관리자 트렌드 토글) */
  highlight_classic?: number;
  /** 다음 기수 개강일 (ISO YYYY-MM-DD), 챗봇·안내용 */
  next_cohort_start_date?: string | null;
  /** 개강·반복 일정 자유 안내 문구 (DB) */
  schedule_info?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCourseInput {
  title: string;
  description?: string;
  thumbnail_url?: string;
  course_type?: 'general' | 'certificate' | 'test';
  duration_days?: number;
  completion_progress_rate?: number;
  price: number;
  sale_price?: number | null;
  discount_price?: number;
  is_free?: number;
  certificate_id?: number | null;
  validity_unlimited?: number;
  status?: 'active' | 'inactive' | 'draft';
  is_featured?: number;
}

// Lesson Types
export interface Lesson {
  id: number;
  course_id: number;
  lesson_number: number;
  title: string;
  description?: string;
  content_type: 'video' | 'document' | 'quiz';
  video_provider?: string;
  video_id?: string;
  video_url?: string;
  video_duration_minutes?: number;
  document_url?: string;
  document_filename?: string;
  document_size_kb?: number;
  allow_download: number;
  is_free_preview: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface CreateLessonInput {
  course_id: number;
  lesson_number: number;
  title: string;
  description?: string;
  content_type: 'video' | 'document' | 'quiz';
  video_provider?: string;
  video_id?: string;
  video_url?: string;
  video_duration_minutes?: number;
  is_free_preview?: number;
}

// Enrollment Types
export interface Enrollment {
  id: number;
  user_id: number;
  course_id: number;
  status: 'active' | 'completed' | 'refunded' | 'expired';
  start_date: string;
  end_date: string;
  progress_rate: number;
  completed_lessons: number;
  total_watched_minutes: number;
  is_completed: number;
  completed_at?: string;
  test_score?: number;
  test_passed: number;
  payment_id?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateEnrollmentInput {
  user_id: number;
  course_id: number;
  start_date: string;
  end_date: string;
  payment_id?: number;
}

// Lesson Progress Types
export interface LessonProgress {
  id: number;
  enrollment_id: number;
  lesson_id: number;
  user_id: number;
  status: 'not_started' | 'in_progress' | 'completed';
  last_watched_position: number;
  total_watched_seconds: number;
  watch_percentage: number;
  is_completed: number;
  completed_at?: string;
  access_count: number;
  first_accessed_at?: string;
  last_accessed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateProgressInput {
  last_watched_position: number;
  total_watched_seconds: number;
  watch_percentage: number;
}

// Payment Types
export interface Payment {
  id: number;
  user_id: number;
  course_id: number;
  order_id: string;
  order_name: string;
  amount: number;
  discount_amount: number;
  final_amount: number;
  payment_method?: string;
  pg_provider?: string;
  pg_transaction_id?: string;
  pg_response?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  paid_at?: string;
  refunded_at?: string;
  refund_amount?: number;
  refund_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentInput {
  user_id: number;
  course_id: number;
  order_id: string;
  order_name: string;
  amount: number;
  discount_amount?: number;
  final_amount: number;
  payment_method?: string;
  pg_provider?: string;
}

// Certificate Types
export interface Certificate {
  id: number;
  user_id: number;
  course_id: number;
  enrollment_id: number;
  certificate_number: string;
  issue_date: string;
  completion_date: string;
  progress_rate: number;
  test_score?: number;
  pdf_url?: string;
  issued_by: string;
  issuer_name?: string;
  issuer_position?: string;
  reissue_count: number;
  original_certificate_id?: number;
  created_at: string;
}

export interface CreateCertificateInput {
  user_id: number;
  course_id: number;
  enrollment_id: number;
  certificate_number: string;
  issue_date: string;
  completion_date: string;
  progress_rate: number;
  test_score?: number;
}

// Certificate Eligibility Check
export interface CertificateEligibility {
  eligible: boolean;
  progress?: number;
  completed_at?: string;
  required_progress?: number;
}

// Session Types
export interface UserSession {
  id: number;
  user_id: number;
  session_token: string;
  ip_address?: string;
  user_agent?: string;
  device_type?: string;
  is_active: number;
  last_activity_at: string;
  current_course_id?: number;
  current_lesson_id?: number;
  created_at: string;
  expires_at: string;
}

// Admin Log Types
export interface AdminLog {
  id: number;
  admin_id: number;
  action_type: string;
  target_type: string;
  target_id?: number;
  changes?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Pagination Types
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Review Types (수강평/별점)
export interface Review {
  id: number;
  course_id: number;
  user_id: number;
  user_name: string;
  rating: number; // 1~5
  comment: string;
  created_at: string;
  updated_at: string;
}

export interface CreateReviewInput {
  course_id: number;
  user_id: number;
  rating: number;
  comment: string;
}

export interface UpdateReviewInput {
  rating?: number;
  comment?: string;
}

export interface ReviewSummary {
  average: number;
  total: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

// Dashboard Statistics Types
export interface DashboardStats {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  totalRevenue: number;
  activeEnrollments: number;
  completedEnrollments: number;
  recentEnrollments: Enrollment[];
  popularCourses: Course[];
}

// Error Code Types
export enum ErrorCode {
  // 인증 관련
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_INVALID = 'AUTH_INVALID',
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  
  // 권한 관련
  FORBIDDEN = 'FORBIDDEN',
  ADMIN_ONLY = 'ADMIN_ONLY',
  
  // 리소스 관련
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  
  // 유효성 검증
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // 비즈니스 로직
  ALREADY_ENROLLED = 'ALREADY_ENROLLED',
  NOT_ENROLLED = 'NOT_ENROLLED',
  CERTIFICATE_NOT_ELIGIBLE = 'CERTIFICATE_NOT_ELIGIBLE',
  REVIEW_ALREADY_EXISTS = 'REVIEW_ALREADY_EXISTS',
}

/** 출판 검수 대기열 (book_submissions) */
export interface BookSubmission {
  id: number
  user_id: number
  title: string
  author_name: string
  summary: string
  manuscript_url: string
  author_intent: string
  status: 'pending' | 'approved' | 'rejected'
  isbn_number?: string | null
  published_book_id?: number | null
  rejection_reason?: string | null
  created_at: string
  updated_at: string
}

/** 승인 후 정식 출판 스냅샷 (published_books) */
export interface PublishedBook {
  id: number
  submission_id: number
  user_id: number
  title: string
  author_name: string
  summary: string
  manuscript_url: string
  isbn_number: string
  barcode_path?: string | null
  created_at: string
}

// Extended API Response with Error Code
export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: ErrorCode;
}

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export type ApiResponseUnion<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;
