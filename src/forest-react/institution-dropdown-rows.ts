/**
 * forest.html MS.buildInstitutionDropdownRows 와 동일한 결과를 내는 순수 함수.
 */
import type {
    ForestInstitution,
    ForestSchemaApi,
    InstitutionDropdownRow,
    SetupTypeOverride,
    TargetGroup,
} from './types';
import {
    extractChoseongSequenceFromName,
    isChoseongOnlyQueryStr,
    isPreschoolFacilityPresetName,
    normalizeChoseongQueryToCompatibilityJamo,
    normalizeForInstSearchKey,
    normalizePresetInstitutionNames,
} from './korean-inst-search';
import { guessTypeFromName, matchesInstPrepKind, matchesPresetPrepKind } from './institution-match';

/** 검색창 하단 퀵 필터 — buildInstitutionDropdownRows 최종 단계에서 적용 */
export type CategoryChipFilter = 'ALL' | 'DAYCARE' | 'KINDER' | 'ELEMENTARY_OTHER';

export interface BuildInstitutionDropdownOptions {
    schema: ForestSchemaApi;
    institutions: ForestInstitution[];
    presetDatabase: readonly string[];
    targetGroup: TargetGroup;
    setupTypeOverride: SetupTypeOverride;
    query: string;
    allMode: boolean;
    /** 기본 ALL — 초성·문자열 매칭 후 추가로 카테고리만 표시 */
    categoryChip?: CategoryChipFilter;
}

function rowMatchesCategoryChip(
    row: InstitutionDropdownRow,
    chip: CategoryChipFilter,
    schema: ForestSchemaApi
): boolean {
    if (chip === 'ALL') return true;
    if (row.kind === 'preset') {
        const n = row.name;
        if (chip === 'ELEMENTARY_OTHER') return false;
        if (chip === 'DAYCARE') return matchesPresetPrepKind(n, '어린이집');
        if (chip === 'KINDER') return matchesPresetPrepKind(n, '유치원');
        return false;
    }
    const inst = row.inst;
    const tg = schema.getTargetGroup(inst);
    const t = String(inst.type || '').trim();
    const n = String(inst.name || '');
    if (chip === 'DAYCARE') {
        if (tg !== 'preschool') return false;
        return matchesInstPrepKind(inst, '어린이집');
    }
    if (chip === 'KINDER') {
        if (tg !== 'preschool') return false;
        return matchesInstPrepKind(inst, '유치원');
    }
    if (chip === 'ELEMENTARY_OTHER') {
        if (tg !== 'elementary') return false;
        if (['지역아동센터', '방과후교실', '초등학교', '기타'].includes(t)) return true;
        const g = guessTypeFromName(n, 'elementary');
        return g === '지역아동센터' || g === '방과후교실' || g === '초등학교' || t === '기타';
    }
    return true;
}

export function buildInstitutionDropdownRows(opts: BuildInstitutionDropdownOptions): InstitutionDropdownRow[] {
    const {
        schema,
        institutions,
        presetDatabase,
        targetGroup: tg,
        setupTypeOverride: setupOvr,
        query,
        allMode,
        categoryChip = 'ALL',
    } = opts;

    let instList = institutions.filter((i) => schema.getTargetGroup(i) === tg);
    const presetNamesAll = normalizePresetInstitutionNames([...presetDatabase]).filter(isPreschoolFacilityPresetName);
    const nameKey = (nm: string) => normalizeForInstSearchKey(nm);
    const namesFromInst = new Set(instList.map((i) => nameKey(i.name)));

    const virtualPresets =
        tg === 'preschool' ? presetNamesAll.filter((n) => !namesFromInst.has(nameKey(n))) : [];

    const qt = query.trim();
    const ql = normalizeForInstSearchKey(qt);
    const choseongMode = isChoseongOnlyQueryStr(qt);

    const nameMatches = (nm: string) => {
        if (allMode) return true;
        if (qt.length < 1) return false;
        if (choseongMode) {
            const seq = extractChoseongSequenceFromName(nm);
            const qNorm = normalizeChoseongQueryToCompatibilityJamo(qt);
            return seq.includes(qNorm);
        }
        return nameKey(nm).includes(ql);
    };

    if (tg === 'preschool') {
        instList = instList.filter((i) => {
            const t = String(i.type || '').trim();
            const n = String(i.name || '');
            if (t === '기타' && !/(어린이집|유치원|병설)/.test(n)) return false;
            return true;
        });
    }

    instList = instList.filter((i) => nameMatches(i.name));

    let filteredVirtual = virtualPresets.filter((n) => {
        if (allMode) return true;
        if (qt.length < 1) return false;
        if (qt.length === 1) return true;
        return nameMatches(n);
    });

    if (tg === 'preschool') {
        const o = setupOvr;
        if (o === '어린이집' || o === '유치원' || o === '기타') {
            instList = instList.filter((i) => matchesInstPrepKind(i, o));
            filteredVirtual = filteredVirtual.filter((n) => matchesPresetPrepKind(n, o));
        }
    }

    const rows: InstitutionDropdownRow[] = [];
    instList.forEach((inst) => rows.push({ kind: 'inst', inst }));
    filteredVirtual.forEach((name) => rows.push({ kind: 'preset', name }));
    rows.sort((a, b) => {
        const na = a.kind === 'inst' ? a.inst.name : a.name;
        const nb = b.kind === 'inst' ? b.inst.name : b.name;
        return na.localeCompare(nb, 'ko');
    });
    if (categoryChip === 'ALL') return rows;
    return rows.filter((row) => rowMatchesCategoryChip(row, categoryChip, schema));
}
