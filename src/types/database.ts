/**
 * 마인드스토리 LMS 데이터베이스 타입 정의
 */

// Cloudflare Bindings
export type Bindings = {
  DB: D1Database;
  // STORAGE: R2Bucket; // Uncomment when R2 is needed
}

// User Types
export interface User {
  id: number;
  email: string;
  password: string;
  name: string;
  phone?: string;
  phone_verified: number; // 0 or 1
  phone_verified_at?: string;
  birth_date?: string;
  role: 'student' | 'admin';
  status: 'active' | 'inactive' | 'withdrawn';
  terms_agreed: number;
  privacy_agreed: number;
  marketing_agreed: number;
  data_retention_period: number;
  last_login_at?: string;
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
  discount_price?: number;
  is_free: number;
  status: 'active' | 'inactive' | 'draft';
  published_at?: string;
  display_order: number;
  is_featured: number;
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
  discount_price?: number;
  is_free?: number;
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
