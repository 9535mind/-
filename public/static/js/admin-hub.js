/**
 * 마인드스토리 원격평생교육원 — 중앙 관제탑 (단일 셸, 탭 + 모달)
 * utils.js 의 apiRequest(fetch) 사용 (auth.js 이후 로드 가정)
 */

/** URL 해시와 <section id="panel-*"> 가 일치해야 함 */
const HUB_VALID_PANELS = new Set([
  'dashboard',
  'members',
  'b2b',
  'enrollments',
  'payments',
  'courses',
  'videos',
  'certificates',
  'instructors',
  'publishing',
  'isbn',
  'ai-cost',
  'support',
  'popups',
  'settings',
])

const PANEL_TO_GROUP = {
  dashboard: 'ops',
  members: 'ops',
  b2b: 'ops',
  enrollments: 'ops',
  payments: 'ops',
  courses: 'edu',
  videos: 'edu',
  certificates: 'edu',
  instructors: 'edu',
  publishing: 'pub',
  isbn: 'pub',
  'ai-cost': 'pub',
  support: 'sys',
  popups: 'sys',
  settings: 'sys',
}

let hubUserPage = 1
let currentUserId = null
let currentCourseId = null
let courseModalLessons = []

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAdmin()
  if (!user) return

  initHubMobileNav()
  window.addEventListener('hashchange', applyHashRoute)
  applyHashRoute()
  if (document.getElementById('statTotalUsers')) await loadDashboardStats()
  if (document.getElementById('pulseSignup')) await loadDashboardPulse()
  if (document.getElementById('hubRecentPayments') || document.getElementById('hubRecentEnrollments')) {
    await loadDashboardSideLists()
  }
  bindHubDashboardCardClicks()
  bindHubDashboardDetailDemo()

  document.getElementById('userSearchBtn')?.addEventListener('click', () => {
    hubUserPage = 1
    loadUsers()
  })
  document.getElementById('userSearch')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      hubUserPage = 1
      loadUsers()
    }
  })

  document.getElementById('isbnBulkBtn')?.addEventListener('click', submitIsbnBulk)
})

function hubCloseMobileNav() {
  const drawer = document.getElementById('hubMobileDrawer')
  const back = document.getElementById('hubMobileBackdrop')
  const toggle = document.getElementById('hubMobileNavToggle')
  if (drawer) drawer.classList.add('translate-x-full')
  if (back) {
    back.classList.add('opacity-0', 'pointer-events-none')
    back.setAttribute('aria-hidden', 'true')
  }
  if (toggle) toggle.setAttribute('aria-expanded', 'false')
  document.body.classList.remove('overflow-hidden')
}

function hubOpenMobileNav() {
  const drawer = document.getElementById('hubMobileDrawer')
  const back = document.getElementById('hubMobileBackdrop')
  const toggle = document.getElementById('hubMobileNavToggle')
  if (drawer) drawer.classList.remove('translate-x-full')
  if (back) {
    back.classList.remove('opacity-0', 'pointer-events-none')
    back.setAttribute('aria-hidden', 'false')
  }
  if (toggle) toggle.setAttribute('aria-expanded', 'true')
  document.body.classList.add('overflow-hidden')
}

function initHubMobileNav() {
  const toggle = document.getElementById('hubMobileNavToggle')
  const closeBtn = document.getElementById('hubMobileNavClose')
  const back = document.getElementById('hubMobileBackdrop')
  toggle?.addEventListener('click', () => hubOpenMobileNav())
  closeBtn?.addEventListener('click', () => hubCloseMobileNav())
  back?.addEventListener('click', () => hubCloseMobileNav())
  document.querySelectorAll('.hub-mobile-nav-link').forEach((a) => {
    a.addEventListener('click', () => hubCloseMobileNav())
  })
}

function updateGnbActiveState(tab) {
  const group = PANEL_TO_GROUP[tab] || 'ops'
  document.querySelectorAll('[data-hub-group]').forEach((el) => {
    const g = el.getAttribute('data-hub-group')
    const on = g === group
    const btn = el.querySelector('.hub-gnb-trigger')
    if (btn) btn.classList.toggle('hub-gnb-trigger--active', on)
  })
  document.querySelectorAll('a[data-hub-panel]').forEach((el) => {
    const id = el.getAttribute('data-hub-panel')
    const on = id === tab
    el.classList.toggle('bg-indigo-600/90', on)
    el.classList.toggle('font-semibold', on)
  })
}

