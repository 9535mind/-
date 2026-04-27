/**
 * /api/ms12/documents* — 구조화 문서 자산 + 자연어 검색·초안 결합
 */
import { Hono } from 'hono'
import { Bindings } from '../types/database'
import { ms12Access } from '../middleware/ms12-access'
import { successResponse, errorResponse } from '../utils/helpers'
import type { AppActor } from '../utils/actor'
import { participantKey } from '../utils/actor'
import { generateTextGeminiOrOpenAI } from '../utils/ai-text-generation'
import { uploadMs12DocumentToR2 } from '../utils/ms12-doc-upload'
import { getR2PublicBaseUrl } from '../utils/r2-image-upload'

type Ctx = { Bindings: Bindings; Variables: { actor: AppActor } }
const d = new Hono<Ctx>()

d.use(async (c, next) => {
  const segs = c.req.path.split('/').filter(Boolean)
  if (segs[segs.length - 1] === 'health') {
    return next()
  }
  if (!c.env?.DB) {
    const p = (c.req.path || '').split('?')[0] || c.req.path
    const isDocListGet =
      c.req.method === 'GET' &&
      /\/documents\/?$/.test(p) &&
      !/\/documents\//.test(p.replace(/\/$/, ''))
    if (isDocListGet) {
      return c.json(successResponse({ items: [], count: 0 }))
    }
    return c.json(errorResponse('DB 연결 없음. D1 바인딩을 확인하세요.'), 503)
  }
  return next()
})

function nowIso(): string {
  return new Date().toISOString()
}

const DOC_TYPES = ['제안서', '기획서', '결과보고서', '기타'] as const

function rowToDoc(
  row: Record<string, unknown>,
  env: Bindings,
): Record<string, unknown> {
  const fileKey = row.file_key as string | null
  return {
    id: row.id,
    title: row.title,
    docType: row.doc_type,
    year: row.year,
    targetAudience: row.target_audience,
    budgetWon: row.budget_won,
    outcomeSummary: row.outcome_summary,
    keywords: row.keywords,
    bodyExcerpt: row.body_excerpt,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileUrl: fileKey ? `${getR2PublicBaseUrl(env)}/${fileKey}` : null,
    meetingId: row.meeting_id,
    createdByKey: row.created_by_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

type SearchFilters = {
  docType?: string
  year?: number
  budgetMax?: number
  freeText?: string
}

d.get('/documents', ms12Access, async (c) => {
  const q = (c.req.query('q') || '').trim()
  const docType = (c.req.query('docType') || '').trim()
  const year = c.req.query('year') ? parseInt(c.req.query('year') || '', 10) : null
  const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20', 10) || 20))
  const offset = Math.max(0, parseInt(c.req.query('offset') || '0', 10) || 0)
  const conds: string[] = ['1=1']
  const binds: (string | number)[] = []
  if (docType && DOC_TYPES.includes(docType as (typeof DOC_TYPES)[number])) {
    conds.push('doc_type = ?')
    binds.push(docType)
  }
  if (year != null && !Number.isNaN(year)) {
    conds.push('year = ?')
    binds.push(year)
  }
  if (q) {
    const like = `%${q.replace(/[%_]/g, (m) => '\\' + m)}%`
    conds.push(
      '(title LIKE ? ESCAPE \'\\\' OR IFNULL(keywords,"") LIKE ? ESCAPE \'\\\' OR IFNULL(outcome_summary,"") LIKE ? ESCAPE \'\\\' OR IFNULL(body_excerpt,"") LIKE ? ESCAPE \'\\\' OR IFNULL(target_audience,"") LIKE ? ESCAPE \'\\\')',
    )
    binds.push(like, like, like, like, like)
  }
  const sql = `SELECT * FROM ms12_document_assets WHERE ${conds.join(' AND ')} ORDER BY updated_at DESC LIMIT ? OFFSET ?`
  binds.push(limit, offset)
  try {
    const res = await c.env.DB.prepare(sql)
      .bind(...binds)
      .all()
    const list = (res.results || []).map((r) => rowToDoc(r as Record<string, unknown>, c.env))
    return c.json(successResponse({ items: list, count: list.length }))
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e)
    if (/no such table/i.test(m)) {
      return c.json(successResponse({ items: [], count: 0 }))
    }
    console.error('[ms12] documents list', m.slice(0, 200))
    return c.json(errorResponse('목록을 불러올 수 없습니다.'), 500)
  }
})

d.get('/documents/:id', ms12Access, async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  if (!id) {
    return c.json(errorResponse('id가 올바르지 않습니다.'), 400)
  }
  try {
    const row = await c.env.DB.prepare(`SELECT * FROM ms12_document_assets WHERE id = ?`)
      .bind(id)
      .first<Record<string, unknown>>()
    if (!row) {
      return c.json(errorResponse('문서를 찾을 수 없습니다.'), 404)
    }
    return c.json(successResponse(rowToDoc(row, c.env)))
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e)
    if (/no such table/i.test(m)) {
      return c.json(errorResponse('문서 자산 테이블이 없습니다.'), 503)
    }
    return c.json(errorResponse('조회에 실패했습니다.'), 500)
  }
})

