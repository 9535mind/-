/**
 * 팝업 관리 API 라우트
 * - 활성 팝업 조회
 * - 팝업 닫기 처리 ('오늘 보지 않기')
 * - 관리자 팝업 CRUD
 */

import { Hono } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

/**
 * 활성 팝업 목록 조회
 * GET /api/popups/active
 * - 현재 날짜 기준 활성화된 팝업을 우선순위 순으로 최대 5개 반환
 * - '오늘 보지 않기' 처리된 팝업은 제외
 */
app.get('/active', async (c) => {
  try {
    const { DB } = c.env

    // 오늘 보지 않기로 설정된 팝업 ID 목록 가져오기
    const hiddenPopupsStr = getCookie(c, 'hidden_popups') || '[]'
    let hiddenPopups: number[] = []
    
    try {
      hiddenPopups = JSON.parse(hiddenPopupsStr)
    } catch (e) {
      console.error('Failed to parse hidden_popups cookie:', e)
      hiddenPopups = []
    }

    // 활성 팝업 조회 (최대 5개)
    const result = await DB.prepare(`
      SELECT 
        id, title, content, image_url, link_url, link_text,
        start_date, end_date, priority, display_type,
        created_at, updated_at
      FROM popups
      WHERE is_active = 1
        AND datetime('now') BETWEEN start_date AND end_date
      ORDER BY priority ASC, created_at DESC
      LIMIT 5
    `).all()

    // '오늘 보지 않기' 처리된 팝업 제외
    const activePopups = result.results.filter(
      (popup: any) => !hiddenPopups.includes(popup.id)
    )

    return c.json({
      success: true,
      data: activePopups
    })
  } catch (error: any) {
    console.error('Get active popups error:', error)
    return c.json({
      success: false,
      message: '팝업을 불러오는데 실패했습니다.',
      error: error.message
    }, 500)
  }
})

/**
 * 팝업 조회수 추적
 * POST /api/popups/:id/view
 */
app.post('/:id/view', async (c) => {
  try {
    const popupId = parseInt(c.req.param('id'))
    const { DB } = c.env

    // 조회수 증가 (popups 테이블에 view_count 컬럼이 있다면)
    // 현재는 단순히 성공 응답만 반환
    
    return c.json({
      success: true,
      message: '조회수가 기록되었습니다.'
    })
  } catch (error: any) {
    console.error('Track view error:', error)
    return c.json({
      success: false,
      message: '조회수 기록에 실패했습니다.'
    }, 500)
  }
})

/**
 * 팝업 클릭수 추적
 * POST /api/popups/:id/click
 */
app.post('/:id/click', async (c) => {
  try {
    const popupId = parseInt(c.req.param('id'))
    const { DB } = c.env

    // 클릭수 증가 (popups 테이블에 click_count 컬럼이 있다면)
    // 현재는 단순히 성공 응답만 반환
    
    return c.json({
      success: true,
      message: '클릭수가 기록되었습니다.'
    })
  } catch (error: any) {
    console.error('Track click error:', error)
    return c.json({
      success: false,
      message: '클릭수 기록에 실패했습니다.'
    }, 500)
  }
})

/**
 * 팝업 닫기 처리 ('오늘 보지 않기')
 * POST /api/popups/:id/close
 * Body: { dontShowToday: boolean }
 */
app.post('/:id/close', async (c) => {
  try {
    const popupId = parseInt(c.req.param('id'))
    const { dontShowToday } = await c.req.json()

    if (dontShowToday) {
      // 현재 쿠키에서 숨김 목록 가져오기
      const hiddenPopupsStr = getCookie(c, 'hidden_popups') || '[]'
      let hiddenPopups: number[] = []
      
      try {
        hiddenPopups = JSON.parse(hiddenPopupsStr)
      } catch (e) {
        hiddenPopups = []
      }

      // 팝업 ID 추가 (중복 방지)
      if (!hiddenPopups.includes(popupId)) {
        hiddenPopups.push(popupId)
      }

      // 쿠키 저장 (오늘 자정까지)
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      
      setCookie(c, 'hidden_popups', JSON.stringify(hiddenPopups), {
        expires: tomorrow,
        path: '/',
        httpOnly: false,
        sameSite: 'Lax'
      })
    }

    return c.json({
      success: true,
      message: '팝업이 닫혔습니다.'
    })
  } catch (error: any) {
    console.error('Close popup error:', error)
    return c.json({
      success: false,
      message: '팝업 닫기에 실패했습니다.',
      error: error.message
    }, 500)
  }
})

/**
 * 관리자: 팝업 목록 조회
 * GET /api/popups
 */
