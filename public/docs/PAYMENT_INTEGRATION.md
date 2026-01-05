# 결제 시스템 연동 가이드

## 📋 현재 상태

### ✅ 구현 완료
- 결제 데이터 모델 (`payments` 테이블)
- 결제 생성/조회 API
- 환불 API (관리자)
- 결제 내역 관리 UI

### ⏳ 연동 대기
- 실제 PG사 연동
- 웹훅(Webhook) 처리
- 영수증/매출전표 자동 발행

## 🏦 PG 연동 준비사항

### 1. 사업자 정보 필요
```
✅ 필수 정보:
- 사업자등록번호
- 상호명: (주)마인드스토리
- 대표자명: 박종석
- 사업장 주소
- 대표 전화번호: 062-959-9535
- 이메일: sanj2100@naver.com

✅ 은행 계좌 정보:
- 은행명
- 계좌번호
- 예금주
```

### 2. 추천 PG사

#### 🥇 토스페이먼츠 (강력 추천)
**장점:**
- 간편한 연동 (REST API)
- 낮은 수수료 (2.9% + VAT)
- 자동 정산
- 환불/부분취소 지원
- 실시간 웹훅
- 국내 모든 결제수단 지원

**필요 정보:**
- 사업자등록증
- 통장 사본
- 대표자 신분증

**연동 절차:**
1. https://www.tosspayments.com 회원가입
2. 사업자 인증 (1-2영업일)
3. API 키 발급 (테스트/운영)
4. 개발 연동
5. 운영 전환 신청

#### 🥈 이니시스 (안정성)
**장점:**
- 오랜 운영 경험
- 안정적인 시스템
- 다양한 결제수단

**단점:**
- 복잡한 연동
- 높은 수수료 (3.3% + VAT)

#### 🥉 KG이니시스 / 나이스페이
비슷한 조건의 PG사

## 💳 결제 시나리오

### A. 신규 결제 플로우
```
1. 사용자: 과정 선택 → 수강신청
2. 시스템: 결제 페이지로 리다이렉트
3. PG사: 결제 진행 (카드/계좌이체/간편결제)
4. PG사: 결제 완료 시 웹훅 전송
5. 시스템: 
   - 결제 검증 (위변조 방지)
   - 수강 권한 부여
   - 이메일/SMS 발송
6. 사용자: "내 강의실"에서 학습 시작
```

### B. 환불 플로우
```
1. 관리자: 환불 버튼 클릭
2. 시스템:
   - PG사에 환불 요청
   - 환불 완료 시 DB 업데이트
   - 수강 권한 즉시 회수
   - 진도 데이터 유지 (통계용)
3. 사용자: 환불 완료 이메일 수신
```

### C. 부분취소 지원
```
환불 규정에 따라:
- 학습 시작 전: 100% 환불
- 진도 50% 미만: 50% 환불
- 진도 50% 이상: 환불 불가

시스템이 자동 계산하여 부분취소 실행
```

## 🔔 웹훅(Webhook) 처리

### 웹훅 엔드포인트
```typescript
POST /api/payments/webhook
```

### 웹훅 데이터 검증
```typescript
// 1. 서명 검증 (위변조 방지)
const isValid = verifyWebhookSignature(
  webhookData, 
  signature, 
  secretKey
)

// 2. 결제 상태 확인
if (webhookData.status === 'DONE') {
  // 수강 권한 부여
  await grantEnrollmentAccess(paymentId)
}

// 3. 환불 처리
if (webhookData.status === 'CANCELED') {
  // 수강 권한 회수
  await revokeEnrollmentAccess(paymentId)
}
```

### 웹훅 재시도 정책
- 실패 시 최대 5회 재시도
- 지수 백오프 (1s, 2s, 4s, 8s, 16s)
- 영구 실패 시 관리자 알림

## 🧾 영수증/매출전표

