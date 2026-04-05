/**
 * JTT-Kinder 역채점(초등 Q7 SPRT·Q11 AUTT) — O/X 슬롯 모델과 동일한 합산 규칙 검증.
 * 5점 척도 (max+1−점수) 는 문항당 0/1 슬롯일 때 예·아니오 스왑과 동치입니다.
 */
import assert from 'assert';

function parseCount(v) {
    const n = parseInt(String(v ?? ''), 10);
    return Number.isFinite(n) ? n : 0;
}

function activeFromQuestions(questions, counts) {
    const active = { SPRT: 0, SUMT: 0, AUTT: 0, WINT: 0 };
    for (const q of questions) {
        const row = counts[q.id];
        const y = parseCount(row?.yes);
        const x = parseCount(row?.no);
        if (q.isReverse) active[q.cat] += x;
        else active[q.cat] += y;
    }
    return active;
}

const el7 = { id: 'el_7', cat: 'SPRT', isReverse: true };
const el11 = { id: 'el_11', cat: 'AUTT', isReverse: true };

// Q7: 전원 「그렇다」(비공감 문장에 동의) → SPRT 축 가산 0
let a = activeFromQuestions([el7], { el_7: { yes: '10', no: '0' } });
assert.strictEqual(a.SPRT, 0, 'el_7 all yes: reverse should not add to SPRT');

// Q7: 전원 「아니다」 → SPRT +10
a = activeFromQuestions([el7], { el_7: { yes: '0', no: '10' } });
assert.strictEqual(a.SPRT, 10, 'el_7 all no: reverse adds to SPRT');

// Q11: 전원 「그렇다」(비신중 문장에 동의) → AUTT 축 가산 0
a = activeFromQuestions([el11], { el_11: { yes: '5', no: '0' } });
assert.strictEqual(a.AUTT, 0, 'el_11 all yes: reverse should not add to AUTT');

a = activeFromQuestions([el11], { el_11: { yes: '0', no: '5' } });
assert.strictEqual(a.AUTT, 5, 'el_11 all no: reverse adds to AUTT');

console.log('test-jtt-kinder: ok');
