import { useCallback, useMemo, useRef, useState } from 'react';
import { detectInstitutionType } from './detect-institution-type';
import { INSTITUTION_DATABASE } from './forest-presets';
import { forestSchemaStub } from './forest-schema';
import { guessTypeFromName } from './institution-match';
import { InstitutionSearchInput } from './InstitutionSearchInput';
import { ObservationContextCard } from './ObservationContextCard';
import type { ForestInstitution, ForestSchemaApi, ObservationStage, ObsLocation, SetupTypeOverride, TargetGroup } from './types';

export interface SetupDashboardProps {
    /** forest.html SCHEMA 대체 — 프로덕션에서는 실제 SCHEMA 어댑터 주입 */
    schema?: ForestSchemaApi;
    institutions: ForestInstitution[];
    presetDatabase?: readonly string[];
    initialTargetGroup?: TargetGroup;
    initialSetupTypeOverride?: SetupTypeOverride;
    initialObservationStage?: ObservationStage;
    initialObsLocation?: ObsLocation;
    initialSearchTerm?: string;
    initialGroupName?: string;
    initialExaminerName?: string;
    selectedInstitutionId?: string | null;
    onSubmit: (payload: {
        institutionName: string;
        institution: ForestInstitution | null;
        targetGroup: TargetGroup;
        setupTypeOverride: SetupTypeOverride;
        observationStage: ObservationStage;
        obsLocation: ObsLocation;
        groupName: string;
        examinerName: string;
    }) => void;
    onCancel: () => void;
}

/** 대상(연령) 탭 — 연한 파스텔로 기관 유형보다 시각적 힘을 낮게 */
const tabBase =
    'ms-btn flex-1 min-h-[32px] px-2.5 py-1 font-bold text-xs rounded-full transition-colors duration-200';
const TAB_AGE_PS_ON =
    'bg-[#eef7f0] border border-[#2D4A3E]/22 text-[#2D4A3E]/85 shadow-none ring-0 outline-none';
const TAB_AGE_PS_OFF =
    'bg-[#fafcfb] border border-[rgba(45,74,62,0.1)] text-[#5D4037]/45 ring-0 outline-none hover:bg-[rgba(45,74,62,0.04)]';
const TAB_AGE_EL_ON =
    'bg-[#fff8f0] border border-[#e65100]/22 text-[#bf360c]/85 shadow-none ring-0 outline-none';
const TAB_AGE_EL_OFF =
    'bg-[#fffdfb] border border-[rgba(230,81,0,0.1)] text-[#5D4037]/45 ring-0 outline-none hover:bg-[rgba(255,152,0,0.04)]';

function newInstitutionId(): string {
    try {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    } catch {
        /* ignore */
    }
    return 'fi_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
}

/**
 * 검사 설정 모달에 해당하는 단일 패널 (바깥 오버레이·포털은 부모에서 감쌀 것).
 * innerHTML 전체 재생성 없이 React state로만 갱신 — 한글 IME 안정화.
 */
