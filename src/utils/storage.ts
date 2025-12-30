/**
 * 스토리지 유틸리티
 * 로컬 개발: public/uploads 폴더 사용
 * 프로덕션: Cloudflare R2 사용
 */

import { Context } from 'hono'
import * as fs from 'fs'
import * as path from 'path'

/**
 * 환경이 로컬인지 확인
 */
export function isLocalEnvironment(c: Context): boolean {
  // R2 바인딩이 없으면 로컬 환경
  const { STORAGE, VIDEO_STORAGE } = c.env
  return !STORAGE && !VIDEO_STORAGE
}

/**
 * 로컬 파일 저장
 */
export async function saveFileLocally(
  file: File,
  folder: 'videos' | 'images'
): Promise<string> {
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 15)
  const extension = '.' + (file.name.split('.').pop()?.toLowerCase() || '')
  const filename = `${timestamp}-${randomStr}${extension}`
  
  // 파일 경로
  const relativePath = `uploads/${folder}/${filename}`
  const fullPath = path.join(process.cwd(), 'public', relativePath)
  
  // 디렉토리 생성
  const dir = path.dirname(fullPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  
  // 파일 저장
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  fs.writeFileSync(fullPath, buffer)
  
  // 공개 URL 반환 (public 폴더 기준 상대 경로)
  return `/${relativePath}`
}

/**
 * R2에 파일 저장
 */
export async function saveFileToR2(
  file: File,
  r2Bucket: R2Bucket,
  folder: 'videos' | 'images'
): Promise<string> {
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 15)
  const extension = '.' + (file.name.split('.').pop()?.toLowerCase() || '')
  const filename = `${timestamp}-${randomStr}${extension}`
  const path = `${folder}/${filename}`
  
  // R2에 업로드
  const arrayBuffer = await file.arrayBuffer()
  await r2Bucket.put(path, arrayBuffer, {
    httpMetadata: {
      contentType: file.type
    }
  })
  
  return path
}

/**
 * 파일 저장 (환경 자동 감지)
 */
export async function saveFile(
  c: Context,
  file: File,
  folder: 'videos' | 'images'
): Promise<string> {
  const isLocal = isLocalEnvironment(c)
  
  if (isLocal) {
    console.log(`[Storage] 로컬 환경: public/uploads/${folder}/ 에 저장`)
    return await saveFileLocally(file, folder)
  } else {
    console.log(`[Storage] 프로덕션 환경: R2에 저장`)
    const bucket = folder === 'videos' ? c.env.VIDEO_STORAGE : c.env.STORAGE
    return await saveFileToR2(file, bucket, folder)
  }
}

/**
 * 파일 URL 가져오기 (환경 자동 감지)
 */
export function getFileUrl(
  c: Context,
  filePath: string
): string {
  const isLocal = isLocalEnvironment(c)
  
  if (isLocal) {
    // 로컬: public 폴더 기준 경로
    // filePath가 이미 /uploads/로 시작하면 그대로 반환
    if (filePath.startsWith('/uploads/')) {
      return filePath
    }
    // 아니면 /api/storage/ 제거하고 /uploads/ 추가
    if (filePath.startsWith('videos/') || filePath.startsWith('images/')) {
      return `/uploads/${filePath}`
    }
    return filePath
  } else {
    // 프로덕션: R2 API 경로
    if (filePath.startsWith('/api/storage/')) {
      return filePath
    }
    return `/api/storage/${filePath}`
  }
}

/**
 * 로컬 파일 삭제
 */
export function deleteFileLocally(relativePath: string): boolean {
  try {
    const fullPath = path.join(process.cwd(), 'public', relativePath)
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath)
      return true
    }
    return false
  } catch (error) {
    console.error('Delete local file error:', error)
    return false
  }
}

/**
 * R2 파일 삭제
 */
export async function deleteFileFromR2(
  r2Bucket: R2Bucket,
  path: string
): Promise<boolean> {
  try {
    await r2Bucket.delete(path)
    return true
  } catch (error) {
    console.error('Delete R2 file error:', error)
    return false
  }
}

/**
 * 파일 삭제 (환경 자동 감지)
 */
export async function deleteFile(
  c: Context,
  filePath: string,
  folder: 'videos' | 'images'
): Promise<boolean> {
  const isLocal = isLocalEnvironment(c)
  
  if (isLocal) {
    console.log(`[Storage] 로컬 파일 삭제: ${filePath}`)
    return deleteFileLocally(filePath)
  } else {
    console.log(`[Storage] R2 파일 삭제: ${filePath}`)
    const bucket = folder === 'videos' ? c.env.VIDEO_STORAGE : c.env.STORAGE
    return await deleteFileFromR2(bucket, filePath)
  }
}
