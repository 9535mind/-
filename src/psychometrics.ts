/**
 * 4JTT-Kinder (4 Jahreszeiten Temperament-Test für Kinder) — scoring (Potential model).
 * Ipsative X→alt routing removed; O/X split into active vs potential per q.cat.
 */

export const SPRT = 'SPRT' as const;
export const SUMT = 'SUMT' as const;
export const AUTT = 'AUTT' as const;
export const WINT = 'WINT' as const;

export const TEMPERAMENT_ORDER = [SPRT, SUMT, AUTT, WINT] as const;

export type TemperamentCategory = (typeof TEMPERAMENT_ORDER)[number];

export interface CountRow {
    yes: string | number;
    no: string | number;
}

export type ObservationCounts = Record<string, CountRow | undefined>;

export interface QuestionItem {
    id: string;
    cat: TemperamentCategory;
    isReverse?: boolean;
}

export interface ActivePotentialScores {
    activeScores: Record<TemperamentCategory, number>;
    potentialScores: Record<TemperamentCategory, number>;
}

export interface TemperamentDensityPercent extends Record<TemperamentCategory, number> {}

export interface GrowthPotentialPercent extends Record<TemperamentCategory, number> {}

export interface RankedTemperamentRow {
    rank: number;
    cat: TemperamentCategory;
    score: number;
    density_pct: number;
}

function emptyCatRecord(): Record<TemperamentCategory, number> {
    return { SPRT: 0, SUMT: 0, AUTT: 0, WINT: 0 };
}

function parseCount(v: string | number | undefined): number {
    const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10);
    return Number.isFinite(n) ? n : 0;
}

/**
 * O(예)·X(아니오) 슬롯을 기질 축별로 집계.
 * - 정방향: active += 예(yes), potential += 아니오(no)
 * - 역채점: 문항 정의상 긍정 신호는 no 열에 있으므로 active += no, potential += yes
 */
export function rawActivePotentialFromCounts(
    counts: ObservationCounts,
    questions: readonly QuestionItem[]
): ActivePotentialScores {
    const activeScores = emptyCatRecord();
    const potentialScores = emptyCatRecord();

    for (const q of questions) {
        const row = counts[q.id];
        const y = parseCount(row?.yes);
        const x = parseCount(row?.no);
        const cat = q.cat;
        if (q.isReverse) {
            activeScores[cat] += x;
            potentialScores[cat] += y;
        } else {
            activeScores[cat] += y;
            potentialScores[cat] += x;
        }
    }

    return { activeScores, potentialScores };
}

/** 기존 API 이름 호환 — 반환은 { activeScores, potentialScores } (ipsative 라우팅 없음) */
export function rawOTotalsFromCounts(
    counts: ObservationCounts,
    questions: readonly QuestionItem[]
): ActivePotentialScores {
    return rawActivePotentialFromCounts(counts, questions);
}

export function sumActiveScores(active: Record<TemperamentCategory, number>): number {
    return TEMPERAMENT_ORDER.reduce((s, k) => s + (active[k] || 0), 0);
}

export function sumPotentialScores(potential: Record<TemperamentCategory, number>): number {
    return TEMPERAMENT_ORDER.reduce((s, k) => s + (potential[k] || 0), 0);
}

/** 발현 비중(%) — 분모: activeScores 총합 */
export function temperamentDensityPercent(
    activeScores: Record<TemperamentCategory, number>
): TemperamentDensityPercent {
    const grand = sumActiveScores(activeScores) || 1;
    const out = {} as TemperamentDensityPercent;
    for (const c of TEMPERAMENT_ORDER) {
        out[c] = Math.round(((activeScores[c] || 0) / grand) * 100);
    }
    return out;
}

/**
 * 축별 잠재(미발현) 비중 % — 분모: 해당 축의 active + potential 관찰 슬롯 합
 */
