import type { Context } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import type { Bindings } from '../types/database'
import { getCurrentUser, getMs12GuestIdFromRequest } from './helpers'
import { isSecureCookieRequest } from './session-cookie'
import { getAuthMode } from './auth-mode'

export type AppActor = { type: 'user'; id: string } | { type: 'guest'; id: string }

const GUEST_COOKIE = 'ms12_guest'
const GUEST_MAX_AGE = 60 * 60 * 24 * 30

function isUuidLike(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s.trim()
  )
}

/**
 * optional/disabled: 로그인 user 우선, 아니면 `ms12_guest` 쿠키 발급/재사용.
 * required: 로그인 없으면 `null` (MS12 write API 는 401).
 */
export async function getOrCreateActor(
  c: Context<{ Bindings: Bindings }>
): Promise<AppActor | null> {
  const user = await getCurrentUser(c)
  if (user) {
    return { type: 'user', id: String((user as { id: number }).id) }
  }
  if (getAuthMode(c) === 'required') {
    return null
  }
  let gid =
    getMs12GuestIdFromRequest(c) ||
    (getCookie(c, GUEST_COOKIE) || '').trim()
  if (!gid || !isUuidLike(gid)) {
    gid = crypto.randomUUID()
  }
  if ((getCookie(c, GUEST_COOKIE) || '').trim() !== gid) {
    setCookie(c, GUEST_COOKIE, gid, {
      path: '/',
      httpOnly: true,
      secure: isSecureCookieRequest(c),
      sameSite: 'Lax',
      maxAge: GUEST_MAX_AGE,
    })
  }
  return { type: 'guest', id: gid }
}

/**
 * GET /api/auth/me 전용: optional·disabled 는 항상 쿠키 보장(게스트 actor), required 는 user 없을 때 guest 미발급
 */
export async function ensureActorForMeEndpoint(
  c: Context<{ Bindings: Bindings }>
): Promise<AppActor | null> {
  const u = await getCurrentUser(c)
  if (u) return { type: 'user', id: String((u as { id: number }).id) }
  if (getAuthMode(c) === 'required') {
    return null
  }
  const a = await getOrCreateActor(c)
  return a as AppActor
}

export function participantKey(actor: AppActor): string {
  if (actor.type === 'user') return `u:${actor.id}`
  if (!actor.id) return 'g:invalid'
  return `g:${actor.id}`
}

export function isActorGuest(actor: AppActor): boolean {
  return actor.type === 'guest' && !!actor.id
}

export function isActorUser(actor: AppActor): boolean {
  return actor.type === 'user' && !!actor.id
}
