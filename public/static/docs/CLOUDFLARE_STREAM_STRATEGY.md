# Cloudflare Stream 전략 및 비용 분석

## 📊 비용 비교 분석 (2026년 1월 기준)

### Cloudflare Stream vs R2 비용 구조

| 항목 | Cloudflare R2 | Cloudflare Stream | 비고 |
|------|---------------|-------------------|------|
| **저장 비용** | $0.015/GB/월 | $5.00/1,000분/월 | Stream이 330배 비싸지만 보안 포함 |
| **전송 비용** | $0 (무료) | $1.00/1,000분 시청 | R2는 대역폭 무료! |
| **인코딩** | ❌ 직접 해야 함 | ✅ 자동 (무료) | 다중 해상도 자동 생성 |
| **DRM/보안** | ❌ 없음 | ✅ Signed URL 내장 | 핵심 차별점! |
| **워터마크** | ❌ 수동 | ✅ 서버사이드 가능 | Stream 우위 |
| **도메인 제한** | ❌ 없음 | ✅ Allowed Origins | Stream 우위 |

### 실제 비용 시뮬레이션

#### 시나리오 A: 소규모 (10개 강좌, 각 10시간, 100명 학생)
```
총 영상: 100시간 (6,000분)

R2 전략:
- 저장: 100시간 × 500MB = 50GB × $0.015 = $0.75/월
- 전송: 무료
- 인코딩: 수동 (FFmpeg) - 무료이지만 시간 소요
- 보안: 자체 구현 필요 (개발 비용)
- 총 비용: ~$0.75/월 + 개발 비용

Stream 전략:
- 저장: 6,000분 × $5/1,000분 = $30/월
- 시청: 100명 × 100시간 = 10,000시간 × $1/1,000분 = $600/월
- 보안: 내장 (Signed URL, Domain Lock 무료)
- 총 비용: ~$630/월 (보안 포함!)
```

❌ **소규모에서는 R2가 저렴** → 하지만 보안 개발 비용 고려 필요

#### 시나리오 B: 중규모 (50개 강좌, 각 10시간, 1,000명 학생)
```
총 영상: 500시간 (30,000분)

R2 전략:
- 저장: 500시간 × 500MB = 250GB × $0.015 = $3.75/월
- 전송: 무료
- 보안: 자체 구현 필요
- 총 비용: ~$3.75/월 + 개발 비용

Stream 전략:
- 저장: 30,000분 × $5/1,000분 = $150/월
- 시청: 1,000명 × 500시간 = 500,000시간 × $1/1,000분 = $30,000/월
- 총 비용: ~$30,150/월
```

❌ **Stream은 시청 비용이 급증!**

---

## 🎯 최적 전략: 하이브리드 아키텍처

### ✅ 권장 전략: "R2 원본 + Stream 운영 강좌"

```
┌─────────────────────────────────────────────┐
│           R2 Storage (원본 저장소)            │
│  - 모든 영상 원본 보관                        │
│  - 저렴한 비용 ($0.015/GB/월)                │
│  - 백업 및 아카이브 용도                      │
└─────────────┬───────────────────────────────┘
              │
              │ (자동 전송 - 필요 시에만)
              ↓
┌─────────────────────────────────────────────┐
│       Cloudflare Stream (운영 강좌)          │
│  - 현재 수강생이 있는 강좌만                  │
│  - Signed URL + Domain Lock                 │
│  - 자동 인코딩 + 워터마크                     │
└─────────────────────────────────────────────┘
```

### 비용 최적화 로직

#### 1. 강좌 상태별 전략
```typescript
if (강좌.status === '운영중' && 강좌.수강생수 > 0) {
  // Cloudflare Stream 사용 (보안 최우선)
  return streamVideo({
    videoId: video.stream_id,
    signedUrl: true,
    watermark: {
      userId: student.id,
      userName: student.name
    }
  });
} else if (강좌.status === '준비중' || 강좌.수강생수 === 0) {
  // R2 사용 (비용 절감)
  return r2Video({
    videoKey: video.r2_key,
    basicProtection: true
  });
}
```

#### 2. 자동 마이그레이션
```typescript
// 수강 신청 발생 시 → Stream으로 자동 업로드
async function onEnrollmentCreated(courseId: number) {
  const course = await db.courses.findById(courseId);
  const lessons = await db.lessons.findByCourseId(courseId);
  
  for (const lesson of lessons) {
    if (!lesson.stream_id) {
      // R2에서 Stream으로 복사
      await uploadToStreamFromR2(lesson.r2_key);
    }
  }
}

// 마지막 수강생 종료 후 30일 → Stream에서 삭제 (R2에는 유지)
async function archiveOldCourses() {
  const oldCourses = await db.courses.findWhere({
    lastEnrollmentEndDate: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
  });
  
  for (const course of oldCourses) {
    await deleteFromStream(course.stream_id);
    // R2 원본은 유지
  }
}
```

