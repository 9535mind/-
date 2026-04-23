import type { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { AppActor } from '../utils/actor'
import { getOrCreateActor } from '../utils/actor'
import { getAuthMode } from '../utils/auth-mode'
import { getCurrentUser } from '../utils/helpers'
import { Bindings } from '../types/database'

type Var = { actor: AppActor }

/**
 * /api/ms12/* : AUTH_MODE=required → 로그인만, optional/demo/disabled → guest 쿠키+actor
 */
export async function ms12Access(
  c: Context<{ Bindings: Bindings; Variables: Var }>,
  next: Next
) {
  if (getAuthMode(c) === 'required') {
    const user = await getCurrentUser(c)
    if (!user) {
      throw new HTTPException(401, { message: '로그인이 필요합니다.' })
    }
    c.set('actor', { type: 'user', id: String((user as { id: number }).id) } satisfies AppActor)
    await next()
    return
  }
  const a = await getOrCreateActor(c)
  if (!a) {
    throw new HTTPException(401, { message: 'actor를 결정할 수 없습니다.' })
  }
  c.set('actor', a)
  await next()
}