function applyHashRoute() {
  const raw = (location.hash || '#dashboard').replace(/^#/, '') || 'dashboard'
  const tab = HUB_VALID_PANELS.has(raw) ? raw : 'dashboard'
  updateGnbActiveState(tab)
  document.querySelectorAll('.hub-panel').forEach((p) => p.classList.add('hidden'))
  const panel = document.getElementById('panel-' + tab)
  if (panel) panel.classList.remove('hidden')

  if (tab === 'members') loadUsers()
  if (tab === 'courses') loadCourses()
  if (tab === 'enrollments') loadEnrollmentsTable()
  if (tab === 'payments') loadPaymentsTable()
  if (tab === 'videos') loadVideosTable()
  if (tab === 'isbn') loadIsbnAdmin()
  if (tab === 'certificates') loadCertificatesTable()
  if (tab === 'publishing' && typeof window.loadPublishingQueue === 'function') window.loadPublishingQueue()
}

window.hubCloseMobileNav = hubCloseMobileNav

async function loadDashboardStats() {
  const res = await apiRequest('GET', '/api/admin/dashboard/stats')
  if (!res.success || !res.data) return
  const d = res.data
  const set = (id, v) => {
    const n = document.getElementById(id)
    if (n) n.textContent = v
  }
  set('statTotalUsers', (d.total_users ?? 0).toLocaleString('ko-KR'))
  set('statTotalCourses', (d.total_courses ?? 0).toLocaleString('ko-KR'))
  set('statMonthlyRevenue', (d.monthly_revenue ?? 0).toLocaleString('ko-KR') + '원')
  set('statActiveEnrollments', (d.active_enrollments ?? 0).toLocaleString('ko-KR'))
}

async function loadDashboardPulse() {
  const res = await apiRequest('GET', '/api/admin/dashboard/pulse')
  if (res.success && res.data) {
    const el = (id, v) => {
      const n = document.getElementById(id)
      if (n) n.textContent = typeof v === 'number' ? v.toLocaleString('ko-KR') : String(v)
    }
    el('pulseSignup', res.data.signup_today ?? 0)
    el('pulsePayment', (res.data.payment_today ?? 0).toLocaleString('ko-KR') + '원')
    el('pulseInquiries', res.data.unanswered_inquiries ?? 0)
  }
}

/** KPI / 오늘의 지표 카드 — 클릭 시 모달 + 탭 이동 */
const HUB_KPI_HELP = {
  users: {
    title: '총 회원수',
    body: '탈퇴·삭제 처리되지 않은 회원 계정 수입니다. 회원 탭에서 목록 검색·상세 관리를 할 수 있습니다.',
    tab: 'members',
    tabLabel: '회원 탭으로 이동',
    valueId: 'statTotalUsers',
  },
  courses: {
    title: '총 강좌수',
    body: '학생 사이트에 노출 가능한 강좌(상태 published) 수입니다.',
    tab: 'courses',
    tabLabel: '강좌 탭으로 이동',
    valueId: 'statTotalCourses',
  },
  revenue: {
    title: '이번 달 매출',
    body: '당월 결제·주문 합계입니다. 상세 내역은 결제 탭에서 확인하세요.',
    tab: 'payments',
    tabLabel: '결제 탭으로 이동',
    valueId: 'statMonthlyRevenue',
  },
  enrollments: {
    title: '활성 수강생',
    body: '수강 완료 전(진행 중)으로 집계된 수강신청 건수입니다.',
    tab: 'enrollments',
    tabLabel: '수강신청 탭으로 이동',
    valueId: 'statActiveEnrollments',
  },
}

const HUB_PULSE_HELP = {
  signup: {
    title: '오늘의 신규 가입자',
    body: '오늘 00:00 이후 가입이 완료된 회원 수입니다.',
    tab: 'members',
    tabLabel: '회원 탭으로 이동',
    valueId: 'pulseSignup',
  },
  payment: {
    title: '오늘의 결제 금액',
    body: '오늘 결제가 완료된 주문 금액 합계입니다.',
    tab: 'payments',
    tabLabel: '결제 탭으로 이동',
    valueId: 'pulsePayment',
  },
  inquiry: {
    title: '미답변 문의',
    body: '아직 답변이 등록되지 않은 문의 건수입니다. 공지·Q&A 탭에서 전용 UI를 확장할 예정입니다.',
    tab: 'support',
    tabLabel: '시스템 지원으로 이동',
    valueId: 'pulseInquiries',
  },
}

function openHubKpiModal(cfg) {
  const modal = document.getElementById('hubKpiModal')
  const titleEl = document.getElementById('hubKpiModalTitle')
  const bodyEl = document.getElementById('hubKpiModalBody')
  const valueEl = document.getElementById('hubKpiModalValue')
  const goBtn = document.getElementById('hubKpiModalGoTab')
  if (!modal || !titleEl || !bodyEl || !valueEl || !goBtn) return

  titleEl.textContent = cfg.title
  bodyEl.textContent = cfg.body
  const v = document.getElementById(cfg.valueId)
  valueEl.textContent = v ? v.textContent.trim() : '—'

  if (cfg.tab) {
    goBtn.classList.remove('hidden', 'invisible')
    goBtn.disabled = false
    goBtn.textContent = cfg.tabLabel || '관련 탭으로 이동'
    goBtn.onclick = () => {
      closeHubKpiModal()
      location.hash = cfg.tab
    }
  } else {
    goBtn.classList.add('hidden')
    goBtn.disabled = true
    goBtn.onclick = null
  }

  modal.classList.remove('hidden')
  modal.classList.add('flex')

  const esc = (e) => {
    if (e.key === 'Escape') {
      closeHubKpiModal()
      document.removeEventListener('keydown', esc)
    }
  }
  openHubKpiModal._esc = esc
  document.addEventListener('keydown', esc)
}

function closeHubKpiModal() {
  const modal = document.getElementById('hubKpiModal')
  if (modal) {
    modal.classList.add('hidden')
    modal.classList.remove('flex')
  }
  if (openHubKpiModal._esc) {
    document.removeEventListener('keydown', openHubKpiModal._esc)
    openHubKpiModal._esc = null
  }
}

window.closeHubKpiModal = closeHubKpiModal

function bindHubDashboardCardClicks() {
  document.querySelectorAll('[data-hub-kpi]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-hub-kpi')
      const cfg = HUB_KPI_HELP[key]
      if (cfg) openHubKpiModal(cfg)
    })
  })
  document.querySelectorAll('[data-hub-pulse]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-hub-pulse')
      const cfg = HUB_PULSE_HELP[key]
      if (cfg) openHubKpiModal(cfg)
    })
  })
}

