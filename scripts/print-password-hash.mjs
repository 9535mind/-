/**
 * D1 수동 UPDATE 용 — 반드시 src/utils/password.ts 의 hashPassword 와 동일 알고리즘 유지
 * 사용: node scripts/print-password-hash.mjs "새비밀번호"
 */
const PREFIX = 'wrk1'
const ITERATIONS = 100_000
const KEY_BITS = 256

function toBase64(bytes) {
  const chunk = 8192
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  if (typeof btoa === 'function') return btoa(binary)
  return Buffer.from(binary, 'latin1').toString('base64')
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    KEY_BITS
  )
  const hashBytes = new Uint8Array(bits)
  return `${PREFIX}$${ITERATIONS}$${toBase64(salt)}$${toBase64(hashBytes)}`
}

const pwd = process.argv.slice(2).join(' ').trim()
if (!pwd) {
  console.error('사용법: node scripts/print-password-hash.mjs "설정할비밀번호"')
  process.exit(1)
}

const hash = await hashPassword(pwd)
console.log(hash)
