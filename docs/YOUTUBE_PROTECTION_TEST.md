# 🎯 YouTube 지적재산권 보호 테스트 가이드

**Ver.4.6 - YouTube 로고/제목 클릭 완전 차단 (2026.01.03)**

---

## 📋 테스트 시나리오

### ✅ **1단계: 투명 보호막 테스트**

#### **테스트 URL**
- 🌐 최신 배포: https://53e9b60e.mindstory-lms.pages.dev
- 🏠 프로덕션: https://mindstory-lms.pages.dev

#### **테스트 계정 (관리자 권장)**
- 📧 ID: `admin@lms.kr`
- 🔑 PW: `admin123456`

#### **학생 계정 (선택)**
- 📧 ID: `student@example.com`
- 🔑 PW: `student123`

#### **테스트 절차**
1. **로그인**: 위 테스트 URL 접속 → 관리자 계정 로그인 (`admin@lms.kr` / `admin123456`)
2. **강좌 선택**: "마인드 타임 코칭 입문" → "학습 시작"
3. **차시 재생**: 아무 차시 클릭 → YouTube 영상 로딩 대기 (2-3초)

**⚠️ 비공개 영상 문제 시:** 관리자 페이지 (`/admin/dashboard`) → 강좌 관리 → 차시 관리 → YouTube 탭에서 공개 영상으로 교체

#### **테스트 항목**

| 테스트 항목 | 예상 결과 | 차단 방식 |
|------------|-----------|-----------|
| **YouTube 로고 클릭** | ❌ 클릭 안 됨 | 투명 보호막 |
| **영상 제목 클릭** | ❌ 클릭 안 됨 | 투명 보호막 |
| **영상 위 우클릭** | ❌ 메뉴 안 뜸 | contextmenu 차단 |
| **영상 위 더블클릭** | ❌ 전체화면 안 됨 | dblclick 차단 |
| **재생/일시정지** | ✅ 정상 작동 | 보호막 아래 플레이어 작동 |

---

### ✅ **2단계: Player Vars 확인**

#### **개발자 도구에서 확인 (F12 키)**
```javascript
// 콘솔에 입력
document.querySelector('#youtubePlayer iframe').src
```

#### **URL 파라미터 확인**
```
?autoplay=1
&controls=1
&disablekb=1
&modestbranding=1
&rel=0
&fs=0
&iv_load_policy=3
&cc_load_policy=0
&showinfo=0
```

#### **예상 결과**
- ✅ 전체화면 버튼 없음 (`fs=0`)
- ✅ YouTube 로고 최소화 (`modestbranding=1`)
- ✅ 관련 영상 없음 (`rel=0`)
- ✅ 키보드 단축키 비활성화 (`disablekb=1`)

---

### ✅ **3단계: 도메인 제한 (YouTube Studio 설정)**

#### **설정 위치**
1. https://studio.youtube.com/
2. 콘텐츠 → 영상 선택
3. 세부정보 → 고급

#### **설정 항목**
```
📋 퍼가기 허용 도메인:
- mindstory-lms.pages.dev
- *.pages.dev (선택사항)
- 교육원 커스텀 도메인 (있는 경우)

🔒 공개 상태:
- "일부 공개 (Unlisted)" 권장
```

#### **예상 결과**
- ✅ 교육원 사이트에서만 재생 가능
- ❌ 다른 사이트에서 퍼가기 차단

---

## 🔍 **문제 해결**

### ❓ **YouTube 로고가 여전히 클릭되는 경우**

#### **확인 사항**
1. **보호막 z-index 확인**
   ```javascript
   // 콘솔에 입력
   const layer = document.getElementById('youtubeProtectionLayer');
   console.log(layer.style.zIndex); // 999 이상이어야 함
   ```

2. **pointer-events 확인**
   ```javascript
   // 콘솔에 입력
   const layer = document.getElementById('youtubeProtectionLayer');
   console.log(layer.style.pointerEvents); // "auto" 이어야 함
   ```

3. **브라우저 캐시 삭제**
   - Chrome: `Ctrl + Shift + Delete`
   - Firefox: `Ctrl + Shift + Delete`
   - Safari: `Cmd + Option + E`

---

### ❓ **재생/일시정지가 안 되는 경우**

#### **해결 방법**
```javascript
// 보호막 높이를 컨트롤 바 위까지만 설정
#youtubeProtectionLayer {
    height: calc(100% - 60px); /* 하단 60px 제외 */
}
```

---

## 📊 **최종 체크리스트**

### **필수 확인 사항**

- [ ] YouTube 로고 클릭 차단 확인
- [ ] 영상 제목 클릭 차단 확인
- [ ] 우클릭 메뉴 차단 확인
- [ ] 재생/일시정지 정상 작동 확인
- [ ] 진도율 자동 저장 확인
- [ ] 팝업 없이 조용히 차단 확인

### **선택 확인 사항**

- [ ] 도메인 제한 설정 (YouTube Studio)
- [ ] 공개 상태 "Unlisted" 설정
- [ ] 워터마크 표시 확인 (Cloudflare Stream)

---

## 🎉 **성공 기준**

✅ **모든 항목이 "차단됨" 또는 "정상 작동"으로 표시되면 성공!**

---

## 📞 **문의 및 지원**

- 📧 이메일: support@mindstory.kr
- 🌐 웹사이트: https://mindstory-lms.pages.dev
- 📚 문서: /home/user/webapp/docs/

---

**© 2026 Mindstory LMS. All rights reserved.**
