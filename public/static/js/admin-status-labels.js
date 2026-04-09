/**
 * 관리자 화면 전용: DB/API의 영문 status 값을 한글로만 표시할 때 사용.
 * 저장·API 요청 값은 그대로 영문이어야 함 — label 변환만 수행.
 */
;(function (g) {
  var MAP = {
    draft: '준비 중',
    inactive: '비공개 (숨김)',
    active: '공개 (수강 가능)',
    published: '공개 (수강 가능)',
    archived: '비공개 (숨김)',
    hidden: '비공개 (숨김)',
    pending: '검수 대기',
    approved: '승인 완료',
    rejected: '반려',
    completed: '완료',
    cancelled: '취소',
    open: '접수 중',
    closed: '종료',
    available: '사용 가능',
    used: '사용됨',
    banned: '정지',
    suspended: '정지',
  }

  function adminStatusLabelKo(code) {
    if (code == null || code === '') return '—'
    var k = String(code).trim().toLowerCase()
    if (MAP[k]) return MAP[k]
    return String(code)
  }

  g.adminStatusLabelKo = adminStatusLabelKo
})(typeof window !== 'undefined' ? window : globalThis)
