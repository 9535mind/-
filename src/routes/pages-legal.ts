/**
 * 이용약관 / 개인정보처리방침 / 환불규정
 * (링크만 있고 라우트가 없으면 404 — 본문 페이지 제공)
 */

import { Hono } from 'hono'
import {
  SITE_BUSINESS,
  SITE_CONTACT_EMAIL,
  SITE_FTC_BUSINESS_DETAIL_URL,
  SITE_INTERNET_DOMAIN,
  siteFooterLegalBlockHtml,
} from '../utils/site-footer-legal'

const app = new Hono()

function pgBusinessInfoHtml() {
  const b = SITE_BUSINESS
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>사업자정보 - 마인드스토리 원격평생교육원</title>
  <meta name="description" content="${b.companyName} 사업자등록번호 ${b.bizNo}, 유선전화 ${b.tel}, ${b.address}" />
  <link rel="stylesheet" href="/static/css/app.css" />
</head>
<body class="bg-gray-50 text-gray-900 min-h-screen">
  <main class="max-w-3xl mx-auto px-4 py-12">
    <h1 class="text-2xl font-bold mb-3">사업자정보</h1>
    <p class="text-sm text-gray-600 mb-8">PG/통신판매 심사 확인용 사업자 정보 페이지입니다.</p>

    <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <ul class="space-y-2 text-sm text-gray-800">
        <li><span class="text-gray-500">상호</span>: <strong>${b.companyName}</strong></li>
        <li><span class="text-gray-500">대표</span>: <strong>${b.ceo}</strong></li>
        <li><span class="text-gray-500">사업자등록번호</span>: <strong>${b.bizNo}</strong></li>
        <li><span class="text-gray-500">통신판매업신고</span>: <strong>${b.mailOrderNo}</strong></li>
        <li><span class="text-gray-500">고객센터</span>: <strong><a href="${b.telHref}" class="text-indigo-600 underline">${b.tel}</a></strong></li>
        <li><span class="text-gray-500">이메일</span>: <strong><a href="mailto:${SITE_CONTACT_EMAIL}" class="text-indigo-600 underline">${SITE_CONTACT_EMAIL}</a></strong></li>
        <li><span class="text-gray-500">인터넷 도메인</span>: <strong><a href="${SITE_INTERNET_DOMAIN}" class="text-indigo-600 underline">${SITE_INTERNET_DOMAIN}</a></strong></li>
        <li><span class="text-gray-500">주소</span>: <strong>${b.address}</strong></li>
      </ul>
    </div>

    <div class="mt-10">
      <div class="bg-gray-900 rounded-xl px-6 py-6 text-gray-100">
        <p class="text-sm font-semibold mb-3">사업자정보</p>
        <ul class="space-y-2 text-sm text-gray-300">
          <li><a href="/company" class="hover:text-white">사업자정보</a></li>
          <li><a href="${SITE_FTC_BUSINESS_DETAIL_URL}" target="_blank" rel="noopener noreferrer" class="hover:text-white font-semibold">사업자정보확인</a></li>
          <li><a href="/terms" class="hover:text-white">이용약관</a></li>
          <li><a href="/privacy" class="hover:text-white">개인정보처리방침</a></li>
          <li><a href="/refund" class="hover:text-white">환불규정</a></li>
        </ul>
      </div>
      <p class="mt-4 text-xs text-gray-500">동일 내용(Clean URL): <a href="/pg-business-info" class="text-indigo-600 underline">/pg-business-info</a></p>
    </div>
  </main>
</body>
</html>
  `
}

/**
 * GET /pg-business-info
 * PG 심사용 사업자 정보 — 공식 주소는 Clean URL `/pg-business-info` (확장자 없음).
 *
 * - 동일 본문 별칭: `/business-info`, `/mindstory-business-info`
 * - 구 북마크 `GET /pg-business-info.html` 은 앱 진입점(`index.tsx`)에서 `/pg-business-info` 로 302
 * - `public/pg-business-info.html` 정적 사본은 Cloudflare `_routes.json` exclude로 에지 정적 서빙(Worker 우회)
 */
app.get('/pg-business-info', (c) => {
  return c.html(pgBusinessInfoHtml())
})

// alias: 요청한 공식 경로
app.get('/business-info', (c) => c.html(pgBusinessInfoHtml()))

// alias: 추가 요청 경로도 같이 제공 (호환/공유용)
app.get('/mindstory-business-info', (c) => c.html(pgBusinessInfoHtml()))

type NavKey = 'terms' | 'privacy' | 'refund'

function navClass(active: NavKey, key: NavKey) {
  return active === key
    ? 'text-indigo-600 font-semibold'
    : 'text-gray-600 hover:text-indigo-600'
}

function layout(title: string, active: NavKey, body: string, options?: { docMeta?: string }) {
  const docMeta =
    options?.docMeta ?? '시행일: 2025년 1월 1일 · 최종 수정일: 2026년 3월 25일'
  return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - 마인드스토리 원격평생교육원</title>
    <link rel="stylesheet" href="/static/css/app.css" />
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
      /* 본문 가독성 보장 */
      .legal-body h2 { font-size: 1.125rem; font-weight: 700; color: #111827; margin-top: 2rem; margin-bottom: 0.5rem; }
      .legal-body h3 { font-size: 1rem; font-weight: 600; color: #1f2937; margin-top: 1rem; margin-bottom: 0.35rem; }
      .legal-body p { margin-bottom: 0.75rem; line-height: 1.7; color: #374151; font-size: 0.9375rem; }
      .legal-body ul, .legal-body ol { margin: 0.5rem 0 1rem 1.25rem; padding-left: 0.25rem; }
      .legal-body ul { list-style-type: disc; }
      .legal-body ol { list-style-type: decimal; }
      .legal-body li { margin: 0.25rem 0; line-height: 1.65; color: #374151; font-size: 0.9375rem; }
      .legal-body a { color: #4f46e5; text-decoration: underline; }
      .legal-body strong { font-weight: 600; color: #111827; }
      .legal-callout { background: #f8fafc; border-left: 4px solid #4f46e5; padding: 1rem 1.25rem; margin: 1rem 0; border-radius: 0 0.375rem 0.375rem 0; }
      .legal-callout-title { font-size: 0.8125rem; font-weight: 700; color: #4338ca; letter-spacing: 0.02em; margin-bottom: 0.5rem; }
      .legal-formula { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.8125rem; background: #f1f5f9; color: #334155; padding: 0.65rem 0.85rem; border-radius: 0.375rem; margin: 0.4rem 0 0.75rem; line-height: 1.55; border: 1px solid #e2e8f0; }
      .legal-subh { font-size: 0.9375rem; font-weight: 600; color: #1e293b; margin-top: 1rem; margin-bottom: 0.35rem; }
    </style>
</head>
<body class="bg-gray-50 text-gray-800">
    <header class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div class="max-w-3xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
            <a href="/" class="text-lg font-bold text-indigo-600">마인드스토리 원격평생교육원</a>
            <nav class="flex flex-wrap gap-4 text-sm">
                <a href="/terms" class="${navClass(active, 'terms')}">이용약관</a>
                <a href="/privacy" class="${navClass(active, 'privacy')}">개인정보처리방침</a>
                <a href="/refund" class="${navClass(active, 'refund')}">환불규정</a>
            </nav>
        </div>
    </header>
    <main class="max-w-3xl mx-auto px-4 py-10">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">${title}</h1>
        <p class="text-sm text-gray-500 mb-8">${docMeta}</p>
        <article class="legal-body max-w-none">
            ${body}
        </article>
    </main>
    <footer class="bg-gray-900 text-white py-10 mt-12">
        <div class="max-w-3xl mx-auto px-4">
            <div class="border-t border-gray-800 pt-8">
                ${siteFooterLegalBlockHtml()}
            </div>
            <p class="mt-6 text-center text-xs text-gray-600 flex flex-wrap justify-center gap-x-2 gap-y-1">
                <a href="/pg-business-info" class="text-gray-500 hover:text-gray-300">사업자정보</a>
                <span class="text-gray-700">·</span>
                <a href="/company" class="text-gray-500 hover:text-gray-300">사업자정보</a>
            </p>
            <p class="mt-4 text-center text-xs text-gray-600">본 문서는 일반적인 온라인 교육·전자상거래 관행에 맞추어 작성되었습니다. 세부 사항은 법률 자문을 권장합니다.</p>
        </div>
    </footer>
</body>
</html>`
}

