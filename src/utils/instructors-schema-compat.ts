/**
 * instructors 테이블에 profile_image_ai(0049)가 아직 없는 환경에서도 동작하도록 폴백
 */

import type { D1Database } from '@cloudflare/workers-types'

export function isMissingColumnError(err: unknown, column: string): boolean {
  const m = String(err instanceof Error ? err.message : err)
  return /no such column/i.test(m) && m.includes(column)
}

/** 원격 D1에 migrations/0048 미적용 시 */
export function isNoSuchTableInstructors(err: unknown): boolean {
  const m = String(err instanceof Error ? err.message : err)
  return /no such table/i.test(m) && /instructors/i.test(m)
}

export class InstructorsTableMissingError extends Error {
  constructor() {
    super(
      'instructors 테이블이 없습니다. 로컬/원격 D1에 migrations(0048_add_instructors_table.sql 등)를 적용해 주세요.',
    )
    this.name = 'InstructorsTableMissingError'
  }
}

export async function insertInstructorRow(
  DB: D1Database,
  params: {
    name: string
    profile_image: string | null
    profile_image_ai: number
    bio: string | null
    specialty: string | null
    gender?: string | null
  }
) {
  const gender = params.gender != null && String(params.gender).trim() !== '' ? String(params.gender).trim().slice(0, 8) : 'U'
  try {
    return await DB.prepare(
      `
      INSERT INTO instructors (name, profile_image, profile_image_ai, bio, specialty, gender, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `
    )
      .bind(params.name, params.profile_image, params.profile_image_ai, params.bio, params.specialty, gender)
      .run()
  } catch (e) {
    if (isNoSuchTableInstructors(e)) {
      throw new InstructorsTableMissingError()
    }
    if (isMissingColumnError(e, 'gender')) {
      try {
        return await DB.prepare(
          `
          INSERT INTO instructors (name, profile_image, profile_image_ai, bio, specialty, created_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'))
        `
        )
          .bind(params.name, params.profile_image, params.profile_image_ai, params.bio, params.specialty)
          .run()
      } catch (e2) {
        if (isNoSuchTableInstructors(e2)) throw new InstructorsTableMissingError()
        if (isMissingColumnError(e2, 'profile_image_ai')) {
          try {
            return await DB.prepare(
              `
            INSERT INTO instructors (name, profile_image, bio, specialty, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
          `
            )
              .bind(params.name, params.profile_image, params.bio, params.specialty)
              .run()
          } catch (e3) {
            if (isNoSuchTableInstructors(e3)) throw new InstructorsTableMissingError()
            throw e3
          }
        }
        throw e2
      }
    }
    if (isMissingColumnError(e, 'profile_image_ai')) {
      try {
        return await DB.prepare(
          `
        INSERT INTO instructors (name, profile_image, bio, specialty, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `
        )
          .bind(params.name, params.profile_image, params.bio, params.specialty)
          .run()
      } catch (e2) {
        if (isNoSuchTableInstructors(e2)) throw new InstructorsTableMissingError()
        throw e2
      }
    }
    throw e
  }
}

export async function listInstructorsRows(DB: D1Database) {
  try {
    const rows = await DB.prepare(`
      SELECT id, name, profile_image, profile_image_ai, bio, specialty, gender, created_at
      FROM instructors
      ORDER BY id DESC
      LIMIT 500
    `).all()
    return rows.results ?? []
  } catch (e) {
    if (isNoSuchTableInstructors(e)) {
      console.warn('[instructors] list: instructors 테이블 없음 — 마이그레이션 0048+ 적용 필요')
      return []
    }
    if (isMissingColumnError(e, 'gender')) {
      try {
        const rows = await DB.prepare(`
        SELECT id, name, profile_image, profile_image_ai, bio, specialty, created_at
        FROM instructors
        ORDER BY id DESC
        LIMIT 500
      `).all()
        const raw = (rows.results ?? []) as Array<Record<string, unknown>>
        return raw.map((r) => ({ ...r, gender: 'U' }))
      } catch (e2) {
        if (isNoSuchTableInstructors(e2)) return []
        throw e2
      }
    }
    if (isMissingColumnError(e, 'profile_image_ai')) {
      try {
        const rows = await DB.prepare(`
        SELECT id, name, profile_image, bio, specialty, created_at
        FROM instructors
        ORDER BY id DESC
        LIMIT 500
      `).all()
        const raw = (rows.results ?? []) as Array<Record<string, unknown>>
        return raw.map((r) => ({ ...r, profile_image_ai: 0, gender: 'U' }))
      } catch (e2) {
        if (isNoSuchTableInstructors(e2)) return []
        throw e2
      }
    }
    throw e
  }
}