/** 대시보드 요약 카드 — 데모 상세 모달 (window.__ADMIN_DASHBOARD_MOCK__ 없을 때) */
const HUB_DASHBOARD_DEMO_FALLBACK = {
  'dash-new-signups': {
    title: '오늘 신규 가입 상세',
    subtitle: '데모 · 이름 · 유형 · 소속 · 가입시간 · 상태',
    columns: ['이름', '유형', '소속', '가입시간', '상태', '처리'],
    actionLabel: '승인',
    rows: [
      ['박종석', 'B2B', '(주)마인드상사', '08:12', '승인 대기'],
      ['김지수', '일반', '—', '08:35', '가입 완료'],
      ['이민호', '일반', '—', '08:52', '가입 완료'],
      ['최유진', 'B2B', '(주)에듀테크', '09:05', '승인 대기'],
    ],
  },
  'dash-today-enrollments': {
    title: '오늘 수강 신청 상세',
    subtitle: '데모 · 신청자 · 과정 · 금액 · 수단 · 상태',
    columns: ['신청자명', '신청과정', '결제금액', '결제수단', '상태', '처리'],
    actionLabel: '확인',
    rows: [
      ['김민수', 'MindStory Classic · 진로캠프', '₩150,000', '카드', '결제완료'],
      ['이수진', 'MindStory Next · AI 동화', '₩298,000', '무통장', '입금대기'],
      ['박준형', 'MindStory Classic', '₩150,000', '카드', '결제완료'],
      ['최유리', '메타인지 클리닉', '₩89,000', '카드', '결제완료'],
    ],
  },
  'dash-today-revenue': {
    title: '오늘 결제 성공 내역',
    subtitle: '데모 · 오늘 결제완료 건만',
    columns: ['주문번호', '신청자', '신청과정', '결제금액', '결제수단', '결제시각', '처리'],
    actionLabel: '확인',
    rows: [
      ['ORD-260330-001', '김민수', 'MindStory Classic · 진로캠프', '₩150,000', '카드', '08:18'],
      ['ORD-260330-003', '박준형', 'MindStory Classic', '₩150,000', '카드', '08:51'],
      ['ORD-260330-004', '최유리', 'MindStory Classic · 메타인지 입문', '₩150,000', '카드', '09:07'],
    ],
  },
  'dash-urgent-queue': {
    title: '즉시 처리 필요',
    subtitle: '데모 · 유형별 구분',
    columns: [],
    actionLabel: '처리',
    rows: [],
    layout: 'sections',
    sections: [
      {
        title: '무통장 입금 확인',
        subtitle: '3건',
        columns: ['입금자', '금액', '입금예정일', '강좌', '접수', '상태', '처리'],
        rows: [
          ['이희훈', '₩298,000', '당일', 'MindStory Next', '08:44', '미확인'],
          ['홍승민', '₩150,000', '당일', 'MindStory Classic', '11:08', '미확인'],
        ],
        actionLabel: '승인',
      },
      {
        title: 'B2B / 강사 승인',
        subtitle: '1건',
        columns: ['기관 · 신청', '요청 유형', '제출 서류', '접수', '상태', '처리'],
        rows: [['(주)에듀테크 · 강사 신청', '기관 소속 강사', '이력서·자격증', '오늘 09:12', '대기']],
        actionLabel: '승인',
      },
      {
        title: '미답변 Q&A',
        subtitle: '4건',
        columns: ['채널', '제목', '회원', '접수', '상태', '처리'],
        rows: [
          ['1:1', '로그인이 안 돼요 (카카오 연동)', '김*성', '08:22', '미답변'],
          ['Q&A', '수료증 발급 기준 문의', '이*희', '09:05', '미답변'],
        ],
        actionLabel: '답변 완료',
      },
    ],
  },
  'dash-action-bank': {
    title: '무통장 입금 확인 대기',
    subtitle: '데모 6건 (요약 배지 3건 포함) · 입금 확인 후 강좌 활성화',
    columns: ['입금자', '금액', '입금예정일', '강좌', '접수', '처리'],
    actionLabel: '승인',
    rows: [
      ['박종석', '₩150,000', '당일', 'MindStory Classic', '08:12'],
      ['이서연', '₩298,000', '당일', 'MindStory Next', '08:44'],
      ['최우진', '₩150,000', '익일', 'MindStory Classic', '09:05'],
      ['정하은', '₩89,000', '당일', '메타인지 클리닉', '09:51'],
      ['강도윤', '₩150,000', '당일', 'MindStory Classic', '10:18'],
      ['한지민', '₩298,000', '익일', 'MindStory Next', '10:52'],
    ],
  },
  'dash-action-b2b': {
    title: 'B2B / 강사 권한 승인 대기',
    subtitle: '데모 5건 · 기관·강사 계정 검토',
    columns: ['기관/신청자', '요청 역할', '제출 서류', '접수', '처리'],
    actionLabel: '승인',
    rows: [
      ['광주 OO학원 · 김원장', '기관 관리자', '사업자·위탁계약', '어제'],
      ['부산 △△센터 · 이팀장', '기관 운영자', '협약서', '2일 전'],
      ['전북 ◇◇교육 · 박대표', '기관 관리자', '사업자', '3일 전'],
      ['강사 파견 · 최OO', '강사(심사)', '이력·자격', '오늘'],
      ['협력사 · 정OO', '콘텐츠 편집', 'NDA', '오늘'],
    ],
  },
  'dash-action-inquiry': {
    title: '미답변 1:1 문의 · Q&A',
    subtitle: '데모 6건 (요약 배지 4건 근접) · 답변 등록 시 목록에서 제거',
    columns: ['채널', '제목', '회원', '접수', '상태', '처리'],
    actionLabel: '답변 완료',
    rows: [
      ['1:1', '수강 연장 가능한가요?', '김*성', '08:30', '미답변'],
      ['Q&A', 'NCS 서류 양식', '이*희', '09:12', '미답변'],
      ['1:1', '환급 일정 문의', '박*준', '09:45', '미답변'],
      ['1:1', 'mOTP 미인증', '최*원', '10:20', '미답변'],
      ['Q&A', 'Classic vs Next 차이', '정*아', '10:55', '미답변'],
      ['1:1', '결제 영수증 재발급', '강*우', '11:18', '미답변'],
    ],
  },
}

function getHubDashboardDemoTables() {
  try {
    if (typeof window !== 'undefined' && window.__ADMIN_DASHBOARD_MOCK__ && window.__ADMIN_DASHBOARD_MOCK__.tables) {
      return window.__ADMIN_DASHBOARD_MOCK__.tables
    }
  } catch (e) {}
  return HUB_DASHBOARD_DEMO_FALLBACK
}

/** 대시보드 상세 모달 — 상태·우선 등 배지 컬럼 */
function hubDashColumnIsBadge(colName) {
  const c = String(colName || '').trim()
  return c === '상태' || c === '우선'
}

