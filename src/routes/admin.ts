/**
 * 관리자 대시보드 API 라우트
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'
import { Bindings, DashboardStats } from '../types/database'
import { successResponse, errorResponse, hashPassword } from '../utils/helpers'
import { requireAdmin } from '../middleware/auth'
import { approveBookSubmission } from '../services/publishPipeline'
import { ean13Svg } from '../utils/ean13-svg'
import { buildPublishingReportHtml } from '../utils/publish-helper'
import { normalizeCategoryGroupInput } from '../utils/catalog-lines'
import { generateAdminCourseDescription } from '../utils/course-description-ai'
import { deriveCoursePricing } from '../utils/course-pricing'
import { generateCourseThumbnailAi, normalizeThumbnailUrlInput } from '../utils/course-thumbnail-ai'
import adminInstructors from './admin-instructors'
import adminChatbotKnowledge from './admin-chatbot-knowledge'
import adminR2 from './admin-r2'
import {
  DEFAULT_LANDING_SIGNATURE,
  loadLandingSignatureCardsFromDb,
  sanitizeSignatureHref,
  type SignatureCardId,
} from '../utils/landing-signature-data'

/** PUT/POST JSON — 잘못된 JSON·빈 본문 시 500 방지 */
async function readJsonBody(c: Context): Promise<Record<string, unknown>> {
  const raw = await c.req.text()
  if (!raw || !raw.trim()) return {}
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    throw new Error('INVALID_JSON_BODY')
  }
}

const admin = new Hono<{ Bindings: Bindings }>()

const DIFFICULTY_ALLOWED = ['intro', 'beginner', 'intermediate', 'advanced'] as const

function normalizeCourseDifficulty(raw: unknown, fallback: string | null | undefined): string {
  const allowed = DIFFICULTY_ALLOWED as readonly string[]
  const v = raw != null && String(raw).trim() !== '' ? String(raw).trim() : ''
  if (v && allowed.includes(v)) return v
  const fb = fallback != null && String(fallback).trim() !== '' ? String(fallback).trim() : 'beginner'
  return allowed.includes(fb) ? fb : 'beginner'
}

/** 강좌 status: DB에는 draft | inactive | published. 레거시 active→published, archived/hidden→inactive */
function normalizeCourseStatusInput(raw: unknown): { ok: true; value: string } | { ok: false } {
  if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) {
    return { ok: true, value: 'draft' }
  }
  const s = String(raw).trim().toLowerCase()
  if (s === 'active') return { ok: true, value: 'published' }
  if (s === 'archived' || s === 'hidden') return { ok: true, value: 'inactive' }
  if (s === 'draft' || s === 'inactive' || s === 'published') return { ok: true, value: s }
  return { ok: false }
}

/** instructors 테이블이 없으면 검증 생략(레거시 DB), id 없으면 not_found */
async function assertInstructorExistsOrSkip(
  DB: D1Database,
  instructorId: number | null,
): Promise<'ok' | 'not_found'> {
  if (instructorId == null) return 'ok'
  try {
    const row = await DB.prepare(`SELECT id FROM instructors WHERE id = ?`).bind(instructorId).first<{ id: number }>()
    return row ? 'ok' : 'not_found'
  } catch (e) {
    const m = String(e instanceof Error ? e.message : e)
    if (/no such table/i.test(m) && /instructors/i.test(m)) return 'ok'
    throw e
  }
}

/** courses 실제 컬럼 집합 — SELECT … duration_days 시도 대신 PRAGMA로 판별 (D1·레거시 DB 호환) */
async function getCoursesTableColumnNames(DB: D1Database): Promise<Set<string>> {
  const r = await DB.prepare(`SELECT name FROM pragma_table_info('courses')`).all<{ name: string }>()
  return new Set((r.results ?? []).map((row) => row.name))
}

/** 강좌 연결 자격증명 — private_certificate_catalog 우선, 레거시 certification_types 폴백 */
async function resolveCertificateNameForCourse(
  DB: D1Database,
  certificateId: number | null | undefined,
): Promise<string | null> {
  if (certificateId == null || Number(certificateId) <= 0) return null
  try {
    const r = await DB.prepare(`SELECT name FROM private_certificate_catalog WHERE id = ?`)
      .bind(certificateId)
      .first<{ name: string }>()
    if (r?.name) return r.name
  } catch {
    /* 테이블 없음 등 */
  }
  try {
    const r = await DB.prepare(`SELECT name FROM certification_types WHERE id = ?`)
      .bind(certificateId)
      .first<{ name: string }>()
    return r?.name ?? null
  } catch {
    return null
  }
}

type InsertCourseRowParams = {
  title: string
  descriptionText: string
  thumbForInsert: string | null
  instructorId: number | null
  status: string
  regular_price: number
  sale_price: number | null
  discount_price: number | null
  certificateId: number | null
  durationDays: number
  validityUnlimited: number
  categoryGroup: string
  scheduleInfo: string | null
  difficulty: string
  priceRemarks: string | null
}

/**
 * 강좌 INSERT — DB에 존재하는 컬럼만 사용.
 * 정식 스키마: duration_days(migrations/0003, 0060), offline_info(0055, 0060).
 */
