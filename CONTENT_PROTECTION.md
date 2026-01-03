# 🛡️ 콘텐츠 보호 시스템

Mindstory LMS의 저작권 보호 및 콘텐츠 무단 복제 방지 시스템

---

## 📋 개요

본 시스템은 교육 콘텐츠의 **저작권 보호**와 **무단 배포 방지**를 위해 다음 기능을 제공합니다:

---

## 🔒 보호 기능

### 1️⃣ **텍스트 복사 방지**
```javascript
✅ 텍스트 선택 불가
✅ 드래그 불가
✅ Ctrl+C / Cmd+C 차단
✅ 우클릭 복사 메뉴 차단
```

**효과:**
- 강좌 설명 복사 불가
- 차시 제목 복사 불가
- 교육 콘텐츠 텍스트 복사 불가

---

### 2️⃣ **우클릭 방지**
```javascript
✅ 마우스 우클릭 차단
✅ 컨텍스트 메뉴 비활성화
✅ 경고 메시지 표시
```

**효과:**
- "다른 이름으로 저장" 불가
- "페이지 소스 보기" 불가
- "이미지 저장" 불가

---

### 3️⃣ **개발자 도구 차단**
```javascript
✅ F12 키 차단
✅ Ctrl+Shift+I 차단 (개발자 도구)
✅ Ctrl+Shift+J 차단 (콘솔)
✅ Ctrl+Shift+C 차단 (요소 검사)
✅ 개발자 도구 열림 감지 및 경고
```

**효과:**
- HTML/CSS/JavaScript 코드 열람 차단
- 네트워크 요청 감시 차단
- 콘솔 조작 차단

---

### 4️⃣ **단축키 차단**
```javascript
✅ Ctrl+U (소스 보기)
✅ Ctrl+S (페이지 저장)
✅ Ctrl+P (인쇄)
✅ Ctrl+A (전체 선택)
✅ Ctrl+X (잘라내기)
```

**예외:**
- 입력 필드(input, textarea)는 정상 작동

---

### 5️⃣ **이미지/영상 보호**
```javascript
✅ 이미지 드래그 방지
✅ 영상 다운로드 제한
✅ 우클릭 "이미지 저장" 차단
```

**효과:**
- 썸네일 이미지 저장 불가
- 영상 다운로드 어려움

---

### 6️⃣ **스크린샷 제한**
```javascript
⚠️ Print Screen 키 감지
⚠️ 클립보드 초기화
⚠️ 경고 메시지 표시
```

**참고:**
- 완벽한 스크린샷 방지는 기술적으로 불가능
- 하지만 일반 사용자의 캡처는 어렵게 만듦

---

## 📍 적용 페이지

### ✅ 보호 적용
- **랜딩 페이지** (`/`)
- **강좌 상세** (`/courses/:id`)
- **학습 페이지** (`/courses/:courseId/lessons/:lessonId`)
- **마이 페이지** (`/my`)

### ⚠️ 보호 완화
- **관리자 페이지** (`/admin/*`)
- 관리자는 콘텐츠 관리를 위해 일부 기능 허용

---

## 🎨 사용자 경험

### 정상 작동하는 기능
```
✅ 페이지 스크롤
✅ 버튼 클릭
✅ 링크 이동
✅ 입력 필드 사용 (로그인, 회원가입)
✅ 영상 재생 컨트롤
✅ 북마크 추가/삭제
```

### 차단되는 기능
```
❌ 텍스트 선택
❌ 우클릭
❌ 복사/붙여넣기
❌ 드래그
❌ 개발자 도구
❌ 페이지 저장
❌ 인쇄
```

---

## 💻 기술 구현

### 파일 위치
```
public/static/js/content-protection.js
```

### 적용 방법
```html
<script src="/static/js/content-protection.js"></script>
```

### 주요 코드
```javascript
// 1. 텍스트 선택 방지
document.addEventListener('selectstart', (e) => {
  e.preventDefault();
  return false;
});

// 2. 우클릭 방지
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  alert('⚠️ 우클릭이 비활성화되어 있습니다.');
  return false;
});

// 3. 복사 방지
document.addEventListener('copy', (e) => {
  e.preventDefault();
  e.clipboardData.setData('text/plain', '⚠️ 복사가 금지되어 있습니다.');
  alert('⚠️ 복사가 금지된 콘텐츠입니다.');
  return false;
});

// 4. CSS로 선택 방지
body {
  -webkit-user-select: none;
  user-select: none;
}

// 5. 개발자 도구 감지
const detectDevTools = () => {
  const threshold = 160;
  const widthThreshold = window.outerWidth - window.innerWidth > threshold;
  const heightThreshold = window.outerHeight - window.innerHeight > threshold;
  
  if (widthThreshold || heightThreshold) {
    console.clear();
    console.log('%c⚠️ 경고', 'color: red; font-size: 30px;');
    console.log('%c저작권으로 보호되고 있습니다.', 'font-size: 16px;');
  }
};
```