app.get('/terms', (c) => {
  const b = SITE_BUSINESS
  const body = `
<h2>제1조 (목적)</h2>
<p>본 약관은 ${b.companyName}(이하 "회사")가 운영하는 마인드스토리 원격평생교육원 웹사이트 및 관련 서비스(이하 "서비스")의 이용과 회원의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>

<h2>제2조 (정의)</h2>
<ol>
<li>"서비스"란 회사가 제공하는 온라인 강의(VOD), 수강 신청, 결제, 학습 콘텐츠 열람, 고객지원 등 제반 서비스를 말합니다.</li>
<li>"회원"이란 본 약관에 동의하고 회사와 이용계약을 체결한 자를 말합니다.</li>
<li>"콘텐츠"란 서비스 내에서 제공되는 동영상, 문서, 이미지 등 교육 자료를 말합니다.</li>
</ol>

<h2>제3조 (약관의 효력 및 변경)</h2>
<p>① 본 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.</p>
<p>② 회사는 관련 법령을 위배하지 않는 범위에서 약관을 개정할 수 있으며, 개정 시 시행일 7일 전(회원에게 불리한 변경은 30일 전)부터 공지합니다.</p>

<h2>제4조 (서비스의 제공)</h2>
<p>① 회사는 온라인 강의 및 부가 교육자료 제공, 수강·진도 관리, 전자결제, 고객 문의 응대 등의 서비스를 제공합니다.</p>
<p>② 회사는 운영상·기술상 필요에 따라 서비스의 전부 또는 일부를 변경·중단할 수 있으며, 사전에 공지합니다.</p>

<h2>제5조 (회원가입 및 계정 관리)</h2>
<p>① 회원은 계정 정보를 타인에게 양도·대여·공유할 수 없습니다.</p>
<p>② 동시 접속, 계정 공유, 콘텐츠 무단 녹화 등의 부정 이용 적발 시, 회사는 사전 통보 없이 즉시 서비스 이용을 영구 정지할 수 있으며, <strong>이 경우 수강료는 환불되지 않습니다.</strong></p>

<h2>제6조 (유료 서비스 및 결제)</h2>
<p>① 유료 강의의 가격 및 결제 수단은 서비스 화면에 표시됩니다.</p>
<p>② 결제는 전자결제대행사(PG)를 통해 이루어지며, 환불에 관하여는 회사의 별도 <a href="/refund" class="text-indigo-600 underline">환불규정</a>에 따릅니다.</p>

<h2>제7조 (회원의 의무)</h2>
<p>회원은 다음 행위를 하여서는 안 됩니다.</p>
<ol>
<li>법령 및 본 약관 위반, 타인의 권리 침해</li>
<li>강의 콘텐츠의 무단 복제·배포·공유 및 2차 저작물 작성</li>
<li>시스템 부정 접근, 크롤링 등 서비스 운영 방해</li>
</ol>

<h2>제8조 (저작권)</h2>
<p>서비스 및 콘텐츠에 대한 저작권 등 지식재산권은 회사에 귀속됩니다. 회원은 개인 학습 목적 범위에서만 이용할 수 있습니다.</p>

<h2>제9조 (면책)</h2>
<p>① 회사는 천재지변, 통신 장애 등 불가항력으로 인한 서비스 중단에 대해 책임을 지지 않습니다.</p>
<p>② 회원이 게시하거나 전송한 정보의 신뢰성·적법성에 대해서는 해당 회원이 책임집니다.</p>

<h2>제10조 (분쟁 해결 및 관할)</h2>
<p>분쟁은 상호 협의로 해결하며, 소송 제기 시 관할법원은 민사소송법에 따릅니다.</p>

<h2>제11조 (사업자 정보 및 문의)</h2>
<ul>
<li>상호: ${b.companyName} (대표: ${b.ceo})</li>
<li>고객센터: <a href="${b.telHref}" class="text-indigo-600 underline">${b.tel}</a> / <a href="mailto:${SITE_CONTACT_EMAIL}" class="text-indigo-600 underline">${SITE_CONTACT_EMAIL}</a></li>
<li>사업자등록번호: ${b.bizNo}</li>
<li>통신판매업신고: ${b.mailOrderNo}</li>
<li>인터넷 도메인: <a href="${SITE_INTERNET_DOMAIN}" class="text-indigo-600 underline">${SITE_INTERNET_DOMAIN}</a></li>
<li>주소: ${b.address}</li>
<li><a href="${SITE_FTC_BUSINESS_DETAIL_URL}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 underline font-semibold">사업자정보확인</a> (공정거래위원회)</li>
</ul>
`
  return c.html(
    layout('이용약관', 'terms', body, {
      docMeta: '시행일: 2025년 1월 1일 · 최종 수정일: 2026년 3월 26일',
    }),
  )
})

