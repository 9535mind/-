/**
 * 관리자 대시보드 — 데모용 가공 데이터 (운영 API 연동 시 교체)
 * UI 숫자: 신규 12명 · 수강신청 18건(Classic 12 · Next 4 · 메타인지 2) · 즉시처리 8건(무통장 3 · B2B 1 · 문의 4)
 *
 * 브라우저: `getAdminDashboardMockInlinePayload()` → admin-hub-html 에서
 * `window.__ADMIN_DASHBOARD_MOCK__` 로 주입 (동일 객체를 `window.ADMIN_DASHBOARD_MOCK` 에도 연결).
 * 테이블 키: dash-new-signups, dash-today-enrollments, dash-today-revenue, dash-urgent-queue, …
 */

export type HubDashTableKey =
  | 'dash-new-signups'
  | 'dash-today-enrollments'
  | 'dash-today-revenue'
  | 'dash-urgent-queue'
  | 'dash-action-bank'
  | 'dash-action-b2b'
  | 'dash-action-inquiry'

/** 즉시 처리 모달 — 유형별 하위 테이블 */
export interface HubDemoSection {
  title: string
  subtitle?: string
  columns: string[]
  rows: string[][]
  actionLabel?: string
}

export interface HubDemoTable {
  title: string
  subtitle: string
  columns: string[]
  actionLabel: string
  rows: string[][]
  /** 'sections' 이면 rows/columns 대신 sections 사용 */
  layout?: 'table' | 'sections'
  sections?: HubDemoSection[]
}

export interface HubRecentPaymentDemo {
  /** 결제자 실명 (관리자 화면 — 마스킹 없음) */
  payerName: string
  course: string
  amount: string
  status: string
  statusTone: 'emerald' | 'amber' | 'slate'
  timeLabel: string
}

/** 오늘 신규 가입 12명 — [이름, 유형, 소속, 가입시간, 상태] */
export const mockTodaySignups = [
  ['박종석', 'B2B', '(주)마인드상사', '08:12', '승인 대기'],
  ['김지수', '일반', '—', '08:35', '가입 완료'],
  ['이민호', '일반', '—', '08:52', '가입 완료'],
  ['최유진', 'B2B', '(주)에듀테크', '09:05', '승인 대기'],
  ['정하은', '일반', '—', '09:28', '본인인증 대기'],
  ['강도윤', '일반', '—', '09:41', '가입 완료'],
  ['한소영', 'B2B', '광주○○학원', '10:03', '서류 검토'],
  ['오세훈', '일반', '—', '10:19', '가입 완료'],
  ['윤채원', '일반', '—', '10:44', '가입 완료'],
  ['문태일', '일반', '—', '11:02', '가입 완료'],
  ['서지아', 'B2B', '부산△△센터', '11:18', '승인 대기'],
  ['배준영', '일반', '—', '11:47', '가입 완료'],
]

/** 수강 신청 18건 — Classic 12 · Next 4 · 메타인지 2 */
export const mockTodayEnrollments = [
  // Classic ×12
  ['김민수', 'MindStory Classic · 진로캠프', '₩150,000', '카드', '결제완료', '08:18'],
  ['이수진', 'MindStory Classic · 부모자녀 소통', '₩150,000', '무통장', '입금대기', '08:33'],
  ['박준형', 'MindStory Classic', '₩150,000', '카드', '결제완료', '08:51'],
  ['최유리', 'MindStory Classic · 메타인지 입문', '₩150,000', '카드', '결제완료', '09:07'],
  ['정민재', 'MindStory Classic', '₩150,000', '카드', '결제취소', '09:22'],
  ['한소희', 'MindStory Classic · 미술심리', '₩150,000', '무통장', '입금대기', '09:38'],
  ['서지훈', 'MindStory Classic', '₩150,000', '카드', '결제완료', '10:01'],
  ['문채린', 'MindStory Classic · 감정코칭', '₩150,000', '카드', '결제완료', '10:15'],
  ['안재혁', 'MindStory Classic', '₩150,000', '카드', '결제완료', '10:29'],
  ['노은비', 'MindStory Classic · 자기주도학습', '₩150,000', '카드', '결제완료', '10:52'],
  ['홍승민', 'MindStory Classic', '₩150,000', '무통장', '입금대기', '11:08'],
  ['신다은', 'MindStory Classic', '₩150,000', '카드', '결제완료', '11:24'],
  // Next ×4
  ['이도현', 'MindStory Next · AI 동화 마스터', '₩298,000', '카드', '결제완료', '08:44'],
  ['장서준', 'MindStory Next · 기술 융합', '₩298,000', '카드', '결제완료', '09:55'],
  ['유나연', 'MindStory Next', '₩298,000', '카드', '결제완료', '10:41'],
  ['권태양', 'MindStory Next · 심화 실전', '₩298,000', '무통장', '입금대기', '11:33'],
  // 메타인지 ×2
  ['박서윤', '메타인지 학습클리닉', '₩89,000', '카드', '결제완료', '09:16'],
  ['남기철', '메타인지 클리닉 · 심화', '₩89,000', '카드', '결제완료', '11:02'],
]

