/**
 * 전자상거래·전자결제·PG 심사용 사업자 정보 (단일 출처)
 */

/** 배포 반영 확인: 홈 페이지 소스 검색 또는 GET /api/health 의 footerRevision 참고 */
export const FOOTER_HTML_REVISION = '20260327-3col-ftc-line-v1'

export const SITE_BUSINESS = {
  companyName: '(주)마인드스토리',
  ceo: '박종석',
  /** 사업자등록번호 */
  bizNo: '504-88-01964',
  /** 유선전화(고객센터) */
  tel: '062-959-9535',
  telHref: 'tel:0629599535',
  /** 사업장 주소 */
  address: '광주광역시 광산구 임방울대로 356, 404호 (수완동)',
  mailOrderNo: '2023-광주광산-0840',
} as const

/** 고객센터 이메일 (푸터·약관 등 공통) */
export const SITE_CONTACT_EMAIL = 'sanj2100@naver.com'

/** 통신판매·PG 심사용 인터넷 도메인(표시 URL) */
export const SITE_INTERNET_DOMAIN = 'https://mindstory.kr'

/** 공정거래위원회 사업자 정보 공개(전자상거래법 필수) */
export const SITE_FTC_BUSINESS_DETAIL_URL =
  'https://www.ftc.go.kr/bizCommPop.do?wrkr_no=5048801964'

/** 푸터에 직접 노출하는 한 줄 사업자 정보 (심사·표시용) */
export const siteBusinessDisclosureOneLine = (): string => {
  const b = SITE_BUSINESS
  return `상호: ${b.companyName} | 대표: ${b.ceo} | 사업자등록번호: ${b.bizNo} | 통신판매업신고: ${b.mailOrderNo} | 고객센터: ${b.tel} | 이메일: ${SITE_CONTACT_EMAIL} | 인터넷 도메인: ${SITE_INTERNET_DOMAIN} | 주소: ${b.address}`
}

const policyNavDark = () => `
              <nav class="flex flex-wrap items-center justify-center sm:justify-end gap-x-2 gap-y-1 text-sm text-gray-300" aria-label="약관 및 환불">
                <a href="/terms" class="hover:text-white px-1 py-0.5 rounded transition-colors">이용약관</a>
                <span class="text-gray-600 select-none" aria-hidden="true">|</span>
                <a href="/privacy" class="hover:text-white px-1 py-0.5 rounded transition-colors">개인정보처리방침</a>
                <span class="text-gray-600 select-none" aria-hidden="true">|</span>
                <a href="/refund" class="hover:text-white px-1 py-0.5 rounded transition-colors">환불규정</a>
              </nav>`

const ftcLinkDark = () => `
              <a href="${SITE_FTC_BUSINESS_DETAIL_URL}" target="_blank" rel="noopener noreferrer" class="text-[11px] sm:text-sm text-gray-400 hover:text-white shrink-0 text-center sm:text-right px-1 py-0.5 rounded transition-colors whitespace-nowrap font-semibold">
                사업자정보확인
              </a>`

const naverBlogLinkDark = () => `
              <a href="https://blog.naver.com/sanj2100" target="_blank" rel="noopener noreferrer" aria-label="네이버 공식 블로그(새 창)" class="inline-flex items-center gap-2 text-[11px] sm:text-sm text-gray-300 hover:text-white shrink-0 text-center sm:text-right px-2 py-1 rounded border border-gray-600 hover:border-gray-400 transition-colors whitespace-nowrap font-semibold">
                <span class="inline-flex items-center justify-center w-4 h-4 rounded bg-green-500 text-[10px] leading-none text-white font-bold">N</span>
                공식 블로그
              </a>`

const naverBlogLinkLight = () => `
              <a href="https://blog.naver.com/sanj2100" target="_blank" rel="noopener noreferrer" aria-label="네이버 공식 블로그(새 창)" class="inline-flex items-center gap-2 text-[11px] sm:text-sm text-gray-700 hover:text-gray-900 shrink-0 text-center sm:text-right px-2 py-1 rounded border border-gray-300 hover:border-gray-400 transition-colors whitespace-nowrap font-semibold">
                <span class="inline-flex items-center justify-center w-4 h-4 rounded bg-green-500 text-[10px] leading-none text-white font-bold">N</span>
                공식 블로그
              </a>`