### 자동 발행 방식
```
토스페이먼츠 기준:

1. 현금영수증: 
   - 결제 시 자동 신청
   - 국세청 자동 연동

2. 신용카드 매출전표:
   - 카드사에서 자동 발행
   - SMS/이메일로 전송

3. 거래 명세서:
   - LMS에서 PDF 다운로드 제공
   - 결제 정보 + 과정 정보 포함
```

### LMS 내 영수증 제공
```typescript
// 영수증 조회 API
GET /api/payments/:id/receipt

// 응답 예시
{
  "payment_id": 123,
  "course_name": "마인드 타임 코칭 입문",
  "amount": 150000,
  "payment_method": "카드",
  "paid_at": "2025-01-15 14:30:00",
  "receipt_url": "https://receipt.tosspayments.com/...",
  "tax_invoice_available": true
}
```

## 🔒 보안 고려사항

### 1. API 키 관리
```bash
# .dev.vars (로컬)
TOSS_CLIENT_KEY=test_ck_...
TOSS_SECRET_KEY=test_sk_...

# Cloudflare (운영)
wrangler secret put TOSS_SECRET_KEY
```

### 2. 결제 금액 검증
```typescript
// 프론트에서 넘어온 금액 무시
// DB에서 실제 과정 금액 조회하여 검증
const course = await getCourse(courseId)
const actualAmount = course.price

if (actualAmount !== requestAmount) {
  throw new Error('결제 금액 불일치')
}
```

### 3. 중복 결제 방지
```typescript
// 이미 결제 완료된 수강신청인지 확인
const existingPayment = await getPaymentByEnrollment(enrollmentId)
if (existingPayment && existingPayment.status === 'completed') {
  throw new Error('이미 결제 완료된 수강신청입니다')
}
```

## 📊 결제 통계 및 정산

### 일일 정산 확인
```sql
-- 일일 매출
SELECT 
  DATE(paid_at) as date,
  COUNT(*) as count,
  SUM(amount) as total
FROM payments
WHERE status = 'completed'
GROUP BY DATE(paid_at)
ORDER BY date DESC
```

### 환불율 모니터링
```sql
-- 환불율 계산
SELECT 
  COUNT(CASE WHEN status = 'refunded' THEN 1 END) * 100.0 / COUNT(*) as refund_rate
FROM payments
WHERE created_at >= datetime('now', '-30 days')
```

## 🚀 연동 우선순위

### 단계 1: 토스페이먼츠 테스트 연동 ✅
1. 토스페이먼츠 회원가입
2. 테스트 API 키 발급
3. 결제 UI 개발
4. 웹훅 핸들러 구현
5. 테스트 결제 실행

### 단계 2: 환불 시스템 고도화 ✅
1. 부분취소 로직 구현
2. 환불 규정 자동 적용
3. 권한 회수 자동화
4. 알림 시스템 연동

### 단계 3: 운영 전환 🔜
1. 사업자 인증 완료
2. 운영 API 키 발급
3. 실제 정산 계좌 연동
4. 최종 테스트
5. 운영 시작

## 📞 문의처

### 토스페이먼츠 지원
- 전화: 1544-7772
- 이메일: support@tosspayments.com
- 개발자 센터: https://docs.tosspayments.com

### 시스템 문의
- 개발사: 젠스파크
- 이메일: sanj2100@naver.com

## ⚠️ 주의사항

1. **테스트 결제는 실제 청구 안 됨**
   - 테스트 카드 정보 사용
   - 테스트 환경에서 충분히 검증

2. **운영 전환 전 체크리스트**
   - [ ] 사업자등록증 인증 완료
   - [ ] 정산 계좌 등록 완료
   - [ ] 결제/환불 플로우 테스트 완료
   - [ ] 웹훅 처리 검증 완료
   - [ ] 영수증 발행 확인
   - [ ] 보안 검수 완료

3. **법적 요구사항**
   - 전자금융거래법 준수
   - 개인정보 보호법 (결제 정보 암호화)
   - 이용약관에 결제/환불 규정 명시
   - 미성년자 결제 시 법정대리인 동의

---

**작성일**: 2025-12-27  
**작성자**: 개발팀  
**버전**: 1.0
