import type { ForestInstitution, TargetGroup } from './types';

/** forest.html STATE.guessType 과 동기화 */
export function guessTypeFromName(name: string, targetGroup: TargetGroup): string {
    const s = String(name);
    if (targetGroup === 'elementary') {
        if (s.includes('지역아동') || s.includes('아동센터')) return '지역아동센터';
        if (s.includes('초등학교') || (s.includes('초등') && s.includes('학교'))) return '초등학교';
        if (s.includes('방과후')) return '방과후교실';
        return '방과후교실';
    }
    if (s.includes('유치원') || s.includes('병설')) return '유치원';
    return '어린이집';
}

export function matchesInstPrepKind(
    inst: ForestInstitution,
    want: '어린이집' | '유치원' | '기타'
): boolean {
    const t = String(inst.type || '').trim();
    const n = String(inst.name || '');
    if (want === '기타') return t === '기타';
    const g = guessTypeFromName(n, 'preschool');
    if (want === '어린이집') {
        if (t === '어린이집') return true;
        if (t === '유치원') return false;
        return g === '어린이집';
    }
    if (want === '유치원') {
        if (t === '유치원') return true;
        if (t === '어린이집') return false;
        return g === '유치원';
    }
    return true;
}

export function matchesPresetPrepKind(
    name: string,
    want: '어린이집' | '유치원' | '기타'
): boolean {
    const n = String(name || '');
    if (want === '기타') return false;
    if (want === '어린이집') return n.includes('어린이집') && !n.includes('유치원');
    if (want === '유치원') return n.includes('유치원');
    return true;
}
