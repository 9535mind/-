/**
 * ═══ FOREST ZONE (FROZEN) ═══ 임의 수정·리팩터 금지. public/forest.html 전용. docs/FOREST-FROZEN.md
 *
 * JTT-Kinder metrics (browser) — mirrors src/utils/metricsCalculator.ts
 */
(function (global) {
    'use strict';

    global.JTT_QUESTION_COUNTS_PRESCHOOL = { SPRT: 2, SUMT: 2, AUTT: 2, WINT: 2 };
    /** 초등 12문항 황금 밸런스 — 축당 최대 6(△3+□3) */
    global.JTT_QUESTION_COUNTS_ELEMENTARY = { SPRT: 6, SUMT: 6, AUTT: 6, WINT: 6 };

    global.calculateJTTMetrics = function calculateJTTMetrics(scoresList, questionCounts) {
        var count = scoresList.length;
        if (count === 0) return null;

        var sum = { SPRT: 0, SUMT: 0, AUTT: 0, WINT: 0 };
        scoresList.forEach(function (s) {
            sum.SPRT += s.SPRT || 0;
            sum.SUMT += s.SUMT || 0;
            sum.AUTT += s.AUTT || 0;
            sum.WINT += s.WINT || 0;
        });

        var totalPoints = sum.SPRT + sum.SUMT + sum.AUTT + sum.WINT;

        var density = {
            SPRT: Math.round((sum.SPRT / totalPoints) * 100) || 0,
            SUMT: Math.round((sum.SUMT / totalPoints) * 100) || 0,
            AUTT: Math.round((sum.AUTT / totalPoints) * 100) || 0,
            WINT: Math.round((sum.WINT / totalPoints) * 100) || 0,
        };

        function den(axis) {
            var d = count * (questionCounts[axis] || 0);
            return d > 0 ? Number((sum[axis] / d).toFixed(2)) || 0 : 0;
        }

        var mean = {
            SPRT: den('SPRT'),
            SUMT: den('SUMT'),
            AUTT: den('AUTT'),
            WINT: den('WINT'),
        };

        var meanValues = [mean.SPRT, mean.SUMT, mean.AUTT, mean.WINT];
        var avgOfMeans = meanValues.reduce(function (a, b) {
            return a + b;
        }, 0) / 4;
        var variance = meanValues.reduce(function (a, b) {
            return a + Math.pow(b - avgOfMeans, 2);
        }, 0) / 4;
        var balance = Number(Math.sqrt(variance).toFixed(2));

        var adaptive = Number(((mean.SPRT + mean.WINT) / 2).toFixed(2));

        return { density: density, mean: mean, balance: balance, adaptive: adaptive, totalCount: count };
    };
})(typeof window !== 'undefined' ? window : globalThis);
