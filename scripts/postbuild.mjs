/**
 * Vite 빌드 후 처리 (Windows/Linux 공통 — bash 불필요)
 * - uploads 복사
 * - _routes.json (정적 사업자 안내 페이지는 Worker 우회)
 */
import { cpSync, existsSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const dist = join(root, 'dist')
const publicDir = join(root, 'public')

/** exclude: Worker가 아닌 정적 자산만 나열(리다이렉트 아님). .html 파일명은 실제 public 정적 파일. */
const ROUTES = {
  version: 1,
  include: ['/*'],
  exclude: [
    '/uploads/*',
    '/static/*',
    '/pg-business-info.html',
    '/mindstory-4gunja-temperament.html',
    '/유아숲 행동관찰.html',
    '/build.txt',
    '/google7186e759c88da5d4.html',
  ],
}

if (!existsSync(dist)) {
  console.error('dist/ 가 없습니다. 먼저 vite build 를 실행하세요.')
  process.exit(1)
}

const uploadsSrc = join(publicDir, 'uploads')
if (existsSync(uploadsSrc)) {
  cpSync(uploadsSrc, join(dist, 'uploads'), { recursive: true })
  console.log('✅ uploads → dist 복사')
} else {
  console.log('⚠️  public/uploads 없음 — 건너뜀')
}

writeFileSync(join(dist, '_routes.json'), JSON.stringify(ROUTES, null, 2) + '\n', 'utf8')
console.log('✅ dist/_routes.json 작성 (정적 exclude: /pg-business-info.html 등)')

// 배포 후 브라우저에서 https://(도메인)/build.txt 로 최신 빌드 시각 확인
const buildMeta = {
  builtAt: new Date().toISOString(),
  note: 'npm run build 출력. 푸터 변경이 안 보이면 이 시각이 배포 후 갱신되는지 확인.',
}
writeFileSync(join(dist, 'build.txt'), JSON.stringify(buildMeta, null, 2) + '\n', 'utf8')
console.log('✅ dist/build.txt 작성 (배포 반영 확인용)')
