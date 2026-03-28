/**
 * 결제 관련 페이지
 * - 결제 페이지
 * - 결제 성공
 * - 결제 실패
 */

import { Hono } from 'hono'
import { sitePaymentFooterHtml } from '../utils/site-footer-legal'

const app = new Hono()

/**
 * 결제 페이지
 * GET /payment/checkout/:courseId
 */
app.get('/payment/checkout/:courseId', (c) => {
  const courseId = c.req.param('courseId')
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>결제하기 - 마인드스토리</title>
        <link rel="stylesheet" href="/static/css/app.css" />
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://js.tosspayments.com/v1/payment-widget"></script>
        <script src="/static/js/auth.js"></script>
        <script src="/static/js/utils.js"></script>
    </head>
    <body class="bg-gray-50">
        <div class="max-w-4xl mx-auto px-4 py-8">
            <h1 class="text-3xl font-bold mb-8">결제하기</h1>
            
            <!-- 과정 정보 -->
            <div id="courseInfo" class="bg-white rounded-lg shadow p-6 mb-6">
                <div class="animate-pulse">
                    <div class="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div class="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
            </div>

            <!-- 결제 금액 -->
            <div id="priceInfo" class="bg-white rounded-lg shadow p-6 mb-6">
                <h2 class="text-xl font-bold mb-4">결제 금액</h2>
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span>과정 금액</span>
                        <span id="originalPrice">-</span>
                    </div>
                    <div class="flex justify-between text-red-600" id="discountRow" style="display:none">
                        <span>할인</span>
                        <span id="discountAmount">-</span>
                    </div>
                    <div class="border-t pt-2 mt-2 flex justify-between font-bold text-xl">
                        <span>최종 결제 금액</span>
                        <span id="finalPrice">-</span>
                    </div>
                </div>
            </div>

            <!-- 결제 위젯 -->
            <div class="bg-white rounded-lg shadow p-6 mb-6">
                <h2 class="text-xl font-bold mb-4">결제 수단 선택</h2>
                <div id="payment-widget"></div>
            </div>

            <!-- 약관 동의 -->
            <div class="bg-white rounded-lg shadow p-6 mb-6">
                <label class="flex items-start">
                    <input type="checkbox" id="agreeTerms" class="mt-1 mr-3">
                    <span class="text-sm text-gray-700">
                        <a href="/terms" target="_blank" class="text-indigo-600 hover:underline">이용약관</a>,
                        <a href="/privacy" target="_blank" class="text-indigo-600 hover:underline">개인정보처리방침</a>,
                        <a href="/refund" target="_blank" class="text-indigo-600 hover:underline">환불규정</a>에 모두 동의합니다.
                    </span>
                </label>
            </div>

            <!-- 결제 버튼 -->
            <button 
                id="paymentButton"
                onclick="requestPayment()"
                class="w-full bg-indigo-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                disabled
            >
                <i class="fas fa-lock mr-2"></i>
                결제하기
            </button>
        </div>

        ${sitePaymentFooterHtml()}

        <script>
            const courseId = ${courseId}
            let paymentWidget = null
            let paymentData = null

            // 약관 동의 체크
            document.getElementById('agreeTerms').addEventListener('change', (e) => {
                document.getElementById('paymentButton').disabled = !e.target.checked
            })

            // 페이지 로드 시 실행
            async function init() {
                try {
                    // 로그인 확인 (auth.js의 getCurrentUser)
                    const user = await getCurrentUser()
                    if (!user) {
                        alert('로그인이 필요합니다.')
                        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname)
                        return
                    }

                    // 결제 준비 API 호출
                    const response = await axios.post('/api/payments-v2/prepare', {
                        course_id: courseId
                    })

                    paymentData = response.data.data

                    // 과정 정보 표시
                    document.getElementById('courseInfo').innerHTML = \`
                        <h3 class="text-xl font-bold mb-2">\${paymentData.orderName}</h3>
                        <p class="text-gray-600">주문번호: \${paymentData.orderId}</p>
                    \`

                    // 금액 정보 표시
                    document.getElementById('originalPrice').textContent = 
                        paymentData.amount.toLocaleString() + '원'
                    document.getElementById('finalPrice').textContent = 
                        paymentData.amount.toLocaleString() + '원'

                    // 토스페이먼츠 위젯 초기화
                    const clientKey = 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq'
                    const customerKey = 'USER_' + user.id
                    
                    paymentWidget = PaymentWidget(clientKey, customerKey)
                    
                    // 결제 UI 렌더링
                    await paymentWidget.renderPaymentMethods(
                        '#payment-widget',
                        { value: paymentData.amount }
                    )

                } catch (error) {
                    console.error('초기화 실패:', error)
                    showToast(error.response?.data?.message || '결제 준비에 실패했습니다.', 'error')
                }
            }

            // 결제 요청
            async function requestPayment() {
                if (!paymentData) return

                const agreeTerms = document.getElementById('agreeTerms').checked
                if (!agreeTerms) {
                    alert('약관에 동의해주세요.')
                    return
                }

                try {
                    showLoading()

                    await paymentWidget.requestPayment({
                        orderId: paymentData.orderId,
                        orderName: paymentData.orderName,
                        customerEmail: paymentData.customerEmail,
                        customerName: paymentData.customerName,
                        successUrl: paymentData.successUrl,
                        failUrl: paymentData.failUrl,
                    })
                } catch (error) {
                    hideLoading()
                    console.error('결제 요청 실패:', error)
                    showToast('결제 요청에 실패했습니다.', 'error')
                }
            }

            // 페이지 로드
            init()
        </script>
        <script src="/static/js/security.js"></script>
    </body>
    </html>
  `)
})

