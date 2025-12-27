# 마인드스토리 원격평생교육원 LMS 플랫폼

**Ver.1.4.0 - With Toss Payments Integration (2025.12.27)**

> **"스스로 배우는 힘을 키우는 교육"**  
> 박종석 대표의 20년 현장 경험을 담은 프로덕션급 LMS 플랫폼

## 📋 프로젝트 개요

마인드스토리 원격평생교육원을 위한 **프로덕션급 온라인 학습 관리 시스템(LMS)**입니다.  
심리학, 상담학, 코칭 분야의 전문 교육을 온라인으로 제공하며,  
수강 신청부터 학습, 수료, 수료증 발급까지 전 과정을 지원합니다.

### 🎓 교육이념
> "지식을 많이 아는 사람보다  
> 스스로 배우고 성장할 수 있는 사람을 키우는 교육"

**대표 박종석**의 20년 현장 경험을 바탕으로  
메타인지 기반 자기주도학습, 시간관리, 학습 동기 프로그램을 제공합니다.

## 🎯 주요 목표

- **운영 안정성 우선**: 초기 법적 리스크 제거, 검증된 기술만 사용
- **대표 1인 운영 가능**: 관리자 대시보드로 모든 기능 제어
- **확장 가능한 구조**: 향후 심리검사/상담/자격 과정 확장 대비

## ✨ 최신 추가 기능 (Ver.1.4.0)

### 💳 토스페이먼츠 결제 연동 (NEW) ⭐
- **사업자 정보 등록 완료**: 504-88-01964
- **결제 위젯 UI**: `/payment/checkout/:courseId`
- **결제 승인 API**: 실시간 결제 처리
- **환불 자동 계산**: 진도율 기반 환불 금액 자동 산정
  - 진도 0% + 7일 이내: 100% 환불
  - 진도 50% 미만: 50% 환불
  - 진도 50% 이상: 환불 불가
- **웹훅 처리**: 결제 상태 자동 동기화
- **영수증 조회**: 거래 내역 및 영수증 제공
- **테스트 환경**: 실제 청구 없는 테스트 결제 가능

**정산 계좌**: 농협 351-1202-0831-23 ((주)마인드스토리)

## ✨ 이전 버전 기능 (Ver.1.3.3)

### 📚 교육원 소개 페이지 (NEW)
- **대표 프로필**: 박종석 대표 소개
- **교육이념**: "스스로 배우는 힘을 키우는 교육"
- **핵심 가치**: 메타인지 기반 / 심리·상담 전문성 / 평생 학습 동반자
- **모바일 최적화**: PC/모바일 별도 디자인

### 📖 종합 운영 문서 (NEW)
- `docs/COMPREHENSIVE_CHECKLIST.md` - 종합 점검 체크리스트
- `docs/PAYMENT_INTEGRATION.md` - 결제 시스템 연동 가이드
- `docs/VIDEO_HOSTING_INTEGRATION.md` - 영상 호스팅 연동 가이드
- `docs/FINAL_REPORT.md` - 최종 종합 보고서

## ✨ 이전 버전 기능 (Ver.1.3.2)

### 🎉 팝업 공지사항 시스템
- **동시 최대 5개 팝업 표시** 지원
- 신규 강좌, 이벤트, 중요 공지 등 다양한 용도로 활용
- 우선순위 설정으로 표시 순서 제어
- '오늘 하루 보지 않기' 기능 (쿠키 기반)
- 이미지, HTML 콘텐츠, 링크 버튼 지원
- 관리자 페이지에서 생성/수정/삭제 가능

### 🎨 홈페이지 디자인 개선
- **mindstorys.com의 실제 사진** 활용으로 생동감 있는 디자인
- 심리/상담/평생교육원에서 자주 사용하는 패턴 적용
- 히어로 섹션: 교육 현장 사진 배경
- 특징 섹션: 강의실, 책, 학습 현장 사진
- 소개 섹션: 실제 교육 사진으로 신뢰도 향상
- 반응형 디자인으로 모든 기기에서 최적화

## 🚀 핵심 기능 (Ver.1.3 Baseline + Ver.1.3.2 추가)

### 1️⃣ 회원 시스템
- 회원가입/로그인/로그아웃
- 프로필 관리 및 회원 탈퇴
- 세션 관리 (동일 ID 동시 접속 차단 구조)
- 휴대폰 본인인증 구조 (API 연동 대기)

### 2️⃣ 과정 관리
- 과정/차시 CRUD (관리자)
- 공개/비공개 설정
- 무료/유료 구분
- 전문 호스팅 연동 구조 (Kollus/VideoCloud)
- 추천 과정 표시

### 3️⃣ 수강 신청 및 학습
- 수강 신청/기간 관리
- 실시간 진도율 추적 (80% 기준)
- 차시별 학습 진도 저장
- 내 강의실 (수강 중인 과정 목록)

