/**
 * forest.html 의 STATE·SCHEMA 와 정렬되는 최소 타입 (React 마이그레이션용).
 * 실제 SCHEMA 전체는 forest.html / 추후 forest-schema.ts 로 이전 시 확장.
 */

export type TargetGroup = 'preschool' | 'elementary';

export type SetupTypeOverride =
    | '어린이집'
    | '유치원'
    | '기타'
    | '지역아동센터'
    | '방과후교실'
    | '초등학교'
    | null;

export type ObservationStage = 'pre' | 'post';

export type ObsLocation = 'forest' | 'indoor';

export interface ForestInstitution {
    id: string;
    name: string;
    type?: string;
    targetGroup?: TargetGroup;
    groupName?: string;
    obsPhase?: string;
    obsLocation?: string;
    updatedAt?: string;
}

/** 드롭다운 한 줄 */
export type InstitutionDropdownRow =
    | { kind: 'inst'; inst: ForestInstitution }
    | { kind: 'preset'; name: string };

/** SCHEMA 에서 검사 설정에 필요한 최소 표면 */
export interface ForestSchemaApi {
    readonly version: string;
    getTargetGroup: (inst: ForestInstitution) => TargetGroup;
}
