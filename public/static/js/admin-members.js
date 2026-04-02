/**
 * /admin/members — 회원 목록 전용 페이지
 */
;(function () {
  let membersPage = 1
  let membersType = 'all'
  let membersQ = ''
  /** '' | 'no_progress' | 'b2b_pending' | 'inactive_7d' | 'unpaid' | 'today_signup' */
  let membersQuickFilter = ''
  const VALID_TYPES = new Set(['all', 'general', 'b2b', 'instructor'])
  const VALID_QUICK_FILTERS = new Set(['', 'no_progress', 'b2b_pending', 'inactive_7d', 'unpaid', 'today_signup'])

  function escapeHtml(s) {
    if (s == null) return ''
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function setTypeButtonsActive() {
    document.querySelectorAll('.admin-members-type-btn').forEach((btn) => {
      const t = btn.getAttribute('data-member-type')
      const on = t === membersType
      btn.classList.toggle('bg-indigo-600', on)
      btn.classList.toggle('text-white', on)
      btn.classList.toggle('font-medium', on)
      btn.classList.toggle('text-slate-700', !on)
      btn.classList.toggle('hover:bg-white', !on)
    })
  }

  function setQuickFilterButtonsActive() {
    document.querySelectorAll('.admin-members-quick-btn').forEach((btn) => {
      const f = btn.getAttribute('data-member-quick-filter') || ''
      const on = f === membersQuickFilter
      btn.classList.toggle('bg-indigo-600', on)
      btn.classList.toggle('border-indigo-500', on)
      btn.classList.toggle('text-white', on)
      btn.classList.toggle('ring-2', on)
      btn.classList.toggle('ring-indigo-300', on)
      btn.classList.toggle('bg-slate-50', !on)
      btn.classList.toggle('border-slate-200', !on)
      btn.classList.toggle('text-slate-800', !on)
    })
  }

  async function loadMembers() {
    const tbody = document.getElementById('adminMembersTableBody')
    const pag = document.getElementById('adminMembersPagination')
    const meta = document.getElementById('adminMembersCountMeta')
    if (!tbody) return

    const qs = new URLSearchParams({
      page: String(membersPage),
      limit: '50',
    })
    if (membersType && membersType !== 'all') qs.set('type', membersType)
    if (membersQ) qs.set('q', membersQ)
    if (membersQuickFilter) qs.set('filter', membersQuickFilter)

    tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-slate-500">불러오는 중…</td></tr>'
    if (pag) pag.innerHTML = ''

    const res = await apiRequest('GET', '/api/admin/users?' + qs.toString())
    if (!res.success || !res.data) {
      tbody.innerHTML =
        '<tr><td colspan="8" class="p-4 text-red-600">' + escapeHtml(res.error || res.message || '목록을 불러오지 못했습니다.') + '</td></tr>'
      return
    }

    const rows = res.data
    const total = res.pagination?.total ?? 0
    const totalPages = res.pagination?.totalPages ?? 1
    const page = res.pagination?.page ?? 1

    if (meta) {
      meta.textContent =
        '총 ' +
        total.toLocaleString('ko-KR') +
        '명 · ' +
        page +
        '/' +
        totalPages +
        ' 페이지 (페이지당 50명)'
    }

    const showApproveAction = membersQuickFilter === 'b2b_pending'
    tbody.innerHTML = rows.length
      ? rows
          .map((u) => {
            const name = escapeHtml(u.name || '')
            const uid = String(u.id)
            const seg = escapeHtml(u.segment_label || '—')
            const company = escapeHtml(((u.organization_name || u.company_name || '—') + '').trim() || '—')
            const email = escapeHtml(u.email || '')
            const joined = formatDateTime(u.created_at)
            const last = u.last_access_at ? formatDateTime(u.last_access_at) : '—'
            const st = escapeHtml(
              u.status_label ||
                (typeof adminStatusLabelKo === 'function' ? adminStatusLabelKo(u.status) : '') ||
                '활성',
            )
            const approveBtn = showApproveAction
              ? '<button type="button" class="admin-members-approve-btn inline-flex items-center rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700" data-user-id="' +
                escapeHtml(uid) +
                '">즉시 승인</button>'
              : '<span class="text-slate-300">—</span>'
            return (
              '<tr class="border-t border-slate-100 hover:bg-slate-50">' +
              '<td class="p-3">' +
              '<a href="#" class="member-detail-trigger text-indigo-600 hover:underline font-medium" data-user-id="' +
              escapeHtml(uid) +
              '">' +
              name +
              '</a></td>' +
              '<td class="p-3">' +
              seg +
              '</td>' +
              '<td class="p-3 text-slate-700">' +
              company +
              '</td>' +
              '<td class="p-3 text-slate-600 break-all max-w-[14rem]">' +
              email +
              '</td>' +
              '<td class="p-3 text-xs text-slate-600 whitespace-nowrap">' +
              joined +
              '</td>' +
              '<td class="p-3 text-xs text-slate-600 whitespace-nowrap">' +
              last +
              '</td>' +
              '<td class="p-3 text-xs">' +
              st +
              '</td>' +
              '<td class="p-3 text-right">' +
              approveBtn +
              '</td>' +
              '</tr>'
            )
          })
          .join('')
      : '<tr><td colspan="8" class="p-8 text-center text-slate-500">조건에 맞는 회원이 없습니다.</td></tr>'

    if (!pag) return
    pag.innerHTML = ''
    if (page > 1) {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50'
      b.textContent = '이전'
      b.addEventListener('click', () => {
        membersPage = page - 1
        loadMembers()
      })
      pag.appendChild(b)
    }
    const span = document.createElement('span')
    span.className = 'px-2 text-sm text-slate-600'
    span.textContent = page + ' / ' + totalPages
    pag.appendChild(span)
    if (page < totalPages) {
      const b2 = document.createElement('button')
      b2.type = 'button'
      b2.className = 'px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50'
      b2.textContent = '더보기'
      b2.addEventListener('click', () => {
        membersPage = page + 1
        loadMembers()
      })
      pag.appendChild(b2)
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireAdmin()
    if (!user) return

    const search = document.getElementById('adminMembersSearch')
    const searchBtn = document.getElementById('adminMembersSearchBtn')
    const typeWrap = document.getElementById('adminMembersTypeFilter')
    const quickWrap = document.getElementById('adminMembersQuickFilter')

    // 링크 진입 시 URL 파라미터를 우선 적용 (예: /admin/members?type=b2b&filter=b2b_pending)
    const params = new URLSearchParams(location.search || '')
    const typeParam = (params.get('type') || '').trim().toLowerCase()
    const filterParam = (params.get('filter') || '').trim().toLowerCase()
    const qParam = (params.get('q') || '').trim()
    if (VALID_TYPES.has(typeParam)) membersType = typeParam
    if (VALID_QUICK_FILTERS.has(filterParam)) membersQuickFilter = filterParam
    if (qParam) membersQ = qParam
    if (search && membersQ) search.value = membersQ

    quickWrap?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-member-quick-filter]')
      if (!btn) return
      const f = btn.getAttribute('data-member-quick-filter') || ''
      if (!f) return
      if (membersQuickFilter === f) {
        membersQuickFilter = ''
      } else {
        membersQuickFilter = f
      }
      membersPage = 1
      setQuickFilterButtonsActive()
      loadMembers()
    })

    document.getElementById('adminMembersTableBody')?.addEventListener('click', async (e) => {
      const btn = e.target.closest('.admin-members-approve-btn')
      if (!btn) return
      const userId = btn.getAttribute('data-user-id')
      if (!userId) return
      btn.disabled = true
      const old = btn.textContent
      btn.textContent = '처리중...'
      try {
        const resApprove = await apiRequest('POST', '/api/admin/users/' + userId + '/approve', {})
        if (resApprove.success) {
          if (typeof showToast === 'function') showToast('가입 승인이 완료되었습니다.', 'success')
          await loadMembers()
        } else {
          if (typeof showToast === 'function') showToast(resApprove.error || '승인 처리 실패', 'error')
          btn.disabled = false
          btn.textContent = old || '즉시 승인'
        }
      } catch {
        if (typeof showToast === 'function') showToast('승인 처리 중 오류가 발생했습니다.', 'error')
        btn.disabled = false
        btn.textContent = old || '즉시 승인'
      }
    })

    typeWrap?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-member-type]')
      if (!btn) return
      const t = btn.getAttribute('data-member-type')
      if (!t) return
      membersType = t
      membersPage = 1
      setTypeButtonsActive()
      loadMembers()
    })

    searchBtn?.addEventListener('click', () => {
      membersQ = (search && search.value ? search.value : '').trim()
      membersPage = 1
      loadMembers()
    })
    search?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        membersQ = (search.value || '').trim()
        membersPage = 1
        loadMembers()
      }
    })

    setTypeButtonsActive()
    setQuickFilterButtonsActive()
    await loadMembers()
  })
})()
