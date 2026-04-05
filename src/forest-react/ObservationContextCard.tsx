import type { ObservationStage, ObsLocation } from './types';

/** 배지형 토글 — 라벨 없이 4버튼 한 줄 */
const badgeBase =
    'ms-btn flex-1 min-h-[28px] min-w-0 shrink py-0.5 px-1.5 rounded-full text-[11px] font-black border-2 leading-none transition-colors';

export interface ObservationContextCardProps {
    obsPreCls: string;
    obsPostCls: string;
    locForestCls: string;
    locIndoorCls: string;
    onObservationStage: (stage: ObservationStage) => void;
    onObsLocation: (loc: ObsLocation) => void;
}

export function ObservationContextCard({
    obsPreCls,
    obsPostCls,
    locForestCls,
    locIndoorCls,
    onObservationStage,
    onObsLocation,
}: ObservationContextCardProps) {
    return (
        <section
            aria-label="관찰 맥락"
            className="rounded-2xl border border-[rgba(45,74,62,0.12)] bg-[rgba(45,74,62,0.04)] p-1.5 sm:p-2"
        >
            <h3 className="sr-only">관찰 맥락</h3>
            <div className="flex w-full min-w-0 flex-nowrap flex-row items-stretch gap-0">
                <div
                    className="flex min-w-0 flex-1 flex-nowrap gap-1"
                    role="group"
                    aria-label="관찰 단계: 사전 또는 사후"
                >
                    <button
                        type="button"
                        className={`${badgeBase} ${obsPreCls}`}
                        onClick={() => onObservationStage('pre')}
                    >
                        사전
                    </button>
                    <button
                        type="button"
                        className={`${badgeBase} ${obsPostCls}`}
                        onClick={() => onObservationStage('post')}
                    >
                        사후
                    </button>
                </div>
                <div
                    className="flex min-w-0 flex-1 flex-nowrap gap-1 border-l-2 border-[rgba(45,74,62,0.14)] pl-3 sm:pl-4"
                    role="group"
                    aria-label="진행 장소: 숲 또는 실내"
                >
                    <button
                        type="button"
                        className={`${badgeBase} ${locForestCls}`}
                        onClick={() => onObsLocation('forest')}
                    >
                        숲
                    </button>
                    <button
                        type="button"
                        className={`${badgeBase} ${locIndoorCls}`}
                        onClick={() => onObsLocation('indoor')}
                    >
                        실내
                    </button>
                </div>
            </div>
        </section>
    );
}
