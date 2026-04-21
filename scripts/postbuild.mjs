/**
 * Vite 빌드 후: dist 루트에 정적 파일 강제 복사 + Cloudflare Pages `_routes.json` (정적 우회).
 */
import { copyFileSync, cpSync, existsSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const dist = join(root, 'dist')
const publicDir = join(root, 'public')

const CF_PAGES_MAX_ASSET_BYTES = 25 * 1024 * 1024

/** Worker가 아닌 ASSETS 직접 서빙 — forest.html 등 정적 HTML·JS가 404 나지 않게 */
const ROUTES = {
  version: 1,
  include: ['/*'],
  exclude: [
    '/uploads/*',
    '/static/*',
    '/assets/*',
    '/forest.html',
    '/forest',
    '/forest/*',
    '/forest-question-banks.js',
    '/build.txt',
    '/google7186e759c88da5d4.html',
    '/KakaoTalk_20240501_163910442.mp4',
    '/KakaoTalk_20240501_172743992.mp4',
  ],
}

if (!existsSync(dist)) {
  console.error('dist/ 가 없습니다. 먼저 vite build 를 실행하세요.')
  process.exit(1)
}

/** Cloudflare Pages: public/_redirects → dist/_redirects (빌드 산출물 루트에 있어야 적용됨) */
const redirectsPublic = join(publicDir, '_redirects')
const redirectsDist = join(dist, '_redirects')
if (existsSync(redirectsPublic)) {
  copyFileSync(redirectsPublic, redirectsDist)
  console.log('✅ copyFileSync: public/_redirects → dist/_redirects')
} else if (existsSync(redirectsDist)) {
  rmSync(redirectsDist, { force: true })
  console.log('✅ dist/_redirects 제거 (소스 없음)')
}

const uploadsSrc = join(publicDir, 'uploads')
if (existsSync(uploadsSrc)) {
  cpSync(uploadsSrc, join(dist, 'uploads'), { recursive: true })
  console.log('✅ uploads → dist 복사')
}

/** public/forest/index.html → /forest (dist/forest/ 는 forest.html 파일과 이름 충돌 없음) */
const forestIndexDirSrc = join(publicDir, 'forest')
const forestIndexDirDest = join(dist, 'forest')
if (existsSync(forestIndexDirSrc)) {
  cpSync(forestIndexDirSrc, forestIndexDirDest, { recursive: true })
  console.log('✅ cpSync: public/forest → dist/forest')
}

const forestHtmlSrc = join(publicDir, 'forest.html')
const forestHtmlDest = join(dist, 'forest.html')
const forestQSrc = join(publicDir, 'forest-question-banks.js')
const forestQDest = join(dist, 'forest-question-banks.js')

if (!existsSync(forestHtmlSrc)) {
  console.error('❌ public/forest.html 이 없습니다. 파일을 추가한 뒤 다시 빌드하세요.')
  process.exit(1)
}

copyFileSync(forestHtmlSrc, forestHtmlDest)
console.log('✅ copyFileSync: public/forest.html → dist/forest.html')

if (!existsSync(forestQSrc)) {
  console.warn('⚠️  public/forest-question-banks.js 없음 — 건너뜀')
} else {
  copyFileSync(forestQSrc, forestQDest)
  console.log('✅ copyFileSync: public/forest-question-banks.js → dist/forest-question-banks.js')
}

const KAKAO_RELAY_MP4 = [
  'KakaoTalk_20240501_163910442.mp4',
  'KakaoTalk_20240501_172743992.mp4',
]

const assetsDir = join(publicDir, 'assets')
if (existsSync(assetsDir)) {
  cpSync(assetsDir, join(dist, 'assets'), { recursive: true })
  console.log('✅ public/assets → dist/assets 복사')
  for (const fname of KAKAO_RELAY_MP4) {
    const src = join(assetsDir, fname)
    if (existsSync(src)) {
      copyFileSync(src, join(dist, fname))
      console.log(`✅ public/assets/${fname} → dist/${fname} (최상단 복사)`)
    }
  }
  const introMp4 = join(dist, 'assets', 'forest_test.mp4')
  if (!existsSync(introMp4)) {
    console.warn(
      '⚠️  dist/assets/forest_test.mp4 없음 — public/assets에 추가 후 빌드'
    )
  } else {
    try {
      const st = statSync(introMp4)
      if (st.size > CF_PAGES_MAX_ASSET_BYTES) {
        console.warn(
          `⚠️  forest_test.mp4 가 ${(st.size / (1024 * 1024)).toFixed(2)} MiB — Pages 단일 파일 25 MiB 한도 초과 시 업로드 제외될 수 있음`
        )
      }
    } catch {
      /* ignore */
    }
  }
}

writeFileSync(join(dist, '_routes.json'), JSON.stringify(ROUTES, null, 2) + '\n', 'utf8')
console.log('✅ dist/_routes.json 작성 (forest.html·/forest·forest-question-banks.js 정적 exclude)')

const now = new Date()
const builtAtISO = now.toISOString()
const builtAtLocal = now.toLocaleString('ko-KR', {
  timeZone: 'Asia/Seoul',
  dateStyle: 'medium',
  timeStyle: 'medium',
})
const buildMeta = {
  stamp: 'postbuild',
  builtAt: builtAtISO,
  builtAtKorea: builtAtLocal,
  note: 'npm run build → postbuild.mjs',
}
writeFileSync(
  join(dist, 'build.txt'),
  `# builtAt (ISO): ${builtAtISO}\n# builtAt (Asia/Seoul): ${builtAtLocal}\n\n${JSON.stringify(buildMeta, null, 2)}\n`,
  'utf8'
)
console.log('✅ dist/build.txt', builtAtISO)

if (!existsSync(forestHtmlDest)) {
  console.error('❌ dist/forest.html 이 없습니다.')
  process.exit(1)
}
try {
  const st = statSync(forestHtmlDest)
  if (st.size < 1) {
    console.error('❌ dist/forest.html 크기가 0입니다.')
    process.exit(1)
  }
  console.log(`✅ 검증: dist/forest.html 존재 (${st.size} bytes)`)
} catch (e) {
  console.error('❌ dist/forest.html 검증 실패:', e)
  process.exit(1)
}
