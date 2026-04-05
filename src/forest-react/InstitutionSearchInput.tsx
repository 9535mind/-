import {
    useCallback,
    useEffect,
    useId,
    useRef,
    useState,
    useMemo,
    type ChangeEvent,
    type CompositionEvent,
    type FocusEvent,
    type RefObject,
} from 'react';
import {
    buildInstitutionDropdownRows,
    buildPreschoolInstitutionRowsLimited,
    getPresetInstitutionNamesMatching,
    type CategoryChipFilter,
} from './institution-dropdown-rows';
import type { ForestInstitution, ForestSchemaApi, InstitutionDropdownRow, SetupTypeOverride, TargetGroup } from './types';

/** 확장 검색(저장 기관) + 부모 onValueCommit 동기화용 — 프리셋 매칭 시 확장 검색은 실행하지 않음 */
const DEBOUNCE_MS = 200;
const BLUR_COMMIT_MS = 220;

/** 전국 DB 부담 완화: 최우선 노출 타겟 기관(고정 순서) */
const PRESET_INSTITUTIONS = [
    '삼계중앙어린이집',
    '사창유치원',
    '장성중앙초병설유치원',
    '장성성산초병설유치원',
    '진원동초병설유치원',
    '장성성모유치원',
    '공립정다운상무어린이집',
    '공립소중한어린이집',
    '진원초병설유치원',
    '동화초병설유치원',
    '삼서초병설유치원',
    '분향초병설유치원',
    '서삼초병설유치원',
    '북이 병설유치원',
    '월평초병설유치원',
    '북일초병설유치원',
    '약수초병설유치원',
    '기독어린이집',
    '공립성모어린이집',
    '늘푸른어린이집',
    '공립사임당예랑어린이집',
    '공립로제비앙어린이집',
    '한마음자연생태유치원',
] as const;

/** 기관 유형 칩(어린이집/유치원) 클릭 시 이름 뒤에 붙이는 스마트 완성 */
function appendInstitutionTypeSuffix(current: string, suffix: '어린이집' | '유치원'): string {
    const t = current.replace(/\s+$/g, '');
    if (t.endsWith(suffix)) return current;
    const other: '어린이집' | '유치원' = suffix === '어린이집' ? '유치원' : '어린이집';
    let base = t;
    if (base.endsWith(other)) {
        base = base.slice(0, -other.length).trimEnd();
    }
    return base + suffix;
}

const TYPE_CHIP_SUFFIX: Partial<Record<CategoryChipFilter, '어린이집' | '유치원'>> = {
    DAYCARE: '어린이집',
    KINDER: '유치원',
};

/** forest.html STATE.institutions 브리지(선택) + 레거시 window.institutions */
function mergeInstitutionsFromWindow(base: ForestInstitution[]): ForestInstitution[] {
    if (typeof window === 'undefined') return base;
    const w = window as unknown as {
        institutions?: ForestInstitution[];
        __MS_FOREST_INSTITUTIONS__?: ForestInstitution[];
    };
    const a = Array.isArray(w.__MS_FOREST_INSTITUTIONS__) ? w.__MS_FOREST_INSTITUTIONS__ : [];
    const b = Array.isArray(w.institutions) ? w.institutions : [];
    if (a.length === 0 && b.length === 0) return base;
    const byId = new Map<string, ForestInstitution>();
    for (const i of base) {
        if (i?.id) byId.set(i.id, i);
    }
    for (const i of [...a, ...b]) {
        if (i?.id) byId.set(i.id, i);
    }
    return Array.from(byId.values());
}

const CHIP_ITEMS: { id: CategoryChipFilter; label: string }[] = [
    { id: 'ALL', label: '전체' },
    { id: 'DAYCARE', label: '어린이집' },
    { id: 'KINDER', label: '유치원' },
    { id: 'ELEMENTARY_OTHER', label: '초등/기타' },
];

const chipBase =
    'ms-inst-chip px-2.5 py-1.5 rounded-full text-[11px] font-bold border transition-colors min-h-[32px] shrink-0';
const chipOff = 'border-[rgba(45,74,62,0.2)] bg-white text-[#5D4037] hover:bg-[rgba(45,74,62,0.06)]';
const chipOn = 'border-[#2D4A3E] bg-[#2D4A3E] text-white shadow-sm';