/** 오늘 결제·매출 상세 (신청 내역과 동일 건 기준 데모) */
export const mockTodayRevenueRows = mockTodayEnrollments.map((row, i) => {
  const ord = `ORD-260330-${String(i + 1).padStart(3, '0')}`
  return [ord, ...row]
})

/** 오늘 결제 성공 건만 (상세 모달용) */
export const mockTodayRevenueSuccessRows = mockTodayRevenueRows.filter((r) => r[5] === '결제완료')

/** 무통장 입금 확인 3건 */
export const mockActionBank = [
  ['이희훈', '₩298,000', '당일', 'MindStory Next', '08:44', '미확인'],
  ['홍승민', '₩150,000', '당일', 'MindStory Classic', '11:08', '미확인'],
  ['한소희', '₩150,000', '익일', 'MindStory Classic · 미술심리', '09:38', '미확인'],
]

/** B2B / 강사 승인 1건 */
export const mockActionB2b = [
  ['(주)에듀테크 · 강사 신청', '기관 소속 강사', '이력서·자격증', '오늘 09:12', '대기'],
]

/** 미답변 Q&A 4건 */
export const mockActionInquiry = [
  ['1:1', '로그인이 안 돼요 (카카오 연동)', '김기성', '08:22', '미답변'],
  ['Q&A', '수료증 발급 기준 문의 (진도 80%·시험)', '이광희', '09:05', '미답변'],
  ['1:1', '환급 일정 및 서류 제출처', '박민준', '09:48', '미답변'],
  ['Q&A', 'mOTP 출석이 반영되지 않아요', '최나원', '10:31', '미답변'],
]

/** 즉시 처리 필요 통합 큐 8건 = 무통장3 + B2B1 + 문의4 */
export const mockUrgentQueue = [
  ['입금', '무통장 입금 확인 — 이희훈 ₩298,000 (Next)', '운영', '긴급', '08:44'],
  ['입금', '무통장 입금 확인 — 홍승민 ₩150,000 (Classic)', '운영', '긴급', '11:08'],
  ['입금', '무통장 입금 확인 — 한소희 ₩150,000 (Classic)', '운영', '긴급', '09:38'],
  ['B2B', '(주)에듀테크 강사 권한 승인', '운영', '높음', '09:12'],
  ['문의', '로그인이 안 돼요 (카카오 연동)', 'CS', '보통', '08:22'],
  ['문의', '수료증 발급 기준 문의', 'CS', '보통', '09:05'],
  ['문의', '환급 일정 및 서류 제출처', 'CS', '보통', '09:48'],
  ['문의', 'mOTP 출석이 반영되지 않아요', 'CS', '높음', '10:31'],
]

