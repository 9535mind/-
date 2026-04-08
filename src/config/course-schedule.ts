/**
 * 마인드스토리 교육 URL·챗봇 컨텍스트 빌더
 * 오프라인 모임 안내는 courses.schedule_info(DB)만 신뢰한다.
 */

import { SITE_INTERNET_DOMAIN } from '../utils/site-footer-legal'
import { parseCatalogLines } from '../utils/catalog-lines'

export const SITE_PUBLIC_ORIGIN = SITE_INTERNET_DOMAIN.replace(/\/$/, '')

/** 사이트 내 공지·알림 페이지 — 개강 미입력 시 안내 */
export const COURSE_SCHEDULE_NOTIFY_PAGE_URL = `${SITE_PUBLIC_ORIGIN}/community`

export type ScheduleKind = 'cohort' | 'tbd' | 'consortium' | 'brand'

export interface BrandScheduleRow {
  key: string
  name: string
  listPath: string
  kind: ScheduleKind
  scheduleText: string
  detailHint?: string
}

/** 브랜드 카탈로그 URL만 고정. 일정 수치는 DB 강좌 행을 따른다. */
export const BRAND_SCHEDULE_ROWS: BrandScheduleRow[] = [
  {
    key: 'CLASSIC',
    name: 'MindStory Classic',
    listPath: '/courses/classic',
    kind: 'brand',
    scheduleText: '원격 수강이 기본이며, 오프라인 모임·지역 안내는 아래 [등록된 강좌]의 schedule_info를 따른다.',
    detailHint: '관리자가 강좌 편집에서 입력한 오프라인 모임 안내만 인용한다.',
  },
  {
    key: 'NEXT',
    name: 'MindStory Next',
    listPath: '/courses/next',
    kind: 'brand',
    scheduleText: '원격 수강이 기본이며, 오프라인 모임·지역 안내는 아래 [등록된 강좌]의 schedule_info를 따른다.',
    detailHint: '관리자가 강좌 편집에서 입력한 오프라인 모임 안내만 인용한다.',
  },
  {
    key: 'NCS',
    name: 'NCS 국가직무능력표준',
    listPath: '/courses/ncs',
    kind: 'brand',
    scheduleText: '원격 수강이 기본이며, 오프라인 모임·지역 안내는 아래 [등록된 강좌]의 schedule_info를 따른다.',
    detailHint: 'NCS·직업훈련 세부는 과정 공지 및 산업인력공단 안내를 기준으로 한다.',
  },
  {
    key: 'CONSORTIUM',
    name: '기업·기관 공동훈련(Consortium)',
    listPath: '/courses/consortium',
    kind: 'consortium',
    scheduleText:
      '협약·단체 과정은 기업·기관 단위로 별도 확정. 개별 강좌가 등록된 경우 해당 강좌의 오프라인 모임 안내(schedule_info)를 따른다.',
    detailHint: 'NCS·출석·수료 세부는 해당 안내 페이지 및 강좌 상세를 기준으로 한다.',
  },
]

/** ISO YYYY-MM-DD → 한국어 날짜 (챗봇 컨텍스트용) */
export function formatCohortDateKo(iso: string): string {
  const s = (iso || '').trim()
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (!m) return s
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return s
  return `${y}년 ${mo}월 ${d}일`
}

export function courseDetailUrl(courseId: number): string {
  return `${SITE_PUBLIC_ORIGIN}/courses/${courseId}`
}

export type CourseScheduleRow = {
  id: number
  title: string
  category_group?: string | null
  schedule_info?: string | null
  /** 챗봇 맥락용 짧은 발췌 (전체 본문 아님) */
  description?: string | null
  price?: number | null
  sale_price?: number | null
  is_free?: number | null
}

export function formatCoursePriceLine(row: CourseScheduleRow): string {
  if (row.is_free === 1) return '무료'
  const sale = row.sale_price != null && row.sale_price > 0 ? row.sale_price : null
  const base = row.price != null && row.price > 0 ? row.price : null
  const p = sale ?? base
  if (p == null || p === 0) return '금액은 강좌 상세 페이지의 DB 값을 따른다'
  return `${Number(p).toLocaleString('ko-KR')}원`
}

function descriptionSnippet(raw: string | null | undefined, max = 140): string {
  const t = (raw || '').replace(/\s+/g, ' ').trim()
  if (!t) return ''
  return t.length <= max ? t : t.slice(0, max) + '…'
}

/**
 * DB 컬럼만으로 오프라인 모임 안내 한 줄 생성
 */
export function resolveScheduleForCourse(row: CourseScheduleRow): {
  kind: ScheduleKind
  scheduleText: string
} {
  const infoRaw = (row.schedule_info || '').trim()
  if (infoRaw) {
    return { kind: 'cohort', scheduleText: infoRaw }
  }
  return {
    kind: 'tbd',
    scheduleText: '오프라인 모임 안내가 아직 등록되지 않았습니다.',
  }
}

export function buildCourseScheduleContextBlock(courses: CourseScheduleRow[]): string {
  const brandLines = BRAND_SCHEDULE_ROWS.map((b) => {
    const u = `${SITE_PUBLIC_ORIGIN}${b.listPath}`
    return (
      `- ${b.name}: 유형=${b.kind} | ${b.scheduleText} | 목록 URL: ${u}` +
      (b.detailHint ? ` | 참고: ${b.detailHint}` : '')
    )
  }).join('\n')

  const courseLines = courses
    .map((c) => {
      const cg = parseCatalogLines(c.category_group).join(',')
      const r = resolveScheduleForCourse(c)
      const detail = courseDetailUrl(c.id)
      const desc = descriptionSnippet(c.description)
      const priceLine = formatCoursePriceLine(c)
      const raw =
        `schedule_info=${(c.schedule_info ?? '').trim() ? '"' + (c.schedule_info || '').replace(/\n/g, ' ').slice(0, 200) + '"' : 'null'}`
      return (
        `- [DB id=${c.id}] "${c.title}" (category_group=${cg}) | 일정: ${r.scheduleText} (유형=${r.kind}) | 가격·수강료: ${priceLine}` +
        (desc ? ` | 설명 발췌: ${desc}` : '') +
        ` | 원시: ${raw} | 상세·수강신청 URL: ${detail}`
      )
    })
    .join('\n')

  return (
    `[마인드스토리 사이트 데이터: 오프라인 모임·URL]\n` +
    `공개 사이트 기준 URL: ${SITE_PUBLIC_ORIGIN}\n` +
    `오프라인 모임 안내는 courses.schedule_info(자유 텍스트)로 관리된다.\n` +
    `미입력 시: "오프라인 모임 안내가 아직 등록되지 않았습니다."\n` +
    `공지·알림 페이지: ${COURSE_SCHEDULE_NOTIFY_PAGE_URL}\n\n` +
    `[브랜드·카탈로그]\n${brandLines}\n\n` +
    `[등록된 강좌(D1 courses)]\n${courseLines || '(등록된 공개 강좌가 없습니다.)'}\n`
  )
}
