/**
 * 관리자 대시보드 API 라우트
 */

import { Hono } from 'hono'
import { Bindings, DashboardStats } from '../types/database'
import { successResponse, errorResponse, hashPassword } from '../utils/helpers'
import { requireAdmin } from '../middleware/auth'
import { approveBookSubmission } from '../services/publishPipeline'
import { ean13Svg } from '../utils/ean13-svg'
import { buildPublishingReportHtml } from '../utils/publish-helper'
import { normalizeCategoryGroupInput } from '../utils/catalog-lines'

const admin = new Hono<{ Bindings: Bindings }>()

function generateTemporaryPassword(length: number = 14): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const digits = '23456789'
  const symbols = '!@#$%^&*'
  const all = upper + lower + digits + symbols

  const pick = (chars: string) => chars[crypto.getRandomValues(new Uint32Array(1))[0] % chars.length]
  const required = [pick(upper), pick(lower), pick(digits), pick(symbols)]
  const rest = Array.from({ length: Math.max(0, length - required.length) }, () => pick(all))
  const chars = [...required, ...rest]

  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

// 대시보드 통계 (상세)
admin.get('/dashboard/stats', requireAdmin, async (c) => {
  const { DB } = c.env

  try {
    // 기본 통계
    const [users, courses, activeEnroll] = await Promise.all([
      DB.prepare(`SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL`).first(),
      DB.prepare(`SELECT COUNT(*) as count FROM courses WHERE status = 'published'`).first(),
      DB.prepare(`SELECT COUNT(*) as count FROM enrollments WHERE completed_at IS NULL`).first(),
    ])

    // 이번 달 매출 (payments 테이블이 없으므로 0으로 설정)
    const monthlyRevenue = 0

    return c.json(successResponse({
      total_users: users?.count || 0,
      total_courses: courses?.count || 0,
      active_enrollments: activeEnroll?.count || 0,
      monthly_revenue: monthlyRevenue
    }))
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return c.json(errorResponse('통계 조회 실패'), 500)
  }
})

// 대시보드 통계
admin.get('/dashboard', requireAdmin, async (c) => {
  const { DB } = c.env

  const [users, courses, enrollments, activeEnroll, completedEnroll] = await Promise.all([
    DB.prepare(`SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL`).first(),
    DB.prepare(`SELECT COUNT(*) as count FROM courses WHERE status = 'published'`).first(),
    DB.prepare(`SELECT COUNT(*) as count FROM enrollments`).first(),
    DB.prepare(`SELECT COUNT(*) as count FROM enrollments WHERE completed_at IS NULL`).first(),
    DB.prepare(`SELECT COUNT(*) as count FROM enrollments WHERE completed_at IS NOT NULL`).first(),
  ])
  
  // payments 테이블이 없으므로 revenue는 0으로 설정
  const revenue = { total: 0 }

  const recentEnroll = await DB.prepare(`
    SELECT e.*, u.name as user_name, c.title as course_title
    FROM enrollments e
    JOIN users u ON e.user_id = u.id
    JOIN courses c ON e.course_id = c.id
    ORDER BY e.enrolled_at DESC
    LIMIT 10
  `).all()

  const popularCourses = await DB.prepare(`
    SELECT c.*, COUNT(e.id) as enrollment_count
    FROM courses c
    LEFT JOIN enrollments e ON c.id = e.course_id
    WHERE c.status = 'published'
    GROUP BY c.id
    ORDER BY enrollment_count DESC
    LIMIT 5
  `).all()

  const stats: DashboardStats = {
    totalUsers: users?.count || 0,
    totalCourses: courses?.count || 0,
    totalEnrollments: enrollments?.count || 0,
    totalRevenue: revenue?.total || 0,
    activeEnrollments: activeEnroll?.count || 0,
    completedEnrollments: completedEnroll?.count || 0,
    recentEnrollments: recentEnroll.results,
    popularCourses: popularCourses.results
  }

  return c.json(successResponse(stats))
})

/** 오늘의 핵심 지표 — 중앙 관제탑 카드용 */
admin.get('/dashboard/pulse', requireAdmin, async (c) => {
  const { DB } = c.env
  try {
    const signupRow = await DB.prepare(`
      SELECT COUNT(*) as c FROM users
      WHERE deleted_at IS NULL AND date(created_at) = date('now')
    `).first<{ c: number }>()
    const signup_today = Number(signupRow?.c ?? 0)

    let payment_today = 0
    try {
      const pay = await DB.prepare(`
        SELECT COALESCE(SUM(amount), 0) as s FROM orders
        WHERE status = 'paid' AND paid_at IS NOT NULL
        AND date(paid_at) = date('now')
      `).first<{ s: number }>()
      payment_today = Number(pay?.s ?? 0)
    } catch {
      try {
        const pay2 = await DB.prepare(`
          SELECT COALESCE(SUM(final_amount), 0) as s FROM payments
          WHERE status = 'completed' AND paid_at IS NOT NULL
          AND date(paid_at) = date('now')
        `).first<{ s: number }>()
        payment_today = Number(pay2?.s ?? 0)
      } catch {
        payment_today = 0
      }
    }

    let unanswered_inquiries = 0
    try {
      const inq = await DB.prepare(`
        SELECT COUNT(*) as c FROM support_inquiries WHERE status = 'open'
      `).first<{ c: number }>()
      unanswered_inquiries = Number(inq?.c ?? 0)
    } catch {
      unanswered_inquiries = 0
    }

    return c.json(
      successResponse({
        signup_today,
        payment_today,
        unanswered_inquiries,
      }),
    )
  } catch (error) {
    console.error('Dashboard pulse error:', error)
    return c.json(errorResponse('지표 조회 실패'), 500)
  }
})

function mapUserListRow(r: Record<string, unknown>) {
  const role = String(r.role ?? '')
  const company = String(r.organization_name ?? r.company_name ?? '').trim()
  const approved = Number(r.approved ?? 1)
  const rawStatus = String(r.account_status ?? '').toLowerCase()
  let segment = 'general'
  let segment_label = '일반'
  if (role === 'admin') {
    segment = 'admin'
    segment_label = '관리자'
  } else if (role === 'instructor' || role === 'teacher') {
    segment = 'instructor'
    segment_label = '강사'
  } else if (company) {
    segment = 'b2b'
    segment_label = 'B2B'
  }
  let status_label = role === 'admin' ? '관리자' : '활성'
  if (approved === 0 || rawStatus === 'pending') status_label = '승인 대기'
  else if (rawStatus === 'suspended' || rawStatus === 'banned') status_label = '정지'
  else if (rawStatus === 'inactive') status_label = '비활성'
  return { ...r, segment, segment_label, status_label, organization_name: company }
}

/** 빠른 필터: 미수강(진도0) / 승인대기 / 7일미접속 / 미결제 / 오늘가입 */
function appendMemberQuickFilterConditions(conditions: string[], filter: string) {
  const f = (filter || '').toLowerCase().trim()
  if (!f || f === 'none') return

  switch (f) {
    case 'no_progress':
      conditions.push(`NOT EXISTS (
        SELECT 1 FROM enrollments e
        WHERE e.user_id = u.id AND COALESCE(e.progress, 0) > 0
      )`)
      break
    case 'b2b_pending':
      conditions.push(`IFNULL(u.approved, 1) = 0`)
      break
    case 'inactive_7d':
      conditions.push(`COALESCE(
        (SELECT MAX(s.created_at) FROM sessions s WHERE s.user_id = u.id),
        '1970-01-01'
      ) < datetime('now', '-7 days')`)
      break
    case 'unpaid':
      conditions.push(`NOT EXISTS (
        SELECT 1 FROM orders o
        WHERE o.user_id = u.id AND o.status = 'paid' AND o.paid_at IS NOT NULL
      )`)
      break
    case 'today_signup':
      conditions.push(`date(u.created_at) = date('now')`)
      break
    default:
      break
  }
}