### 4️⃣ 결제 시스템
- 결제 생성 (모의)
- 결제 내역 조회
- 환불 처리 (관리자)
- PG 연동 구조 (실제 연동 대기)

### 5️⃣ 수료 및 수료증
- 수료 조건 체크 (진도율 80% 이상)
- 수료 처리 및 날짜 기록
- 수료증 번호 자동 생성 (MS-2025-XXXX)
- 수료증 발급/조회/재발급
- PDF 생성 구조 (실제 생성 대기)

### 6️⃣ 팝업 공지사항 (NEW)
- 최대 5개 동시 표시
- 우선순위 기반 정렬
- 표시 기간 설정
- '오늘 하루 보지 않기' 쿠키
- 이미지/HTML/링크 지원
- 관리자 CRUD

### 7️⃣ 관리자 대시보드
- 통계 대시보드 (회원/과정/수강/매출)
- 회원 관리
- 수강 신청 관리
- 결제 내역 관리
- 수료증 관리
- 팝업 관리

### 8️⃣ UI/UX
- **반응형 홈페이지** (Tailwind CSS)
- 모바일 최적화
- 과정 카드 뷰
- 토스트 알림
- 로딩 인디케이터
- **실제 교육 현장 사진** 활용

## 🗄️ 데이터베이스 구조

### 주요 테이블
1. **users**: 회원 정보
2. **courses**: 과정 정보
3. **lessons**: 차시 정보
4. **enrollments**: 수강 신청 정보
5. **lesson_progress**: 차시별 학습 진도
6. **payments**: 결제 정보
7. **certificates**: 수료증 정보
8. **user_sessions**: 세션 관리
9. **admin_logs**: 관리자 로그
10. **popups**: 팝업 공지사항 (NEW)

## 🌐 접속 정보

### 개발 환경
- **Sandbox URL**: https://3000-ieu1ambselnpjf2cme9se-c81df28e.sandbox.novita.ai
- **로컬**: http://localhost:3000

### 테스트 계정
- **관리자**: admin@mindstory.co.kr / admin123
- **학생1**: student1@example.com / test123
- **학생2**: student2@example.com / test123

## 💾 백업

### 최신 버전 (v1.4.0 - With Toss Payments)
- **다운로드**: https://www.genspark.ai/api/files/s/djuYjQvn
- **파일명**: mindstory-lms-v1.4.0-with-toss-payments.tar.gz
- **크기**: 262KB
- **포함 내용**: 
  - 전체 소스 코드
  - 데이터베이스 마이그레이션
  - 팝업 기능
  - 교육원 소개 페이지
  - 개선된 홈페이지 디자인
  - **운영 문서 (docs/)** ✨

### 이전 버전 (v1.3.2)
- **다운로드**: https://www.genspark.ai/api/files/s/MJ7TN5nn
- **파일명**: mindstory-lms-v1.3.2-with-popup.tar.gz

## 🔌 API 엔드포인트

### 인증 (Auth)
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `POST /api/auth/logout` - 로그아웃
- `GET /api/auth/me` - 내 정보 조회

### 과정 (Courses)
- `GET /api/courses` - 과정 목록
- `GET /api/courses/featured` - 추천 과정
- `GET /api/courses/:id` - 과정 상세
- `POST /api/courses` - 과정 생성 (관리자)

### 수강 (Enrollments)
- `GET /api/enrollments/my` - 내 수강 목록
- `POST /api/enrollments` - 수강 신청
- `POST /api/enrollments/:id/progress` - 진도 저장
- `POST /api/enrollments/:id/complete` - 수강 완료

### 결제 (Payments)
- `GET /api/payments/my` - 내 결제 내역
- `POST /api/payments` - 결제 생성
- `POST /api/payments/:id/refund` - 환불 (관리자)

### 수료증 (Certificates)
- `GET /api/certificates/my` - 내 수료증 목록
- `POST /api/certificates` - 수료증 발급
- `GET /api/certificates/:id` - 수료증 조회

### 팝업 (Popups) - NEW
- `GET /api/popups/active` - 활성 팝업 목록 (최대 5개)
- `POST /api/popups/:id/close` - 팝업 닫기
- `GET /api/popups` - 팝업 관리 목록 (관리자)
- `POST /api/popups` - 팝업 생성 (관리자)
- `PUT /api/popups/:id` - 팝업 수정 (관리자)
- `DELETE /api/popups/:id` - 팝업 삭제 (관리자)

### 관리자 (Admin)
- `GET /api/admin/dashboard` - 대시보드 통계
- `GET /api/admin/users` - 회원 관리
- `GET /api/admin/enrollments` - 수강 관리
- `GET /api/admin/payments` - 결제 관리

## 🛠️ 기술 스택

- **프레임워크**: Hono (Cloudflare Workers)
- **배포**: Cloudflare Pages
- **데이터베이스**: Cloudflare D1 (SQLite)
- **언어**: TypeScript
- **스타일**: Tailwind CSS
- **아이콘**: Font Awesome
- **HTTP 클라이언트**: Axios