/** 상단 3열: 브랜드 · 바로가기 · 문의 */
function siteFooterMarketingColumns(variant: 'dark' | 'light'): string {
  const b = SITE_BUSINESS
  const isDark = variant === 'dark'
  const h = isDark ? 'text-lg font-semibold text-white mb-3' : 'text-lg font-semibold text-gray-900 mb-3'
  const body = isDark ? 'text-gray-400 text-sm leading-relaxed' : 'text-gray-600 text-sm leading-relaxed'
  const linkSub = isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-indigo-600'
  const linkAccent = isDark ? 'text-indigo-300 hover:text-white' : 'text-indigo-600 hover:underline'
  const contact = isDark ? 'text-gray-400' : 'text-gray-600'
  const telStrong = isDark ? 'text-gray-100 hover:text-white font-medium' : 'text-gray-900 font-medium hover:text-indigo-600'
  return `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          <div>
            <h2 class="${h}">마인드스토리 원격평생교육원</h2>
            <p class="${body}">시간 관리와 심리학을 결합한 전문 교육 플랫폼</p>
          </div>
          <div>
            <h2 class="${h}">바로가기</h2>
            <ul class="space-y-2 text-sm">
              <li><a href="/terms" class="${linkSub}">이용약관</a></li>
              <li><a href="/privacy" class="${linkSub}">개인정보처리방침</a></li>
              <li><a href="/refund" class="${linkSub}">환불규정</a></li>
              <li><a href="/company" class="${linkAccent}">사업자정보 (상세)</a></li>
            </ul>
          </div>
          <div>
            <h2 class="${h}">문의</h2>
            <ul class="space-y-2 text-sm ${contact}">
              <li>유선: <a href="${b.telHref}" class="${telStrong}">${b.tel}</a></li>
              <li>이메일: <a href="mailto:${SITE_CONTACT_EMAIL}" class="${linkAccent}">${SITE_CONTACT_EMAIL}</a></li>
              <li>운영시간: 평일 10:00 - 18:00</li>
            </ul>
          </div>
        </div>`
}

/** 저작권 바로 위에 두는 필수 사업자 정보 한 줄 (전자상거래법 공시) */
function siteFooterDisclosureLineStrip(variant: 'dark' | 'light'): string {
  const line = siteBusinessDisclosureOneLine()
  if (variant === 'dark') {
    return `
            <div class="border-t border-gray-700 mt-6 pt-5" role="region" aria-label="통신판매 사업자 정보">
              <p class="leading-relaxed text-center sm:text-left text-gray-200 [font-size:0.8rem] max-w-6xl mx-auto">
                ${line}
              </p>
            </div>`
  }
  return `
            <div class="border-t border-gray-300 mt-6 pt-5" role="region" aria-label="통신판매 사업자 정보">
              <p class="leading-relaxed text-center sm:text-left text-gray-800 [font-size:0.8rem] max-w-6xl mx-auto">
                ${line}
              </p>
            </div>`
}

/**
 * 다크 푸터 — 3열 → 약관·공정위 → 필수 사업자 정보 한 줄(저작권 직전에 배치)
 */
export const siteFooterLegalBlockHtml = () => {
  return `
          <!-- ms-footer:${FOOTER_HTML_REVISION} -->
          <div>
            ${siteFooterMarketingColumns('dark')}
            <div class="flex flex-col gap-3 pt-6 border-t border-gray-700 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-x-8 sm:gap-y-2">
              ${policyNavDark()}
              ${naverBlogLinkDark()}
              ${ftcLinkDark()}
            </div>
            ${siteFooterDisclosureLineStrip('dark')}
          </div>`
}

