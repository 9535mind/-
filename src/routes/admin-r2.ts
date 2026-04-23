/**
 * 관리자 — R2(c.env.R2 / ms12-storage) 객체 목록 · 강좌 차시 자동 매칭
 * GET /api/admin/r2/list
 * POST /api/admin/r2/auto-match
 */

import { Hono } from 'hono'
import type { Bindings } from '../types/database'
import { requireAdmin } from '../middleware/auth'
import { successResponse, errorResponse } from '../utils/helpers'
import { getR2PublicBaseUrl } from '../utils/r2-image-upload'

const app = new Hono<{ Bindings: Bindings }>()

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i

function publicUrlForKey(env: Bindings, key: string): string {
  const base = getR2PublicBaseUrl(env)
  const path = key
    .replace(/^\/+/, '')
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/')
  return `${base}/${path}`
}

/** 파일명에서 제목 줄기 추출 (예: 메타인지_1편.mp4 → 메타인지) */
function extractStemFromR2Key(key: string): string {
  const base = key.split('/').pop() || key
  const noExt = base.replace(/\.(mp4|webm|mov|m4v)$/i, '')
  return noExt.replace(/_?\d+\s*편\s*$/u, '').replace(/[_\s-]+$/g, '').trim()
}

/** 파일명·경로에서 회차 숫자 추출 (예: 메타인지_1편, ep03, ...3편) */
export function extractEpisodeFromR2Key(key: string): number | null {
  const k = key.replace(/\\/g, '/')
  const m1 = k.match(/(\d+)\s*편/)
  if (m1) return parseInt(m1[1], 10)
  const m2 = k.match(/(?:ep|EP)[\s._-]*0*(\d{1,3})/)
  if (m2) return parseInt(m2[1], 10)
  const m3 = k.match(/[_\s-](\d{1,3})[_\s.-][^/]*\.(mp4|webm|mov|m4v)/i)
  if (m3) return parseInt(m3[1], 10)
  return null
}

app.get('/r2/list', requireAdmin, async (c) => {
  const bucket = c.env.R2
  if (!bucket) {
    return c.json(errorResponse('R2 바인딩이 없습니다. wrangler에 r2_buckets를 설정해 주세요.'), 503)
  }
  const prefix = String(c.req.query('prefix') ?? '').trim()
  const cursor = c.req.query('cursor') || undefined
  const limit = Math.min(1000, Math.max(1, parseInt(c.req.query('limit') || '500', 10) || 500))

  try {
    const listed = await bucket.list({
      prefix: prefix || undefined,
      limit,
      cursor,
    })
    const objects = (listed.objects || [])
      .filter((o) => VIDEO_EXT.test(o.key))
      .map((o) => ({
        key: o.key,
        size: o.size,
        uploaded: o.uploaded,
        publicUrl: publicUrlForKey(c.env, o.key),
      }))
    return c.json(
      successResponse({
        objects,
        truncated: listed.truncated,
        cursor: listed.truncated ? listed.cursor : null,
        publicBaseUrl: getR2PublicBaseUrl(c.env),
      }),
    )
  } catch (e) {
    console.error('[admin/r2/list]', e)
    return c.json(errorResponse('R2 목록을 불러오지 못했습니다.'), 500)
  }
})

app.post('/r2/auto-match', requireAdmin, async (c) => {
  const bucket = c.env.R2
  if (!bucket) {
    return c.json(errorResponse('R2 바인딩이 없습니다.'), 503)
  }
  let body: Record<string, unknown> = {}
  try {
    body = await c.req.json()
  } catch {
    /* ignore */
  }
  const courseId = parseInt(String(body.course_id ?? ''), 10)
  const dryRun = body.dry_run === true || body.dry_run === 1
  const prefix = String(body.prefix ?? '').trim()

  if (!Number.isFinite(courseId) || courseId <= 0) {
    return c.json(errorResponse('course_id가 필요합니다.'), 400)
  }

  const { DB } = c.env

  const lessons = await DB.prepare(
    `SELECT id, lesson_number, title FROM lessons WHERE course_id = ? ORDER BY lesson_number ASC`,
  )
    .bind(courseId)
    .all<{ id: number; lesson_number: number; title: string }>()

  const rows = lessons.results || []
  if (rows.length === 0) {
    return c.json(errorResponse('해당 강좌에 등록된 차시가 없습니다.'), 400)
  }

  const videoKeys: { key: string; episode: number | null }[] = []
  let cursor: string | undefined
  do {
    const listed = await bucket.list({ prefix: prefix || undefined, limit: 1000, cursor })
    for (const o of listed.objects || []) {
      if (!VIDEO_EXT.test(o.key)) continue
      videoKeys.push({
        key: o.key,
        episode: extractEpisodeFromR2Key(o.key),
      })
    }
    cursor = listed.truncated ? listed.cursor : undefined
  } while (cursor)

  if (videoKeys.length === 0) {
    return c.json(errorResponse('R2에 매칭할 영상 파일(.mp4 등)이 없습니다.'), 400)
  }

  /** 회차(episode) → 첫 번째 키 */
  const byEpisode = new Map<number, string>()
  for (const { key, episode } of videoKeys) {
    if (episode == null || episode < 1) continue
    if (!byEpisode.has(episode)) byEpisode.set(episode, key)
  }

  const updates: Array<{ lessonId: number; lessonNumber: number; key: string; publicUrl: string }> = []
  const skipped: Array<{ lesson_number: number; title: string; reason: string }> = []

  for (const L of rows) {
    const num = L.lesson_number
    let key = byEpisode.get(num) || null
    if (!key) {
      const fromTitle = String(L.title || '').match(/(\d+)\s*편/)
      if (fromTitle) {
        const ep = parseInt(fromTitle[1], 10)
        key = byEpisode.get(ep) || null
      }
    }
    /** 제목에 파일명 줄기가 포함되고 회차가 일치하는 경우 (예: 제목 "메타인지 1편" ↔ 메타인지_1편.mp4) */
    if (!key) {
      const title = String(L.title || '')
      const titleCompact = title.replace(/\s+/g, '')
      const epFromTitle = title.match(/(\d+)\s*편/)
      const epTarget = epFromTitle ? parseInt(epFromTitle[1], 10) : num
      for (const vk of videoKeys) {
        const stem = extractStemFromR2Key(vk.key)
        const ep = extractEpisodeFromR2Key(vk.key)
        if (!stem || stem.length < 2 || ep == null) continue
        if (ep !== epTarget) continue
        const stemCompact = stem.replace(/\s+/g, '')
        if (titleCompact.includes(stemCompact)) {
          key = vk.key
          break
        }
      }
    }
    if (!key) {
      skipped.push({ lesson_number: num, title: L.title, reason: '회차에 맞는 R2 파일 없음' })
      continue
    }
    updates.push({
      lessonId: L.id,
      lessonNumber: num,
      key,
      publicUrl: publicUrlForKey(c.env, key),
    })
  }

  if (dryRun) {
    return c.json(successResponse({ dry_run: true, wouldUpdate: updates, skipped, r2VideoCount: videoKeys.length }))
  }

  const applied: typeof updates = []
  for (const u of updates) {
    try {
      await DB.prepare(
        `UPDATE lessons SET video_url = ?, video_type = 'R2', updated_at = datetime('now') WHERE id = ?`,
      )
        .bind(u.publicUrl, u.lessonId)
        .run()
      applied.push(u)
    } catch (e) {
      console.error('[admin/r2/auto-match] update failed', u.lessonId, e)
    }
  }

  return c.json(successResponse({ updated: applied, skipped, r2VideoCount: videoKeys.length }))
})

export default app