function hubDashBadgeHtml(raw) {
  const t = String(raw)
  let cls =
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset max-w-[14rem] truncate '
  if (/결제완료|가입 완료|완료|정상|승인/.test(t)) cls += 'bg-emerald-50 text-emerald-800 ring-emerald-600/20'
  else if (/입금대기|승인 대기|대기|미확인|미답변|본인인증|서류|확인필요|부분취소|취소요청/.test(t)) cls += 'bg-amber-50 text-amber-900 ring-amber-600/25'
  else if (/취소|거절|실패/.test(t)) cls += 'bg-rose-50 text-rose-800 ring-rose-600/20'
  else if (/긴급|높음/.test(t)) cls += 'bg-violet-50 text-violet-800 ring-violet-600/20'
  else if (/보통|문의|입금|B2B|시스템/.test(t)) cls += 'bg-slate-100 text-slate-700 ring-slate-500/15'
  else cls += 'bg-emerald-50/90 text-slate-800 ring-emerald-500/15'
  return '<span class="' + cls + '" title="' + escapeAttr(t) + '">' + escapeHtml(t) + '</span>'
}

function hubDashRenderCell(colName, cell) {
  if (hubDashColumnIsBadge(colName)) return hubDashBadgeHtml(cell)
  return escapeHtml(String(cell))
}

function hubDashActionButtonHtml(label) {
  return (
    '<button type="button" class="hub-demo-action-btn text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-3 py-1.5 rounded-lg shadow-sm ring-1 ring-emerald-500/20">' +
    escapeHtml(label) +
    '</button>'
  )
}

function hubDashboardDetailRenderTableRows(cols, rows, defaultActionLabel) {
  const actionLabel = defaultActionLabel || '처리'
  const dataCols = cols.filter((c) => c !== '처리')
  return (rows || [])
    .map((cells, idx) => {
      const tds = dataCols
        .map((colName, i) => {
          const cell = cells[i] != null ? cells[i] : ''
          return '<td class="p-3 align-middle text-slate-800">' + hubDashRenderCell(colName, cell) + '</td>'
        })
        .join('')
      const btn =
        '<td class="p-3 text-center align-middle hub-demo-action-cell">' +
        hubDashActionButtonHtml(actionLabel) +
        '</td>'
      return '<tr class="hover:bg-emerald-50/50 transition-colors" data-hub-demo-row="' + idx + '">' + tds + btn + '</tr>'
    })
    .join('')
}

function openHubDashboardDetailModal(kind) {
  const cfg = getHubDashboardDemoTables()[kind]
  if (!cfg) return
  const modal = document.getElementById('hubDashboardDetailModal')
  const titleEl = document.getElementById('hubDashboardDetailTitle')
  const subEl = document.getElementById('hubDashboardDetailSubtitle')
  const tableWrap = document.getElementById('hubDashboardDetailTableWrap')
  const sectionsWrap = document.getElementById('hubDashboardDetailSectionsWrap')
  const thead = document.getElementById('hubDashboardDetailThead')
  const tbody = document.getElementById('hubDashboardDetailTbody')
  if (!modal || !titleEl || !subEl || !tableWrap || !sectionsWrap || !thead || !tbody) return

  titleEl.textContent = cfg.title
  subEl.textContent = cfg.subtitle

  const useSections = cfg.layout === 'sections' && cfg.sections && cfg.sections.length

  if (useSections) {
    tableWrap.classList.add('hidden')
    sectionsWrap.classList.remove('hidden')
    thead.innerHTML = ''
    tbody.innerHTML = ''
    const defaultAct = cfg.actionLabel || '처리'
    sectionsWrap.innerHTML = cfg.sections
      .map((sec) => {
        const cols = sec.columns || []
        const act = sec.actionLabel || defaultAct
        const theadRow =
          '<tr>' +
          cols
            .map(
              (c) =>
                '<th class="p-3 font-semibold whitespace-nowrap bg-slate-50/90 text-slate-700 border-b border-slate-100">' +
                escapeHtml(c) +
                '</th>',
            )
            .join('') +
          '</tr>'
        const body = hubDashboardDetailRenderTableRows(cols, sec.rows, act)
        return (
          '<section class="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white ring-1 ring-violet-500/10">' +
          '<div class="px-4 py-3 bg-gradient-to-r from-emerald-50/90 to-violet-50/40 border-b border-slate-100">' +
          '<h4 class="text-sm font-bold text-slate-800">' +
          escapeHtml(sec.title) +
          '</h4>' +
          (sec.subtitle
            ? '<p class="text-xs text-violet-700/80 font-medium mt-0.5">' + escapeHtml(sec.subtitle) + '</p>'
            : '') +
          '</div>' +
          '<div class="overflow-x-auto"><table class="w-full text-sm text-left">' +
          '<thead>' +
          theadRow +
          '</thead><tbody class="divide-y divide-slate-100">' +
          body +
          '</tbody></table></div></section>'
        )
      })
      .join('')
  } else {
    tableWrap.classList.remove('hidden')
    sectionsWrap.classList.add('hidden')
    sectionsWrap.innerHTML = ''
    const cols = cfg.columns || []
    thead.innerHTML =
      '<tr>' +
      cols
        .map(
          (c) =>
            '<th class="p-3 font-semibold whitespace-nowrap bg-slate-50/90 text-slate-700 border-b border-slate-100">' +
            escapeHtml(c) +
            '</th>',
        )
        .join('') +
      '</tr>'
    const actionLabel = cfg.actionLabel || '처리'
    tbody.innerHTML = hubDashboardDetailRenderTableRows(cols, cfg.rows, actionLabel)
  }

  modal.classList.remove('hidden')
  modal.classList.add('flex')

  const esc = (e) => {
    if (e.key === 'Escape') {
      closeHubDashboardDetailModal()
      document.removeEventListener('keydown', esc)
    }
  }
  openHubDashboardDetailModal._esc = esc
  document.addEventListener('keydown', esc)
}

window.openHubDashboardDetailModal = openHubDashboardDetailModal

function closeHubDashboardDetailModal() {
  const modal = document.getElementById('hubDashboardDetailModal')
  const sectionsWrap = document.getElementById('hubDashboardDetailSectionsWrap')
  if (sectionsWrap) sectionsWrap.innerHTML = ''
  if (modal) {
    modal.classList.add('hidden')
    modal.classList.remove('flex')
  }
  if (openHubDashboardDetailModal._esc) {
    document.removeEventListener('keydown', openHubDashboardDetailModal._esc)
    openHubDashboardDetailModal._esc = null
  }
}

window.closeHubDashboardDetailModal = closeHubDashboardDetailModal

