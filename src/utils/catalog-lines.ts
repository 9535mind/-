/**
 * 강좌 카탈로그 라인 — courses.category_group 에 CSV(예: CLASSIC,NCS,NEXT)로 저장
 */

export const CATALOG_LINE_KEYS = ['CLASSIC', 'NEXT', 'NCS'] as const
export type CatalogLineKey = (typeof CATALOG_LINE_KEYS)[number]

export const CATALOG_LINE_LABELS: Record<CatalogLineKey, string> = {
  CLASSIC: 'Classic — 일반·본질',
  NEXT: 'Next — 특화·미래',
  NCS: 'NCS — 국가직무능력표준',
}

const ALLOWED = new Set<string>(CATALOG_LINE_KEYS)

/** 표시·저장용 안정 순서 */
const SORT_ORDER: Record<string, number> = { CLASSIC: 0, NCS: 1, NEXT: 2 }

export function parseCatalogLines(raw: string | null | undefined): CatalogLineKey[] {
  const s = (raw ?? '').trim()
  if (!s) return ['CLASSIC']
  const parts = s
    .split(/[,，]/)
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean)
  const seen = new Set<string>()
  const out: CatalogLineKey[] = []
  for (const p of parts) {
    if (!ALLOWED.has(p)) continue
    if (seen.has(p)) continue
    seen.add(p)
    out.push(p as CatalogLineKey)
  }
  return out.length ? out : ['CLASSIC']
}

export function formatCatalogLinesCsv(lines: CatalogLineKey[]): string {
  return sortCatalogLines(lines).join(',')
}

export function sortCatalogLines(lines: CatalogLineKey[]): CatalogLineKey[] {
  return [...lines].sort((a, b) => (SORT_ORDER[a] ?? 99) - (SORT_ORDER[b] ?? 99))
}

/** 관리자 API 본문: 문자열·문자열 배열·쉼표 문자열 */
export function normalizeCategoryGroupInput(input: unknown): string {
  let tokens: string[] = []
  if (Array.isArray(input)) {
    tokens = input.map((x) => String(x).trim().toUpperCase()).filter(Boolean)
  } else if (input != null && String(input).trim() !== '') {
    tokens = String(input)
      .split(/[,，]/)
      .map((p) => p.trim().toUpperCase())
      .filter(Boolean)
  }
  const parsed = parseCatalogLines(tokens.length ? tokens.join(',') : 'CLASSIC')
  return formatCatalogLinesCsv(parsed)
}

export function courseMatchesCatalogLine(dbValue: string | null | undefined, line: CatalogLineKey): boolean {
  return parseCatalogLines(dbValue).includes(line)
}

/** SQLite: 강좌 행이 해당 라인 토큰을 포함하는지 (category_group 은 공백 없는 CSV 권장) */
export function sqlCategoryGroupMatchesLine(): string {
  return `instr(',' || replace(upper(trim(ifnull(category_group, 'CLASSIC'))), ' ', '') || ',', ',' || ? || ',') > 0`
}
