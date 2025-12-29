# 🔐 관리자 계정 정보

## 📋 관리자 계정

**이메일**: `parkjs@mindstory.co.kr`  
**비밀번호**: `Admin1234!`  
**이름**: 박종석 대표  
**권한**: `admin`  
**사용자 ID**: 16

---

## 🌐 접속 URL

### 로그인 페이지
```
https://3000-ieu1ambselnpjf2cme9se-c81df28e.sandbox.novita.ai/login
```

### 관리자 페이지
```
https://3000-ieu1ambselnpjf2cme9se-c81df28e.sandbox.novita.ai/admin
```

---

## 🔧 관리자 계정 생성 과정

### 1. 회원가입
```bash
POST /api/auth/register
{
  "email": "parkjs@mindstory.co.kr",
  "password": "Admin1234!",
  "name": "박종석 대표",
  "phone": "01094659535",
  "birth_date": "1980-01-01",
  "terms_agreed": true,
  "privacy_agreed": true,
  "marketing_agreed": false
}
```

### 2. 관리자 권한 부여
```bash
cd /home/user/webapp
npx wrangler d1 execute mindstory-production --local \
  --command="UPDATE users SET role = 'admin' WHERE id = 16"
```

### 3. 권한 확인
```bash
npx wrangler d1 execute mindstory-production --local \
  --command="SELECT id, email, name, role FROM users WHERE id = 16"
```

**결과**:
```json
{
  "id": 16,
  "email": "parkjs@mindstory.co.kr",
  "name": "박종석 대표",
  "role": "admin"
}
```

---

## ✅ 로그인 테스트 결과

**테스트 일시**: 2025-12-29

```
✅ 로그인 성공
- 사용자 ID: 16
- 이름: 박종석 대표
- 권한: admin
- 세션 토큰: 발급 완료
```

---

## 🔑 기존 관리자 계정

**기존 계정 (ID: 1)**:
- 이메일: `admin@mindstory.co.kr`
- 이름: 박종석 (관리자)
- 권한: `admin`
- 상태: 비밀번호 미확인

**권장 사항**: 
- 새로운 관리자 계정(`parkjs@mindstory.co.kr`)을 사용하세요.
- 비밀번호를 알고 있는 확실한 계정입니다.

---

## 🔐 보안 주의사항

1. **비밀번호 변경 권장**
   - 초기 비밀번호: `Admin1234!`
   - 로그인 후 즉시 변경하세요.

2. **비밀번호 요구사항**
   - 최소 6자 이상
   - 영문 + 숫자 조합 권장
   - 특수문자 포함 권장

3. **계정 관리**
   - 관리자 계정은 공유하지 마세요.
   - 정기적으로 비밀번호를 변경하세요.
   - 의심스러운 접속 시도는 즉시 확인하세요.

---

## 📊 관리자 기능

### 현재 사용 가능한 관리자 기능
- ✅ 관리자 페이지 접근 (`/admin`)
- ✅ 관리자 권한 확인 (`role: admin`)
- ✅ 세션 관리

### 향후 구현 예정
- 🔄 과정 관리 (생성/수정/삭제)
- 🔄 사용자 관리 (목록/상세/권한)
- 🔄 수강 관리 (승인/취소)
- 🔄 통계 대시보드
- 🔄 수료증 발급 관리

---

## 🆘 문제 해결

### 로그인 실패 시
1. 이메일 확인: `parkjs@mindstory.co.kr`
2. 비밀번호 확인: `Admin1234!` (대소문자 구분)
3. 캐시 삭제 후 재시도

### 관리자 페이지 접근 불가 시
1. 로그인 상태 확인
2. 권한 확인: `role: admin`
3. 세션 만료 시 재로그인

---

## 📝 추가 관리자 생성 방법

새로운 관리자를 추가하려면:

```bash
# 1. 일반 회원가입 후
# 2. 데이터베이스에서 role 변경
cd /home/user/webapp
npx wrangler d1 execute mindstory-production --local \
  --command="UPDATE users SET role = 'admin' WHERE email = '새관리자@mindstory.co.kr'"
```

---

**마지막 업데이트**: 2025-12-29  
**생성자**: GenSpark AI Assistant  
**문서 버전**: 1.0
