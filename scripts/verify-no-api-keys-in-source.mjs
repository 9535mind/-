/**
 * 소스 트리에 OpenAI API 키 형태 문자열이 들어가면 실패합니다.
 * (배포 전 실수 커밋 방지 — 키는 .env / Cloudflare Secret 만 사용)
 */
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const dirs = ['src', 'scripts']
const exts = new Set(['.ts', '.tsx', '.js', '.mjs', '.jsx', '.jsonc'])

// 프로젝트 키·구 키처럼 길게 보이는 sk-… 만 검사
const KEY_LIKE =
  /\bsk-proj-[A-Za-z0-9_-]{24,}\b|\bsk-(?!your|test|live|dummy)[a-zA-Z0-9]{40,}\b/g

const ALLOW_SUBSTR = [
  'your_openai_key',
  'xxxxx',
  'placeholder',
  'example_key',
  'xxxxxxxx',
  'redacted'
]

function walk(dir, out) {
  if (!fs.existsSync(dir)) return
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (exts.has(path.extname(name))) out.push(p)
  }
}

function main() {
  const files = []
  for (const d of dirs) walk(path.join(root, d), files)
  files.push(path.join(root, 'wrangler.toml'))

  let bad = []
  for (const file of files) {
    if (!fs.existsSync(file)) continue
    const base = path.basename(file)
    if (base === 'verify-no-api-keys-in-source.mjs') continue
    let text
    try {
      text = fs.readFileSync(file, 'utf8')
    } catch {
      continue
    }
    const lines = text.split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (ALLOW_SUBSTR.some((s) => line.includes(s))) continue
      const m = line.match(KEY_LIKE)
      if (m) bad.push({ file: path.relative(root, file), line: i + 1, hit: m[0].slice(0, 12) + '…' })
    }
  }

  if (bad.length) {
    console.error('[verify-no-api-keys] 소스에 API 키로 보이는 문자열이 있습니다. 제거 후 .env / Secret 만 사용하세요.')
    for (const b of bad) console.error(`  ${b.file}:${b.line} (${b.hit})`)
    process.exit(1)
  }
  console.log('[verify-no-api-keys] OK')
}

main()
