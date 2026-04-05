import type { SetupTypeOverride, TargetGroup } from './types';

export interface DetectInstitutionTypeResult {
    targetGroup: TargetGroup;
    setupTypeOverride: SetupTypeOverride;
}

/** 지역아동·아동센터 → 방과후 → 초등 → 유치원 → 어린이집. 매칭 없으면 null. */
export function detectInstitutionType(name: string): DetectInstitutionTypeResult | null {
    const t = String(name || '').trim();
    if (!t) return null;
    if (t.includes('지역아동') || t.includes('아동센터')) {
        return { targetGroup: 'elementary', setupTypeOverride: '지역아동센터' };
    }
    if (t.includes('방과후')) {
        return { targetGroup: 'elementary', setupTypeOverride: '방과후교실' };
    }
    if (t.includes('초등')) {
        return { targetGroup: 'elementary', setupTypeOverride: '초등학교' };
    }
    if (t.includes('유치원')) {
        return { targetGroup: 'preschool', setupTypeOverride: '유치원' };
    }
    if (t.includes('어린이집')) {
        return { targetGroup: 'preschool', setupTypeOverride: '어린이집' };
    }
    return null;
}
