import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const p = join(dirname(fileURLToPath(import.meta.url)), '../src/routes/pages-admin.ts')
let s = fs.readFileSync(p, 'utf8')
const a = "pagesAdmin.get('/courses', async (c) => {"
const b = "pagesAdmin.get('/users'"
const i = s.indexOf(a)
const j = s.indexOf(b, i)
if (i < 0 || j < 0) {
  console.error('markers', i, j)
  process.exit(1)
}
const mid = `pagesAdmin.get('/courses', (c) => {
  return c.redirect('/admin/dashboard#courses')
})

`
s = s.slice(0, i) + mid + s.slice(j)
fs.writeFileSync(p, s)
console.log('courses redirect ok')