/** 실시간 결제 내역 (8건 — 데모 실명) */
export const mockRecentPayments: HubRecentPaymentDemo[] = [
  {
    payerName: '김기성',
    course: 'MindStory Classic',
    amount: '₩ 150,000',
    status: '결제완료',
    statusTone: 'emerald',
    timeLabel: '10분 전',
  },
  {
    payerName: '이광희',
    course: 'MindStory Next',
    amount: '₩ 298,000',
    status: '입금대기',
    statusTone: 'amber',
    timeLabel: '32분 전',
  },
  {
    payerName: '박민준',
    course: 'MindStory Classic',
    amount: '₩ 150,000',
    status: '결제완료',
    statusTone: 'emerald',
    timeLabel: '1시간 전',
  },
  {
    payerName: '최나원',
    course: '메타인지 클리닉',
    amount: '₩ 89,000',
    status: '부분취소',
    statusTone: 'slate',
    timeLabel: '2시간 전',
  },
  {
    payerName: '정수아',
    course: 'MindStory Classic',
    amount: '₩ 150,000',
    status: '결제완료',
    statusTone: 'emerald',
    timeLabel: '어제 18:42',
  },
  {
    payerName: '강태우',
    course: 'MindStory Next',
    amount: '₩ 298,000',
    status: '결제완료',
    statusTone: 'emerald',
    timeLabel: '어제 16:10',
  },
  {
    payerName: '조하연',
    course: 'MindStory Classic · 부모자녀',
    amount: '₩ 150,000',
    status: '결제취소',
    statusTone: 'slate',
    timeLabel: '3시간 전',
  },
  {
    payerName: '송민훈',
    course: '공동훈련(NCS) 협약',
    amount: '₩ 0',
    status: '확인필요',
    statusTone: 'amber',
    timeLabel: '오늘 07:55',
  },
]

const statusClass: Record<HubRecentPaymentDemo['statusTone'], string> = {
  emerald: 'rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700',
  amber: 'rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800',
  slate: 'rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600',
}

export function buildAdminDashboardDemoTables(): Record<HubDashTableKey, HubDemoTable> {
  const enrollmentRowsForModal = mockTodayEnrollments.map((r) => r.slice(0, 5))
  return {
    'dash-new-signups': {
      title: '오늘 신규 가입 상세',
      subtitle: '데모 12명 · 이름 · 유형 · 소속 · 가입시간 · 상태',
      columns: ['이름', '유형', '소속', '가입시간', '상태', '처리'],
      actionLabel: '승인',
      rows: mockTodaySignups,
    },
    'dash-today-enrollments': {
      title: '오늘 수강 신청 상세',
      subtitle: '데모 18건 · Classic 12 · Next 4 · 메타인지 2',
      columns: ['신청자', '과정명', '결제금액', '결제수단', '상태', '처리'],
      actionLabel: '확인',
      rows: enrollmentRowsForModal,
    },
    'dash-today-revenue': {
      title: '오늘 결제 금액 · 성공 내역',
      subtitle: `데모 ${mockTodayRevenueSuccessRows.length}건 · 결제완료 건 (동일 mock 기준)`,
      columns: ['결제자', '과정명', '금액', '일시', '상태', '처리'],
      actionLabel: '확인',
      rows: mockTodayRevenueSuccessRows.map((r) => {
        const [, applicant, course, amount, , status, time] = r
        return [applicant, course, amount, time, status]
      }),
    },
    'dash-urgent-queue': {
      title: '즉시 처리 필요',
      subtitle: '데모 8건 — 섹션: 무통장 3 · B2B 1 · 미답변 4 · 열: 유형 / 대상자 / 내용 / 시간',
      columns: [],
      actionLabel: '처리',
      rows: [],
      layout: 'sections',
      sections: [
        {
          title: '무통장 입금 확인',
          subtitle: '3건',
          columns: ['유형', '대상자', '내용', '시간', '처리'],
          rows: [
            ['무통장', '이희훈', '입금 확인 — MindStory Next (₩298,000)', '08:44'],
            ['무통장', '홍승민', '입금 확인 — MindStory Classic (₩150,000)', '11:08'],
            ['무통장', '한소희', '입금 확인 — Classic · 미술심리 (₩150,000)', '09:38'],
          ],
          actionLabel: '입금 확인',
        },
        {
          title: 'B2B / 강사 승인',
          subtitle: '1건',
          columns: ['유형', '대상자', '내용', '시간', '처리'],
          rows: [['B2B', '(주)에듀테크', '강사 권한 승인 — 제출: 이력·자격증', '09:12']],
          actionLabel: '승인',
        },
        {
          title: '미답변 Q&A',
          subtitle: '4건',
          columns: ['유형', '대상자', '내용', '시간', '처리'],
          rows: [
            ['1:1', '김기성', '로그인이 안 돼요 (카카오 연동)', '08:22'],
            ['Q&A', '이광희', '수료증 발급 기준 문의 (진도·시험)', '09:05'],
            ['1:1', '박민준', '환급 일정 및 서류 제출처', '09:48'],
            ['Q&A', '최나원', 'mOTP 출석이 반영되지 않아요', '10:31'],
          ],
          actionLabel: '답변',
        },
      ],
    },
    'dash-action-bank': {
      title: '무통장 입금 확인 대기',
      subtitle: '데모 3건 (요약 배지와 동일) · 입금자·금액 확인 후 승인',
      columns: ['입금자', '금액', '입금예정일', '강좌', '접수', '상태', '처리'],
      actionLabel: '승인',
      rows: mockActionBank,
    },
    'dash-action-b2b': {
      title: 'B2B / 강사 권한 승인 대기',
      subtitle: '데모 1건 (요약 배지와 동일)',
      columns: ['기관 · 신청', '요청 유형', '제출 서류', '접수', '상태', '처리'],
      actionLabel: '승인',
      rows: mockActionB2b,
    },
    'dash-action-inquiry': {
      title: '미답변 1:1 문의 · Q&A',
      subtitle: '데모 4건 (요약 배지와 동일)',
      columns: ['채널', '제목', '회원', '접수', '상태', '처리'],
      actionLabel: '답변 완료',
      rows: mockActionInquiry,
    },
  }
}

