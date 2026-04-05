/**
 * Vanilla `forest.html` 의 SCHEMA.getTargetGroup 등을 여기로 옮길 때 교체.
 * 지금은 동작 가능한 기본 구현(이름 키워드 추정) — 프로덕션은 forest.html 로직과 동기화 필요.
 */
import type { ForestInstitution, ForestSchemaApi, TargetGroup } from './types';

function guessTargetFromName(name: string): TargetGroup {
    const n = String(name || '');
    if (
        n.includes('지역아동') ||
        n.includes('아동센터') ||
        n.includes('방과후') ||
        n.includes('초등학교') ||
        (n.includes('초등') && n.includes('학교'))
    ) {
        return 'elementary';
    }
    return 'preschool';
}

export const forestSchemaStub: ForestSchemaApi = {
    version: '26.0-react-stub',
    getTargetGroup(inst: ForestInstitution): TargetGroup {
        if (inst.targetGroup === 'elementary' || inst.targetGroup === 'preschool') {
            return inst.targetGroup;
        }
        return guessTargetFromName(inst.name);
    },
};