export async function fetchInstructorProfileFields(
  DB: D1Database,
  id: string
): Promise<{ profile_image: string | null; profile_image_ai: number; gender?: string | null } | null> {
  try {
    const row = await DB.prepare(
      `SELECT profile_image, profile_image_ai, gender FROM instructors WHERE id = ?`
    )
      .bind(id)
      .first<{ profile_image: string | null; profile_image_ai: number; gender: string | null }>()
    return row ?? null
  } catch (e) {
    if (isNoSuchTableInstructors(e)) {
      throw new InstructorsTableMissingError()
    }
    if (isMissingColumnError(e, 'gender')) {
      try {
        const row = await DB.prepare(
          `SELECT profile_image, profile_image_ai FROM instructors WHERE id = ?`
        )
          .bind(id)
          .first<{ profile_image: string | null; profile_image_ai: number }>()
        if (!row) return null
        return { ...row, gender: 'U' }
      } catch (e2) {
        if (isNoSuchTableInstructors(e2)) throw new InstructorsTableMissingError()
        if (isMissingColumnError(e2, 'profile_image_ai')) {
          try {
            const row = await DB.prepare(`SELECT profile_image FROM instructors WHERE id = ?`)
              .bind(id)
              .first<{ profile_image: string | null }>()
            if (!row) return null
            return { profile_image: row.profile_image, profile_image_ai: 0, gender: 'U' }
          } catch (e3) {
            if (isNoSuchTableInstructors(e3)) throw new InstructorsTableMissingError()
            throw e3
          }
        }
        throw e2
      }
    }
    if (isMissingColumnError(e, 'profile_image_ai')) {
      try {
        const row = await DB.prepare(`SELECT profile_image FROM instructors WHERE id = ?`)
          .bind(id)
          .first<{ profile_image: string | null }>()
        if (!row) return null
        return { profile_image: row.profile_image, profile_image_ai: 0, gender: 'U' }
      } catch (e2) {
        if (isNoSuchTableInstructors(e2)) throw new InstructorsTableMissingError()
        throw e2
      }
    }
    throw e
  }
}

export async function updateInstructorRow(
  DB: D1Database,
  id: string,
  params: {
    name: string
    profile_image: string | null
    profile_image_ai: number
    bio: string | null
    specialty: string | null
    gender?: string | null
  }
) {
  const gender =
    params.gender != null && String(params.gender).trim() !== ''
      ? String(params.gender).trim().slice(0, 8)
      : 'U'
  try {
    return await DB.prepare(
      `
      UPDATE instructors SET
        name = ?,
        profile_image = ?,
        profile_image_ai = ?,
        bio = ?,
        specialty = ?,
        gender = ?
      WHERE id = ?
    `
    )
      .bind(
        params.name,
        params.profile_image,
        params.profile_image_ai,
        params.bio,
        params.specialty,
        gender,
        id
      )
      .run()
  } catch (e) {
    if (isNoSuchTableInstructors(e)) {
      throw new InstructorsTableMissingError()
    }
    if (isMissingColumnError(e, 'gender')) {
      try {
        return await DB.prepare(
          `
        UPDATE instructors SET
          name = ?,
          profile_image = ?,
          profile_image_ai = ?,
          bio = ?,
          specialty = ?
        WHERE id = ?
      `
        )
          .bind(
            params.name,
            params.profile_image,
            params.profile_image_ai,
            params.bio,
            params.specialty,
            id
          )
          .run()
      } catch (e2) {
        if (isNoSuchTableInstructors(e2)) throw new InstructorsTableMissingError()
        if (isMissingColumnError(e2, 'profile_image_ai')) {
          try {
            return await DB.prepare(
              `
            UPDATE instructors SET
              name = ?,
              profile_image = ?,
              bio = ?,
              specialty = ?
            WHERE id = ?
          `
            )
              .bind(params.name, params.profile_image, params.bio, params.specialty, id)
              .run()
          } catch (e3) {
            if (isNoSuchTableInstructors(e3)) throw new InstructorsTableMissingError()
            throw e3
          }
        }
        throw e2
      }
    }
    if (isMissingColumnError(e, 'profile_image_ai')) {
      try {
        return await DB.prepare(
          `
        UPDATE instructors SET
          name = ?,
          profile_image = ?,
          bio = ?,
          specialty = ?
        WHERE id = ?
      `
        )
          .bind(params.name, params.profile_image, params.bio, params.specialty, id)
          .run()
      } catch (e2) {
        if (isNoSuchTableInstructors(e2)) throw new InstructorsTableMissingError()
        throw e2
      }
    }
    throw e
  }
}

/** AI 프로필 재생성용 — 이름·전공·성별·AI 여부 */
export async function fetchInstructorRowForRegenerate(
  DB: D1Database,
  id: string
): Promise<{
  name: string
  specialty: string | null
  bio: string | null
  profile_image: string | null
  profile_image_ai: number
  gender: string | null
} | null> {
  try {
    const row = await DB.prepare(
      `SELECT name, specialty, bio, profile_image, profile_image_ai, gender FROM instructors WHERE id = ?`
    )
      .bind(id)
      .first<{
        name: string
        specialty: string | null
        bio: string | null
        profile_image: string | null
        profile_image_ai: number
        gender: string | null
      }>()
    return row ?? null
  } catch (e) {
    if (isNoSuchTableInstructors(e)) {
      throw new InstructorsTableMissingError()
    }
    if (isMissingColumnError(e, 'gender')) {
      try {
        const row = await DB.prepare(
          `SELECT name, specialty, bio, profile_image, profile_image_ai FROM instructors WHERE id = ?`
        )
          .bind(id)
          .first<{
            name: string
            specialty: string | null
            bio: string | null
            profile_image: string | null
            profile_image_ai: number
          }>()
        if (!row) return null
        return { ...row, gender: 'U' }
      } catch (e2) {
        if (isNoSuchTableInstructors(e2)) throw new InstructorsTableMissingError()
        throw e2
      }
    }
    if (isMissingColumnError(e, 'profile_image_ai')) {
      try {
        const row = await DB.prepare(`SELECT name, specialty, bio, profile_image FROM instructors WHERE id = ?`)
          .bind(id)
          .first<{
            name: string
            specialty: string | null
            bio: string | null
            profile_image: string | null
          }>()
        if (!row) return null
        return { ...row, profile_image_ai: 0, gender: 'U' }
      } catch (e2) {
        if (isNoSuchTableInstructors(e2)) throw new InstructorsTableMissingError()
        throw e2
      }
    }
    throw e
  }
}
