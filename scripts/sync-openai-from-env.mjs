/**
 * 로컬 개발: 루트 .env 의 OPENAI_API_KEY / OPENAI_BASE_URL / OPENAI_MODEL 을 .dev.vars 에 병합합니다.
 * - 값은 콘솔에 출력하지 않습니다.
 * - .env·.dev.vars 는 .gitignore 대상이며 Worker 번들에 포함되지 않습니다.
 */
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const envPath = path.join(root, '.env')
const devVarsPath = path.join(root, '.dev.vars')

function parseDotEnv(text) {
  const out = {}
  for (const line of text.split(/\r?\n/)) {
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

function escapeDevVarValue(v) {
  if (/[\s#"']/.test(v)) {
    return `"${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  }
  return String(v)
}

function writeDevVars(filePath, obj) {
  const keys = Object.keys(obj).sort()
  const body =
    '# 로컬 전용 — git에 커밋하지 마세요. OPENAI_* 는 scripts/sync-openai-from-env.mjs 가 .env에서 병합할 수 있습니다.\n' +
    keys.map((k) => `${k}=${escapeDevVarValue(obj[k] ?? '')}`).join('\n') +
    '\n'
  fs.writeFileSync(filePath, body, 'utf8')
}

function main() {
  if (!fs.existsSync(envPath)) {
    return
  }
  let fromEnv
  try {
    fromEnv = parseDotEnv(fs.readFileSync(envPath, 'utf8'))
  } catch {
    return
  }

  let existing = {}
  if (fs.existsSync(devVarsPath)) {
    try {
      let raw = fs.readFileSync(devVarsPath, 'utf8')
      if (raw.charCodeAt(0) === 0xfeff) {
        raw = raw.slice(1)
      }
      const withoutComments = raw
        .split(/\r?\n/)
        .filter((line) => !/^\s*#/.test(line))
        .join('\n')
      existing = parseDotEnv(withoutComments)
    } catch {
      existing = {}
    }
  }

  const merged = { ...existing }
  let changed = false
  const DEFAULT_BASE = 'https://api.openai.com/v1'
  const DEFAULT_MODEL = 'gpt-4o'

  if (fromEnv.OPENAI_API_KEY !== undefined && fromEnv.OPENAI_API_KEY !== '') {
    merged.OPENAI_API_KEY = fromEnv.OPENAI_API_KEY
    changed = true
  }
  if (fromEnv.OPENAI_BASE_URL !== undefined && fromEnv.OPENAI_BASE_URL !== '') {
    merged.OPENAI_BASE_URL = fromEnv.OPENAI_BASE_URL
    changed = true
  } else if (merged.OPENAI_API_KEY && !merged.OPENAI_BASE_URL) {
    merged.OPENAI_BASE_URL = DEFAULT_BASE
    changed = true
  }
  if (fromEnv.OPENAI_MODEL !== undefined && fromEnv.OPENAI_MODEL !== '') {
    merged.OPENAI_MODEL = fromEnv.OPENAI_MODEL
    changed = true
  } else if (merged.OPENAI_API_KEY && !merged.OPENAI_MODEL) {
    merged.OPENAI_MODEL = DEFAULT_MODEL
    changed = true
  }

  if (changed) {
    writeDevVars(devVarsPath, merged)
    console.log('[sync-openai-from-env] .dev.vars 에 OPENAI 설정을 반영했습니다.')
  }
}

main()