export function SetupDashboard({
    schema = forestSchemaStub,
    institutions,
    presetDatabase = INSTITUTION_DATABASE,
    initialTargetGroup = 'preschool',
    initialSetupTypeOverride = null,
    initialObservationStage = 'pre',
    initialObsLocation = 'forest',
    initialSearchTerm = '',
    initialGroupName = '',
    initialExaminerName = '',
    selectedInstitutionId = null,
    onSubmit,
    onCancel,
}: SetupDashboardProps) {
    const [targetGroup, setTargetGroup] = useState<TargetGroup>(initialTargetGroup);
    const [setupTypeOverride, setSetupTypeOverride] = useState<SetupTypeOverride>(initialSetupTypeOverride);
    const [observationStage, setObservationStage] = useState<ObservationStage>(initialObservationStage);
    const [obsLocation, setObsLocation] = useState<ObsLocation>(initialObsLocation);
    const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
    const [groupName, setGroupName] = useState(initialGroupName);
    const [examinerName, setExaminerName] = useState(initialExaminerName);
    const [selectedId, setSelectedId] = useState<string | null>(selectedInstitutionId);
    const [showAllListMode, setShowAllListMode] = useState(false);
    const [extraInstitutions, setExtraInstitutions] = useState<ForestInstitution[]>([]);
    const [instResetKey, setInstResetKey] = useState(0);
    const [instDropdownKick, setInstDropdownKick] = useState(0);
    const instSearchInputRef = useRef<HTMLInputElement>(null);

    /** 검색어 1글자 이상일 때만 입력으로 포커스 복구 — 드롭다운(aria-expanded) 유지 */
    const focusInstSearchIfQuery = useCallback(() => {
        queueMicrotask(() => {
            const el = instSearchInputRef.current;
            if (el && el.value.trim().length >= 1) {
                el.focus();
            }
        });
    }, []);

    const allInstitutions = useMemo(
        () => [...institutions, ...extraInstitutions],
        [institutions, extraInstitutions]
    );

    const selectedInst = useMemo(
        () => allInstitutions.find((i) => i.id === selectedId) ?? null,
        [allInstitutions, selectedId]
    );

    /** 타이핑 중 searchTerm 기반 추측 제거 — 블러·선택 시 detectInstitutionType 만 반영 */
    const typeForUiPreschool = useMemo(() => {
        const t = selectedInst?.type ?? setupTypeOverride;
        if (t === '어린이집' || t === '유치원' || t === '기타') return t;
        return '어린이집';
    }, [selectedInst, setupTypeOverride]);

    const typeForUiElementary = useMemo(() => {
        const t = selectedInst?.type ?? setupTypeOverride;
        if (t === '지역아동센터' || t === '방과후교실' || t === '초등학교') return t;
        if (t === '방과후학교') return '방과후교실';
        return '지역아동센터';
    }, [selectedInst, setupTypeOverride]);

    const applyDetectionFromName = useCallback((raw: string) => {
        const d = detectInstitutionType(raw);
        if (!d) return;
        setTargetGroup((prev) => (prev === d.targetGroup ? prev : d.targetGroup));
        setSetupTypeOverride((prev) => (prev === d.setupTypeOverride ? prev : d.setupTypeOverride));
    }, []);

    const onValueCommit = useCallback((next: string) => {
        setSearchTerm(next);
        const exact = allInstitutions.find((i) => String(i.name).trim() === next.trim());
        if (exact) {
            setSelectedId(exact.id);
            setSetupTypeOverride(null);
        } else {
            setSelectedId(null);
        }
    }, [allInstitutions]);

    const onBlurSearch = useCallback(
        (trimmed: string) => {
            applyDetectionFromName(trimmed);
        },
        [applyDetectionFromName]
    );

    const onPickInstitution = useCallback(
        (id: string) => {
            const inst = allInstitutions.find((i) => i.id === id);
            if (!inst) return;
            setSelectedId(id);
            setSearchTerm(inst.name);
            setShowAllListMode(false);
            setInstResetKey((k) => k + 1);
            const d = detectInstitutionType(inst.name);
            if (d) {
                setTargetGroup((prev) => (prev === d.targetGroup ? prev : d.targetGroup));
                setSetupTypeOverride((prev) => (prev === d.setupTypeOverride ? prev : d.setupTypeOverride));
            } else {
                setSetupTypeOverride(null);
            }
        },
        [allInstitutions]
    );

    const onPickPresetName = useCallback(
        (name: string) => {
            const found = allInstitutions.find((i) => String(i.name).trim() === name.trim());
            let inst: ForestInstitution;
            if (found) {
                inst = found;
            } else {
                const d0 = detectInstitutionType(name);
                const tg = d0?.targetGroup ?? targetGroup;
                const ty = d0?.setupTypeOverride ?? guessTypeFromName(name, tg);
                inst = {
                    id: newInstitutionId(),
                    name,
                    type: ty,
                    targetGroup: tg,
                };
                setExtraInstitutions((prev) => [...prev, inst]);
            }
            setSelectedId(inst.id);
            setSearchTerm(inst.name);
            setShowAllListMode(false);
            setInstResetKey((k) => k + 1);
            const d = detectInstitutionType(name);
            if (d) {
                setTargetGroup((prev) => (prev === d.targetGroup ? prev : d.targetGroup));
                setSetupTypeOverride((prev) => (prev === d.setupTypeOverride ? prev : d.setupTypeOverride));
            } else {
                setSetupTypeOverride(null);
            }
        },
        [allInstitutions, targetGroup]
    );

    const onClearSearch = useCallback(() => {
        setSearchTerm('');
        setSelectedId(null);
        setSetupTypeOverride(null);
        setShowAllListMode(false);
        setInstResetKey((k) => k + 1);
    }, []);

    const onToggleShowAllList = useCallback(() => {
        setShowAllListMode((v) => !v);
    }, []);

    const submit = useCallback(() => {
        const institutionName = searchTerm.trim();
        if (!institutionName) return;
        const examiner = examinerName.trim();
        if (!examiner) return;

        let inst: ForestInstitution | null =
            selectedInst ?? allInstitutions.find((i) => i.name.trim() === institutionName) ?? null;
        if (!inst) {
            const ty = guessTypeFromName(institutionName, targetGroup);
            inst = {
                id: newInstitutionId(),
                name: institutionName,
                type: setupTypeOverride ?? ty,
                targetGroup,
            };
        }

        onSubmit({
            institutionName,
            institution: inst,
            targetGroup,
            setupTypeOverride,
            observationStage,
            obsLocation,
            groupName: groupName.trim(),
            examinerName: examiner,
        });
    }, [
        searchTerm,
        examinerName,
        selectedInst,
        allInstitutions,
        targetGroup,
        setupTypeOverride,
        observationStage,
        obsLocation,
        groupName,
        onSubmit,
    ]);

    const tabPs = targetGroup === 'preschool' ? TAB_AGE_PS_ON : TAB_AGE_PS_OFF;
    const tabEl = targetGroup === 'elementary' ? TAB_AGE_EL_ON : TAB_AGE_EL_OFF;

    const obsPreOn =
        'border-[#2D4A3E] bg-[rgba(240,253,244,0.65)] text-[#2D4A3E] shadow-md shadow-[#2D4A3E]/20';
    const obsPreOff =
        'border-[rgba(93,64,55,0.28)] bg-white text-[#5D4037]/55 shadow-none hover:bg-[rgba(93,64,55,0.06)]';
    const obsPostOn =
        'border-[#8d6e54] bg-[rgba(212,163,115,0.22)] text-[#2D4A3E] shadow-md shadow-[#D4A373]/25';
    const obsPostOff =
        'border-[rgba(93,64,55,0.28)] bg-white text-[#5D4037]/55 shadow-none hover:bg-[rgba(93,64,55,0.06)]';
    const obsPreCls = observationStage === 'pre' ? obsPreOn : obsPreOff;
    const obsPostCls = observationStage === 'post' ? obsPostOn : obsPostOff;
    const locForestCls = obsLocation !== 'indoor' ? obsPreOn : obsPreOff;
    const locIndoorCls = obsLocation === 'indoor' ? obsPostOn : obsPostOff;

    const typeOnPs =
        'border-2 border-emerald-300/90 bg-gradient-to-b from-[#03C75A] via-[#02b350] to-[#017a3d] text-white shadow-lg shadow-emerald-900/25 ring-2 ring-[#03C75A]/35';
    const typeOffPs =
        'border border-[rgba(93,64,55,0.2)] bg-white text-[#5D4037]/75 hover:bg-[rgba(93,64,55,0.05)]';
    const typeOnEl =
        'border-2 border-orange-300/90 bg-gradient-to-b from-[#FFB74D] via-[#F57C00] to-[#E65100] text-white shadow-lg shadow-orange-900/25 ring-2 ring-[#FF9800]/40';
    const typeOffEl =
        'border border-[rgba(93,64,55,0.2)] bg-white text-[#5D4037]/75 hover:bg-[rgba(93,64,55,0.05)]';

    return (
        <div
            className="relative w-full max-w-md max-h-[90vh] flex flex-col rounded-t-[1.75rem] sm:rounded-[1.75rem] bg-[#FDFBF7] shadow-2xl border border-[#2D4A3E]/12 overflow-visible"
            onClick={(e) => e.stopPropagation()}
        >
            {/* 1단: 타이틀 */}
            <div className="shrink-0 px-3 sm:px-4 md:px-5 pt-3 sm:pt-4 md:pt-5 pb-1">
                <h2
                    id="ms-modal-title"
                    className="text-base md:text-lg font-black text-[#2D4A3E] text-center leading-tight"
                >
                    JTT-Kinder 검사 설정
                </h2>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-3 sm:px-4 md:px-5 custom-scrollbar pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:pb-4 space-y-2.5">
                {/* 2단: 관찰 단계 · 진행 장소 */}
                <ObservationContextCard
                    obsPreCls={obsPreCls}
                    obsPostCls={obsPostCls}
                    locForestCls={locForestCls}
                    locIndoorCls={locIndoorCls}
                    onObservationStage={setObservationStage}
                    onObsLocation={setObsLocation}
                />

                {/* 3단: 기관명 검색 */}
                <section aria-labelledby="ms-setup-search-heading">
                    <span id="ms-setup-search-heading" className="sr-only">
                        기관명 검색
                    </span>
                    <InstitutionSearchInput
                        inputId="ms-modal-inst-name-react"
                        inputRef={instSearchInputRef}
                        forceOpenKey={instDropdownKick}
                        value={searchTerm}
                        resetKey={instResetKey}
                        schema={schema}
                        institutions={allInstitutions}
                        presetDatabase={presetDatabase}
                        targetGroup={targetGroup}
                        setupTypeOverride={setupTypeOverride}
                        onValueCommit={onValueCommit}
                        onChange={onValueCommit}
                        onBlurSearch={onBlurSearch}
                        placeholder="예: 마인드스토리, 숲마을어린이집"
                        showAllListMode={showAllListMode}
                        onToggleShowAllList={onToggleShowAllList}
                        onPickInstitution={onPickInstitution}
                        onPickPresetName={onPickPresetName}
                        onClear={onClearSearch}
                    />
                </section>

                {/* 4단: 대상 (문항뱅크) */}
                <section aria-labelledby="ms-setup-target-heading">
                    <span id="ms-setup-target-heading" className="sr-only">
                        대상 (문항뱅크)
                    </span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            className={`${tabBase} ${tabPs}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                setTargetGroup('preschool');
                                setInstDropdownKick((k) => k + 1);
                                focusInstSearchIfQuery();
                            }}
                        >
                            유아·유치부
                        </button>
                        <button
                            type="button"
                            className={`${tabBase} ${tabEl}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                setTargetGroup('elementary');
                                setInstDropdownKick((k) => k + 1);
                                focusInstSearchIfQuery();
                            }}
                        >
                            초등부
                        </button>
                    </div>
                </section>

                {/* 5단: 기관 유형 */}
                <section aria-label="기관 유형">
                    {targetGroup === 'elementary' ? (
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                type="button"
                                className={`ms-btn flex-1 min-w-[88px] min-h-[34px] rounded-full py-1 font-black border-2 text-[11px] transition-all ${
                                    typeForUiElementary === '지역아동센터' ? typeOnEl : typeOffEl
                                }`}
                                onClick={() => setSetupTypeOverride('지역아동센터')}
                            >
                                센터
                            </button>
                            <button
                                type="button"
                                className={`ms-btn flex-1 min-w-[88px] min-h-[34px] rounded-full py-1 font-black border-2 text-[11px] transition-all ${
                                    typeForUiElementary === '방과후교실' ? typeOnEl : typeOffEl
                                }`}
                                onClick={() => setSetupTypeOverride('방과후교실')}
                            >
                                방과후교실
                            </button>
                            <button
                                type="button"
                                className={`ms-btn flex-1 min-w-[88px] min-h-[34px] rounded-full py-1 font-black border-2 text-[11px] transition-all ${
                                    typeForUiElementary === '초등학교' ? typeOnEl : typeOffEl
                                }`}
                                onClick={() => setSetupTypeOverride('초등학교')}
                            >
                                초등학교
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                type="button"
                                className={`ms-btn flex-1 min-w-[80px] min-h-[34px] rounded-full py-1 font-black border-2 text-[11px] transition-all ${
                                    typeForUiPreschool === '어린이집' ? typeOnPs : typeOffPs
                                }`}
                                onClick={() => setSetupTypeOverride('어린이집')}
                            >
                                어린이집
                            </button>
                            <button
                                type="button"
                                className={`ms-btn flex-1 min-w-[80px] min-h-[34px] rounded-full py-1 font-black border-2 text-[11px] transition-all ${
                                    typeForUiPreschool === '유치원' ? typeOnPs : typeOffPs
                                }`}
                                onClick={() => setSetupTypeOverride('유치원')}
                            >
                                유치원
                            </button>
                            <button
                                type="button"
                                className={`ms-btn flex-1 min-w-[80px] min-h-[34px] rounded-full py-1 font-black border-2 text-[11px] transition-all ${
                                    typeForUiPreschool === '기타' ? typeOnPs : typeOffPs
                                }`}
                                onClick={() => setSetupTypeOverride('기타')}
                            >
                                기타
                            </button>
                        </div>
                    )}
                </section>

                {/* 6·7단: 진행자 / 반 이름 — 한 줄 행 */}
                <div className="space-y-1">
                    <section aria-labelledby="ms-setup-examiner-heading">
                        <div className="flex min-w-0 flex-nowrap flex-row items-center gap-2">
                            <label
                                id="ms-setup-examiner-heading"
                                htmlFor="ms-examiner-name-react"
                                className="w-20 shrink-0 self-center text-left text-[10px] font-semibold leading-tight text-[#5D4037]/55"
                            >
                                성함
                            </label>
                            <input
                                id="ms-examiner-name-react"
                                type="text"
                                maxLength={40}
                                autoComplete="name"
                                placeholder="필수"
                                className="ms-input min-w-0 flex-1 border border-[rgba(45,74,62,0.18)] px-2 py-1 text-left text-sm font-bold leading-tight text-[#2D4A3E] rounded-xl"
                                value={examinerName}
                                onChange={(e) => setExaminerName(e.target.value)}
                            />
                        </div>
                    </section>
                    <section aria-labelledby="ms-setup-group-heading">
                        <div className="flex min-w-0 flex-nowrap flex-row items-center gap-2">
                            <label
                                id="ms-setup-group-heading"
                                htmlFor="ms-unified-group-name-react"
                                className="w-20 shrink-0 self-center text-left text-[10px] font-semibold leading-tight text-[#5D4037]/55"
                            >
                                반명
                            </label>
                            <input
                                id="ms-unified-group-name-react"
                                type="text"
                                placeholder="예: 새싹반"
                                className="ms-input min-w-0 flex-1 border border-ms px-2 py-1 text-left text-sm font-bold leading-tight text-[#2D4A3E] rounded-xl"
                                maxLength={120}
                                autoComplete="off"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                            />
                        </div>
                    </section>
                </div>

                {/* 8단: 주요 액션 */}
                <div className="pt-1">
                    <button
                        type="button"
                        className="ms-btn w-full rounded-[2rem] bg-[#2D4A3E] text-white font-black py-3 md:py-3.5 text-base md:text-lg shadow-xl hover:brightness-95"
                        onClick={submit}
                    >
                        검사 시작
                    </button>
                </div>

                {/* 9단: 보조 액션 */}
                <div className="flex justify-center pb-0.5">
                    <button
                        type="button"
                        className="ms-btn inline-flex items-center justify-center text-sm font-bold text-ms-muted py-2"
                        onClick={onCancel}
                        aria-label="뒤로 가기"
                    >
                        ↩ 뒤로 가기
                    </button>
                </div>
            </div>
        </div>
    );
}
