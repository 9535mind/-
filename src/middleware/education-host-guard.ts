/**
 * forest · mindstory-lms 등 교육 계열 호스트에서 MS12(/app, 회의, OAuth) 경로 차단.
 * — 리다이렉트 없음, ms12.org로 보내지 않음.
 *
 * ═══ FOREST ZONE (FROZEN) — 아래 `isLmsHostForestPath` / `isForestPathAllowed` / `isForestApiPath` 블록 ═══
 * forest 전용 URL 허용 목록은 public/forest.html·/api/forest* 와 1:1. 임의 변경·경로 «공유» 금지.
 * 변경은 docs/FOREST-FROZEN.md 승인 절차 후에만. MS12 라우트와 합치지 말 것.
 * ═══════════════════════════════════════════════════════════════════════════════════
 */
import type { Context, Next } from 'hono'
import { Bindings } from '../types/database'
import {
  isForestProductHost,
  isLifelongLmsProductHost,
  normalizeOauthRequestHostname,
  requestHostname,
} from '../utils/oauth-public'

const MSG = '잘못된 경로'

function hostFromContext(c: Context): string {
  return normalizeOauthRequestHostname(requestHostname(c))
}

function deniedResponse(c: Context) {
  const p = c.req.path
  if (p.startsWith('/api/') || p === '/api') {
    return c.json(
      { success: false, error: MSG, message: MSG },
      404
    )
  }
  c.header('Cache-Control', 'private, no-store')
  c.header('X-Content-Type-Options', 'nosniff')
  return c.text(MSG, 404)
}

function normalizeForGuard(pathname: string): string {
  if (pathname === '' || pathname === '/') return '/'
  const t = pathname.replace(/\/+$/, '')
  return t || '/'
}

/** MS12 회의·헬스·OAuth(구글·카카오)·/join 등 — forest/LMS 모두에서 차단 */
function isMs12SurfacePath(p: string): boolean {
  if (p === '/api' || p.startsWith('/api/')) {
    if (p === '/api/health' || p.startsWith('/api/health/')) return true
    if (p.startsWith('/api/ms12')) return true
    if (p.startsWith('/api/auth/google')) return true
    if (p.startsWith('/api/auth/kakao')) return true
  }
  if (p.startsWith('/auth/kakao')) return true
  if (p === '/app' || p.startsWith('/app/')) return true
  if (p === '/join' || p.startsWith('/join/')) return true
  return false
}

// --- FOREST ZONE: forest 호스트(숲)에서 허용할 경로 식별 (forest.html `educationHostGuard`와 동기) ---
function isLmsHostForestPath(p: string): boolean {
  if (p === '/forest' || p.startsWith('/forest/')) return true
  if (p === '/forest.html') return true
  if (p === '/forest-question-banks.js') return true
  if (p === '/forest_v9' || p === '/forest_v9.html') return true
  if (p.startsWith('/api/forest')) return true
  return false
}

/**
 * forest 전용 API — MS12(/api/ms12)·OAuth와 경로가 겹치지 않음. 접두 /api/forest* 로 GAS + forest-results 를 한 번에 커버.
 * ( forest-gas-webhook, forest-gas-report, forest-gas-report-public, forest-results, … )
 * FROZEN: `/api/forest` 접두·동작을 MS12 공통 API에 합치지 말 것.
 */
function isForestApiPath(n: string): boolean {
  return n.startsWith('/api/forest')
}

// --- FOREST ZONE: isForestProductHost(숲 전용 Host)에만 사용 — 정적·API 허용 목록 ---
function isForestPathAllowed(p: string): boolean {
  const n = normalizeForGuard(p)
  if (n === '/') return true
  if (n === '/forest' || n === '/forest.html') return true
  if (n === '/forest-question-banks.js') return true
  if (n === '/forest_v9' || n === '/forest_v9.html') return true
  if (n.startsWith('/assets/')) return true
  if (n === '/static/js/jtt-metrics-calculator.js') return true
  if (isForestApiPath(n)) return true
  return false
}

/**
 * Hono: forest/LMS(교육) 손님 Host 에서 MS12(및 룸 불일치) 경로 early deny.
 * ms12.org / ms12.pages.dev 는 `isEducationProductHost` 가 false 이어서 통과.
 */
export async function educationHostGuard(
  c: Context<{ Bindings: Bindings }>,
  next: Next
) {
  const h = hostFromContext(c)
  if (!isForestProductHost(h) && !isLifelongLmsProductHost(h)) {
    return next()
  }

  const p = c.req.path

  if (isForestProductHost(h)) {
    if (isMs12SurfacePath(p) || !isForestPathAllowed(p)) {
      return deniedResponse(c)
    }
    return next()
  }

  if (isLifelongLmsProductHost(h)) {
    if (isMs12SurfacePath(p) || isLmsHostForestPath(p)) {
      return deniedResponse(c)
    }
    return next()
  }

  return next()
}