function parseFilterJson(raw: string): SearchFilters | null {
  const t = raw.trim()
  const m = t.match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    const o = JSON.parse(m[0]) as Record<string, unknown>
    const f: SearchFilters = {}
    if (typeof o.docType === 'string' && DOC_TYPES.includes(o.docType as (typeof DOC_TYPES)[number])) {
      f.docType = o.docType
    }
    if (o.year != null) {
      const y = typeof o.year === 'number' ? o.year : parseInt(String(o.year), 10)
      if (!Number.isNaN(y)) f.year = y
    }
    if (o.budgetMax != null) {
      const b = typeof o.budgetMax === 'number' ? o.budgetMax : parseInt(String(o.budgetMax), 10)
      if (!Number.isNaN(b)) f.budgetMax = b
    }
    if (typeof o.freeText === 'string' && o.freeText.trim()) f.freeText = o.freeText.trim()
    if (typeof o.keyword === 'string' && o.keyword.trim() && !f.freeText) f.freeText = o.keyword.trim()
    return f
  } catch {
    return null
  }
}

async function runFilteredSearch(
  db: D1Database,
  f: SearchFilters,
  limit: number,
): Promise<Array<Record<string, unknown>>> {
  const conds: string[] = ['1=1']
  const binds: (string | number)[] = []
  if (f.docType) {
    conds.push('doc_type = ?')
    binds.push(f.docType)
  }
  if (f.year != null) {
    conds.push('year = ?')
    binds.push(f.year)
  }
  if (f.budgetMax != null) {
    conds.push('(budget_won IS NOT NULL AND budget_won <= ?)')
    binds.push(f.budgetMax)
  }
  if (f.freeText) {
    const like = `%${f.freeText.replace(/[%_]/g, (x) => '\\' + x)}%`
    conds.push(
      '(title LIKE ? ESCAPE \'\\\' OR IFNULL(keywords,"") LIKE ? ESCAPE \'\\\' OR IFNULL(outcome_summary,"") LIKE ? ESCAPE \'\\\' OR IFNULL(body_excerpt,"") LIKE ? ESCAPE \'\\\' )',
    )
    binds.push(like, like, like, like)
  }
  const sql = `SELECT * FROM ms12_document_assets WHERE ${conds.join(' AND ')} ORDER BY updated_at DESC LIMIT ?`
  binds.push(limit)
  const res = await db.prepare(sql)
    .bind(...binds)
    .all()
  return (res.results || []) as Array<Record<string, unknown>>
}

