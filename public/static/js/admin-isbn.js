/**
 * 출판 승인 대기열 — #publishing 패널 (관제탑 GNB 연동)
 * 의존: auth.js, utils.js(apiRequest, showToast), admin-hub.js(applyHashRoute 시 로드)
 */

;(function () {
  let selectedId = null

  function escapeHtml(s) {
    if (s == null) return ''
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function closeSlideOver() {
    const el = document.getElementById('publishingSlideOver')
    const back = document.getElementById('publishingSlideBackdrop')
    if (el) {
      el.classList.add('translate-x-full')
      el.setAttribute('aria-hidden', 'true')
    }
    if (back) {
      back.classList.add('opacity-0', 'pointer-events-none')
      back.setAttribute('aria-hidden', 'true')
    }
    selectedId = null
  }

  function openSlideOver() {
    const el = document.getElementById('publishingSlideOver')
    const back = document.getElementById('publishingSlideBackdrop')
    if (el) {
      el.classList.remove('translate-x-full')
      el.setAttribute('aria-hidden', 'false')
    }
    if (back) {
      back.classList.remove('opacity-0', 'pointer-events-none')
      back.setAttribute('aria-hidden', 'false')
    }
  }

  function setPdfPreview(url) {
    const wrap = document.getElementById('publishingPdfWrap')
    const iframe = document.getElementById('publishingPdfIframe')
    const err = document.getElementById('publishingPdfError')
    const link = document.getElementById('publishingPdfLink')
    if (!wrap || !iframe || !err || !link) return
    err.classList.add('hidden')
    iframe.classList.remove('hidden')
    link.href = url || '#'
    link.textContent = url ? '새 탭에서 원고 열기' : ''

    if (!url) {
      iframe.classList.add('hidden')
      err.textContent = '원고 URL이 없습니다.'
      err.classList.remove('hidden')
      return
    }

    try {
      iframe.removeAttribute('src')
      iframe.src = url
      iframe.onload = function () {
        try {
          if (iframe.contentDocument && iframe.contentDocument.body && iframe.contentDocument.body.innerText.includes('404')) {
            throw new Error('not found')
          }
        } catch {
          /* cross-origin: 정상 */
        }
      }
      iframe.onerror = function () {
        iframe.classList.add('hidden')
        err.textContent = 'PDF 미리보기를 불러오지 못했습니다. 아래 링크로 직접 여세요.'
        err.classList.remove('hidden')
      }
      window.setTimeout(function () {
        if (!iframe.src) return
      }, 8000)
    } catch (e) {
      iframe.classList.add('hidden')
      err.textContent = '미리보기 설정 오류: ' + (e.message || 'unknown')
      err.classList.remove('hidden')
    }
  }

  async function loadDetail(id) {
    selectedId = id
    const res = await apiRequest('GET', '/api/admin/book-submissions/' + id)
    const titleEl = document.getElementById('publishingDetailTitle')
    const metaEl = document.getElementById('publishingDetailMeta')
    const sumEl = document.getElementById('publishingDetailSummary')
    const intentEl = document.getElementById('publishingDetailIntent')
    if (!res.success || !res.data) {
      if (typeof showToast === 'function') showToast(res.error || '불러오기 실패', 'error')
      return
    }
    const d = res.data
    if (titleEl) titleEl.textContent = d.title || '제목 없음'
    if (metaEl) {
      metaEl.innerHTML =
        '<p><strong>작가명</strong> ' +
        escapeHtml(d.author_name) +
        '</p><p><strong>회원</strong> ' +
        escapeHtml(d.user_name || '') +
        ' &lt;' +
        escapeHtml(d.user_email || '') +
        '&gt;</p><p class="text-xs text-slate-500">제출 #' +
        d.id +
        ' · ' +
        escapeHtml(d.status) +
        '</p>'
    }
    if (sumEl) sumEl.textContent = d.summary || '—'
    if (intentEl) intentEl.textContent = d.author_intent || '—'

    ;['chkCopyright', 'chkContent', 'chkImage'].forEach(function (id) {
      const c = document.getElementById(id)
      if (c) c.checked = false
    })

    setPdfPreview(d.manuscript_url || '')
    openSlideOver()
  }

  async function refreshTable() {
    const tbody = document.getElementById('publishingQueueBody')
    if (!tbody) return
    tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-slate-500">불러오는 중…</td></tr>'
    const res = await apiRequest('GET', '/api/admin/book-submissions?status=pending')
    if (!res.success) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="p-4 text-red-600">' + escapeHtml(res.error || '목록 실패') + '</td></tr>'
      return
    }
    const rows = res.data || []
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-slate-500">대기 중인 제출이 없습니다.</td></tr>'
      return
    }
    tbody.innerHTML = rows
      .map(function (r) {
        return (
          '<tr class="border-t border-slate-100 cursor-pointer hover:bg-slate-50 publishing-row" data-id="' +
          r.id +
          '">' +
          '<td class="p-3 font-mono text-xs">' +
          r.id +
          '</td>' +
          '<td class="p-3">' +
          escapeHtml(r.title) +
          '</td>' +
          '<td class="p-3">' +
          escapeHtml(r.author_name) +
          '</td>' +
          '<td class="p-3 text-xs">' +
          escapeHtml(r.user_name || '') +
          '</td>' +
          '<td class="p-3 text-xs text-slate-500">' +
          escapeHtml((r.created_at || '').slice(0, 16)) +
          '</td>' +
          '<td class="p-3 text-center text-indigo-600 text-sm">검수</td>' +
          '</tr>'
        )
      })
      .join('')

    tbody.querySelectorAll('.publishing-row').forEach(function (tr) {
      tr.addEventListener('click', function () {
        const id = parseInt(tr.getAttribute('data-id'), 10)
        if (!Number.isNaN(id)) loadDetail(id)
      })
    })
  }

  async function onApprove() {
    if (!selectedId) return
    const stats = await apiRequest('GET', '/api/admin/isbn/stats')
    const avail = stats.success ? Number(stats.data?.available ?? 0) : 0
    if (avail < 1) {
      if (typeof showToast === 'function') {
        showToast('사용 가능한 ISBN이 없습니다. ISBN·출판 탭에서 재고를 등록하세요.', 'error')
      } else {
        alert('사용 가능한 ISBN이 없습니다.')
      }
      return
    }
    const c1 = document.getElementById('chkCopyright')
    const c2 = document.getElementById('chkContent')
    const c3 = document.getElementById('chkImage')
    if (c1 && c2 && c3 && (!c1.checked || !c2.checked || !c3.checked)) {
      if (!confirm('검수 체크리스트가 모두 체크되지 않았습니다. 그래도 승인할까요?')) return
    }
    const res = await apiRequest('POST', '/api/admin/publish/approve', { submission_id: selectedId })
    if (res.success) {
      if (typeof showToast === 'function') showToast('승인 및 ISBN 할당 완료', 'success')
      closeSlideOver()
      refreshTable()
    } else {
      if (typeof showToast === 'function') showToast(res.error || '승인 실패', 'error')
      else alert(res.error || '승인 실패')
    }
  }

  async function onReject() {
    if (!selectedId) return
    const reason = window.prompt('반려 사유를 입력하세요.')
    if (reason === null) return
    if (!String(reason).trim()) {
      alert('사유가 필요합니다.')
      return
    }
    const res = await apiRequest('POST', '/api/admin/publish/reject', {
      submission_id: selectedId,
      reason: String(reason).trim(),
    })
    if (res.success) {
      if (typeof showToast === 'function') showToast('반려 처리되었습니다.', 'success')
      closeSlideOver()
      refreshTable()
    } else {
      if (typeof showToast === 'function') showToast(res.error || '반려 실패', 'error')
      else alert(res.error || '반려 실패')
    }
  }

  window.loadPublishingQueue = function () {
    refreshTable()
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('publishingSlideClose')?.addEventListener('click', closeSlideOver)
    document.getElementById('publishingSlideBackdrop')?.addEventListener('click', closeSlideOver)
    document.getElementById('publishingBtnApprove')?.addEventListener('click', onApprove)
    document.getElementById('publishingBtnReject')?.addEventListener('click', onReject)
    if ((location.hash || '').replace(/^#/, '') === 'publishing') {
      refreshTable()
    }
  })
})()
