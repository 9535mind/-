/**
 * R2 이미지 업로드 — 관리자 업로드·강사 프로필 등에서 공통 사용
 */

import type { Bindings } from '../types/database'

const DEFAULT_R2_PUBLIC = 'https://pub-baceedca01874770be7f326265d34480.r2.dev'

export function getR2PublicBaseUrl(env: Bindings): string {
  const extra = env as Bindings & { R2_PUBLIC_BASE_URL?: string; R2_PUBLIC_URL?: string }
  const a = String(extra.R2_PUBLIC_URL || '').trim()
  const b = String(extra.R2_PUBLIC_BASE_URL || '').trim()
  const raw = a || b || DEFAULT_R2_PUBLIC
  return raw.replace(/\/$/, '')
}

export async function uploadImageFileToR2(
  env: Bindings,
  file: File,
  keyPrefix: string
): Promise<{ url: string; key: string }> {
  const bucket = env.R2
  if (!bucket) {
    throw new Error('R2_NOT_CONFIGURED')
  }
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('UNSUPPORTED_TYPE')
  }
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error('FILE_TOO_LARGE')
  }

  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 15)
  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png'
  const key = `${keyPrefix.replace(/\/$/, '')}/${timestamp}-${randomString}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  await bucket.put(key, arrayBuffer, {
    httpMetadata: {
      contentType: file.type || 'image/png',
    },
  })

  const url = `${getR2PublicBaseUrl(env)}/${key}`
  return { url, key }
}

export async function uploadImageBufferToR2(
  env: Bindings,
  buffer: ArrayBuffer,
  contentType: string,
  key: string
): Promise<string> {
  const bucket = env.R2
  if (!bucket) {
    throw new Error('R2_NOT_CONFIGURED')
  }
  await bucket.put(key, buffer, {
    httpMetadata: {
      contentType: contentType || 'image/png',
    },
  })
  return `${getR2PublicBaseUrl(env)}/${key}`
}
