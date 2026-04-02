/**
 * 회원 상세 슬라이드 패널 — 관제탑(/admin/dashboard) · 회원 전용 페이지(/admin/members) 공통
 * admin-hub.js 의 데모 프로필(openHubMemberDetailPanel)과 연동됩니다.
 */
;(function () {
  let hubMemberDetailEsc = null

  function hubEscapeHtml(s) {
    if (s == null) return ''
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function hubFillMemberDetailPanel(profile) {
    const set = (id, v) => {
      const el = document.getElementById(id)
      if (el) el.textContent = v
    }
    set('hubMemberFieldName', profile.displayName)
    set('hubMemberFieldEmail', profile.email)
    set('hubMemberFieldPhone', profile.phone)
    set('hubMemberFieldJoined', profile.joinedAt)
    set('hubMemberFieldLastAccess', profile.lastAccess)
    set('hubMemberFieldPayRecent', profile.paymentRecent)
    set('hubMemberFieldPayTotal', profile.paymentTotal)
    const orgHeadline = document.getElementById('hubMemberOrgHeadline')
    if (orgHeadline) {
      if (profile.memberType === 'B2B' && profile.company && profile.company !== '—') {
        orgHeadline.textContent = '소속 기관: ' + profile.company
        orgHeadline.classList.remove('hidden')
      } else {
        orgHeadline.textContent = ''
        orgHeadline.classList.add('hidden')
      }
    }

    const tags = document.getElementById('hubMemberFieldTags')
    if (tags) {
      const typeLabel =
        profile.memberType === 'B2B'
          ? 'B2B · ' + profile.company
          : profile.memberType === '강사'
            ? '강사 · ' + profile.company
            : '일반 회원'
      const statusCls =
        profile.accountStatus === '승인 대기'
          ? 'bg-amber-100 text-amber-900 ring-amber-600/20'
          : profile.accountStatus === '정지'
            ? 'bg-rose-100 text-rose-900 ring-rose-600/20'
            : profile.accountStatus === '관리자'
              ? 'bg-slate-100 text-slate-800 ring-slate-500/20'
              : 'bg-emerald-100 text-emerald-900 ring-emerald-600/20'
      tags.innerHTML =
        '<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ' +
        profile.typeTagClass +
        '">' +
        hubEscapeHtml(typeLabel) +
        '</span>' +
        '<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ' +
        statusCls +
        '">상태: ' +
        hubEscapeHtml(profile.accountStatus) +
        '</span>'
    }

    const coursesEl = document.getElementById('hubMemberFieldCourses')
    if (coursesEl && profile.courses) {
      coursesEl.innerHTML = profile.courses
        .map(
          (c) =>
            '<div class="min-w-0">' +
            '<div class="flex justify-between gap-2 text-xs mb-1"><span class="text-slate-800 font-medium truncate">' +
            hubEscapeHtml(c.title) +
            '</span><span class="text-slate-500 shrink-0 tabular-nums">' +
            c.progress +
            '%</span></div>' +
            '<div class="h-2 rounded-full bg-slate-100 overflow-hidden ring-1 ring-slate-200/80">' +
            '<div class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all" style="width:' +
            c.progress +
            '%"></div></div></div>',
        )
        .join('')
    }
  }

  function hubMemberDetailRunOpenAnimation() {
    const wrap = document.getElementById('hubMemberDetailPanel')
    const aside = document.getElementById('hubMemberDetailAside')
    if (!wrap || !aside) return
    wrap.classList.remove('hidden')
    wrap.setAttribute('aria-hidden', 'false')
    requestAnimationFrame(() => {
      aside.classList.remove('translate-x-full')
    })

    if (hubMemberDetailEsc) {
      document.removeEventListener('keydown', hubMemberDetailEsc, true)
      hubMemberDetailEsc = null
    }
    hubMemberDetailEsc = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        closeHubMemberDetailPanel()
      }
    }
    document.addEventListener('keydown', hubMemberDetailEsc, true)
  }

  function closeHubMemberDetailPanel() {
    const wrap = document.getElementById('hubMemberDetailPanel')
    const aside = document.getElementById('hubMemberDetailAside')
    if (hubMemberDetailEsc) {
      document.removeEventListener('keydown', hubMemberDetailEsc, true)
      hubMemberDetailEsc = null
    }
    if (aside) aside.classList.add('translate-x-full')
    setTimeout(() => {
      if (wrap) {
        wrap.classList.add('hidden')
        wrap.setAttribute('aria-hidden', 'true')
      }
    }, 280)
  }

  async function hubBuildMemberProfileFromApi(userId, displayName) {
    const res = await apiRequest('GET', '/api/admin/users/' + userId)
    const enr = await apiRequest('GET', '/api/admin/users/' + userId + '/enrollments')
    if (!res.success || !res.data) {
      throw new Error(res.error || res.message || '회원 정보를 불러오지 못했습니다.')
    }
    const u = res.data
    const enrollRows = enr.success && Array.isArray(enr.data) ? enr.data : []

    const statusRaw = u.status != null ? String(u.status) : 'active'
    let accountStatus = '활성'
    if (statusRaw === 'pending') accountStatus = '승인 대기'
    else if (statusRaw === 'suspended' || statusRaw === 'banned') accountStatus = '정지'
    else if (statusRaw === 'inactive') accountStatus = '비활성'
    else if (u.role === 'admin') accountStatus = '관리자'

    const company = String(u.organization_name || u.company_name || '').trim()
    const role = String(u.role || '')
    let memberType = '일반'
    let typeTagClass = 'bg-slate-100 text-slate-700 ring-1 ring-slate-500/15'
    if (role === 'instructor' || role === 'teacher') {
      memberType = '강사'
      typeTagClass = 'bg-amber-100 text-amber-900 ring-1 ring-amber-500/25'
    } else if (company) {
      memberType = 'B2B'
      typeTagClass = 'bg-violet-100 text-violet-900 ring-1 ring-violet-500/20'
    }

    const courses =
      enrollRows.length > 0
        ? enrollRows.slice(0, 8).map((e) => ({
            title: String(e.course_title || '과정'),
            progress: Math.min(100, Math.round(Number(e.avg_progress != null ? e.avg_progress : e.progress ?? 0))),
          }))
        : [{ title: '수강 중인 과정 없음', progress: 0 }]

    const pm = u.payments || {}
    const totalPaid = Number(pm.total_paid || 0)
    const lastPay = pm.last_payment_date
    const paymentRecent = lastPay
      ? '누적 ' + '₩' + totalPaid.toLocaleString('ko-KR') + ' · 최근 ' + formatDateTime(lastPay)
      : totalPaid > 0
        ? '₩' + totalPaid.toLocaleString('ko-KR')
        : '내역 없음'
    const paymentTotal = '₩' + totalPaid.toLocaleString('ko-KR')

    const lastAccess = u.last_login_at ? formatDateTime(u.last_login_at) : '—'

    return {
      userId,
      displayName: u.name || displayName || '회원',
      email: u.email || '—',
      phone: u.phone || '—',
      joinedAt: formatDateTime(u.created_at),
      lastAccess,
      memberType,
      company: company || '—',
      typeTagClass,
      accountStatus,
      courses,
      paymentRecent,
      paymentTotal,
    }
  }

  async function openHubMemberDetailFromApi(userId, displayName) {
    const wrap = document.getElementById('hubMemberDetailPanel')
    if (!wrap) return
    try {
      const profile = await hubBuildMemberProfileFromApi(userId, displayName)
      hubFillMemberDetailPanel(profile)
      const title = document.getElementById('hubMemberDetailTitle')
      if (title) title.textContent = profile.displayName + ' · 회원 상세'
      const sub = document.getElementById('hubMemberDetailSubtitle')
      if (sub) sub.textContent = 'DB 연동 프로필'
      hubMemberDetailRunOpenAnimation()
    } catch (e) {
      const msg = e && e.message ? e.message : '조회 실패'
      if (typeof showToast === 'function') showToast(msg, 'error')
      else alert(msg)
    }
  }

  function bindHubMemberDetailPanel() {
    if (window.__hubMemberDetailPanelBound) return
    window.__hubMemberDetailPanelBound = true
    document.addEventListener('click', (e) => {
      const a = e.target.closest('.member-detail-trigger')
      if (!a) return
      const inDashModal = document.getElementById('hubDashboardDetailModal')?.contains(a)
      const inMembersPage = document.getElementById('adminMembersPageRoot')?.contains(a)
      const inEduDash = document.getElementById('panel-edu-dashboard')?.contains(a)
      const inPubDash = document.getElementById('panel-pub-dashboard')?.contains(a)
      if (!inDashModal && !inMembersPage && !inEduDash && !inPubDash) return
      e.preventDefault()
      e.stopPropagation()
      const userId = a.getAttribute('data-user-id') || ''
      if (/^\d+$/.test(String(userId))) {
        openHubMemberDetailFromApi(userId, (a.textContent || '').trim())
        return
      }
      const tableKind = a.getAttribute('data-table-kind') || ''
      const rowIndex = parseInt(a.getAttribute('data-row-index'), 10)
      const sec = a.getAttribute('data-section-index')
      const sectionIndex = sec !== null && sec !== '' ? parseInt(sec, 10) : undefined
      const fn = window.openHubMemberDetailPanel
      if (typeof fn === 'function') fn(userId, tableKind, rowIndex, sectionIndex, (a.textContent || '').trim())
    })

    document.getElementById('hubMemberDetailPanel')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.hub-member-action-btn')
      if (!btn) return
      const act = btn.getAttribute('data-hub-member-action') || ''
      const labels = {
        'temp-pw': '임시 비밀번호 발급',
        'b2b-approve': 'B2B/강사 권한 승인',
        'manual-enroll': '강제 수강 신청',
        suspend: '계정 정지',
      }
      const msg = '데모: 「' + (labels[act] || act) + '」은(는) API 연동 후 사용 가능합니다.'
      if (typeof window.hubToastBottom === 'function') window.hubToastBottom(msg)
      else if (typeof showToast === 'function') showToast(msg, 'info')
      else alert(msg)
    })
  }

  window.closeHubMemberDetailPanel = closeHubMemberDetailPanel
  window.hubFillMemberDetailPanel = hubFillMemberDetailPanel
  window.hubMemberDetailRunOpenAnimation = hubMemberDetailRunOpenAnimation
  window.openHubMemberDetailFromApi = openHubMemberDetailFromApi

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindHubMemberDetailPanel)
  } else {
    bindHubMemberDetailPanel()
  }
})()