app.get('/privacy', (c) => {
  const b = SITE_BUSINESS
  const body = `
<h2>1. 개인정보의 처리 목적</h2>
<p>${b.companyName}는 회원 가입·관리, VOD 강의 등 서비스 제공, 유료 결제·정산, 서비스 통계 분석을 목적으로 개인정보를 처리합니다.</p>
<ul>
<li>마케팅 및 광고에의 활용 <span class="text-gray-600">(선택 동의한 회원에 한함)</span>: 신규 서비스(강의) 출시 안내, 이벤트 및 프로모션 정보 전달, 맞춤형 강의 추천, 접속 빈도 파악 및 회원의 서비스 이용에 대한 통계</li>
</ul>

<h2>2. 처리하는 개인정보 항목</h2>
<p>① 간편 로그인(카카오 로그인 등) 시: 제공 동의한 프로필 정보(이름, 이메일, 프로필 사진 등) 및 식별자</p>
<p>② 결제 시: 주문번호, 결제 승인 정보 <span class="text-gray-600">(카드번호 등 민감 정보는 PG사가 직접 처리 및 보관)</span></p>
<p>③ 자동 수집: 접속 IP, 쿠키, 서비스(강의) 이용 기록, 진도율 데이터</p>
<p>④ 마케팅 활용 시 <span class="text-gray-600">(선택)</span>: 휴대전화번호, 이메일 주소</p>

<h2>3. 개인정보의 처리 및 보유 기간</h2>
<p>① 회원 탈퇴 시 지체 없이 파기합니다.</p>
<p>② 단, 관계 법령에 따라 다음 정보는 일정 기간 보관합니다.</p>
<ul>
<li>대금결제 및 청약철회 등에 관한 기록: 5년 (전자상거래법)</li>
<li>소비자 불만 또는 분쟁처리에 관한 기록: 3년</li>
<li>웹사이트 방문 기록: 3개월 (통신비밀보호법)</li>
</ul>
<p>③ 마케팅 및 광고 목적의 정보: 회원이 '마케팅 수신 동의'를 철회하거나 회원 탈퇴 시까지 지체 없이 보관 및 이용합니다. <span class="text-gray-600">(단, 관련 법령에 보존 의무가 있는 경우 해당 기간까지)</span></p>

<h2>4. 개인정보의 제3자 제공 및 위탁</h2>
<p>회사는 원활한 서비스 제공을 위해 아래와 같이 업무를 위탁합니다.</p>
<ul>
<li>클라우드 호스팅·DB: Cloudflare</li>
<li>전자결제(PG): 포트원(PortOne) 및 제휴 결제사</li>
<li>간편 로그인: (주)카카오</li>
</ul>

<h2>5. 정보주체의 권리 및 파기</h2>
<p>정보주체는 언제든 개인정보 열람·정정·삭제·처리정지를 요구할 수 있습니다. 목적 달성 또는 보유 기간 경과 시 전자적 파일은 복구 불가 방식으로 파기합니다.</p>

<h2>6. 쿠키의 운용</h2>
<p>로그인 유지 및 맞춤형 안내를 위해 쿠키를 사용하며, 브라우저 설정으로 거부할 수 있습니다.</p>

<h2>7. 개인정보 보호책임자</h2>
<ul>
<li>상호: ${b.companyName} (대표: ${b.ceo})</li>
<li>연락처: <a href="${b.telHref}" class="text-indigo-600 underline">${b.tel}</a> / <a href="mailto:${SITE_CONTACT_EMAIL}" class="text-indigo-600 underline">${SITE_CONTACT_EMAIL}</a></li>
<li>주소: ${b.address}</li>
<li>인터넷 도메인: <a href="${SITE_INTERNET_DOMAIN}" class="text-indigo-600 underline">${SITE_INTERNET_DOMAIN}</a></li>
<li>사업자등록번호: ${b.bizNo} · 통신판매업신고: ${b.mailOrderNo}</li>
<li><a href="${SITE_FTC_BUSINESS_DETAIL_URL}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 underline font-semibold">사업자정보확인</a> (공정거래위원회)</li>
</ul>
`
  return c.html(
    layout('개인정보처리방침', 'privacy', body, {
      docMeta: '시행일: 2025년 1월 1일 · 최종 수정일: 2026년 3월 26일',
    }),
  )
})

