/**
 * 결제 관련 페이지
 * - 결제 페이지
 * - 결제 성공
 * - 결제 실패
 */

import { Hono } from 'hono'
import { sitePaymentFooterHtml } from '../utils/site-footer-legal'
import {
  siteAiChatWidgetMarkup,
  siteAiChatWidgetScript,
  siteAiChatWidgetStyles,
} from '../utils/site-ai-chat-widget'
import {
  siteFloatingQuickMenuMarkup,
  siteFloatingQuickMenuScript,
  siteFloatingQuickMenuStyles,
} from '../utils/site-floating-quick-menu'
import { STATIC_JS_CACHE_QUERY } from '../utils/static-js-cache-bust'

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
        <script src="https://cdn.iamport.kr/js/iamport.payment-1.2.0.js"></script>
        <script src="/static/js/auth.js?v=20260329-admin-name"></script>
        <script src="/static/js/utils.js${STATIC_JS_CACHE_QUERY}"></script>
        ${siteFloatingQuickMenuStyles()}
        ${siteAiChatWidgetStyles()}
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

            <div class="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-6 text-sm text-indigo-900">
                포트원(PortOne) 결제창으로 결제가 진행됩니다. 결제하기 버튼을 누르면 PG 결제 팝업이 열립니다.
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

        <div id="payCheckoutOverlay" class="hidden fixed inset-0 z-[200] flex items-center justify-center bg-black/40" aria-hidden="true">
            <div class="bg-white rounded-xl p-8 shadow-xl flex flex-col items-center max-w-sm mx-4">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <p class="mt-4 text-gray-700 text-center font-medium">결제창을 여는 중...</p>
            </div>
        </div>

        ${sitePaymentFooterHtml()}
        ${siteFloatingQuickMenuMarkup()}
        ${siteAiChatWidgetMarkup()}
        <script>${siteFloatingQuickMenuScript()}${siteAiChatWidgetScript()}</script>

        <script>
            ;(function (w) {
                if (typeof w.hideLoading !== 'function') {
                    w.hideLoading = function (containerId) {
                        var id = containerId || 'loadingSpinner'
                        var el = document.getElementById(id)
                        if (el) el.innerHTML = ''
                    }
                }
                if (typeof w.showLoading !== 'function') {
                    w.showLoading = function (containerId) {
                        var id = containerId || 'loadingSpinner'
                        var el = document.getElementById(id)
                        if (!el) return
                        el.innerHTML = '<div class="flex flex-col items-center justify-center py-12"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div><p class="mt-4 text-gray-600">불러오는 중...</p></div>'
                    }
                }
            })(typeof window !== 'undefined' ? window : globalThis)

            const courseId = ${JSON.stringify(courseId)}
            let paymentData = null
            let portoneConfig = null
            let courseSnapshot = null

            function friendlyClientMessage(err) {
                var d = err && err.response && err.response.data
                var raw = (d && (d.error || d.message)) || (err && err.message) || ''
                var s = String(raw)
                if (!s || /PORTONE_|IMP_|SECRET|D1|SQLite|undefined|stack|TypeError/i.test(s)) {
                    return '결제 모듈을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
                }
                if (s.length > 160) {
                    return '결제 모듈을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
                }
                return s
            }

            function setPayCheckoutOverlay(on) {
                var el = document.getElementById('payCheckoutOverlay')
                if (!el) return
                if (on) {
                    el.classList.remove('hidden')
                    el.setAttribute('aria-hidden', 'false')
                } else {
                    el.classList.add('hidden')
                    el.setAttribute('aria-hidden', 'true')
                }
            }

            function axiosErrorDetail(error) {
                var ax = error && typeof error === 'object' && error.response ? error.response : null
                var d = ax && ax.data
                var msg = (d && (d.message || d.error)) || (error instanceof Error ? error.message : '요청에 실패했습니다.')
                var detail = d && d.detail ? String(d.detail) : ''
                return { msg: String(msg), detail: detail }
            }

            function escHtml(s) {
                return String(s == null ? '' : s)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/"/g, '&quot;')
            }

            function payAmountFromCourse(course) {
                var p = Number(course && course.price)
                var base = Number.isFinite(p) ? p : 0
                var dr = course && course.discount_price
                var d = dr != null && dr !== '' ? Number(dr) : NaN
                return Number.isFinite(d) && d > 0 ? d : base
            }

            function renderCoursePricing(course) {
                var listPrice = Number(course && course.price)
                if (!Number.isFinite(listPrice)) listPrice = 0
                var pay = payAmountFromCourse(course)
                document.getElementById('originalPrice').textContent = listPrice.toLocaleString() + '원'
                var discRow = document.getElementById('discountRow')
                var discAmt = document.getElementById('discountAmount')
                if (pay > 0 && listPrice > pay) {
                    discRow.style.display = 'flex'
                    discAmt.textContent = '-' + (listPrice - pay).toLocaleString() + '원'
                } else {
                    discRow.style.display = 'none'
                }
                document.getElementById('finalPrice').textContent = pay.toLocaleString() + '원'
            }

            async function loadCourseForCheckout() {
                var id = String(courseId).trim()
                var res = await axios.get('/api/courses/' + encodeURIComponent(id), { withCredentials: true })
                if (!res.data || !res.data.success || !res.data.data || !res.data.data.course) {
                    var er = (res.data && res.data.error) || '강좌 정보를 불러올 수 없습니다.'
                    throw new Error(er)
                }
                var course = res.data.data.course
                courseSnapshot = course
                var rawDesc = course.description || ''
                var desc = escHtml(rawDesc).slice(0, 200)
                document.getElementById('courseInfo').innerHTML =
                    '<h3 class="text-xl font-bold mb-2">' + escHtml(course.title || '강좌') + '</h3>' +
                    (desc ? '<p class="text-gray-600 text-sm">' + desc + (rawDesc.length > 200 ? '…' : '') + '</p>' : '')
                renderCoursePricing(course)
                var pay = payAmountFromCourse(course)
                if (pay <= 0) {
                    document.getElementById('courseInfo').innerHTML +=
                        '<p class="mt-4 text-amber-800 text-sm font-medium">이 강좌는 무료로 제공됩니다. 결제 없이 수강신청·학습 화면으로 이동해 주세요.</p>'
                    document.getElementById('paymentButton').disabled = true
                    throw new Error('FREE_COURSE')
                }
                return course
            }

            // 약관 동의 체크
            document.getElementById('agreeTerms').addEventListener('change', (e) => {
                document.getElementById('paymentButton').disabled = !e.target.checked || !paymentData
            })

            // 페이지 로드 시 실행
            async function init() {
                try {
                    var user = await getCurrentUser()
                    if (!user) {
                        alert('로그인이 필요합니다.')
                        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname)
                        return
                    }

                    try {
                        await loadCourseForCheckout()
                    } catch (e) {
                        if (e && e.message === 'FREE_COURSE') {
                            return
                        }
                        console.error('강좌 로드 실패:', e)
                        var ed = axiosErrorDetail(e)
                        document.getElementById('courseInfo').innerHTML =
                            '<div class="text-red-600"><p class="font-semibold">강좌 정보를 불러오지 못했습니다.</p>' +
                            '<p class="text-sm mt-2">' + (ed.detail ? (ed.msg + ' — ' + ed.detail.slice(0, 400)) : ed.msg) + '</p>' +
                            '<a href="/enrollment" class="inline-block mt-4 text-indigo-600 underline">수강신청 목록으로</a></div>'
                        showToast(ed.msg, 'error')
                        return
                    }

                    var cfgRes = await axios.get('/api/portone/public-config', { withCredentials: true })
                    if (!cfgRes.data?.success || !cfgRes.data?.data?.impCode) {
                        throw new Error(cfgRes.data?.error || '결제 설정이 완료되지 않았습니다.')
                    }
                    portoneConfig = cfgRes.data.data

                    var prepRes = await axios.post('/api/portone/prepare', {
                        course_id: Number(courseId)
                    }, { withCredentials: true })
                    if (!prepRes.data?.success || !prepRes.data?.data) {
                        throw new Error(prepRes.data?.error || '주문 준비에 실패했습니다.')
                    }
                    paymentData = prepRes.data.data

                    var orderLine = '<p class="text-gray-600 mt-2">주문번호: <span class="font-mono">' + (paymentData.merchant_uid || '—') + '</span></p>'
                    var box = document.getElementById('courseInfo')
                    box.insertAdjacentHTML('beforeend', orderLine)

                    var amt = Number(paymentData.amount)
                    if (Number.isFinite(amt)) {
                        document.getElementById('originalPrice').textContent = amt.toLocaleString() + '원'
                        document.getElementById('discountRow').style.display = 'none'
                        document.getElementById('finalPrice').textContent = amt.toLocaleString() + '원'
                    }

                    document.getElementById('paymentButton').disabled = !document.getElementById('agreeTerms').checked

                    if (typeof IMP === 'undefined') {
                        throw new Error('결제 모듈을 불러오지 못했습니다.')
                    }
                } catch (error) {
                    console.error('초기화 실패:', error)
                    var ex = axiosErrorDetail(error)
                    showToast(ex.detail ? (ex.msg + ' — ' + ex.detail.slice(0, 280)) : ex.msg, 'error')
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
                    setPayCheckoutOverlay(true)

                    if (!portoneConfig?.impCode) {
                        throw new Error('결제 설정이 없습니다.')
                    }

                    IMP.init(portoneConfig.impCode)
                    IMP.request_pay({
                        pg: portoneConfig.pg || 'html5_inicis',
                        pay_method: 'card',
                        merchant_uid: paymentData.merchant_uid,
                        name: paymentData.orderName,
                        amount: paymentData.amount,
                        buyer_email: paymentData.buyerEmail,
                        buyer_name: paymentData.buyerName,
                    }, async function (rsp) {
                        setPayCheckoutOverlay(false)
                        if (!rsp || !rsp.success) {
                            var failMsg = (rsp && rsp.error_msg) || '결제가 취소되었습니다.'
                            if (/PG|pg|설정 정보|등록된/i.test(failMsg)) {
                                failMsg += '\\n\\n포트원 관리자 콘솔(https://admin.portone.io)에서 해당 가맹점에 PG사(이니시스 등) 연동·채널이 등록되어 있는지 확인해 주세요. Workers 환경 변수 PORTONE_PG 값도 PG사 안내에 맞는지 점검해 주세요.'
                            }
                            alert(failMsg)
                            return
                        }
                        try {
                            const doneRes = await axios.post('/api/portone/complete', {
                                imp_uid: rsp.imp_uid,
                                merchant_uid: rsp.merchant_uid
                            }, {
                                withCredentials: true
                            })
                            if (doneRes.data?.success) {
                                alert('결제가 완료되었습니다.')
                                window.location.href = '/my-courses'
                            } else {
                                alert(friendlyClientMessage({ message: doneRes.data?.error }))
                            }
                        } catch (err) {
                            console.error('결제 검증 실패:', err)
                            alert(friendlyClientMessage(err))
                        }
                    })
                } catch (error) {
                    setPayCheckoutOverlay(false)
                    console.error('결제 요청 실패:', error)
                    showToast(friendlyClientMessage(error), 'error')
                }
            }

            // 페이지 로드
            init()
        </script>
        <script src="/static/js/security.js${STATIC_JS_CACHE_QUERY}"></script>
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
        <script src="/static/js/utils.js${STATIC_JS_CACHE_QUERY}"></script>
        ${siteFloatingQuickMenuStyles()}
        ${siteAiChatWidgetStyles()}
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
        ${siteFloatingQuickMenuMarkup()}
        ${siteAiChatWidgetMarkup()}
        <script>${siteFloatingQuickMenuScript()}${siteAiChatWidgetScript()}</script>

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
        <script src="/static/js/security.js${STATIC_JS_CACHE_QUERY}"></script>
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
        ${siteFloatingQuickMenuStyles()}
        ${siteAiChatWidgetStyles()}
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
        ${siteFloatingQuickMenuMarkup()}
        ${siteAiChatWidgetMarkup()}
        <script>${siteFloatingQuickMenuScript()}${siteAiChatWidgetScript()}</script>

        <script>
            // URL 파라미터에서 에러 메시지 가져오기
            const urlParams = new URLSearchParams(window.location.search)
            const errorCode = urlParams.get('code')
            const errorMessage = urlParams.get('message')

            if (errorMessage) {
                document.getElementById('errorMessage').textContent = decodeURIComponent(errorMessage)
            }
        </script>
        <script src="/static/js/security.js${STATIC_JS_CACHE_QUERY}"></script>
    </body>
    </html>
  `)
})

export default app