function bindHubDashboardDetailDemo() {
  const panel = document.getElementById('panel-dashboard')
  if (!panel) return
  panel.addEventListener('click', (e) => {
    const t = e.target.closest('[data-hub-dash-detail]')
    if (!t) return
    const kind = t.getAttribute('data-hub-dash-detail')
    if (kind) openHubDashboardDetailModal(kind)
  })

  const modal = document.getElementById('hubDashboardDetailModal')
  if (modal) {
    modal.addEventListener('click', (e) => {
      const btn = e.target.closest('.hub-demo-action-btn')
      if (!btn) return
      const tr = btn.closest('tr')
      if (!tr) return
      tr.classList.add('bg-emerald-50', 'transition-colors')
      const cell = btn.closest('.hub-demo-action-cell')
      if (cell) {
        cell.innerHTML = '<span class="text-emerald-700 font-semibold text-sm py-1 inline-block">완료</span>'
      }
    })
  }
}

async function loadDashboardSideLists() {
  const pay = await apiRequest('GET', '/api/admin/payments?limit=6')
  const payBody = document.getElementById('hubRecentPayments')
  if (payBody) {
    const rows = pay.success ? pay.data || [] : []
    if (!rows.length) payBody.innerHTML = '<p class="text-gray-500">최근 결제가 없습니다.</p>'
    else {
      payBody.innerHTML = rows
        .map(
          (p) => `
        <div class="flex justify-between border-b border-slate-100 py-2">
          <span>${escapeHtml(p.user_name || '')} · ${escapeHtml(p.course_title || p.order_name || '')}</span>
          <span class="font-semibold text-emerald-700">${(p.final_amount ?? p.amount ?? 0).toLocaleString()}원</span>
        </div>`,
        )
        .join('')
    }
  }

  const en = await apiRequest('GET', '/api/admin/enrollments?limit=6')
  const enBody = document.getElementById('hubRecentEnrollments')
  if (enBody) {
    const rows = en.success ? en.data || [] : []
    if (!rows.length) enBody.innerHTML = '<p class="text-gray-500">최근 수강신청이 없습니다.</p>'
    else {
      enBody.innerHTML = rows
        .map(
          (e) => `
        <div class="flex justify-between border-b border-slate-100 py-2">
          <span>${escapeHtml(e.user_name || '')} → ${escapeHtml(e.course_title || '')}</span>
          <span class="text-xs text-slate-500">${formatDateTime(e.enrolled_at)}</span>
        </div>`,
        )
        .join('')
    }
  }
}

async function loadUsers() {
  const q = document.getElementById('userSearch')?.value?.trim() || ''
  const qs = new URLSearchParams({ page: String(hubUserPage), limit: '20' })
  if (q) qs.set('q', q)
  const res = await apiRequest('GET', '/api/admin/users?' + qs.toString())
  const tbody = document.getElementById('userTableBody')
  const pag = document.getElementById('userPagination')
  if (!tbody) return
  if (!res.success || !res.data) {
    tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-red-600">불러오기 실패</td></tr>'
    return
  }
  tbody.innerHTML = res.data
    .map(
      (u) => `
    <tr class="border-t border-slate-100 hover:bg-slate-50">
      <td class="p-3">${u.id}</td>
      <td class="p-3">${escapeHtml(u.name)}</td>
      <td class="p-3">${escapeHtml(u.email)}</td>
      <td class="p-3">${escapeHtml(u.role)}</td>
      <td class="p-3 text-xs">${formatDateTime(u.created_at)}</td>
      <td class="p-3 text-center">
        <button type="button" class="text-indigo-600 hover:underline" onclick="openUserModal(${u.id})">상세</button>
      </td>
    </tr>`,
    )
    .join('')

  const totalPages = res.pagination?.totalPages || 1
  if (pag) {
    pag.innerHTML = ''
    if (hubUserPage > 1) {
      const b = document.createElement('button')
      b.className = 'px-3 py-1 border rounded'
      b.textContent = '이전'
      b.onclick = () => {
        hubUserPage--
        loadUsers()
      }
      pag.appendChild(b)
    }
    const span = document.createElement('span')
    span.className = 'px-2 text-sm'
    span.textContent = `${hubUserPage} / ${totalPages}`
    pag.appendChild(span)
    if (hubUserPage < totalPages) {
      const b2 = document.createElement('button')
      b2.className = 'px-3 py-1 border rounded'
      b2.textContent = '다음'
      b2.onclick = () => {
        hubUserPage++
        loadUsers()
      }
      pag.appendChild(b2)
    }
  }
}

window.openUserModal = async function (userId) {
  currentUserId = userId
  const modal = document.getElementById('userModal')
  const body = document.getElementById('userModalBody')
  const title = document.getElementById('userModalTitle')
  if (!modal || !body) return
  modal.classList.remove('hidden')
  modal.classList.add('flex')
  body.innerHTML = '<p class="text-slate-500">불러오는 중…</p>'

  const detail = await apiRequest('GET', '/api/admin/users/' + userId)
  const enr = await apiRequest('GET', '/api/admin/users/' + userId + '/enrollments')
  if (title && detail.success && detail.data) title.textContent = detail.data.name + ' (' + detail.data.email + ')'

  const enrollRows = enr.success && Array.isArray(enr.data) ? enr.data : []
  let html = ''
  if (detail.success && detail.data) {
    const u = detail.data
    html += `<div class="text-sm space-y-1"><p><strong>전화</strong>: ${escapeHtml(u.phone || '-')}</p>
      <p><strong>가입</strong>: ${formatDateTime(u.created_at)}</p></div>`
  }
  html += '<h4 class="font-semibold mt-4 mb-2">수강 · 진도</h4>'
  if (!enrollRows.length) html += '<p class="text-slate-500 text-sm">수강 내역이 없습니다.</p>'
  else {
    html += '<div class="space-y-2">' + enrollRows.map((e) => `
      <div class="flex flex-wrap justify-between items-center gap-2 border border-slate-200 rounded-lg p-3 text-sm">
        <div>
          <div class="font-medium">${escapeHtml(e.course_title)}</div>
          <div class="text-xs text-slate-500">평균 진도 ${e.avg_progress ?? 0}% · 신청 ${formatDateTime(e.enrolled_at)}</div>
        </div>
        <button type="button" class="text-red-600 text-sm hover:underline" onclick="cancelUserEnrollment(${e.id})">수강 취소</button>
      </div>`).join('') + '</div>'
  }
  body.innerHTML = html
}

