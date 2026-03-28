/**
 * 🎓 수료증 UI (certificate.js)
 * 
 * 목적: 수료증 발급 및 다운로드
 * 
 * 기능:
 * - 수료증 발급 가능 여부 확인
 * - 수료증 발급
 * - 수료증 미리보기 (HTML)
 * - PDF 다운로드 (브라우저 인쇄 기능 사용)
 */

class CertificateManager {
  constructor(courseId) {
    this.courseId = courseId;
    this.certificate = null;
  }

  /**
   * 수료증 발급 가능 여부 확인
   */
  async checkEligibility() {
    try {
      const response = await fetch(
        `/api/courses/${this.courseId}/certificate/eligible`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          return null;
        }
        throw new Error('수료 조건 확인 실패');
      }

      const result = await response.json();
      return result.success ? result.data : null;

    } catch (error) {
      console.error('수료 조건 확인 에러:', error);
      return null;
    }
  }

  /**
   * 수료증 발급
   */
  async issueCertificate() {
    try {
      showLoading('수료증 발급 중...');

      const response = await fetch(
        `/api/courses/${this.courseId}/certificate`,
        {
          method: 'POST',
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || '수료증 발급 실패');
      }

      const result = await response.json();
      
      if (result.success) {
        this.certificate = result.data.certificate;
        showSuccess(result.message || '수료증이 발급되었습니다!');
        return this.certificate;
      } else {
        throw new Error(result.error || '수료증 발급 실패');
      }

    } catch (error) {
      console.error('수료증 발급 에러:', error);
      showError(error.message);
      return null;
    } finally {
      hideLoading();
    }
  }

  /**
   * 수료증 HTML 생성
   */
  generateCertificateHTML(certificate) {
    const issueDate = new Date(certificate.issue_date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
      <div id="certificate-print-area" class="certificate-container" style="
        width: 210mm;
        height: 297mm;
        margin: 0 auto;
        padding: 40mm;
        background: white;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        position: relative;
        font-family: 'Noto Serif KR', serif;
      ">
        <!-- 상단 장식 -->
        <div style="text-align: center; margin-bottom: 50px;">
          <div style="
            display: inline-block;
            padding: 20px 60px;
            border: 3px solid #1a73e8;
            border-radius: 10px;
          ">
            <h1 style="font-size: 48px; color: #1a73e8; margin: 0; letter-spacing: 10px;">
              수료증
            </h1>
            <p style="font-size: 20px; color: #666; margin-top: 10px; letter-spacing: 3px;">
              Certificate of Completion
            </p>
          </div>
        </div>

        <!-- 인증 번호 -->
        <div style="text-align: center; margin-bottom: 40px;">
          <p style="color: #999; font-size: 14px; letter-spacing: 2px;">
            인증번호: ${certificate.certificate_number}
          </p>
        </div>

        <!-- 수료자 정보 -->
        <div style="text-align: center; margin-bottom: 50px;">
          <p style="font-size: 20px; color: #333; margin-bottom: 30px;">
            위 사람은
          </p>
          <p style="
            font-size: 42px;
            font-weight: bold;
            color: #000;
            margin: 30px 0;
            border-bottom: 3px solid #000;
            padding-bottom: 15px;
            display: inline-block;
            min-width: 300px;
          ">
            ${certificate.user_name}
          </p>
          <p style="font-size: 20px; color: #333; margin-top: 30px;">
            님께서
          </p>
        </div>

        <!-- 강좌 정보 -->
        <div style="text-align: center; margin-bottom: 50px;">
          <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
            아래 강좌를
          </p>
          <div style="
            background: #f8f9fa;
            padding: 25px;
            border-radius: 10px;
            border-left: 5px solid #1a73e8;
            margin: 20px 0;
          ">
            <p style="font-size: 28px; font-weight: bold; color: #1a73e8; margin: 0;">
              ${certificate.course_title}
            </p>
          </div>
          <p style="font-size: 18px; color: #333; margin-top: 20px;">
            성실히 수료하였기에
          </p>
          <p style="font-size: 20px; color: #333; margin-top: 10px; font-weight: bold;">
            이 증서를 수여합니다
          </p>
        </div>

        <!-- 발급 정보 -->
        <div style="text-align: center; margin-top: 80px; margin-bottom: 50px;">
          <p style="font-size: 24px; color: #333; margin-bottom: 20px;">
            ${issueDate}
          </p>
          <div style="margin-top: 50px;">
            <p style="font-size: 18px; color: #666; margin-bottom: 10px;">
              ${certificate.issued_by}
            </p>
            <p style="font-size: 28px; font-weight: bold; color: #000;">
              원장
              ${certificate.issuer_name || '(인)'}
            </p>
          </div>
        </div>

        <!-- 하단 장식 -->
        <div style="
          position: absolute;
          bottom: 20mm;
          left: 40mm;
          right: 40mm;
          text-align: center;
          padding-top: 20px;
          border-top: 2px solid #e0e0e0;
        ">
          <p style="font-size: 12px; color: #999;">
            이 수료증은 Mindstory LMS에서 발급한 공식 수료증입니다.
          </p>
          <p style="font-size: 11px; color: #bbb; margin-top: 5px;">
            수료증 진위 확인: ${window.location.origin}/certificates/${certificate.certificate_number}
          </p>
        </div>
      </div>

      <!-- 인쇄 스타일 -->
      <style>
        @media print {
          body * {
            visibility: hidden;
          }
          #certificate-print-area,
          #certificate-print-area * {
            visibility: visible;
          }
          #certificate-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            height: 297mm;
            box-shadow: none;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      </style>
    `;
  }

  /**
   * 수료증 미리보기 표시
   */
  showCertificate(certificate) {
    const html = this.generateCertificateHTML(certificate);
    
    const modal = document.createElement('div');
    modal.id = 'certificate-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: auto;
      padding: 20px;
    `;

    modal.innerHTML = `
      <div style="max-width: 900px; width: 100%; position: relative;">
        <div style="text-align: right; margin-bottom: 20px;">
          <button id="print-certificate-btn" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 mr-2">
            <i class="fas fa-print mr-2"></i>
            PDF로 저장
          </button>
          <button id="close-certificate-btn" class="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700">
            <i class="fas fa-times mr-2"></i>
            닫기
          </button>
        </div>
        ${html}
      </div>
    `;

    document.body.appendChild(modal);

    // 이벤트 리스너
    document.getElementById('print-certificate-btn').addEventListener('click', () => {
      window.print();
    });

    document.getElementById('close-certificate-btn').addEventListener('click', () => {
      modal.remove();
    });

    // 배경 클릭 시 닫기
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  /**
   * 내 수료증 목록 조회
   */
  async getMyCertificates() {
    try {
      const response = await fetch('/api/my/certificates', {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          return [];
        }
        throw new Error('수료증 목록 조회 실패');
      }

      const result = await response.json();
      return result.success ? result.data.certificates : [];

    } catch (error) {
      console.error('수료증 목록 조회 에러:', error);
      return [];
    }
  }
}

// 전역 함수로 노출
window.CertificateManager = CertificateManager;
