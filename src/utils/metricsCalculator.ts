/**
 * JTT-Kinder 집단 학술 지표 엔진 (프론트·Node 공용).
 * Mean = Σ축 ÷ (학생 수 × 해당 축 문항 수) → 문항당 평균 원시 강도; 입력이 리커트(1~5) 합이면 1.0~5.0 해석이 됩니다.
 */

export type JTTTemperamentKey = 'SPRT' | 'SUMT' | 'AUTT' | 'WINT';

export interface JTTScoresRow {
    SPRT: number;
    SUMT: number;
    AUTT: number;
    WINT: number;
}

export interface JTTQuestionCounts extends JTTScoresRow {}

/** 유아부 8문항 — 축당 2 */
export const JTT_QUESTION_COUNTS_PRESCHOOL: JTTQuestionCounts = {
    SPRT: 2,
    SUMT: 2,
    AUTT: 2,
    WINT: 2,
};

/** 초등 12문항 — WINT×3, SPRT×4, AUTT×4, SUMT×1 */
export const JTT_QUESTION_COUNTS_ELEMENTARY: JTTQuestionCounts = {
    WINT: 3,
    SPRT: 4,
    SUMT: 1,
    AUTT: 4,
};

export interface JTTMetricsResult {
    density: JTTScoresRow;
    /** 축별 Σ ÷ (n × 문항수) — 리커트 합이면 1~5 척도 해석 */
    mean: JTTScoresRow;
    balance: number;
    adaptive: number;
    totalCount: number;
}

/**
 * @param scoresList 학생별 축 합계 (동일 집계 규칙)
 * @param questionCounts 축별 문항 수 (mean 분모)
 */
export function calculateJTTMetrics(
    scoresList: readonly JTTScoresRow[],
    questionCounts: JTTQuestionCounts
): JTTMetricsResult | null {
    const count = scoresList.length;
    if (count === 0) return null;

    const sum: JTTScoresRow = { SPRT: 0, SUMT: 0, AUTT: 0, WINT: 0 };
    scoresList.forEach((s) => {
        sum.SPRT += s.SPRT || 0;
        sum.SUMT += s.SUMT || 0;
        sum.AUTT += s.AUTT || 0;
        sum.WINT += s.WINT || 0;
    });

    const totalPoints = sum.SPRT + sum.SUMT + sum.AUTT + sum.WINT;

    const density: JTTScoresRow = {
        SPRT: Math.round((sum.SPRT / totalPoints) * 100) || 0,
        SUMT: Math.round((sum.SUMT / totalPoints) * 100) || 0,
        AUTT: Math.round((sum.AUTT / totalPoints) * 100) || 0,
        WINT: Math.round((sum.WINT / totalPoints) * 100) || 0,
    };

    const den = (axis: keyof JTTScoresRow) => {
        const d = count * (questionCounts[axis] || 0);
        return d > 0 ? Number((sum[axis] / d).toFixed(2)) || 0 : 0;
    };

    const mean: JTTScoresRow = {
        SPRT: den('SPRT'),
        SUMT: den('SUMT'),
        AUTT: den('AUTT'),
        WINT: den('WINT'),
    };

    const meanValues = [mean.SPRT, mean.SUMT, mean.AUTT, mean.WINT];
    const avgOfMeans = meanValues.reduce((a, b) => a + b, 0) / 4;
    const variance = meanValues.reduce((a, b) => a + Math.pow(b - avgOfMeans, 2), 0) / 4;
    const balance = Number(Math.sqrt(variance).toFixed(2));

    const adaptive = Number(((mean.SPRT + mean.WINT) / 2).toFixed(2));

    return { density, mean, balance, adaptive, totalCount: count };
}
