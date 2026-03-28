/**
 * 유료 전환 팝업 (Payment Required Modal)
 * 무료 체험 후 결제 유도
 */

// 전역 변수
let currentCourseId = null;
let currentCourseTitle = '';
let currentCoursePrice = 0;
/** 'payment_required' | 'trial_complete' | 'free_course_complete' */
let currentModalContext = 'payment_required';

/**
 * 유료 전환·회기 안내 팝업 표시
 * @param {Object} options - { courseId, courseTitle, coursePrice, lessonNumber, lessonTitle, context?, totalLessons? }
 */
function showPaymentRequiredModal(options) {
  const {
    courseId,
    courseTitle,
    coursePrice = 0,
    lessonNumber = 2,
    lessonTitle = '',
    context = 'payment_required',
    totalLessons = 0
  } = options;

  currentCourseId = courseId;
  currentCourseTitle = courseTitle;
  currentCoursePrice = coursePrice;
  currentModalContext = context;

  let modalHTML;

  if (context === 'trial_complete') {
    modalHTML = `
    <div id="paymentRequiredModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
      <div class="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 animate-slide-up">
        <div class="p-6 border-b bg-gradient-to-r from-emerald-500 to-teal-600 rounded-t-lg">
          <div class="flex items-center justify-center mb-2">
            <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center">
              <i class="fas fa-flag-checkered text-3xl text-emerald-600"></i>
            </div>
          </div>
          <h3 class="text-xl font-bold text-white text-center leading-snug">
            첫 회기(0회기 무료 체험)를 완료했습니다
          </h3>
        </div>
        <div class="p-6">
          <div class="mb-4 text-center">
            <p class="text-gray-700 mb-2"><strong class="text-emerald-700">"${courseTitle}"</strong></p>
            <p class="text-sm text-gray-600 mb-3">
              다음 회기부터는 <strong>정식 수강신청·결제</strong> 후 <strong>${lessonNumber}강부터 전체 차시</strong>를 이어서 수강할 수 있습니다.
            </p>
            <div class="inline-block px-4 py-2 bg-emerald-50 rounded-lg">
              <span class="text-2xl font-bold text-emerald-700">${Number(coursePrice).toLocaleString()}원</span>
            </div>
          </div>
          <div class="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
            <p class="flex items-start gap-2">
              <i class="fas fa-info-circle text-emerald-600 mt-0.5"></i>
              <span>수강신청 페이지에서 동일 강좌를 선택한 뒤 결제를 진행해 주세요.</span>
            </p>
          </div>
        </div>
        <div class="p-6 border-t bg-gray-50 rounded-b-lg">
          <div class="flex space-x-3">
            <button type="button" onclick="closePaymentRequiredModal()" class="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition">
              <i class="fas fa-times mr-2"></i>나중에
            </button>
            <button type="button" onclick="proceedToPayment()" class="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition shadow-lg">
              <i class="fas fa-user-check mr-2"></i>수강신청·결제
            </button>
          </div>
        </div>
      </div>
    </div>`;
  } else if (context === 'free_course_complete') {
    modalHTML = `
    <div id="paymentRequiredModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
      <div class="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 animate-slide-up">
        <div class="p-6 border-b bg-gradient-to-r from-sky-500 to-indigo-600 rounded-t-lg">
          <div class="flex items-center justify-center mb-2">
            <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center">
              <i class="fas fa-trophy text-3xl text-indigo-600"></i>
            </div>
          </div>
          <h3 class="text-xl font-bold text-white text-center leading-snug">
            무료 강좌 전 차시를 완료했습니다
          </h3>
        </div>
        <div class="p-6">
          <p class="text-center text-gray-700 mb-2"><strong class="text-indigo-700">"${courseTitle}"</strong></p>
          <p class="text-sm text-gray-600 text-center mb-4">
            다음 회기·신규 과정은 <strong>수강신청</strong> 페이지에서 안내됩니다. 관심 있는 유료 과정도 함께 둘러보세요.
          </p>
          ${totalLessons ? `<p class="text-xs text-center text-gray-500">완료 차시: ${totalLessons}차시</p>` : ''}
        </div>
        <div class="p-6 border-t bg-gray-50 rounded-b-lg">
          <div class="flex space-x-3">
            <button type="button" onclick="closePaymentRequiredModal()" class="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition">
              닫기
            </button>
            <button type="button" onclick="proceedToEnrollmentPage()" class="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition shadow-lg">
              <i class="fas fa-clipboard-list mr-2"></i>수강신청·과정 보기
            </button>
          </div>
        </div>
      </div>
    </div>`;
  } else {
    modalHTML = `
    <div id="paymentRequiredModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
      <div class="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 animate-slide-up">
        <!-- 헤더 -->
        <div class="p-6 border-b bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-lg">
          <div class="flex items-center justify-center mb-2">
            <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center">
              <i class="fas fa-lock text-3xl text-indigo-600"></i>
            </div>
          </div>
          <h3 class="text-xl font-bold text-white text-center">
            ${lessonNumber}강부터는 결제가 필요합니다
          </h3>
        </div>
        
        <!-- 본문 -->
        <div class="p-6">
          <div class="mb-6 text-center">
            <p class="text-gray-700 mb-2">
              <strong class="text-indigo-600">"${courseTitle}"</strong>
            </p>
            <p class="text-sm text-gray-500 mb-4">
              1강 무료 체험을 완료하셨습니다!
            </p>
            <div class="inline-block px-4 py-2 bg-indigo-50 rounded-lg">
              <span class="text-2xl font-bold text-indigo-600">${Number(coursePrice).toLocaleString()}원</span>
            </div>
          </div>

          <div class="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 class="font-semibold text-gray-800 mb-3">
              <i class="fas fa-check-circle text-green-500 mr-2"></i>
              결제 후 제공되는 혜택
            </h4>
            <ul class="space-y-2 text-sm text-gray-600">
              <li class="flex items-start">
                <i class="fas fa-video text-indigo-500 mr-2 mt-1"></i>
                <span>전 차시 무제한 시청</span>
              </li>
              <li class="flex items-start">
                <i class="fas fa-certificate text-indigo-500 mr-2 mt-1"></i>
                <span>수료증 발급 (조건 충족 시)</span>
              </li>
              <li class="flex items-start">
                <i class="fas fa-clock text-indigo-500 mr-2 mt-1"></i>
                <span>수강 기간 내 자유롭게 학습</span>
              </li>
              <li class="flex items-start">
                <i class="fas fa-headset text-indigo-500 mr-2 mt-1"></i>
                <span>학습 지원 및 Q&A</span>
              </li>
            </ul>
          </div>

          <div class="text-xs text-gray-500 text-center mb-4">
            <i class="fas fa-shield-alt mr-1"></i>
            안전한 결제 시스템 (토스페이먼츠)
          </div>
        </div>

        <!-- 버튼 -->
        <div class="p-6 border-t bg-gray-50 rounded-b-lg">
          <div class="flex space-x-3">
            <button 
              onclick="closePaymentRequiredModal()" 
              class="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
            >
              <i class="fas fa-times mr-2"></i>
              나중에
            </button>
            <button 
              onclick="proceedToPayment()" 
              class="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition shadow-lg"
            >
              <i class="fas fa-credit-card mr-2"></i>
              결제하기
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  }

  // 기존 모달 제거
  const existingModal = document.getElementById('paymentRequiredModal');
  if (existingModal) {
    existingModal.remove();
  }

  // 모달 추가
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // ESC 키로 닫기
  document.addEventListener('keydown', handleEscapeKey);
}

/**
 * 유료 전환 팝업 닫기
 */
function closePaymentRequiredModal() {
  const modal = document.getElementById('paymentRequiredModal');
  if (modal) {
    modal.classList.add('animate-fade-out');
    setTimeout(() => {
      modal.remove();
      document.removeEventListener('keydown', handleEscapeKey);
    }, 200);
  }
}

/**
 * ESC 키 핸들러
 */
function handleEscapeKey(e) {
  if (e.key === 'Escape') {
    closePaymentRequiredModal();
  }
}

/**
 * 결제 페이지로 이동
 */
function proceedToPayment() {
  if (!currentCourseId) {
    alert('강좌 정보를 불러올 수 없습니다.');
    return;
  }

  // 결제 페이지로 이동 (강좌 ID 전달)
  window.location.href = `/payment?courseId=${currentCourseId}`;
}

/**
 * 차시 접근 권한 확인 및 처리
 * @param {number} enrollmentId - 수강 신청 ID
 * @param {number} lessonId - 차시 ID
 * @param {number} courseId - 강좌 ID
 * @returns {Promise<boolean>} - 접근 가능 여부
 */
async function checkLessonAccess(enrollmentId, lessonId, courseId) {
  try {
    const tok = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    const headers = {};
    if (tok) headers['Authorization'] = `Bearer ${tok}`;
    const response = await fetch(
      `/api/enrollments/${enrollmentId}/lessons/${lessonId}/check-access`,
      {
        credentials: 'include',
        headers
      }
    );

    const data = await response.json();

    if (data.hasAccess) {
      // 접근 가능
      if (data.isTrial) {
        // 무료 체험 중 알림
        showTrialNotification(data.courseTitle);
      }
      return true;
    } else {
      // 접근 불가 - 결제 필요
      if (data.requirePayment) {
        showPaymentRequiredModal({
          courseId: courseId,
          courseTitle: data.courseTitle,
          coursePrice: data.coursePrice,
          lessonNumber: data.lessonNumber,
          lessonTitle: data.lessonTitle
        });
      } else {
        alert(data.message || '접근 권한이 없습니다.');
      }
      return false;
    }
  } catch (error) {
    console.error('Check lesson access error:', error);
    alert('접근 권한 확인 중 오류가 발생했습니다.');
    return false;
  }
}

/**
 * 무료 체험 중 알림 표시
 */
function showTrialNotification(courseTitle) {
  const notification = document.createElement('div');
  notification.className = 'fixed bottom-4 right-4 bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg z-40 animate-fade-in';
  notification.innerHTML = `
    <div class="flex items-center">
      <i class="fas fa-gift mr-2"></i>
      <span class="text-sm">
        <strong>${courseTitle}</strong> 무료 체험 중 (1강)
      </span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('animate-fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// 애니메이션 CSS 추가 (동적으로 스타일 태그 추가)
if (!document.getElementById('payment-modal-styles')) {
  const style = document.createElement('style');
  style.id = 'payment-modal-styles';
  style.textContent = `
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes fade-out {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    @keyframes slide-up {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .animate-fade-in {
      animation: fade-in 0.2s ease-out;
    }
    .animate-fade-out {
      animation: fade-out 0.2s ease-out;
    }
    .animate-slide-up {
      animation: slide-up 0.3s ease-out;
    }
  `;
  document.head.appendChild(style);
}