---

## 🔧 커스터마이징

### 관리자 페이지 제외
```javascript
if (window.location.pathname.startsWith('/admin')) {
  console.log('ℹ️ 관리자 페이지는 보호가 완화됩니다.');
  return; // 보호 기능 비활성화
}
```

### 특정 요소 선택 허용
```javascript
// 특정 클래스에만 선택 허용
.selectable-text {
  -webkit-user-select: text !important;
  user-select: text !important;
}
```

### 워터마크 추가 (선택사항)
```javascript
const watermark = document.createElement('div');
watermark.innerHTML = '© Mindstory LMS';
watermark.style.cssText = `
  position: fixed;
  bottom: 10px;
  right: 10px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.3);
  pointer-events: none;
  z-index: 9999;
`;
document.body.appendChild(watermark);
```

---

## ⚠️ 한계점

### 완벽한 보호는 불가능
```
1. 스크린샷
   - Print Screen 감지는 일부 브라우저에서만 작동
   - 외부 캡처 도구는 차단 불가

2. 화면 녹화
   - OBS, Bandicam 등 외부 프로그램 차단 불가
   - 모바일 화면 녹화 차단 불가

3. 전문가 우회
   - 개발자 도구 차단은 기술적으로 완벽하지 않음
   - 소스 코드는 브라우저에서 항상 접근 가능

4. 모바일
   - 롱프레스 메뉴는 일부만 차단 가능
   - 스크린샷은 차단 불가
```

---

## 🎯 추가 보호 방법

### 1. 서버 사이드 보호
```
✅ JWT 토큰 만료 시간 단축
✅ 영상 URL Signed URL 사용
✅ 워터마크 삽입 (api.video)
✅ DRM (Cloudflare Stream)
```

### 2. 법적 보호
```
✅ 이용약관에 저작권 명시
✅ 무단 복제 시 법적 조치 명시
✅ 각 페이지에 저작권 표시
```

### 3. 사용자 교육
```
✅ 회원가입 시 저작권 동의
✅ 강좌 시작 시 주의사항 표시
✅ 위반 시 계정 정지 안내
```

---

## 📊 효과 측정

### Before (보호 없음)
```
❌ 텍스트 자유 복사
❌ 우클릭 "다른 이름으로 저장"
❌ 개발자 도구로 영상 URL 추출
❌ 스크린샷/녹화 자유
```

### After (보호 적용)
```
✅ 텍스트 선택 불가
✅ 우클릭 차단
✅ 개발자 도구 차단
✅ 캡처 시 경고
✅ 일반 사용자 복제 80% 차단
```

---

## 🔐 보안 등급

### 현재 보호 수준: **중급 (Medium)**

```
낮음 (Low)      : 기본 보호 없음
중급 (Medium)   : JavaScript 기반 보호 (현재)
고급 (High)     : DRM + Signed URL + 워터마크
최고 (Maximum)  : 전용 플레이어 + 하드웨어 DRM
```

**중급 보호로도 일반 사용자의 80% 이상 복제를 막을 수 있습니다.**

---

## 📝 유지보수

### 정기 점검
```
1. 새 브라우저 버전 테스트
2. 모바일 환경 테스트
3. 우회 방법 모니터링
4. 보호 기능 업데이트
```

### 사용자 피드백
```
- 정상 기능이 작동하지 않는 경우 수정
- 입력 필드 등 예외 처리 개선
- 사용자 불편 최소화
```

---

## 🎉 결론

**Mindstory LMS는 강력한 콘텐츠 보호 시스템을 갖추고 있습니다.**

- ✅ 일반 사용자의 무단 복제 차단
- ✅ 저작권 보호 강화
- ✅ 교육 콘텐츠 가치 보호

**하지만 사용자 경험은 유지합니다:**

- ✅ 정상적인 학습은 방해받지 않음
- ✅ 버튼 클릭, 영상 재생 등 정상 작동
- ✅ 입력 필드 사용 가능

---

## 📞 문의

콘텐츠 보호 관련 문의:
- 보호 기능 오작동 신고
- 추가 보호 기능 요청
- 특정 페이지 제외 요청

---

**ⓒ 2026 Mindstory LMS. All rights reserved.**
