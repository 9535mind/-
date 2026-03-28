/**
 * 출판 의뢰 리포트 HTML 합성 · ZIP/전송용 인터페이스 뼈대
 * (실제 PDF 렌더는 브라우저 인쇄·외부 서비스·Worker PDF 라이브러리로 확장)
 */

export type PublishingReportInput = {
  title: string
  authorName: string
  isbn: string
  summary: string
  authorIntent?: string
  /** SVG 마크업 또는 바코드 이미지 URL */
  barcodeSvgOrUrl?: string
  generatedAtIso?: string
}

/**
 * 1페이지 분량 HTML (인쇄·PDF 변환용)
 */
export function buildPublishingReportHtml(data: PublishingReportInput): string {
  const when = data.generatedAtIso ?? new Date().toISOString()
  const safe = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const barcodeBlock = data.barcodeSvgOrUrl
    ? data.barcodeSvgOrUrl.trim().startsWith('<svg') || data.barcodeSvgOrUrl.trim().startsWith('<?xml')
      ? `<div class="barcode">${data.barcodeSvgOrUrl}</div>`
      : `<div class="barcode"><img src="${safe(data.barcodeSvgOrUrl)}" alt="ISBN 바코드" style="max-width:280px;height:auto" /></div>`
    : '<p class="muted">바코드 없음</p>'

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>${safe(data.title)} — 출판 의뢰서</title>
  <style>
    body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; max-width: 720px; margin: 2rem auto; padding: 1.5rem; color: #0f172a; }
    h1 { font-size: 1.35rem; border-bottom: 2px solid #4f46e5; padding-bottom: 0.5rem; }
    .meta { font-size: 0.9rem; color: #64748b; margin: 1rem 0; }
    section { margin-top: 1.25rem; }
    h2 { font-size: 1rem; color: #334155; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem 1rem; white-space: pre-wrap; }
    .barcode { margin: 1rem 0; }
    .muted { color: #94a3b8; font-size: 0.85rem; }
  </style>
</head>
<body>
  <h1>마인드스토리 · 디지털 출판 의뢰서</h1>
  <p class="meta">생성 시각(UTC): ${safe(when)}</p>
  <section>
    <h2>도서명</h2>
    <p class="box">${safe(data.title)}</p>
  </section>
  <section>
    <h2>저자</h2>
    <p class="box">${safe(data.authorName)}</p>
  </section>
  <section>
    <h2>ISBN-13</h2>
    <p class="box">${safe(data.isbn)}</p>
    ${barcodeBlock}
  </section>
  <section>
    <h2>줄거리 요약</h2>
    <p class="box">${safe(data.summary || '—')}</p>
  </section>
  ${
    data.authorIntent
      ? `<section><h2>작가 의도</h2><p class="box">${safe(data.authorIntent)}</p></section>`
      : ''
  }
</body>
</html>`
}

/** ZIP 패키징·클라우드 전송 — R2/S3 등 바인딩 시 구현 */
export type PublishPackagePayload = {
  reportHtml: string
  manuscriptUrl: string
  isbn: string
  title: string
}

export interface PublishPackageUploader {
  /** 원고·리포트 등을 묶어 업로드 후 공개 URL 또는 내부 키 반환 */
  uploadZip?(payload: PublishPackagePayload): Promise<{ ok: true; ref: string } | { ok: false; error: string }>
}

export const noopPublishUploader: PublishPackageUploader = {
  async uploadZip() {
    return { ok: false, error: 'ZIP 업로드 미구성 — Cloudflare R2 등 연동 후 구현' }
  },
}