window.closeUserModal = function () {
  const modal = document.getElementById('userModal')
  if (modal) {
    modal.classList.add('hidden')
    modal.classList.remove('flex')
  }
}

window.cancelUserEnrollment = async function (enrollmentId) {
  if (!confirm('이 수강을 취소할까요? 진도 기록도 삭제됩니다.')) return
  const res = await apiRequest('DELETE', '/api/admin/enrollments/' + enrollmentId)
  if (res.success) {
    showToast('수강이 취소되었습니다.', 'success')
    if (currentUserId) openUserModal(currentUserId)
  } else showToast(res.error || '실패', 'error')
}

function courseIsPublic(status) {
  return status === 'active' || status === 'published'
}

async function loadCourses() {
  const res = await apiRequest('GET', '/api/admin/courses')
  const tbody = document.getElementById('courseTableBody')
  if (!tbody) return
  if (!res.success || !res.data) {
    tbody.innerHTML = '<tr><td colspan="4" class="p-4">목록을 불러올 수 없습니다.</td></tr>'
    return
  }
  tbody.innerHTML = res.data
    .map((c) => {
      const pub = courseIsPublic(c.status)
      const cg = ((c.category_group || 'CLASSIC') + '').toUpperCase()
      const cgLabel = cg === 'NEXT' ? 'Next' : 'Classic'
      const cgClass = cg === 'NEXT' ? 'bg-violet-100 text-violet-800' : 'bg-slate-100 text-slate-600'
      return `
    <tr class="border-t border-slate-100">
      <td class="p-3">${escapeHtml(c.title)} <span class="text-xs text-slate-400">#${c.id}</span>
        <span class="ml-1 inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${cgClass}">${cgLabel}</span></td>
      <td class="p-3 text-xs">${escapeHtml(c.status)}</td>
      <td class="p-3 text-center">
        <label class="inline-flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" ${pub ? 'checked' : ''} onchange="toggleCoursePublic(${c.id}, this.checked)"
            class="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-indigo-500">
          <span class="text-xs text-slate-600">${pub ? '공개' : '비공개'}</span>
        </label>
      </td>
      <td class="p-3 text-center">
        <button type="button" class="text-indigo-600 hover:underline text-sm" onclick="openCourseModal(${c.id})">편집</button>
      </td>
    </tr>`
    })
    .join('')
}

window.toggleCoursePublic = async function (courseId, checked) {
  const next = checked ? 'active' : 'inactive'
  const res = await apiRequest('PATCH', '/api/admin/courses/' + courseId, { status: next })
  if (res.success) {
    showToast(checked ? '학생 사이트에 공개되었습니다.' : '학생 사이트에서 숨겼습니다.', 'success')
    loadCourses()
  } else {
    showToast(res.error || '상태 변경 실패', 'error')
    loadCourses()
  }
}

function hubCourseCategoryOptions(selected) {
  const cg = (selected || 'CLASSIC').toUpperCase()
  const cl = cg === 'NEXT' ? '' : 'selected'
  const nx = cg === 'NEXT' ? 'selected' : ''
  return `<label class="block text-sm font-medium">라인 (학생 카탈로그)</label>
      <select id="hubCourseCategoryGroup" class="w-full border rounded px-3 py-2" title="Classic → /courses/classic · Next → /courses/next">
        <option value="CLASSIC" ${cl}>Classic — 일반·본질</option>
        <option value="NEXT" ${nx}>Next — 특화·미래</option>
      </select>
      <p class="text-xs text-slate-500">수료증형 일반 과정 등은 별도 필드(<code class="text-[11px]">course_type</code>)이며, 여기 선택은 카탈로그 분류용입니다.</p>`
}

window.openHubNewCourseModal = function () {
  currentCourseId = null
  window.hubCourseDraft = { thumbnail_url: null }
  courseModalLessons = []
  const modal = document.getElementById('courseModal')
  const title = document.getElementById('courseModalTitle')
  const info = document.getElementById('courseTabPanelInfo')
  const frame = document.getElementById('courseLessonsFrame')
  if (!modal || !info) return
  if (title) title.textContent = '새 강좌 등록'
  if (frame) frame.src = 'about:blank'
  modal.classList.remove('hidden')
  modal.classList.add('flex')
  info.innerHTML = `
    <div class="space-y-2">
      <label class="block text-sm font-medium">제목</label>
      <input id="hubCourseTitle" class="w-full border rounded px-3 py-2" value="">
      <label class="block text-sm font-medium">설명</label>
      <textarea id="hubCourseDesc" rows="4" class="w-full border rounded px-3 py-2"></textarea>
      <label class="block text-sm font-medium">상태</label>
      <select id="hubCourseStatus" class="w-full border rounded px-3 py-2">
        <option value="draft" selected>draft</option>
        <option value="inactive">inactive</option>
        <option value="active">active</option>
        <option value="published">published</option>
      </select>
      ${hubCourseCategoryOptions('CLASSIC')}
      <button type="button" onclick="saveCourseBasics()" class="mt-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">등록</button>
    </div>`
  const lessons = document.getElementById('courseTabPanelLessons')
  if (lessons) {
    lessons.innerHTML =
      '<p class="text-slate-500 text-sm">먼저 기본 정보를 저장해 강좌를 만든 뒤, 차시·영상을 편집할 수 있습니다.</p>'
  }
  setupCourseTabs()
}

