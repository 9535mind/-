# 📘 LMS API 설계 문서

## 목차
1. [개요](#개요)
2. [인증 시스템](#인증-시스템)
3. [강좌 관리 API](#강좌-관리-api)
4. [차시 관리 API](#차시-관리-api)
5. [수강 관리 API](#수강-관리-api)
6. [수강평/별점 API](#수강평별점-api)
7. [수료증 API](#수료증-api)
8. [에러 응답 규격](#에러-응답-규격)
9. [데이터 타입 정의](#데이터-타입-정의)

---

## 개요

### 기본 정보
- **Base URL**: `https://mindstory-lms.pages.dev`
- **API Version**: `v1`
- **인증 방식**: HTTP-only Cookie (JWT)
- **응답 형식**: JSON

### 공통 응답 구조

#### ✅ 성공 응답
```json
{
  "success": true,
  "data": {
    // 실제 데이터
  },
  "message": "성공 메시지" // 선택적
}
```

#### ❌ 에러 응답
```json
{
  "success": false,
  "error": "에러 메시지",
  "code": "ERROR_CODE" // 선택적
}
```

---

## 인증 시스템

### 1. 회원가입
**POST** `/api/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "홍길동"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "홍길동",
      "role": "student"
    }
  }
}
```

**Errors:**
- `400`: 잘못된 요청 (필수 필드 누락)
- `409`: 이메일 중복

---

### 2. 로그인
**POST** `/api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "홍길동",
      "role": "student"
    }
  }
}
```

**Set-Cookie Header:**
```
auth_token=<JWT_TOKEN>; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000
```

**Errors:**
- `401`: 인증 실패 (이메일 또는 비밀번호 오류)

---

### 3. 로그아웃
**POST** `/api/auth/logout`

**Response (200):**
```json
{
  "success": true,
  "message": "로그아웃 되었습니다."
}
```

---

### 4. 현재 사용자 정보
**GET** `/api/auth/me`

**Headers:**
```
Cookie: auth_token=<JWT_TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "홍길동",
      "role": "student"
    }
  }
}
```

**Errors:**
- `401`: 인증되지 않음

---

## 강좌 관리 API

### 1. 강좌 목록 조회
**GET** `/api/courses`

**Query Parameters:**
```
?status=published    // 선택적 (published, draft, active)
&page=1              // 선택적 (기본값: 1)
&limit=10            // 선택적 (기본값: 10)
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "courses": [
      {
        "id": 1,
        "title": "웹 개발 기초",
        "description": "HTML, CSS, JavaScript 기초",
        "thumbnail": "https://example.com/thumb.jpg",
        "instructor_id": 2,
        "instructor_name": "강사명",
        "status": "published",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
        "lesson_count": 10,
        "total_duration": 3600,
        "rating_average": 4.5,
        "rating_count": 123
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "total_pages": 5
    }
  }
}
```

---

### 2. 강좌 상세 조회
**GET** `/api/courses/:id`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "course": {
      "id": 1,
      "title": "웹 개발 기초",
      "description": "HTML, CSS, JavaScript 기초",
      "thumbnail": "https://example.com/thumb.jpg",
      "instructor_id": 2,
      "instructor_name": "강사명",
      "status": "published",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z",
      "lessons": [
        {
          "id": 1,
          "title": "1강. HTML 기초",
          "description": "HTML 태그와 구조",
          "video_url": "https://youtube.com/watch?v=xxx",
          "video_type": "youtube",
          "duration": 600,
          "order_num": 1
        }
      ],
      "rating_average": 4.5,
      "rating_count": 123
    }
  }
}
```

**Errors:**
- `404`: 강좌를 찾을 수 없음

---

### 3. 강좌 생성 (관리자 전용)
**POST** `/api/admin/courses`

**Headers:**
```
Cookie: auth_token=<JWT_TOKEN>
```

**Request Body:**
```json
{
  "title": "웹 개발 기초",
  "description": "HTML, CSS, JavaScript 기초",
  "thumbnail": "https://example.com/thumb.jpg",
  "status": "draft"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "course": {
      "id": 1,
      "title": "웹 개발 기초",
      "description": "HTML, CSS, JavaScript 기초",
      "thumbnail": "https://example.com/thumb.jpg",
      "instructor_id": 2,
      "status": "draft",
      "created_at": "2025-01-01T00:00:00Z"
    }
  }
}
```

**Errors:**
- `401`: 인증되지 않음
- `403`: 권한 없음 (관리자가 아님)

---

### 4. 강좌 수정 (관리자 전용)
**PUT** `/api/admin/courses/:id`

**Request Body:** (수정할 필드만 포함)
```json
{
  "title": "웹 개발 심화",
  "status": "published"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "course": {
      "id": 1,
      "title": "웹 개발 심화",
      "status": "published",
      "updated_at": "2025-01-02T00:00:00Z"
    }
  }
}
```

---

### 5. 강좌 삭제 (관리자 전용)
**DELETE** `/api/admin/courses/:id`

**Response (200):**
```json
{
  "success": true,
  "message": "강좌가 삭제되었습니다."
}
```

---

## 차시 관리 API

### 1. 차시 목록 조회
**GET** `/api/courses/:courseId/lessons`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "lessons": [
      {
        "id": 1,
        "course_id": 1,
        "title": "1강. HTML 기초",
        "description": "HTML 태그와 구조",
        "video_url": "https://youtube.com/watch?v=xxx",
        "video_id": "xxx",
        "video_type": "youtube",
        "video_provider": "youtube",
        "duration": 600,
        "order_num": 1,
        "created_at": "2025-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

### 2. 차시 생성 (관리자 전용)
**POST** `/api/admin/courses/:courseId/lessons`

**Request Body:**
```json
{
  "title": "1강. HTML 기초",
  "description": "HTML 태그와 구조",
  "video_url": "https://youtube.com/watch?v=xxx",
  "video_type": "youtube",
  "duration": 600,
  "order_num": 1
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "lesson": {
      "id": 1,
      "course_id": 1,
      "title": "1강. HTML 기초",
      "video_url": "https://youtube.com/watch?v=xxx",
      "video_id": "xxx",
      "video_type": "youtube",
      "created_at": "2025-01-01T00:00:00Z"
    }
  }
}
```

---

### 3. 차시 수정 (관리자 전용)
**PUT** `/api/admin/lessons/:id`

**Request Body:** (수정할 필드만)
```json
{
  "title": "1강. HTML 심화",
  "duration": 720
}
```

---

### 4. 차시 삭제 (관리자 전용)
**DELETE** `/api/admin/lessons/:id`

**Response (200):**
```json
{
  "success": true,
  "message": "차시가 삭제되었습니다."
}
```

---

## 수강 관리 API

### 1. 수강 등록
**POST** `/api/enrollments`

**Request Body:**
```json
{
  "course_id": 1
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "enrollment": {
      "id": 1,
      "user_id": 1,
      "course_id": 1,
      "enrolled_at": "2025-01-01T00:00:00Z",
      "progress": 0
    }
  }
}
```

**Errors:**
- `409`: 이미 수강 중인 강좌

---

### 2. 내 수강 목록
**GET** `/api/my/enrollments`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "enrollments": [
      {
        "id": 1,
        "course_id": 1,
        "course_title": "웹 개발 기초",
        "course_thumbnail": "https://example.com/thumb.jpg",
        "enrolled_at": "2025-01-01T00:00:00Z",
        "progress": 45.5,
        "completed_lessons": 5,
        "total_lessons": 11
      }
    ]
  }
}
```

---

### 3. 진도율 업데이트
**POST** `/api/progress`

**Request Body:**
```json
{
  "lesson_id": 1,
  "progress": 100,
  "watch_time": 600
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "progress": {
      "lesson_id": 1,
      "progress": 100,
      "completed": true,
      "watch_time": 600
    }
  }
}
```

---

## 수강평/별점 API

### 1. 수강평 작성
**POST** `/api/courses/:courseId/reviews`

**Request Body:**
```json
{
  "rating": 5,
  "comment": "정말 유익한 강좌였습니다!"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "review": {
      "id": 1,
      "course_id": 1,
      "user_id": 1,
      "user_name": "홍길동",
      "rating": 5,
      "comment": "정말 유익한 강좌였습니다!",
      "created_at": "2025-01-01T00:00:00Z"
    }
  }
}
```

**Errors:**
- `400`: 별점은 1~5 사이여야 함
- `403`: 수강하지 않은 강좌에는 리뷰 불가
- `409`: 이미 리뷰를 작성한 강좌

---

### 2. 수강평 목록 조회
**GET** `/api/courses/:courseId/reviews`

**Query Parameters:**
```
?page=1
&limit=10
&sort=recent  // recent, rating_high, rating_low
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": 1,
        "user_name": "홍길동",
        "rating": 5,
        "comment": "정말 유익한 강좌였습니다!",
        "created_at": "2025-01-01T00:00:00Z"
      }
    ],
    "summary": {
      "average": 4.5,
      "total": 123,
      "distribution": {
        "5": 80,
        "4": 30,
        "3": 10,
        "2": 2,
        "1": 1
      }
    }
  }
}
```

---

### 3. 수강평 수정
**PUT** `/api/reviews/:id`

**Request Body:**
```json
{
  "rating": 4,
  "comment": "수정된 내용입니다."
}
```

---

### 4. 수강평 삭제
**DELETE** `/api/reviews/:id`

**Response (200):**
```json
{
  "success": true,
  "message": "수강평이 삭제되었습니다."
}
```

---

## 수료증 API

### 1. 수료증 발급 가능 여부 확인
**GET** `/api/courses/:courseId/certificate/eligible`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "eligible": true,
    "progress": 100,
    "completed_at": "2025-01-15T00:00:00Z"
  }
}
```

**Response (200 - 발급 불가):**
```json
{
  "success": true,
  "data": {
    "eligible": false,
    "progress": 85,
    "required_progress": 100
  }
}
```

---

### 2. 수료증 발급
**POST** `/api/courses/:courseId/certificate`

**Response (201):**
```json
{
  "success": true,
  "data": {
    "certificate": {
      "id": "CERT-2025-001-123",
      "course_id": 1,
      "course_title": "웹 개발 기초",
      "user_id": 1,
      "user_name": "홍길동",
      "issued_at": "2025-01-15T00:00:00Z",
      "pdf_url": "https://example.com/certificates/CERT-2025-001-123.pdf"
    }
  }
}
```

**Errors:**
- `403`: 수료 조건 미달 (진도율 100% 미만)

---

### 3. 내 수료증 목록
**GET** `/api/my/certificates`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "certificates": [
      {
        "id": "CERT-2025-001-123",
        "course_title": "웹 개발 기초",
        "issued_at": "2025-01-15T00:00:00Z",
        "pdf_url": "https://example.com/certificates/CERT-2025-001-123.pdf"
      }
    ]
  }
}
```

---

## 에러 응답 규격

### HTTP 상태 코드

| 코드 | 의미 | 설명 |
|------|------|------|
| 200 | OK | 요청 성공 |
| 201 | Created | 리소스 생성 성공 |
| 400 | Bad Request | 잘못된 요청 (필수 필드 누락, 유효성 검증 실패) |
| 401 | Unauthorized | 인증되지 않음 (로그인 필요) |
| 403 | Forbidden | 권한 없음 (접근 거부) |
| 404 | Not Found | 리소스를 찾을 수 없음 |
| 409 | Conflict | 리소스 충돌 (중복 등록, 이미 존재) |
| 500 | Internal Server Error | 서버 내부 오류 |

### 에러 코드 정의

```typescript
enum ErrorCode {
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
```

---

## 데이터 타입 정의

### User
```typescript
interface User {
  id: number;
  email: string;
  name: string;
  role: 'student' | 'instructor' | 'admin';
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}
```

### Course
```typescript
interface Course {
  id: number;
  title: string;
  description: string;
  thumbnail: string;
  instructor_id: number;
  instructor_name: string;
  status: 'draft' | 'published' | 'active';
  created_at: string;
  updated_at: string;
  lesson_count?: number;
  total_duration?: number;
  rating_average?: number;
  rating_count?: number;
}
```

### Lesson
```typescript
interface Lesson {
  id: number;
  course_id: number;
  title: string;
  description: string;
  video_url: string;
  video_id: string;
  video_type: 'youtube';
  video_provider: 'youtube';
  duration: number; // 초 단위
  order_num: number;
  created_at: string;
  updated_at: string;
}
```

### Review
```typescript
interface Review {
  id: number;
  course_id: number;
  user_id: number;
  user_name: string;
  rating: number; // 1~5
  comment: string;
  created_at: string;
  updated_at: string;
}
```

### Certificate
```typescript
interface Certificate {
  id: string; // CERT-YYYY-MM-NNN
  course_id: number;
  course_title: string;
  user_id: number;
  user_name: string;
  issued_at: string;
  pdf_url: string;
}
```

---

## 버전 히스토리

- **v1.0.0** (2025-01-04): 초기 API 문서 작성
  - 인증, 강좌, 차시, 수강 관리 API
  - 수강평/별점 API
  - 수료증 API
