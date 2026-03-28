/**
 * 🌟 수강평/별점 API 라우트
 * /api/reviews/*
 * 
 * 목적: 강좌에 대한 수강생들의 리뷰와 별점 관리
 * 
 * 기능:
 * - POST /api/courses/:courseId/reviews - 수강평 작성
 * - GET /api/courses/:courseId/reviews - 수강평 목록 조회 (페이지네이션, 정렬)
 * - PUT /api/reviews/:id - 내 수강평 수정
 * - DELETE /api/reviews/:id - 내 수강평 삭제
 * - GET /api/courses/:courseId/reviews/summary - 수강평 통계 요약
 */

import { Hono } from 'hono'
import { Bindings, Review, CreateReviewInput, ReviewSummary } from '../types/database'
import { requireAuth } from '../middleware/auth'
import {
  successResponse,
  throwValidationError,
  throwNotFoundError,
  throwForbiddenError,
  BusinessError,
  isValidRating,
  handleError
} from '../utils/error-handler'

const reviews = new Hono<{ Bindings: Bindings }>()

/**
 * POST /api/courses/:courseId/reviews
 * 수강평 작성
 * 
 * 요구사항:
 * - 로그인 필수
 * - 해당 강좌 수강 중이어야 함
 * - 강좌당 1개의 리뷰만 작성 가능
 * - 별점은 1~5 범위
 */
reviews.post('/:courseId/reviews', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const courseId = parseInt(c.req.param('courseId'))
    const { rating, comment } = await c.req.json<{ rating: number, comment: string }>()

    // 유효성 검증
    if (!rating || !comment) {
      return throwValidationError(c, '별점과 수강평 내용은 필수입니다.')
    }

    if (!isValidRating(rating)) {
      return throwValidationError(c, '별점은 1~5 사이의 정수여야 합니다.')
    }

    if (comment.length < 10) {
      return throwValidationError(c, '수강평은 최소 10자 이상 작성해주세요.')
    }

    const { DB } = c.env

    // 강좌 존재 확인
    const course = await DB.prepare(`
      SELECT id FROM courses WHERE id = ?
    `).bind(courseId).first()

    if (!course) {
      return throwNotFoundError(c, '강좌')
    }

    // 수강 여부 확인 (관리자는 수강 신청 없이 수강평 작성 가능)
    if (user.role !== 'admin') {
      const enrollment = await DB.prepare(`
        SELECT id FROM enrollments 
        WHERE user_id = ? AND course_id = ?
      `).bind(user.id, courseId).first()

      if (!enrollment) {
        return throwForbiddenError(c, '수강 중인 강좌에만 리뷰를 작성할 수 있습니다.')
      }
    }

    // 기존 리뷰 확인
    const existingReview = await DB.prepare(`
      SELECT id FROM course_reviews 
      WHERE user_id = ? AND course_id = ?
    `).bind(user.id, courseId).first()

    if (existingReview) {
      return BusinessError.reviewAlreadyExists(c)
    }

    // 리뷰 생성
    const result = await DB.prepare(`
      INSERT INTO course_reviews (course_id, user_id, rating, comment)
      VALUES (?, ?, ?, ?)
    `).bind(courseId, user.id, rating, comment).run()

    // 생성된 리뷰 조회
    const review = await DB.prepare(`
      SELECT 
        r.*,
        u.name as user_name
      FROM course_reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = ?
    `).bind(result.meta.last_row_id).first()

    return successResponse(c, { review }, '수강평이 등록되었습니다.', 201)

  } catch (error) {
    return handleError(c, error)
  }
})

/**
 * GET /api/courses/:courseId/reviews
 * 수강평 목록 조회
 * 
 * 쿼리 파라미터:
 * - page: 페이지 번호 (기본값: 1)
 * - limit: 페이지당 개수 (기본값: 10)
 * - sort: 정렬 기준 (recent, rating_high, rating_low)
 */
reviews.get('/:courseId/reviews', async (c) => {
  try {
    const courseId = parseInt(c.req.param('courseId'))
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '10')
    const sort = c.req.query('sort') || 'recent'

    const { DB } = c.env

    // 강좌 존재 확인
    const course = await DB.prepare(`
      SELECT id FROM courses WHERE id = ?
    `).bind(courseId).first()

    if (!course) {
      return throwNotFoundError(c, '강좌')
    }

    // 정렬 기준 설정
    let orderBy = 'r.created_at DESC'
    if (sort === 'rating_high') {
      orderBy = 'r.rating DESC, r.created_at DESC'
    } else if (sort === 'rating_low') {
      orderBy = 'r.rating ASC, r.created_at DESC'
    }

    // 리뷰 목록 조회
    const offset = (page - 1) * limit
    const reviewsResult = await DB.prepare(`
      SELECT 
        r.id,
        r.course_id,
        r.user_id,
        u.name as user_name,
        r.rating,
        r.comment,
        r.created_at,
        r.updated_at
      FROM course_reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.course_id = ?
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `).bind(courseId, limit, offset).all()

    // 총 리뷰 수
    const countResult = await DB.prepare(`
      SELECT COUNT(*) as total FROM course_reviews WHERE course_id = ?
    `).bind(courseId).first() as { total: number }

    // 별점 분포 계산
    const distributionResult = await DB.prepare(`
      SELECT 
        rating,
        COUNT(*) as count
      FROM course_reviews
      WHERE course_id = ?
      GROUP BY rating
    `).bind(courseId).all()

    const distribution: ReviewSummary['distribution'] = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    distributionResult.results.forEach((row: any) => {
      distribution[row.rating as keyof typeof distribution] = row.count
    })

    // 평균 별점
    const avgResult = await DB.prepare(`
      SELECT AVG(CAST(rating AS REAL)) as average FROM course_reviews WHERE course_id = ?
    `).bind(courseId).first() as { average: number }

    const summary: ReviewSummary = {
      average: avgResult?.average || 0,
      total: countResult.total,
      distribution
    }

    return successResponse(c, {
      reviews: reviewsResult.results,
      summary,
      pagination: {
        page,
        limit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit)
      }
    })

  } catch (error) {
    return handleError(c, error)
  }
})