/** 밝은 배경(결제·안내 페이지)용 */
export const siteFooterLegalBlockLightHtml = () => {
  return `
          <div>
            ${siteFooterMarketingColumns('light')}
            <div class="mt-4 flex flex-col gap-3 pt-6 border-t border-gray-200 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-x-8 sm:gap-y-2">
              <nav class="flex flex-wrap items-center justify-center sm:justify-end gap-x-2 gap-y-1 text-sm text-gray-700" aria-label="약관 및 환불">
                <a href="/terms" class="text-indigo-600 hover:underline px-1 py-0.5">이용약관</a>
                <span class="text-gray-300 select-none" aria-hidden="true">|</span>
                <a href="/privacy" class="text-indigo-600 hover:underline px-1 py-0.5">개인정보처리방침</a>
                <span class="text-gray-300 select-none" aria-hidden="true">|</span>
                <a href="/refund" class="text-indigo-600 hover:underline px-1 py-0.5">환불규정</a>
              </nav>
              ${naverBlogLinkLight()}
              <a href="${SITE_FTC_BUSINESS_DETAIL_URL}" target="_blank" rel="noopener noreferrer" class="text-[11px] sm:text-sm text-gray-600 hover:text-gray-900 shrink-0 text-center sm:text-right whitespace-nowrap font-semibold">
                사업자정보확인
              </a>
            </div>
            ${siteFooterDisclosureLineStrip('light')}
          </div>`
}

/** 결제/하단 고정용 */
export const sitePaymentFooterHtml = () => `
        <footer class="mt-12 border-t border-gray-200 bg-gray-100 text-gray-700">
            <div class="max-w-4xl mx-auto px-4 py-8">
                ${siteFooterLegalBlockLightHtml()}
            </div>
        </footer>`

/**
 * 메인 페이지(/) 본문 — PG 자동심사가 HTML에서 찾는 표현과 맞춤
 */
export const siteMainPageBusinessDisclosureHtml = () => {
  const b = SITE_BUSINESS
  return `
        <section id="business-disclosure" lang="ko" class="bg-slate-100 border-t border-slate-200 py-10" aria-label="사업자 정보">
            <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-slate-800">
                <h2 class="text-lg font-bold text-slate-900 mb-4">사업자 정보</h2>
                <div class="text-sm leading-7 space-y-2">
                    <p>사업자등록번호(사업자번호): <strong>${b.bizNo}</strong></p>
                    <p>유선전화(유선번호): <strong><a href="${b.telHref}" class="text-indigo-700 underline">${b.tel}</a></strong></p>
                    <p>주소: <strong>${b.address}</strong></p>
                    <p class="text-slate-600 pt-1">${b.companyName} | 대표자: ${b.ceo} | 통신판매업신고번호: ${b.mailOrderNo}</p>
                    <p>이메일: <strong><a href="mailto:${SITE_CONTACT_EMAIL}" class="text-indigo-700 underline">${SITE_CONTACT_EMAIL}</a></strong></p>
                    <p>인터넷 도메인: <strong><a href="${SITE_INTERNET_DOMAIN}" class="text-indigo-700 underline">${SITE_INTERNET_DOMAIN}</a></strong></p>
                </div>
                <p class="mt-4 text-sm flex flex-wrap gap-x-3 gap-y-1 items-center">
                  <a href="${SITE_FTC_BUSINESS_DETAIL_URL}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 font-semibold hover:underline">사업자정보확인</a>
                  <span class="text-slate-400">·</span>
                  <a href="/company" class="text-indigo-600 font-medium hover:underline">사업자정보</a>
                </p>
            </div>
        </section>`
}

/** 홈 head — 일부 PG/봇이 JSON-LD로 사업자 정보를 읽음 */
export const siteOrganizationJsonLdScriptHtml = () => {
  const b = SITE_BUSINESS
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: b.companyName,
    url: SITE_INTERNET_DOMAIN,
    email: SITE_CONTACT_EMAIL,
    telephone: `+82-62-959-9535`,
    taxID: b.bizNo.replace(/-/g, ''),
    address: {
      '@type': 'PostalAddress',
      streetAddress: '임방울대로 356, 404호 (수완동)',
      addressLocality: '광산구',
      addressRegion: '광주광역시',
      addressCountry: 'KR',
    },
  }
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`
}

// 하위 호환
export const SITE_CUSTOMER_PHONE = SITE_BUSINESS.tel
export const SITE_CUSTOMER_PHONE_TEL = SITE_BUSINESS.telHref
