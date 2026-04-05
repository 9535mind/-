/**
 * Forest 검사 설정 React 마이그레이션 모듈 (forest.html 비수정).
 * 사용 시: npm i react react-dom && npm i -D @types/react @types/react-dom
 */
export { InstitutionSearchInput } from './InstitutionSearchInput';
export type { InstitutionSearchInputProps } from './InstitutionSearchInput';

export { SetupDashboard } from './SetupDashboard';
export type { SetupDashboardProps } from './SetupDashboard';

export { buildInstitutionDropdownRows } from './institution-dropdown-rows';
export type { BuildInstitutionDropdownOptions, CategoryChipFilter } from './institution-dropdown-rows';

export { forestSchemaStub } from './forest-schema';
export { INSTITUTION_DATABASE } from './forest-presets';
export * from './types';
export * from './korean-inst-search';
export * from './institution-match';
export { detectInstitutionType } from './detect-institution-type';
export type { DetectInstitutionTypeResult } from './detect-institution-type';