d.post('/documents/ai-search', ms12Access, async (c) => {
  let body: { question?: string; limit?: number } = {}
  try {
    body = (await c.req.json()) as { question?: string; limit?: number }
  } catch {
    return c.json(errorResponse('JSON 본문이 필요합니다.'), 400)
  }
  const q = String(body.question || '').trim()
  if (!q) {
    return c.json(errorResponse('질문을 입력하세요.'), 400)
  }
  const limit = Math.min(30, Math.max(1, body.limit || 20))
  const system = `사용자는 기관 내부 사업·공모·보고 문서를 찾고 있습니다. 아래 질문을 읽고 JSON만 출력하세요. 키: docType(문자열, 다음 중 하나만: "제안서","기획서","결과보고서","기타" 또는 생략), year(4자리 연도 숫자 또는 생략), budgetMax(원화 예산 이하, 숫자, 없으면 생략), freeText(핵심 키워드 한두 단어, 없으면 생략), keyword(자유 키워드, freeText와 같음). 예: {"year":2024,"budgetMax":10000000,"docType":"제안서"}\n없는 필드는 생략. JSON 이외의 텍스트는 쓰지 마세요.`
  let filters: SearchFilters = {}
  try {
    const raw = await generateTextGeminiOrOpenAI(c.env, q, system)
    filters = parseFilterJson(raw) || {}
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === 'NO_AI_KEY') {
      return c.json(
        errorResponse('AI 키가 없으면 자연어 해석이 불가합니다. GEMINI_API_KEY 또는 OPENAI_API_KEY를 설정하세요.'),
        503,
      )
    }
    filters = { freeText: q.slice(0, 80) }
  }
  if (!Object.keys(filters).length) {
    filters = { freeText: q.slice(0, 120) }
  }
  try {
    const rows = await runFilteredSearch(c.env.DB, filters, limit)
    const items = rows.map((r) => rowToDoc(r, c.env))
    return c.json(
      successResponse({
        question: q,
        filters,
        items,
      }),
    )
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e)
    if (/no such table/i.test(m)) {
      return c.json(errorResponse('문서 자산 테이블이 없습니다.'), 503)
    }
    return c.json(errorResponse('검색에 실패했습니다.'), 500)
  }
})

d.post('/documents/combine-draft', ms12Access, async (c) => {
  let body: { documentIds?: number[]; instruction?: string } = {}
  try {
    body = (await c.req.json()) as { documentIds?: number[]; instruction?: string }
  } catch {
    return c.json(errorResponse('JSON 본문이 필요합니다.'), 400)
  }
  const ids = Array.isArray(body.documentIds) ? body.documentIds.map((n) => parseInt(String(n), 10)).filter((x) => x > 0) : []
  if (ids.length < 2) {
    return c.json(errorResponse('documentIds에 숫자 id를 2개 이상 넣으세요.'), 400)
  }
  if (ids.length > 8) {
    return c.json(errorResponse('최대 8개까지 선택할 수 있습니다.'), 400)
  }
  const placeholders = ids.map(() => '?').join(',')
  const rows = await c.env.DB.prepare(`SELECT * FROM ms12_document_assets WHERE id IN (${placeholders})`)
    .bind(...ids)
    .all()
  const found = (rows.results || []) as Array<Record<string, unknown>>
  if (found.length < 2) {
    return c.json(errorResponse('선택한 문서를 모두 찾을 수 없습니다.'), 404)
  }
  const blocks = found
    .map(
      (r) =>
        `### ${r.title} (${r.doc_type}, ${r.year || '연도미상'})\n` +
        `핵심/요약: ${(r.outcome_summary || '') || (r.body_excerpt || '') || '—'}`,
    )
    .join('\n\n')
  const purpose =
    (body.instruction && String(body.instruction).trim()) || '기관 제출용 제안서 또는 기획서 초안'
  const system = `당신은 기관의 사업·공모용 문서 편집을 돕습니다. 아래는 여러 문서에서 추출한 요약입니다. 중복을 줄이고 강점을 합쳐 ${purpose}에 맞는 상세한 초안(한국어)을 마크다운으로 작성하세요. 없는 수치·실적은 지어내지 마세요.`
  const user = blocks.slice(0, 12000)
  try {
    const draft = await generateTextGeminiOrOpenAI(c.env, user, system)
    return c.json(successResponse({ documentIds: ids, draft: draft.trim() }))
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === 'NO_AI_KEY') {
      return c.json(errorResponse('AI 키가 필요합니다.'), 503)
    }
    return c.json(errorResponse('초안을 만들지 못했습니다.'), 502)
  }
})