export function growthPotentialPercent(
    activeScores: Record<TemperamentCategory, number>,
    potentialScores: Record<TemperamentCategory, number>
): GrowthPotentialPercent {
    const out = {} as GrowthPotentialPercent;
    for (const c of TEMPERAMENT_ORDER) {
        const a = activeScores[c] || 0;
        const p = potentialScores[c] || 0;
        const t = a + p;
        out[c] = t > 0 ? Math.round((p / t) * 100) : 0;
    }
    return out;
}

/** WINT → SPRT → AUTT → SUMT 동점 시 앞선 유형 우선 (forest SCHEMA.temperamentTieOrder) */
const TIE_ORDER: readonly TemperamentCategory[] = ['WINT', 'SPRT', 'AUTT', 'SUMT'];

export function rankTemperamentsByActive(activeScores: Record<TemperamentCategory, number>): RankedTemperamentRow[] {
    const grand = sumActiveScores(activeScores) || 1;
    const rows = TEMPERAMENT_ORDER.map((cat) => ({
        cat,
        score: activeScores[cat] || 0,
        density_pct: Math.round(((activeScores[cat] || 0) / grand) * 100),
    }));
    rows.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return TIE_ORDER.indexOf(a.cat) - TIE_ORDER.indexOf(b.cat);
    });
    return rows.map((r, i) => ({
        rank: i + 1,
        cat: r.cat,
        score: r.score,
        density_pct: r.density_pct,
    }));
}

export function totalOXSlotsFromCounts(counts: ObservationCounts, questions: readonly QuestionItem[]): number {
    let sum = 0;
    for (const q of questions) {
        const row = counts[q.id];
        sum += parseCount(row?.yes) + parseCount(row?.no);
    }
    return sum;
}

/** forest-question-banks.js 와 동일한 id/cat/isReverse (preschool 8) */
export const QUESTIONS_PRESCHOOL: readonly QuestionItem[] = [
    { id: 'ps21_1', cat: SPRT, isReverse: true },
    { id: 'ps21_2', cat: SPRT },
    { id: 'ps21_3', cat: SUMT },
    { id: 'ps21_4', cat: SUMT },
    { id: 'ps21_5', cat: AUTT },
    { id: 'ps21_6', cat: AUTT },
    { id: 'ps21_7', cat: WINT },
    { id: 'ps21_8', cat: WINT },
] as const;

/** forest-question-banks.js 와 동일 (elementary 12) */
export const QUESTIONS_ELEMENTARY: readonly QuestionItem[] = [
    { id: 'el_1', cat: WINT },
    { id: 'el_2', cat: WINT },
    { id: 'el_3', cat: WINT },
    { id: 'el_4', cat: SPRT },
    { id: 'el_5', cat: SPRT },
    { id: 'el_6', cat: SPRT },
    { id: 'el_7', cat: AUTT },
    { id: 'el_8', cat: AUTT },
    { id: 'el_9', cat: AUTT },
    { id: 'el_10', cat: SUMT },
    { id: 'el_11', cat: SUMT },
    { id: 'el_12', cat: SUMT },
] as const;

export function questionsForTargetGroup(targetGroup: 'preschool' | 'elementary'): readonly QuestionItem[] {
    return targetGroup === 'elementary' ? QUESTIONS_ELEMENTARY : QUESTIONS_PRESCHOOL;
}

export interface FourJttScoringResult {
    activeScores: Record<TemperamentCategory, number>;
    potentialScores: Record<TemperamentCategory, number>;
    densityPercent: TemperamentDensityPercent;
    growthPotential: GrowthPotentialPercent;
    rankedByActive: RankedTemperamentRow[];
    totalSlots: number;
}

export function scoreFourJttKinder(
    counts: ObservationCounts,
    targetGroup: 'preschool' | 'elementary'
): FourJttScoringResult {
    const qs = questionsForTargetGroup(targetGroup);
    const { activeScores, potentialScores } = rawActivePotentialFromCounts(counts, qs);
    return {
        activeScores,
        potentialScores,
        densityPercent: temperamentDensityPercent(activeScores),
        growthPotential: growthPotentialPercent(activeScores, potentialScores),
        rankedByActive: rankTemperamentsByActive(activeScores),
        totalSlots: totalOXSlotsFromCounts(counts, qs),
    };
}
