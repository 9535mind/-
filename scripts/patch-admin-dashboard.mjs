import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const p = join(__dirname, '../src/routes/pages-admin.ts')
let s = fs.readFileSync(p, 'utf8')

const inj = "import { adminHubPageHtml } from '../utils/admin-hub-html'\n"
if (!s.includes('admin-hub-html')) {
  s = s.replace(
    "import { Hono } from 'hono'\nimport { Bindings } from '../types/database'",
    `import { Hono } from 'hono'\n${inj}import { Bindings } from '../types/database'`,
  )
}

const start = s.indexOf("pagesAdmin.get('/dashboard'")
const end = s.indexOf("pagesAdmin.get('/courses'", start)
if (start < 0 || end < 0) {
  console.error('markers', start, end)
  process.exit(1)
}

const mid = `pagesAdmin.get('/dashboard', async (c) => {
  return c.html(adminHubPageHtml())
})

`

s = s.slice(0, start) + mid + s.slice(end)
fs.writeFileSync(p, s)
console.log('patched', p)