window.openCourseModal = async function (courseId) {
  currentCourseId = courseId
  const modal = document.getElementById('courseModal')
  const title = document.getElementById('courseModalTitle')
  const info = document.getElementById('courseTabPanelInfo')
  const lessons = document.getElementById('courseTabPanelLessons')
  const frame = document.getElementById('courseLessonsFrame')
  if (!modal || !info || !lessons) return
  modal.classList.remove('hidden')
  modal.classList.add('flex')
  if (title) title.textContent = '강좌 #' + courseId
  if (frame) frame.src = '/admin/courses/' + courseId + '/lessons'

  const res = await apiRequest('GET', '/api/courses/' + courseId)
  if (!res.success || !res.data) {
    info.innerHTML = '<p class="text-red-600">강좌를 불러올 수 없습니다.</p>'
    return
  }
  const { course, lessons: ls } = res.data
  window.hubCourseDraft = course
  courseModalLessons = ls || []
  const cr = course
  const cgVal = ((cr.category_group || 'CLASSIC') + '').toUpperCase()
  info.innerHTML = `
    <div class="space-y-2">
      <label class="block text-sm font-medium">제목</label>
      <input id="hubCourseTitle" class="w-full border rounded px-3 py-2" value="${escapeAttr(cr.title)}">
      <label class="block text-sm font-medium">설명</label>
      <textarea id="hubCourseDesc" rows="4" class="w-full border rounded px-3 py-2">${escapeHtml(cr.description || '')}</textarea>
      <label class="block text-sm font-medium">상태</label>
      <select id="hubCourseStatus" class="w-full border rounded px-3 py-2">
        <option value="draft" ${cr.status === 'draft' ? 'selected' : ''}>draft</option>
        <option value="inactive" ${cr.status === 'inactive' ? 'selected' : ''}>inactive</option>
        <option value="active" ${cr.status === 'active' ? 'selected' : ''}>active</option>
        <option value="published" ${cr.status === 'published' ? 'selected' : ''}>published</option>
      </select>
      ${hubCourseCategoryOptions(cgVal)}
      <button type="button" onclick="saveCourseBasics()" class="mt-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">저장</button>
    </div>`
  renderLessonEditors(courseId)
  setupCourseTabs()
}

function setupCourseTabs() {
  const t1 = document.getElementById('courseTabInfo')
  const t2 = document.getElementById('courseTabLessons')
  const t3 = document.getElementById('courseTabAdvanced')
  const p1 = document.getElementById('courseTabPanelInfo')
  const p2 = document.getElementById('courseTabPanelLessons')
  const p3 = document.getElementById('courseTabPanelAdvanced')
  const isNew = currentCourseId == null
  if (t2) t2.classList.toggle('hidden', isNew)
  if (t3) t3.classList.toggle('hidden', isNew)
  const activate = (n) => {
    ;[t1, t2, t3].forEach((t, i) => {
      if (!t) return
      const on = i === n
      t.classList.toggle('text-indigo-600', on)
      t.classList.toggle('border-b-2', on)
      t.classList.toggle('border-indigo-600', on)
      t.classList.toggle('text-slate-500', !on)
      t.classList.toggle('border-transparent', !on)
    })
    if (p1) p1.classList.toggle('hidden', n !== 0)
    if (p2) p2.classList.toggle('hidden', n !== 1)
    if (p3) p3.classList.toggle('hidden', n !== 2)
  }
  if (t1) t1.onclick = () => activate(0)
  if (t2) t2.onclick = () => activate(1)
  if (t3) t3.onclick = () => activate(2)
  activate(0)
}

function renderLessonEditors(courseId) {
  const lessons = document.getElementById('courseTabPanelLessons')
  if (!lessons) return
  if (!courseModalLessons.length) {
    lessons.innerHTML = '<p class="text-slate-500 text-sm">등록된 차시가 없습니다.</p>'
    return
  }
  lessons.innerHTML =
    '<p class="text-sm text-slate-600 mb-2">영상 URL을 수정한 뒤 저장하세요.</p>' +
    courseModalLessons
      .map(
        (l) => `
    <div class="border border-slate-200 rounded-lg p-3 mb-2">
      <div class="font-medium text-sm">${l.lesson_number}. ${escapeHtml(l.title)}</div>
      <input type="text" id="lesson-url-${l.id}" class="w-full mt-1 border rounded px-2 py-1 text-sm" value="${escapeAttr(l.video_url || '')}" placeholder="영상 URL">
      <button type="button" class="mt-1 text-xs text-indigo-600 hover:underline" onclick="saveLessonVideo(${courseId}, ${l.id})">이 차시 저장</button>
    </div>`,
      )
      .join('')
}

window.saveLessonVideo = async function (courseId, lessonId) {
  const input = document.getElementById('lesson-url-' + lessonId)
  const video_url = input?.value?.trim() || ''
  const res = await apiRequest('PUT', `/api/courses/${courseId}/lessons/${lessonId}`, { video_url })
  if (res.success) showToast('차시가 저장되었습니다.', 'success')
  else showToast(res.error || '저장 실패', 'error')
}

window.saveCourseBasics = async function () {
  const title = document.getElementById('hubCourseTitle')?.value
  const description = document.getElementById('hubCourseDesc')?.value
  const status = document.getElementById('hubCourseStatus')?.value
  const category_group = document.getElementById('hubCourseCategoryGroup')?.value || 'CLASSIC'
  const thumb = window.hubCourseDraft?.thumbnail_url ?? null

  if (currentCourseId == null) {
    const res = await apiRequest('POST', '/api/admin/courses', {
      title,
      description,
      status,
      thumbnail_url: null,
      category_group,
    })
    if (res.success && res.data && res.data.id) {
      showToast('강좌가 등록되었습니다. 차시·영상을 이어서 편집할 수 있습니다.', 'success')
      loadCourses()
      await openCourseModal(res.data.id)
    } else showToast(res.error || '등록 실패', 'error')
    return
  }

  const res = await apiRequest('PUT', '/api/admin/courses/' + currentCourseId, {
    title,
    description,
    status,
    thumbnail_url: thumb,
    category_group,
  })
  if (res.success) {
    showToast('저장되었습니다.', 'success')
    loadCourses()
  } else showToast(res.error || '실패', 'error')
}

window.closeCourseModal = function () {
  const modal = document.getElementById('courseModal')
  if (modal) {
    modal.classList.add('hidden')
    modal.classList.remove('flex')
  }
  const frame = document.getElementById('courseLessonsFrame')
  if (frame) frame.src = 'about:blank'
}

