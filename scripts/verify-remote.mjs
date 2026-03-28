/**
 * mindstory.kr 배포·API 응답 형식 빠른 확인 (쿠키·로그인은 브라우저에서만 완전 검증 가능)
 */
const ORIGIN = process.env.VERIFY_ORIGIN || 'https://mindstory.kr'

async function main() {
  const health = await fetch(`${ORIGIN}/api/health`)
  const healthJson = await health.json()
  console.log('[health]', health.status, healthJson)

  const me = await fetch(`${ORIGIN}/api/auth/me`, { headers: { Accept: 'application/json' } })
  const ct = me.headers.get('content-type') || ''
  const meBody = await me.text()
  let parsed = null
  try {
    parsed = JSON.parse(meBody)
  } catch {
    /* ignore */
  }

  console.log('[auth/me]', me.status, 'Content-Type:', ct)
  console.log('[auth/me] body:', parsed ?? meBody.slice(0, 120))

  const json401 = me.status === 401 && ct.includes('application/json') && parsed?.success === false
  if (!json401) {
    console.error(
      '\nFAIL: /api/auth/me 가 JSON 401 이 아닙니다. Pages 커스텀 도메인이 올바른 브랜치(main) 배포를 가리키는지, npm run deploy 가 --branch main 인지 확인하세요.\n'
    )
    process.exit(1)
  }

  console.log('\nOK: 원격 API 형식 정상 (브라우저에서 로그인·session_token 쿠키는 직접 확인하세요).\n')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
