/**
 * Vite 빌드 후: dist 루트에 정적 복사(선택) + Cloudflare Pages `_routes.json`
 * MS12 — forest/forest.html 의존 제거(레거시 LMS)
 */
import { copyFileSync, cpSync, existsSync, writeFileSync, statSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const dist = join(root, 'dist')
const publicDir = join(root, 'public')

/** 정적 ASSETS만 우회. /api/* 는 exclude 에 넣지 말 것(Worker·JSON) */
const ROUTES = {
  version: 1,
  include: ['/*'],
  exclude: [
    '/uploads/*',
    '/static/*',
    '/assets/*',
    '/favicon.ico',
    '/favicon-16x16.png',
    '/favicon-32x32.png',
    '/apple-touch-icon.png',
    '/android-chrome-192x192.png',
    '/android-chrome-512x512.png',
    '/site.webmanifest',
    '/build.txt',
  ],
}

if (!existsSync(dist)) {
  console.error('dist/ 가 없습니다. 먼저 vite build 를 실행하세요.')
  process.exit(1)
}

const workerJs = join(dist, '_worker.js')
if (!existsSync(workerJs)) {
  console.error(
    '❌ dist/_worker.js 가 없습니다. @hono/vite-build/cloudflare-pages 가 필요합니다.',
  )
  process.exit(1)
}
try {
  const st = statSync(workerJs)
  console.log(`✅ dist/_worker.js (${(st.size / 1024).toFixed(1)} KiB)`)
} catch (e) {
  console.error('❌ dist/_worker.js 검증 실패:', e)
  process.exit(1)
}

const redirectsPublic = join(publicDir, '_redirects')
const redirectsDist = join(dist, '_redirects')
if (existsSync(redirectsPublic)) {
  copyFileSync(redirectsPublic, redirectsDist)
  console.log('✅ public/_redirects → dist/_redirects')
} else if (existsSync(redirectsDist)) {
  rmSync(redirectsDist, { force: true })
  console.log('✅ dist/_redirects 제거 (소스 없음)')
}

const uploadsSrc = join(publicDir, 'uploads')
if (existsSync(uploadsSrc)) {
  cpSync(uploadsSrc, join(dist, 'uploads'), { recursive: true })
  console.log('✅ uploads → dist 복사')
}

const assetsDir = join(publicDir, 'assets')
if (existsSync(assetsDir)) {
  cpSync(assetsDir, join(dist, 'assets'), { recursive: true })
  console.log('✅ public/assets → dist/assets')
}

writeFileSync(join(dist, '_routes.json'), JSON.stringify(ROUTES, null, 2) + '\n', 'utf8')
console.log('✅ dist/_routes.json (MS12)')

const now = new Date()
writeFileSync(
  join(dist, 'build.txt'),
  `# builtAt: ${now.toISOString()}\n${JSON.stringify({ note: 'ms12 postbuild' }, null, 2)}\n`,
  'utf8'
)
console.log('✅ dist/build.txt', now.toISOString())
