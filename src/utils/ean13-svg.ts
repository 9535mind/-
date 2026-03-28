/**
 * EAN-13 바코드 SVG (Worker/브라우저 공통, 외부 네이티브 모듈 없음)
 * https://en.wikipedia.org/wiki/International_Article_Number
 */

const L: string[] = [
  '0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011',
]
const G: string[] = [
  '0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111',
]
const R: string[] = L.map((s) => [...s].reverse().join(''))

/** 첫 자리(0–9)에 따른 왼쪽 6자리 패턴: L 또는 G */
const PARITY: string[] = [
  'LLLLLL',
  'LLGLGG',
  'LLGGLG',
  'LLGGGL',
  'LGLLGG',
  'LGGLLG',
  'LGGGLL',
  'LGLGLG',
  'LGLGGL',
  'LGGLGL',
]

function normalizeIsbn13(raw: string): string | null {
  const d = raw.replace(/\D/g, '')
  return d.length === 13 ? d : null
}

function encodeEan13(digits: string): string {
  const first = parseInt(digits[0]!, 10)
  const parity = PARITY[first] ?? PARITY[0]!
  let bits = '101' // start
  for (let i = 1; i <= 6; i++) {
    const n = parseInt(digits[i]!, 10)
    const pat = parity[i - 1] === 'L' ? L[n]! : G[n]!
    bits += pat
  }
  bits += '01010' // center
  for (let i = 7; i <= 12; i++) {
    const n = parseInt(digits[i]!, 10)
    bits += R[n]!
  }
  bits += '101' // end
  return bits
}

export function ean13Svg(isbnRaw: string, opts?: { width?: number; height?: number }): string {
  const digits = normalizeIsbn13(isbnRaw)
  if (!digits) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><text x="10" y="35">Invalid ISBN</text></svg>`
  }
  const bits = encodeEan13(digits)
  const w = opts?.width ?? 220
  const h = opts?.height ?? 80
  const barH = h - 26
  const unit = w / bits.length
  let x = 0
  const rects: string[] = []
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') {
      rects.push(
        `<rect x="${x.toFixed(3)}" y="8" width="${unit.toFixed(3)}" height="${barH}" fill="#0f172a"/>`,
      )
    }
    x += unit
  }
  const label = `${digits.slice(0, 1)} ${digits.slice(1, 7)} ${digits.slice(7)}`
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="EAN-13 ${digits}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  ${rects.join('\n  ')}
  <text x="${w / 2}" y="${h - 4}" text-anchor="middle" font-size="12" font-family="ui-monospace,monospace" fill="#334155">${label}</text>
</svg>`
}