---

## 💰 하이브리드 전략 비용 예측

### 현실적 시나리오 (30개 강좌, 각 10시간, 200명 학생)

#### 전체 영상: 300시간 (18,000분)
#### 운영 중 강좌: 10개 (100시간 = 6,000분)

```
R2 비용 (전체 원본 보관):
- 저장: 300시간 × 500MB = 150GB × $0.015 = $2.25/월
- 전송: 무료
- 소계: $2.25/월

Stream 비용 (운영 강좌만):
- 저장: 6,000분 × $5/1,000분 = $30/월
- 시청: 200명 × 100시간 = 20,000시간
  → 20,000시간 × 60분 = 1,200,000분 × $1/1,000분 = $1,200/월
- 소계: $1,230/월

총 비용: $1,232.25/월
```

#### 비용 절감 효과
- **전체 Stream 사용 시**: $1,800/월
- **하이브리드 사용 시**: $1,232/월
- **절감액**: $567/월 (31% 절감) ✅

---

## 🔧 기술 구현 전략

### 1. Database Schema 확장

```sql
-- lessons 테이블 확장
ALTER TABLE lessons ADD COLUMN storage_type TEXT DEFAULT 'r2'; -- 'r2' or 'stream'
ALTER TABLE lessons ADD COLUMN r2_key TEXT; -- R2 원본 경로
ALTER TABLE lessons ADD COLUMN stream_id TEXT; -- Stream 비디오 ID
ALTER TABLE lessons ADD COLUMN stream_uploaded_at DATETIME; -- Stream 업로드 시각

-- 영상 상태 추적
CREATE TABLE video_storage_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_id INTEGER NOT NULL,
  storage_type TEXT NOT NULL, -- 'r2' or 'stream'
  size_bytes INTEGER,
  uploaded_at DATETIME,
  last_accessed_at DATETIME,
  access_count INTEGER DEFAULT 0,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id)
);
```

### 2. API 엔드포인트 설계

```typescript
// 영상 URL 발급 (학생용)
GET /api/videos/:lessonId/play
→ 수강권 확인 → Signed URL 발급 → 워터마크 포함

// 영상 업로드 (관리자용)
POST /api/videos/upload
→ R2에 원본 저장 → (옵션) Stream으로 복사

// 강좌 활성화 시 자동 Stream 업로드
POST /api/courses/:id/activate
→ 모든 차시를 R2에서 Stream으로 복사
```

### 3. 자동화 워크플로우

```
관리자 영상 업로드
    ↓
R2에 원본 저장 (필수)
    ↓
DB에 r2_key 저장
    ↓
<수강생 등록 발생>
    ↓
R2 → Stream 자동 복사
    ↓
DB에 stream_id 저장
    ↓
학생 시청 시 Signed URL 발급
    ↓
<강좌 종료 후 30일>
    ↓
Stream에서 삭제 (R2 유지)
```

---

## ✅ 최종 권장사항

### 1단계: R2 기본 인프라 구축 (즉시)
- ✅ 이미 완료: R2 버킷 생성 및 이미지 업로드
- 🔄 필요: 영상 업로드 API 확장

### 2단계: Cloudflare Stream 연동 (이번 작업)
- Signed URL 발급 시스템
- 도메인 제한 (Allowed Origins)
- 커스텀 플레이어 (워터마크, 배속, 이어보기)

### 3단계: 자동화 파이프라인 (향후)
- R2 → Stream 자동 전송
- 강좌 종료 시 자동 아카이브
- 비용 모니터링 대시보드

---

## 📌 핵심 포인트

### ✅ 장점
1. **비용 최적화**: 하이브리드로 31% 절감
2. **보안 강화**: Stream의 Signed URL + Domain Lock
3. **유연성**: 강좌별 전략 선택 가능
4. **확장성**: 수강생 증가 시 자동 대응

### ⚠️ 주의사항
1. **초기 설정**: R2 ↔ Stream 연동 개발 필요
2. **자동화**: 스케줄러 필요 (Cloudflare Workers Cron)
3. **모니터링**: 비용 추적 시스템 필수

---

## 🚀 다음 단계

### 즉시 구현 (이번 작업)
1. ✅ Cloudflare Stream API 키 설정
2. ✅ Signed URL 발급 시스템
3. ✅ 도메인 제한 설정
4. ✅ 커스텀 플레이어 (보안 강화)
5. ✅ 동적 워터마크

### 향후 확장 (추가 개발)
1. R2 → Stream 자동 마이그레이션
2. 강좌 종료 시 자동 아카이브
3. 비용 모니터링 대시보드

---

**© 2026 Mindstory LMS - Cloudflare Stream Strategy**
