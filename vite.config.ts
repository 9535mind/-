import build from '@hono/vite-build/cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import cloudflare from '@hono/vite-dev-server/cloudflare'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

/** Vite 설정 파일(이 파일)이 있는 디렉터리 = package.json / wrangler.toml / .dev.vars 를 두는 프로젝트 루트 */
const __root = path.dirname(fileURLToPath(import.meta.url))
const wranglerConfigPath = path.join(__root, 'wrangler.toml')

/**
 * `npm run dev` 는 Vite만 켜는 것이 아니라, @hono/vite-dev-server → getPlatformProxy() 로
 * Cloudflare bindings 을 흉내 냄. 이 때 Wrangler 4 는 기본으로 `.env` 계열만 읽을 수 있어,
 * `KAKAO_CLIENT_ID` 가 `.dev.vars` 에만 있으면 c.env에 주입되지 않는 문제가 생김(사용자 혼란).
 * `.dev.vars` 를 envFiles에 명시해 Workers 로컬과 동일하게 시크릿이 주입되게 함.
 * 파일이 없는 항목은 제외(선택). `.dev.vars` 는 배열 뒤에서와 같이 뒤에 두어 덮어쓰기 우선.
 */
function wranglerLocalEnvFileList(): string[] {
  const candidates = ['.env', '.env.local', '.dev.vars'] as const
  // 상대 파일명(.dev.vars)만 넘기면 getPlatformProxy CWD에 따라 루트 밖을 볼 수 있어 항상 절대 경로
  return candidates
    .map((name) => path.resolve(__root, name))
    .filter((abs) => fs.existsSync(abs))
}

/** Node(vite)에서만 — Worker 런타임이 아닌 설정 로드 시 루트 env 파일에 있는 KAKAO id */
function parseDotEnvFile(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  let s0 = String(text)
  if (s0.length > 0 && s0.charCodeAt(0) === 0xfeff) s0 = s0.slice(1)
  for (const line of s0.split(/\r?\n/)) {
    let s = line.trim()
    if (!s || s.startsWith('#')) continue
    if (s.startsWith('export ')) s = s.slice(7).trim()
    const eq = s.indexOf('=')
    if (eq < 1) continue
    const k = s.slice(0, eq).trim()
    let v = s.slice(eq + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    out[k] = v
  }
  return out
}

/**
 * c.env / wrangler 가 비어도 Worker 번들이 루트 .dev.vars (마지막이 우선) 를 알 수 있게
 * `import.meta.env.__KAKAO_CLIENT_ID_FROM_FILE` 으로 주입 (로컬·CI: 파일 없으면 '').
 * NODE_ENV=development 는 생략 — 파일만 있으면 읽고, dev:d1 는 dist 를 쓰므로 .dev.vars 를 바꾸면 `vite build`가 필요
 */
function readKakaoClientIdFromRootEnvFilesForDefine(): string {
  const order = ['.env', '.env.local', '.dev.vars'] as const
  const merged: Record<string, string> = {}
  for (const name of order) {
    const p = path.join(__root, name)
    if (!fs.existsSync(p)) continue
    try {
      Object.assign(merged, parseDotEnvFile(fs.readFileSync(p, 'utf8')))
    } catch {
      // ignore
    }
  }
  const raw = merged.KAKAO_CLIENT_ID || ''
  const v = String(raw).trim()
  if (!v || v === 'your_kakao_rest_api_key') return ''
  return v
}

export default defineConfig({
  define: {
    /** 로컬 Vite 번들에서만 사용. 프로덕션은 /api/portone/public-config 권장 */
    'import.meta.env.VITE_PORTONE_IMP_CODE': JSON.stringify(process.env.VITE_PORTONE_IMP_CODE ?? ''),
    'import.meta.env.__KAKAO_CLIENT_ID_FROM_FILE': JSON.stringify(
      readKakaoClientIdFromRootEnvFilesForDefine()
    ),
  },
  plugins: [
    /** Cloudflare Pages: 출력 파일명 `dist/_worker.js` (adapter 기본) — 엔트리를 명시해 Vite·glob 해석이 흔들리지 않게 함 */
    build({ entry: 'src/index.tsx' }),
    devServer({
      /**
       * 기본 `import adapter from '…/cloudflare'` 만 쓰면 getPlatformProxy() 가 인자 없이 호출됨.
       * 아래처럼 `cloudflare({ proxy: { ... }})` 를 넘겨야 redirect_uri / 시크릿이 프로젝트 루트에 맞게 로드됨.
       */
      entry: 'src/index.tsx',
      adapter: () => {
        const localEnvFiles = wranglerLocalEnvFileList()
        return cloudflare({
          proxy: {
            configPath: wranglerConfigPath,
            ...(localEnvFiles.length > 0 ? { envFiles: localEnvFiles } : {}),
          },
        })
      },
    }),
  ],
  publicDir: 'public',
  /** `npm run dev` 와 `npm run dev:d1` 모두 3000으로 맞춤 — 브라우저는 http://localhost:3000 만 열면 됨 */
  server: {
    port: 3000,
    strictPort: false,
  },
  build: {
    outDir: 'dist',
    copyPublicDir: true
  }
})