export interface InstitutionSearchInputProps {
    value: string;
    /** pick/clear 시 부모에서 증가 — 입력 로컬 상태를 외부 값과 동기화 */
    resetKey: number;
    onValueCommit: (next: string) => void;
    /** 기관 유형 칩 등에서 값이 바뀔 때 즉시 상위로 전달(선택) */
    onChange?: (next: string) => void;
    onBlurSearch?: (trimmed: string) => void;
    onCompositionFlagChange?: (composing: boolean) => void;
    placeholder?: string;
    schema: ForestSchemaApi;
    institutions: ForestInstitution[];
    presetDatabase: readonly string[];
    targetGroup: TargetGroup;
    setupTypeOverride: SetupTypeOverride;
    showAllListMode: boolean;
    onToggleShowAllList: () => void;
    onPickInstitution: (id: string) => void;
    onPickPresetName: (name: string) => void;
    onClear: () => void;
    emptyHint?: string | null;
    inputId?: string;
    listboxId?: string;
    /** 부모에서 대상 탭 등과 연동해 포커스 복구 시 사용 */
    inputRef?: RefObject<HTMLInputElement | null>;
    /** 대상 탭 등에서 증가시키면 검색어가 있을 때 드롭다운을 강제로 연 상태로 유지 */
    forceOpenKey?: number;
}

const rowBtnClass =
    'ms-inst-dd-opt w-full text-left px-3 py-1.5 min-h-0 flex flex-row flex-wrap items-center gap-x-1 gap-y-0 border-b border-[rgba(93,64,55,0.1)] last:border-b-0 bg-white text-[#5D4037] leading-tight hover:bg-[rgba(212,163,115,0.22)] active:bg-[rgba(212,163,115,0.3)] transition-colors';

