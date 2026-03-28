/**
 * 출판 승인 대기열 → ISBN 할당 → published_books (D1)
 * 기존 digital_books + isbn_inventory(book_id) 흐름과 병행
 */

export type ApproveSubmissionResult =
  | { ok: true; published_book_id: number; isbn: string; barcode_path: string }
  | { ok: false; reason: string }

/**
 * 트랜잭션에 가깝게: 사용 가능 ISBN 1건 점유 → published_books 삽입 → 제출건 승인 처리
 */
export async function approveBookSubmission(
  db: import('@cloudflare/workers-types').D1Database,
  submissionId: number,
): Promise<ApproveSubmissionResult> {
  const sub = await db
    .prepare(
      `SELECT id, user_id, title, author_name, summary, manuscript_url, author_intent, status
       FROM book_submissions WHERE id = ?`,
    )
    .bind(submissionId)
    .first<{
      id: number
      user_id: number
      title: string
      author_name: string
      summary: string
      manuscript_url: string
      author_intent: string
      status: string
    }>()

  if (!sub) return { ok: false, reason: '제출 건을 찾을 수 없습니다.' }
  if (sub.status !== 'pending') return { ok: false, reason: '대기(pending) 상태만 승인할 수 있습니다.' }

  const inv = await db
    .prepare(
      `SELECT id, isbn_number FROM isbn_inventory WHERE status = 'AVAILABLE' ORDER BY id ASC LIMIT 1`,
    )
    .first<{ id: number; isbn_number: string }>()

  if (!inv) return { ok: false, reason: '사용 가능한 ISBN 재고가 없습니다. ISBN 창고를 먼저 등록하세요.' }

  const lock = await db
    .prepare(
      `UPDATE isbn_inventory SET status = 'USED', assigned_at = datetime('now'), submission_id = ?
       WHERE id = ? AND status = 'AVAILABLE'`,
    )
    .bind(submissionId, inv.id)
    .run()

  if (lock.meta.changes !== 1) {
    return { ok: false, reason: 'ISBN 재고가 이미 소진되었거나 다른 요청에 할당되었습니다.' }
  }

  const isbn = inv.isbn_number

  const ins = await db
    .prepare(
      `INSERT INTO published_books (submission_id, user_id, title, author_name, summary, manuscript_url, isbn_number, barcode_path, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, '', datetime('now'))`,
    )
    .bind(
      submissionId,
      sub.user_id,
      sub.title,
      sub.author_name,
      sub.summary || '',
      sub.manuscript_url || '',
      isbn,
    )
    .run()

  const pbId = ins.meta.last_row_id
  if (!pbId) {
    await db.prepare(`UPDATE isbn_inventory SET status = 'AVAILABLE', assigned_at = NULL, submission_id = NULL WHERE id = ?`).bind(inv.id).run()
    return { ok: false, reason: '출판 레코드 생성에 실패했습니다.' }
  }

  const barcodePath = `/api/admin/published-books/${pbId}/barcode.svg`
  await db.prepare(`UPDATE published_books SET barcode_path = ? WHERE id = ?`).bind(barcodePath, pbId).run()

  await db
    .prepare(
      `UPDATE book_submissions SET status = 'approved', isbn_number = ?, published_book_id = ?, updated_at = datetime('now') WHERE id = ?`,
    )
    .bind(isbn, pbId, submissionId)
    .run()

  return { ok: true, published_book_id: pbId, isbn, barcode_path: barcodePath }
}