/**
 * GET /api/courses/:courseId/reviews/summary
 * 수강평 통계 요약만 조회
 */
reviews.get('/:courseId/reviews/summary', async (c) => {
  try {
    const courseId = parseInt(c.req.param('courseId'))
    const { DB } = c.env

    // 별점 분포 계산
    const distributionResult = await DB.prepare(`
      SELECT 
        rating,
        COUNT(*) as count
      FROM course_reviews
      WHERE course_id = ?
      GROUP BY rating
    `).bind(courseId).all()

    const distribution: ReviewSummary['distribution'] = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    distributionResult.results.forEach((row: any) => {
      distribution[row.rating as keyof typeof distribution] = row.count
    })

    // 통계 조회
    const statsResult = await DB.prepare(`
      SELECT 
        COUNT(*) as total,
        AVG(CAST(rating AS REAL)) as average
      FROM course_reviews
      WHERE course_id = ?
    `).bind(courseId).first() as { total: number, average: number }

    const summary: ReviewSummary = {
      average: statsResult?.average || 0,
      total: statsResult?.total || 0,
      distribution
    }

    return successResponse(c, { summary })

  } catch (error) {
    return handleError(c, error)
  }
})

/**
 * PUT /api/reviews/:id
 * 내 수강평 수정
 */
reviews.put('/reviews/:id', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const reviewId = parseInt(c.req.param('id'))
    const { rating, comment } = await c.req.json<{ rating?: number, comment?: string }>()

    // 유효성 검증
    if (rating && !isValidRating(rating)) {
      return throwValidationError(c, '별점은 1~5 사이의 정수여야 합니다.')
    }

    if (comment && comment.length < 10) {
      return throwValidationError(c, '수강평은 최소 10자 이상 작성해주세요.')
    }

    const { DB } = c.env

    // 리뷰 존재 및 권한 확인
    const review = await DB.prepare(`
      SELECT * FROM course_reviews WHERE id = ?
    `).bind(reviewId).first() as Review | null

    if (!review) {
      return throwNotFoundError(c, '수강평')
    }

    if (review.user_id !== user.id) {
      return throwForbiddenError(c, '본인의 수강평만 수정할 수 있습니다.')
    }

    // 업데이트할 필드 구성
    const updates: string[] = []
    const values: any[] = []

    if (rating !== undefined) {
      updates.push('rating = ?')
      values.push(rating)
    }

    if (comment !== undefined) {
      updates.push('comment = ?')
      values.push(comment)
    }

    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(reviewId)

    // 리뷰 수정
    await DB.prepare(`
      UPDATE course_reviews 
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...values).run()

    // 수정된 리뷰 조회
    const updatedReview = await DB.prepare(`
      SELECT 
        r.*,
        u.name as user_name
      FROM course_reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = ?
    `).bind(reviewId).first()

    return successResponse(c, { review: updatedReview }, '수강평이 수정되었습니다.')

  } catch (error) {
    return handleError(c, error)
  }
})

/**
 * DELETE /api/reviews/:id
 * 내 수강평 삭제
 */
reviews.delete('/reviews/:id', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const reviewId = parseInt(c.req.param('id'))
    const { DB } = c.env

    // 리뷰 존재 및 권한 확인
    const review = await DB.prepare(`
      SELECT * FROM course_reviews WHERE id = ?
    `).bind(reviewId).first() as Review | null

    if (!review) {
      return throwNotFoundError(c, '수강평')
    }

    if (review.user_id !== user.id && user.role !== 'admin') {
      return throwForbiddenError(c, '본인의 수강평만 삭제할 수 있습니다.')
    }

    // 리뷰 삭제
    await DB.prepare(`
      DELETE FROM course_reviews WHERE id = ?
    `).bind(reviewId).run()

    return successResponse(c, null, '수강평이 삭제되었습니다.')

  } catch (error) {
    return handleError(c, error)
  }
})

/**
 * GET /api/my/reviews
 * 내가 작성한 수강평 목록
 */
reviews.get('/my/reviews', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const { DB } = c.env

    const myReviews = await DB.prepare(`
      SELECT 
        r.*,
        c.title as course_title,
        c.thumbnail_url as course_thumbnail
      FROM course_reviews r
      JOIN courses c ON r.course_id = c.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `).bind(user.id).all()

    return successResponse(c, { reviews: myReviews.results })

  } catch (error) {
    return handleError(c, error)
  }
})

export default reviews
