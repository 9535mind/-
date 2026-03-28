/**
 * 토스페이먼츠 결제 연동
 * - 결제 요청
 * - 결제 승인
 * - 결제 취소 (환불)
 * - 웹훅 검증
 */

const API_BASE = 'https://api.tosspayments.com/v1'

/**
 * 결제 요청 데이터 생성
 */
export interface PaymentRequest {
  orderId: string          // 주문 ID (고유값)
  orderName: string        // 주문명
  amount: number           // 결제 금액
  customerEmail: string    // 고객 이메일
  customerName: string     // 고객 이름
  successUrl: string       // 성공 리다이렉트 URL
  failUrl: string          // 실패 리다이렉트 URL
}

/**
 * 결제 승인 요청
 */
export async function confirmPayment(
  paymentKey: string,
  orderId: string,
  amount: number,
  secretKey: string
): Promise<any> {
  const response = await fetch(`${API_BASE}/payments/confirm`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(secretKey + ':')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentKey,
      orderId,
      amount,
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`결제 승인 실패: ${error.message}`)
  }

  return await response.json()
}

/**
 * 결제 취소 (환불)
 */
export async function cancelPayment(
  paymentKey: string,
  cancelReason: string,
  cancelAmount?: number, // 부분 취소 금액 (선택)
  secretKey?: string
): Promise<any> {
  if (!secretKey) {
    throw new Error('TOSS_SECRET_KEY가 설정되지 않았습니다.')
  }

  const response = await fetch(`${API_BASE}/payments/${paymentKey}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(secretKey + ':')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cancelReason,
      ...(cancelAmount && { cancelAmount }) // 부분 취소 금액
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`결제 취소 실패: ${error.message}`)
  }

  return await response.json()
}

/**
 * 결제 조회
 */
export async function getPayment(
  paymentKey: string,
  secretKey?: string
): Promise<any> {
  if (!secretKey) {
    throw new Error('TOSS_SECRET_KEY가 설정되지 않았습니다.')
  }

  const response = await fetch(`${API_BASE}/payments/${paymentKey}`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${btoa(secretKey + ':')}`,
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`결제 조회 실패: ${error.message}`)
  }

  return await response.json()
}

/**
 * 웹훅 서명 검증
 * 토스페이먼츠에서 전송한 웹훅이 위조되지 않았는지 확인
 */
function hexToBytes(hex: string): Uint8Array | null {
  const clean = hex.trim().toLowerCase()
  if (!/^[0-9a-f]+$/.test(clean) || clean.length % 2 !== 0) {
    return null
  }
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < clean.length; i += 2) {
    out[i / 2] = parseInt(clean.slice(i, i + 2), 16)
  }
  return out
}

function base64ToBytes(b64: string): Uint8Array | null {
  try {
    const bin = atob(b64.trim())
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) {
      out[i] = bin.charCodeAt(i)
    }
    return out
  } catch {
    return null
  }
}

export async function verifyWebhookSignature(
  requestBody: string,
  signature: string,
  secretKey: string
): Promise<boolean> {
  if (!requestBody || !signature || !secretKey) {
    return false
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(requestBody))
  const macBytes = new Uint8Array(mac)

  const normalized = signature.replace(/^sha256=/i, '').trim()
  const fromHex = hexToBytes(normalized)
  const fromBase64 = base64ToBytes(normalized)
  const provided = fromHex ?? fromBase64
  if (!provided || provided.length !== macBytes.length) {
    return false
  }
  return crypto.subtle.timingSafeEqual(macBytes, provided)
}

/**
 * 환불 규정에 따른 환불 금액 계산
 */
export function calculateRefundAmount(
  originalAmount: number,
  progressRate: number, // 진도율 (0-100)
  enrolledDays: number   // 수강 경과 일수
): {
  refundAmount: number
  refundRate: number
  reason: string
} {
  // 환불 규정
  // 1. 수강 시작 전 (진도 0%): 100% 환불
  // 2. 진도 50% 미만: 50% 환불
  // 3. 진도 50% 이상: 환불 불가

  if (progressRate === 0 && enrolledDays <= 7) {
    // 7일 이내, 진도 0%: 100% 환불
    return {
      refundAmount: originalAmount,
      refundRate: 100,
      reason: '수강 시작 전 전액 환불'
    }
  } else if (progressRate < 50) {
    // 진도 50% 미만: 50% 환불
    return {
      refundAmount: Math.floor(originalAmount * 0.5),
      refundRate: 50,
      reason: '진도 50% 미만 부분 환불'
    }
  } else {
    // 진도 50% 이상: 환불 불가
    return {
      refundAmount: 0,
      refundRate: 0,
      reason: '진도 50% 이상 환불 불가'
    }
  }
}

/**
 * 결제 위젯 스크립트 생성
 */
export function generatePaymentWidgetScript(): string {
  const clientKey = 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq'
  
  return `
<!-- 토스페이먼츠 결제 위젯 -->
<script src="https://js.tosspayments.com/v1/payment-widget"></script>
<script>
const clientKey = '${clientKey}'
const customerKey = 'USER_ID_' + Date.now() // 고객 고유 키

const paymentWidget = PaymentWidget(clientKey, customerKey)

// 결제 UI 렌더링
paymentWidget.renderPaymentMethods('#payment-widget', { value: AMOUNT })

// 결제 요청
async function requestPayment() {
  try {
    await paymentWidget.requestPayment({
      orderId: 'ORDER_' + Date.now(),
      orderName: '마인드 타임 코칭 입문',
      customerEmail: 'user@example.com',
      customerName: '홍길동',
      successUrl: window.location.origin + '/payment/success',
      failUrl: window.location.origin + '/payment/fail',
    })
  } catch (error) {
    console.error('결제 실패:', error)
  }
}
</script>
  `
}

/**
 * 사업자 정보
 */
export const BUSINESS_INFO = {
  businessNumber: '504-88-01964',
  companyName: '(주)마인드스토리',
  representative: '박종석',
  phone: '062-959-9535',
  email: 'sanj2100@naver.com',
  bankAccount: {
    bank: '농협',
    accountNumber: '351-1202-0831-23',
    accountHolder: '(주)마인드스토리'
  }
}