/** D1에 phone / company_name 마이그레이션 전에도 목록이 깨지지 않도록 단계적 폴백 */
async function adminListUsersQuery(
  DB: D1Database,
  opts: {
    limit: number
    offset: number
    q: string
    type: string
    filter: string
    mode: 'full' | 'legacy' | 'minimal'
  },
): Promise<{ rows: Record<string, unknown>[]; total: number }> {
  const { limit, offset, q, type, filter } = opts
  const supportsDeletedAt = opts.mode !== 'minimal'
  const conditions: string[] = supportsDeletedAt ? ['u.deleted_at IS NULL'] : ['1 = 1']
  const binds: (string | number)[] = []

  // full 모드에서만 확장 컬럼/status·org 조인·부가 테이블(sessions/orders) 의존 필터를 사용
  if (opts.mode === 'full') {
    appendMemberQuickFilterConditions(conditions, filter)
  }

  if (q) {
    const like = `%${q.replace(/%/g, '\\%')}%`
    if (opts.mode === 'full') {
      conditions.push(
        `(u.email LIKE ? ESCAPE '\\' OR u.name LIKE ? ESCAPE '\\' OR IFNULL(u.phone,'') LIKE ? ESCAPE '\\')`,
      )
      binds.push(like, like, like)
    } else {
      conditions.push(`(u.email LIKE ? ESCAPE '\\' OR u.name LIKE ? ESCAPE '\\')`)
      binds.push(like, like)
    }
  }

  if (opts.mode === 'full') {
    if (type === 'general') {
      conditions.push(`u.role = 'student' AND u.org_id IS NULL`)
    } else if (type === 'b2b') {
      conditions.push(`u.org_id IS NOT NULL`)
    } else if (type === 'instructor') {
      conditions.push(`u.role IN ('instructor','teacher')`)
    }
  } else {
    if (type === 'instructor') {
      conditions.push(`u.role IN ('instructor','teacher')`)
    } else if (type === 'general') {
      conditions.push(`u.role = 'student'`)
    } else if (type === 'b2b') {
      conditions.push('1 = 0')
    }
  }

  const whereSql = conditions.join(' AND ')
  const orderByFull =
    opts.mode === 'full' && type === 'b2b'
      ? `COALESCE(o.name, u.company_name, '') ASC, u.created_at DESC`
      : `u.created_at DESC`

  let listSql: string
  let countSql: string

  if (opts.mode === 'full') {
    listSql = `
      SELECT u.id, u.email, u.name, u.phone, u.role, u.created_at,
        COALESCE(o.name, u.company_name, '') AS organization_name,
        COALESCE(u.company_name, '') AS company_name,
        IFNULL(u.approved, 1) AS approved,
        IFNULL(u.org_id, NULL) AS org_id,
        IFNULL(u.status, '') AS account_status,
        (SELECT MAX(s.created_at) FROM sessions s WHERE s.user_id = u.id) AS last_access_at
      FROM users u
      LEFT JOIN organizations o ON o.id = u.org_id
      WHERE ${whereSql}
      ORDER BY ${orderByFull}
      LIMIT ? OFFSET ?
    `
    countSql = `SELECT COUNT(*) as count FROM users u WHERE ${whereSql}`
  } else if (opts.mode === 'legacy') {
    listSql = `
      SELECT u.id, u.email, u.name, u.role, u.created_at,
        '' AS phone,
        '' AS organization_name,
        '' AS company_name,
        1 AS approved,
        NULL AS org_id,
        IFNULL(u.status, '') AS account_status,
        (SELECT MAX(s.created_at) FROM sessions s WHERE s.user_id = u.id) AS last_access_at
      FROM users u
      WHERE ${whereSql}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `
    countSql = `SELECT COUNT(*) as count FROM users u WHERE ${whereSql}`
  } else {
    listSql = `
      SELECT u.id, u.email, u.name, u.role, u.created_at,
        '' AS phone,
        '' AS organization_name,
        '' AS company_name,
        1 AS approved,
        NULL AS org_id,
        '' AS account_status,
        NULL AS last_access_at
      FROM users u
      WHERE ${whereSql}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `
    countSql = `SELECT COUNT(*) as count FROM users u WHERE ${whereSql}`
  }

  const listBinds = [...binds, limit, offset]
  const [users, total] = await Promise.all([
    DB.prepare(listSql).bind(...listBinds).all(),
    DB.prepare(countSql).bind(...binds).first<{ count: number }>(),
  ])
  return {
    rows: (users.results ?? []) as Record<string, unknown>[],
    total: Number(total?.count ?? 0),
  }
}

// 전체 회원 목록 — 검색(?q 이름·이메일·연락처), 구분(?type all|general|b2b|instructor), 페이지네이션, 기본 limit 50
admin.get('/users', requireAdmin, async (c) => {
  const { DB } = c.env
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10) || 1)
  let limit = parseInt(c.req.query('limit') || '50', 10) || 50
  limit = Math.min(Math.max(limit, 1), 100)
  const offset = (page - 1) * limit
  const q = (c.req.query('q') || '').trim()
  const type = (c.req.query('type') || 'all').toLowerCase()
  const filter = (c.req.query('filter') || '').trim()

  const baseOpts = { limit, offset, q, type, filter }

  const modes: Array<'full' | 'legacy' | 'minimal'> = ['full', 'legacy', 'minimal']
  let lastErr: unknown
  for (const mode of modes) {
    try {
      const { rows, total } = await adminListUsersQuery(DB, { ...baseOpts, mode })
      const data = rows.map(mapUserListRow)
      return c.json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      })
    } catch (e) {
      lastErr = e
      console.warn(`[admin/users] list mode=${mode} failed, trying fallback:`, e)
    }
  }
  console.error('Admin users list error (all modes failed):', lastErr)
  return c.json(errorResponse('회원 목록 조회 실패'), 500)
})

