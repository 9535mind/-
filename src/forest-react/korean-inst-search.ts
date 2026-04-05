/** public/forest.html 과 동일한 한글 기관명 검색 유틸 (순수 함수) */

const HANGUL_SYLLABLE_START = 0xac00;
const HANGUL_SYLLABLE_END = 0xd7a3;

export const CHOSEONG_JAMO: string[] = [
    'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];

export function isHangulConsonantJamoChar(ch: string): boolean {
    const c = ch.charCodeAt(0);
    return (c >= 0x3131 && c <= 0x314e) || (c >= 0x1100 && c <= 0x1112);
}

export function normalizeChoseongQueryToCompatibilityJamo(str: string): string {
    let out = '';
    const s = String(str || '');
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        if (c >= 0x1100 && c <= 0x1112) {
            out += CHOSEONG_JAMO[c - 0x1100] || '';
        } else {
            out += s[i];
        }
    }
    return out;
}

export function isChoseongOnlyQueryStr(str: string): boolean {
    const s = String(str || '').trim();
    if (!s) return false;
    for (let i = 0; i < s.length; i++) {
        if (!isHangulConsonantJamoChar(s[i])) return false;
    }
    return true;
}

function initialChoseongFromHangulSyllable(ch: string): string {
    const c = ch.charCodeAt(0);
    if (c >= HANGUL_SYLLABLE_START && c <= HANGUL_SYLLABLE_END) {
        const idx = Math.floor((c - HANGUL_SYLLABLE_START) / 588);
        return CHOSEONG_JAMO[idx] || '';
    }
    return '';
}

export function extractChoseongSequenceFromName(name: string): string {
    const s = String(name || '');
    let out = '';
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        const cc = ch.charCodeAt(0);
        if (cc >= HANGUL_SYLLABLE_START && cc <= HANGUL_SYLLABLE_END) {
            out += initialChoseongFromHangulSyllable(ch);
        }
    }
    return out;
}

export function normalizeForInstSearchKey(s: string): string {
    return String(s || '')
        .trim()
        .normalize('NFC')
        .toLocaleLowerCase('ko-KR');
}

export function normalizePresetInstitutionNames(arr: readonly string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of arr || []) {
        const n = String(raw || '').trim();
        if (!n) continue;
        const k = n.toLocaleLowerCase('ko-KR');
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(n);
    }
    return out;
}

export function isPreschoolFacilityPresetName(name: string): boolean {
    const n = String(name || '');
    return n.includes('어린이집') || n.includes('유치원') || (n.includes('병설') && n.includes('유치원'));
}
