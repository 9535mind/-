/**
 * 마인드스토리 교육 URL·챗봇 컨텍스트 빌더
 * 개강일·일정 문구는 D1 courses.next_cohort_start_date / schedule_info 만 신뢰한다.
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
    scheduleText: '강좌별 개강일은 아래 [등록된 강좌] 목록에 기록된 DB 값을 따른다.',
    detailHint: '관리자가 강좌 편집에서 입력한 날짜·일정 안내만 인용한다.',
  },
  {
    key: 'NEXT',
    name: 'MindStory Next',
    listPath: '/courses/next',
    kind: 'brand',
    scheduleText: '강좌별 개강일은 아래 [등록된 강좌] 목록에 기록된 DB 값을 따른다.',
    detailHint: '관리자가 강좌 편집에서 입력한 날짜·일정 안내만 인용한다.',
  },
  {
    key: 'NCS',
    name: 'NCS 국가직무능력표준',
    listPath: '/courses/ncs',
    kind: 'brand',
    scheduleText: '강좌별 개강일은 아래 [등록된 강좌] 목록에 기록된 DB 값을 따른다.',
    detailHint: 'NCS·직업훈련 세부는 과정 공지 및 산업인력공단 안내를 기준으로 한다.',
  },
  {
    key: 'CONSORTIUM',
    name: '기업·기관 공동훈련(Consortium)',
    listPath: '/courses/consortium',
    kind: 'consortium',
    scheduleText:
      '협약·단체 과정은 기업·기관 단위로 별도 확정. 개별 강좌가 등록된 경우 해당 강좌의 DB 일정 필드를 따른다.',
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
  next_cohort_start_date?: string | null
  schedule_info?: string | null
}

/**
 * DB 컬럼만으로 강좌 일정 한 줄 생성 (하드코딩 없음)
 */
export function resolveScheduleForCourse(row: CourseScheduleRow): {
  kind: ScheduleKind
  scheduleText: string
} {
  const dateRaw = (row.next_cohort_start_date || '').trim()
  const infoRaw = (row.schedule_info || '').trim()

  if (dateRaw) {
    return {
      kind: 'cohort',
      scheduleText: `다음 개강일은 ${formatCohortDateKo(dateRaw)}입니다. (DB next_cohort_start_date=${dateRaw})`,
    }
  }
  if (infoRaw) {
    return { kind: 'cohort', scheduleText: infoRaw }
  }
  return {
    kind: 'tbd',
    scheduleText: '해당 과정의 정확한 개강 일정은 현재 조율 중입니다.',
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
      const raw =
        `next_cohort_start_date=${(c.next_cohort_start_date ?? '').trim() || 'null'}, schedule_info=${(c.schedule_info ?? '').trim() ? '"' + (c.schedule_info || '').replace(/\n/g, ' ').slice(0, 200) + '"' : 'null'}`
      return `- [DB id=${c.id}] "${c.title}" (category_group=${cg}) | 일정: ${r.scheduleText} (유형=${r.kind}) | 원시: ${raw} | 상세·수강신청 URL: ${detail}`
    })
    .join('\n')

  return (
    `[마인드스토리 사이트 데이터: 교육 일정·URL]\n` +
    `공개 사이트 기준 URL: ${SITE_PUBLIC_ORIGIN}\n` +
    `개강일은 courses 테이블의 next_cohort_start_date(ISO 날짜) 또는 schedule_info(자유 텍스트)로 관리된다.\n` +
    `미입력 시: "해당 과정의 정확한 개강 일정은 현재 조율 중입니다."\n` +
    `공지·알림 페이지: ${COURSE_SCHEDULE_NOTIFY_PAGE_URL}\n\n` +
    `[브랜드·카탈로그]\n${brandLines}\n\n` +
    `[등록된 강좌(D1 courses)]\n${courseLines || '(등록된 공개 강좌가 없습니다.)'}\n`
  )
}