/** POST /api/admin/users/:userId/approve — 가입 승인 처리 */
admin.post('/users/:userId/approve', requireAdmin, async (c) => {
  const { DB } = c.env
  const userId = c.req.param('userId')
  try {
    const result = await DB.prepare(`
      UPDATE users
      SET approved = 1,
          status = CASE WHEN status = 'pending' OR status IS NULL OR TRIM(status) = '' THEN 'active' ELSE status END,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(userId).run()
    if (result.meta.changes === 0) {
      return c.json(errorResponse('회원을 찾을 수 없습니다'), 404)
    }
    return c.json(successResponse({ id: Number(userId) }, '가입 승인 완료'))
  } catch (error) {
    console.error('Approve user error:', error)
    return c.json(errorResponse('가입 승인 처리 실패'), 500)
  }
})

/** GET /api/admin/organizations — B2B 기관 목록 (팝업 대상 선택 등) */
admin.get('/organizations', requireAdmin, async (c) => {
  const { DB } = c.env
  try {
    const r = await DB.prepare(
      `SELECT id, name FROM organizations ORDER BY name COLLATE NOCASE`,
    ).all<{ id: number; name: string }>()
    return c.json(successResponse(r.results ?? []))
  } catch {
    return c.json(successResponse([]))
  }
})

function sanitizeNoticeContent(html: string): string {
  return String(html || '').replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
}

/** GET /api/admin/notices — 공지 목록 */
admin.get('/notices', requireAdmin, async (c) => {
  const { DB } = c.env
  try {
    const result = await DB.prepare(`
      SELECT
        n.id, n.title, n.content, n.is_pinned, n.is_published, n.view_count, n.target_org_id,
        n.created_at, n.updated_at,
        o.name AS organization_name
      FROM notices n
      LEFT JOIN organizations o ON o.id = n.target_org_id
      ORDER BY n.is_pinned DESC, n.created_at DESC
    `).all()
    return c.json(successResponse(result.results ?? []))
  } catch (e) {
    console.warn('[admin/notices] list with org join failed:', e)
    try {
      const result = await DB.prepare(`
        SELECT
          id, title, content, is_pinned, is_published, view_count, target_org_id,
          created_at, updated_at,
          NULL AS organization_name
        FROM notices
        ORDER BY is_pinned DESC, created_at DESC
      `).all()
      return c.json(successResponse(result.results ?? []))
    } catch (error) {
      console.error('List notices error:', error)
      return c.json(errorResponse('공지 목록 조회 실패'), 500)
    }
  }
})

/** GET /api/admin/notices/:id */
admin.get('/notices/:id', requireAdmin, async (c) => {
  const { DB } = c.env
  const id = parseInt(c.req.param('id'), 10)
  if (!Number.isFinite(id)) return c.json(errorResponse('잘못된 ID입니다.'), 400)
  try {
    const row = await DB.prepare(`
      SELECT n.*, o.name AS organization_name
      FROM notices n
      LEFT JOIN organizations o ON o.id = n.target_org_id
      WHERE n.id = ?
    `).bind(id).first()
    if (!row) return c.json(errorResponse('공지를 찾을 수 없습니다.'), 404)
    return c.json(successResponse(row))
  } catch {
    try {
      const row = await DB.prepare(`SELECT * FROM notices WHERE id = ?`).bind(id).first()
      if (!row) return c.json(errorResponse('공지를 찾을 수 없습니다.'), 404)
      return c.json(successResponse(row))
    } catch (error) {
      console.error('Get notice error:', error)
      return c.json(errorResponse('공지 조회 실패'), 500)
    }
  }
})

/** POST /api/admin/notices */
admin.post('/notices', requireAdmin, async (c) => {
  const { DB } = c.env
  try {
    const body = (await c.req.json()) as {
      title?: string
      content?: string | null
      is_pinned?: number | boolean
      is_published?: number | boolean
      target_org_id?: number | string | null
    }
    const title = String(body.title || '').trim()
    if (!title) return c.json(errorResponse('제목을 입력해 주세요.'), 400)
    const content = sanitizeNoticeContent(body.content != null ? String(body.content) : '')
    const is_pinned = body.is_pinned != null ? (Number(body.is_pinned) ? 1 : 0) : 0
    const is_published = body.is_published != null ? (Number(body.is_published) ? 1 : 0) : 1
    let target_org_id: number | null = null
    if (body.target_org_id != null && String(body.target_org_id).trim() !== '') {
      const n = parseInt(String(body.target_org_id), 10)
      target_org_id = Number.isFinite(n) ? n : null
    }

    const result = await DB.prepare(`
      INSERT INTO notices (title, content, is_pinned, is_published, view_count, target_org_id)
      VALUES (?, ?, ?, ?, 0, ?)
    `).bind(title, content || null, is_pinned, is_published, target_org_id).run()

    return c.json(successResponse({ id: result.meta.last_row_id }, '공지가 등록되었습니다.'))
  } catch (error) {
    console.error('Create notice error:', error)
    return c.json(errorResponse('공지 등록 실패'), 500)
  }
})

/** PUT /api/admin/notices/:id */
admin.put('/notices/:id', requireAdmin, async (c) => {
  const { DB } = c.env
  const id = parseInt(c.req.param('id'), 10)
  if (!Number.isFinite(id)) return c.json(errorResponse('잘못된 ID입니다.'), 400)
  try {
    const body = (await c.req.json()) as {
      title?: string
      content?: string | null
      is_pinned?: number | boolean
      is_published?: number | boolean
      target_org_id?: number | string | null
    }
    const title = String(body.title || '').trim()
    if (!title) return c.json(errorResponse('제목을 입력해 주세요.'), 400)
    const content = sanitizeNoticeContent(body.content != null ? String(body.content) : '')
    const is_pinned = body.is_pinned != null ? (Number(body.is_pinned) ? 1 : 0) : 0
    const is_published = body.is_published != null ? (Number(body.is_published) ? 1 : 0) : 1
    let target_org_id: number | null = null
    if (body.target_org_id != null && String(body.target_org_id).trim() !== '') {
      const n = parseInt(String(body.target_org_id), 10)
      target_org_id = Number.isFinite(n) ? n : null
    }

    const ex = await DB.prepare(`SELECT id FROM notices WHERE id = ?`).bind(id).first()
    if (!ex) return c.json(errorResponse('공지를 찾을 수 없습니다.'), 404)

    await DB.prepare(`
      UPDATE notices SET
        title = ?,
        content = ?,
        is_pinned = ?,
        is_published = ?,
        target_org_id = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(title, content || null, is_pinned, is_published, target_org_id, id).run()

    return c.json(successResponse({ id }, '공지가 수정되었습니다.'))
  } catch (error) {
    console.error('Update notice error:', error)
    return c.json(errorResponse('공지 수정 실패'), 500)
  }
})

/** DELETE /api/admin/notices/:id */
admin.delete('/notices/:id', requireAdmin, async (c) => {
  const { DB } = c.env
  const id = parseInt(c.req.param('id'), 10)
  if (!Number.isFinite(id)) return c.json(errorResponse('잘못된 ID입니다.'), 400)
  try {
    const ex = await DB.prepare(`SELECT id FROM notices WHERE id = ?`).bind(id).first()
    if (!ex) return c.json(errorResponse('공지를 찾을 수 없습니다.'), 404)
    await DB.prepare(`DELETE FROM notices WHERE id = ?`).bind(id).run()
    return c.json(successResponse(null, '공지가 삭제되었습니다.'))
  } catch (error) {
    console.error('Delete notice error:', error)
    return c.json(errorResponse('공지 삭제 실패'), 500)
  }
})

function sanitizePostContentAdmin(html: string): string {
  return String(html || '').replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
}

const ADMIN_POST_CATEGORIES = new Set(['qna', 'review', 'general'])

/** GET /api/admin/posts — 커뮤니티 게시글 목록 (posts 테이블) */
admin.get('/posts', requireAdmin, async (c) => {
  const { DB } = c.env
  try {
    const result = await DB.prepare(`
      SELECT id, title, content, author, category, is_published, view_count, user_id, created_at, updated_at
      FROM posts
      ORDER BY created_at DESC
    `).all()
    return c.json(successResponse(result.results ?? []))
  } catch (error) {
    console.warn('[admin/posts] list failed:', error)
    try {
      const result = await DB.prepare(`
        SELECT id, title, content, author, category, is_published, view_count, created_at, updated_at
        FROM posts
        ORDER BY created_at DESC
      `).all()
      return c.json(successResponse(result.results ?? []))
    } catch {
      return c.json(successResponse([]))
    }
  }
})

/** GET /api/admin/posts/:id */
admin.get('/posts/:id', requireAdmin, async (c) => {
  const { DB } = c.env
  const id = parseInt(c.req.param('id'), 10)
  if (!Number.isFinite(id)) return c.json(errorResponse('잘못된 ID입니다.'), 400)
  try {
    const row = await DB.prepare(
      `SELECT id, title, content, author, category, is_published, view_count, user_id, created_at, updated_at FROM posts WHERE id = ?`,
    )
      .bind(id)
      .first()
    if (!row) return c.json(errorResponse('게시글을 찾을 수 없습니다.'), 404)
    return c.json(successResponse(row))
  } catch {
    try {
      const row = await DB.prepare(`SELECT * FROM posts WHERE id = ?`).bind(id).first()
      if (!row) return c.json(errorResponse('게시글을 찾을 수 없습니다.'), 404)
      return c.json(successResponse(row))
    } catch (error) {
      console.error('[admin/posts/:id] get:', error)
      return c.json(errorResponse('게시글 조회 실패'), 500)
    }
  }
})

/** PUT /api/admin/posts/:id — 수정·숨김(is_published=0) */
admin.put('/posts/:id', requireAdmin, async (c) => {
  const { DB } = c.env
  const id = parseInt(c.req.param('id'), 10)
  if (!Number.isFinite(id)) return c.json(errorResponse('잘못된 ID입니다.'), 400)
  try {
    const body = (await c.req.json()) as {
      title?: string
      content?: string | null
      author?: string | null
      category?: string
      is_published?: number | boolean
    }
    const title = String(body.title || '').trim()
    if (!title) return c.json(errorResponse('제목을 입력해 주세요.'), 400)
    const content = sanitizePostContentAdmin(body.content != null ? String(body.content) : '')
    const author = String(body.author != null ? body.author : '').trim() || null
    const rawCat = String(body.category || 'general').toLowerCase()
    const category = ADMIN_POST_CATEGORIES.has(rawCat) ? rawCat : 'general'
    const is_published = body.is_published != null ? (Number(body.is_published) ? 1 : 0) : 1

    const ex = await DB.prepare(`SELECT id FROM posts WHERE id = ?`).bind(id).first()
    if (!ex) return c.json(errorResponse('게시글을 찾을 수 없습니다.'), 404)

    await DB.prepare(
      `
      UPDATE posts SET
        title = ?,
        content = ?,
        author = ?,
        category = ?,
        is_published = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `,
    )
      .bind(title, content || null, author, category, is_published, id)
      .run()

    return c.json(successResponse({ id }, '저장되었습니다.'))
  } catch (error) {
    console.error('[admin/posts/:id] put:', error)
    return c.json(errorResponse('게시글 저장 실패'), 500)
  }
})

/** DELETE /api/admin/posts/:id — 영구 삭제 */
admin.delete('/posts/:id', requireAdmin, async (c) => {
  const { DB } = c.env
  const id = parseInt(c.req.param('id'), 10)
  if (!Number.isFinite(id)) return c.json(errorResponse('잘못된 ID입니다.'), 400)
  try {
    const ex = await DB.prepare(`SELECT id FROM posts WHERE id = ?`).bind(id).first()
    if (!ex) return c.json(errorResponse('게시글을 찾을 수 없습니다.'), 404)
    await DB.prepare(`DELETE FROM posts WHERE id = ?`).bind(id).run()
    return c.json(successResponse(null, '삭제되었습니다.'))
  } catch (error) {
    console.error('[admin/posts/:id] delete:', error)
    return c.json(errorResponse('게시글 삭제 실패'), 500)
  }
})

// 전체 수강 신청 관리
admin.get('/enrollments', requireAdmin, async (c) => {
  const { DB } = c.env
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = (page - 1) * limit

  const [enrollments, total] = await Promise.all([
    DB.prepare(`
      SELECT e.*, u.name as user_name, u.email, c.title as course_title
      FROM enrollments e
      JOIN users u ON e.user_id = u.id
      JOIN courses c ON e.course_id = c.id
      ORDER BY e.enrolled_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all(),
    DB.prepare(`SELECT COUNT(*) as count FROM enrollments`).first()
  ])

  return c.json({
    success: true,
    data: enrollments.results,
    pagination: {
      page,
      limit,
      total: total?.count || 0,
      totalPages: Math.ceil((total?.count || 0) / limit)
    }
  })
})

/** DELETE /api/admin/enrollments/:id — 수강 취소(관리자) */
admin.delete('/enrollments/:id', requireAdmin, async (c) => {
  const { DB } = c.env
  const enrollmentId = c.req.param('id')
  try {
    await DB.prepare(`DELETE FROM lesson_progress WHERE enrollment_id = ?`).bind(enrollmentId).run()
    const result = await DB.prepare(`DELETE FROM enrollments WHERE id = ?`).bind(enrollmentId).run()
    if (result.meta.changes === 0) {
      return c.json(errorResponse('수강 정보를 찾을 수 없습니다'), 404)
    }
    return c.json(successResponse(null, '수강이 취소되었습니다'))
  } catch (error) {
    console.error('Delete enrollment error:', error)
    return c.json(errorResponse('수강 취소 실패'), 500)
  }
})

// 전체 결제 내역
admin.get('/payments', requireAdmin, async (c) => {
  const { DB } = c.env
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = (page - 1) * limit

  try {
    const [payments, total] = await Promise.all([
      DB.prepare(`
        SELECT p.*, u.name as user_name, u.email, c.title as course_title
        FROM payments p
        JOIN users u ON p.user_id = u.id
        JOIN courses c ON p.course_id = c.id
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `).bind(limit, offset).all(),
      DB.prepare(`SELECT COUNT(*) as count FROM payments`).first()
    ])

    return c.json({
      success: true,
      data: payments.results || [],
      pagination: {
        page,
        limit,
        total: total?.count || 0,
        totalPages: Math.ceil((total?.count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Admin payments error:', error)
    // 에러 발생 시 빈 배열 반환
    return c.json({
      success: true,
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0
      }
    })
  }
})

// 수료증 관리
admin.get('/certificates', requireAdmin, async (c) => {
  const { DB } = c.env

  const result = await DB.prepare(`
    SELECT cert.*, u.name as user_name, u.email, c.title as course_title
    FROM certificates cert
    JOIN users u ON cert.user_id = u.id
    JOIN courses c ON cert.course_id = c.id
    ORDER BY cert.created_at DESC
  `).all()

  return c.json(successResponse(result.results))
})

// 강좌 편집 폼 옵션 (강사/자격증 유형)
admin.get('/course-form-options', requireAdmin, async (c) => {
  const { DB } = c.env
  try {
    let instructors: Array<{ id: number; name: string; email: string }> = []
    let certificate_types: Array<{ id: number; name: string }> = []

    try {
      const inst = await DB.prepare(`
        SELECT id, COALESCE(NULLIF(TRIM(name), ''), email) AS name, email
        FROM users
        WHERE role = 'instructor' AND deleted_at IS NULL
        ORDER BY id DESC
        LIMIT 200
      `).all<{ id: number; name: string; email: string }>()
      instructors = inst.results ?? []
    } catch (e) {
      console.warn('[admin/course-form-options] instructors load fail:', e)
    }

    try {
      const certTypes = await DB.prepare(`
        SELECT id, name
        FROM certification_types
        WHERE is_active = 1
        ORDER BY sort_order ASC, id ASC
        LIMIT 200
      `).all<{ id: number; name: string }>()
      certificate_types = certTypes.results ?? []
    } catch (e) {
      console.warn('[admin/course-form-options] certification_types load fail:', e)
      certificate_types = []
    }

    return c.json(successResponse({ instructors, certificate_types }))
  } catch (error) {
    console.error('Get course form options error:', error)
    return c.json(errorResponse('강좌 옵션 조회 실패'), 500)
  }
})

/** 시험 목록 (관제탑 교육 기둥) — 테이블 없으면 빈 배열 */
admin.get('/exams', requireAdmin, async (c) => {
  const { DB } = c.env
  try {
    const rows = await DB.prepare(`
      SELECT e.id, e.course_id, e.title, e.status, e.question_count, e.created_at, e.updated_at,
        c.title AS course_title
      FROM exams e
      LEFT JOIN courses c ON c.id = e.course_id
      ORDER BY e.updated_at DESC
      LIMIT 200
    `).all()
    return c.json(successResponse(rows.results ?? []))
  } catch (e) {
    console.warn('[admin/exams] table missing or error:', e)
    return c.json(successResponse([]))
  }
})

/** 교육 대시보드 — KPI (courses, lesson_progress, certification_applications, exam_attempts) */
admin.get('/edu-dashboard/summary', requireAdmin, async (c) => {
  const { DB } = c.env
  let total_courses = 0
  let avg_lesson_progress = 0
  let cert_pending = 0
  let exam_attempts_today = 0
  try {
    const row = await DB.prepare(`SELECT COUNT(*) as c FROM courses`).first<{ c: number }>()
    total_courses = Number(row?.c ?? 0)
  } catch (e) {
    console.warn('[admin/edu-dashboard/summary] courses:', e)
  }
  try {
    const row = await DB.prepare(`SELECT AVG(watch_percentage) as a FROM lesson_progress`).first<{ a: number | null }>()
    const v = row?.a != null ? Number(row.a) : 0
    avg_lesson_progress = Math.round(v * 10) / 10
  } catch (e) {
    console.warn('[admin/edu-dashboard/summary] lesson_progress:', e)
  }
  try {
    const row = await DB.prepare(
      `SELECT COUNT(*) as c FROM certification_applications WHERE LOWER(TRIM(status)) = 'pending'`,
    ).first<{ c: number }>()
    cert_pending = Number(row?.c ?? 0)
  } catch (e) {
    console.warn('[admin/edu-dashboard/summary] certification_applications:', e)
  }
  try {
    const row = await DB.prepare(
      `SELECT COUNT(*) as c FROM exam_attempts
       WHERE strftime('%Y-%m-%d', started_at) = strftime('%Y-%m-%d', 'now')`,
    ).first<{ c: number }>()
    exam_attempts_today = Number(row?.c ?? 0)
  } catch (e) {
    console.warn('[admin/edu-dashboard/summary] exam_attempts:', e)
  }
  return c.json(
    successResponse({
      total_courses,
      avg_lesson_progress,
      cert_pending,
      exam_attempts_today,
    }),
  )
})

/** 최근 lesson_progress 갱신 (학습 활동) */
admin.get('/edu-dashboard/recent-activity', requireAdmin, async (c) => {
  const { DB } = c.env
  try {
    const rows = await DB.prepare(`
      SELECT lp.updated_at AS activity_at,
             u.id AS user_id,
             u.name AS user_name,
             c.title AS course_title,
             l.title AS lesson_title,
             lp.watch_percentage
      FROM lesson_progress lp
      JOIN enrollments en ON en.id = lp.enrollment_id
      JOIN users u ON u.id = en.user_id AND u.deleted_at IS NULL
      JOIN courses c ON c.id = en.course_id
      JOIN lessons l ON l.id = lp.lesson_id
      ORDER BY lp.updated_at DESC
      LIMIT 25
    `).all()
    return c.json(successResponse(rows.results ?? []))
  } catch (e) {
    console.warn('[admin/edu-dashboard/recent-activity]', e)
    return c.json(successResponse([]))
  }
})

/** 자격증(민간자격) 신청 대기 */
admin.get('/edu-dashboard/cert-pending', requireAdmin, async (c) => {
  const { DB } = c.env
  try {
    const rows = await DB.prepare(`
      SELECT ca.id,
             ca.user_id,
             u.name AS user_name,
             ca.applicant_name,
             ca.application_number,
             COALESCE(ct.name, '자격 유형') AS certification_name,
             ca.created_at
      FROM certification_applications ca
      JOIN users u ON u.id = ca.user_id AND u.deleted_at IS NULL
      LEFT JOIN certification_types ct ON ct.id = ca.certification_type_id
      WHERE LOWER(TRIM(ca.status)) = 'pending'
      ORDER BY ca.created_at DESC
      LIMIT 30
    `).all()
    return c.json(successResponse(rows.results ?? []))
  } catch (e) {
    console.warn('[admin/edu-dashboard/cert-pending]', e)
    return c.json(successResponse([]))
  }
})

/**
 * 강좌 관리 API
 */

// 강좌 목록 (관리자용)
admin.get('/courses', requireAdmin, async (c) => {
  const { DB } = c.env

  try {
    const courses = await DB.prepare(`
      SELECT c.*, COUNT(e.id) as enrolled_count
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `).all()

    return c.json(successResponse(courses.results))
  } catch (error) {
    console.error('Get courses error:', error)
    return c.json(errorResponse('강좌 목록 조회 실패'), 500)
  }
})

// 강좌 생성
admin.post('/courses', requireAdmin, async (c) => {
  const { DB } = c.env

  try {
    const body = await c.req.json()
    const {
      title,
      description,
      thumbnail_url,
      status = 'draft',
      price: rawPrice,
      sale_price: rawSalePrice,
      is_free: rawIsFree,
      instructor_id: rawInstructorId,
      certificate_id: rawCertificateId,
      duration_days: rawDurationDays,
      validity_unlimited: rawValidityUnlimited,
      category_group: rawCg,
      next_cohort_start_date: rawDate,
      schedule_info: rawScheduleInfo,
      difficulty: rawDifficulty,
    } = body as {
      title?: string
      description?: string | null
      thumbnail_url?: string | null
      status?: string
      price?: number | string | null
      sale_price?: number | string | null
      is_free?: number | boolean | null
      instructor_id?: number | string | null
      certificate_id?: number | string | null
      duration_days?: number | string | null
      validity_unlimited?: number | boolean | null
      category_group?: string | null
      next_cohort_start_date?: string | null
      schedule_info?: string | null
      difficulty?: string | null
    }

    // 필수 필드 검증 (설명은 AI 초안·빈 값 허용)
    if (!title || String(title).trim() === '') {
      return c.json(errorResponse('필수 항목을 입력해주세요'), 400)
    }
    const descriptionText = description != null ? String(description) : ''
    const difficultyAllowed = ['beginner', 'intermediate', 'advanced'] as const
    const difficulty =
      rawDifficulty != null &&
      String(rawDifficulty).trim() !== '' &&
      difficultyAllowed.includes(String(rawDifficulty).trim() as (typeof difficultyAllowed)[number])
        ? String(rawDifficulty).trim()
        : 'beginner'

    let categoryGroup = 'CLASSIC'
    if (rawCg !== undefined && rawCg !== null && String(rawCg).trim() !== '') {
      categoryGroup = normalizeCategoryGroupInput(rawCg)
    }

    const nextCohort =
      rawDate !== undefined && rawDate !== null && String(rawDate).trim() !== ''
        ? String(rawDate).trim().slice(0, 32)
        : null
    if (nextCohort && !/^\d{4}-\d{2}-\d{2}$/.test(nextCohort)) {
      return c.json(errorResponse('next_cohort_start_date는 YYYY-MM-DD 형식이어야 합니다'), 400)
    }
    const scheduleInfo =
      rawScheduleInfo !== undefined && rawScheduleInfo !== null && String(rawScheduleInfo).trim() !== ''
        ? String(rawScheduleInfo).trim().slice(0, 2000)
        : null

    const price = Math.max(0, parseInt(String(rawPrice ?? '0'), 10) || 0)
    const salePrice =
      rawSalePrice === undefined || rawSalePrice === null || String(rawSalePrice).trim() === ''
        ? null
        : Math.max(0, parseInt(String(rawSalePrice), 10) || 0)
    const isFree = rawIsFree != null ? (Number(rawIsFree) ? 1 : 0) : price <= 0 ? 1 : 0
    const validityUnlimited = Number(rawValidityUnlimited) ? 1 : 0
    const durationDays = validityUnlimited ? 0 : Math.max(0, parseInt(String(rawDurationDays ?? '30'), 10) || 30)

    // 기본값: 현재 로그인 관리자
    const session = c.get('session')
    const instructorId =
      rawInstructorId !== undefined && rawInstructorId !== null && String(rawInstructorId).trim() !== ''
        ? parseInt(String(rawInstructorId), 10) || null
        : session?.user_id || null
    const certificateId =
      rawCertificateId !== undefined && rawCertificateId !== null && String(rawCertificateId).trim() !== ''
        ? parseInt(String(rawCertificateId), 10) || null
        : null

    const result = await DB.prepare(`
      INSERT INTO courses (
        title, description, thumbnail_url, instructor_id, status,
        price, sale_price, discount_price, is_free, certificate_id, duration_days, validity_unlimited,
        category_group,
        next_cohort_start_date, schedule_info,
        difficulty,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(
      title,
      descriptionText,
      thumbnail_url || null,
      instructorId,
      status,
      price,
      salePrice,
      salePrice,
      isFree,
      certificateId,
      durationDays,
      validityUnlimited,
      categoryGroup,
      nextCohort,
      scheduleInfo,
      difficulty
    ).run()

    return c.json(successResponse({
      id: result.meta.last_row_id,
      message: '강좌가 등록되었습니다'
    }))
  } catch (error) {
    console.error('Create course error:', error)
    return c.json(errorResponse('강좌 등록 실패: ' + (error as Error).message), 500)
  }
})

// 강좌 수정
admin.put('/courses/:id', requireAdmin, async (c) => {
  const { DB } = c.env
  const courseId = c.req.param('id')

  try {
    const body = await c.req.json()
    const {
      title,
      description,
      thumbnail_url,
      status,
      price: rawPrice,
      sale_price: rawSalePrice,
      is_free: rawIsFree,
      instructor_id: rawInstructorId,
      certificate_id: rawCertificateId,
      duration_days: rawDurationDays,
      validity_unlimited: rawValidityUnlimited,
      category_group: rawCg,
      next_cohort_start_date: rawDate,
      schedule_info: rawScheduleInfo,
      difficulty: rawDifficulty,
    } = body as {
      title?: string
      description?: string | null
      thumbnail_url?: string | null
      status?: string
      price?: number | string | null
      sale_price?: number | string | null
      is_free?: number | boolean | null
      instructor_id?: number | string | null
      certificate_id?: number | string | null
      duration_days?: number | string | null
      validity_unlimited?: number | boolean | null
      category_group?: string | null
      next_cohort_start_date?: string | null
      schedule_info?: string | null
      difficulty?: string | null
    }

    // 필수 필드 검증 (설명은 빈 값 허용)
    if (!title || String(title).trim() === '') {
      return c.json(errorResponse('필수 항목을 입력해주세요'), 400)
    }
    const descriptionText = description != null ? String(description) : ''
    const difficultyAllowedPut = ['beginner', 'intermediate', 'advanced'] as const
    const difficulty =
      rawDifficulty != null &&
      String(rawDifficulty).trim() !== '' &&
      difficultyAllowedPut.includes(String(rawDifficulty).trim() as (typeof difficultyAllowedPut)[number])
        ? String(rawDifficulty).trim()
        : 'beginner'

    let categoryGroup: string | null = null
    if (rawCg !== undefined && rawCg !== null && String(rawCg).trim() !== '') {
      categoryGroup = normalizeCategoryGroupInput(rawCg)
    }

    const nextCohort =
      rawDate !== undefined && rawDate !== null && String(rawDate).trim() !== ''
        ? String(rawDate).trim().slice(0, 32)
        : null
    if (nextCohort && !/^\d{4}-\d{2}-\d{2}$/.test(nextCohort)) {
      return c.json(errorResponse('next_cohort_start_date는 YYYY-MM-DD 형식이어야 합니다'), 400)
    }
    const scheduleInfo =
      rawScheduleInfo !== undefined && rawScheduleInfo !== null && String(rawScheduleInfo).trim() !== ''
        ? String(rawScheduleInfo).trim().slice(0, 2000)
        : null

    const price = Math.max(0, parseInt(String(rawPrice ?? '0'), 10) || 0)
    const salePrice =
      rawSalePrice === undefined || rawSalePrice === null || String(rawSalePrice).trim() === ''
        ? null
        : Math.max(0, parseInt(String(rawSalePrice), 10) || 0)
    const isFree = rawIsFree != null ? (Number(rawIsFree) ? 1 : 0) : price <= 0 ? 1 : 0
    const validityUnlimited = Number(rawValidityUnlimited) ? 1 : 0
    const durationDays = validityUnlimited ? 0 : Math.max(0, parseInt(String(rawDurationDays ?? '30'), 10) || 30)
    const instructorId =
      rawInstructorId !== undefined && rawInstructorId !== null && String(rawInstructorId).trim() !== ''
        ? parseInt(String(rawInstructorId), 10) || null
        : null
    const certificateId =
      rawCertificateId !== undefined && rawCertificateId !== null && String(rawCertificateId).trim() !== ''
        ? parseInt(String(rawCertificateId), 10) || null
        : null

    const result = categoryGroup
      ? await DB.prepare(`
      UPDATE courses SET
        title = ?,
        description = ?,
        thumbnail_url = ?,
        status = ?,
        price = ?,
        sale_price = ?,
        discount_price = ?,
        is_free = ?,
        instructor_id = ?,
        certificate_id = ?,
        duration_days = ?,
        validity_unlimited = ?,
        category_group = ?,
        next_cohort_start_date = ?,
        schedule_info = ?,
        difficulty = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
        title,
        descriptionText,
        thumbnail_url || null,
        status,
        price,
        salePrice,
        salePrice,
        isFree,
        instructorId,
        certificateId,
        durationDays,
        validityUnlimited,
        categoryGroup,
        nextCohort,
        scheduleInfo,
        difficulty,
        courseId
      ).run()
      : await DB.prepare(`
      UPDATE courses SET
        title = ?,
        description = ?,
        thumbnail_url = ?,
        status = ?,
        price = ?,
        sale_price = ?,
        discount_price = ?,
        is_free = ?,
        instructor_id = ?,
        certificate_id = ?,
        duration_days = ?,
        validity_unlimited = ?,
        next_cohort_start_date = ?,
        schedule_info = ?,
        difficulty = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
        title,
        descriptionText,
        thumbnail_url || null,
        status,
        price,
        salePrice,
        salePrice,
        isFree,
        instructorId,
        certificateId,
        durationDays,
        validityUnlimited,
        nextCohort,
        scheduleInfo,
        difficulty,
        courseId
      ).run()

    if (result.meta.changes === 0) {
      return c.json(errorResponse('강좌를 찾을 수 없습니다'), 404)
    }

    return c.json(successResponse({ message: '강좌가 수정되었습니다' }))
  } catch (error) {
    console.error('Update course error:', error)
    return c.json(errorResponse('강좌 수정 실패: ' + (error as Error).message), 500)
  }
})

/** PATCH /api/admin/courses/:id — 상태·브랜드·Classic 상단 노출 등 */
admin.patch('/courses/:id', requireAdmin, async (c) => {
  const { DB } = c.env
  const courseId = c.req.param('id')
  try {
    const body = await c.req.json()
    const {
      status,
      highlight_classic,
      category_group,
      isbn_enabled,
      course_subtype,
      feature_flags,
    } = body as {
      status?: string
      highlight_classic?: number
      category_group?: string
      isbn_enabled?: number
      course_subtype?: string
      feature_flags?: string
    }

    const sets: string[] = []
    const vals: unknown[] = []

    if (status !== undefined) {
      const allowed = ['draft', 'inactive', 'active', 'published']
      if (!allowed.includes(status)) {
        return c.json(errorResponse('허용되지 않는 상태입니다'), 400)
      }
      sets.push('status = ?')
      vals.push(status)
    }
    if (highlight_classic !== undefined) {
      sets.push('highlight_classic = ?')
      vals.push(highlight_classic ? 1 : 0)
    }
    if (category_group !== undefined) {
      const csv = normalizeCategoryGroupInput(category_group)
      sets.push('category_group = ?')
      vals.push(csv)
    }
    if (isbn_enabled !== undefined) {
      sets.push('isbn_enabled = ?')
      vals.push(isbn_enabled ? 1 : 0)
    }
    if (course_subtype !== undefined) {
      sets.push('course_subtype = ?')
      vals.push(String(course_subtype).toUpperCase())
    }
    if (feature_flags !== undefined) {
      sets.push('feature_flags = ?')
      vals.push(typeof feature_flags === 'string' ? feature_flags : JSON.stringify(feature_flags))
    }

    if (sets.length === 0) {
      return c.json(errorResponse('갱신할 필드가 없습니다'), 400)
    }

    vals.push(courseId)
    const sql = `UPDATE courses SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`
    const result = await DB.prepare(sql)
      .bind(...vals)
      .run()
    if (result.meta.changes === 0) {
      return c.json(errorResponse('강좌를 찾을 수 없습니다'), 404)
    }
    return c.json(successResponse({ id: courseId }, '강좌가 갱신되었습니다'))
  } catch (error) {
    console.error('Patch course error:', error)
    return c.json(errorResponse('강좌 상태 변경 실패'), 500)
  }
})

// 강좌 삭제
admin.delete('/courses/:id', requireAdmin, async (c) => {
  const { DB } = c.env
  const courseId = c.req.param('id')

  try {
    // 수강생 확인
    const enrollments = await DB.prepare(`
      SELECT COUNT(*) as count FROM enrollments WHERE course_id = ?
    `).bind(courseId).first()

    if (enrollments && enrollments.count > 0) {
      return c.json(errorResponse('수강생이 있는 강좌는 삭제할 수 없습니다'), 400)
    }

    // 강좌 삭제
    const result = await DB.prepare(`
      DELETE FROM courses WHERE id = ?
    `).bind(courseId).run()

    if (result.meta.changes === 0) {
      return c.json(errorResponse('강좌를 찾을 수 없습니다'), 404)
    }

    return c.json(successResponse({ message: '강좌가 삭제되었습니다' }))
  } catch (error) {
    console.error('Delete course error:', error)
    return c.json(errorResponse('강좌 삭제 실패'), 500)
  }
})

/**
 * GET /api/admin/videos
 * 모든 영상 목록 조회 (관리자 전용)
 * lessons 스키마가 마이그레이션 전(0008 기준)이면 content_type 등 컬럼이 없어 500이 날 수 있어 폴백 쿼리 사용
 */
admin.get('/videos', requireAdmin, async (c) => {
  const { DB } = c.env

  const extendedSql = `
      SELECT 
        l.id as lesson_id,
        l.lesson_number,
        l.title as lesson_title,
        l.description,
        l.video_url,
        l.video_provider,
        l.video_duration_minutes,
        l.is_free_preview,
        l.status,
        l.created_at,
        c.id as course_id,
        c.title as course_title
      FROM lessons l
      JOIN courses c ON l.course_id = c.id
      WHERE (l.content_type = 'video' OR l.content_type IS NULL)
        AND l.video_url IS NOT NULL
        AND TRIM(l.video_url) != ''
      ORDER BY l.created_at DESC
    `

  /** 최소 스키마: migrations/0008_add_lessons_and_sample_data.sql */
  const legacySql = `
      SELECT 
        l.id as lesson_id,
        l.lesson_number,
        l.title as lesson_title,
        l.description,
        l.video_url,
        l.video_type as video_provider,
        l.duration_minutes as video_duration_minutes,
        l.is_free as is_free_preview,
        NULL as status,
        l.created_at,
        c.id as course_id,
        c.title as course_title
      FROM lessons l
      JOIN courses c ON l.course_id = c.id
      WHERE l.video_url IS NOT NULL AND TRIM(l.video_url) != ''
      ORDER BY l.created_at DESC
    `

  try {
    const result = await DB.prepare(extendedSql).all()
    return c.json(successResponse(result.results ?? []))
  } catch (e) {
    console.warn('[admin/videos] extended query failed, using legacy lessons schema:', e)
    try {
      const result = await DB.prepare(legacySql).all()
      return c.json(successResponse(result.results ?? []))
    } catch (error) {
      console.error('Get videos error:', error)
      return c.json(errorResponse('영상 목록 조회 실패'), 500)
    }
  }
})

/**
 * POST /api/admin/users/:userId/reset-password
 * 사용자 비밀번호 초기화 (관리자 전용)
 */
admin.post('/users/:userId/reset-password', requireAdmin, async (c) => {
  try {
    const userId = c.req.param('userId')
    const { mode } = await c.req.json<{ mode?: 'manual' | 'ai' }>()
    const { DB } = c.env
    
    // 사용자 존재 확인
    const user = await DB.prepare(`
      SELECT id, name, email FROM users WHERE id = ?
    `).bind(userId).first()
    
    if (!user) {
      return c.json(errorResponse('사용자를 찾을 수 없습니다.'), 404)
    }
    
    // 예측 가능한 기본값 금지: 항상 랜덤 임시 비밀번호 발급
    let newPassword = generateTemporaryPassword()
    
    const hashedPassword = await hashPassword(newPassword)

    try {
      await DB.prepare(`
        UPDATE users 
        SET password_hash = ?, password_reset_required = 1, updated_at = datetime('now') 
        WHERE id = ?
      `).bind(hashedPassword, userId).run()
    } catch {
      // 마이그레이션 적용 전 호환성
      await DB.prepare(`
        UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?
      `).bind(hashedPassword, userId).run()
    }
    
    console.log(`Password reset for user ${userId}: ${newPassword}`)
    
    return c.json(successResponse({
      new_password: newPassword,
      mode: mode || 'manual'
    }, '비밀번호가 초기화되었습니다.'))
    
  } catch (error) {
    console.error('Reset password error:', error)
    return c.json(errorResponse('비밀번호 초기화에 실패했습니다.'), 500)
  }
})

// 회원별 수강 목록(진도 요약)
admin.get('/users/:userId/enrollments', requireAdmin, async (c) => {
  const { DB } = c.env
  const userId = c.req.param('userId')
  try {
    const rows = await DB.prepare(`
      SELECT e.id, e.course_id, e.enrolled_at, e.progress, e.completed_at,
             c.title as course_title,
             (SELECT ROUND(AVG(COALESCE(lp.watch_percentage,0)),0) FROM lesson_progress lp WHERE lp.enrollment_id = e.id) as avg_progress
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE e.user_id = ?
      ORDER BY e.enrolled_at DESC
    `).bind(userId).all()
    return c.json(successResponse(rows.results ?? []))
  } catch (error) {
    console.error('Get user enrollments error:', error)
    return c.json(errorResponse('수강 목록 조회 실패'), 500)
  }
})

// 회원 상세 조회
admin.get('/users/:userId', requireAdmin, async (c) => {
  const { DB } = c.env
  const userId = c.req.param('userId')

  try {
    // 회원 기본 정보
    const user = await DB.prepare(`
      SELECT u.id, u.email, u.name, u.phone, u.phone_verified, u.birth_date, u.role, u.status,
             IFNULL(u.approved, 1) AS approved, u.org_id,
             terms_agreed, privacy_agreed, marketing_agreed,
             u.created_at, u.updated_at, u.last_login_at,
             COALESCE(o.name, u.company_name, '') AS organization_name,
             COALESCE(u.company_name, '') AS company_name
      FROM users u
      LEFT JOIN organizations o ON o.id = u.org_id
      WHERE u.id = ?
    `).bind(userId).first()

    if (!user) {
      return c.json(errorResponse('회원을 찾을 수 없습니다'), 404)
    }

    // 수강 통계
    const enrollStats = await DB.prepare(`
      SELECT 
        COUNT(*) as total_enrollments,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_enrollments,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_enrollments
      FROM enrollments
      WHERE user_id = ?
    `).bind(userId).first()

    // 결제 통계
    const paymentStats = await DB.prepare(`
      SELECT 
        COUNT(*) as total_payments,
        SUM(CASE WHEN status = 'completed' THEN final_amount ELSE 0 END) as total_paid,
        MAX(paid_at) as last_payment_date
      FROM payments
      WHERE user_id = ?
    `).bind(userId).first()

    return c.json(successResponse({
      ...user,
      enrollments: enrollStats || { total_enrollments: 0, active_enrollments: 0, completed_enrollments: 0 },
      payments: paymentStats || { total_payments: 0, total_paid: 0, last_payment_date: null }
    }))
  } catch (error) {
    console.error('Get user detail error:', error)
    return c.json(errorResponse('회원 정보 조회 실패'), 500)
  }
})

/** POST /api/admin/isbn/bulk — ISBN 대량 등록 */
admin.post('/isbn/bulk', requireAdmin, async (c) => {
  const { DB } = c.env
  try {
    const body = await c.req.json<{ numbers?: string[] }>()
    const raw = body.numbers
    if (!Array.isArray(raw) || raw.length === 0) {
      return c.json(errorResponse('numbers 배열이 필요합니다'), 400)
    }
    let inserted = 0
    for (const n of raw) {
      const isbn = String(n).replace(/\D/g, '')
      if (isbn.length !== 13) continue
      try {
        await DB.prepare(
          `INSERT INTO isbn_inventory (isbn_number, status) VALUES (?, 'AVAILABLE')`,
        )
          .bind(isbn)
          .run()
        inserted++
      } catch {
        /* UNIQUE 등 무시 */
      }
    }
    return c.json(successResponse({ inserted, total_requested: raw.length }))
  } catch (error) {
    console.error('ISBN bulk error:', error)
    return c.json(errorResponse('ISBN 등록 실패'), 500)
  }
})

/** GET /api/admin/isbn/stats */
admin.get('/isbn/stats', requireAdmin, async (c) => {
  const { DB } = c.env
  try {
    const a = await DB.prepare(`SELECT COUNT(*) as c FROM isbn_inventory WHERE status = 'AVAILABLE'`).first<{
      c: number
    }>()
    const u = await DB.prepare(`SELECT COUNT(*) as c FROM isbn_inventory WHERE status = 'USED'`).first<{ c: number }>()
    return c.json(
      successResponse({
        available: Number(a?.c ?? 0),
        used: Number(u?.c ?? 0),
      }),
    )
  } catch (error) {
    console.error('ISBN stats error:', error)
    return c.json(errorResponse('통계 조회 실패'), 500)
  }
})

/** GET /api/admin/digital-books — 발행·ISBN 연계 현황 */
admin.get('/digital-books', requireAdmin, async (c) => {
  const { DB } = c.env
  try {
    const rows = await DB.prepare(`
      SELECT db.id, db.user_id, u.name as user_name, u.email,
             db.course_id, c.title as course_title,
             db.title, db.isbn_number, db.barcode_url, db.status, db.updated_at
      FROM digital_books db
      JOIN users u ON u.id = db.user_id
      LEFT JOIN courses c ON c.id = db.course_id
      ORDER BY db.updated_at DESC
      LIMIT 200
    `).all()
    return c.json(successResponse(rows.results ?? []))
  } catch (error) {
    console.error('Admin digital-books error:', error)
    return c.json(errorResponse('목록 조회 실패'), 500)
  }
})

/** GET /api/admin/digital-books/:id — 도서 상세 (슬라이드 패널) */
admin.get('/digital-books/:id', requireAdmin, async (c) => {
  const { DB } = c.env
  const id = parseInt(c.req.param('id'), 10)
  if (Number.isNaN(id)) return c.json(errorResponse('잘못된 ID'), 400)
  try {
    const row = await DB.prepare(
      `SELECT db.*, u.name AS user_name, u.email AS user_email,
              c.title AS course_title,
              (SELECT ii.status FROM isbn_inventory ii WHERE ii.book_id = db.id ORDER BY ii.id DESC LIMIT 1) AS isbn_inventory_status,
              (SELECT ii.isbn_number FROM isbn_inventory ii WHERE ii.book_id = db.id ORDER BY ii.id DESC LIMIT 1) AS inv_isbn
       FROM digital_books db
       JOIN users u ON u.id = db.user_id
       LEFT JOIN courses c ON c.id = db.course_id
       WHERE db.id = ?`,
    )
      .bind(id)
      .first()
    if (!row) return c.json(errorResponse('없음'), 404)
    return c.json(successResponse(row))
  } catch (error) {
    console.error('digital-books get error:', error)
    return c.json(errorResponse('조회 실패'), 500)
  }
})

/** 출판·ISBN 대시보드 KPI */
admin.get('/pub-dashboard/summary', requireAdmin, async (c) => {
  const { DB } = c.env
  let total_digital_books = 0
  let isbn_approval_pending = 0
  let published_this_month = 0
  let cumulative_paid_orders = 0
  try {
    const r = await DB.prepare(`SELECT COUNT(*) as c FROM digital_books`).first<{ c: number }>()
    total_digital_books = Number(r?.c ?? 0)
  } catch (e) {
    console.warn('[pub-dashboard] digital_books', e)
  }
  try {
    const r = await DB.prepare(`SELECT COUNT(*) as c FROM book_submissions WHERE status = 'pending'`).first<{ c: number }>()
    isbn_approval_pending = Number(r?.c ?? 0)
  } catch (e) {
    console.warn('[pub-dashboard] book_submissions', e)
  }
  try {
    const r = await DB.prepare(
      `SELECT COUNT(*) as c FROM published_books
       WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`,
    ).first<{ c: number }>()
    published_this_month = Number(r?.c ?? 0)
  } catch (e) {
    console.warn('[pub-dashboard] published_books', e)
  }
  try {
    const r = await DB.prepare(`SELECT COUNT(*) as c FROM orders WHERE status = 'paid'`).first<{ c: number }>()
    cumulative_paid_orders = Number(r?.c ?? 0)
  } catch (e) {
    console.warn('[pub-dashboard] orders', e)
  }
  return c.json(
    successResponse({
      total_digital_books,
      isbn_approval_pending,
      published_this_month,
      cumulative_paid_orders,
    }),
  )
})

/** 출판 리스트 (도서명·저자·ISBN 상태·발행일) */
admin.get('/pub-dashboard/publishing-list', requireAdmin, async (c) => {
  const { DB } = c.env
  try {
    const rows = await DB.prepare(`
      SELECT db.id, db.user_id, db.title, u.name AS author_name, db.isbn_number, db.status AS book_status,
             COALESCE(ii.status, '') AS isbn_inventory_status,
             db.updated_at AS publish_at
      FROM digital_books db
      JOIN users u ON u.id = db.user_id
      LEFT JOIN isbn_inventory ii ON ii.book_id = db.id
      ORDER BY db.updated_at DESC
      LIMIT 120
    `).all()
    return c.json(successResponse(rows.results ?? []))
  } catch (e) {
    console.warn('[pub-dashboard/publishing-list]', e)
    return c.json(successResponse([]))
  }
})

/** 시스템 지원 대시보드 KPI */
admin.get('/sys-dashboard/summary', requireAdmin, async (c) => {
  const { DB } = c.env
  let db_usage_percent: number | null = null
  let db_size_bytes: number | null = null
  let ai_success_rate_24h: number | null = null
  let security_events_24h = 0
  let active_sessions = 0

  try {
    const pc = await DB.prepare('PRAGMA page_count').first<{ page_count?: number }>()
    const ps = await DB.prepare('PRAGMA page_size').first<{ page_size?: number }>()
    const pages = Number(pc?.page_count ?? 0)
    const psize = Number(ps?.page_size ?? 0)
    if (pages > 0 && psize > 0) {
      db_size_bytes = pages * psize
      const maxBytes = 500 * 1024 * 1024
      db_usage_percent = Math.min(100, Math.round((db_size_bytes / maxBytes) * 1000) / 10)
    }
  } catch (e) {
    console.warn('[sys-dashboard] pragma size', e)
  }

  try {
    const row = await DB.prepare(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as ok
       FROM ai_chat_request_logs
       WHERE datetime(created_at) >= datetime('now', '-1 day')`,
    ).first<{ total: number; ok: number }>()
    const t = Number(row?.total ?? 0)
    if (t > 0) {
      const ok = Number(row?.ok ?? 0)
      ai_success_rate_24h = Math.round((ok * 1000) / t) / 10
    }
  } catch (e) {
    console.warn('[sys-dashboard] ai logs', e)
  }

  try {
    const row = await DB.prepare(
      `SELECT COUNT(*) as c FROM security_events
       WHERE datetime(created_at) >= datetime('now', '-1 day')`,
    ).first<{ c: number }>()
    security_events_24h = Number(row?.c ?? 0)
  } catch (e) {
    console.warn('[sys-dashboard] security_events', e)
  }

  try {
    const row = await DB.prepare(
      `SELECT COUNT(DISTINCT user_id) as c FROM sessions WHERE datetime(expires_at) > datetime('now')`,
    ).first<{ c: number }>()
    active_sessions = Number(row?.c ?? 0)
  } catch (e) {
    console.warn('[sys-dashboard] sessions', e)
  }

  return c.json(
    successResponse({
      db_usage_percent,
      db_size_bytes,
      ai_success_rate_24h,
      security_events_24h,
      active_sessions,
    }),
  )
})

/** 시스템·보안 로그 (최신순) */
admin.get('/sys-dashboard/logs', requireAdmin, async (c) => {
  const { DB } = c.env
  const out: Array<{ log_source: string; id: number; message: string; at: string; detail: string }> = []
  try {
    const sec = await DB.prepare(
      `SELECT id, event_type, path, created_at FROM security_events ORDER BY datetime(created_at) DESC LIMIT 40`,
    ).all<{ id: number; event_type: string; path: string | null; created_at: string }>()
    for (const r of sec.results || []) {
      out.push({
        log_source: 'security',
        id: r.id,
        message: r.event_type || 'event',
        at: r.created_at,
        detail: (r.path || '').slice(0, 200),
      })
    }
  } catch (e) {
    console.warn('[sys-dashboard/logs] security', e)
  }
  try {
    const ai = await DB.prepare(
      `SELECT id, success, source, created_at FROM ai_chat_request_logs ORDER BY datetime(created_at) DESC LIMIT 40`,
    ).all<{ id: number; success: number; source: string | null; created_at: string }>()
    for (const r of ai.results || []) {
      out.push({
        log_source: 'ai',
        id: r.id,
        message: r.success ? 'AI 응답 성공' : 'AI 응답 실패',
        at: r.created_at,
        detail: (r.source || 'chat').slice(0, 200),
      })
    }
  } catch (e) {
    console.warn('[sys-dashboard/logs] ai', e)
  }
  try {
    const ne = await DB.prepare(
      `SELECT id, event_type, status, created_at FROM notification_events ORDER BY datetime(created_at) DESC LIMIT 20`,
    ).all<{ id: number; event_type: string; status: string; created_at: string }>()
    for (const r of ne.results || []) {
      out.push({
        log_source: 'notification',
        id: r.id,
        message: `알림 ${r.event_type} · ${r.status}`,
        at: r.created_at,
        detail: '',
      })
    }
  } catch (e) {
    console.warn('[sys-dashboard/logs] notification_events', e)
  }

  out.sort((a, b) => {
    const ta = new Date(a.at).getTime()
    const tb = new Date(b.at).getTime()
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta)
  })
  return c.json(successResponse(out.slice(0, 50)))
})

/** GET /api/admin/book-submissions — 출판 검수 대기열 */
admin.get('/book-submissions', requireAdmin, async (c) => {
  const { DB } = c.env
  const status = (c.req.query('status') || 'pending').trim().toLowerCase()
  const allowed = ['pending', 'approved', 'rejected', 'all']
  const st = allowed.includes(status) ? status : 'pending'
  try {
    let sql = `
      SELECT s.*, u.name as user_name, u.email as user_email
      FROM book_submissions s
      JOIN users u ON u.id = s.user_id
    `
    const bind: string[] = []
    if (st !== 'all') {
      sql += ` WHERE s.status = ?`
      bind.push(st)
    }
    sql += ` ORDER BY s.created_at DESC LIMIT 200`
    const rows = bind.length
      ? await DB.prepare(sql).bind(bind[0]).all()
      : await DB.prepare(sql).all()
    return c.json(successResponse(rows.results ?? []))
  } catch (error) {
    console.error('book-submissions list error:', error)
    return c.json(errorResponse('제출 목록 조회 실패'), 500)
  }
})

/** GET /api/admin/book-submissions/:id */
admin.get('/book-submissions/:id', requireAdmin, async (c) => {
  const { DB } = c.env
  const id = parseInt(c.req.param('id'), 10)
  if (Number.isNaN(id)) return c.json(errorResponse('잘못된 ID'), 400)
  try {
    const row = await DB.prepare(
      `SELECT s.*, u.name as user_name, u.email as user_email
       FROM book_submissions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`,
    )
      .bind(id)
      .first()
    if (!row) return c.json(errorResponse('없음'), 404)
    return c.json(successResponse(row))
  } catch (error) {
    console.error('book-submissions get error:', error)
    return c.json(errorResponse('조회 실패'), 500)
  }
})

/** POST /api/admin/publish/reject */
admin.post('/publish/reject', requireAdmin, async (c) => {
  const { DB } = c.env
  try {
    const body = await c.req.json<{ submission_id?: number; reason?: string }>()
    const sid = body.submission_id
    const reason = (body.reason || '').trim()
    if (sid === undefined || Number.isNaN(Number(sid))) {
      return c.json(errorResponse('submission_id가 필요합니다'), 400)
    }
    if (!reason) return c.json(errorResponse('반려 사유를 입력하세요'), 400)
    const r = await DB.prepare(
      `UPDATE book_submissions SET status = 'rejected', rejection_reason = ?, updated_at = datetime('now')
       WHERE id = ? AND status = 'pending'`,
    )
      .bind(reason, sid)
      .run()
    if (r.meta.changes !== 1) return c.json(errorResponse('대기 중인 제출만 반려할 수 있습니다'), 400)
    return c.json(successResponse({ submission_id: sid }, '반려 처리되었습니다'))
  } catch (error) {
    console.error('publish reject error:', error)
    return c.json(errorResponse('반려 처리 실패'), 500)
  }
})

/** POST /api/admin/publish/approve — ISBN 1건 자동 할당 + published_books */
admin.post('/publish/approve', requireAdmin, async (c) => {
  const { DB } = c.env
  try {
    const body = await c.req.json<{ submission_id?: number }>()
    const sid = body.submission_id
    if (sid === undefined || Number.isNaN(Number(sid))) {
      return c.json(errorResponse('submission_id가 필요합니다'), 400)
    }
    const result = await approveBookSubmission(DB, Number(sid))
    if (!result.ok) return c.json(errorResponse(result.reason), 400)
    return c.json(
      successResponse(
        {
          published_book_id: result.published_book_id,
          isbn: result.isbn,
          barcode_path: result.barcode_path,
        },
        '승인 및 ISBN 할당이 완료되었습니다',
      ),
    )
  } catch (error) {
    console.error('publish approve error:', error)
    return c.json(errorResponse('승인 처리 실패'), 500)
  }
})

/** GET /api/admin/published-books/:id/barcode.svg */
admin.get('/published-books/:id/barcode.svg', requireAdmin, async (c) => {
  const { DB } = c.env
  const id = parseInt(c.req.param('id'), 10)
  if (Number.isNaN(id)) return c.text('Not found', 404)
  try {
    const row = await DB.prepare(`SELECT isbn_number FROM published_books WHERE id = ?`).bind(id).first<{
      isbn_number: string | null
    }>()
    if (!row?.isbn_number) return c.text('Not found', 404)
    const svg = ean13Svg(row.isbn_number)
    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return c.text('Error', 500)
  }
})

/** GET /api/admin/published-books/:id/report.html — 출판 의뢰 리포트 (인쇄·PDF용) */
admin.get('/published-books/:id/report.html', requireAdmin, async (c) => {
  const { DB } = c.env
  const id = parseInt(c.req.param('id'), 10)
  if (Number.isNaN(id)) return c.text('Not found', 404)
  try {
    const row = await DB.prepare(
      `SELECT pb.title, pb.author_name, pb.isbn_number, pb.summary, pb.manuscript_url, bs.author_intent
       FROM published_books pb
       JOIN book_submissions bs ON bs.id = pb.submission_id
       WHERE pb.id = ?`,
    )
      .bind(id)
      .first<{
        title: string
        author_name: string
        isbn_number: string
        summary: string
        manuscript_url: string
        author_intent: string | null
      }>()
    if (!row) return c.text('Not found', 404)
    const svg = ean13Svg(row.isbn_number)
    const html = buildPublishingReportHtml({
      title: row.title,
      authorName: row.author_name,
      isbn: row.isbn_number,
      summary: row.summary || '',
      authorIntent: row.author_intent || undefined,
      barcodeSvgOrUrl: svg,
    })
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('report.html error:', error)
    return c.text('Error', 500)
  }
})

export default admin
