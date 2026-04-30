/**
 * MS12 실시간 STT — Deepgram 스트리밍 (클라이언트 ↔ Worker WebSocket ↔ Deepgram)
 * `DEEPGRAM_API_KEY` 가 없으면 GET /status 만 streamingStt: false.
 */
import { Hono } from 'hono'
import { upgradeWebSocket } from 'hono/cloudflare-workers'
import type { WSContext } from 'hono/helper/websocket'
import type { Bindings } from '../types/database'
import type { AppActor } from '../utils/actor'
import { ms12Access } from '../middleware/ms12-access'
import { successResponse } from '../utils/helpers'

const stt = new Hono<{ Bindings: Bindings; Variables: { actor: AppActor } }>()

stt.get('/status', ms12Access, (c) => {
  const key = (c.env.DEEPGRAM_API_KEY || '').trim()
  return c.json(
    successResponse({
      streamingStt: !!key,
      provider: key ? ('deepgram' as const) : ('none' as const),
    }),
  )
})

stt.get(
  '/stream',
  ms12Access,
  upgradeWebSocket((c) => {
    const apiKey = (c.env.DEEPGRAM_API_KEY || '').trim()
    if (!apiKey) {
      return {
        onMessage(_evt, ws: WSContext<WebSocket>) {
          try {
            ws.send(JSON.stringify({ error: 'DEEPGRAM_API_KEY 없음', code: 'NO_DEEPGRAM' }))
          } catch {
            /* ignore */
          }
          ws.close(1011, 'no key')
        },
      }
    }

    let upstream: WebSocket | null = null
    let connecting = false
    const pending: Array<ArrayBuffer | string> = []

    function flushPending() {
      if (!upstream || upstream.readyState !== WebSocket.OPEN) return
      while (pending.length) {
        const x = pending.shift()
        if (x !== undefined) upstream.send(x)
      }
    }

    function bindUpstream(ws: WSContext<WebSocket>) {
      if (upstream || connecting) return
      connecting = true /* 첫 메시지 전에만 소켓 생성 */
      const lang = new URL(c.req.url).searchParams.get('language') || 'ko'
      const sp = new URLSearchParams({
        model: 'nova-2-general',
        language: lang,
        encoding: 'linear16',
        sample_rate: '16000',
        channels: '1',
        interim_results: 'true',
        smart_format: 'true',
        diarize: 'true',
      })
      const url = `wss://api.deepgram.com/v1/listen?${sp.toString()}`
      try {
        upstream = new WebSocket(url, ['token', apiKey])
      } catch {
        connecting = false
        try {
          ws.send(JSON.stringify({ error: 'Deepgram 소켓 생성 실패', code: 'UPSTREAM_CREATE' }))
        } catch {
          /* ignore */
        }
        ws.close(1011, 'upstream')
        return
      }

      upstream.addEventListener('open', () => {
        connecting = false
        flushPending()
      })

      upstream.addEventListener('message', (ev) => {
        try {
          const d = ev.data
          if (typeof d === 'string') ws.send(d)
        } catch {
          /* ignore */
        }
      })

      upstream.addEventListener('close', () => {
        try {
          ws.close()
        } catch {
          /* ignore */
        }
      })

      upstream.addEventListener('error', () => {
        try {
          ws.close()
        } catch {
          /* ignore */
        }
      })
    }

    function enqueueClientPayload(d: unknown) {
      if (typeof d === 'string') pending.push(d)
      else if (d instanceof ArrayBuffer) pending.push(d)
      else if (d instanceof Blob) {
        d.arrayBuffer().then((ab) => pending.push(ab)).catch(() => {})
      }
    }

    return {
      onMessage(event, ws: WSContext<WebSocket>) {
        bindUpstream(ws)
        const d = event.data as unknown
        if (upstream && upstream.readyState === WebSocket.OPEN) {
          if (typeof d === 'string') upstream.send(d)
          else if (d instanceof ArrayBuffer) upstream.send(d)
          else if (d instanceof Blob) {
            d.arrayBuffer().then((ab) => upstream!.send(ab)).catch(() => {})
          }
        } else {
          enqueueClientPayload(d)
        }
      },
      onClose() {
        try {
          upstream?.close()
        } catch {
          /* ignore */
        }
        upstream = null
      },
    }
  }),
)

export default stt
