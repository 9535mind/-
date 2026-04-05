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
import { buildInstitutionDropdownRows, type CategoryChipFilter } from './institution-dropdown-rows';
import type { ForestInstitution, ForestSchemaApi, InstitutionDropdownRow, SetupTypeOverride, TargetGroup } from './types';

const DEBOUNCE_MS = 200;

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
}

const rowBtnClass =
    'ms-inst-dd-opt w-full text-left px-4 py-3 min-h-[44px] flex flex-col justify-center sm:flex-row sm:items-baseline sm:gap-2 border-b border-[rgba(93,64,55,0.1)] last:border-b-0 bg-white text-[#5D4037] hover:bg-[rgba(212,163,115,0.22)] active:bg-[rgba(212,163,115,0.3)] transition-colors';

export function InstitutionSearchInput({
    value,
    resetKey,
    onValueCommit,
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
    emptyHint = '검색 결과가 없어요.',
    inputId: inputIdProp,
    listboxId: listboxIdProp,
    inputRef: inputRefProp,
}: InstitutionSearchInputProps) {
    const genId = useId();
    const inputId = inputIdProp ?? `forest-inst-inp-${genId}`;
    const listboxId = listboxIdProp ?? `forest-inst-lb-${genId}`;
    const rootRef = useRef<HTMLDivElement>(null);
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

    const [localValue, setLocalValue] = useState(value);
    const [debouncedEmit, setDebouncedEmit] = useState(value);
    const [isComposing, setIsComposing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<CategoryChipFilter>('ALL');

    const composingRef = useRef(false);

    useEffect(() => {
        setLocalValue(value);
        setDebouncedEmit(value);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- 외부 pick/clear 시에만 resetKey로 동기화
    }, [resetKey]);

    useEffect(() => {
        if (isComposing) return;
        const id = window.setTimeout(() => setDebouncedEmit(localValue), DEBOUNCE_MS);
        return () => window.clearTimeout(id);
    }, [localValue, isComposing]);

    useEffect(() => {
        if (isComposing) return;
        onValueCommit(debouncedEmit);
    }, [debouncedEmit, isComposing, onValueCommit]);

    const rows: InstitutionDropdownRow[] = useMemo(() => {
        const q = localValue;
        const allMode = showAllListMode;
        if (!allMode && q.trim().length < 1) {
            return [];
        }
        return buildInstitutionDropdownRows({
            schema,
            institutions,
            presetDatabase,
            targetGroup,
            setupTypeOverride,
            query: allMode && q.trim().length < 1 ? '' : q,
            allMode,
            categoryChip: activeFilter,
        });
    }, [
        localValue,
        showAllListMode,
        schema,
        institutions,
        presetDatabase,
        targetGroup,
        setupTypeOverride,
        activeFilter,
    ]);

    const panelVisible = showAllListMode || localValue.trim().length >= 1;

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
            setLocalValue(v);
            setIsComposing(false);
            notifyCompose(false);
            setDebouncedEmit(v);
        },
        [notifyCompose]
    );

    const onChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setLocalValue(v);
    }, []);

    const onBlur = useCallback(
        (e: FocusEvent<HTMLInputElement>) => {
            const related = e.relatedTarget;
            if (related instanceof Node && rootRef.current?.contains(related)) {
                return;
            }
            const raw = e.currentTarget.value;
            const trimmed = raw.trim();
            setLocalValue(trimmed);
            setDebouncedEmit(trimmed);
            onValueCommit(trimmed);
            onBlurSearch?.(trimmed);
        },
        [onBlurSearch, onValueCommit]
    );

    return (
        <div ref={rootRef} className="relative z-[80] mb-1.5">
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
                    className="w-full pl-4 pr-[7.25rem] py-2.5 md:py-3 text-center font-bold rounded-lg border-2 border-[#03C75A] bg-white text-[#111] text-base md:text-lg shadow-[0_2px_8px_rgba(3,199,90,0.12)] outline-none focus:ring-2 focus:ring-[#03C75A]/35 focus:border-[#03C75A]"
                    value={localValue}
                    onChange={onChange}
                    onBlur={onBlur}
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
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl bg-[#2D4A3E] text-white shadow-sm hover:bg-[#1e352c] active:bg-[#1a2d28] transition-colors"
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
                            if (localValue.trim().length >= 1) {
                                queueMicrotask(() => focusSearchInput());
                            }
                        }}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div
                id={listboxId}
                role="listbox"
                aria-label="기관 자동완성"
                className={
                    panelVisible
                        ? 'absolute left-0 right-0 top-full mt-2 z-[90] max-h-[min(42vh,18rem)] overflow-y-auto rounded-2xl border-2 border-[#5D4037]/25 bg-white shadow-[0_12px_40px_rgba(93,64,55,0.12)] custom-scrollbar'
                        : 'hidden'
                }
            >
                {panelVisible && rows.length === 0 && emptyHint ? (
                    <div className="px-4 py-3 min-h-[44px] flex items-center text-sm text-[#5D4037]/80 border-b border-[rgba(93,64,55,0.08)] bg-white">
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
                                <span className="text-sm font-bold">{name}</span>
                                <span className="text-[10px] text-[#5D4037]/80 font-semibold shrink-0">[사전명단]</span>
                            </button>
                        );
                    })}
            </div>
        </div>
    );
}
