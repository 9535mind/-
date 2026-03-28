/**
 * pages-admin.ts — 관리자 라우트 Clean URL 정리 (idempotent)
 * 구버전 /admin-users.html 등 잔재가 있으면 /admin/dashboard#… 로 치환합니다.
 */
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const p = join(dirname(fileURLToPath(import.meta.url)), '../src/routes/pages-admin.ts')
let s = fs.readFileSync(p, 'utf8')
const before = s

s = s.replace(
  /return\s+c\.redirect\(\s*['"]\/admin-users\.html['"]\s*\)/g,
  `return c.redirect('/admin/dashboard#members')`,
)

const legacyStart = s.indexOf(`/**
 * GET /admin/users-legacy`)
const payStart = s.indexOf(`/**
 * GET /admin/payments`)
if (legacyStart >= 0 && payStart > legacyStart) {
  s = s.slice(0, legacyStart) + s.slice(payStart)
}

function spliceRoute(startMarker, nextMarker, replacement) {
  const i = s.indexOf(startMarker)
  const j = s.indexOf(nextMarker, i + 1)
  if (i < 0 || j < 0) return false
  s = s.slice(0, i) + replacement + s.slice(j)
  return true
}

spliceRoute(
  `pagesAdmin.get('/payments', async (c) => {`,
  `pagesAdmin.get('/courses/:courseId/lessons'`,
  `pagesAdmin.get('/payments', (c) => {
  return c.redirect('/admin/dashboard#payments')
})

`,
)

spliceRoute(
  `pagesAdmin.get('/enrollments', async (c) => {`,
  `pagesAdmin.get('/videos'`,
  `pagesAdmin.get('/enrollments', (c) => {
  return c.redirect('/admin/dashboard#enrollments')
})

`,
)

const v1 = s.indexOf(`pagesAdmin.get('/videos', async (c) => {`)
const uclass = v1 >= 0 ? s.indexOf(`pagesAdmin.get('/users/:userId/classroom'`, v1) : -1
if (v1 >= 0 && uclass > v1) {
  s =
    s.slice(0, v1) +
    `pagesAdmin.get('/videos', (c) => {
  return c.redirect('/admin/dashboard#videos')
})

` +
    s.slice(uclass)
}

if (s !== before) {
  fs.writeFileSync(p, s)
  console.log('patched pages-admin.ts (Clean URL)')
} else {
  console.log('pages-admin.ts 이미 Clean URL 기준이거나 패치 대상 없음 — 변경 없음')
}