## 🔧 로컬 개발 가이드

### 서버 시작
```bash
npm run build
pm2 start ecosystem.config.cjs
```

### 데이터베이스 초기화
```bash
# 로컬 DB 리셋
rm -rf .wrangler/state/v3/d1

# 마이그레이션 적용
npx wrangler d1 migrations apply mindstory-production --local

# 테스트 데이터 삽입
npx wrangler d1 execute mindstory-production --local --file=./seed.sql
```

### 테스트
```bash
# 서버 상태 확인
curl http://localhost:3000/api/health

# 추천 과정 조회
curl http://localhost:3000/api/courses/featured

# 활성 팝업 조회
curl http://localhost:3000/api/popups/active
```

### 로그 확인
```bash
pm2 logs mindstory-lms --nostream
```

## 📦 NPM 스크립트

```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "wrangler pages dev dist",
  "deploy": "npm run build && wrangler pages deploy dist",
  "db:migrate:local": "wrangler d1 migrations apply mindstory-production --local",
  "db:migrate:prod": "wrangler d1 migrations apply mindstory-production",
  "db:seed": "wrangler d1 execute mindstory-production --local --file=./seed.sql",
  "db:reset": "rm -rf .wrangler/state/v3/d1 && npm run db:migrate:local && npm run db:seed"
}
```

## 🔜 다음 단계 (API 연동)

### 필수 API 서비스
1. **휴대폰 본인인증**: Pass, NICE 등
2. **PG 결제**: 토스페이먼츠, 이니시스 등
3. **영상 호스팅**: Kollus, VideoCloud 등
4. **SMS 발송**: 선택 사항

### 구조 선반영 (Ver.1.5 대비)
- 시험/평가 시스템 필드
- 복합 수료 조건 (진도 + 시험 점수)
- 과정 유형별 분류 (일반/자격/검사)
- 지도사 트랙 ID
- 상담·검사 데이터 확장

### 2단계 확장 계획
- 심리검사 기능
- 온라인 상담 예약
- 자격증 과정
- 지도사 양성 트랙
- 커뮤니티 게시판

## 📄 라이선스

© 2025 마인드스토리 원격평생교육원. All rights reserved.

## 📞 문의

- **이메일**: sanj2100@naver.com
- **전화**: 062-959-9535
- **웹사이트**: https://www.mindstorys.com

---

## 📚 문서 가이드

### 운영자용
- **최종 보고서**: `docs/FINAL_REPORT.md` - 프로젝트 전체 현황 및 다음 단계
- **종합 체크리스트**: `docs/COMPREHENSIVE_CHECKLIST.md` - 운영 전 필수 확인사항
- **결제 연동**: `docs/PAYMENT_INTEGRATION.md` - PG사 연동 가이드
- **영상 호스팅**: `docs/VIDEO_HOSTING_INTEGRATION.md` - Kollus/VideoCloud 연동

### 개발자용
- **README**: 프로젝트 개요 및 빠른 시작
- **API 문서**: 각 route 파일 주석 참고
- **데이터베이스 스키마**: `migrations/` 디렉토리

---

## 🎯 다음 단계 (Next Steps)

### 1. 즉시 제공 필요
```
✅ 사업자등록번호
✅ 정산 계좌 정보 (은행/계좌/예금주)
✅ 수료증 직인/서명 이미지
```

### 2. 외부 서비스 가입 (1-2주)
- [ ] 토스페이먼츠 (결제)
- [ ] Kollus (영상 호스팅)
- [ ] Pass/NICE (본인인증)

### 3. 연동 및 테스트 (1주)
- [ ] API 연동
- [ ] 모바일 E2E 테스트
- [ ] 보안 점검

### 4. 정식 오픈 🎉
- [ ] 운영 도메인 연결
- [ ] 최종 확인
- [ ] 런칭!

---

**Ver.1.4.0 업데이트 내역 (2025.12.27)**
- ✅ **토스페이먼츠 결제 연동 완료** 🎉
- ✅ 사업자 정보 등록 (504-88-01964)
- ✅ 결제 위젯 UI 구현
- ✅ 환불 규정 자동 적용 로직
- ✅ 웹훅 처리 구현
- ✅ 영수증 조회 API
- ✅ 테스트 환경 구축

**Ver.1.3.3 업데이트 내역 (2025.12.27)**
- ✅ 교육원 소개 페이지 추가 (대표 프로필/교육이념)
- ✅ 종합 운영 문서 작성 (체크리스트/연동 가이드)
- ✅ 최종 종합 보고서 작성
- ✅ 프로덕션 준비 완료

**Ver.1.3.2 업데이트 내역 (2025.12.27)**
- ✅ 팝업 공지사항 시스템 추가 (동시 최대 5개)
- ✅ 홈페이지 디자인 개선 (mindstorys.com 사진 활용)
- ✅ 반응형 레이아웃 최적화
