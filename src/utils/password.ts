/**
 * Workers 호환 비밀번호 해시 (Web Crypto PBKDF2-SHA256).
 * 기존 bcrypt($2a/$2b/$2y) 해시는 검증만 지원한다.
 */

import bcrypt from 'bcryptjs'

const PREFIX = 'wrk1'
const ITERATIONS = 100_000
const KEY_BITS = 256

function toBase64(bytes: Uint8Array): string {
  const chunk = 8192
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i)
  }
  return out
}

function isBcryptHash(stored: string): boolean {
  return (
    stored.startsWith('$2a$') ||
    stored.startsWith('$2b$') ||
    stored.startsWith('$2y$')
  )
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_BITS
  )
  const hashBytes = new Uint8Array(bits)
  return `${PREFIX}$${ITERATIONS}$${toBase64(salt)}$${toBase64(hashBytes)}`
}

export async function verifyPassword(
  password: string,
  stored: string | null | undefined
): Promise<boolean> {
  if (stored == null || stored === '') {
    return false
  }
  if (isBcryptHash(stored)) {
    try {
      return await bcrypt.compare(password, stored)
    } catch {
      return false
    }
  }
  if (!stored.startsWith(`${PREFIX}$`)) {
    return false
  }
  const parts = stored.split('$')
  if (parts.length !== 4) {
    return false
  }
  const iterations = parseInt(parts[1], 10)
  if (!Number.isFinite(iterations) || iterations < 1) {
    return false
  }
  let salt: Uint8Array
  let expected: Uint8Array
  try {
    salt = fromBase64(parts[2])
    expected = fromBase64(parts[3])
  } catch {
    return false
  }
  if (expected.length !== KEY_BITS / 8) {
    return false
  }
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_BITS
  )
  const actual = new Uint8Array(bits)
  if (actual.length !== expected.length) {
    return false
  }
  return crypto.subtle.timingSafeEqual(actual, expected)
}
