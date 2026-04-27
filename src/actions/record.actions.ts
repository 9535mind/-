/**
 * 회의 기록(스냅샷) 저장·조회
 */

export type SaveRecordExtra = {
  title?: string
  meetingDate?: string
  roomId?: string
}

export async function saveRecord(
  meetingId: string,
  content: string,
  extra?: SaveRecordExtra,
): Promise<unknown> {
  const roomId = (extra?.roomId != null && String(extra.roomId).trim()) || String(meetingId || '').trim()
  const raw = String(content ?? '')
  const title =
    (extra?.title != null && String(extra.title).trim()) ||
    (roomId ? `회의 기록 (${roomId.slice(0, 8)})` : '회의 기록')
  const today = new Date().toISOString().slice(0, 10)
  const meetingDate = (extra?.meetingDate != null && String(extra.meetingDate).trim()) || today
  const r = await fetch('/api/ms12/meeting-records', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomId: roomId || null,
      title,
      meetingDate: meetingDate.slice(0, 10),
      rawNotes: raw,
    }),
  })
  return safeJson(r)
}

async function safeJson(r: Response): Promise<unknown> {
  try {
    return await r.json()
  } catch {
    return null
  }
}

export async function getRecentRecords(
  options?: { limit?: number; offset?: number },
): Promise<unknown> {
  console.log('[MS12 ACTION] getRecentRecords called')
  const limit = options?.limit != null ? Math.min(100, Math.max(1, options.limit)) : 20
  const offset = options?.offset != null ? Math.max(0, options.offset) : 0
  const q = new URLSearchParams()
  q.set('limit', String(limit))
  q.set('offset', String(offset))
  q.set('sort', 'updated_desc')
  const r = await fetch('/api/ms12/meeting-records?' + q.toString(), { credentials: 'include' })
  return safeJson(r)
}

/**
 * 최근 기록 API를 호출한 뒤 기록 목록 화면으로 이동(회의 허브「기록 보기」)
 */
export async function openRecordsList(): Promise<unknown> {
  const j = await getRecentRecords({ limit: 20 })
  if (typeof location !== 'undefined') {
    location.assign('/app/records')
  }
  return j
}
