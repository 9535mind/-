/**
 * pages-admin.ts — 관리자 라우트에 남은 .html 리다이렉트·구형 async 풀페이지를
 * Clean URL(`/admin/dashboard#…`)로 맞춥니다. (idempotent, 여러 번 실행 안전)
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

function replaceBlock(startMarker, endMarker, replacement) {
  const start = s.indexOf(startMarker)
  if (start < 0) return false
  const end = s.indexOf(endMarker, start + startMarker.length)
  if (end < 0) return false
  s = s.slice(0, start) + replacement + s.slice(end)
  return true
}

replaceBlock(
  "pagesAdmin.get('/courses', async (c) => {",
  "pagesAdmin.get('/users'",
  `pagesAdmin.get('/courses', (c) => {
  return c.redirect('/admin/dashboard#courses')
})

`,
)

replaceBlock(
  "pagesAdmin.get('/payments', async (c) => {",
  "pagesAdmin.get('/courses/:courseId/lessons'",
  `pagesAdmin.get('/payments', (c) => {
  return c.redirect('/admin/dashboard#payments')
})

`,
)

replaceBlock(
  "pagesAdmin.get('/enrollments', async (c) => {",
  "pagesAdmin.get('/videos'",
  `pagesAdmin.get('/enrollments', (c) => {
  return c.redirect('/admin/dashboard#enrollments')
})

`,
)

replaceBlock(
  "pagesAdmin.get('/videos', async (c) => {\n  return c.html(`",
  "pagesAdmin.get('/users/:userId/classroom'",
  `pagesAdmin.get('/videos', (c) => {
  return c.redirect('/admin/dashboard#videos')
})

pagesAdmin.get('/users/:userId/classroom'`,
)

const legacyStart = s.indexOf(`/**
 * GET /admin/users-legacy`)
const payMarker = `pagesAdmin.get('/payments'`
const payIdx = s.indexOf(payMarker)
if (legacyStart >= 0 && payIdx > legacyStart) {
  s = s.slice(0, legacyStart) + s.slice(payIdx)
}

if (s !== before) {
  fs.writeFileSync(p, s)
  console.log('redirects patched (Clean URL)')
} else {
  console.log('patch-admin-redirects: 변경 없음 (이미 정리됨 또는 마커 없음)')
}
