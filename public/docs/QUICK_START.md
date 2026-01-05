# 🚀 빠른 시작 가이드

**Ver.4.6 - YouTube 보호 + 관리자 계정 (2026.01.03)**

---

## 🔑 **로그인 정보**

### **✅ 관리자 계정 (추천)**
```
🌐 URL: https://53e9b60e.mindstory-lms.pages.dev
📧 ID: admin@lms.kr
🔑 PW: admin123456
```

**권한:**
- ✅ 모든 강좌 접근
- ✅ 차시 관리 (영상 교체 가능)
- ✅ 학생 관리
- ✅ 진도율 조회

### **학생 계정**
```
🌐 URL: https://53e9b60e.mindstory-lms.pages.dev
📧 ID: student@example.com
🔑 PW: student123
```

---

## ⚡ **비공개 영상 문제 30초 해결**

### **문제: "비공개 동영상입니다"**

#### **해결 절차**
```
1. 관리자 페이지 접속
   https://53e9b60e.mindstory-lms.pages.dev/admin/dashboard

2. 로그인 (admin@lms.kr / admin123456)

3. 좌측 메뉴 → "강좌 관리" 클릭

4. "마인드 타임 코칭 입문" 선택

5. "차시 관리" 탭 클릭

6. 비공개 영상이 있는 차시 선택

7. "YouTube" 탭 → 기존 URL 삭제

8. 공개 테스트 영상 입력:
   ✅ https://www.youtube.com/watch?v=dQw4w9WgXcQ (3분)
   ✅ https://www.youtube.com/watch?v=8S0FDjFBj8o (18분)
   ✅ https://www.youtube.com/watch?v=_OBlgSz8sSM (10분)

9. "미리보기" 클릭 → 재생 확인

10. "저장" 클릭
```

---

## 🎯 **테스트 시나리오**

### **1. 영상 재생 테스트**
```
1. https://53e9b60e.mindstory-lms.pages.dev 접속
2. 관리자 로그인 (admin@lms.kr / admin123456)
3. "마인드 타임 코칭 입문" → "학습 시작"
4. 아무 차시 클릭
5. 2-3초 후 YouTube 영상 자동 재생 확인
```

**예상 결과:**
- ✅ 영상 로딩 인디케이터 → 2-3초 후 영상 재생
- ✅ 재생/일시정지 정상 작동
- ✅ 진도율 자동 저장
- ✅ 팝업 없음

### **2. 보안 기능 테스트**
```
1. 영상 위에서 우클릭 시도
   → ❌ 메뉴 안 뜸

2. YouTube 로고 클릭 시도
   → ❌ 클릭 안 됨

3. 영상 제목 클릭 시도
   → ❌ YouTube 페이지 이동 안 됨

4. Ctrl+C 복사 시도
   → ❌ 복사 안 됨

5. F12 개발자 도구
   → ❌ 차단됨 (팝업 없음)
```

---

## 🛡️ **보안 기능 요약**

| 기능 | 상태 | 방식 |
|------|------|------|
| **YouTube 로고 클릭 차단** | ✅ 완벽 | 투명 보호막 z-index: 999 |
| **영상 제목 클릭 차단** | ✅ 완벽 | pointer-events: auto |
| **우클릭 차단** | ✅ 완벽 | contextmenu 3중 차단 |
| **복사 차단** | ✅ 완벽 | Ctrl+C 차단 |
| **다운로드 차단** | ✅ 완벽 | 5중 방어 시스템 |
| **F12 차단** | ✅ 완벽 | 조용히 차단 (팝업 없음) |

---

## 📚 **관련 문서**

- **README**: `/home/user/webapp/README.md`
- **테스트 가이드**: `/home/user/webapp/docs/YOUTUBE_PROTECTION_TEST.md`
- **비공개 영상 수정**: `/home/user/webapp/docs/FIX_PRIVATE_VIDEO.md`
- **빠른 시작**: `/home/user/webapp/docs/QUICK_START.md` (이 문서)

---

## 🎉 **모든 준비 완료!**

✅ **관리자 계정으로 로그인하여 테스트를 시작하세요!**

🌐 **URL**: https://53e9b60e.mindstory-lms.pages.dev
📧 **ID**: admin@lms.kr
🔑 **PW**: admin123456

---

**© 2026 Mindstory LMS. All rights reserved.**