/**
 * 결제 성공 페이지
 * GET /success
 */
app.get('/success', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>결제 성공 - 마인드스토리</title>
        <link rel="stylesheet" href="/static/css/app.css" />
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/js/utils.js"></script>
    </head>
    <body class="bg-gray-50">
        <div class="max-w-2xl mx-auto px-4 py-16">
            <div class="bg-white rounded-lg shadow-lg p-8 text-center">
                <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <i class="fas fa-check text-4xl text-green-600"></i>
                </div>
                
                <h1 class="text-3xl font-bold mb-4">결제가 완료되었습니다!</h1>
                <p class="text-gray-600 mb-8">결제 승인 처리 중입니다. 잠시만 기다려주세요...</p>
                
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-8"></div>
            </div>
        </div>

        ${sitePaymentFooterHtml()}

        <script>
            async function confirmPayment() {
                const urlParams = new URLSearchParams(window.location.search)
                const paymentKey = urlParams.get('paymentKey')
                const orderId = urlParams.get('orderId')
                const amount = parseInt(urlParams.get('amount'))

                if (!paymentKey || !orderId || !amount) {
                    alert('결제 정보가 올바르지 않습니다.')
                    window.location.href = '/'
                    return
                }

                try {
                    // 결제 승인 API 호출
                    const response = await axios.post('/api/payments-v2/confirm', {
                        paymentKey,
                        orderId,
                        amount
                    })

                    // 성공 페이지로 이동
                    setTimeout(() => {
                        alert('결제가 완료되었습니다! 내 강의실에서 학습을 시작하세요.')
                        window.location.href = '/my-courses'
                    }, 1000)

                } catch (error) {
                    console.error('결제 승인 실패:', error)
                    alert(error.response?.data?.message || '결제 승인에 실패했습니다.')
                    window.location.href = '/'
                }
            }

            // 페이지 로드 시 실행
            confirmPayment()
        </script>
        <script src="/static/js/security.js"></script>
    </body>
    </html>
  `)
})

/**
 * 결제 실패 페이지
 * GET /payment/fail
 */
app.get('/payment/fail', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>결제 실패 - 마인드스토리</title>
        <link rel="stylesheet" href="/static/css/app.css" />
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div class="max-w-2xl mx-auto px-4 py-16">
            <div class="bg-white rounded-lg shadow-lg p-8 text-center">
                <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <i class="fas fa-times text-4xl text-red-600"></i>
                </div>
                
                <h1 class="text-3xl font-bold mb-4">결제에 실패했습니다</h1>
                <p class="text-gray-600 mb-4" id="errorMessage">결제 처리 중 오류가 발생했습니다.</p>
                <p class="text-sm text-gray-500 mb-8">다시 시도해주시거나 고객센터로 문의해주세요.</p>
                
                <div class="flex gap-4 justify-center">
                    <a href="/" class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                        홈으로
                    </a>
                    <a href="javascript:history.back()" class="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                        다시 시도
                    </a>
                </div>
            </div>
        </div>

        ${sitePaymentFooterHtml()}

        <script>
            // URL 파라미터에서 에러 메시지 가져오기
            const urlParams = new URLSearchParams(window.location.search)
            const errorCode = urlParams.get('code')
            const errorMessage = urlParams.get('message')

            if (errorMessage) {
                document.getElementById('errorMessage').textContent = decodeURIComponent(errorMessage)
            }
        </script>
        <script src="/static/js/security.js"></script>
    </body>
    </html>
  `)
})

export default app