async function loadEnrollmentsTable() {
  const res = await apiRequest('GET', '/api/admin/enrollments?limit=100')
  const tbody = document.getElementById('enrollmentsTableBody')
  if (!tbody) return
  const rows = res.success ? res.data || [] : []
  tbody.innerHTML = rows.length
    ? rows
        .map(
          (e) => `
    <tr class="border-t border-slate-100">
      <td class="p-2">${escapeHtml(e.user_name)}<br><span class="text-xs text-slate-500">${escapeHtml(e.email)}</span></td>
      <td class="p-2">${escapeHtml(e.course_title)}</td>
      <td class="p-2 text-xs">${formatDateTime(e.enrolled_at)}</td>
    </tr>`,
        )
        .join('')
    : '<tr><td colspan="3" class="p-4 text-slate-500">내역이 없습니다.</td></tr>'
}

async function loadPaymentsTable() {
  const res = await apiRequest('GET', '/api/admin/payments?limit=100')
  const tbody = document.getElementById('paymentsTableBody')
  if (!tbody) return
  const rows = res.success ? res.data || [] : []
  tbody.innerHTML = rows.length
    ? rows
        .map(
          (p) => `
    <tr class="border-t border-slate-100">
      <td class="p-2">${escapeHtml(p.user_name)}</td>
      <td class="p-2">${escapeHtml(p.course_title || '')}</td>
      <td class="p-2 text-right">${(p.final_amount ?? 0).toLocaleString()}원</td>
      <td class="p-2 text-xs">${formatDateTime(p.paid_at || p.created_at)}</td>
    </tr>`,
        )
        .join('')
    : '<tr><td colspan="4" class="p-4">결제 내역이 없습니다.</td></tr>'
}

async function loadVideosTable() {
  const res = await apiRequest('GET', '/api/admin/videos')
  const tbody = document.getElementById('videosTableBody')
  if (!tbody) return
  const rows = res.success ? res.data || [] : []
  tbody.innerHTML = rows.length
    ? rows
        .map(
          (v) => `
    <tr class="border-t border-slate-100">
      <td class="p-2">${escapeHtml(v.course_title)}</td>
      <td class="p-2">${v.lesson_number}. ${escapeHtml(v.lesson_title)}</td>
      <td class="p-2 text-xs break-all">${escapeHtml(v.video_url || '')}</td>
    </tr>`,
        )
        .join('')
    : '<tr><td colspan="3" class="p-4">영상이 없습니다.</td></tr>'
}

async function loadCertificatesTable() {
  const res = await apiRequest('GET', '/api/admin/certificates')
  const tbody = document.getElementById('certificatesTableBody')
  if (!tbody) return
  const rows = res.success ? res.data || [] : []
  tbody.innerHTML = rows.length
    ? rows
        .map(
          (r) => `
    <tr class="border-t border-slate-100">
      <td class="p-3 font-mono text-xs">
        <a href="/certificates/${escapeAttr(r.certificate_number)}" target="_blank" rel="noopener" class="text-indigo-600 hover:underline">${escapeHtml(r.certificate_number)}</a>
      </td>
      <td class="p-3">${escapeHtml(r.user_name || '')}<br><span class="text-xs text-slate-500">${escapeHtml(r.email || '')}</span></td>
      <td class="p-3">${escapeHtml(r.course_title || '')}</td>
      <td class="p-3 text-xs">${formatDateTime(r.created_at)}</td>
    </tr>`,
        )
        .join('')
    : '<tr><td colspan="4" class="p-4 text-slate-500">발급된 수료증이 없습니다.</td></tr>'
}

async function loadIsbnAdmin() {
  const stats = await apiRequest('GET', '/api/admin/isbn/stats')
  const av = document.getElementById('isbnStatAvail')
  const us = document.getElementById('isbnStatUsed')
  const bar = document.getElementById('isbnBarUsed')
  if (stats.success && stats.data && av && us && bar) {
    const a = Number(stats.data.available ?? 0)
    const u = Number(stats.data.used ?? 0)
    av.textContent = String(a)
    us.textContent = String(u)
    const t = a + u
    bar.style.width = t ? `${Math.round((u / t) * 100)}%` : '0%'
  }
  const books = await apiRequest('GET', '/api/admin/digital-books')
  const tbody = document.getElementById('isbnBooksBody')
  if (!tbody) return
  const rows = books.success ? books.data || [] : []
  tbody.innerHTML = rows.length
    ? rows
        .map(
          (b) => `
    <tr class="border-t border-slate-100">
      <td class="p-2">${b.id}</td>
      <td class="p-2">${escapeHtml(b.user_name || '')}<br/><span class="text-xs text-slate-500">${escapeHtml(b.email || '')}</span></td>
      <td class="p-2">${escapeHtml(b.title || '')}</td>
      <td class="p-2 font-mono text-xs">${escapeHtml(b.isbn_number || '—')}</td>
      <td class="p-2">${escapeHtml(b.status || '')}</td>
      <td class="p-2">${b.barcode_url ? `<a class="text-indigo-600 underline" href="${escapeAttr(b.barcode_url)}" target="_blank" rel="noopener">SVG</a>` : '—'}</td>
    </tr>`,
        )
        .join('')
    : '<tr><td colspan="6" class="p-4">데이터가 없습니다.</td></tr>'
}

async function submitIsbnBulk() {
  const ta = document.getElementById('isbnBulkInput')
  const msg = document.getElementById('isbnBulkMsg')
  if (!ta || !msg) return
  const lines = ta.value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const numbers = []
  for (const line of lines) {
    const d = line.replace(/\D/g, '')
    if (d.length === 13) numbers.push(d)
  }
  if (!numbers.length) {
    msg.textContent = '유효한 13자리 ISBN이 없습니다.'
    return
  }
  msg.textContent = '등록 중…'
  const res = await apiRequest('POST', '/api/admin/isbn/bulk', { numbers })
  if (res.success && res.data) {
    msg.textContent = `요청 ${res.data.total_requested}줄 중 ${res.data.inserted}건 등록(중복 제외).`
    ta.value = ''
    await loadIsbnAdmin()
  } else {
    msg.textContent = res.error || '실패'
  }
}

function escapeHtml(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;')
}