async function insertCourseRow(
  DB: D1Database,
  colSet: Set<string>,
  params: InsertCourseRowParams,
): Promise<{ meta: { last_row_id?: number | bigint | null } }> {
  const columns: string[] = [
    'title',
    'description',
    'thumbnail_url',
    'instructor_id',
    'status',
    'price',
    'sale_price',
    'discount_price',
    'certificate_id',
  ]
  const binds: unknown[] = [
    params.title,
    params.descriptionText,
    params.thumbForInsert,
    params.instructorId,
    params.status,
    params.regular_price,
    params.sale_price,
    params.discount_price,
    params.certificateId,
  ]
  if (colSet.has('duration_days')) {
    columns.push('duration_days')
    binds.push(params.durationDays)
  }
  columns.push('validity_unlimited', 'category_group', 'schedule_info')
  binds.push(params.validityUnlimited, params.categoryGroup, params.scheduleInfo)
  if (colSet.has('offline_info')) {
    columns.push('offline_info')
    binds.push(params.scheduleInfo)
  }
  columns.push('difficulty', 'regular_price', 'price_remarks')
  binds.push(params.difficulty, params.regular_price, params.priceRemarks)
  const placeholders = columns.map(() => '?').join(', ')
  const sql = `INSERT INTO courses (${columns.join(', ')}, created_at, updated_at) VALUES (${placeholders}, datetime('now'), datetime('now'))`
  return await DB.prepare(sql).bind(...binds).run()
}

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
      DB.prepare(
        `SELECT COUNT(*) as count FROM courses WHERE status = 'published' AND (deleted_at IS NULL OR TRIM(COALESCE(deleted_at,'')) = '')`,
      ).first(),
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
    DB.prepare(
      `SELECT COUNT(*) as count FROM courses WHERE status = 'published' AND (deleted_at IS NULL OR TRIM(COALESCE(deleted_at,'')) = '')`,
    ).first(),
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
    WHERE c.status = 'published' AND (c.deleted_at IS NULL OR TRIM(COALESCE(c.deleted_at,'')) = '')
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
    let instructors: Array<{ id: number; name: string }> = []
    let certificate_types: Array<{
      id: number
      name: string
      type: string
      registration_number: string
      issuer_name: string
      cost_total: string
      cost_details: string
      refund_policy: string
    }> = []

    try {
      const inst = await DB.prepare(`
        SELECT id, name, profile_image, specialty
        FROM instructors
        ORDER BY name ASC
        LIMIT 500
      `).all<{ id: number; name: string; profile_image: string | null; specialty: string | null }>()
      instructors = (inst.results ?? []).map((row) => ({
        id: row.id,
        name: row.specialty ? `${row.name} (${row.specialty})` : row.name,
      }))
    } catch (e) {
      console.warn('[admin/course-form-options] instructors load fail:', e)
    }

    try {
      const certTypes = await DB.prepare(`
        SELECT id, name, type, registration_number, issuer_name, cost_total, cost_details, refund_policy
        FROM private_certificate_catalog
        ORDER BY display_order ASC, id ASC
        LIMIT 200
      `).all<{
        id: number
        name: string
        type: string
        registration_number: string
        issuer_name: string
        cost_total: string
        cost_details: string
        refund_policy: string
      }>()
      certificate_types = certTypes.results ?? []
    } catch (e) {
      console.warn('[admin/course-form-options] private_certificate_catalog load fail:', e)
      try {
        const legacy = await DB.prepare(`
          SELECT id, name, '등록민간자격' AS type,
                 '' AS registration_number,
                 '(주)마인드스토리' AS issuer_name,
                 '과정별 상이 (수강 신청 시 안내)' AS cost_total,
                 COALESCE(description, '') AS cost_details,
                 '환불은 당사 규정에 따릅니다.' AS refund_policy
          FROM certification_types
          WHERE is_active = 1
          ORDER BY display_order ASC, id ASC
          LIMIT 200
        `).all<{
          id: number
          name: string
          type: string
          registration_number: string
          issuer_name: string
          cost_total: string
          cost_details: string
          refund_policy: string
        }>()
        certificate_types = legacy.results ?? []
      } catch (e2) {
        console.warn('[admin/course-form-options] certification_types legacy fail:', e2)
        certificate_types = []
      }
    }

    return c.json(successResponse({ instructors, certificate_types }))
  } catch (error) {
    console.error('Get course form options error:', error)
    return c.json(errorResponse('강좌 옵션 조회 실패'), 500)
  }
})