app.get('/', async (c) => {
  try {
    const { DB } = c.env

    const result = await DB.prepare(`
      SELECT 
        id, title, content, image_url, link_url, link_text,
        start_date, end_date, priority, display_type, is_active,
        created_at, updated_at
      FROM popups
      ORDER BY priority ASC, created_at DESC
    `).all()

    return c.json({
      success: true,
      data: result.results
    })
  } catch (error: any) {
    console.error('Get popups error:', error)
    return c.json({
      success: false,
      message: '팝업 목록을 불러오는데 실패했습니다.',
      error: error.message
    }, 500)
  }
})

/**
 * 관리자: 팝업 상세 조회
 * GET /api/popups/:id
 */
app.get('/:id', async (c) => {
  try {
    const { DB } = c.env
    const popupId = parseInt(c.req.param('id'))

    const result = await DB.prepare(`
      SELECT 
        id, title, content, image_url, link_url, link_text,
        start_date, end_date, priority, display_type, is_active,
        created_at, updated_at
      FROM popups
      WHERE id = ?
    `).bind(popupId).first()

    if (!result) {
      return c.json({
        success: false,
        message: '팝업을 찾을 수 없습니다.'
      }, 404)
    }

    return c.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('Get popup error:', error)
    return c.json({
      success: false,
      message: '팝업 조회에 실패했습니다.',
      error: error.message
    }, 500)
  }
})

/**
 * 관리자: 팝업 생성
 * POST /api/popups
 */
app.post('/', async (c) => {
  try {
    const { DB } = c.env
    const {
      title,
      content,
      image_url,
      link_url,
      link_text,
      start_date,
      end_date,
      priority,
      display_type,
      is_active
    } = await c.req.json()

    // 유효성 검사
    if (!title || !start_date || !end_date) {
      return c.json({
        success: false,
        message: '필수 항목을 입력해주세요.'
      }, 400)
    }

    // 팝업 생성
    const result = await DB.prepare(`
      INSERT INTO popups (
        title, content, image_url, link_url, link_text,
        start_date, end_date, priority, display_type, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      title,
      content || null,
      image_url || null,
      link_url || null,
      link_text || null,
      start_date,
      end_date,
      priority || 0,
      display_type || 'modal',
      is_active !== undefined ? is_active : 1
    ).run()

    return c.json({
      success: true,
      message: '팝업이 생성되었습니다.',
      data: {
        id: result.meta.last_row_id
      }
    })
  } catch (error: any) {
    console.error('Create popup error:', error)
    return c.json({
      success: false,
      message: '팝업 생성에 실패했습니다.',
      error: error.message
    }, 500)
  }
})

/**
 * 관리자: 팝업 수정
 * PUT /api/popups/:id
 */
app.put('/:id', async (c) => {
  try {
    const { DB } = c.env
    const popupId = parseInt(c.req.param('id'))
    const {
      title,
      content,
      image_url,
      link_url,
      link_text,
      start_date,
      end_date,
      priority,
      display_type,
      is_active
    } = await c.req.json()

    // 팝업 존재 확인
    const existing = await DB.prepare(`
      SELECT id FROM popups WHERE id = ?
    `).bind(popupId).first()

    if (!existing) {
      return c.json({
        success: false,
        message: '팝업을 찾을 수 없습니다.'
      }, 404)
    }

    // 팝업 수정
    await DB.prepare(`
      UPDATE popups
      SET 
        title = ?,
        content = ?,
        image_url = ?,
        link_url = ?,
        link_text = ?,
        start_date = ?,
        end_date = ?,
        priority = ?,
        display_type = ?,
        is_active = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      title,
      content || null,
      image_url || null,
      link_url || null,
      link_text || null,
      start_date,
      end_date,
      priority || 0,
      display_type || 'modal',
      is_active !== undefined ? is_active : 1,
      popupId
    ).run()

    return c.json({
      success: true,
      message: '팝업이 수정되었습니다.'
    })
  } catch (error: any) {
    console.error('Update popup error:', error)
    return c.json({
      success: false,
      message: '팝업 수정에 실패했습니다.',
      error: error.message
    }, 500)
  }
})

/**
 * 관리자: 팝업 삭제
 * DELETE /api/popups/:id
 */
app.delete('/:id', async (c) => {
  try {
    const { DB } = c.env
    const popupId = parseInt(c.req.param('id'))

    // 팝업 존재 확인
    const existing = await DB.prepare(`
      SELECT id FROM popups WHERE id = ?
    `).bind(popupId).first()

    if (!existing) {
      return c.json({
        success: false,
        message: '팝업을 찾을 수 없습니다.'
      }, 404)
    }

    // 팝업 삭제
    await DB.prepare(`
      DELETE FROM popups WHERE id = ?
    `).bind(popupId).run()

    return c.json({
      success: true,
      message: '팝업이 삭제되었습니다.'
    })
  } catch (error: any) {
    console.error('Delete popup error:', error)
    return c.json({
      success: false,
      message: '팝업 삭제에 실패했습니다.',
      error: error.message
    }, 500)
  }
})

export default app
