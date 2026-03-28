/**
 * 🌟 수강평/별점 UI 컴포넌트 (course-reviews.js)
 * 
 * 목적: 강좌 상세 페이지에서 수강평 표시 및 작성
 * 
 * 기능:
 * - 수강평 목록 표시
 * - 별점 통계 (평균, 분포)
 * - 수강평 작성 폼
 * - 수강평 수정/삭제
 * - 페이지네이션
 */

class CourseReviews {
  constructor(courseId) {
    this.courseId = courseId;
    this.currentPage = 1;
    this.limit = 10;
    this.sortBy = 'recent';
    this.isEnrolled = false;
    this.myReview = null;
    this.currentUser = null;
    this.init();
  }

  async init() {
    await this.loadCurrentUser();
    await this.checkEnrollment();
    await this.loadReviews();
    this.attachEventListeners();
  }

  async loadCurrentUser() {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      if (!response.ok) return;
      const result = await response.json();
      if (result && result.success && result.data) {
        this.currentUser = result.data;
      }
    } catch {
      // ignore
    }
  }

  /**
   * 수강 여부 확인
   */
  async checkEnrollment() {
    try {
      const user = typeof AuthManager !== 'undefined' && AuthManager.getUser && AuthManager.getUser();
      if (user && user.role === 'admin') {
        this.isEnrolled = true;
        return;
      }
      const response = await fetch('/api/my/enrollments', {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.enrollments) {
          this.isEnrolled = result.data.enrollments.some(
            e => e.course_id == this.courseId
          );
        }
      }
    } catch (error) {
      console.error('수강 여부 확인 실패:', error);
    }
  }

  /**
   * 수강평 목록 로드
   */
  async loadReviews() {
    try {
      showLoading('리뷰를 불러오는 중...');

      const response = await fetch(
        `/api/courses/${this.courseId}/reviews?page=${this.currentPage}&limit=${this.limit}&sort=${this.sortBy}`
      );

      if (!response.ok) {
        throw new Error('수강평 로드 실패');
      }

      const result = await response.json();
      
      if (result.success) {
        this.renderReviews(result.data);
      } else {
        throw new Error(result.error || '수강평 로드 실패');
      }

    } catch (error) {
      console.error('수강평 로드 에러:', error);
      showError('수강평을 불러오는데 실패했습니다.');
    } finally {
      hideLoading();
    }
  }

  /**
   * 수강평 렌더링
   */
  renderReviews(data) {
    const container = document.getElementById('course-reviews-container');
    if (!container) return;

    const { reviews, summary, pagination } = data;

    // 통계 섹션
    const statsHtml = this.renderStats(summary);

    // 작성 폼 (수강 중인 경우만)
    const formHtml = this.isEnrolled ? this.renderReviewForm() : '';

    // 정렬 옵션
    const sortHtml = `
      <div class="mb-4 flex justify-between items-center">
        <h3 class="text-lg font-semibold">수강평 (${summary.total}개)</h3>
        <select id="review-sort" class="px-3 py-2 border rounded-lg">
          <option value="recent" ${this.sortBy === 'recent' ? 'selected' : ''}>최신순</option>
          <option value="rating_high" ${this.sortBy === 'rating_high' ? 'selected' : ''}>별점 높은순</option>
          <option value="rating_low" ${this.sortBy === 'rating_low' ? 'selected' : ''}>별점 낮은순</option>
        </select>
      </div>
    `;

    // 리뷰 목록
    const reviewsHtml = reviews.map(review => this.renderReviewItem(review)).join('');

    // 페이지네이션
    const paginationHtml = this.renderPagination(pagination);

    container.innerHTML = `
      ${statsHtml}
      ${formHtml}
      ${sortHtml}
      <div class="space-y-4">
        ${reviewsHtml || '<p class="text-gray-500 text-center py-8">아직 수강평이 없습니다.</p>'}
      </div>
      ${paginationHtml}
    `;
  }

  /**
   * 통계 렌더링
   */
  renderStats(summary) {
    const { average, total, distribution } = summary;

    const distributionBars = [5, 4, 3, 2, 1].map(rating => {
      const count = distribution[rating] || 0;
      const percentage = total > 0 ? (count / total) * 100 : 0;

      return `
        <div class="flex items-center space-x-2 text-sm">
          <span class="w-12">${rating}점</span>
          <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div class="h-full bg-yellow-400" style="width: ${percentage}%"></div>
          </div>
          <span class="w-12 text-right text-gray-600">${count}개</span>
        </div>
      `;
    }).join('');

    return `
      <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <div class="grid md:grid-cols-2 gap-6">
          <div class="text-center">
            <div class="text-5xl font-bold text-yellow-500 mb-2">
              ${average.toFixed(1)}
            </div>
            <div class="flex justify-center mb-2">
              ${this.renderStars(average)}
            </div>
            <div class="text-gray-600">${total}개의 평가</div>
          </div>
          <div class="space-y-2">
            ${distributionBars}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 별점 렌더링
   */
  renderStars(rating, size = 'text-2xl') {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    let html = '';
    for (let i = 0; i < fullStars; i++) {
      html += `<i class="fas fa-star text-yellow-400 ${size}"></i>`;
    }
    if (hasHalfStar) {
      html += `<i class="fas fa-star-half-alt text-yellow-400 ${size}"></i>`;
    }
    for (let i = 0; i < emptyStars; i++) {
      html += `<i class="far fa-star text-yellow-400 ${size}"></i>`;
    }
    return html;
  }

  /**
   * 수강평 작성 폼
   */
  renderReviewForm() {
    return `
      <div class="bg-blue-50 rounded-lg p-6 mb-6">
        <h3 class="text-lg font-semibold mb-4">수강평 작성하기</h3>
        <form id="review-form">
          <div class="mb-4">
            <label class="block text-sm font-medium mb-2">별점</label>
            <div class="flex space-x-2" id="rating-stars">
              ${[1, 2, 3, 4, 5].map(n => `
                <i class="far fa-star text-4xl text-gray-300 cursor-pointer hover:text-yellow-400 transition" 
                   data-rating="${n}"></i>
              `).join('')}
            </div>
            <input type="hidden" id="review-rating" name="rating" required>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium mb-2">수강평 (최소 10자)</label>
            <textarea 
              id="review-comment" 
              name="comment" 
              rows="4" 
              class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="강좌에 대한 솔직한 평가를 남겨주세요..."
              required
              minlength="10"
            ></textarea>
          </div>
          <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
            수강평 등록
          </button>
        </form>
      </div>
    `;
  }

  /**
   * 수강평 아이템 렌더링
   */
  renderReviewItem(review) {
    const isMyReview = !!(this.currentUser && (review.user_id == this.currentUser.id));

    return `
      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex items-start justify-between mb-2">
          <div>
            <div class="flex items-center space-x-2 mb-1">
              <span class="font-semibold">${review.user_name}</span>
              <div class="flex">
                ${this.renderStars(review.rating, 'text-sm')}
              </div>
            </div>
            <p class="text-sm text-gray-500">
              ${new Date(review.created_at).toLocaleDateString('ko-KR')}
            </p>
          </div>
          ${isMyReview ? `
            <div class="flex space-x-2">
              <button class="text-blue-600 text-sm hover:underline" data-action="edit" data-id="${review.id}">
                수정
              </button>
              <button class="text-red-600 text-sm hover:underline" data-action="delete" data-id="${review.id}">
                삭제
              </button>
            </div>
          ` : ''}
        </div>
        <p class="text-gray-700">${review.comment}</p>
      </div>
    `;
  }

  /**
   * 페이지네이션 렌더링
   */
  renderPagination(pagination) {
    if (pagination.totalPages <= 1) return '';

    const { page, totalPages } = pagination;
    let html = '<div class="flex justify-center space-x-2 mt-6">';

    // 이전 버튼
    if (page > 1) {
      html += `
        <button class="px-4 py-2 border rounded hover:bg-gray-100" data-page="${page - 1}">
          이전
        </button>
      `;
    }

    // 페이지 번호
    for (let i = 1; i <= totalPages; i++) {
      if (i === page) {
        html += `
          <button class="px-4 py-2 bg-blue-600 text-white rounded">
            ${i}
          </button>
        `;
      } else if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
        html += `
          <button class="px-4 py-2 border rounded hover:bg-gray-100" data-page="${i}">
            ${i}
          </button>
        `;
      } else if (i === page - 3 || i === page + 3) {
        html += `<span class="px-2 py-2">...</span>`;
      }
    }

    // 다음 버튼
    if (page < totalPages) {
      html += `
        <button class="px-4 py-2 border rounded hover:bg-gray-100" data-page="${page + 1}">
          다음
        </button>
      `;
    }

    html += '</div>';
    return html;
  }

  /**
   * 이벤트 리스너 등록
   */
  attachEventListeners() {
    // 별점 선택
    document.addEventListener('click', (e) => {
      const star = e.target.closest('[data-rating]');
      if (star && star.closest('#rating-stars')) {
        const rating = parseInt(star.dataset.rating);
        this.selectRating(rating);
      }
    });

    // 수강평 작성 폼 제출
    document.addEventListener('submit', (e) => {
      if (e.target.id === 'review-form') {
        e.preventDefault();
        this.submitReview();
      }
    });

    // 정렬 변경
    document.addEventListener('change', (e) => {
      if (e.target.id === 'review-sort') {
        this.sortBy = e.target.value;
        this.currentPage = 1;
        this.loadReviews();
      }
    });

    // 페이지네이션
    document.addEventListener('click', (e) => {
      const pageBtn = e.target.closest('[data-page]');
      if (pageBtn) {
        this.currentPage = parseInt(pageBtn.dataset.page);
        this.loadReviews();
      }
    });
  }

  /**
   * 별점 선택
   */
  selectRating(rating) {
    document.getElementById('review-rating').value = rating;
    
    const stars = document.querySelectorAll('#rating-stars i');
    stars.forEach((star, index) => {
      if (index < rating) {
        star.classList.remove('far');
        star.classList.add('fas', 'text-yellow-400');
      } else {
        star.classList.remove('fas', 'text-yellow-400');
        star.classList.add('far', 'text-gray-300');
      }
    });
  }

  /**
   * 수강평 제출
   */
  async submitReview() {
    try {
      const rating = document.getElementById('review-rating').value;
      const comment = document.getElementById('review-comment').value;

      if (!rating) {
        showError('별점을 선택해주세요.');
        return;
      }

      if (comment.length < 10) {
        showError('수강평은 최소 10자 이상 작성해주세요.');
        return;
      }

      showLoading('수강평 등록 중...');

      const response = await fetch(`/api/courses/${this.courseId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rating: parseInt(rating), comment })
      });

      const result = await response.json();

      if (result.success) {
        showSuccess('수강평이 등록되었습니다!');
        this.loadReviews();
        document.getElementById('review-form').reset();
        this.selectRating(0);
      } else {
        throw new Error(result.error || '수강평 등록 실패');
      }

    } catch (error) {
      console.error('수강평 제출 에러:', error);
      showError(error.message);
    } finally {
      hideLoading();
    }
  }
}

// 전역 함수로 노출
window.CourseReviews = CourseReviews;
