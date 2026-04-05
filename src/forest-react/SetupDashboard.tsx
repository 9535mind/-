import { useCallback, useMemo, useRef, useState } from 'react';
import { detectInstitutionType } from './detect-institution-type';
import { INSTITUTION_DATABASE } from './forest-presets';
import { forestSchemaStub } from './forest-schema';
import { guessTypeFromName } from './institution-match';
import { InstitutionSearchInput } from './InstitutionSearchInput';
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

const tabBase =
    'ms-btn flex-1 min-h-[44px] px-3 py-2.5 font-bold text-xs rounded-full transition-colors duration-200';
const TAB_AGE_PS_ON =
    '!bg-[#03C75A] !text-white border-0 shadow-lg shadow-[#03C75A]/35 ring-0 outline-none hover:brightness-[1.02]';
const TAB_AGE_PS_OFF = '!bg-[#81C784] !text-white border-0 shadow-sm ring-0 outline-none hover:brightness-95';
const TAB_AGE_EL_ON =
    '!bg-[#FF9800] !text-white border-0 shadow-lg shadow-[#FF9800]/35 ring-0 outline-none hover:brightness-[1.02]';
const TAB_AGE_EL_OFF = '!bg-[#FFB74D] !text-white border-0 shadow-sm ring-0 outline-none hover:brightness-95';

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
        'border-[#2D4A3E] bg-[rgba(240,253,244,0.5)] text-[#2D4A3E] shadow-md shadow-[#2D4A3E]/15';
    const obsPreOff = 'border-ms text-ms-muted';
    const obsPostOn =
        'border-[#8d6e54] bg-[rgba(212,163,115,0.18)] text-[#2D4A3E] shadow-md shadow-[#D4A373]/20';
    const obsPostOff = 'border-ms text-ms-muted';
    const obsPreCls = observationStage === 'pre' ? obsPreOn : obsPreOff;
    const obsPostCls = observationStage === 'post' ? obsPostOn : obsPostOff;
    const locForestCls = obsLocation !== 'indoor' ? obsPreOn : obsPreOff;
    const locIndoorCls = obsLocation === 'indoor' ? obsPostOn : obsPostOff;

    return (
        <div
            className="relative w-full max-w-md max-h-[90vh] flex flex-col rounded-t-[1.75rem] sm:rounded-[1.75rem] bg-[#FDFBF7] shadow-2xl border border-[#2D4A3E]/12 overflow-x-hidden"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="shrink-0 px-3 sm:px-4 md:px-5 pt-3 sm:pt-4 md:pt-5">
                <h2
                    id="ms-modal-title"
                    className="text-base md:text-lg font-black text-[#2D4A3E] mb-2 text-center leading-tight"
                >
                    검사 설정
                </h2>
                <label
                    htmlFor="ms-modal-inst-name-react"
                    className="block text-[11px] font-bold text-ms-muted mb-1 ml-0.5 tracking-widest"
                >
                    기관명 검색
                </label>
                <InstitutionSearchInput
                    inputId="ms-modal-inst-name-react"
                    inputRef={instSearchInputRef}
                    value={searchTerm}
                    resetKey={instResetKey}
                    schema={schema}
                    institutions={allInstitutions}
                    presetDatabase={presetDatabase}
                    targetGroup={targetGroup}
                    setupTypeOverride={setupTypeOverride}
                    onValueCommit={onValueCommit}
                    onBlurSearch={onBlurSearch}
                    placeholder="초성·부분 검색 가능 (예: 삼계중앙어린이집)"
                    showAllListMode={showAllListMode}
                    onToggleShowAllList={onToggleShowAllList}
                    onPickInstitution={onPickInstitution}
                    onPickPresetName={onPickPresetName}
                    onClear={onClearSearch}
                />
                <p className="text-[10px] text-ms-muted mb-2 leading-relaxed rounded-lg bg-[rgba(45,74,62,0.04)] px-2 py-1.5 border border-[rgba(45,74,62,0.07)]">
                    오른쪽 <span className="font-bold text-[#2D4A3E]">검은 ▼</span>을 누르면{' '}
                    <strong className="text-[#2D4A3E]">검색어 없이</strong> 기초 사전·저장 기관 전체가 가나다순으로
                    펼쳐집니다. React 상태로만 갱신되어 한글 입력이 끊기지 않습니다.
                </p>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-4 md:px-5 custom-scrollbar pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:pb-4">
                <span className="block text-[11px] font-bold text-ms-muted mb-1 ml-0.5 tracking-widest">
                    대상 (문항뱅크)
                </span>
                <div className="flex gap-2 mb-2">
                    <button
                        type="button"
                        className={`${tabBase} ${tabPs}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                            setTargetGroup('preschool');
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
                            focusInstSearchIfQuery();
                        }}
                    >
                        초등부
                    </button>
                </div>

                <span className="block text-[11px] font-bold text-ms-muted mb-1 ml-0.5 tracking-widest">기관 유형</span>
                {targetGroup === 'elementary' ? (
                    <div className="flex flex-wrap gap-2 mb-2">
                        <button
                            type="button"
                            className={`ms-btn flex-1 min-w-[100px] min-h-[40px] py-2 font-bold border-2 text-xs ${
                                typeForUiElementary === '지역아동센터'
                                    ? 'border-[#FF9800] bg-[rgba(255,152,0,0.14)] text-[#2D4A3E] shadow-sm'
                                    : 'border-ms text-ms-muted'
                            }`}
                            onClick={() => setSetupTypeOverride('지역아동센터')}
                        >
                            지역아동센터
                        </button>
                        <button
                            type="button"
                            className={`ms-btn flex-1 min-w-[100px] min-h-[40px] py-2 font-bold border-2 text-xs ${
                                typeForUiElementary === '방과후교실'
                                    ? 'border-[#FF9800] bg-[rgba(255,152,0,0.14)] text-[#2D4A3E] shadow-sm'
                                    : 'border-ms text-ms-muted'
                            }`}
                            onClick={() => setSetupTypeOverride('방과후교실')}
                        >
                            방과후교실
                        </button>
                        <button
                            type="button"
                            className={`ms-btn flex-1 min-w-[100px] min-h-[40px] py-2 font-bold border-2 text-xs ${
                                typeForUiElementary === '초등학교'
                                    ? 'border-[#FF9800] bg-[rgba(255,152,0,0.14)] text-[#2D4A3E] shadow-sm'
                                    : 'border-ms text-ms-muted'
                            }`}
                            onClick={() => setSetupTypeOverride('초등학교')}
                        >
                            초등학교
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2 mb-2">
                        <button
                            type="button"
                            className={`ms-btn flex-1 min-w-[88px] min-h-[40px] py-2 font-bold border-2 text-xs ${
                                typeForUiPreschool === '어린이집'
                                    ? 'border-[#03C75A] bg-[rgba(3,199,90,0.12)] text-[#2D4A3E] shadow-sm'
                                    : 'border-ms text-ms-muted'
                            }`}
                            onClick={() => setSetupTypeOverride('어린이집')}
                        >
                            어린이집
                        </button>
                        <button
                            type="button"
                            className={`ms-btn flex-1 min-w-[88px] min-h-[40px] py-2 font-bold border-2 text-xs ${
                                typeForUiPreschool === '유치원'
                                    ? 'border-[#03C75A] bg-[rgba(3,199,90,0.12)] text-[#2D4A3E] shadow-sm'
                                    : 'border-ms text-ms-muted'
                            }`}
                            onClick={() => setSetupTypeOverride('유치원')}
                        >
                            유치원
                        </button>
                        <button
                            type="button"
                            className={`ms-btn flex-1 min-w-[88px] min-h-[40px] py-2 font-bold border-2 text-xs ${
                                typeForUiPreschool === '기타'
                                    ? 'border-[#03C75A] bg-[rgba(3,199,90,0.12)] text-[#2D4A3E] shadow-sm'
                                    : 'border-ms text-ms-muted'
                            }`}
                            onClick={() => setSetupTypeOverride('기타')}
                        >
                            기타
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-1">
                    <div>
                        <span className="block text-[11px] font-bold text-ms-muted mb-1 ml-0.5 tracking-widest">
                            관찰 단계
                        </span>
                        <div className="flex flex-wrap gap-2" role="group" aria-label="사전 또는 사후">
                            <button
                                type="button"
                                className={`ms-btn flex-1 min-h-[40px] py-2 font-bold border-2 text-xs ${obsPreCls}`}
                                onClick={() => setObservationStage('pre')}
                            >
                                사전
                            </button>
                            <button
                                type="button"
                                className={`ms-btn flex-1 min-h-[40px] py-2 font-bold border-2 text-xs ${obsPostCls}`}
                                onClick={() => setObservationStage('post')}
                            >
                                사후
                            </button>
                        </div>
                    </div>
                    <div>
                        <span className="block text-[11px] font-bold text-ms-muted mb-1 ml-0.5 tracking-widest">
                            진행 장소
                        </span>
                        <div className="flex flex-wrap gap-2" role="group" aria-label="숲 또는 실내">
                            <button
                                type="button"
                                className={`ms-btn flex-1 min-h-[40px] py-2 font-bold border-2 text-xs ${locForestCls}`}
                                onClick={() => setObsLocation('forest')}
                            >
                                숲
                            </button>
                            <button
                                type="button"
                                className={`ms-btn flex-1 min-h-[40px] py-2 font-bold border-2 text-xs ${locIndoorCls}`}
                                onClick={() => setObsLocation('indoor')}
                            >
                                실내
                            </button>
                        </div>
                    </div>
                </div>

                <p className="text-[10px] text-ms-muted mb-2 leading-relaxed text-center">
                    사전·사후로 나누어 저장하면 기관 허브에서 성과 비교 보고서를 열 수 있어요.
                </p>

                <label
                    htmlFor="ms-unified-group-name-react"
                    className="block text-[11px] font-bold text-ms-muted mb-1 ml-0.5 tracking-widest"
                >
                    반 이름
                </label>
                <input
                    id="ms-unified-group-name-react"
                    type="text"
                    placeholder="예: 새싹반 · 비워 두어도 됩니다"
                    className="w-full ms-input px-3 py-2.5 text-center font-bold rounded-2xl mb-2 text-[#2D4A3E] text-sm border border-ms"
                    maxLength={120}
                    autoComplete="off"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                />

                <label
                    htmlFor="ms-examiner-name-react"
                    className="block text-[11px] font-bold text-ms-muted mb-1 ml-0.5 tracking-widest"
                >
                    진행자(해설사) 성함
                </label>
                <input
                    id="ms-examiner-name-react"
                    type="text"
                    maxLength={40}
                    autoComplete="name"
                    placeholder="필수"
                    className="w-full ms-input px-3 py-2.5 text-center font-bold rounded-2xl mb-2 text-[#2D4A3E] text-sm"
                    value={examinerName}
                    onChange={(e) => setExaminerName(e.target.value)}
                />

                <button
                    type="button"
                    className="ms-btn w-full rounded-[2rem] bg-[#2D4A3E] text-white font-black py-3.5 text-base md:text-lg shadow-xl hover:brightness-95 mb-2"
                    onClick={submit}
                >
                    검사 입력으로 이동
                </button>
                <div className="flex justify-center">
                    <button
                        type="button"
                        className="ms-btn text-sm font-bold text-ms-muted py-2"
                        onClick={onCancel}
                    >
                        취소
                    </button>
                </div>
            </div>
        </div>
    );
}