export function InstitutionSearchInput({
    value,
    resetKey,
    onValueCommit,
    onChange: onChangeProp,
    onBlurSearch,
    onCompositionFlagChange,
    placeholder = '초성·부분 검색 가능',
    schema,
    institutions,
    presetDatabase,
    targetGroup,
    setupTypeOverride,
    showAllListMode,
    onToggleShowAllList,
    onPickInstitution,
    onPickPresetName,
    onClear,
    emptyHint = '검색 결과가 없습니다.',
    inputId: inputIdProp,
    listboxId: listboxIdProp,
    inputRef: inputRefProp,
    forceOpenKey = 0,
}: InstitutionSearchInputProps) {
    const genId = useId();
    const inputId = inputIdProp ?? `forest-inst-inp-${genId}`;
    const listboxId = listboxIdProp ?? `forest-inst-lb-${genId}`;
    const rootRef = useRef<HTMLDivElement>(null);
    const blurCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const fallbackInputRef = useRef<HTMLInputElement | null>(null);
    const setInputRef = useCallback(
        (el: HTMLInputElement | null) => {
            fallbackInputRef.current = el;
            if (inputRefProp) inputRefProp.current = el;
        },
        [inputRefProp]
    );

    const focusSearchInput = useCallback(() => {
        fallbackInputRef.current?.focus();
    }, []);

    const [input, setInput] = useState(value);
    const [debounced, setDebounced] = useState(value);
    const [isComposing, setIsComposing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<CategoryChipFilter>('ALL');
    const [panelForcedOpen, setPanelForcedOpen] = useState(false);

    const composingRef = useRef(false);

    /** [어린이집] / [유치원] 칩: 접미 붙이기 + 상위 onChange(선택) */
    const handleTypeClick = useCallback(
        (suffix: '어린이집' | '유치원') => {
            if (targetGroup !== 'preschool') return;
            const next = appendInstitutionTypeSuffix(input, suffix);
            if (next === input) return;
            setInput(next);
            setDebounced(next);
            onChangeProp?.(next);
        },
        [input, targetGroup, onChangeProp]
    );

    /** 드롭다운 표시 강제 — 한 글자 검색 + 대상 탭/칩 클릭 시 `setPanelVisible(true)` */
    const setPanelVisible = useCallback((visible: boolean) => {
        setPanelForcedOpen(visible);
    }, []);

    useEffect(() => {
        setInput(value);
        setDebounced(value);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- 외부 pick/clear 시에만 resetKey로 동기화
    }, [resetKey]);

    useEffect(() => {
        if (isComposing) return;
        const id = window.setTimeout(() => setDebounced(input), DEBOUNCE_MS);
        return () => window.clearTimeout(id);
    }, [input, isComposing]);

    useEffect(() => {
        if (isComposing) return;
        onValueCommit(debounced);
    }, [debounced, isComposing, onValueCommit]);

    useEffect(() => {
        if (input.trim().length < 1 && !showAllListMode) {
            setPanelVisible(false);
        }
    }, [input, showAllListMode, setPanelVisible]);

    useEffect(() => {
        if (forceOpenKey > 0 && input.trim().length >= 1) {
            setPanelVisible(true);
        }
    }, [forceOpenKey, input, setPanelVisible]);

    useEffect(() => {
        return () => {
            if (blurCommitTimerRef.current) {
                clearTimeout(blurCommitTimerRef.current);
            }
        };
    }, []);

    const mergedInstitutions = useMemo(() => mergeInstitutionsFromWindow(institutions), [institutions]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const w = window as unknown as {
            institutions?: unknown;
            __MS_FOREST_INSTITUTIONS__?: unknown;
        };
        console.log('[InstitutionSearch] data:', {
            propsCount: institutions.length,
            mergedCount: mergedInstitutions.length,
            hasWindowInstitutions: Array.isArray(w.institutions) ? w.institutions.length : 0,
            hasBridge: Array.isArray(w.__MS_FOREST_INSTITUTIONS__) ? w.__MS_FOREST_INSTITUTIONS__.length : 0,
        });
    }, [institutions, mergedInstitutions]);

    const rows: InstitutionDropdownRow[] = useMemo(() => {
        const qTrim = input.trim();
        const allMode = showAllListMode;
        if (!allMode && qTrim.length < 1) {
            return [];
        }
        if (targetGroup !== 'preschool') {
            const built = buildInstitutionDropdownRows({
                schema,
                institutions: mergedInstitutions,
                presetDatabase,
                targetGroup,
                setupTypeOverride,
                query: allMode && qTrim.length < 1 ? '' : input,
                allMode,
                categoryChip: activeFilter,
                priorityPresetNames: [],
            });
            try {
                console.log(
                    '[InstitutionSearch] elementary/full → ' + built.length + ' rows (q="' + qTrim + '")'
                );
            } catch {
                /* ignore */
            }
            return built;
        }

        /**
         * 유아·유치부: 입력(input)으로 프리셋 즉시 필터 → 매칭 있으면 여기서 종료(확장 검색 미실행).
         * 프리셋 0건일 때만 debounced + mergedInstitutions 로 확장(최대 50). concat 금지.
         */
        const presetNames = getPresetInstitutionNamesMatching({
            presetNames: PRESET_INSTITUTIONS,
            targetGroup: 'preschool',
            setupTypeOverride,
            query: allMode && qTrim.length < 1 ? '' : input,
            allMode,
            categoryChip: activeFilter,
            schema,
        });

        if (presetNames.length > 0) {
            try {
                console.log('[InstitutionSearch] preset-only list → ' + presetNames.length + ' (q="' + qTrim + '")');
            } catch {
                /* ignore */
            }
            return presetNames.map((name) => ({ kind: 'preset' as const, name }));
        }

        const qDb = debounced.trim();
        if (!(allMode && qTrim.length < 1) && qDb.length >= 1) {
            const ext = buildPreschoolInstitutionRowsLimited({
                schema,
                institutions: mergedInstitutions,
                setupTypeOverride,
                query: qDb,
                categoryChip: activeFilter,
                limit: 50,
                excludeNameKeys: new Set(),
            });
            if (ext.length === 0 && qTrim.length >= 1 && debounced.trim() === qTrim) {
                return [{ kind: 'direct', query: qTrim }];
            }
            try {
                console.log(
                    '[InstitutionSearch] extended inst only → ' + ext.length + ' (dbQ="' + qDb + '")'
                );
            } catch {
                /* ignore */
            }
            return ext;
        }

        if (qTrim.length >= 1 && debounced.trim() === qTrim) {
            return [{ kind: 'direct', query: qTrim }];
        }
        return [];
    }, [
        input,
        debounced,
        showAllListMode,
        schema,
        mergedInstitutions,
        presetDatabase,
        targetGroup,
        setupTypeOverride,
        activeFilter,
    ]);

    const panelVisible = showAllListMode || input.trim().length >= 1 || panelForcedOpen;

    const notifyCompose = useCallback(
        (next: boolean) => {
            composingRef.current = next;
            onCompositionFlagChange?.(next);
        },
        [onCompositionFlagChange]
    );

    const onCompositionStart = useCallback(() => {
        setIsComposing(true);
        notifyCompose(true);
    }, [notifyCompose]);

    const onCompositionEnd = useCallback(
        (e: CompositionEvent<HTMLInputElement>) => {
            const v = e.currentTarget.value;
            setInput(v);
            setIsComposing(false);
            notifyCompose(false);
            setDebounced(v);
            if (v.trim().length >= 1) setPanelVisible(true);
        },
        [notifyCompose, setPanelVisible]
    );

    const onChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setInput(v);
        if (v.trim().length >= 1) {
            setPanelVisible(true);
        }
    }, [setPanelVisible]);

    const handleDirectPick = useCallback(
        (raw: string) => {
            const next = raw.trim();
            if (!next) return;
            if (blurCommitTimerRef.current) {
                clearTimeout(blurCommitTimerRef.current);
                blurCommitTimerRef.current = null;
            }
            setInput(next);
            setDebounced(next);
            onChangeProp?.(next);
            onValueCommit(next);
            onPickPresetName(next);
            setPanelVisible(false);
        },
        [onChangeProp, onValueCommit, onPickPresetName, setPanelVisible]
    );

    const directPickMouseHandledRef = useRef(false);

    const onBlur = useCallback(
        (e: FocusEvent<HTMLInputElement>) => {
            const raw = e.currentTarget.value;
            if (blurCommitTimerRef.current) {
                clearTimeout(blurCommitTimerRef.current);
                blurCommitTimerRef.current = null;
            }
            blurCommitTimerRef.current = setTimeout(() => {
                blurCommitTimerRef.current = null;
                const ae = document.activeElement;
                if (ae instanceof Node && rootRef.current?.contains(ae)) {
                    return;
                }
                const trimmed = raw.trim();
                setInput(trimmed);
                setDebounced(trimmed);
                onValueCommit(trimmed);
                onBlurSearch?.(trimmed);
            }, BLUR_COMMIT_MS);
        },
        [onBlurSearch, onValueCommit]
    );

    return (
        <div ref={rootRef} className="relative z-[9999] isolate mb-1.5">
            {/* 입력·▼·지우기와 드롭다운을 한 덩어리로 — top-full 이 검색창 바로 아래에 붙음 */}
            <div className="relative">
                <input
                    ref={setInputRef}
                    id={inputId}
                    type="text"
                    maxLength={120}
                    autoComplete="organization"
                    aria-autocomplete="list"
                    aria-expanded={panelVisible}
                    aria-controls={listboxId}
                    placeholder={placeholder}
                    className="w-full pl-4 pr-[7.25rem] py-2 md:py-2.5 text-center font-bold leading-tight rounded-lg border-2 border-[#03C75A] bg-white text-[#111] text-base md:text-lg shadow-[0_2px_8px_rgba(3,199,90,0.12)] outline-none placeholder:text-[#b8b8b8] placeholder:font-semibold focus:ring-2 focus:ring-[#03C75A]/35 focus:border-[#03C75A]"
                    value={input}
                    onChange={onChange}
                    onBlur={onBlur}
                    onFocus={() => {
                        if (input.trim().length >= 1) setPanelVisible(true);
                    }}
                    onCompositionStart={onCompositionStart}
                    onCompositionEnd={onCompositionEnd}
                />
                <button
                    type="button"
                    className="absolute right-[3.25rem] top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl text-[#5D4037]/70 hover:text-[#5D4037] hover:bg-[rgba(93,64,55,0.08)] active:bg-[rgba(93,64,55,0.14)] transition-colors print-hidden"
                    aria-label="기관명 지우기"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={onClear}
                >
                    <span className="text-lg font-black leading-none" aria-hidden>
                        ×
                    </span>
                </button>
                <button
                    type="button"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 min-h-[40px] min-w-[40px] rounded-xl bg-[#2D4A3E] text-white shadow-sm hover:bg-[#1e352c] active:bg-[#1a2d28] transition-colors"
                    aria-label="기초 사전·저장 기관 전체 보기 (검색 없이, 가나다순)"
                    aria-expanded={showAllListMode && panelVisible}
                    aria-controls={listboxId}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={onToggleShowAllList}
                >
                    <span className="text-base font-bold leading-none select-none" aria-hidden>
                        ▼
                    </span>
                </button>

                <div
                    id={listboxId}
                    role="listbox"
                    aria-label="기관 자동완성"
                    className={
                        panelVisible
                            ? 'absolute left-0 right-0 top-full mt-2 z-[10000] max-h-[300px] overflow-y-auto rounded-2xl border-2 border-[#5D4037]/25 bg-white shadow-[0_12px_40px_rgba(93,64,55,0.12)] custom-scrollbar pointer-events-auto opacity-100'
                            : 'hidden'
                    }
                >
                    {panelVisible && rows.length === 0 && emptyHint ? (
                        <div className="px-3 py-2 flex items-center text-sm leading-tight text-[#5D4037]/80 border-b border-[rgba(93,64,55,0.08)] bg-white">
                            {emptyHint}
                        </div>
                    ) : null}
                    {panelVisible &&
                        rows.map((row, idx) => {
                        if (row.kind === 'inst') {
                            const inst = row.inst;
                            return (
                                <button
                                    key={`inst-${inst.id}`}
                                    type="button"
                                    role="option"
                                    className={rowBtnClass}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => onPickInstitution(inst.id)}
                                >
                                    <span className="text-sm font-bold">{inst.name}</span>
                                    <span className="text-[10px] text-[#5D4037]/70 font-semibold shrink-0">
                                        [{inst.type || '—'}]
                                    </span>
                                </button>
                            );
                        }
                        if (row.kind === 'direct') {
                            const dq = row.query.trim();
                            return (
                                <button
                                    key={`direct-${dq}`}
                                    type="button"
                                    role="option"
                                    className={`${rowBtnClass} cursor-pointer`}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        directPickMouseHandledRef.current = true;
                                        handleDirectPick(dq);
                                    }}
                                    onClick={() => {
                                        if (directPickMouseHandledRef.current) {
                                            directPickMouseHandledRef.current = false;
                                            return;
                                        }
                                        handleDirectPick(dq);
                                    }}
                                >
                                    <span className="text-sm font-bold leading-tight">
                                        직접 입력: &quot;{dq}&quot; 사용하기
                                    </span>
                                    <span className="text-[10px] text-[#5D4037]/60 font-medium ml-1 shrink-0">
                                        [직접입력]
                                    </span>
                                </button>
                            );
                        }
                        const name = row.name;
                        return (
                            <button
                                key={`preset-${idx}-${name}`}
                                type="button"
                                role="option"
                                className={rowBtnClass}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => onPickPresetName(name)}
                            >
                                <span className="text-sm font-bold leading-tight">{name}</span>
                                <span className="text-[10px] text-[#5D4037]/60 font-medium ml-1 shrink-0">
                                    [사전명단]
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div
                className="flex flex-wrap gap-1.5 mt-2 mb-1 px-0.5"
                role="group"
                aria-label="기관 유형 빠른 필터"
            >
                {CHIP_ITEMS.map(({ id, label }) => (
                    <button
                        key={id}
                        type="button"
                        className={`${chipBase} ${activeFilter === id ? chipOn : chipOff}`}
                        aria-pressed={activeFilter === id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                            setActiveFilter(id);
                            const suffix = targetGroup === 'preschool' ? TYPE_CHIP_SUFFIX[id] : undefined;
                            if (suffix) {
                                handleTypeClick(suffix);
                            }
                            if (input.trim().length >= 1 || suffix) {
                                setPanelVisible(true);
                                queueMicrotask(() => focusSearchInput());
                            }
                        }}
                    >
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
}
