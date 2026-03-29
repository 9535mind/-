/**
 * 사업자 정보 전용 페이지 (전자결제·통신판매 심사 URL로 활용)
 * GET /company
 */

import { Hono } from 'hono'
import {
  SITE_BUSINESS,
  SITE_CONTACT_EMAIL,
  SITE_FTC_BUSINESS_DETAIL_URL,
  SITE_INTERNET_DOMAIN,
} from '../utils/site-footer-legal'
import {
  siteAiChatWidgetMarkup,
  siteAiChatWidgetScript,
  siteAiChatWidgetStyles,
} from '../utils/site-ai-chat-widget'
import {
  siteFloatingQuickMenuMarkup,
  siteFloatingQuickMenuScript,
  siteFloatingQuickMenuStyles,
} from '../utils/site-floating-quick-menu'

const app = new Hono()

app.get('/company', (c) => {
  const b = SITE_BUSINESS
  return c.html(`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>사업자 정보 - 마인드스토리 원격평생교육원</title>
    <meta name="description" content="${b.companyName} 사업자등록번호 ${b.bizNo}, 유선전화 ${b.tel}, ${b.address}">
    <link rel="stylesheet" href="/static/css/app.css" />
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    ${siteFloatingQuickMenuStyles()}
    ${siteAiChatWidgetStyles()}
</head>
<body class="bg-gray-50 text-gray-900 min-h-screen">
    <header class="bg-white border-b border-gray-200 shadow-sm">
        <div class="max-w-3xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-2">
            <a href="/" class="text-lg font-bold text-indigo-600">마인드스토리 원격평생교육원</a>
            <nav class="flex flex-wrap items-center gap-3 text-sm">
              <a href="/" class="text-gray-600 hover:text-indigo-600">홈</a>
              <a href="/community" class="text-gray-600 hover:text-indigo-600">공지 · FAQ</a>
            </nav>
        </div>
    </header>
    <main class="max-w-3xl mx-auto px-4 py-10">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">사업자 정보</h1>
        <p class="text-gray-600 text-sm mb-8">전자상거래 등에서의 상거래에 관한 정보 및 통신판매업 관련 표시입니다.</p>
        <div class="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <dl class="divide-y divide-gray-100">
                <div class="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                    <dt class="text-sm font-medium text-gray-500">상호</dt>
                    <dd class="sm:col-span-2 text-sm font-semibold text-gray-900">${b.companyName}</dd>
                </div>
                <div class="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                    <dt class="text-sm font-medium text-gray-500">대표자</dt>
                    <dd class="sm:col-span-2 text-sm text-gray-900">${b.ceo}</dd>
                </div>
                <div class="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                    <dt class="text-sm font-medium text-gray-500">사업자등록번호</dt>
                    <dd class="sm:col-span-2 text-sm font-mono text-gray-900">${b.bizNo}</dd>
                </div>
                <div class="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                    <dt class="text-sm font-medium text-gray-500">유선전화</dt>
                    <dd class="sm:col-span-2 text-sm"><a href="${b.telHref}" class="text-indigo-600 font-semibold hover:underline">${b.tel}</a></dd>
                </div>
                <div class="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                    <dt class="text-sm font-medium text-gray-500">이메일</dt>
                    <dd class="sm:col-span-2 text-sm"><a href="mailto:${SITE_CONTACT_EMAIL}" class="text-indigo-600 font-semibold hover:underline">${SITE_CONTACT_EMAIL}</a></dd>
                </div>
                <div class="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                    <dt class="text-sm font-medium text-gray-500">인터넷 도메인</dt>
                    <dd class="sm:col-span-2 text-sm"><a href="${SITE_INTERNET_DOMAIN}" class="text-indigo-600 font-semibold hover:underline">${SITE_INTERNET_DOMAIN}</a></dd>
                </div>
                <div class="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                    <dt class="text-sm font-medium text-gray-500">사업장 소재지</dt>
                    <dd class="sm:col-span-2 text-sm text-gray-900 leading-relaxed">${b.address}</dd>
                </div>
                <div class="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                    <dt class="text-sm font-medium text-gray-500">통신판매업 신고</dt>
                    <dd class="sm:col-span-2 text-sm text-gray-900">${b.mailOrderNo}</dd>
                </div>
            </dl>
        </div>
        <p class="mt-8 text-center text-sm text-gray-500 flex flex-wrap justify-center gap-x-2 gap-y-1 items-center">
            <a href="${SITE_FTC_BUSINESS_DETAIL_URL}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 font-semibold hover:underline">사업자정보확인</a>
            <span class="text-gray-300">·</span>
            <a href="/terms" class="text-indigo-600 hover:underline">이용약관</a>
            <span class="text-gray-300">·</span>
            <a href="/privacy" class="text-indigo-600 hover:underline">개인정보처리방침</a>
            <span class="text-gray-300">·</span>
            <a href="/refund" class="text-indigo-600 hover:underline">환불규정</a>
            <span class="text-gray-300">·</span>
            <a href="/community" class="text-indigo-600 hover:underline">공지 · FAQ</a>
        </p>
    </main>
    ${siteFloatingQuickMenuMarkup()}
    ${siteAiChatWidgetMarkup()}
    <script>${siteFloatingQuickMenuScript()}${siteAiChatWidgetScript()}</script>
</body>
</html>
  `)
})

export default app