app.get('/refund', (c) => {
  const b = SITE_BUSINESS
  const body = `
<h2>제1조 (목적)</h2>
<p>본 규정은 ${b.companyName}가 제공하는 유료 온라인 교육 서비스(VOD)에 대한 청약철회 및 환불 절차, 금액 산정 기준을 정함을 목적으로 합니다.</p>

<h2>제2조 (청약철회 및 전액 환불)</h2>
<p>① 결제일로부터 7일 이내에, 제공된 강의를 단 1차시도 재생(수강)하지 않은 경우 전액 청약철회 및 환불이 가능합니다. <span class="text-gray-600">(단, 자료 다운로드 시 해당 금액 차감)</span></p>

<h2>제3조 (학습비 반환기준)</h2>
<p>회사는 「평생교육법 시행령」 [별표 3] <span class="text-gray-600">(&lt;개정 2024. 4. 16.&gt;)</span>의 학습비 반환 기준을 준용하여 환불금액을 산정합니다.</p>

<div class="legal-callout">
  <p class="legal-callout-title">학습비 반환기준(요약)</p>
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="text-left text-gray-600">
          <th class="py-2 pr-4 whitespace-nowrap">구분</th>
          <th class="py-2 pr-4 whitespace-nowrap">반환 사유 발생일</th>
          <th class="py-2 pr-4 whitespace-nowrap">반환 금액</th>
        </tr>
      </thead>
      <tbody class="align-top">
        <tr class="border-t border-gray-200/60">
          <td class="py-2 pr-4 font-medium">1</td>
          <td class="py-2 pr-4">법 제28조제4항제1호 및 제2호에 따른 반환사유의 경우<br><span class="text-gray-600">수업을 할 수 없거나, 수업장소를 제공할 수 없게 된 날</span></td>
          <td class="py-2 pr-4">이미 낸 학습비를 일 단위로 계산한 금액</td>
        </tr>
        <tr class="border-t border-gray-200/60">
          <td class="py-2 pr-4 font-medium">2</td>
          <td class="py-2 pr-4">법 제28조제4항제3호에 따른 반환사유의 경우</td>
          <td class="py-2 pr-4"></td>
        </tr>
        <tr class="border-t border-gray-200/60">
          <td class="py-2 pr-4 font-medium">2-가</td>
          <td class="py-2 pr-4">학습비 징수기간이 1개월 이내인 경우</td>
          <td class="py-2 pr-4">
            <div class="space-y-1">
              <div>1) 수업시작 전: 이미 낸 학습비 전액</div>
              <div>2) 총수업시간의 1/3이 지나기 이전: 이미 낸 학습비의 2/3</div>
              <div>3) 총수업시간의 1/3이 지난 후부터 1/2이 지나기 이전까지: 이미 낸 학습비의 1/2</div>
              <div>4) 총수업시간의 1/2이 지난 후: 반환하지 아니함</div>
            </div>
          </td>
        </tr>
        <tr class="border-t border-gray-200/60">
          <td class="py-2 pr-4 font-medium">2-나</td>
          <td class="py-2 pr-4">학습비 징수기간이 1개월을 초과하는 경우</td>
          <td class="py-2 pr-4">
            <div class="space-y-1">
              <div>1) 수업시작 전: 이미 낸 학습비 전액</div>
              <div>2) 수업시작 이후: 반환사유가 발생한 그 달의 반환 대상 학습비(가목에 따라 산출) + 나머지 달의 학습비 전액 합산</div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<h3>비고</h3>
<ol>
  <li>\"학습비 징수기간\"이란 징수된 총학습비에 따른 총수업일을 말한다.</li>
  <li>\"총수업시간\"이란 학습비 징수기간 중의 총수업시간을 말한다.</li>
  <li>반환금액의 산정은 반환사유가 발생한 날까지 경과된 수업시간을 기준으로 한다.</li>
  <li>위 표에도 불구하고 원격교육(실시간으로 제공하는 원격교육은 제외한다)의 형태로 이루어지는 학습에 대한 학습비 반환금액은 이미 낸 학습비에서 실제 학습한 부분(학습이 회차 단위로 구성된 경우 학습회차를 열거나 학습기기에 저장하는 때에는 그 학습회차를 학습한 것으로 본다)에 해당하는 학습비를 뺀 금액으로 한다.</li>
  <li>위 표에도 불구하고 수업이 회차 단위로 구성된 경우 잔여 회차를 기준으로 학습비를 반환한다.</li>
</ol>

<p class="text-sm text-gray-600">※ 본 서비스의 VOD는 회차(차시) 단위로 제공되며, 영상 재생·열람 또는 학습기기 저장(다운로드)이 발생한 회차는 학습한 것으로 봅니다.</p>

<h2>제4조 (환불 불가 사유)</h2>
<p>다음 각 호에 해당하는 경우 환불이 절대 불가합니다.</p>
<ol>
<li>전체 수강 기간의 50% 이상이 경과한 경우</li>
<li>전체 강의 수(차시)의 50% 이상을 수강(재생)한 경우</li>
<li>회원의 귀책으로 콘텐츠가 멸실·훼손되거나 계정 공유 등 부정 이용이 적발된 경우</li>
</ol>

<h2>제5조 (환불 신청 및 처리)</h2>
<p>① 환불 신청은 고객센터(<a href="${b.telHref}" class="text-indigo-600 underline">${b.tel}</a>) 또는 1:1 문의를 통해 접수합니다.</p>
<p>② 회사는 환불 요건 확인 후, 영업일 기준 3~7일 이내에 환불 절차를 진행합니다.</p>
`
  return c.html(
    layout('환불규정', 'refund', body, {
      docMeta: '시행일: 2025년 1월 1일 · 최종 수정일: 2026년 3월 26일',
    }),
  )
})

export default app