/** POST /api/admin/ai/generate-course-description — 제목 기반 강좌 홍보 설명(한국어, 약 250자) */
admin.post('/ai/generate-course-description', requireAdmin, async (c) => {
  try {
    const body = await c.req.json<{ title?: string }>()
    const title = String(body.title ?? '').trim()
    if (!title) {
      return c.json(errorResponse('강좌 제목을 입력해 주세요.'), 400)
    }
    const description = await generateAdminCourseDescription(c.env, title)
    return c.json(successResponse({ description }, 'AI 설명이 생성되었습니다.'))
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === 'NO_AI_KEY') {
      return c.json(
        errorResponse(
          'AI 키가 설정되지 않았습니다. Cloudflare에 GEMINI_API_KEY 또는 OPENAI_API_KEY를 설정해 주세요.',
        ),
        503,
      )
    }
    if (msg === 'EMPTY_TITLE') {
      return c.json(errorResponse('강좌 제목을 입력해 주세요.'), 400)
    }
    console.error('[admin/ai/generate-course-description]', e)
    return c.json(errorResponse('설명 생성에 실패했습니다.'), 502)
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

/** 학사·자격 전용 대시보드 KPI — 시험 제출·수료 대기·자격 신청·오프라인 신청 */
admin.get('/academic-dashboard/summary', requireAdmin, async (c) => {
  const { DB } = c.env
  let grading_pending = 0
  let certificate_queue = 0
  let certification_application_pending = 0
  let offline_meetup_recent = 0
  try {
    const row = await DB.prepare(
      `SELECT COUNT(*) as c FROM exam_attempts WHERE submitted_at IS NOT NULL`,
    ).first<{ c: number }>()
    grading_pending = Number(row?.c ?? 0)
  } catch (e) {
    console.warn('[admin/academic-dashboard] exam_attempts:', e)
  }
  try {
    const row = await DB.prepare(
      `SELECT COUNT(*) as c FROM certification_applications WHERE LOWER(TRIM(COALESCE(status,''))) = 'pending'`,
    ).first<{ c: number }>()
    certification_application_pending = Number(row?.c ?? 0)
  } catch (e) {
    console.warn('[admin/academic-dashboard] certification_applications:', e)
  }
  try {
    const row = await DB.prepare(
      `SELECT COUNT(*) as c FROM offline_applications WHERE datetime(created_at) >= datetime('now', '-30 days')`,
    ).first<{ c: number }>()
    offline_meetup_recent = Number(row?.c ?? 0)
  } catch (e) {
    console.warn('[admin/academic-dashboard] offline_applications:', e)
  }
  try {
    const row = await DB.prepare(
      `SELECT COUNT(*) as c FROM enrollments e
       WHERE e.completed_at IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM certificates c WHERE c.enrollment_id = e.id)`,
    ).first<{ c: number }>()
    certificate_queue = Number(row?.c ?? 0)
  } catch (e) {
    try {
      const row2 = await DB.prepare(
        `SELECT COUNT(*) as c FROM enrollments e
         WHERE COALESCE(e.certificate_issued, 0) = 0
           AND COALESCE(e.completion_rate, 0) >= 100`,
      ).first<{ c: number }>()
      certificate_queue = Number(row2?.c ?? 0)
    } catch (e2) {
      console.warn('[admin/academic-dashboard] certificate_queue:', e2)
    }
  }
  return c.json(
    successResponse({
      grading_pending,
      certificate_queue,
      certification_application_pending,
      offline_meetup_recent,
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
    const body = await readJsonBody(c)
    const {
      title,
      description,
      thumbnail_url,
      status = 'draft',
      regular_price: rawRegular,
      price: rawPriceAlias,
      sale_price: rawSalePrice,
      instructor_id: rawInstructorId,
      certificate_id: rawCertificateId,
      duration_days: rawDurationDays,
      validity_unlimited: rawValidityUnlimited,
      category_group: rawCg,
      offline_info: rawOfflineInfo,
      schedule_info: rawScheduleInfo,
      price_remarks: rawPriceRemarks,
      difficulty: rawDifficulty,
    } = body as {
      title?: string
      description?: string | null
      thumbnail_url?: string | null
      status?: string
      regular_price?: number | string | null
      price?: number | string | null
      sale_price?: number | string | null
      instructor_id?: number | string | null
      certificate_id?: number | string | null
      duration_days?: number | string | null
      validity_unlimited?: number | boolean | null
      category_group?: string | null
      offline_info?: string | null
      schedule_info?: string | null
      price_remarks?: string | null
      difficulty?: string | null
    }

    // 필수 필드 검증 (설명은 AI 초안·빈 값 허용)
    if (!title || String(title).trim() === '') {
      return c.json(errorResponse('필수 항목을 입력해주세요'), 400)
    }
    const descriptionText = description != null ? String(description) : ''
    const difficulty = normalizeCourseDifficulty(rawDifficulty, 'beginner')

    let categoryGroup = 'CLASSIC'
    if (rawCg !== undefined && rawCg !== null && String(rawCg).trim() !== '') {
      categoryGroup = normalizeCategoryGroupInput(rawCg)
    }

    const meetSource =
      rawOfflineInfo !== undefined && rawOfflineInfo !== null && String(rawOfflineInfo).trim() !== ''
        ? rawOfflineInfo
        : rawScheduleInfo
    const scheduleInfo =
      meetSource !== undefined && meetSource !== null && String(meetSource).trim() !== ''
        ? String(meetSource).trim().slice(0, 2000)
        : null

    const priceRemarks =
      rawPriceRemarks !== undefined && rawPriceRemarks !== null && String(rawPriceRemarks).trim() !== ''
        ? String(rawPriceRemarks).trim().slice(0, 2000)
        : null

    const regularSource =
      rawRegular !== undefined && rawRegular !== null && String(rawRegular).trim() !== ''
        ? rawRegular
        : rawPriceAlias
    const { regular_price, sale_price, discount_price } = deriveCoursePricing(regularSource, rawSalePrice)
    const validityUnlimited = Number(rawValidityUnlimited) ? 1 : 0
    const durationDays = validityUnlimited ? 0 : Math.max(0, parseInt(String(rawDurationDays ?? '90'), 10) || 90)

    const instructorId =
      rawInstructorId !== undefined && rawInstructorId !== null && String(rawInstructorId).trim() !== ''
        ? parseInt(String(rawInstructorId), 10) || null
        : null
    const certificateId =
      rawCertificateId !== undefined && rawCertificateId !== null && String(rawCertificateId).trim() !== ''
        ? parseInt(String(rawCertificateId), 10) || null
        : null

    const insCheck = await assertInstructorExistsOrSkip(DB, instructorId)
    if (insCheck === 'not_found') {
      return c.json(
        errorResponse('선택한 강사를 찾을 수 없습니다. 강사 목록을 새로고침한 뒤 다시 선택해 주세요.'),
        400,
      )
    }

    let thumbForInsert: string | null
    try {
      thumbForInsert = normalizeThumbnailUrlInput(thumbnail_url, null)
    } catch {
      return c.json(errorResponse('썸네일 URL이 너무 깁니다. 이미지를 업로드해 주세요.'), 400)
    }

    const statusNorm = normalizeCourseStatusInput(status)
    if (!statusNorm.ok) {
      return c.json(errorResponse('허용되지 않는 상태입니다'), 400)
    }

    const coursesColSet = await getCoursesTableColumnNames(DB)
    const coursesHasDurationDaysColumn = coursesColSet.has('duration_days')

    const result = await insertCourseRow(
      DB,
      coursesColSet,
      {
        title: String(title),
        descriptionText,
        thumbForInsert,
        instructorId,
        status: statusNorm.value,
        regular_price,
        sale_price,
        discount_price,
        certificateId,
        durationDays,
        validityUnlimited,
        categoryGroup,
        scheduleInfo,
        difficulty,
        priceRemarks,
      },
    )

    const newId = Number(result.meta.last_row_id ?? 0)

    if (!String(thumbForInsert || '').trim()) {
      const certName = await resolveCertificateNameForCourse(DB, certificateId)
      const gen = await generateCourseThumbnailAi(c.env, {
        title: String(title),
        certificateName: certName,
        description: descriptionText,
        scheduleInfo,
      })
      if (gen.ok) {
        try {
          await DB.prepare(
            `UPDATE courses SET thumbnail_url = ?, thumbnail_image_ai = 1, updated_at = datetime('now') WHERE id = ?`,
          )
            .bind(gen.url, newId)
            .run()
        } catch (e) {
          const m = String(e instanceof Error ? e.message : e)
          if (!/no such column.*thumbnail_image_ai/i.test(m)) throw e
          await DB.prepare(`UPDATE courses SET thumbnail_url = ?, updated_at = datetime('now') WHERE id = ?`)
            .bind(gen.url, newId)
            .run()
        }
      }
    }

    return c.json(successResponse({
      id: newId,
      message: '강좌가 등록되었습니다'
    }))
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_JSON_BODY') {
      return c.json(errorResponse('요청 본문이 올바른 JSON이 아닙니다.'), 400)
    }
    if (error instanceof Error && error.message === 'THUMBNAIL_URL_TOO_LARGE') {
      return c.json(errorResponse('썸네일 URL이 너무 깁니다. 이미지를 업로드해 주세요.'), 400)
    }
    console.error('Create course error:', error)
    return c.json(errorResponse('강좌 등록 실패: ' + (error as Error).message), 500)
  }
})

/** 전체 오프라인 모임 신청 (관리자) — 강좌명 포함 */
admin.get('/offline-applications', requireAdmin, async (c) => {
  const { DB } = c.env
  try {
    const rows = await DB.prepare(
      `SELECT o.id, o.course_id,
              COALESCE(c.title, '(삭제된 강좌)') AS course_title,
              o.applicant_name AS name, o.phone, o.region, o.motivation, o.created_at
       FROM offline_applications o
       LEFT JOIN courses c ON c.id = o.course_id
       ORDER BY datetime(o.created_at) DESC
       LIMIT 3000`,
    ).all<{
      id: number
      course_id: number
      course_title: string
      name: string
      phone: string
      region: string | null
      motivation: string | null
      created_at: string
    }>()
    return c.json(successResponse(rows.results || []))
  } catch (e) {
    const m = String(e instanceof Error ? e.message : e)
    if (/no such table/i.test(m)) {
      return c.json(successResponse([]))
    }
    console.error('[admin] offline-applications (all):', e)
    return c.json(errorResponse('오프라인 신청 목록 조회 실패'), 500)
  }
})

/** 오프라인 모임 신청 집계 (관리자) — offline_applications, 레거시 테이블 폴백 */
async function adminOfflineApplicationsRows(DB: D1Database, courseId: string) {
  const sql = `SELECT id, course_id, user_id, applicant_name, phone, region, motivation, created_at
       FROM offline_applications WHERE course_id = ? ORDER BY datetime(created_at) DESC`
  try {
    return await DB.prepare(sql).bind(courseId).all<{
      id: number
      course_id: number
      user_id: number | null
      applicant_name: string
      phone: string
      region: string | null
      motivation: string | null
      created_at: string
    }>()
  } catch (e) {
    const m = String(e instanceof Error ? e.message : e)
    if (!/no such table/i.test(m)) throw e
    return await DB.prepare(
      `SELECT id, course_id, user_id, applicant_name, phone, region, motivation, created_at
       FROM course_meetup_registrations WHERE course_id = ? ORDER BY datetime(created_at) DESC`,
    )
      .bind(courseId)
      .all<{
        id: number
        course_id: number
        user_id: number | null
        applicant_name: string
        phone: string
        region: string | null
        motivation: string | null
        created_at: string
      }>()
  }
}

admin.get('/courses/:id/offline-applications', requireAdmin, async (c) => {
  const { DB } = c.env
  const courseId = c.req.param('id')
  try {
    const rows = await adminOfflineApplicationsRows(DB, courseId)
    return c.json(successResponse(rows.results || []))
  } catch (e) {
    const m = String(e instanceof Error ? e.message : e)
    if (/no such table/i.test(m)) {
      return c.json(errorResponse('오프라인 신청 테이블이 없습니다. 마이그레이션 0052를 적용해 주세요.'), 503)
    }
    console.error('[admin] offline-applications:', e)
    return c.json(errorResponse('명단 조회 실패'), 500)
  }
})

admin.get('/courses/:id/meetup-registrations', requireAdmin, async (c) => {
  const { DB } = c.env
  const courseId = c.req.param('id')
  try {
    const rows = await adminOfflineApplicationsRows(DB, courseId)
    return c.json(successResponse(rows.results || []))
  } catch (e) {
    const m = String(e instanceof Error ? e.message : e)
    if (/no such table/i.test(m)) {
      return c.json(errorResponse('모임 신청 테이블이 없습니다. 마이그레이션을 적용해 주세요.'), 503)
    }
    console.error('[admin] meetup-registrations:', e)
    return c.json(errorResponse('명단 조회 실패'), 500)
  }
})

/** DALL·E 강좌 썸네일 재생성 (관리자) */
admin.post('/courses/:id/thumbnail-ai', requireAdmin, async (c) => {
  const { DB } = c.env
  const courseId = c.req.param('id')
  try {
    const row = await DB.prepare(
      `SELECT id, title, description, schedule_info, certificate_id FROM courses WHERE id = ?`,
    )
      .bind(courseId)
      .first<{
        id: number
        title: string
        description: string | null
        schedule_info: string | null
        certificate_id: number | null
      }>()
    if (!row) {
      return c.json(errorResponse('강좌를 찾을 수 없습니다'), 404)
    }
    const certName = await resolveCertificateNameForCourse(DB, row.certificate_id)
    const gen = await generateCourseThumbnailAi(c.env, {
      title: row.title,
      certificateName: certName,
      description: row.description,
      scheduleInfo: row.schedule_info,
    })
    if (!gen.ok) {
      const msg =
        gen.reason === 'NO_API_KEY'
          ? 'OpenAI API 키가 설정되지 않았습니다.'
          : gen.reason === 'NO_R2'
            ? 'R2 저장소가 설정되지 않았습니다.'
            : gen.detail || '이미지 생성에 실패했습니다.'
      return c.json(errorResponse(msg), gen.reason === 'OPENAI_ERROR' ? 502 : 503)
    }
    try {
      await DB.prepare(
        `UPDATE courses SET thumbnail_url = ?, thumbnail_image_ai = 1, updated_at = datetime('now') WHERE id = ?`,
      )
        .bind(gen.url, courseId)
        .run()
    } catch (e) {
      const m = String(e instanceof Error ? e.message : e)
      if (!/no such column.*thumbnail_image_ai/i.test(m)) throw e
      await DB.prepare(`UPDATE courses SET thumbnail_url = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(gen.url, courseId)
        .run()
    }
    return c.json(successResponse({ thumbnail_url: gen.url, thumbnail_image_ai: 1 }))
  } catch (e) {
    console.error('[admin] thumbnail-ai:', e)
    return c.json(errorResponse('썸네일 생성에 실패했습니다.'), 500)
  }
})

// 강좌 수정 (부분 JSON·undefined 바인딩 방지: 기존 행과 병합)
admin.put('/courses/:id', requireAdmin, async (c) => {
  const { DB } = c.env
  const courseId = c.req.param('id')

  try {
    const body = await readJsonBody(c)
    delete body.is_free
    delete body.is_free_preview
    delete body.is_preview

    type CoursePutRow = {
      title: string
      description: string | null
      thumbnail_url: string | null
      status: string | null
      price: number | null
      sale_price: number | null
      instructor_id: number | null
      certificate_id: number | null
      duration_days: number | null
      validity_unlimited: number | null
      category_group: string | null
      schedule_info: string | null
      offline_info: string | null
      difficulty: string | null
      regular_price: number | null
      price_remarks: string | null
      thumbnail_image_ai: number | null
    }

    const coursesColSetPut = await getCoursesTableColumnNames(DB)
    const coursesHasDurationDaysColumn = coursesColSetPut.has('duration_days')

    const durationSelectExpr = coursesHasDurationDaysColumn ? 'duration_days' : '90 AS duration_days'
    const sqlPutBase = `SELECT title, description, thumbnail_url, status, price, sale_price,
              instructor_id, certificate_id, ${durationSelectExpr}, validity_unlimited,
              category_group, schedule_info, difficulty,
              COALESCE(regular_price, price) AS regular_price, price_remarks`

    const durSetLine = coursesHasDurationDaysColumn ? 'duration_days = ?,\n        ' : ''

    let existing: CoursePutRow | null
    try {
      existing = await DB.prepare(
        `${sqlPutBase}, offline_info, COALESCE(thumbnail_image_ai, 0) AS thumbnail_image_ai
       FROM courses WHERE id = ?`,
      )
        .bind(courseId)
        .first<CoursePutRow>()
    } catch (e) {
      const m = String(e instanceof Error ? e.message : e)
      if (/no such column.*offline_info/i.test(m)) {
        try {
          existing = await DB.prepare(
            `${sqlPutBase}, COALESCE(thumbnail_image_ai, 0) AS thumbnail_image_ai
       FROM courses WHERE id = ?`,
          )
            .bind(courseId)
            .first<CoursePutRow>()
          if (existing) existing = { ...existing, offline_info: null }
        } catch (e2) {
          const m2 = String(e2 instanceof Error ? e2.message : e2)
          if (!/no such column.*thumbnail_image_ai/i.test(m2)) throw e2
          const legacy = await DB.prepare(`${sqlPutBase} FROM courses WHERE id = ?`)
            .bind(courseId)
            .first<Omit<CoursePutRow, 'thumbnail_image_ai' | 'offline_info'>>()
          existing = legacy ? { ...legacy, thumbnail_image_ai: 0, offline_info: null } : null
        }
      } else if (/no such column.*thumbnail_image_ai/i.test(m)) {
        try {
          const row = await DB.prepare(`${sqlPutBase}, offline_info FROM courses WHERE id = ?`)
            .bind(courseId)
            .first<Omit<CoursePutRow, 'thumbnail_image_ai'>>()
          existing = row ? { ...row, thumbnail_image_ai: 0 } : null
        } catch (e3) {
          const m3 = String(e3 instanceof Error ? e3.message : e3)
          if (!/no such column.*offline_info/i.test(m3)) throw e3
          const legacy = await DB.prepare(`${sqlPutBase} FROM courses WHERE id = ?`)
            .bind(courseId)
            .first<Omit<CoursePutRow, 'offline_info' | 'thumbnail_image_ai'>>()
          existing = legacy ? { ...legacy, offline_info: null, thumbnail_image_ai: 0 } : null
        }
      } else {
        throw e
      }
    }

    if (!existing) {
      return c.json(errorResponse('강좌를 찾을 수 없습니다'), 404)
    }

    const title =
      'title' in body && body.title != null && String(body.title).trim() !== ''
        ? String(body.title).trim()
        : existing.title
    if (!title || String(title).trim() === '') {
      return c.json(errorResponse('필수 항목을 입력해주세요'), 400)
    }

    const descriptionText =
      'description' in body
        ? body.description != null
          ? String(body.description)
          : ''
        : (existing.description ?? '')

    let thumbnailUrl: string | null
    try {
      thumbnailUrl = normalizeThumbnailUrlInput('thumbnail_url' in body ? body.thumbnail_url : undefined, existing.thumbnail_url)
    } catch {
      return c.json(errorResponse('썸네일 URL이 너무 깁니다. 이미지를 업로드해 주세요.'), 400)
    }

    const thumbAiFlag =
      'thumbnail_image_ai' in body && body.thumbnail_image_ai !== undefined
        ? Number(body.thumbnail_image_ai)
          ? 1
          : 0
        : Number(existing.thumbnail_image_ai ?? 0)
          ? 1
          : 0

    const statusRaw =
      'status' in body && body.status != null && String(body.status).trim() !== ''
        ? String(body.status).trim()
        : (existing.status ?? 'draft')
    const statusNormPut = normalizeCourseStatusInput(statusRaw)
    if (!statusNormPut.ok) {
      return c.json(errorResponse('허용되지 않는 상태입니다'), 400)
    }
    const status = statusNormPut.value

    const rawRegular =
      'regular_price' in body
        ? body.regular_price
        : 'price' in body
          ? body.price
          : existing.regular_price ?? existing.price
    const rawSale = 'sale_price' in body ? body.sale_price : existing.sale_price
    const { regular_price, sale_price, discount_price } = deriveCoursePricing(
      rawRegular as number | string | null | undefined,
      rawSale as number | string | null | undefined,
    )

    const rawValidity = 'validity_unlimited' in body ? body.validity_unlimited : existing.validity_unlimited
    const validityUnlimited = Number(rawValidity) ? 1 : 0

    const rawDur = 'duration_days' in body ? body.duration_days : existing.duration_days
    const durationDays = validityUnlimited ? 0 : Math.max(0, parseInt(String(rawDur ?? '90'), 10) || 90)

    const rawInst = 'instructor_id' in body ? body.instructor_id : existing.instructor_id
    const instructorId =
      rawInst !== undefined && rawInst !== null && String(rawInst).trim() !== ''
        ? parseInt(String(rawInst), 10) || null
        : null

    const rawCert = 'certificate_id' in body ? body.certificate_id : existing.certificate_id
    const certificateId =
      rawCert !== undefined && rawCert !== null && String(rawCert).trim() !== ''
        ? parseInt(String(rawCert), 10) || null
        : null

    const categoryGroup =
      'category_group' in body && body.category_group != null && String(body.category_group).trim() !== ''
        ? normalizeCategoryGroupInput(String(body.category_group))
        : (existing.category_group ?? 'CLASSIC')

    const rawMeet =
      'offline_info' in body
        ? body.offline_info
        : 'schedule_info' in body
          ? body.schedule_info
          : existing.offline_info ?? existing.schedule_info
    const meetText =
      rawMeet !== undefined && rawMeet !== null && String(rawMeet).trim() !== ''
        ? String(rawMeet).trim().slice(0, 2000)
        : null
    const scheduleInfo = meetText

    const rawDiff = 'difficulty' in body ? body.difficulty : existing.difficulty
    const difficulty = normalizeCourseDifficulty(rawDiff, existing.difficulty)

    const priceRemarks =
      'price_remarks' in body
        ? body.price_remarks != null && String(body.price_remarks).trim() !== ''
          ? String(body.price_remarks).trim().slice(0, 2000)
          : null
        : existing.price_remarks

    const insCheck = await assertInstructorExistsOrSkip(DB, instructorId)
    if (insCheck === 'not_found') {
      return c.json(
        errorResponse('선택한 강사를 찾을 수 없습니다. 강사 목록을 새로고침한 뒤 다시 선택해 주세요.'),
        400,
      )
    }

    const bindPut = [
      title,
      descriptionText,
      thumbnailUrl,
      status,
      regular_price,
      sale_price,
      discount_price,
      instructorId,
      certificateId,
      ...(coursesHasDurationDaysColumn ? [durationDays] : []),
      validityUnlimited,
      categoryGroup,
      scheduleInfo,
      meetText,
      difficulty,
      regular_price,
      priceRemarks,
      thumbAiFlag,
      courseId,
    ] as const

    let result
    try {
      result = await DB.prepare(
        `UPDATE courses SET
        title = ?,
        description = ?,
        thumbnail_url = ?,
        status = ?,
        price = ?,
        sale_price = ?,
        discount_price = ?,
        instructor_id = ?,
        certificate_id = ?,
        ${durSetLine}validity_unlimited = ?,
        category_group = ?,
        schedule_info = ?,
        offline_info = ?,
        difficulty = ?,
        regular_price = ?,
        price_remarks = ?,
        thumbnail_image_ai = ?,
        updated_at = datetime('now')
      WHERE id = ?`,
      )
        .bind(...bindPut)
        .run()
    } catch (e) {
      const m = String(e instanceof Error ? e.message : e)
      if (/no such column.*offline_info/i.test(m)) {
        try {
          result = await DB.prepare(
            `UPDATE courses SET
        title = ?,
        description = ?,
        thumbnail_url = ?,
        status = ?,
        price = ?,
        sale_price = ?,
        discount_price = ?,
        instructor_id = ?,
        certificate_id = ?,
        ${durSetLine}validity_unlimited = ?,
        category_group = ?,
        schedule_info = ?,
        difficulty = ?,
        regular_price = ?,
        price_remarks = ?,
        thumbnail_image_ai = ?,
        updated_at = datetime('now')
      WHERE id = ?`,
          )
            .bind(
              title,
              descriptionText,
              thumbnailUrl,
              status,
              regular_price,
              sale_price,
              discount_price,
              instructorId,
              certificateId,
              ...(coursesHasDurationDaysColumn ? [durationDays] : []),
              validityUnlimited,
              categoryGroup,
              scheduleInfo,
              difficulty,
              regular_price,
              priceRemarks,
              thumbAiFlag,
              courseId,
            )
            .run()
        } catch (e2) {
          const m2 = String(e2 instanceof Error ? e2.message : e2)
          if (!/no such column.*thumbnail_image_ai/i.test(m2)) throw e2
          result = await DB.prepare(
            `UPDATE courses SET
        title = ?,
        description = ?,
        thumbnail_url = ?,
        status = ?,
        price = ?,
        sale_price = ?,
        discount_price = ?,
        instructor_id = ?,
        certificate_id = ?,
        ${durSetLine}validity_unlimited = ?,
        category_group = ?,
        schedule_info = ?,
        difficulty = ?,
        regular_price = ?,
        price_remarks = ?,
        updated_at = datetime('now')
      WHERE id = ?`,
          )
            .bind(
              title,
              descriptionText,
              thumbnailUrl,
              status,
              regular_price,
              sale_price,
              discount_price,
              instructorId,
              certificateId,
              ...(coursesHasDurationDaysColumn ? [durationDays] : []),
              validityUnlimited,
              categoryGroup,
              scheduleInfo,
              difficulty,
              regular_price,
              priceRemarks,
              courseId,
            )
            .run()
        }
      } else if (!/no such column.*thumbnail_image_ai/i.test(m)) {
        throw e
      } else {
        try {
          result = await DB.prepare(
            `UPDATE courses SET
        title = ?,
        description = ?,
        thumbnail_url = ?,
        status = ?,
        price = ?,
        sale_price = ?,
        discount_price = ?,
        instructor_id = ?,
        certificate_id = ?,
        ${durSetLine}validity_unlimited = ?,
        category_group = ?,
        schedule_info = ?,
        offline_info = ?,
        difficulty = ?,
        regular_price = ?,
        price_remarks = ?,
        updated_at = datetime('now')
      WHERE id = ?`,
          )
            .bind(
              title,
              descriptionText,
              thumbnailUrl,
              status,
              regular_price,
              sale_price,
              discount_price,
              instructorId,
              certificateId,
              ...(coursesHasDurationDaysColumn ? [durationDays] : []),
              validityUnlimited,
              categoryGroup,
              scheduleInfo,
              meetText,
              difficulty,
              regular_price,
              priceRemarks,
              courseId,
            )
            .run()
        } catch (e3) {
          const m3 = String(e3 instanceof Error ? e3.message : e3)
          if (!/no such column.*offline_info/i.test(m3)) throw e3
          result = await DB.prepare(
            `UPDATE courses SET
        title = ?,
        description = ?,
        thumbnail_url = ?,
        status = ?,
        price = ?,
        sale_price = ?,
        discount_price = ?,
        instructor_id = ?,
        certificate_id = ?,
        ${durSetLine}validity_unlimited = ?,
        category_group = ?,
        schedule_info = ?,
        difficulty = ?,
        regular_price = ?,
        price_remarks = ?,
        updated_at = datetime('now')
      WHERE id = ?`,
          )
            .bind(
              title,
              descriptionText,
              thumbnailUrl,
              status,
              regular_price,
              sale_price,
              discount_price,
              instructorId,
              certificateId,
              ...(coursesHasDurationDaysColumn ? [durationDays] : []),
              validityUnlimited,
              categoryGroup,
              scheduleInfo,
              difficulty,
              regular_price,
              priceRemarks,
              courseId,
            )
            .run()
        }
      }
    }

    if (result.meta.changes === 0) {
      return c.json(errorResponse('강좌를 찾을 수 없습니다'), 404)
    }

    if (result.meta.changes > 0 && status === 'published' && coursesColSetPut.has('deleted_at')) {
      await DB.prepare(`UPDATE courses SET deleted_at = NULL WHERE id = ?`).bind(courseId).run()
    }

    return c.json(successResponse({ message: '강좌가 수정되었습니다' }))
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_JSON_BODY') {
      return c.json(errorResponse('요청 본문이 올바른 JSON이 아닙니다.'), 400)
    }
    console.error('Update course error:', error)
    return c.json(errorResponse('강좌 수정 실패: ' + (error as Error).message), 500)
  }
})

/** PATCH /api/admin/courses/:id — 상태·브랜드·Classic 상단 노출 등 */
admin.patch('/courses/:id', requireAdmin, async (c) => {
  const { DB } = c.env
  const courseId = c.req.param('id')
  const coursesCols = await getCoursesTableColumnNames(DB)
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
      const st = normalizeCourseStatusInput(status)
      if (!st.ok) {
        return c.json(errorResponse('허용되지 않는 상태입니다'), 400)
      }
      sets.push('status = ?')
      vals.push(st.value)
      if (st.value === 'published' && coursesCols.has('deleted_at')) {
        sets.push(`deleted_at = NULL`)
      }
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

// 강좌 삭제 — 기본 휴지통(soft), ?hard=true 시 영구 삭제(수강·주문 기록 있으면 거부)
admin.delete('/courses/:id', requireAdmin, async (c) => {
  const { DB } = c.env
  const courseId = c.req.param('id')
  const hardQ = c.req.query('hard')
  const hard =
    hardQ === 'true' || hardQ === '1' || String(hardQ || '').toLowerCase() === 'yes'

  try {
    if (!hard) {
      const r = await DB.prepare(
        `UPDATE courses SET deleted_at = datetime('now'), status = 'inactive', updated_at = datetime('now') WHERE id = ?`,
      )
        .bind(courseId)
        .run()
      if (r.meta.changes === 0) {
        return c.json(errorResponse('강좌를 찾을 수 없습니다'), 404)
      }
      return c.json(successResponse({ message: '강좌를 휴지통으로 옮겼습니다.' }))
    }

    const enrollments = await DB.prepare(`SELECT COUNT(*) as count FROM enrollments WHERE course_id = ?`)
      .bind(courseId)
      .first<{ count: number }>()
    if (enrollments && enrollments.count > 0) {
      return c.json(
        errorResponse('수강 기록이 있는 강좌는 영구 삭제할 수 없습니다. 휴지통(안전 삭제)을 이용해 주세요.'),
        400,
      )
    }

    let orderCount = 0
    try {
      const o = await DB.prepare(`SELECT COUNT(*) as count FROM orders WHERE course_id = ?`)
        .bind(courseId)
        .first<{ count: number }>()
      orderCount = o?.count ?? 0
    } catch {
      orderCount = 0
    }
    if (orderCount > 0) {
      return c.json(errorResponse('주문 기록이 있어 영구 삭제할 수 없습니다.'), 400)
    }

    /** 영구 삭제: FK로 막히지 않도록 의존 행 정리 (마이그레이션 전 스키마는 try/catch로 무시) */
    const safeRun = async (label: string, sql: string) => {
      try {
        await DB.prepare(sql).bind(courseId).run()
      } catch (e) {
        console.warn(`[admin delete course ${courseId}] ${label}:`, e)
      }
    }
    await safeRun(
      'lesson_progress by lessons',
      `DELETE FROM lesson_progress WHERE lesson_id IN (SELECT id FROM lessons WHERE course_id = ?)`,
    )
    await safeRun('exams', `DELETE FROM exams WHERE course_id = ?`)
    await safeRun('digital_books null course_id', `UPDATE digital_books SET course_id = NULL WHERE course_id = ?`)
    await safeRun('certification_courses', `DELETE FROM certification_courses WHERE course_id = ?`)

    await DB.prepare(`DELETE FROM lessons WHERE course_id = ?`).bind(courseId).run()
    const result = await DB.prepare(`DELETE FROM courses WHERE id = ?`).bind(courseId).run()

    if (result.meta.changes === 0) {
      return c.json(errorResponse('강좌를 찾을 수 없습니다'), 404)
    }

    return c.json(successResponse({ message: '강좌가 영구 삭제되었습니다.' }))
  } catch (error) {
    console.error('Delete course error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    const lower = msg.toLowerCase()
    if (
      lower.includes('foreign key') ||
      lower.includes('constraint') ||
      lower.includes('sql constraint')
    ) {
      return c.json(
        errorResponse(
          '다른 데이터와 연결되어 있어 삭제할 수 없습니다. (데이터베이스 제약) 안전 삭제(휴지통)를 이용해 주세요.',
        ),
        400,
      )
    }
    const short = msg.length > 160 ? msg.slice(0, 160) + '…' : msg
    return c.json(errorResponse('강좌 삭제 실패: ' + short), 500)
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
        COALESCE(l.is_preview, l.is_free_preview, l.is_free, 0) AS is_preview,
        COALESCE(l.is_preview, l.is_free_preview, l.is_free, 0) AS is_free_preview,
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

/**
 * PUT /api/admin/landing/signature-lineup/:id
 * 메인(/) 시그니처 라인업 카드 — 제목·설명·버튼·링크 (classic | next | ncs)
 */
admin.put('/landing/signature-lineup/:id', requireAdmin, async (c) => {
  const rawId = c.req.param('id')
  if (rawId !== 'classic' && rawId !== 'next' && rawId !== 'ncs') {
    return c.json(errorResponse('유효하지 않은 카드입니다.'), 400)
  }
  const id = rawId as SignatureCardId
  const { DB } = c.env
  let body: Record<string, unknown>
  try {
    body = await readJsonBody(c)
  } catch {
    return c.json(errorResponse('JSON 본문이 올바르지 않습니다.'), 400)
  }
  const def = DEFAULT_LANDING_SIGNATURE[id]
  const title = String(body.title ?? '').trim() || def.title
  const description = String(body.description ?? '').trim() || def.description
  const button_label = String(body.button_label ?? '').trim() || def.button_label
  const button_href = sanitizeSignatureHref(String(body.button_href ?? def.button_href))
  try {
    await DB.prepare(
      `INSERT INTO landing_signature_cards (id, title, description, button_label, button_href, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         description = excluded.description,
         button_label = excluded.button_label,
         button_href = excluded.button_href,
         updated_at = excluded.updated_at`,
    )
      .bind(id, title, description, button_label, button_href)
      .run()
    const full = await loadLandingSignatureCardsFromDb(c.env)
    return c.json(successResponse({ card: full[id], cards: full }))
  } catch (e) {
    console.error('[admin] landing/signature-lineup PUT', e)
    return c.json(errorResponse('저장에 실패했습니다. DB 마이그레이션을 확인해 주세요.'), 500)
  }
})

admin.route('/', adminChatbotKnowledge)
admin.route('/', adminInstructors)
admin.route('/', adminR2)

export default admin
