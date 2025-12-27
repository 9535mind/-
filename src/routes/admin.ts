/**
 * 관리자 대시보드 API 라우트
 */

import { Hono } from 'hono'
import { Bindings, DashboardStats } from '../types/database'
import { successResponse, errorResponse } from '../utils/helpers'
import { requireAdmin } from '../middleware/auth'

const admin = new Hono<{ Bindings: Bindings }>()

// 대시보드 통계
admin.get('/dashboard', requireAdmin, async (c) => {
  const { DB } = c.env

  const [users, courses, enrollments, revenue, activeEnroll, completedEnroll] = await Promise.all([
    DB.prepare(`SELECT COUNT(*) as count FROM users WHERE status = 'active'`).first(),
    DB.prepare(`SELECT COUNT(*) as count FROM courses WHERE status = 'active'`).first(),
    DB.prepare(`SELECT COUNT(*) as count FROM enrollments`).first(),
    DB.prepare(`SELECT SUM(final_amount) as total FROM payments WHERE status = 'completed'`).first(),
    DB.prepare(`SELECT COUNT(*) as count FROM enrollments WHERE status = 'active'`).first(),
    DB.prepare(`SELECT COUNT(*) as count FROM enrollments WHERE status = 'completed'`).first(),
  ])

  const recentEnroll = await DB.prepare(`
    SELECT e.*, u.name as user_name, c.title as course_title
    FROM enrollments e
    JOIN users u ON e.user_id = u.id
    JOIN courses c ON e.course_id = c.id
    ORDER BY e.created_at DESC
    LIMIT 10
  `).all()

  const popularCourses = await DB.prepare(`
    SELECT c.*, COUNT(e.id) as enrollment_count
    FROM courses c
    LEFT JOIN enrollments e ON c.id = e.course_id
    WHERE c.status = 'active'
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

// 전체 회원 목록
admin.get('/users', requireAdmin, async (c) => {
  const { DB } = c.env
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = (page - 1) * limit

  const [users, total] = await Promise.all([
    DB.prepare(`
      SELECT id, email, name, phone, role, status, phone_verified, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all(),
    DB.prepare(`SELECT COUNT(*) as count FROM users`).first()
  ])

  return c.json({
    success: true,
    data: users.results,
    pagination: {
      page,
      limit,
      total: total?.count || 0,
      totalPages: Math.ceil((total?.count || 0) / limit)
    }
  })
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
      ORDER BY e.created_at DESC
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

// 전체 결제 내역
admin.get('/payments', requireAdmin, async (c) => {
  const { DB } = c.env
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = (page - 1) * limit

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
    data: payments.results,
    pagination: {
      page,
      limit,
      total: total?.count || 0,
      totalPages: Math.ceil((total?.count || 0) / limit)
    }
  })
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

export default admin
