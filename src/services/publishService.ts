/**
 * MINDSTORY Next — ISBN 할당·출판 (D1)
 * Cloudflare Workers에서는 bwip-js 대신 SVG 바코드(/api/digital-books/:id/barcode.svg) 사용
 */

export type AssignIsbnResult = { ok: true; isbn: string; barcodePath: string } | { ok: false; reason: string }

const BARCODE_PATH = (bookId: number) => `/api/digital-books/${bookId}/barcode.svg`

/**
 * IsbnInventory에서 AVAILABLE 1건을 원자적으로 점유하고 digital_books에 반영
 */
export async function assignIsbnToDigitalBook(
  db: D1Database,
  bookId: number,
  userId: number,
): Promise<AssignIsbnResult> {
  const r1 = await db
    .prepare(
      `
    UPDATE isbn_inventory SET status = 'USED', assigned_at = datetime('now'), book_id = ?
    WHERE id = (SELECT id FROM isbn_inventory WHERE status = 'AVAILABLE' ORDER BY id ASC LIMIT 1)
    AND EXISTS (SELECT 1 FROM digital_books WHERE id = ? AND user_id = ?)
  `,
    )
    .bind(bookId, bookId, userId)
    .run()

  if (r1.meta.changes !== 1) {
    return { ok: false, reason: '사용 가능한 ISBN이 없거나 도서를 찾을 수 없습니다.' }
  }

  const row = await db
    .prepare(`SELECT isbn_number FROM isbn_inventory WHERE book_id = ?`)
    .bind(bookId)
    .first<{ isbn_number: string }>()

  if (!row?.isbn_number) {
    return { ok: false, reason: 'ISBN 조회 실패' }
  }

  const path = BARCODE_PATH(bookId)
  await db
    .prepare(
      `
    UPDATE digital_books SET
      isbn_number = ?,
      barcode_url = ?,
      status = 'published',
      updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `,
    )
    .bind(row.isbn_number, path, bookId, userId)
    .run()

  return { ok: true, isbn: row.isbn_number, barcodePath: path }
}

export async function getAvailableIsbnCount(db: D1Database): Promise<number> {
  const r = await db
    .prepare(`SELECT COUNT(*) as c FROM isbn_inventory WHERE status = 'AVAILABLE'`)
    .first<{ c: number }>()
  return Number(r?.c ?? 0)
}

/**
 * 출판 완료: ISBN 자동(과정 isbn_enabled)일 때 할당
 */
export async function finalizeBookPublication(
  db: D1Database,
  bookId: number,
  userId: number,
  courseIsbnEnabled: boolean,
): Promise<AssignIsbnResult | { ok: true; skipped: true }> {
  if (!courseIsbnEnabled) {
    await db
      .prepare(
        `UPDATE digital_books SET status = 'published', updated_at = datetime('now') WHERE id = ? AND user_id = ?`,
      )
      .bind(bookId, userId)
      .run()
    return { ok: true, skipped: true }
  }
  return assignIsbnToDigitalBook(db, bookId, userId)
}