/** HTML 인라인 스크립트용 — 브라우저 전역에서 테이블·결제 목록 렌더 */
/** 교육·출판·시스템 기둥 — 목록 모달용 데모 (API 버튼과 병행) */
export function buildHubPillarDemoTables(): Record<string, HubDemoTable> {
  return {
    'edu-exam-questions': {
      title: '시험 · 문항 관리 (데모)',
      subtitle: '문항 은행 · 난이도 · 최종 수정',
      columns: ['시험명', '문항 수', '상태', '최종 수정', '처리'],
      actionLabel: '편집',
      rows: [
        ['Classic 기말고사 A', '24', '게시', '2026-03-28', ''],
        ['Next 모듈 퀴즈 3', '12', '초안', '2026-03-27', ''],
      ],
    },
    'edu-exam-attempts': {
      title: '응시 현황 (데모)',
      subtitle: '최근 응시 · 제출 시간',
      columns: ['응시자', '시험', '점수', '제출일시', '처리'],
      actionLabel: '상세',
      rows: [
        ['김민수', 'Classic 기말고사 A', '88', '2026-03-30 14:22', ''],
        ['이영희', 'Next 모듈 퀴즈 3', '72', '2026-03-30 11:05', ''],
      ],
    },
    'edu-exam-grading': {
      title: '채점 대기 목록 (데모)',
      subtitle: '서술형·실기 채점 큐',
      columns: ['응시자', '시험', '문항', '제출', '상태', '처리'],
      actionLabel: '채점',
      rows: [['박철수', '서술형 B', '문항 5번', '2026-03-29', '대기', '']],
    },
    'edu-cohort': {
      title: '차수 · 개강 일정 (데모)',
      subtitle: '과정별 차수 · 정원',
      columns: ['과정', '차수', '개강일', '정원', '상태', '처리'],
      actionLabel: '수정',
      rows: [
        ['MindStory Classic', '2026-1기', '2026-04-07', '40', '모집중', ''],
        ['MindStory Next', '2026-2기', '2026-04-14', '30', '대기', ''],
      ],
    },
    'edu-classroom-links': {
      title: '강의실 바로가기 (데모)',
      subtitle: '외부 LMS·Zoom 연동 링크',
      columns: ['과정', '링크 유형', 'URL', '비고', '처리'],
      actionLabel: '열기',
      rows: [
        ['Classic 진로캠프', 'Zoom', 'https://zoom.us/j/…', '패스코드: ****', ''],
        ['Next AI 동화', 'Notion', 'https://notion.so/…', '읽기 전용', ''],
      ],
    },
    'edu-instructor-mgmt': {
      title: '강사 · 정산 (데모)',
      subtitle: '배정 강의 · 정산 요율',
      columns: ['강사명', '배정 강의', '요율', '이번 달 정산', '상태', '처리'],
      actionLabel: '정산',
      rows: [
        ['이교수', 'Classic · 메타인지', '35%', '₩1,200,000', '검토중', ''],
        ['김코치', 'Next · 심화', '40%', '₩890,000', '완료', ''],
      ],
    },
    'pub-isbn-requests': {
      title: 'ISBN 신청 · 등록 (데모)',
      subtitle: '국립중앙도서관 신청 현황',
      columns: ['도서명', '신청일', 'ISBN', '상태', '처리'],
      actionLabel: '확인',
      rows: [
        ['마인드스토리 가이드 2026', '2026-03-20', '978-89-12345-67-8', '등록완료', ''],
        ['실전 코칭 워크북', '2026-03-25', '(대기)', '심사중', ''],
      ],
    },
    'pub-authors': {
      title: '저자 · 역자 · 인세 (데모)',
      subtitle: '계약·인세 정산',
      columns: ['이름', '구분', '도서', '인세율', '정산월', '처리'],
      actionLabel: '보기',
      rows: [
        ['박종석', '저자', '가이드 2026', '8%', '2026-04', ''],
        ['김번역', '역자', '워크북', '4%', '2026-04', ''],
      ],
    },
    'sys-ai-agent': {
      title: 'AI 에이전트 설정 (데모)',
      subtitle: '페르소나 · 모델 · 로그 요약',
      columns: ['항목', '값', '최종 수정', '비고', '처리'],
      actionLabel: '편집',
      rows: [
        ['페르소나', '친절한 학습 코치', '2026-03-15', '프롬프트 v3', ''],
        ['모델', 'gpt-4o', '2026-03-01', '환경변수', ''],
      ],
    },
    'sys-site-content': {
      title: '사이트 기본 설정 (데모)',
      subtitle: '로고·배너·약관 버전',
      columns: ['영역', '상태', '최종 반영', '담당', '처리'],
      actionLabel: '편집',
      rows: [
        ['메인 배너', '게시중', '2026-03-28', '운영', ''],
        ['이용약관', 'v2.3', '2026-02-01', '법무', ''],
      ],
    },
    'sys-admin-accounts': {
      title: '관리자 계정 (데모)',
      subtitle: '부관리자 · 마지막 접속',
      columns: ['이메일', '역할', '마지막 IP', '접속일시', '처리'],
      actionLabel: '권한',
      rows: [
        ['admin@mindstory.co.kr', '최고', '203.x.x.x', '2026-03-30 09:12', ''],
        ['ops@example.com', '운영', '104.x.x.x', '2026-03-29 18:40', ''],
      ],
    },
    'sys-db-monitor': {
      title: 'DB 모니터링 (데모)',
      subtitle: '용량·백업 상태 (실제는 D1 대시보드와 연동)',
      columns: ['항목', '값', '기준일', '상태', '처리'],
      actionLabel: '새로고침',
      rows: [
        ['D1 용량', '~ (Wrangler)', '2026-03-30', '정상', ''],
        ['마이그레이션', '최신', '2026-03-30', '동기화', ''],
      ],
    },
  }
}

export function getAdminDashboardMockInlinePayload(): {
  tables: Record<string, HubDemoTable>
  recentPayments: HubRecentPaymentDemo[]
} {
  return {
    tables: {
      ...(buildAdminDashboardDemoTables() as Record<string, HubDemoTable>),
      ...buildHubPillarDemoTables(),
    },
    recentPayments: mockRecentPayments,
  }
}

export function renderRecentPaymentsHtml(items: HubRecentPaymentDemo[]): string {
  return items
    .map(
      (p) => `
            <li class="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 first:pt-0">
              <span class="font-medium text-slate-900">${escapeHtmlLite(p.payerName)}</span>
              <span class="text-slate-500">${escapeHtmlLite(p.course)}</span>
              <span class="ml-auto font-semibold text-slate-800 tabular-nums">${escapeHtmlLite(p.amount)}</span>
              <span class="${statusClass[p.statusTone]}">${escapeHtmlLite(p.status)}</span>
              <span class="text-xs text-slate-400 w-full sm:w-auto sm:ml-auto">${escapeHtmlLite(p.timeLabel)}</span>
            </li>`,
    )
    .join('')
}

function escapeHtmlLite(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
