/**
 * 배포 전: 단일 Pages 프로젝트(ms12) 원칙 안내 + main 이 아닌 브랜치 경고
 */
import { execSync } from 'node:child_process'

const PROJECT = 'ms12'
const BRANCH = 'main'

console.log(`[pages-deploy] 대상: Cloudflare Pages 프로젝트 "${PROJECT}" (branch ${BRANCH})`)
console.log(
  '[pages-deploy] Git 저장소를 Pages에 연결했다면 CLI 배포와 빌드가 겹치지 않는지 Dashboard에서 확인하세요.',
)

try {
  const cur = execSync('git branch --show-current', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim()
  if (cur && cur !== BRANCH) {
    console.warn(
      `[pages-deploy] 경고: 현재 브랜치가 "${cur}" 입니다. 프로덕션은 보통 ${BRANCH} 에서만 배포합니다.`,
    )
  }
} catch {
  /* git 없음·비저장소 — 무시 */
}
