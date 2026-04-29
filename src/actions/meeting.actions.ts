/**
 * 회의 생성·입장·열람 — 버튼·(미래) 음성 명령·자비스가 동일 API 경로로 호출
 */

export type CreateMeetingInput = { title?: string; displayName?: string; type?: string }

export type CreateMeetingResult =
  | { kind: 'navigate'; path: '/app/meeting/new' }
  | { kind: 'created'; j: unknown }
  | { kind: 'error'; j?: unknown; error?: string }

async function safeJson(r: Response): Promise<unknown> {
  try {
    return await r.json()
  } catch {
    return null
  }
}

/** 제목·표시이름이 있으면 생성 API, 없으면 새 회의 폼(/app/meeting/new)로 이동(사용자 제스처에서만 호출) */
export async function createMeeting(
  input: CreateMeetingInput = {},
): Promise<CreateMeetingResult> {
  console.log('[MS12 ACTION] createMeeting called', input)
  const title = input.title != null ? String(input.title).trim() : ''
  if (!title) {
    if (typeof location !== 'undefined') {
      location.assign('/app/meeting/new')
    }
    return { kind: 'navigate', path: '/app/meeting/new' }
  }
  const body: { title: string; displayName?: string; type?: string } = { title }
  const dn = input.displayName != null ? String(input.displayName).trim() : ''
  if (dn) body.displayName = dn
  const t0 = input.type != null ? String(input.type).trim() : ''
  if (t0) body.type = t0
  const r = await fetch('/api/ms12/meetings', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (r.status === 401 || r.status === 403) {
    return {
      kind: 'error',
      error: '회의를 만들 수 없습니다. 잠시 후 다시 시도해 주세요.',
    }
  }
  const j = (await safeJson(r)) as
    | { success?: boolean; data?: { id?: string }; error?: string }
    | null
  if (j?.success && j?.data?.id) {
    const w = typeof window !== 'undefined' ? (window as { __ms12RecordMeetingLocal?: (d: unknown) => void }) : null
    if (w?.__ms12RecordMeetingLocal) {
      try {
        w.__ms12RecordMeetingLocal(j.data)
      } catch {
        /* ignore */
      }
    }
    if (typeof location !== 'undefined') {
      location.assign('/app/room/' + encodeURIComponent(String(j.data.id)))
    }
    return { kind: 'created', j }
  }
  return { kind: 'error', j: j ?? undefined, error: j?.error }
}

export type JoinMeetingResult =
  | { kind: 'navigate'; path: '/app/join' }
  | { kind: 'joined'; j: unknown }
  | { kind: 'error'; j?: unknown; error?: string; message?: string }

/** 코드가 없으면 참여 화면으로 이동. 있으면 /api/ms12/meetings/join */
export async function joinMeeting(
  code?: string,
  displayName?: string,
): Promise<JoinMeetingResult> {
  console.log(
    '[MS12 ACTION] joinMeeting called',
    (code && String(code).trim()) || '(no code)',
  )
  const c0 = (code && String(code).trim()) || ''
  if (!c0) {
    if (typeof location !== 'undefined') {
      location.assign('/app/join')
    }
    return { kind: 'navigate', path: '/app/join' }
  }
  const joinBody: { meetingCode: string; displayName?: string } = { meetingCode: c0 }
  const dn2 = displayName != null ? String(displayName).trim() : ''
  if (dn2) joinBody.displayName = dn2
  const r = await fetch('/api/ms12/meetings/join', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(joinBody),
  })
  const j = (await safeJson(r)) as
    | { success?: boolean; data?: { id?: string }; error?: string; message?: string }
    | null
  if (j?.success && j?.data?.id) {
    const w = typeof window !== 'undefined' ? (window as { __ms12RecordMeetingLocal?: (d: unknown) => void }) : null
    if (w?.__ms12RecordMeetingLocal) {
      try {
        w.__ms12RecordMeetingLocal(j.data)
      } catch {
        /* ignore */
      }
    }
    if (typeof location !== 'undefined') {
      location.assign('/app/room/' + encodeURIComponent(String(j.data.id)))
    }
    return { kind: 'joined', j }
  }
  const msg = (j && (j.error || j.message)) || '입장할 수 없습니다.'
  return { kind: 'error', j: j ?? undefined, error: j?.error, message: String(msg) }
}

/** id가 있는 회의방 URL로 이동(사용자 액션에서만) */
export function openMeeting(id: string): void {
  const sid = String(id || '').trim()
  if (!sid || typeof location === 'undefined') return
  location.assign('/app/room/' + encodeURIComponent(sid))
}

/** `/app/...` 보조 링크(보관함 등) */
export function openAppPath(path: string): void {
  if (typeof location === 'undefined') return
  const p = String(path || '').trim()
  if (p.startsWith('/app/')) {
    location.assign(p)
  }
}