d.post('/documents', ms12Access, async (c) => {
  const actor = c.get('actor')
  const by = participantKey(actor)
  const ct = c.req.header('content-type') || ''
  const t0 = nowIso()
  if (ct.includes('multipart/form-data')) {
    let data: Record<string, unknown>
    try {
      data = (await c.req.parseBody()) as Record<string, unknown>
    } catch {
      return c.json(errorResponse('요청을 해석할 수 없습니다.'), 400)
    }
    const file = data.file
    if (!(file instanceof File)) {
      return c.json(errorResponse('file 필드에 파일을 첨부하세요. (메타데이터 전용이면 JSON POST를 쓰세요)'), 400)
    }
    let fileKey: string | null = null
    let fileName = file.name
    let mime = file.type
    try {
      const up = await uploadMs12DocumentToR2(c.env, file)
      fileKey = up.key
    } catch (e) {
      const m = (e instanceof Error && e.message) || String(e)
      if (m === 'R2_NOT_CONFIGURED') {
        return c.json(
          errorResponse('R2가 없어 파일을 저장할 수 없습니다. Cloudflare에 R2를 연결하거나, JSON으로 본문만 등록하세요.'),
          503,
        )
      }
      if (m === 'UNSUPPORTED_TYPE' || m === 'FILE_TOO_LARGE') {
        return c.json(errorResponse('지원하지 않는 형식이거나 용량이 큽니다. (최대 20MB)'), 400)
      }
      return c.json(errorResponse('업로드에 실패했습니다.'), 500)
    }
    const title = String(data.title || file.name).trim()
    if (!title) {
      return c.json(errorResponse('title이 필요합니다.'), 400)
    }
    const docType = String(data.docType || '기타').trim()
    const yearV = data.year != null && String(data.year) !== '' ? parseInt(String(data.year), 10) : null
    const year = yearV != null && !Number.isNaN(yearV) ? yearV : null
    const ins = {
      title,
      docType: DOC_TYPES.includes(docType as (typeof DOC_TYPES)[number]) ? docType : '기타',
      year,
      targetAudience: String(data.targetAudience || '').trim() || null,
      budgetWon: data.budgetWon != null && String(data.budgetWon) !== '' ? parseInt(String(data.budgetWon), 10) : null,
      outcomeSummary: String(data.outcomeSummary || '').trim() || null,
      keywords: String(data.keywords || '').trim() || null,
      bodyExcerpt: String(data.bodyExcerpt || '').trim() || null,
      meetingId: data.meetingId != null && String(data.meetingId).trim() ? String(data.meetingId).trim() : null,
    }
    try {
      const r = await c.env.DB.prepare(
        `INSERT INTO ms12_document_assets
        (title, doc_type, year, target_audience, budget_won, outcome_summary, keywords, body_excerpt, file_key, file_name, mime_type, meeting_id, created_by_key, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      )
        .bind(
          ins.title,
          ins.docType,
          ins.year,
          ins.targetAudience,
          ins.budgetWon,
          ins.outcomeSummary,
          ins.keywords,
          ins.bodyExcerpt,
          fileKey,
          fileName,
          mime,
          ins.meetingId,
          by,
          t0,
          t0,
        )
        .run()
      const newId = r.meta?.last_row_id
      if (!newId) {
        return c.json(errorResponse('저장에 실패했습니다.'), 500)
      }
      return c.json(successResponse({ id: newId, ...ins, fileUrl: `${getR2PublicBaseUrl(c.env)}/${fileKey}` }))
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e)
      if (/no such table/i.test(m)) {
        return c.json(errorResponse('문서 자산 테이블이 없습니다.'), 503)
      }
      return c.json(errorResponse('저장에 실패했습니다.'), 500)
    }
  }
  let body: Record<string, unknown> = {}
  try {
    body = (await c.req.json()) as Record<string, unknown>
  } catch {
    return c.json(errorResponse('JSON 본문이 필요합니다.'), 400)
  }
  const title = String(body.title || '').trim()
  if (!title) {
    return c.json(errorResponse('title을 입력하세요.'), 400)
  }
  const docTypeRaw = String(body.docType || '기타').trim()
  const docType = DOC_TYPES.includes(docTypeRaw as (typeof DOC_TYPES)[number]) ? docTypeRaw : '기타'
  const yearB = body.year != null && String(body.year) !== '' ? parseInt(String(body.year), 10) : null
  const year = yearB != null && !Number.isNaN(yearB) ? yearB : null
  const budgetB = body.budgetWon != null && String(body.budgetWon) !== '' ? parseInt(String(body.budgetWon), 10) : null
  const budgetWon = budgetB != null && !Number.isNaN(budgetB) ? budgetB : null
  const bodyExcerpt = String(body.bodyExcerpt || body.body_excerpt || '').trim() || null
  if (!bodyExcerpt && !(body as { fileKey?: string }).fileKey) {
    return c.json(errorResponse('본문(bodyExcerpt)을 넣거나 파일 업로드(multipart)를 사용하세요.'), 400)
  }
  try {
    const r = await c.env.DB.prepare(
      `INSERT INTO ms12_document_assets
      (title, doc_type, year, target_audience, budget_won, outcome_summary, keywords, body_excerpt, file_key, file_name, mime_type, meeting_id, created_by_key, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
      .bind(
        title,
        docType,
        year,
        String(body.targetAudience || body.target_audience || '').trim() || null,
        budgetWon,
        String(body.outcomeSummary || '').trim() || null,
        String(body.keywords || '').trim() || null,
        bodyExcerpt,
        (body as { fileKey?: string }).fileKey || null,
        null,
        null,
        body.meetingId != null ? String(body.meetingId) : null,
        by,
        t0,
        t0,
      )
      .run()
    const newId = r.meta?.last_row_id
    return c.json(successResponse({ id: newId, title, docType, year, budgetWon, meetingId: body.meetingId || null }))
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e)
    if (/no such table/i.test(m)) {
      return c.json(errorResponse('문서 자산 테이블이 없습니다.'), 503)
    }
    return c.json(errorResponse('저장에 실패했습니다.'), 500)
  }
})

d.post('/documents/:id/ai-upgrade', ms12Access, async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  if (!id) {
    return c.json(errorResponse('id가 올바르지 않습니다.'), 400)
  }
  let body: { instruction?: string } = {}
  try {
    body = (await c.req.json()) as { instruction?: string }
  } catch {
    body = {}
  }
  const row = await c.env.DB.prepare(`SELECT * FROM ms12_document_assets WHERE id = ?`)
    .bind(id)
    .first<Record<string, unknown>>()
  if (!row) {
    return c.json(errorResponse('문서를 찾을 수 없습니다.'), 404)
  }
  const base =
    `제목: ${row.title}\n유형: ${row.doc_type}\n` +
    `성과/요약: ${row.outcome_summary || '—'}\n` +
    `본문(발췌): ${(row.body_excerpt || '—').toString().slice(0, 10000)}`
  const inst =
    (body.instruction && String(body.instruction).trim()) ||
    '최신 공문·기관 양식에 맞게 문장을 다듬고, 논리 구조를 개선하세요. 한국어로 전체를 출력하세요.'
  const system = `당신은 기관의 제안·보고 문서를 다듬는 편집자입니다. 지어낸 사실은 쓰지 마세요.`
  try {
    const text = await generateTextGeminiOrOpenAI(c.env, base, inst + '\n' + system)
    return c.json(successResponse({ id, upgraded: text.trim() }))
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === 'NO_AI_KEY') {
      return c.json(errorResponse('AI 키가 필요합니다.'), 503)
    }
    return c.json(errorResponse('개선문을 만들지 못했습니다.'), 502)
  }
})

d.delete('/documents/:id', ms12Access, async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  if (!id) {
    return c.json(errorResponse('id가 올바르지 않습니다.'), 400)
  }
  const actor = c.get('actor')
  const by = participantKey(actor)
  const row = await c.env.DB.prepare(`SELECT file_key, created_by_key FROM ms12_document_assets WHERE id = ?`)
    .bind(id)
    .first<{ file_key: string | null; created_by_key: string | null }>()
  if (!row) {
    return c.json(errorResponse('문서를 찾을 수 없습니다.'), 404)
  }
  if (row.created_by_key !== by) {
    return c.json(errorResponse('본인이 등록한 문서만 삭제할 수 있습니다.'), 403)
  }
  await c.env.DB.prepare(`DELETE FROM ms12_document_assets WHERE id = ?`).bind(id).run()
  if (row.file_key && c.env.R2) {
    try {
      await c.env.R2.delete(row.file_key)
    } catch (e) {
      console.error('[ms12] r2 delete', e)
    }
  }
  return c.json(successResponse({ id, deleted: true }))
})

export default d
