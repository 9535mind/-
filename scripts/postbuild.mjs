/**
 * Vite 빌드 후 처리 (Windows/Linux 공통 — bash 불필요)
 * - uploads 복사
 * - _routes.json (정적 사업자 안내 페이지는 Worker 우회)
 */
import { copyFileSync, cpSync, existsSync, rmSync, writeFileSync } from 'node:fs'
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
    /** 유아숲 도구: Worker 미개입 — Clean URL /forest·/forest.html 정적만 (루프 방지) */
    '/forest',
    '/forest.html',
    /** forest.html 이 로드하는 문항뱅크 — Worker가 잡으면 404 (정적 자산으로 반드시 서빙) */
    '/forest-question-banks.js',
    '/assets/*',
    '/forest_v9.html',
    /** /forest_v9.html 은 Worker에서 ASSETS.fetch 로 명시 서빙(배포 누락·라우팅 꼬임 완화) */
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

/** Vite copyPublicDir 외에도 단일 HTML 도구가 dist 루트에 반드시 있도록 보강 (기존 파일 삭제 후 강제 덮어쓰기) */
function forceCopyFile(src, dest) {
  if (existsSync(dest)) {
    rmSync(dest, { force: true })
  }
  copyFileSync(src, dest)
}

const forestHtml = join(publicDir, 'forest.html')
const forestHtmlDest = join(dist, 'forest.html')
if (existsSync(forestHtml)) {
  forceCopyFile(forestHtml, forestHtmlDest)
  console.log('✅ forest.html → dist 루트 명시 복사(덮어쓰기)')
} else {
  console.log('⚠️  public/forest.html 없음 — /forest.html 404 가능')
}

const forestV9Html = join(publicDir, 'forest_v9.html')
const forestV9HtmlDest = join(dist, 'forest_v9.html')
if (existsSync(forestV9Html)) {
  forceCopyFile(forestV9Html, forestV9HtmlDest)
  console.log('✅ forest_v9.html → dist 루트 명시 복사(덮어쓰기)')
} else {
  console.log('⚠️  public/forest_v9.html 없음')
}

const forestQbanks = join(publicDir, 'forest-question-banks.js')
const forestQbanksDest = join(dist, 'forest-question-banks.js')
if (existsSync(forestQbanks)) {
  forceCopyFile(forestQbanks, forestQbanksDest)
  console.log('✅ forest-question-banks.js → dist 루트 명시 복사(덮어쓰기)')
}

const assetsDir = join(publicDir, 'assets')
if (existsSync(assetsDir)) {
  cpSync(assetsDir, join(dist, 'assets'), { recursive: true })
  console.log('✅ public/assets → dist/assets 복사')
  const introMp4 = join(dist, 'assets', 'forest_test.mp4')
  if (!existsSync(introMp4)) {
    console.warn(
      '⚠️  dist/assets/forest_test.mp4 없음 — 프로덕션에서 /assets/forest_test.mp4 가 404일 수 있음 (public/assets에 추가 후 빌드)'
    )
  }
}

writeFileSync(join(dist, '_routes.json'), JSON.stringify(ROUTES, null, 2) + '\n', 'utf8')
console.log('✅ dist/_routes.json 작성 (정적 exclude: /pg-business-info.html 등)')

// 배포 후 브라우저에서 https://(도메인)/build.txt 로 최신 빌드 시각 확인 (npm run build 시 postbuild에서 매번 갱신)
const now = new Date()
const builtAtISO = now.toISOString()
const builtAtLocal = now.toLocaleString('ko-KR', {
  timeZone: 'Asia/Seoul',
  dateStyle: 'medium',
  timeStyle: 'medium',
})
const buildMeta = {
  stamp: '[REAL V10.0 - NAVER GREEN]',
  builtAt: builtAtISO,
  builtAtKorea: builtAtLocal,
  note: 'npm run build → postbuild.mjs 가 이 파일을 덮어씁니다. 시각이 안 바뀌면 dist 미배포 또는 캐시 의심.',
}
const buildTxtBody =
  `# ${buildMeta.stamp}\n# builtAt (ISO): ${builtAtISO}\n# builtAt (Asia/Seoul): ${builtAtLocal}\n\n` +
  JSON.stringify(buildMeta, null, 2) +
  '\n'
writeFileSync(join(dist, 'build.txt'), buildTxtBody, 'utf8')
console.log('✅ dist/build.txt 작성 (배포 반영 확인용)', builtAtISO)
