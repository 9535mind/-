/**
 * 수료증 공개 확인 페이지 — 인쇄물·푸터의 /certificates/:번호 링크와 연결
 * GET /certificates/:number — 누구나 조회 (API와 동일 데이터, HTML)
 * GET /certificates?enrollment= — 로그인 후 해당 수강의 수료증 번호로 이동
 */

import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import type { Bindings } from '../types/database'
import { SQL_SESSION_S_VALID } from '../utils/helpers'
import { siteFooterLegalBlockHtml } from '../utils/site-footer-legal'

const app = new Hono<{ Bindings: Bindings }>()

function esc(s: string | number | null | undefined): string {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

app.get('/certificates', async (c) => {
  const enrollmentId = c.req.query('enrollment')
  if (!enrollmentId) {
    return c.redirect('/my-courses', 302)
  }

  const sessionToken = getCookie(c, 'session_token')
  if (!sessionToken) {
    const back = `/certificates?enrollment=${encodeURIComponent(enrollmentId)}`
    return c.redirect(`/login?redirect=${encodeURIComponent(back)}`, 302)
  }

  try {
    const { DB } = c.env
    const session = await DB.prepare(`
      SELECT u.id as user_id
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_token = ?
        AND ${SQL_SESSION_S_VALID}
        AND u.deleted_at IS NULL
    `).bind(sessionToken).first<{ user_id: number }>()

    if (!session) {
      const back = `/certificates?enrollment=${encodeURIComponent(enrollmentId)}`
      return c.redirect(`/login?redirect=${encodeURIComponent(back)}`, 302)
    }

    const row = await DB.prepare(`
      SELECT certificate_number
      FROM certificates
      WHERE enrollment_id = ? AND user_id = ?
      ORDER BY id DESC LIMIT 1
    `)
      .bind(Number(enrollmentId), session.user_id)
      .first<{ certificate_number: string }>()

    if (!row?.certificate_number) {
      return c.html(
        `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>수료증 없음</title><link rel="stylesheet" href="/static/css/app.css"/></head>
        <body class="bg-gray-50 min-h-screen flex items-center justify-center p-6">
          <div class="max-w-md text-center">
            <p class="text-gray-800 mb-4">이 수강에 발급된 수료증이 없거나 조회할 수 없습니다.</p>
            <a href="/my-courses" class="text-indigo-600 font-semibold hover:underline">내 강의실로</a>
          </div>
        </body></html>`,
        404,
      )
    }

    return c.redirect(`/certificates/${encodeURIComponent(row.certificate_number)}`, 302)
  } catch (e) {
    console.error('[certificates page] enrollment redirect:', e)
    return c.redirect('/my-courses', 302)
  }
})

app.get('/certificates/:number', async (c) => {
  const certificateNumber = c.req.param('number')
  if (!certificateNumber?.trim()) {
    return c.redirect('/my-courses', 302)
  }

  try {
    const { DB } = c.env
    const certificate = await DB.prepare(`
      SELECT 
        c.certificate_number,
        c.issue_date,
        c.completion_date,
        c.progress_rate,
        u.name as user_name,
        co.title as course_title
      FROM certificates c
      JOIN users u ON c.user_id = u.id
      JOIN courses co ON c.course_id = co.id
      WHERE c.certificate_number = ?
    `)
      .bind(certificateNumber)
      .first<{
        certificate_number: string
        issue_date: string
        completion_date: string
        progress_rate: number
        user_name: string
        course_title: string
      }>()

    if (!certificate) {
      return c.html(
        `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>수료증 조회</title><link rel="stylesheet" href="/static/css/app.css"/></head>
        <body class="bg-gray-50 min-h-screen flex items-center justify-center p-6">
          <div class="max-w-md text-center">
            <p class="text-gray-800 mb-2">등록되지 않은 수료증 번호입니다.</p>
            <p class="text-sm text-gray-500 mb-4">번호를 다시 확인하거나 기관에 문의해 주세요.</p>
            <a href="/" class="text-indigo-600 font-semibold hover:underline">홈으로</a>
          </div>
        </body></html>`,
        404,
      )
    }

    const issue = new Date(certificate.issue_date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>수료증 확인 - ${esc(certificate.certificate_number)}</title>
  <link rel="stylesheet" href="/static/css/app.css" />
</head>
<body class="bg-gray-50 text-gray-900 min-h-screen flex flex-col">
  <header class="bg-white border-b border-gray-200">
    <div class="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
      <a href="/" class="text-lg font-bold text-indigo-600">마인드스토리 원격평생교육원</a>
    </div>
  </header>
  <main class="flex-1 max-w-3xl w-full mx-auto px-4 py-10">
    <h1 class="text-2xl font-bold text-gray-900 mb-2">수료증 진위 확인</h1>
    <p class="text-sm text-gray-600 mb-8">아래 정보가 기관 발급 기록과 일치하면 유효한 수료증입니다.</p>
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <dl class="divide-y divide-gray-100">
        <div class="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-1">
          <dt class="text-sm font-medium text-gray-500">수료증 번호</dt>
          <dd class="sm:col-span-2 text-sm font-mono font-semibold">${esc(certificate.certificate_number)}</dd>
        </div>
        <div class="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-1">
          <dt class="text-sm font-medium text-gray-500">수료자</dt>
          <dd class="sm:col-span-2 text-sm">${esc(certificate.user_name)}</dd>
        </div>
        <div class="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-1">
          <dt class="text-sm font-medium text-gray-500">과정명</dt>
          <dd class="sm:col-span-2 text-sm">${esc(certificate.course_title)}</dd>
        </div>
        <div class="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-1">
          <dt class="text-sm font-medium text-gray-500">발급일</dt>
          <dd class="sm:col-span-2 text-sm">${esc(issue)}</dd>
        </div>
        <div class="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-1">
          <dt class="text-sm font-medium text-gray-500">이수 진도율</dt>
          <dd class="sm:col-span-2 text-sm">${esc(certificate.progress_rate)}%</dd>
        </div>
      </dl>
    </div>
  </main>
  <footer class="bg-gray-900 text-white py-10 mt-auto">
    <div class="max-w-3xl mx-auto px-4">
      ${siteFooterLegalBlockHtml()}
            <p class="mt-6 text-center text-xs text-gray-600">© 마인드스토리 원격평생교육원</p>
    </div>
  </footer>
</body>
</html>`)
  } catch (e) {
    console.error('[certificates page] public view:', e)
    return c.html(
      `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"/><title>오류</title><link rel="stylesheet" href="/static/css/app.css"/></head>
      <body class="p-6 text-center text-gray-600">일시적으로 조회할 수 없습니다.</body></html>`,
      500,
    )
  }
})

export default app
