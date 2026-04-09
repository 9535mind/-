/**
 * 마인드스토리 원격평생교육원 — 중앙 관제탑 (단일 셸, 탭 + 모달)
 * utils.js 의 apiRequest(fetch) 사용 (auth.js 이후 로드 가정)
 */

/** URL 해시와 <section id="panel-*"> 가 일치해야 함 */
const HUB_VALID_PANELS = new Set([
  'dashboard',
  'edu-dashboard',
  'members',
  'b2b',
  'enrollments',
  'payments',
  'courses',
  'videos',
  'certificates',
  'instructors',
  'publishing',
  'pub-dashboard',
  'isbn',
  'ai-cost',
  'support',
  'sys-dashboard',
  'popups',
  'settings',
  'offline-meetups',
  'academic-dashboard',
])

const PANEL_TO_GROUP = {
  dashboard: 'ops',
  'edu-dashboard': 'edu-courses',
  members: 'ops',
  b2b: 'ops',
  enrollments: 'ops',
  payments: 'ops',
  courses: 'edu-courses',
  videos: 'edu-courses',
  instructors: 'edu-courses',
  certificates: 'edu-academic',
  publishing: 'pub',
  'pub-dashboard': 'pub',
  isbn: 'pub',
  'ai-cost': 'pub',
  support: 'sys',
  'sys-dashboard': 'sys',
  popups: 'sys',
  settings: 'sys',
  'offline-meetups': 'edu-academic',
  'academic-dashboard': 'edu-academic',
}

let hubUserPage = 1
let currentUserId = null
let currentCourseId = null
let courseModalLessons = []
let hubDescAiGen = 0
let hubCourseTitleAiTimer = null
let hubCourseFormOptions = null

function toIntOr(value, fallback = 0) {
  const n = parseInt(String(value ?? ''), 10)
  return Number.isFinite(n) ? n : fallback
}

async function loadCourseFormOptions(forceReload) {
  if (hubCourseFormOptions && !forceReload) return hubCourseFormOptions
  const res = await apiRequest('GET', '/api/admin/course-form-options')
  if (res.success && res.data) {
    hubCourseFormOptions = {
      instructors: Array.isArray(res.data.instructors) ? res.data.instructors : [],
      certificate_types: Array.isArray(res.data.certificate_types) ? res.data.certificate_types : [],
    }
  } else {
    hubCourseFormOptions = { instructors: [], certificate_types: [] }
  }
  return hubCourseFormOptions
}

window.invalidateHubCourseFormOptions = function () {
  hubCourseFormOptions = null
}

let hubInstructorsCache = []
let hubInstructorSaveBusy = false
window.hubInstructorPreviewObjectUrl = null

function hubInstructorThumbCellHtml(row) {
  const url = row.profile_image ? String(row.profile_image) : ''
  const ai = Number(row.profile_image_ai) === 1
  const imgBlock = url
    ? '<img src="' +
      escapeAttr(url) +
      '" alt="" class="w-14 h-14 rounded-lg object-cover border border-slate-200 bg-white">'
    : '<div class="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200"></div>'
  const badge = ai
    ? '<span class="pointer-events-none absolute bottom-0 right-0 z-[1] max-w-[calc(100%-2px)] truncate rounded-tl px-0.5 py-px text-[7px] font-normal leading-none text-slate-500/90 bg-white/45 backdrop-blur-[1px] border-t border-l border-white/25">AI 생성</span>'
    : ''
  return '<div class="relative inline-block">' + imgBlock + badge + '</div>'
}

function hubSyncInstructorAiNotice() {
  const notice = document.getElementById('hubInstructorAiNotice')
  const editId = document.getElementById('hubInstructorEditId')
  const urlEl = document.getElementById('hubInstructorProfileImage')
  if (!notice || !editId || !urlEl) return
  const isNew = !editId.value
  const emptyUrl = !String(urlEl.value || '').trim()
  if (isNew && emptyUrl) notice.classList.remove('hidden')
  else notice.classList.add('hidden')
}

function hubRefreshInstructorPreview() {
  const urlEl = document.getElementById('hubInstructorProfileImage')
  const aiEl = document.getElementById('hubInstructorProfileImageAi')
  const prev = document.getElementById('hubInstructorPreviewImg')
  const ph = document.getElementById('hubInstructorPreviewPlaceholder')
  const badge = document.getElementById('hubInstructorAiBadge')
  const wrap = document.getElementById('hubInstructorPreviewWrap')
  if (!urlEl || !prev || !ph || !badge) return
  if (window.hubInstructorPreviewObjectUrl) {
    prev.src = window.hubInstructorPreviewObjectUrl
    prev.classList.remove('hidden')
    ph.classList.add('hidden')
    badge.classList.add('hidden')
    if (wrap) wrap.classList.remove('ring-2', 'ring-violet-200')
    return
  }
  const url = String(urlEl.value || '').trim()
  const ai = aiEl && aiEl.value === '1'
  if (url) {
    prev.src = url
    prev.classList.remove('hidden')
    ph.classList.add('hidden')
    if (wrap) wrap.classList.add('ring-2', 'ring-violet-200')
  } else {
    prev.src = ''
    prev.classList.add('hidden')
    ph.classList.remove('hidden')
    if (wrap) wrap.classList.remove('ring-2', 'ring-violet-200')
  }
  if (url && ai) badge.classList.remove('hidden')
  else badge.classList.add('hidden')
  const regen = document.getElementById('hubInstructorRegenerateAiBtn')
  const hid = document.getElementById('hubInstructorEditId')
  if (regen) {
    const inEdit = !!(hid && String(hid.value || '').trim())
    const showRegen = inEdit && ai && !window.hubInstructorPreviewObjectUrl
    regen.classList.toggle('hidden', !showRegen)
  }
}

function hubSetInstructorGenderRadio(val) {
  const raw = String(val || '')
    .trim()
    .toUpperCase()
  let v = 'U'
  if (raw === 'M' || raw === 'MALE' || raw === '남' || raw === '남성') v = 'M'
  else if (raw === 'F' || raw === 'FEMALE' || raw === '여' || raw === '여성') v = 'F'
  document.querySelectorAll('input[name="hubInstructorGender"]').forEach((el) => {
    el.checked = el.value === v
  })
}

function hubUpdateInstructorAutoAiRowUi() {
  const hid = document.getElementById('hubInstructorEditId')
  const cb = document.getElementById('hubInstructorAutoAiPhoto')
  const row = document.getElementById('hubInstructorAutoAiRow')
  if (!cb || !row) return
  const editing = !!(hid && String(hid.value || '').trim())
  cb.disabled = editing
  row.classList.toggle('opacity-60', editing)
  row.title = editing ? '신규 등록 시에만 선택할 수 있습니다.' : ''
}

function hubUpdateInstructorFormModeUi() {
  const hid = document.getElementById('hubInstructorEditId')
  const label = document.getElementById('hubInstructorModeLabel')
  const saveBtn = document.getElementById('hubInstructorSaveBtn')
  const cancelBtn = document.getElementById('hubInstructorEditCancelBtn')
  const editId = hid && String(hid.value || '').trim()
  if (label) {
    label.textContent = editId
      ? '편집 중 · 강사 ID #' + editId + ' — 내용을 바꾼 뒤 「수정 저장」을 누르세요.'
      : '신규 등록 — 아래 입력 후 「등록」을 누르세요.'
  }
  if (saveBtn) saveBtn.textContent = editId ? '수정 저장' : '등록'
  if (cancelBtn) cancelBtn.classList.toggle('hidden', !editId)
  hubUpdateInstructorAutoAiRowUi()
}

function hubFillInstructorFormFromRow(row) {
  if (!row) return
  if (window.hubInstructorPreviewObjectUrl) {
    URL.revokeObjectURL(window.hubInstructorPreviewObjectUrl)
    window.hubInstructorPreviewObjectUrl = null
  }
  const fileInput0 = document.getElementById('hubInstructorFileInput')
  if (fileInput0) fileInput0.value = ''
  const hid = document.getElementById('hubInstructorEditId')
  const name = document.getElementById('hubInstructorName')
  const img = document.getElementById('hubInstructorProfileImage')
  const sp = document.getElementById('hubInstructorSpecialty')
  const bio = document.getElementById('hubInstructorBio')
  const ai = document.getElementById('hubInstructorProfileImageAi')
  if (hid) hid.value = String(row.id)
  if (name) name.value = row.name || ''
  if (img) img.value = row.profile_image || ''
  if (sp) sp.value = row.specialty || ''
  if (bio) bio.value = row.bio || ''
  if (ai) ai.value = Number(row.profile_image_ai) === 1 ? '1' : '0'
  hubSetInstructorGenderRadio(row.gender)
  hubRefreshInstructorPreview()
  hubSyncInstructorAiNotice()
  hubUpdateInstructorFormModeUi()
}

function hubResetInstructorForm() {
  const hid = document.getElementById('hubInstructorEditId')
  const name = document.getElementById('hubInstructorName')
  const img = document.getElementById('hubInstructorProfileImage')
  const sp = document.getElementById('hubInstructorSpecialty')
  const bio = document.getElementById('hubInstructorBio')
  const ai = document.getElementById('hubInstructorProfileImageAi')
  const file = document.getElementById('hubInstructorFileInput')
  if (hid) hid.value = ''
  if (name) name.value = ''
  if (img) img.value = ''
  if (sp) sp.value = ''
  if (bio) bio.value = ''
  if (ai) ai.value = '0'
  if (file) file.value = ''
  const autoAi = document.getElementById('hubInstructorAutoAiPhoto')
  if (autoAi) autoAi.checked = true
  hubSetInstructorGenderRadio('U')
  if (window.hubInstructorPreviewObjectUrl) {
    URL.revokeObjectURL(window.hubInstructorPreviewObjectUrl)
    window.hubInstructorPreviewObjectUrl = null
  }
  hubRefreshInstructorPreview()
  hubSyncInstructorAiNotice()
  hubUpdateInstructorFormModeUi()
}

async function loadHubInstructors() {
  const body = document.getElementById('hubInstructorsTableBody')
  if (!body) return
  body.innerHTML =
    '<tr><td colspan="6" class="p-6 text-center text-slate-500">불러오는 중…</td></tr>'
  const res = await apiRequest('GET', '/api/admin/instructors')
  if (!res.success || !Array.isArray(res.data)) {
    body.innerHTML =
      '<tr><td colspan="6" class="p-6 text-center text-red-600">강사 목록을 불러오지 못했습니다.</td></tr>'
    return
  }
  hubInstructorsCache = res.data
  if (!hubInstructorsCache.length) {
    body.innerHTML =
      '<tr><td colspan="6" class="p-6 text-center text-slate-500">등록된 강사가 없습니다. 아래 폼에서 추가하세요.</td></tr>'
    return
  }
  body.innerHTML = hubInstructorsCache
    .map((row) => {
      const url = row.profile_image ? String(row.profile_image).slice(0, 48) + (String(row.profile_image).length > 48 ? '…' : '') : '—'
      return (
        '<tr class="hover:bg-slate-50/80 border-b border-slate-100">' +
        '<td class="p-3 align-middle">' +
        hubInstructorThumbCellHtml(row) +
        '</td>' +
        '<td class="p-3 align-middle">' +
        escapeHtml(String(row.id)) +
        '</td>' +
        '<td class="p-3 align-middle font-medium">' +
        escapeHtml(String(row.name || '')) +
        '</td>' +
        '<td class="p-3 align-middle text-slate-600">' +
        escapeHtml(String(row.specialty || '—')) +
        '</td>' +
        '<td class="p-3 align-middle text-slate-500 text-xs max-w-[200px] truncate" title="' +
        escapeAttr(String(row.profile_image || '')) +
        '">' +
        escapeHtml(url) +
        '</td>' +
        '<td class="p-3 align-middle text-center">' +
        '<button type="button" class="text-indigo-600 hover:underline font-semibold text-sm hub-instructor-edit" data-id="' +
        escapeAttr(String(row.id)) +
        '">편집</button>' +
        '</td>' +
        '</tr>'
      )
    })
    .join('')
  body.querySelectorAll('.hub-instructor-edit').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-id') || '', 10)
      const row = hubInstructorsCache.find((r) => r.id === id)
      if (!row) return
      hubFillInstructorFormFromRow(row)
      document.getElementById('hubInstructorFormModeBar')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      showToast('편집 모드입니다. 수정 후 「수정 저장」을 누르세요.', 'success')
    })
  })
}

window.hubOnInstructorProfileUrlInput = function () {
  if (window.hubInstructorPreviewObjectUrl) {
    URL.revokeObjectURL(window.hubInstructorPreviewObjectUrl)
    window.hubInstructorPreviewObjectUrl = null
  }
  const fileInput = document.getElementById('hubInstructorFileInput')
  if (fileInput) fileInput.value = ''
  const ai = document.getElementById('hubInstructorProfileImageAi')
  if (ai) ai.value = '0'
  hubRefreshInstructorPreview()
  hubSyncInstructorAiNotice()
}

/** @param {File} file */
function hubInstructorSetPendingPhotoFile(file) {
  if (!file) return
  const t = (file.type || '').toLowerCase()
  if (!/^image\/(jpeg|jpg|png|gif|webp)$/i.test(t)) {
    showToast('JPG, PNG, GIF, WebP 이미지만 사용할 수 있습니다.', 'error')
    return
  }
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    showToast('파일 크기는 5MB 이하여야 합니다.', 'error')
    return
  }
  const fileInput = document.getElementById('hubInstructorFileInput')
  if (fileInput) {
    try {
      const dt = new DataTransfer()
      dt.items.add(file)
      fileInput.files = dt.files
    } catch (e) {
      console.warn('[hub] DataTransfer 파일 설정 실패', e)
    }
  }
  if (window.hubInstructorPreviewObjectUrl) {
    URL.revokeObjectURL(window.hubInstructorPreviewObjectUrl)
    window.hubInstructorPreviewObjectUrl = null
  }
  window.hubInstructorPreviewObjectUrl = URL.createObjectURL(file)
  const ai = document.getElementById('hubInstructorProfileImageAi')
  if (ai) ai.value = '0'
  hubRefreshInstructorPreview()
  hubSyncInstructorAiNotice()
  showToast('저장 시 사진이 업로드·반영됩니다.', 'success')
}

function hubInstructorOnPasteImage(e) {
  const items = e.clipboardData && e.clipboardData.items
  if (!items || !items.length) return
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.kind === 'file' && item.type && item.type.indexOf('image') === 0) {
      e.preventDefault()
      e.stopPropagation()
      const file = item.getAsFile()
      if (file) hubInstructorSetPendingPhotoFile(file)
      return
    }
  }
}

/** 약력(#hubInstructorBio) 제외, 점선 영역은 zone 전용 paste와 중복되지 않게 처리 */
function hubInstructorPanelPasteMaybeImage(e) {
  const panel = document.getElementById('panel-instructors')
  if (!panel || panel.classList.contains('hidden')) return
  const t = e.target
  if (t && t.closest && t.closest('#hubInstructorBio')) return

  const items = e.clipboardData && e.clipboardData.items
  if (!items || !items.length) return
  let hasImg = false
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    if (it.kind === 'file' && it.type && it.type.indexOf('image') === 0) {
      hasImg = true
      break
    }
  }
  if (!hasImg) return

  if (t && t.id === 'hubInstructorProfileImage') {
    hubInstructorOnPasteImage(e)
    return
  }
  if (t && t.closest && t.closest('#hubInstructorPhotoDropZone')) return

  hubInstructorOnPasteImage(e)
}

window.hubOnInstructorPhotoSelected = function (input) {
  const file = input && input.files && input.files[0]
  if (!file) return
  hubInstructorSetPendingPhotoFile(file)
}

window.hubSaveInstructor = async function () {
  if (hubInstructorSaveBusy) return
  hubInstructorSaveBusy = true
  const hid = document.getElementById('hubInstructorEditId')
  const name = document.getElementById('hubInstructorName')
  const img = document.getElementById('hubInstructorProfileImage')
  const sp = document.getElementById('hubInstructorSpecialty')
  const bio = document.getElementById('hubInstructorBio')
  const fileInput = document.getElementById('hubInstructorFileInput')
  const genderEl = document.querySelector('input[name="hubInstructorGender"]:checked')
  const gender = genderEl ? genderEl.value : 'U'
  const editId = hid && hid.value ? parseInt(String(hid.value), 10) : NaN
  const autoCb = document.getElementById('hubInstructorAutoAiPhoto')
  const wantAutoAi =
    !Number.isFinite(editId) && autoCb && !autoCb.disabled && autoCb.checked

  const payload = {
    name: (name && name.value) || '',
    profile_image: (img && img.value) || '',
    specialty: (sp && sp.value) || '',
    bio: (bio && bio.value) || '',
    gender,
  }
  if (!Number.isFinite(editId)) {
    payload.auto_generate_profile_image = wantAutoAi
  }
  if (!String(payload.name).trim()) {
    showToast('이름을 입력해 주세요.', 'error')
    hubInstructorSaveBusy = false
    return
  }
  const savingAsEditId = Number.isFinite(editId) ? editId : null
  const pendingFile = fileInput && fileInput.files && fileInput.files[0]
  let res

  if (
    !Number.isFinite(editId) &&
    !String(payload.profile_image || '').trim() &&
    !pendingFile &&
    wantAutoAi
  ) {
    if (gender !== 'M' && gender !== 'F') {
      showToast('AI 프로필 사진을 쓰려면 성별(남성 또는 여성)을 선택해 주세요.', 'error')
      hubInstructorSaveBusy = false
      return
    }
  }

  if (editId && Number.isFinite(editId) && pendingFile) {
    const fd = new FormData()
    fd.append('name', payload.name)
    fd.append('bio', payload.bio || '')
    fd.append('specialty', payload.specialty || '')
    fd.append('gender', gender)
    fd.append('profile_image', payload.profile_image || '')
    fd.append('file', pendingFile)
    res = await apiRequest('PUT', '/api/admin/instructors/' + editId, fd)
  } else if (!editId && pendingFile) {
    const fd = new FormData()
    fd.append('file', pendingFile)
    const up = await apiRequest('POST', '/api/upload/image', fd)
    if (!up.success || !up.data || !up.data.url) {
      showToast(up.error || '이미지 업로드에 실패했습니다.', 'error')
      hubInstructorSaveBusy = false
      return
    }
    payload.profile_image = up.data.url
    res = await apiRequest('POST', '/api/admin/instructors', payload)
  } else if (editId && Number.isFinite(editId)) {
    res = await apiRequest('PUT', '/api/admin/instructors/' + editId, payload)
  } else {
    res = await apiRequest('POST', '/api/admin/instructors', payload)
  }
  try {
    if (res.success) {
      const msg = (res.data && res.data.message) || res.message || '저장되었습니다.'
      showToast(
        savingAsEditId
          ? '수정 저장되었습니다.'
          : res.data && res.data.id
            ? '등록되었습니다. 아래에서 이어서 편집할 수 있습니다.'
            : msg,
        'success',
      )
      const warns = res.data && res.data.warnings
      if (Array.isArray(warns) && warns.length) {
        warns.forEach((w) => showToast(String(w), 'info'))
      }
      invalidateHubCourseFormOptions()
      if (window.hubInstructorPreviewObjectUrl) {
        URL.revokeObjectURL(window.hubInstructorPreviewObjectUrl)
        window.hubInstructorPreviewObjectUrl = null
      }
      if (fileInput) fileInput.value = ''
      await loadHubInstructors()
      const createdId = res.data && res.data.id != null ? Number(res.data.id) : NaN
      if (savingAsEditId != null) {
        const row = hubInstructorsCache.find((r) => r.id === savingAsEditId)
        if (row) hubFillInstructorFormFromRow(row)
        else hubResetInstructorForm()
      } else if (Number.isFinite(createdId)) {
        const row = hubInstructorsCache.find((r) => r.id === createdId)
        if (row) {
          hubFillInstructorFormFromRow(row)
          document.getElementById('hubInstructorFormModeBar')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        } else hubResetInstructorForm()
      } else {
        hubResetInstructorForm()
      }
    } else {
      showToast(res.error || res.message || '저장 실패', 'error')
    }
  } finally {
    hubInstructorSaveBusy = false
  }
}

window.hubRegenerateInstructorAiPhoto = async function () {
  const hid = document.getElementById('hubInstructorEditId')
  const id = hid && hid.value ? parseInt(String(hid.value), 10) : NaN
  if (!Number.isFinite(id)) {
    showToast('저장된 강사만 사진을 다시 그릴 수 있습니다.', 'error')
    return
  }
  const aiEl = document.getElementById('hubInstructorProfileImageAi')
  if (!aiEl || aiEl.value !== '1') {
    showToast('AI로 만든 프로필 사진일 때만 다시 생성할 수 있습니다.', 'error')
    return
  }
  const btn = document.getElementById('hubInstructorRegenerateAiBtn')
  if (btn) btn.disabled = true
  try {
    const gEl = document.querySelector('input[name="hubInstructorGender"]:checked')
    const g = gEl ? gEl.value : 'U'
    const res = await apiRequest('POST', '/api/admin/instructors/' + id + '/regenerate-image', { gender: g })
    if (res.success && res.data && res.data.profile_image) {
      const img = document.getElementById('hubInstructorProfileImage')
      const ai = document.getElementById('hubInstructorProfileImageAi')
      if (img) img.value = res.data.profile_image
      if (ai) ai.value = '1'
      const prev = document.getElementById('hubInstructorPreviewImg')
      if (prev) prev.src = String(res.data.profile_image) + (String(res.data.profile_image).includes('?') ? '&' : '?') + 't=' + Date.now()
      hubRefreshInstructorPreview()
      showToast((res.data && res.data.message) || '새 프로필로 다시 그렸습니다.', 'success')
      invalidateHubCourseFormOptions()
      await loadHubInstructors()
    } else {
      showToast(res.error || res.message || '재생성에 실패했습니다.', 'error')
    }
  } finally {
    if (btn) btn.disabled = false
  }
}

function hubSelectOptionsHtml(items, selectedValue, placeholder) {
  const sel = String(selectedValue ?? '')
  const opts = (items || [])
    .map((it) => {
      const id = String(it.id)
      return `<option value="${escapeAttr(id)}"${sel === id ? ' selected' : ''}>${escapeHtml(it.name || id)}</option>`
    })
    .join('')
  return `<option value="">${escapeHtml(placeholder || '선택')}</option>${opts}`
}

function hubDifficultySelectOptions(selected) {
  const sel = String(selected || 'beginner')
  const rows = [
    ['intro', '입문'],
    ['beginner', '초급'],
    ['intermediate', '중급'],
    ['advanced', '고급'],
  ]
  return rows
    .map(([v, label]) => `<option value="${escapeAttr(v)}"${sel === v ? ' selected' : ''}>${escapeHtml(label)}</option>`)
    .join('')
}

async function hubUploadCourseThumbFile(file) {
  if (!file || !file.type || !file.type.startsWith('image/')) {
    showToast('이미지 파일만 업로드할 수 있습니다.', 'error')
    return
  }
  const form = new FormData()
  form.append('file', file)
  try {
    const response = await fetch('/api/upload/image', { method: 'POST', body: form, credentials: 'include' })
    const text = await response.text()
    const parsed = text ? JSON.parse(text) : null
    if (response.ok && parsed && parsed.success && parsed.data && parsed.data.url) {
      window.hubCourseDraft = window.hubCourseDraft || {}
      window.hubCourseDraft.thumbnail_url = parsed.data.url
      window.hubCourseDraft.thumbnail_image_ai = 0
      const preview = document.getElementById('hubCourseThumbPreview')
      if (preview) preview.src = parsed.data.url
      hubSyncCourseThumbAiHint()
      showToast('썸네일이 업로드되었습니다.', 'success')
    } else {
      showToast((parsed && (parsed.error || parsed.message)) || '썸네일 업로드 실패', 'error')
    }
  } catch (e) {
    showToast('썸네일 업로드 중 오류가 발생했습니다.', 'error')
  }
}

function hubSyncCourseThumbAiHint() {
  const hint = document.getElementById('hubCourseThumbAiHint')
  if (!hint) return
  const ai = Number(window.hubCourseDraft?.thumbnail_image_ai || 0)
  if (ai) {
    hint.textContent = 'AI 생성 썸네일이 적용된 상태입니다. 수동 업로드 시 일반 썸네일로 전환됩니다.'
    hint.classList.remove('hidden')
  } else {
    hint.textContent = ''
    hint.classList.add('hidden')
  }
}

function hubWireCourseThumbnailUi() {
  const drop = document.getElementById('hubCourseThumbDrop')
  const fileEl = document.getElementById('hubCourseThumbFile')
  if (fileEl) {
    fileEl.onchange = () => {
      hubUploadCourseThumb(fileEl)
    }
  }
  if (!drop) return
  drop.addEventListener('dragover', (e) => {
    e.preventDefault()
    drop.classList.add('border-indigo-400', 'bg-indigo-50/30')
  })
  drop.addEventListener('dragleave', () => {
    drop.classList.remove('border-indigo-400', 'bg-indigo-50/30')
  })
  drop.addEventListener('drop', (e) => {
    e.preventDefault()
    drop.classList.remove('border-indigo-400', 'bg-indigo-50/30')
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]
    if (f) hubUploadCourseThumbFile(f)
  })
}

let hubCourseThumbPasteBound = false
function hubEnsureCourseThumbPasteListener() {
  if (hubCourseThumbPasteBound) return
  hubCourseThumbPasteBound = true
  document.addEventListener('paste', (e) => {
    const modal = document.getElementById('courseModal')
    if (!modal || modal.classList.contains('hidden')) return
    const items = e.clipboardData && e.clipboardData.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const f = items[i].getAsFile()
        if (f) {
          e.preventDefault()
          hubUploadCourseThumbFile(f)
          break
        }
      }
    }
  })
}

window.hubUploadCourseThumb = async function (input) {
  const file = input && input.files && input.files[0]
  if (!file) return
  await hubUploadCourseThumbFile(file)
  if (input) input.value = ''
}

window.hubRegenerateCourseThumbnailAi = async function () {
  if (currentCourseId == null) {
    showToast('강좌를 먼저 저장한 뒤 AI 썸네일을 사용할 수 있습니다.', 'warning')
    return
  }
  const hint = document.getElementById('hubCourseThumbAiHint')
  if (hint) {
    hint.textContent = 'AI가 이미지를 생성하는 중입니다…'
    hint.classList.remove('hidden')
  }
  const res = await apiRequest('POST', '/api/admin/courses/' + currentCourseId + '/thumbnail-ai', {})
  if (hint && !res.success) hint.classList.add('hidden')
  if (res.success && res.data && res.data.thumbnail_url) {
    window.hubCourseDraft = window.hubCourseDraft || {}
    window.hubCourseDraft.thumbnail_url = res.data.thumbnail_url
    window.hubCourseDraft.thumbnail_image_ai = 1
    const preview = document.getElementById('hubCourseThumbPreview')
    if (preview) preview.src = res.data.thumbnail_url
    hubSyncCourseThumbAiHint()
    showToast('AI 썸네일이 적용되었습니다. 저장하면 반영됩니다.', 'success')
  } else {
    showToast(res.error || 'AI 썸네일 생성에 실패했습니다.', 'error')
  }
}

function wireCoursePricingInputs() {
  const reg = document.getElementById('hubCourseRegularPrice')
  const sale = document.getElementById('hubCourseSalePrice')
  const hint = document.getElementById('hubCourseDiscountHint')
  if (!reg || !sale || !hint) return
  const sync = () => {
    const r = Math.max(0, parseInt(String(reg.value || '0'), 10) || 0)
    const sRaw = String(sale.value || '').trim()
    const s = sRaw === '' ? null : Math.max(0, parseInt(sRaw, 10) || 0)
    if (r > 0 && s != null && s > 0 && s < r) {
      const pct = Math.round((1 - s / r) * 100)
      hint.textContent = pct + '% 할인가 적용'
      hint.classList.remove('hidden')
    } else {
      hint.textContent = ''
      hint.classList.add('hidden')
    }
  }
  reg.addEventListener('input', sync)
  sale.addEventListener('input', sync)
  sync()
}

function hubCourseDescriptionSectionHtml(textareaBodyEscaped) {
  return (
    '<label class="block text-sm font-medium">설명</label>' +
    '<div id="hubCourseDescWrap" class="relative">' +
    '<textarea id="hubCourseDesc" rows="4" class="w-full border rounded px-3 py-2 relative z-10 bg-white">' +
    textareaBodyEscaped +
    '</textarea>' +
    '<div id="hubCourseDescAiOverlay" class="hidden absolute inset-0 z-20 flex items-center justify-center rounded border border-indigo-100/80 bg-white/80 pointer-events-none">' +
    '<div class="flex items-center gap-2 text-sm text-indigo-700">' +
    '<span class="inline-block h-4 w-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin shrink-0" aria-hidden="true"></span>' +
    '<span class="animate-pulse">AI가 내용을 구상 중입니다...</span>' +
    '</div></div></div>' +
    '<p class="text-[11px] text-slate-500 mt-0.5">설명 칸이 비어 있을 때만, 제목을 입력하고 잠시 멈추거나 포커스를 벗어나면 AI가 초안을 채웁니다. 언제든 직접 수정·삭제할 수 있습니다.</p>'
  )
}

function wireHubCourseTitleAiBlur() {
  const titleEl = document.getElementById('hubCourseTitle')
  const descEl = document.getElementById('hubCourseDesc')
  const overlay = document.getElementById('hubCourseDescAiOverlay')
  if (!titleEl || !descEl) return

  if (hubCourseTitleAiTimer) {
    clearTimeout(hubCourseTitleAiTimer)
    hubCourseTitleAiTimer = null
  }

  const runAi = async () => {
    const title = String(titleEl.value || '').trim()
    if (title.length < 2) return
    const descNow = String(descEl.value || '').trim()
    if (descNow.length > 0) return

    hubDescAiGen += 1
    const gen = hubDescAiGen
    if (overlay) overlay.classList.remove('hidden')
    descEl.setAttribute('aria-busy', 'true')

    try {
      const res = await apiRequest('POST', '/api/admin/ai/generate-course-description', { title })
      if (gen !== hubDescAiGen) return
      if (res.success && res.data && typeof res.data.description === 'string') {
        let text = res.data.description.trim()
        try {
          if (text.startsWith('{')) {
            const p = JSON.parse(text)
            if (p && typeof p.description === 'string') text = p.description.trim()
          }
        } catch {
          /* 그대로 사용 */
        }
        text = text.replace(/\\n/g, '\n')
        if (String(descEl.value || '').trim() === '') descEl.value = text
      } else if (!res.success) {
        showToast(res.error || 'AI 설명 생성 실패', 'error')
      }
    } catch (e) {
      if (gen === hubDescAiGen) showToast('AI 설명 생성 중 오류가 발생했습니다.', 'error')
    } finally {
      if (gen === hubDescAiGen) {
        descEl.removeAttribute('aria-busy')
        if (overlay) overlay.classList.add('hidden')
      }
    }
  }

  const scheduleAi = (immediate) => {
    if (hubCourseTitleAiTimer) {
      clearTimeout(hubCourseTitleAiTimer)
      hubCourseTitleAiTimer = null
    }
    if (immediate) {
      void runAi()
      return
    }
    hubCourseTitleAiTimer = setTimeout(() => {
      hubCourseTitleAiTimer = null
      void runAi()
    }, 650)
  }

  titleEl.oninput = function () {
    scheduleAi(false)
  }
  titleEl.onblur = function () {
    scheduleAi(true)
  }
}

function hubLessonDurationDisplay(l) {
  const d = l.duration_minutes ?? l.video_duration_minutes
  return d != null && d !== '' ? Number(d) : 0
}

async function reloadCourseModalLessons(courseId) {
  const res = await apiRequest('GET', '/api/courses/' + courseId)
  if (res.success && res.data) {
    courseModalLessons = res.data.lessons || []
    renderLessonEditors(courseId)
  }
}

async function hubSaveAllLessonDrafts(courseId) {
  if (!courseId) return true
  const panel = document.getElementById('courseTabPanelLessons')
  if (!panel) return true
  const ids = Array.from(panel.querySelectorAll('[data-lesson-id]'))
    .map((el) => el.getAttribute('data-lesson-id'))
    .filter(Boolean)
  for (const lessonId of ids) {
    const urlEl = document.getElementById('lesson-url-' + lessonId)
    const durEl = document.getElementById('lesson-dur-' + lessonId)
    const titleEl = document.getElementById('lesson-title-' + lessonId)
    const video_url = urlEl?.value?.trim() ?? ''
    const duration_minutes = Math.max(0, parseInt(String(durEl?.value ?? '0'), 10) || 0)
    const title = titleEl?.value?.trim()
    const payload = { video_url, duration_minutes }
    if (title !== undefined && title !== '') payload.title = title
    const res = await apiRequest('PUT', `/api/courses/${courseId}/lessons/${lessonId}`, payload)
    if (!res.success) {
      showToast(res.error || '차시 저장 실패 (#' + lessonId + ')', 'error')
      return false
    }
  }
  return true
}

function hasUnsavedLessonDrafts() {
  const panel = document.getElementById('courseTabPanelLessons')
  if (!panel) return false
  const ids = Array.from(panel.querySelectorAll('[data-lesson-id]'))
    .map((el) => Number(el.getAttribute('data-lesson-id')))
    .filter((n) => Number.isFinite(n))
  for (const lessonId of ids) {
    const original = courseModalLessons.find((l) => Number(l.id) === lessonId)
    if (!original) continue
    const titleEl = document.getElementById('lesson-title-' + lessonId)
    const urlEl = document.getElementById('lesson-url-' + lessonId)
    const durEl = document.getElementById('lesson-dur-' + lessonId)
    const nowTitle = String(titleEl?.value || '').trim()
    const nowUrl = String(urlEl?.value || '').trim()
    const nowDur = Math.max(0, parseInt(String(durEl?.value ?? '0'), 10) || 0)
    const oldTitle = String(original.title || '').trim()
    const oldUrl = String(original.video_url || '').trim()
    const oldDur = Math.max(0, parseInt(String(hubLessonDurationDisplay(original)), 10) || 0)
    if (nowTitle !== oldTitle || nowUrl !== oldUrl || nowDur !== oldDur) return true
  }
  return false
}

function refreshAdvancedLessonsFrame(courseId) {
  const frame = document.getElementById('courseLessonsFrame')
  if (!frame || !courseId) return
  frame.src = `/admin/courses/${courseId}/lessons?ts=${Date.now()}`
}

/** DB 영문 status → 관리자 화면 한글 (값은 그대로 전송) */
function hubAdminStatusKo(code) {
  if (typeof adminStatusLabelKo === 'function') return adminStatusLabelKo(code)
  if (code == null || code === '') return '—'
  return String(code)
}

/** DB 값 → 폼 select 값 (3종만). 레거시 active·archived·hidden 정규화 */
function hubNormalizeCourseStatusForSelect(raw) {
  const s = String(raw || 'draft')
    .trim()
    .toLowerCase()
  if (s === 'active') return 'published'
  if (s === 'archived' || s === 'hidden') return 'inactive'
  if (s === 'draft' || s === 'inactive' || s === 'published') return s
  return 'draft'
}

function hubCourseStatusSelectOptions(selected) {
  const sel = hubNormalizeCourseStatusForSelect(selected)
  const pairs = [
    ['draft', '준비 중'],
    ['published', '공개 (수강 가능)'],
    ['inactive', '비공개 (숨김)'],
  ]
  return pairs
    .map(
      ([val, label]) =>
        '<option value="' +
        escapeAttr(val) +
        '"' +
        (sel === val ? ' selected' : '') +
        '>' +
        escapeHtml(label) +
        '</option>',
    )
    .join('')
}

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
  bindHubEduDashboardCards()
  bindHubAcademicDashboardCards()
  bindHubPubDashboardCards()
  bindHubSysDashboardCards()
  bindHubUnifiedSearch()
  bindHubBookDetailPanel()
  initHubOpsDesktopAccordion()
  initHubDesktopGnbMegaBehavior()
  await loadPendingApprovalBadges()
  initHubPopupsPanel()
  initHubNoticesPanel()
  initHubPostsPanel()

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

async function loadPendingApprovalBadges() {
  try {
    const res = await apiRequest('GET', '/api/admin/users?type=b2b&filter=b2b_pending&page=1&limit=1')
    const cnt = res.success && res.pagination ? Number(res.pagination.total || 0) : 0
    ;['hubDesktopPendingCountBadge', 'hubMobilePendingCountBadge'].forEach((id) => {
      const el = document.getElementById(id)
      if (el) el.textContent = String(cnt)
    })
  } catch {
    ;['hubDesktopPendingCountBadge', 'hubMobilePendingCountBadge'].forEach((id) => {
      const el = document.getElementById(id)
      if (el) el.textContent = '0'
    })
  }
}

function applyHashRoute() {
  const raw = (location.hash || '#dashboard').replace(/^#/, '') || 'dashboard'
  if (raw === 'members') {
    location.replace('/admin/members')
    return
  }
  const tab = HUB_VALID_PANELS.has(raw) ? raw : 'dashboard'
  updateGnbActiveState(tab)
  document.querySelectorAll('.hub-panel').forEach((p) => p.classList.add('hidden'))
  const panel = document.getElementById('panel-' + tab)
  if (panel) panel.classList.remove('hidden')

  if (tab === 'members') loadUsers()
  if (tab === 'edu-dashboard') {
    loadEduDashboard()
    try {
      const sid = sessionStorage.getItem('hubEduScroll')
      if (sid) {
        sessionStorage.removeItem('hubEduScroll')
        setTimeout(() => document.getElementById(sid)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
      }
    } catch (_) {
      /* ignore */
    }
  }
  if (tab === 'academic-dashboard') void loadAcademicDashboard()
  if (tab === 'pub-dashboard') loadPubDashboard()
  if (tab === 'sys-dashboard') loadSysDashboard()
  if (tab === 'courses') {
    loadCourses()
    try {
      if (sessionStorage.getItem('hubOpenNewCourse') === '1') {
        sessionStorage.removeItem('hubOpenNewCourse')
        setTimeout(() => {
          if (typeof window.openHubNewCourseModal === 'function') void window.openHubNewCourseModal()
        }, 0)
      }
    } catch (_) {
      /* ignore */
    }
  }
  if (tab === 'enrollments') loadEnrollmentsTable()
  if (tab === 'payments') loadPaymentsTable()
  if (tab === 'videos') loadVideosTable()
  if (tab === 'popups') loadHubPopups()
  if (tab === 'support') {
    void loadHubNotices()
    void loadHubPosts()
  }
  if (tab === 'isbn') loadIsbnAdmin()
  if (tab === 'certificates') loadCertificatesTable()
  if (tab === 'offline-meetups') loadHubOfflineMeetups()
  if (tab === 'instructors') {
    hubUpdateInstructorFormModeUi()
    void loadHubInstructors().then(() => hubSyncInstructorAiNotice())
    const resetBtn = document.getElementById('hubInstructorFormReset')
    const saveBtn = document.getElementById('hubInstructorSaveBtn')
    const cancelEditBtn = document.getElementById('hubInstructorEditCancelBtn')
    const pickBtn = document.getElementById('hubInstructorPhotoPickBtn')
    const fileIn = document.getElementById('hubInstructorFileInput')
    const urlIn = document.getElementById('hubInstructorProfileImage')
    if (resetBtn && !resetBtn.dataset.wired) {
      resetBtn.dataset.wired = '1'
      resetBtn.addEventListener('click', () => {
        hubResetInstructorForm()
        showToast('신규 등록 폼으로 초기화했습니다.', 'success')
      })
    }
    if (cancelEditBtn && !cancelEditBtn.dataset.wired) {
      cancelEditBtn.dataset.wired = '1'
      cancelEditBtn.addEventListener('click', () => {
        hubResetInstructorForm()
        showToast('편집을 취소하고 신규 등록 모드로 돌아갔습니다.', 'info')
      })
    }
    if (saveBtn && !saveBtn.dataset.wired) {
      saveBtn.dataset.wired = '1'
      saveBtn.addEventListener('click', () => void hubSaveInstructor())
    }
    if (pickBtn && fileIn && !pickBtn.dataset.wired) {
      pickBtn.dataset.wired = '1'
      pickBtn.addEventListener('click', () => fileIn.click())
    }
    if (fileIn && !fileIn.dataset.wired) {
      fileIn.dataset.wired = '1'
      fileIn.addEventListener('change', () => void hubOnInstructorPhotoSelected(fileIn))
    }
    const photoZone = document.getElementById('hubInstructorPhotoDropZone')
    if (photoZone && !photoZone.dataset.wiredPasteDrop) {
      photoZone.dataset.wiredPasteDrop = '1'
      photoZone.addEventListener('click', (ev) => {
        if (ev.target.closest('#hubInstructorPhotoPickBtn')) return
        if (ev.target.closest('#hubInstructorRegenerateAiBtn')) return
        if (ev.target.closest('#hubInstructorFileInput')) return
        photoZone.focus()
      })
      photoZone.addEventListener('paste', hubInstructorOnPasteImage)
      photoZone.addEventListener('dragover', (ev) => {
        ev.preventDefault()
        ev.dataTransfer.dropEffect = 'copy'
      })
      photoZone.addEventListener('dragenter', (ev) => {
        ev.preventDefault()
        photoZone.classList.add('ring-2', 'ring-indigo-400', 'border-indigo-300', 'bg-indigo-50/70')
      })
      photoZone.addEventListener('dragleave', (ev) => {
        ev.preventDefault()
        if (!photoZone.contains(ev.relatedTarget)) {
          photoZone.classList.remove('ring-2', 'ring-indigo-400', 'border-indigo-300', 'bg-indigo-50/70')
        }
      })
      photoZone.addEventListener('drop', (ev) => {
        ev.preventDefault()
        photoZone.classList.remove('ring-2', 'ring-indigo-400', 'border-indigo-300', 'bg-indigo-50/70')
        const f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0]
        if (f) hubInstructorSetPendingPhotoFile(f)
      })
    }
    const instPanel = document.getElementById('panel-instructors')
    if (instPanel && !instPanel.dataset.pasteImageWired) {
      instPanel.dataset.pasteImageWired = '1'
      instPanel.addEventListener('paste', hubInstructorPanelPasteMaybeImage, true)
    }
    if (urlIn && !urlIn.dataset.wired) {
      urlIn.dataset.wired = '1'
      urlIn.addEventListener('input', hubOnInstructorProfileUrlInput)
    }
    const regenBtn = document.getElementById('hubInstructorRegenerateAiBtn')
    if (regenBtn && !regenBtn.dataset.wired) {
      regenBtn.dataset.wired = '1'
      regenBtn.addEventListener('click', () => void window.hubRegenerateInstructorAiPhoto())
    }
  }
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

let hubEduDashboardLoading = false

async function loadEduDashboard() {
  if (!document.getElementById('hubEduKpiCourses')) return
  if (hubEduDashboardLoading) return
  hubEduDashboardLoading = true
  try {
    const [sum, act, cert] = await Promise.all([
      apiRequest('GET', '/api/admin/edu-dashboard/summary'),
      apiRequest('GET', '/api/admin/edu-dashboard/recent-activity'),
      apiRequest('GET', '/api/admin/edu-dashboard/cert-pending'),
    ])
    if (sum.success && sum.data) {
      const d = sum.data
      const k1 = document.getElementById('hubEduKpiCourses')
      if (k1) k1.textContent = (d.total_courses ?? 0).toLocaleString('ko-KR') + '개'
      const k2 = document.getElementById('hubEduKpiProgress')
      if (k2) k2.textContent = String(d.avg_lesson_progress ?? 0) + '%'
      const k3 = document.getElementById('hubEduKpiCertPending')
      if (k3) k3.textContent = (d.cert_pending ?? 0).toLocaleString('ko-KR') + '건'
      const k4 = document.getElementById('hubEduKpiExamToday')
      if (k4) k4.textContent = (d.exam_attempts_today ?? 0).toLocaleString('ko-KR') + '명'
    }
    const actBody = document.getElementById('hubEduDashActivityBody')
    if (actBody) {
      const rows = act.success && Array.isArray(act.data) ? act.data : []
      if (!rows.length) {
        actBody.innerHTML =
          '<tr><td colspan="5" class="p-6 text-center text-slate-500">등록된 학습 활동이 없습니다.</td></tr>'
      } else {
        actBody.innerHTML = rows
          .map((r) => {
            const uid = r.user_id
            const name = escapeHtml(String(r.user_name || '—'))
            const nameCell =
              uid != null && /^\d+$/.test(String(uid))
                ? '<a href="#" class="member-detail-trigger text-indigo-600 hover:text-indigo-800 hover:underline font-semibold" data-user-id="' +
                  escapeAttr(String(uid)) +
                  '" data-table-kind="edu-activity">' +
                  name +
                  '</a>'
                : name
            const ts =
              typeof formatDateTime === 'function' ? formatDateTime(r.activity_at) : String(r.activity_at || '—')
            return (
              '<tr class="hover:bg-emerald-50/50">' +
              '<td class="p-3 align-middle">' +
              nameCell +
              '</td>' +
              '<td class="p-3 align-middle text-slate-800">' +
              escapeHtml(String(r.course_title || '—')) +
              '</td>' +
              '<td class="p-3 align-middle text-slate-700 text-xs">' +
              escapeHtml(String(r.lesson_title || '—')) +
              '</td>' +
              '<td class="p-3 align-middle text-right tabular-nums">' +
              escapeHtml(String(r.watch_percentage ?? 0)) +
              '%</td>' +
              '<td class="p-3 align-middle text-xs text-slate-500">' +
              escapeHtml(ts) +
              '</td>' +
              '</tr>'
            )
          })
          .join('')
      }
    }
    const certBody = document.getElementById('hubEduDashCertBody')
    if (certBody) {
      const rows = cert.success && Array.isArray(cert.data) ? cert.data : []
      if (!rows.length) {
        certBody.innerHTML =
          '<tr><td colspan="4" class="p-6 text-center text-slate-500">등록된 대기 신청이 없습니다.</td></tr>'
      } else {
        certBody.innerHTML = rows
          .map((r) => {
            const uid = r.user_id
            const disp = String(r.applicant_name || r.user_name || '—').trim()
            const nameCell =
              uid != null && /^\d+$/.test(String(uid))
                ? '<a href="#" class="member-detail-trigger text-indigo-600 hover:text-indigo-800 hover:underline font-semibold" data-user-id="' +
                  escapeAttr(String(uid)) +
                  '" data-table-kind="edu-cert-pending">' +
                  escapeHtml(disp) +
                  '</a>'
                : escapeHtml(disp)
            const ts =
              typeof formatDateTime === 'function' ? formatDateTime(r.created_at) : String(r.created_at || '—')
            return (
              '<tr class="hover:bg-emerald-50/50">' +
              '<td class="p-3 align-middle">' +
              nameCell +
              '</td>' +
              '<td class="p-3 align-middle text-slate-800">' +
              escapeHtml(String(r.certification_name || '—')) +
              '</td>' +
              '<td class="p-3 align-middle text-xs font-mono text-slate-600">' +
              escapeHtml(String(r.application_number || '—')) +
              '</td>' +
              '<td class="p-3 align-middle text-xs text-slate-500">' +
              escapeHtml(ts) +
              '</td>' +
              '</tr>'
            )
          })
          .join('')
      }
    }
  } finally {
    hubEduDashboardLoading = false
  }
}

function bindHubEduDashboardCards() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-hub-edu-card]')
    if (!btn) return
    if (!btn.closest('#panel-edu-dashboard')) return
    e.preventDefault()
    const act = btn.getAttribute('data-hub-edu-card')
    if (act === 'courses-list' && typeof window.openHubDashboardModalFromApiKey === 'function') {
      window.openHubDashboardModalFromApiKey('courses')
      return
    }
    if (act === 'enrollments-tab') {
      location.hash = '#enrollments'
      return
    }
    if (act === 'scroll-cert') {
      document.getElementById('hubEduDashCertBlock')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    if (act === 'exams-list' && typeof window.openHubDashboardModalFromApiKey === 'function') {
      window.openHubDashboardModalFromApiKey('exams')
    }
  })
}

const HUB_ACADEMIC_DASH_DUMMY = {
  grading_pending: 3,
  certificate_queue: 5,
  certification_application_pending: 2,
  offline_meetup_recent: 4,
}

async function loadAcademicDashboard() {
  if (!document.getElementById('hubAcademicBadgeGrading')) return
  const setBadge = (id, n) => {
    const el = document.getElementById(id)
    if (el) el.textContent = String(n)
  }
  try {
    const res = await apiRequest('GET', '/api/admin/academic-dashboard/summary')
    if (res.success && res.data) {
      const d = res.data
      setBadge('hubAcademicBadgeGrading', toIntOr(d.grading_pending, 0))
      setBadge('hubAcademicBadgeCertificate', toIntOr(d.certificate_queue, 0))
      setBadge('hubAcademicBadgeCertification', toIntOr(d.certification_application_pending, 0))
      setBadge('hubAcademicBadgeOffline', toIntOr(d.offline_meetup_recent, 0))
      return
    }
  } catch (_) {
    /* fallback below */
  }
  setBadge('hubAcademicBadgeGrading', HUB_ACADEMIC_DASH_DUMMY.grading_pending)
  setBadge('hubAcademicBadgeCertificate', HUB_ACADEMIC_DASH_DUMMY.certificate_queue)
  setBadge('hubAcademicBadgeCertification', HUB_ACADEMIC_DASH_DUMMY.certification_application_pending)
  setBadge('hubAcademicBadgeOffline', HUB_ACADEMIC_DASH_DUMMY.offline_meetup_recent)
}

function bindHubAcademicDashboardCards() {
  document.getElementById('hubAcademicCardExams')?.addEventListener('click', () => {
    if (typeof window.openHubDashboardModalFromApiKey === 'function') {
      window.openHubDashboardModalFromApiKey('exams')
    }
  })
  document.getElementById('hubAcademicCardCertificates')?.addEventListener('click', () => {
    location.hash = '#certificates'
  })
  document.getElementById('hubAcademicCardCertification')?.addEventListener('click', () => {
    try {
      sessionStorage.setItem('hubEduScroll', 'hubEduDashCertBlock')
    } catch (_) {
      /* ignore */
    }
    location.hash = '#edu-dashboard'
  })
  document.getElementById('hubAcademicCardOffline')?.addEventListener('click', () => {
    location.hash = '#offline-meetups'
  })
}

async function loadPubDashboard() {
  if (!document.getElementById('hubPubKpiBooks')) return
  const [sum, list] = await Promise.all([
    apiRequest('GET', '/api/admin/pub-dashboard/summary'),
    apiRequest('GET', '/api/admin/pub-dashboard/publishing-list'),
  ])
  if (sum.success && sum.data) {
    const d = sum.data
    const el = (id, v) => {
      const n = document.getElementById(id)
      if (n) n.textContent = v
    }
    el('hubPubKpiBooks', (d.total_digital_books ?? 0).toLocaleString('ko-KR') + '권')
    el('hubPubKpiPending', (d.isbn_approval_pending ?? 0).toLocaleString('ko-KR') + '건')
    el('hubPubKpiMonth', (d.published_this_month ?? 0).toLocaleString('ko-KR') + '종')
    el('hubPubKpiOrders', (d.cumulative_paid_orders ?? 0).toLocaleString('ko-KR') + '건')
  }
  const tbody = document.getElementById('hubPubDashListBody')
  if (tbody) {
    const rows = list.success && Array.isArray(list.data) ? list.data : []
    if (!rows.length) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="p-6 text-center text-slate-500">등록된 도서가 없습니다.</td></tr>'
    } else {
      tbody.innerHTML = rows
        .map((r) => {
          const bid = r.id
          const titleCell =
            bid != null && /^\d+$/.test(String(bid))
              ? '<a href="#" class="book-detail-trigger text-violet-700 hover:text-violet-900 hover:underline font-semibold" data-book-id="' +
                escapeAttr(String(bid)) +
                '">' +
                escapeHtml(String(r.title || '—')) +
                '</a>'
              : escapeHtml(String(r.title || '—'))
          const uid = r.user_id
          const author = String(r.author_name || '—')
          const authorCell =
            uid != null && /^\d+$/.test(String(uid))
              ? '<a href="#" class="member-detail-trigger text-indigo-600 hover:text-indigo-800 hover:underline font-semibold" data-user-id="' +
                escapeAttr(String(uid)) +
                '" data-table-kind="pub-list">' +
                escapeHtml(author) +
                '</a>'
              : escapeHtml(author)
          const invRaw = r.isbn_inventory_status
          const invDisp = invRaw ? hubAdminStatusKo(invRaw) : ''
          const isbnState = [r.isbn_number, invDisp].filter(Boolean).join(' · ') || '—'
          const ts = typeof formatDateTime === 'function' ? formatDateTime(r.publish_at) : String(r.publish_at || '—')
          return (
            '<tr class="hover:bg-emerald-50/50">' +
            '<td class="p-3 align-middle">' +
            titleCell +
            '</td>' +
            '<td class="p-3 align-middle">' +
            authorCell +
            '</td>' +
            '<td class="p-3 align-middle text-xs">' +
            escapeHtml(isbnState) +
            '</td>' +
            '<td class="p-3 align-middle">' +
            escapeHtml(hubAdminStatusKo(r.book_status || '—')) +
            '</td>' +
            '<td class="p-3 align-middle text-xs text-slate-500">' +
            escapeHtml(ts) +
            '</td>' +
            '</tr>'
          )
        })
        .join('')
    }
  }
}

async function loadSysDashboard() {
  if (!document.getElementById('hubSysKpiDbPct')) return
  const [sum, logs] = await Promise.all([
    apiRequest('GET', '/api/admin/sys-dashboard/summary'),
    apiRequest('GET', '/api/admin/sys-dashboard/logs'),
  ])
  if (sum.success && sum.data) {
    const d = sum.data
    const pct = d.db_usage_percent
    const pctEl = document.getElementById('hubSysKpiDbPct')
    if (pctEl) {
      pctEl.textContent = pct != null && !Number.isNaN(Number(pct)) ? String(pct) + '%' : '—'
    }
    const sub = document.getElementById('hubSysKpiDbSub')
    if (sub && d.db_size_bytes != null) {
      const mb = (Number(d.db_size_bytes) / (1024 * 1024)).toFixed(2)
      sub.textContent = '약 ' + mb + ' MB · Free 500MB 대비'
    }
    const bar = document.getElementById('hubSysDbBar')
    if (bar && pct != null && !Number.isNaN(Number(pct))) {
      bar.style.width = Math.min(100, Math.max(0, Number(pct))) + '%'
    }
    const ai = document.getElementById('hubSysKpiAi')
    if (ai) {
      const ar = d.ai_success_rate_24h
      ai.textContent = ar != null && !Number.isNaN(Number(ar)) ? String(ar) + '%' : '데이터 없음'
    }
    const se = document.getElementById('hubSysKpiSec')
    if (se) se.textContent = (d.security_events_24h ?? 0).toLocaleString('ko-KR') + '건'
    const ss = document.getElementById('hubSysKpiSessions')
    if (ss) ss.textContent = (d.active_sessions ?? 0).toLocaleString('ko-KR') + '명'
  }
  const tbody = document.getElementById('hubSysDashLogsBody')
  if (tbody) {
    const rows = logs.success && Array.isArray(logs.data) ? logs.data : []
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-slate-500">로그가 없습니다.</td></tr>'
    } else {
      tbody.innerHTML = rows
        .map((r) => {
          const ts = typeof formatDateTime === 'function' ? formatDateTime(r.at) : String(r.at || '—')
          return (
            '<tr class="hover:bg-slate-50/80">' +
            '<td class="p-3 align-middle text-xs font-medium text-slate-600">' +
            escapeHtml(String(r.log_source || '—')) +
            '</td>' +
            '<td class="p-3 align-middle">' +
            escapeHtml(String(r.message || '—')) +
            '</td>' +
            '<td class="p-3 align-middle text-xs text-slate-500 whitespace-nowrap">' +
            escapeHtml(ts) +
            '</td>' +
            '<td class="p-3 align-middle text-xs text-slate-500">' +
            escapeHtml(String(r.detail || '')) +
            '</td>' +
            '</tr>'
          )
        })
        .join('')
    }
  }
}

function bindHubPubDashboardCards() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-hub-pub-card]')
    if (!btn || !btn.closest('#panel-pub-dashboard')) return
    e.preventDefault()
    const act = btn.getAttribute('data-hub-pub-card')
    if (act === 'digital-list' && typeof window.openHubDashboardModalFromApiKey === 'function') {
      window.openHubDashboardModalFromApiKey('digital-books')
      return
    }
    if (act === 'submissions' && typeof window.openHubDashboardModalFromApiKey === 'function') {
      window.openHubDashboardModalFromApiKey('book-submissions')
      return
    }
    if (act === 'publishing-tab') {
      location.hash = '#publishing'
      return
    }
    if (act === 'payments-tab') {
      location.hash = '#payments'
    }
  })
}

function bindHubSysDashboardCards() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-hub-sys-card]')
    if (!btn || !btn.closest('#panel-sys-dashboard')) return
    e.preventDefault()
    if (btn.getAttribute('data-hub-sys-card') === 'members-tab') {
      location.href = '/admin/members'
    }
  })
}

function bindHubUnifiedSearch() {
  const input = document.getElementById('hubUnifiedSearch')
  if (!input) return
  input.addEventListener('input', () => {
    const q = String(input.value || '')
      .trim()
      .toLowerCase()
    const panel = document.querySelector('.hub-panel:not(.hidden)')
    if (!panel) return
    panel.querySelectorAll('table tbody tr').forEach((tr) => {
      const hide = q && !String(tr.textContent || '').toLowerCase().includes(q)
      tr.classList.toggle('hidden', hide)
    })
  })
}

function bindHubBookDetailPanel() {
  document.addEventListener('click', async (e) => {
    const a = e.target.closest('.book-detail-trigger')
    if (!a || !document.getElementById('panel-pub-dashboard')?.contains(a)) return
    e.preventDefault()
    const id = a.getAttribute('data-book-id')
    if (!id || !/^\d+$/.test(id)) return
    if (typeof window.openHubEntityDetailPanel !== 'function') return
    try {
      const res = await apiRequest('GET', '/api/admin/digital-books/' + id)
      if (!res.success || !res.data) {
        hubToastBottom(res.error || res.message || '도서 정보를 불러오지 못했습니다.')
        return
      }
      const b = res.data
      const html =
        '<dl class="space-y-2 text-sm">' +
        '<div><dt class="text-xs text-slate-500">도서명</dt><dd class="font-semibold">' +
        escapeHtml(String(b.title || '—')) +
        '</dd></div>' +
        '<div><dt class="text-xs text-slate-500">회원(소유)</dt><dd>' +
        escapeHtml(String(b.user_name || '—')) +
        ' · ' +
        escapeHtml(String(b.user_email || '')) +
        '</dd></div>' +
        '<div><dt class="text-xs text-slate-500">연결 강좌</dt><dd>' +
        escapeHtml(String(b.course_title || '—')) +
        '</dd></div>' +
        '<div><dt class="text-xs text-slate-500">ISBN</dt><dd class="font-mono">' +
        escapeHtml(String(b.isbn_number || b.inv_isbn || '—')) +
        '</dd></div>' +
        '<div><dt class="text-xs text-slate-500">재고 상태</dt><dd>' +
        escapeHtml(String(b.isbn_inventory_status || '—')) +
        '</dd></div>' +
        '<div><dt class="text-xs text-slate-500">도서 상태</dt><dd>' +
        escapeHtml(String(b.status || '—')) +
        '</dd></div>' +
        '<div><dt class="text-xs text-slate-500">갱신</dt><dd class="text-xs">' +
        escapeHtml(typeof formatDateTime === 'function' ? formatDateTime(b.updated_at) : String(b.updated_at || '—')) +
        '</dd></div>' +
        '</dl>'
      window.openHubEntityDetailPanel({
        title: String(b.title || '도서 상세'),
        subtitle: 'digital_books #' + id,
        html,
      })
    } catch (err) {
      hubToastBottom('도서 상세를 열 수 없습니다.')
    }
  })
}

function hubPrintHubSection(rootId, title) {
  const root = document.getElementById(rootId)
  if (!root) return
  const w = window.open('', '_blank')
  if (!w) {
    hubToastBottom('팝업이 차단되었습니다.')
    return
  }
  const style =
    '<style>body{font-family:system-ui,sans-serif;padding:16px;color:#111} h1{font-size:16px;margin:0 0 12px} table{border-collapse:collapse;width:100%;font-size:11px} th,td{border:1px solid #ccc;padding:5px 6px} thead{background:#f1f5f9} tr.hidden{display:table-row !important}</style>'
  w.document.open()
  w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + escapeHtml(title) + '</title>' + style + '</head><body>')
  w.document.write('<h1>' + escapeHtml(title) + '</h1>')
  const clone = root.cloneNode(true)
  clone.querySelectorAll('tr.hidden').forEach((tr) => tr.classList.remove('hidden'))
  clone.querySelectorAll('button').forEach((b) => b.remove())
  w.document.write(clone.innerHTML)
  w.document.write('</body></html>')
  w.document.close()
  w.onload = function () {
    try {
      w.focus()
      w.print()
    } catch (e2) {}
  }
}

window.hubPrintHubSection = hubPrintHubSection

/** KPI / 오늘의 지표 카드 — 클릭 시 모달 + 탭 이동 */
const HUB_KPI_HELP = {
  users: {
    title: '총 회원수',
    body: '탈퇴·삭제 처리되지 않은 회원 계정 수입니다. 회원 관리 페이지에서 목록 검색·상세 관리를 할 수 있습니다.',
    tab: 'members',
    tabLabel: '회원 관리 페이지로 이동',
    membersHref: '/admin/members',
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
    tabLabel: '회원 관리 페이지로 이동',
    membersHref: '/admin/members',
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
      if (cfg.membersHref) {
        location.href = cfg.membersHref
      } else {
        location.hash = cfg.tab
      }
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
    subtitle: '데모 · 신청자 · 과정명 · 금액 · 수단 · 상태',
    columns: ['신청자', '과정명', '결제금액', '결제수단', '상태', '처리'],
    actionLabel: '확인',
    rows: [
      ['김민수', 'MindStory Classic · 진로캠프', '₩150,000', '카드', '결제완료'],
      ['이수진', 'MindStory Next · AI 동화', '₩298,000', '무통장', '입금대기'],
      ['박준형', 'MindStory Classic', '₩150,000', '카드', '결제완료'],
      ['최유리', '메타인지 클리닉', '₩89,000', '카드', '결제완료'],
    ],
  },
  'dash-today-revenue': {
    title: '오늘 결제 금액 · 성공 내역',
    subtitle: '데모 · 결제자 · 과정명 · 금액 · 일시 · 상태',
    columns: ['결제자', '과정명', '금액', '일시', '상태', '처리'],
    actionLabel: '확인',
    rows: [
      ['김민수', 'MindStory Classic · 진로캠프', '₩150,000', '08:18', '결제완료'],
      ['박준형', 'MindStory Classic', '₩150,000', '08:51', '결제완료'],
      ['최유리', 'MindStory Classic · 메타인지 입문', '₩150,000', '09:07', '결제완료'],
    ],
  },
  'dash-urgent-queue': {
    title: '즉시 처리 필요',
    subtitle: '데모 · 섹션별 구분 · 유형/대상자/내용/시간',
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
      ['1:1', '수강 연장 가능한가요?', '김기성', '08:30', '미답변'],
      ['Q&A', 'NCS 서류 양식', '이광희', '09:12', '미답변'],
      ['1:1', '환급 일정 문의', '박민준', '09:45', '미답변'],
      ['1:1', 'mOTP 미인증', '최나원', '10:20', '미답변'],
      ['Q&A', 'Classic vs Next 차이', '정수아', '10:55', '미답변'],
      ['1:1', '결제 영수증 재발급', '강태우', '11:18', '미답변'],
    ],
  },
}

/** SSR에서 주입: window.__ADMIN_DASHBOARD_MOCK__ (별칭 window.ADMIN_DASHBOARD_MOCK 동일 참조) */
function getHubDashboardDemoTables() {
  try {
    if (typeof window !== 'undefined') {
      const w = window
      const payload = w.__ADMIN_DASHBOARD_MOCK__ || w.ADMIN_DASHBOARD_MOCK
      if (payload && payload.tables) return payload.tables
    }
  } catch (e) {}
  return HUB_DASHBOARD_DEMO_FALLBACK
}

/** CSV 파일명 접두사 — {접두사}_리스트_{YYYYMMDD}.csv */
const HUB_DASH_CSV_FILE_PREFIX = {
  'dash-new-signups': '오늘신규가입',
  'dash-today-enrollments': '오늘수강신청',
  'dash-today-revenue': '오늘결제금액',
  'dash-urgent-queue': '즉시처리필요',
  'dash-action-bank': '무통장입금확인',
  'dash-action-b2b': 'B2B강사승인',
  'dash-action-inquiry': '미답변문의QA',
  'api:courses': '강좌목록',
  'api:exams': '시험목록',
  'api:certificates': '수료증발급',
  'api:digital-books': '디지털도서',
  'api:book-submissions': '출판검수',
}

function hubDashboardCsvEscapeCell(val) {
  const s = String(val == null ? '' : val)
  if (/["\r\n,]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

function hubDashboardCsvLine(cells) {
  return cells.map(hubDashboardCsvEscapeCell).join(',')
}

/** getHubDashboardDemoTables()[kind] 기준 전체 행 (처리 열 제외) — mock과 동일 소스 */
function hubDashboardBuildCsvFromCfg(cfg) {
  if (!cfg) return ''
  if (cfg.layout === 'sections' && cfg.sections && cfg.sections.length) {
    const lines = []
    for (const sec of cfg.sections) {
      const cols = (sec.columns || []).filter((c) => c !== '처리')
      const secLabel = [sec.title, sec.subtitle].filter(Boolean).join(' ').trim()
      lines.push(hubDashboardCsvLine(['섹션', ...cols]))
      for (const row of sec.rows || []) {
        const slice = row.slice(0, cols.length)
        lines.push(hubDashboardCsvLine([secLabel, ...slice]))
      }
      lines.push('')
    }
    return lines.join('\r\n').replace(/\r\n+$/, '')
  }
  const cols = (cfg.columns || []).filter((c) => c !== '처리')
  const lines = [hubDashboardCsvLine(cols)]
  for (const row of cfg.rows || []) {
    lines.push(hubDashboardCsvLine(row.slice(0, cols.length)))
  }
  return lines.join('\r\n')
}

function hubDashboardCsvDateStamp() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return '' + y + m + day
}

function hubDashboardDownloadDetailCsv() {
  const kind = openHubDashboardDetailModal._currentKind
  if (!kind) return
  const cfg = openHubDashboardDetailModal._currentCfg || getHubDashboardDemoTables()[kind]
  if (!cfg) return
  const csvBody = hubDashboardBuildCsvFromCfg(cfg)
  const prefix = HUB_DASH_CSV_FILE_PREFIX[kind] || '대시보드'
  const name = prefix + '_리스트_' + hubDashboardCsvDateStamp() + '.csv'
  const blob = new Blob(['\uFEFF' + csvBody], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(a.href)
}

window.hubDashboardDownloadDetailCsv = hubDashboardDownloadDetailCsv

/** 상세 모달 본문 인쇄 (CSV와 동일 데이터 영역) */
function hubDashboardPrintDetailModal() {
  const modal = document.getElementById('hubDashboardDetailModal')
  const titleEl = document.getElementById('hubDashboardDetailTitle')
  const body = modal?.querySelector('.hub-dashboard-detail-panel .flex-1.overflow-auto')
  if (!body) return
  const title = (titleEl && titleEl.textContent) ? titleEl.textContent.trim() : '대시보드 상세'
  const w = window.open('', '_blank')
  if (!w) {
    hubToastBottom('팝업이 차단되었습니다. 브라우저에서 팝업을 허용해 주세요.')
    return
  }
  const style =
    '<style>body{font-family:system-ui,-apple-system,sans-serif;padding:20px;color:#111} h1{font-size:18px;margin:0 0 16px;font-weight:700} table{border-collapse:collapse;width:100%;font-size:12px} th,td{border:1px solid #ccc;padding:6px 8px;text-align:left} thead{background:#f1f5f9} section{margin-top:16px}</style>'
  w.document.open()
  w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + escapeHtml(title) + '</title>' + style + '</head><body>')
  w.document.write('<h1>' + escapeHtml(title) + '</h1>')
  w.document.write(body.innerHTML)
  w.document.write('</body></html>')
  w.document.close()
  w.onload = function () {
    try {
      w.focus()
      w.print()
    } catch (e) {}
  }
}
window.hubDashboardPrintDetailModal = hubDashboardPrintDetailModal

const hubMegaLeaveTimers = new Map()

function hubCancelMegaLeaveTimer(mega) {
  const id = hubMegaLeaveTimers.get(mega)
  if (id) clearTimeout(id)
  hubMegaLeaveTimers.delete(mega)
}

function hubScheduleMegaClose(mega) {
  hubCancelMegaLeaveTimer(mega)
  hubMegaLeaveTimers.set(
    mega,
    setTimeout(() => {
      mega.classList.remove('hub-gnb-mega--open')
      hubMegaLeaveTimers.delete(mega)
    }, 200),
  )
}

function hubOpenMegaMenu(mega) {
  if (!mega) return
  hubCancelMegaLeaveTimer(mega)
  document.querySelectorAll('#hubDesktopGnb .hub-gnb-mega').forEach((o) => {
    if (o !== mega) {
      hubCancelMegaLeaveTimer(o)
      o.classList.remove('hub-gnb-mega--open')
    }
  })
  mega.classList.add('hub-gnb-mega--open')
}

function hubCloseAllDesktopGnbMegas() {
  document.querySelectorAll('#hubDesktopGnb .hub-gnb-mega').forEach((mega) => {
    hubCancelMegaLeaveTimer(mega)
    mega.classList.remove('hub-gnb-mega--open')
  })
}

function hubResetDesktopGnbAccordions() {
  document.querySelectorAll('#hubDesktopGnb .hub-ops-acc-panel').forEach((panel) => {
    panel.classList.add('hidden')
  })
  document.querySelectorAll('#hubDesktopGnb .hub-ops-acc-trigger .hub-ops-chevron').forEach((ch) => ch.classList.remove('rotate-180'))
  document.querySelectorAll('#hubDesktopGnb .hub-ops-acc-trigger').forEach((btn) => btn.setAttribute('aria-expanded', 'false'))
}

function hubCloseDesktopGnbOverlays() {
  const bar = document.getElementById('hubDesktopGnb')
  const ae = document.activeElement
  if (bar && ae instanceof HTMLElement && bar.contains(ae) && ae.closest('.hub-gnb-dropdown')) {
    ae.blur()
  }
  hubCloseAllDesktopGnbMegas()
  hubResetDesktopGnbAccordions()
}

function initHubDesktopGnbMegaBehavior() {
  const bar = document.getElementById('hubDesktopGnb')
  if (!bar) return

  bar.querySelectorAll('.hub-gnb-mega').forEach((mega) => {
    mega.addEventListener('mouseenter', () => hubOpenMegaMenu(mega))
    mega.addEventListener('mouseleave', () => hubScheduleMegaClose(mega))
    mega.addEventListener('focusin', () => hubOpenMegaMenu(mega))
    mega.addEventListener('focusout', () => {
      setTimeout(() => {
        if (!mega.contains(document.activeElement)) hubScheduleMegaClose(mega)
      }, 0)
    })
  })

  document.addEventListener(
    'click',
    (e) => {
      const t = e.target
      if (!(t instanceof Node)) return
      const gnb = document.getElementById('hubDesktopGnb')
      if (!gnb || !gnb.contains(t)) {
        hubCloseDesktopGnbOverlays()
        return
      }
      if (t.closest('.hub-ops-acc-trigger')) return
      const leaf = t.closest('a[href], button[data-hub-dash-detail], button[data-hub-dash-api]')
      if (leaf && gnb.contains(leaf)) hubCloseDesktopGnbOverlays()
    },
    true,
  )

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    hubCloseDesktopGnbOverlays()
  })
}

window.hubCloseDesktopGnbOverlays = hubCloseDesktopGnbOverlays

function initHubOpsDesktopAccordion() {
  document.querySelectorAll('#hubDesktopGnb .hub-ops-acc-trigger').forEach((btn) => {
    btn.setAttribute('aria-expanded', 'false')
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const sub = btn.closest('.hub-ops-subgroup')
      const panel = sub && sub.querySelector('.hub-ops-acc-panel')
      const chevron = btn.querySelector('.hub-ops-chevron')
      if (!panel) return
      panel.classList.toggle('hidden')
      const isOpen = !panel.classList.contains('hidden')
      if (chevron) chevron.classList.toggle('rotate-180', isOpen)
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false')
    })
  })
}

/** 대시보드 상세 모달 — 상태·우선·유형 등 배지 컬럼 */
function hubDashColumnIsBadge(colName) {
  const c = String(colName || '').trim()
  return c === '상태' || c === '우선' || c === '유형'
}

function hubDashBadgeHtml(raw) {
  const t = String(raw)
  let cls =
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset max-w-[14rem] truncate '
  if (/결제완료|가입 완료|완료|정상|활성|공개 완료|승인완료|승인 완료|사용 가능/.test(t))
    cls += 'bg-emerald-50 text-emerald-800 ring-emerald-600/20'
  else if (/입금대기|승인 대기|대기|미확인|미답변|본인인증|서류|확인필요|부분취소|취소요청|준비 중|검수 대기/.test(t))
    cls += 'bg-amber-50 text-amber-900 ring-amber-600/25'
  else if (/취소|거절|실패|정지|반려|비활성|사용됨/.test(t)) cls += 'bg-rose-50 text-rose-800 ring-rose-600/20'
  else if (/긴급|높음/.test(t)) cls += 'bg-violet-50 text-violet-800 ring-violet-600/20'
  else if (/무통장/.test(t)) cls += 'bg-rose-50 text-rose-900 ring-rose-600/20'
  else if (/^B2B$|^B2B /.test(t)) cls += 'bg-violet-50 text-violet-900 ring-violet-600/20'
  else if (/^1:1$|^Q&A$/.test(t)) cls += 'bg-sky-50 text-sky-900 ring-sky-600/15'
  else if (/보통|문의|시스템/.test(t)) cls += 'bg-slate-100 text-slate-700 ring-slate-500/15'
  else cls += 'bg-emerald-50/90 text-slate-800 ring-emerald-500/15'
  return '<span class="' + cls + '" title="' + escapeAttr(t) + '">' + escapeHtml(t) + '</span>'
}

/** 명단에서 회원명으로 취급해 상세 패널로 연결할 열 이름 */
function hubMemberColumnIsLink(colName) {
  return /^(이름|신청자|결제자|입금자|회원|대상자)$/.test(String(colName || '').trim())
}

/** 비회원 항목 — 엔티티 슬라이드 패널로 연결 */
function hubEntityColumnIsLink(colName) {
  return /^(과정명|강좌|제목|시험명|ISBN|도서명|도서|응시자|항목|수강생|기관|과정)$/.test(String(colName || '').trim())
}

function hubMemberDemoUserId(tableKind, sectionIndex, rowIndex) {
  let s = 'demo-user-' + tableKind + '-r' + rowIndex
  if (sectionIndex !== undefined && sectionIndex !== null) s += '-s' + sectionIndex
  return s.replace(/[^a-zA-Z0-9_-]/g, '_')
}

function hubDashRenderCell(colName, cell, ctx) {
  const col = String(colName || '').trim()
  let disp = cell
  if (col === '상태') {
    const raw = String(cell ?? '').trim()
    if (raw && raw !== '—') disp = hubAdminStatusKo(raw)
  }
  if (hubDashColumnIsBadge(colName)) return hubDashBadgeHtml(disp)
  if (ctx && ctx.kind && hubEntityColumnIsLink(colName)) {
    const inner = escapeHtml(String(disp))
    const meta = ctx.apiSource ? escapeAttr(String(ctx.apiSource)) : ''
    return (
      '<a href="#" class="entity-detail-trigger text-violet-700 hover:text-violet-900 hover:underline font-semibold" data-entity-label="' +
      escapeAttr(String(cell)) +
      '" data-entity-meta="' +
      meta +
      '">' +
      inner +
      '</a>'
    )
  }
  if (ctx && ctx.kind && hubMemberColumnIsLink(colName)) {
    let userId
    if (ctx.rawRow && ctx.rawRow.user_id != null && String(ctx.rawRow.user_id).trim() !== '') {
      userId = String(ctx.rawRow.user_id)
    } else {
      userId = hubMemberDemoUserId(ctx.kind, ctx.sectionIndex, ctx.rowIndex)
    }
    const inner = escapeHtml(String(cell))
    let attrs =
      'href="#" class="member-detail-trigger text-indigo-600 hover:text-indigo-800 hover:underline font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded" '
    attrs +=
      'data-user-id="' +
      escapeAttr(userId) +
      '" data-table-kind="' +
      escapeAttr(ctx.kind) +
      '" data-row-index="' +
      ctx.rowIndex +
      '"'
    if (ctx.sectionIndex !== undefined && ctx.sectionIndex !== null) {
      attrs += ' data-section-index="' + ctx.sectionIndex + '"'
    }
    return '<a ' + attrs + '>' + inner + '</a>'
  }
  return escapeHtml(String(cell))
}

function hubDashActionButtonHtml(label, extraClass, dataAttrs) {
  const attrs = dataAttrs || ''
  const cls =
    'hub-demo-action-btn hub-dash-live-action text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-3 py-1.5 rounded-lg shadow-sm ring-1 ring-emerald-500/20 ' +
    (extraClass || '')
  return '<button type="button" class="' + cls.trim() + '" ' + attrs + '>' + escapeHtml(label) + '</button>'
}

function hubGetMockTables() {
  try {
    const w = window
    const p = w.__ADMIN_DASHBOARD_MOCK__ || w.ADMIN_DASHBOARD_MOCK
    return p && p.tables ? p.tables : null
  } catch (e) {
    return null
  }
}

function hubToastBottom(message) {
  let c = document.getElementById('hubToastBottom')
  if (!c) {
    c = document.createElement('div')
    c.id = 'hubToastBottom'
    c.className =
      'fixed bottom-6 left-1/2 z-[120] flex -translate-x-1/2 flex-col items-center gap-2 pointer-events-none'
    document.body.appendChild(c)
  }
  const el = document.createElement('div')
  el.className =
    'pointer-events-auto rounded-lg bg-slate-900/95 px-4 py-2.5 text-sm font-medium text-white shadow-lg ring-1 ring-white/10 transition-all duration-300'
  el.textContent = message
  c.appendChild(el)
  setTimeout(() => {
    el.style.opacity = '0'
    el.style.transform = 'translateY(6px)'
  }, 2000)
  setTimeout(() => el.remove(), 2400)
}

/** KPI 숫자 부드럽게 변경 (countdown 스타일) */
function updateDashboardKpi(elId, nextValue, suffix) {
  const el = document.getElementById(elId)
  if (!el) return
  const raw = el.textContent.replace(/,/g, '')
  const m = raw.match(/(\d+)/)
  const start = m ? parseInt(m[1], 10) : nextValue
  const end = Math.max(0, nextValue)
  if (start === end) {
    el.textContent = end.toLocaleString('ko-KR') + (suffix || '')
    return
  }
  const t0 = performance.now()
  const dur = 420
  function frame(now) {
    const p = Math.min(1, (now - t0) / dur)
    const eased = 1 - (1 - p) * (1 - p)
    const v = Math.round(start + (end - start) * eased)
    el.textContent = v.toLocaleString('ko-KR') + (suffix || '')
    if (p < 1) requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

function hubSetBadge(id, n) {
  const el = document.getElementById(id)
  if (el) el.textContent = n + '건'
}

/** mock 기준으로 대시보드 KPI·배지 전체 동기화 */
function hubSyncAllKpiFromMock() {
  const t = hubGetMockTables()
  if (!t) return
  const signups = t['dash-new-signups'] && t['dash-new-signups'].rows ? t['dash-new-signups'].rows : []
  const pendingB2b = signups.filter((r) => /승인\s*대기/.test(String(r[4] || ''))).length
  const sub = document.getElementById('hubKpiSignupsB2bPending')
  if (sub) sub.textContent = 'B2B 승인 대기 ' + pendingB2b + '명'

  const enRows = t['dash-today-enrollments'] && t['dash-today-enrollments'].rows
  if (enRows) {
    const el = document.getElementById('hubKpiEnrollments')
    if (el) {
      const cur = parseInt(el.textContent.replace(/\D/g, '') || '0', 10)
      const n = enRows.length
      if (cur !== n) updateDashboardKpi('hubKpiEnrollments', n, '건')
    }
  }

  const uq = t['dash-urgent-queue']
  if (uq && uq.sections && uq.sections.length >= 3) {
    const n0 = uq.sections[0].rows.length
    const n1 = uq.sections[1].rows.length
    const n2 = uq.sections[2].rows.length
    const total = n0 + n1 + n2
    updateDashboardKpi('hubKpiUrgent', total, '건')
    hubSetBadge('hubBadgeActionBank', n0)
    hubSetBadge('hubBadgeActionB2b', n1)
    hubSetBadge('hubBadgeActionInquiry', n2)
  }
}

function hubDashboardDetailRenderActionTd(kind, sectionIndex, rowIndex, cells, dataCols, defaultLabel) {
  const statusIdx = dataCols.indexOf('상태')
  const status = statusIdx >= 0 ? String(cells[statusIdx] || '') : ''

  if (kind === 'dash-new-signups') {
    if (/승인\s*대기/.test(status)) {
      return (
        '<td class="p-3 text-center align-middle hub-demo-action-cell">' +
        hubDashActionButtonHtml('승인', '', 'data-live-action="signup-approve" data-row-index="' + rowIndex + '"') +
        '</td>'
      )
    }
    return '<td class="p-3 text-center align-middle text-slate-300">—</td>'
  }

  if (kind === 'dash-urgent-queue' && sectionIndex !== undefined && sectionIndex !== null) {
    if (sectionIndex === 0) {
      return (
        '<td class="p-3 text-center align-middle hub-demo-action-cell">' +
        hubDashActionButtonHtml(
          '입금확인',
          'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700',
          'data-live-action="bank-confirm" data-section="0" data-row-index="' + rowIndex + '"',
        ) +
        '</td>'
      )
    }
    if (sectionIndex === 1) {
      return (
        '<td class="p-3 text-center align-middle hub-demo-action-cell">' +
        hubDashActionButtonHtml('승인', '', 'data-live-action="b2b-confirm" data-section="1" data-row-index="' + rowIndex + '"') +
        '</td>'
      )
    }
    if (sectionIndex === 2) {
      return (
        '<td class="p-3 text-center align-middle hub-demo-action-cell">' +
        hubDashActionButtonHtml(
          '답변하기',
          'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700',
          'data-live-action="qa-open" data-section="2" data-row-index="' + rowIndex + '"',
        ) +
        '</td>'
      )
    }
  }

  if (kind === 'dash-action-bank') {
    return (
      '<td class="p-3 text-center align-middle hub-demo-action-cell">' +
      hubDashActionButtonHtml(
        '입금확인',
        'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700',
        'data-live-action="bank-standalone" data-row-index="' + rowIndex + '"',
      ) +
      '</td>'
    )
  }
  if (kind === 'dash-action-b2b') {
    return (
      '<td class="p-3 text-center align-middle hub-demo-action-cell">' +
      hubDashActionButtonHtml('승인', '', 'data-live-action="b2b-standalone" data-row-index="' + rowIndex + '"') +
      '</td>'
    )
  }
  if (kind === 'dash-action-inquiry') {
    return (
      '<td class="p-3 text-center align-middle hub-demo-action-cell">' +
      hubDashActionButtonHtml(
        '답변하기',
        'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700',
        'data-live-action="qa-open-standalone" data-row-index="' + rowIndex + '"',
      ) +
      '</td>'
    )
  }

  return (
    '<td class="p-3 text-center align-middle hub-demo-action-cell">' +
    hubDashActionButtonHtml(
      defaultLabel || '확인',
      '',
      'data-live-action="generic-ok" data-kind="' +
        escapeAttr(kind) +
        '" data-row-index="' +
        rowIndex +
        '"',
    ) +
    '</td>'
  )
}

function hubDashboardDetailRenderTableRows(cols, rows, defaultActionLabel, ctx) {
  const kind = (ctx && ctx.kind) || ''
  const sectionIndex = ctx && ctx.sectionIndex !== undefined ? ctx.sectionIndex : null
  const apiSource = ctx && ctx.apiSource
  const rawRows = ctx && ctx.rawRows
  const dataCols = cols.filter((c) => c !== '처리')
  return (rows || [])
    .map((cells, idx) => {
      const cellCtx = { kind, sectionIndex, rowIndex: idx, apiSource, rawRow: rawRows && rawRows[idx] }
      const tds = dataCols
        .map((colName, i) => {
          const cell = cells[i] != null ? cells[i] : ''
          return '<td class="p-3 align-middle text-slate-800">' + hubDashRenderCell(colName, cell, cellCtx) + '</td>'
        })
        .join('')
      const actionTd = hubDashboardDetailRenderActionTd(kind, sectionIndex, idx, cells, dataCols, defaultActionLabel)
      return (
        '<tr class="hover:bg-emerald-50/50 transition-colors hub-dash-data-row" data-hub-demo-row="' +
        idx +
        '">' +
        tds +
        actionTd +
        '</tr>'
      )
    })
    .join('')
}

function hubDashboardDetailRenderQaSectionRows(cols, rows, sectionIndex, defaultAct) {
  const dataCols = cols.filter((c) => c !== '처리')
  const colSpan = cols.length
  return (rows || [])
    .map((cells, idx) => {
      const cellCtx = { kind: 'dash-urgent-queue', sectionIndex, rowIndex: idx }
      const tds = dataCols
        .map((colName, i) => {
          const cell = cells[i] != null ? cells[i] : ''
          return '<td class="p-3 align-middle text-slate-800">' + hubDashRenderCell(colName, cell, cellCtx) + '</td>'
        })
        .join('')
      const actionTd = hubDashboardDetailRenderActionTd('dash-urgent-queue', sectionIndex, idx, cells, dataCols, defaultAct)
      const accId = 'hub-qa-acc-' + sectionIndex + '-' + idx
      const accordion =
        '<tr class="hub-qa-accordion hidden" id="' +
        accId +
        '"><td colspan="' +
        colSpan +
        '" class="p-4 bg-slate-50 border-t border-slate-100">' +
        '<label class="block text-xs font-medium text-slate-600 mb-1">답변 작성</label>' +
        '<textarea class="hub-qa-input w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[4rem]" placeholder="답변을 입력하세요"></textarea>' +
        '<div class="mt-2 flex justify-end gap-2">' +
        '<button type="button" class="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50" data-live-action="qa-cancel" data-accordion="' +
        accId +
        '">취소</button>' +
        '<button type="button" class="hub-dash-live-action px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700" data-live-action="qa-send" data-section="2" data-row-index="' +
        idx +
        '">전송</button>' +
        '</div></td></tr>'
      return '<tr class="hub-dash-data-row">' + tds + actionTd + '</tr>' + accordion
    })
    .join('')
}

function hubRefreshOpenDashboardModal() {
  const apiKey = openHubDashboardDetailModal._currentApiKey
  if (apiKey) {
    openHubDashboardModalFromApiKey(apiKey)
    return
  }
  const k = openHubDashboardDetailModal._currentKind
  if (k) openHubDashboardDetailModal(k)
}

function hubFadeThenRefreshModal(tr) {
  if (!tr) {
    hubRefreshOpenDashboardModal()
    return
  }
  tr.classList.add('hub-row-leaving')
  const acc = tr.nextElementSibling
  if (acc && acc.classList && acc.classList.contains('hub-qa-accordion')) acc.classList.add('hub-row-leaving')
  setTimeout(() => {
    hubRefreshOpenDashboardModal()
  }, 460)
}

function hubFmtTs(v) {
  if (typeof formatDateTime === 'function') return formatDateTime(v)
  if (v == null || v === '') return '—'
  return String(v)
}

function hubDashboardRegisterHashForApi(apiKey) {
  const map = {
    courses: 'courses',
    exams: 'courses',
    certificates: 'certificates',
    'digital-books': 'publishing',
    'book-submissions': 'publishing',
  }
  return map[apiKey] || 'courses'
}

function hubDashboardEmptyStateHtml(apiKey, colCount) {
  const hash = hubDashboardRegisterHashForApi(apiKey)
  const span = Math.max(1, colCount || 6)
  return (
    '<tr><td colspan="' +
    span +
    '" class="p-10 text-center">' +
    '<p class="text-slate-600 mb-4">등록된 데이터가 없습니다.</p>' +
    '<button type="button" class="hub-dash-empty-register inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700" data-hub-empty-go="' +
    escapeAttr(hash) +
    '">등록하기</button>' +
    '</td></tr>'
  )
}

function buildHubDashboardCfgFromApi(apiKey, data) {
  const rows = Array.isArray(data) ? data : []
  const apiSource = apiKey
  if (apiKey === 'courses') {
    return {
      title: '전체 강좌 목록',
      subtitle: 'D1 · courses 실시간 조회',
      columns: ['과정명', '상태', '구분', '수강생', '등록일', '처리'],
      actionLabel: '열기',
      rows: rows.map((r) => [
        r.title || '—',
        hubAdminStatusKo(r.status || '—'),
        hubCatalogLinesDisplayForTable(r.category_group),
        String(r.enrolled_count ?? 0),
        hubFmtTs(r.created_at),
      ]),
      apiSource,
      _apiKey: 'courses',
      _rawRows: rows,
    }
  }
  if (apiKey === 'exams') {
    return {
      title: '시험 목록',
      subtitle: 'D1 · exams 실시간 조회',
      columns: ['시험명', '과정명', '상태', '문항수', '수정일', '처리'],
      actionLabel: '열기',
      rows: rows.map((r) => [
        r.title || '—',
        r.course_title || '—',
        hubAdminStatusKo(r.status || '—'),
        String(r.question_count ?? 0),
        hubFmtTs(r.updated_at),
      ]),
      apiSource,
      _apiKey: 'exams',
      _rawRows: rows,
    }
  }
  if (apiKey === 'certificates') {
    return {
      title: '수료증 발급 내역',
      subtitle: 'D1 · certificates 실시간 조회',
      columns: ['이름', '과정명', '증명서 번호', '발급일', '진도(%)', '처리'],
      actionLabel: '열기',
      rows: rows.map((r) => [
        r.user_name || '—',
        r.course_title || '—',
        r.certificate_number || '—',
        r.issue_date || hubFmtTs(r.created_at),
        String(r.progress_rate ?? '—'),
      ]),
      apiSource,
      _apiKey: 'certificates',
      _rawRows: rows,
    }
  }
  if (apiKey === 'digital-books') {
    return {
      title: '디지털 도서 · 인벤토리',
      subtitle: 'D1 · digital_books 실시간 조회',
      columns: ['도서명', '이름', '연결 과정', 'ISBN', '상태', '처리'],
      actionLabel: '열기',
      rows: rows.map((r) => [
        r.title || '—',
        r.user_name || '—',
        r.course_title || '—',
        r.isbn_number || '—',
        hubAdminStatusKo(r.status || '—'),
      ]),
      apiSource,
      _apiKey: 'digital-books',
      _rawRows: rows,
    }
  }
  if (apiKey === 'book-submissions') {
    return {
      title: '출판 검수 대기',
      subtitle: 'D1 · book_submissions 실시간 조회',
      columns: ['제목', '신청자', '상태', '제출일', '처리'],
      actionLabel: '열기',
      rows: rows.map((r) => [
        r.title || r.book_title || '—',
        r.user_name || '—',
        hubAdminStatusKo(r.status || '—'),
        hubFmtTs(r.created_at),
      ]),
      apiSource,
      _apiKey: 'book-submissions',
      _rawRows: rows,
    }
  }
  return {
    title: '목록',
    subtitle: 'API',
    columns: ['항목', '처리'],
    rows: [],
    apiSource,
    _apiKey: apiKey,
    _rawRows: [],
  }
}

async function openHubDashboardModalFromApiKey(apiKey) {
  const paths = {
    courses: '/api/admin/courses',
    exams: '/api/admin/exams',
    certificates: '/api/admin/certificates',
    'digital-books': '/api/admin/digital-books',
    'book-submissions': '/api/admin/book-submissions',
  }
  const path = paths[apiKey]
  if (!path) return
  const res = await apiRequest('GET', path)
  const list = res.success && res.data != null ? res.data : []
  if (!res.success) hubToastBottom('목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
  const cfg = buildHubDashboardCfgFromApi(apiKey, Array.isArray(list) ? list : [])
  openHubDashboardDetailModal('api:' + apiKey, cfg)
}

async function hubNavigateDashboardThenOpenApiModal(apiKey) {
  if (!apiKey) return
  const onDash = (location.hash || '#dashboard').replace(/^#/, '') === 'dashboard'
  if (!onDash) {
    location.hash = '#dashboard'
    setTimeout(() => {
      openHubDashboardModalFromApiKey(apiKey)
    }, 0)
  } else {
    await openHubDashboardModalFromApiKey(apiKey)
  }
}

window.openHubDashboardModalFromApiKey = openHubDashboardModalFromApiKey

function openHubDashboardDetailModal(kind, cfgOverride) {
  const cfg = cfgOverride || getHubDashboardDemoTables()[kind]
  if (!cfg) return
  openHubDashboardDetailModal._currentKind = kind
  openHubDashboardDetailModal._currentCfg = cfg
  if (cfg._apiKey) {
    openHubDashboardDetailModal._currentApiKey = cfg._apiKey
  } else {
    openHubDashboardDetailModal._currentApiKey = null
  }
  const modal = document.getElementById('hubDashboardDetailModal')
  const titleEl = document.getElementById('hubDashboardDetailTitle')
  const subEl = document.getElementById('hubDashboardDetailSubtitle')
  const tableWrap = document.getElementById('hubDashboardDetailTableWrap')
  const sectionsWrap = document.getElementById('hubDashboardDetailSectionsWrap')
  const thead = document.getElementById('hubDashboardDetailThead')
  const tbody = document.getElementById('hubDashboardDetailTbody')
  if (!modal || !titleEl || !subEl || !tableWrap || !sectionsWrap || !thead || !tbody) return

  if (openHubDashboardDetailModal._esc) {
    document.removeEventListener('keydown', openHubDashboardDetailModal._esc)
    openHubDashboardDetailModal._esc = null
  }

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
      .map((sec, secIdx) => {
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
        const body =
          secIdx === 2
            ? hubDashboardDetailRenderQaSectionRows(cols, sec.rows, secIdx, act)
            : hubDashboardDetailRenderTableRows(cols, sec.rows, act, { kind: 'dash-urgent-queue', sectionIndex: secIdx })
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
    const colSpan = cols.length || 1
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
    const rowCtx = { kind, apiSource: cfg.apiSource, rawRows: cfg._rawRows }
    if (!cfg.rows || cfg.rows.length === 0) {
      tbody.innerHTML = hubDashboardEmptyStateHtml(cfg._apiKey || 'courses', colSpan)
    } else {
      tbody.innerHTML = hubDashboardDetailRenderTableRows(cols, cfg.rows, actionLabel, rowCtx)
    }
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
window.updateDashboardKpi = updateDashboardKpi

function closeHubDashboardDetailModal() {
  closeHubMemberDetailPanel()
  if (typeof window.closeHubEntityDetailPanel === 'function') window.closeHubEntityDetailPanel()
  const modal = document.getElementById('hubDashboardDetailModal')
  const sectionsWrap = document.getElementById('hubDashboardDetailSectionsWrap')
  if (sectionsWrap) sectionsWrap.innerHTML = ''
  openHubDashboardDetailModal._currentKind = null
  openHubDashboardDetailModal._currentCfg = null
  openHubDashboardDetailModal._currentApiKey = null
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

/** 명단 행 기반 데모 회원 프로필 (API 연동 전) */
function hubBuildMockMemberProfile(userId, tableKind, rowIndex, sectionIndex, displayName) {
  const tables = getHubDashboardDemoTables()
  const t = tables[tableKind]
  let row = null
  if (t && t.layout === 'sections' && t.sections && sectionIndex != null && !Number.isNaN(sectionIndex)) {
    const sec = t.sections[sectionIndex]
    row = sec && sec.rows ? sec.rows[rowIndex] : null
  } else if (t && t.rows) {
    row = t.rows[rowIndex]
  }

  let memberType = '일반'
  let company = ''
  let typeTagClass = 'bg-slate-100 text-slate-700 ring-1 ring-slate-500/15'
  if (tableKind === 'dash-new-signups' && row && String(row[1] || '') === 'B2B') {
    memberType = 'B2B'
    company = String(row[2] || '—')
    typeTagClass = 'bg-violet-100 text-violet-900 ring-1 ring-violet-500/20'
  } else if (tableKind === 'dash-action-b2b') {
    memberType = '강사'
    company = '(주)에듀테크'
    typeTagClass = 'bg-amber-100 text-amber-900 ring-1 ring-amber-500/25'
  } else if (tableKind === 'dash-urgent-queue' && sectionIndex === 1) {
    memberType = 'B2B'
    company = '(주)에듀테크'
    typeTagClass = 'bg-violet-100 text-violet-900 ring-1 ring-violet-500/20'
  }

  const accountStatus = rowIndex % 5 === 0 ? '승인 대기' : rowIndex % 7 === 0 ? '정지' : '정상'
  const n = rowIndex + 1
  const email = 'user' + n + '@demo.mindstory.kr'
  const phone = '010-' + String(2000 + (rowIndex % 8000)).padStart(4, '0') + '-' + String(1000 + (rowIndex % 9000)).padStart(4, '0')
  const courses = [
    { title: 'MindStory Classic · 진로캠프', progress: Math.min(100, 28 + ((rowIndex * 13) % 72)) },
    { title: 'MindStory Next · 실전 심화', progress: Math.min(100, 10 + ((rowIndex * 7) % 40)) },
  ]

  return {
    userId,
    displayName: displayName || '회원',
    email,
    phone,
    joinedAt: '2026-02-' + String(1 + (rowIndex % 26)).padStart(2, '0') + ' 10:' + String((rowIndex * 3) % 60).padStart(2, '0'),
    lastAccess: '2026-03-30 ' + String(9 + (rowIndex % 10)).padStart(2, '0') + ':' + String((rowIndex * 5) % 60).padStart(2, '0'),
    memberType,
    company,
    typeTagClass,
    accountStatus,
    courses,
    paymentRecent: '₩150,000 · 카드 · 2026-03-29 14:22',
    paymentTotal: '₩' + (280000 + rowIndex * 15000).toLocaleString('ko-KR'),
  }
}

function openHubMemberDetailPanel(userId, tableKind, rowIndex, sectionIndex, displayName) {
  const profile = hubBuildMockMemberProfile(userId, tableKind, rowIndex, sectionIndex, displayName)
  if (typeof window.hubFillMemberDetailPanel === 'function') window.hubFillMemberDetailPanel(profile)
  const title = document.getElementById('hubMemberDetailTitle')
  if (title) title.textContent = profile.displayName + ' · 회원 상세'
  const sub = document.getElementById('hubMemberDetailSubtitle')
  if (sub) sub.textContent = '데모 프로필 · API 연동 시 실데이터로 대체됩니다.'
  if (typeof window.hubMemberDetailRunOpenAnimation === 'function') window.hubMemberDetailRunOpenAnimation()
}

window.openHubMemberDetailPanel = openHubMemberDetailPanel

function hubNavigateDashboardThenOpenModal(kind) {
  if (!kind) return
  const onDash = (location.hash || '#dashboard').replace(/^#/, '') === 'dashboard'
  if (!onDash) {
    location.hash = '#dashboard'
    setTimeout(() => openHubDashboardDetailModal(kind), 0)
  } else {
    openHubDashboardDetailModal(kind)
  }
}

function hubModalLiveClickHandler(e) {
  const btn = e.target.closest('[data-live-action]')
  if (!btn) return
  const action = btn.getAttribute('data-live-action')
  const tables = hubGetMockTables()
  if (!tables) return

  if (action === 'qa-open') {
    const ri = parseInt(btn.getAttribute('data-row-index'), 10)
    const acc = document.getElementById('hub-qa-acc-2-' + ri)
    if (acc) acc.classList.toggle('hidden')
    return
  }
  if (action === 'qa-cancel') {
    const id = btn.getAttribute('data-accordion')
    const acc = id && document.getElementById(id)
    if (acc) {
      acc.classList.add('hidden')
      const ta = acc.querySelector('.hub-qa-input')
      if (ta) ta.value = ''
    }
    return
  }

  if (action === 'signup-approve') {
    const idx = parseInt(btn.getAttribute('data-row-index'), 10)
    const rows = tables['dash-new-signups'] && tables['dash-new-signups'].rows
    const row = rows && rows[idx]
    if (!row || !/승인\s*대기/.test(String(row[4]))) return
    row[4] = '승인완료'
    const tr = btn.closest('tr')
    if (tr) {
      const tds = tr.querySelectorAll('td')
      if (tds[4]) tds[4].innerHTML = hubDashRenderCell('상태', '승인완료')
      const cell = btn.closest('td')
      if (cell) cell.innerHTML = '<span class="text-slate-400">—</span>'
    }
    hubToastBottom('성공적으로 처리되었습니다')
    hubSyncAllKpiFromMock()
    return
  }

  if (action === 'bank-confirm') {
    const ri = parseInt(btn.getAttribute('data-row-index'), 10)
    const uq = tables['dash-urgent-queue']
    if (!uq || !uq.sections || !uq.sections[0].rows || uq.sections[0].rows[ri] == null) return
    uq.sections[0].rows.splice(ri, 1)
    const bank = tables['dash-action-bank']
    if (bank && bank.rows && bank.rows[ri] !== undefined) bank.rows.splice(ri, 1)
    hubToastBottom('입금 처리가 완료되었습니다')
    hubSyncAllKpiFromMock()
    hubFadeThenRefreshModal(btn.closest('tr'))
    return
  }

  if (action === 'bank-standalone') {
    const ri = parseInt(btn.getAttribute('data-row-index'), 10)
    const bank = tables['dash-action-bank']
    if (!bank || !bank.rows || bank.rows[ri] == null) return
    bank.rows.splice(ri, 1)
    const uq = tables['dash-urgent-queue']
    if (uq && uq.sections && uq.sections[0].rows && uq.sections[0].rows[ri] !== undefined) uq.sections[0].rows.splice(ri, 1)
    hubToastBottom('입금 처리가 완료되었습니다')
    hubSyncAllKpiFromMock()
    hubFadeThenRefreshModal(btn.closest('tr'))
    return
  }

  if (action === 'b2b-confirm') {
    const ri = parseInt(btn.getAttribute('data-row-index'), 10)
    const uq = tables['dash-urgent-queue']
    if (!uq || !uq.sections || !uq.sections[1].rows || uq.sections[1].rows[ri] == null) return
    uq.sections[1].rows.splice(ri, 1)
    const b2b = tables['dash-action-b2b']
    if (b2b && b2b.rows && b2b.rows[ri] !== undefined) b2b.rows.splice(ri, 1)
    hubToastBottom('성공적으로 처리되었습니다')
    hubSyncAllKpiFromMock()
    hubFadeThenRefreshModal(btn.closest('tr'))
    return
  }

  if (action === 'b2b-standalone') {
    const ri = parseInt(btn.getAttribute('data-row-index'), 10)
    const b2b = tables['dash-action-b2b']
    if (!b2b || !b2b.rows || b2b.rows[ri] == null) return
    b2b.rows.splice(ri, 1)
    const uq = tables['dash-urgent-queue']
    if (uq && uq.sections && uq.sections[1].rows && uq.sections[1].rows[ri] !== undefined) uq.sections[1].rows.splice(ri, 1)
    hubToastBottom('성공적으로 처리되었습니다')
    hubSyncAllKpiFromMock()
    hubFadeThenRefreshModal(btn.closest('tr'))
    return
  }

  if (action === 'qa-open-standalone') {
    if (!confirm('답변을 완료하고 이 문의를 목록에서 제거할까요?')) return
    const ri = parseInt(btn.getAttribute('data-row-index'), 10)
    const inq = tables['dash-action-inquiry']
    if (!inq || !inq.rows || inq.rows[ri] == null) return
    inq.rows.splice(ri, 1)
    const uq = tables['dash-urgent-queue']
    if (uq && uq.sections && uq.sections[2].rows && uq.sections[2].rows[ri] !== undefined) uq.sections[2].rows.splice(ri, 1)
    hubToastBottom('성공적으로 처리되었습니다')
    hubSyncAllKpiFromMock()
    hubFadeThenRefreshModal(btn.closest('tr'))
    return
  }

  if (action === 'qa-send') {
    const ri = parseInt(btn.getAttribute('data-row-index'), 10)
    const uq = tables['dash-urgent-queue']
    if (!uq || !uq.sections || !uq.sections[2].rows || uq.sections[2].rows[ri] == null) return
    uq.sections[2].rows.splice(ri, 1)
    const inq = tables['dash-action-inquiry']
    if (inq && inq.rows && inq.rows[ri] !== undefined) inq.rows.splice(ri, 1)
    hubToastBottom('성공적으로 처리되었습니다')
    hubSyncAllKpiFromMock()
    const accTr = btn.closest('tr')
    const dataTr = accTr && accTr.previousElementSibling
    if (dataTr) dataTr.classList.add('hub-row-leaving')
    if (accTr) accTr.classList.add('hub-row-leaving')
    setTimeout(() => hubRefreshOpenDashboardModal(), 460)
    return
  }

  if (action === 'generic-ok') {
    const kind = btn.getAttribute('data-kind')
    const ri = parseInt(btn.getAttribute('data-row-index'), 10)
    const cfg = kind && tables[kind]
    if (!cfg || !cfg.rows || cfg.rows[ri] == null) return
    cfg.rows.splice(ri, 1)
    if (kind === 'dash-action-bank' && tables['dash-urgent-queue']?.sections?.[0]?.rows)
      tables['dash-urgent-queue'].sections[0].rows.splice(ri, 1)
    if (kind === 'dash-action-b2b' && tables['dash-urgent-queue']?.sections?.[1]?.rows)
      tables['dash-urgent-queue'].sections[1].rows.splice(ri, 1)
    if (kind === 'dash-action-inquiry' && tables['dash-urgent-queue']?.sections?.[2]?.rows)
      tables['dash-urgent-queue'].sections[2].rows.splice(ri, 1)
    hubToastBottom('성공적으로 처리되었습니다')
    hubSyncAllKpiFromMock()
    if (kind === 'dash-today-revenue') hubRecalcRevenueKpi()
    hubFadeThenRefreshModal(btn.closest('tr'))
  }
}

function hubRecalcRevenueKpi() {
  const t = hubGetMockTables()
  if (!t || !t['dash-today-revenue'] || !t['dash-today-revenue'].rows) return
  let sum = 0
  t['dash-today-revenue'].rows.forEach((r) => {
    const amt = String(r[2] || '').replace(/[^\d]/g, '')
    sum += parseInt(amt, 10) || 0
  })
  const el = document.getElementById('hubKpiRevenue')
  if (el) el.textContent = '₩ ' + sum.toLocaleString('ko-KR')
}

function bindHubDashboardDetailDemo() {
  document.addEventListener('click', (e) => {
    const apiT = e.target.closest('[data-hub-dash-api]')
    if (apiT) {
      const key = apiT.getAttribute('data-hub-dash-api')
      if (!key) return
      e.preventDefault()
      const fromKpiOrPanel = apiT.closest('#panel-dashboard')
      if (fromKpiOrPanel) openHubDashboardModalFromApiKey(key)
      else {
        hubNavigateDashboardThenOpenApiModal(key)
        if (typeof window.hubCloseMobileNav === 'function') window.hubCloseMobileNav()
      }
      return
    }
    const t = e.target.closest('[data-hub-dash-detail]')
    if (!t) return
    const kind = t.getAttribute('data-hub-dash-detail')
    if (!kind) return
    e.preventDefault()
    const fromKpiOrPanel = t.closest('#panel-dashboard')
    if (fromKpiOrPanel) openHubDashboardDetailModal(kind)
    else {
      hubNavigateDashboardThenOpenModal(kind)
      if (typeof window.hubCloseMobileNav === 'function') window.hubCloseMobileNav()
    }
  })

  document.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-hub-empty-go]')
    if (!b) return
    const h = b.getAttribute('data-hub-empty-go')
    closeHubDashboardDetailModal()
    if (h) location.hash = '#' + h
  })

  const modal = document.getElementById('hubDashboardDetailModal')
  if (modal) modal.addEventListener('click', hubModalLiveClickHandler)

  hubSyncAllKpiFromMock()
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
  const qs = new URLSearchParams({ page: String(hubUserPage), limit: '50' })
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
  return status === 'published'
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
      return `
    <tr class="border-t border-slate-100">
      <td class="p-3">${escapeHtml(c.title)} <span class="text-xs text-slate-400">#${c.id}</span>
        <span class="inline-flex flex-wrap items-center gap-0.5 align-middle">${hubCourseLineBadgesHtml(c.category_group)}</span></td>
      <td class="p-3 text-xs">${escapeHtml(hubAdminStatusKo(c.status))}</td>
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
  const next = checked ? 'published' : 'inactive'
  const res = await apiRequest('PATCH', '/api/admin/courses/' + courseId, { status: next })
  if (res.success) {
    showToast(checked ? '학생 사이트에 공개되었습니다.' : '학생 사이트에서 숨겼습니다.', 'success')
    loadCourses()
  } else {
    showToast(res.error || '상태 변경 실패', 'error')
    loadCourses()
  }
}

function hubCatalogLineTokensFromCsv(csv) {
  const parts = String(csv || 'CLASSIC')
    .toUpperCase()
    .replace(/\s/g, '')
    .split(/[,，]/)
    .filter(Boolean)
  const allowed = new Set(['CLASSIC', 'NEXT', 'NCS'])
  const uniq = []
  for (const p of parts) {
    if (allowed.has(p) && !uniq.includes(p)) uniq.push(p)
  }
  const order = { CLASSIC: 0, NCS: 1, NEXT: 2 }
  uniq.sort((a, b) => (order[a] ?? 9) - (order[b] ?? 9))
  return uniq.length ? uniq : ['CLASSIC']
}

function hubCourseCatalogLinesHtml(selectedCsv) {
  const actual = hubCatalogLineTokensFromCsv(selectedCsv)
  const rows = [
    { key: 'CLASSIC', label: 'Classic — 일반·본질' },
    { key: 'NEXT', label: 'Next — 특화·미래' },
    { key: 'NCS', label: 'NCS — 국가직무능력표준' },
  ]
  const checks = rows
    .map(
      (r) =>
        '<label class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 cursor-pointer hover:bg-slate-50">' +
        '<input type="checkbox" name="hubCatalogLine" value="' +
        escapeAttr(r.key) +
        '" class="rounded border-slate-300 text-indigo-600"' +
        (actual.includes(r.key) ? ' checked' : '') +
        '/>' +
        '<span class="text-sm text-slate-800">' +
        escapeHtml(r.label) +
        '</span></label>',
    )
    .join('')
  return (
    '<div class="space-y-1">' +
    '<span class="block text-sm font-medium">라인 (학생 카탈로그) — 복수 선택</span>' +
    '<div id="hubCatalogLinesWrap" class="flex flex-col gap-2">' +
    checks +
    '</div>' +
    '<p class="text-xs text-slate-500">Classic·Next·NCS를 동시에 지정할 수 있습니다. DB <code class="text-[11px]">category_group</code>에 CSV(예: CLASSIC,NCS)로 저장됩니다.</p>' +
    '</div>'
  )
}

function readHubCatalogLinesCsv() {
  const wrap = document.getElementById('hubCatalogLinesWrap')
  if (!wrap) return 'CLASSIC'
  const checked = Array.from(wrap.querySelectorAll('input[name="hubCatalogLine"]:checked')).map((el) => el.value)
  return hubCatalogLineTokensFromCsv(checked.join(',')).join(',')
}

function hubCourseLineBadgesHtml(csv) {
  const tokens = hubCatalogLineTokensFromCsv(csv)
  const styles = {
    CLASSIC: 'bg-slate-100 text-slate-600',
    NEXT: 'bg-violet-100 text-violet-800',
    NCS: 'bg-amber-100 text-amber-900',
  }
  const labels = { CLASSIC: 'Classic', NEXT: 'Next', NCS: 'NCS' }
  return tokens
    .map(
      (t) =>
        '<span class="ml-0.5 inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ' +
        (styles[t] || 'bg-slate-100 text-slate-600') +
        '">' +
        escapeHtml(labels[t] || t) +
        '</span>',
    )
    .join('')
}

function hubCatalogLinesDisplayForTable(csv) {
  const labels = { CLASSIC: 'Classic', NEXT: 'Next', NCS: 'NCS' }
  return hubCatalogLineTokensFromCsv(csv)
    .map((t) => labels[t] || t)
    .join(' · ')
}

window.openHubNewCourseModal = async function () {
  hubDescAiGen += 1
  currentCourseId = null
  window.hubCourseDraft = { thumbnail_url: null, thumbnail_image_ai: 0, price: 0, sale_price: null, duration_days: 90, validity_unlimited: 0 }
  courseModalLessons = []
  const options = await loadCourseFormOptions()
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
      ${hubCourseDescriptionSectionHtml('')}
      <label class="block text-sm font-medium">상태</label>
      <select id="hubCourseStatus" class="w-full border rounded px-3 py-2">
        ${hubCourseStatusSelectOptions('draft')}
      </select>
      <label class="block text-sm font-medium">담당 강사</label>
      <select id="hubCourseInstructorId" class="w-full border rounded px-3 py-2">
        ${hubSelectOptionsHtml(options.instructors, '', '강사 선택')}
      </select>
      <label class="block text-sm font-medium">연관 자격증</label>
      <select id="hubCourseCertificateId" class="w-full border rounded px-3 py-2">
        ${hubSelectOptionsHtml(options.certificate_types, '', '자격증 선택')}
      </select>
      <label class="block text-sm font-medium">난이도</label>
      <select id="hubCourseDifficulty" class="w-full border rounded px-3 py-2">
        ${hubDifficultySelectOptions('beginner')}
      </select>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label class="block text-sm font-medium">정가(원)
          <input type="number" min="0" step="100" id="hubCourseRegularPrice" class="mt-1 w-full border rounded px-3 py-2" value="0">
        </label>
        <label class="block text-sm font-medium">판매가(원)
          <input type="number" min="0" step="100" id="hubCourseSalePrice" class="mt-1 w-full border rounded px-3 py-2" value="" placeholder="비우면 정가와 동일">
        </label>
      </div>
      <p id="hubCourseDiscountHint" class="text-sm font-semibold text-indigo-700 hidden min-h-[1.25rem]"></p>
      <label class="block text-sm font-medium">비고 (할인 사유 등)</label>
      <textarea id="hubCoursePriceRemarks" rows="2" class="w-full border rounded px-3 py-2" placeholder="예: 오픈 기념 특별 할인"></textarea>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
        <label class="block text-sm font-medium">수강 유효 기간(일)
          <input type="number" min="1" step="1" id="hubCourseDurationDays" class="mt-1 w-full border rounded px-3 py-2" value="90">
        </label>
        <label class="flex items-center gap-2 text-sm font-medium pb-2">
          <input type="checkbox" id="hubCourseDurationUnlimited" class="rounded border-slate-300 text-indigo-600">
          무제한
        </label>
      </div>
      <label class="block text-sm font-medium">대표 썸네일</label>
      <p class="text-xs text-slate-500">파일 선택, 드래그·놓기, 화면에서 <kbd class="px-1 bg-slate-100 rounded text-[10px]">Ctrl+V</kbd> 붙여넣기, 또는 AI 생성 (저장 후 재생성 가능)</p>
      <div id="hubCourseThumbDrop" class="border-2 border-dashed border-slate-300 rounded-lg p-2 bg-slate-50/50 min-h-[8.5rem] flex items-center justify-center">
        <img id="hubCourseThumbPreview" src="" alt="" class="max-h-32 w-full max-w-xs object-cover rounded border border-slate-200 bg-white">
      </div>
      <div class="flex flex-wrap gap-2 items-center">
        <input type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" id="hubCourseThumbFile" class="text-sm flex-1 min-w-[12rem]">
        <button type="button" class="text-sm shrink-0 bg-violet-600 text-white px-3 py-2 rounded-lg hover:bg-violet-700" onclick="hubRegenerateCourseThumbnailAi()">🔄 AI 썸네일 다시 생성</button>
      </div>
      <p id="hubCourseThumbAiHint" class="text-xs text-indigo-600 hidden min-h-[1rem]"></p>
      ${hubCourseCatalogLinesHtml('CLASSIC')}
      <label class="block text-sm font-medium">오프라인 모임 안내 (선택)</label>
      <p class="text-xs text-slate-500 -mt-1 mb-1">입력 시 강좌 상세에 「오프라인 모임 신청하기」가 열립니다.</p>
      <textarea id="hubCourseScheduleInfo" rows="3" class="w-full border rounded px-3 py-2" placeholder="모임 일시·장소·안내 문구를 입력하세요."></textarea>
      <button type="button" onclick="saveCourseBasics()" class="mt-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">등록</button>
    </div>`
  wireHubCourseTitleAiBlur()
  wireCoursePricingInputs()
  hubWireCourseThumbnailUi()
  hubEnsureCourseThumbPasteListener()
  hubSyncCourseThumbAiHint()
  const durationUnlimited = document.getElementById('hubCourseDurationUnlimited')
  const durationDays = document.getElementById('hubCourseDurationDays')
  if (durationUnlimited && durationDays) {
    durationUnlimited.addEventListener('change', () => {
      durationDays.disabled = durationUnlimited.checked
      if (durationUnlimited.checked) durationDays.value = ''
    })
  }
  const lessons = document.getElementById('courseTabPanelLessons')
  if (lessons) {
    lessons.innerHTML =
      '<p class="text-slate-500 text-sm">먼저 기본 정보를 저장해 강좌를 만든 뒤, 차시·영상을 편집할 수 있습니다.</p>'
  }
  setupCourseTabs()
}

window.hubNavigateToNewCourse = function (e) {
  try {
    if (String(location.hash || '') === '#courses') {
      if (e && typeof e.preventDefault === 'function') e.preventDefault()
      if (typeof window.openHubNewCourseModal === 'function') void window.openHubNewCourseModal()
      return false
    }
  } catch (_) {
    /* ignore */
  }
  try {
    sessionStorage.setItem('hubOpenNewCourse', '1')
  } catch (_) {
    /* ignore */
  }
  return true
}

window.openCourseModal = async function (courseId) {
  hubDescAiGen += 1
  currentCourseId = courseId
  const options = await loadCourseFormOptions()
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
  info.innerHTML = `
    <div class="space-y-2">
      <label class="block text-sm font-medium">제목</label>
      <input id="hubCourseTitle" class="w-full border rounded px-3 py-2" value="${escapeAttr(cr.title)}">
      ${hubCourseDescriptionSectionHtml(escapeHtml(cr.description || ''))}
      <label class="block text-sm font-medium">상태</label>
      <select id="hubCourseStatus" class="w-full border rounded px-3 py-2">
        ${hubCourseStatusSelectOptions(hubNormalizeCourseStatusForSelect(cr.status || 'draft'))}
      </select>
      <label class="block text-sm font-medium">담당 강사</label>
      <select id="hubCourseInstructorId" class="w-full border rounded px-3 py-2">
        ${hubSelectOptionsHtml(options.instructors, cr.instructor_id ?? '', '강사 선택')}
      </select>
      <label class="block text-sm font-medium">연관 자격증</label>
      <select id="hubCourseCertificateId" class="w-full border rounded px-3 py-2">
        ${hubSelectOptionsHtml(options.certificate_types, cr.certificate_id ?? '', '자격증 선택')}
      </select>
      <label class="block text-sm font-medium">난이도</label>
      <select id="hubCourseDifficulty" class="w-full border rounded px-3 py-2">
        ${hubDifficultySelectOptions(cr.difficulty || 'beginner')}
      </select>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label class="block text-sm font-medium">정가(원)
          <input type="number" min="0" step="100" id="hubCourseRegularPrice" class="mt-1 w-full border rounded px-3 py-2" value="${escapeAttr(String(cr.regular_price ?? cr.price ?? 0))}">
        </label>
        <label class="block text-sm font-medium">판매가(원)
          <input type="number" min="0" step="100" id="hubCourseSalePrice" class="mt-1 w-full border rounded px-3 py-2" value="${escapeAttr(cr.sale_price != null ? String(cr.sale_price) : cr.discount_price != null ? String(cr.discount_price) : '')}" placeholder="비우면 정가와 동일">
        </label>
      </div>
      <p id="hubCourseDiscountHint" class="text-sm font-semibold text-indigo-700 hidden min-h-[1.25rem]"></p>
      <label class="block text-sm font-medium">비고 (할인 사유 등)</label>
      <textarea id="hubCoursePriceRemarks" rows="2" class="w-full border rounded px-3 py-2" placeholder="예: 오픈 기념 특별 할인">${escapeHtml(cr.price_remarks || '')}</textarea>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
        <label class="block text-sm font-medium">수강 유효 기간(일)
          <input type="number" min="1" step="1" id="hubCourseDurationDays" class="mt-1 w-full border rounded px-3 py-2" value="${escapeAttr(String(cr.duration_days ?? 90))}">
        </label>
        <label class="flex items-center gap-2 text-sm font-medium pb-2">
          <input type="checkbox" id="hubCourseDurationUnlimited" ${Number(cr.validity_unlimited || 0) ? 'checked' : ''} class="rounded border-slate-300 text-indigo-600">
          무제한
        </label>
      </div>
      <label class="block text-sm font-medium">대표 썸네일</label>
      <p class="text-xs text-slate-500">파일 선택, 드래그·놓기, <kbd class="px-1 bg-slate-100 rounded text-[10px]">Ctrl+V</kbd> 붙여넣기, 또는 AI 재생성</p>
      <div id="hubCourseThumbDrop" class="border-2 border-dashed border-slate-300 rounded-lg p-2 bg-slate-50/50 min-h-[8.5rem] flex items-center justify-center">
        <img id="hubCourseThumbPreview" src="${escapeAttr(cr.thumbnail_url || '')}" alt="" class="max-h-32 w-full max-w-xs object-cover rounded border border-slate-200 bg-white">
      </div>
      <div class="flex flex-wrap gap-2 items-center">
        <input type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" id="hubCourseThumbFile" class="text-sm flex-1 min-w-[12rem]">
        <button type="button" class="text-sm shrink-0 bg-violet-600 text-white px-3 py-2 rounded-lg hover:bg-violet-700" onclick="hubRegenerateCourseThumbnailAi()">🔄 AI 썸네일 다시 생성</button>
      </div>
      <p id="hubCourseThumbAiHint" class="text-xs text-indigo-600 hidden min-h-[1rem]"></p>
      ${hubCourseCatalogLinesHtml(cr.category_group || 'CLASSIC')}
      <label class="block text-sm font-medium">오프라인 모임 안내 (선택)</label>
      <p class="text-xs text-slate-500 -mt-1 mb-1">입력 시 강좌 상세에 「오프라인 모임 신청하기」가 열립니다.</p>
      <textarea id="hubCourseScheduleInfo" rows="3" class="w-full border rounded px-3 py-2" placeholder="모임 일시·장소·안내 문구를 입력하세요.">${escapeHtml((cr.offline_info != null && String(cr.offline_info).trim() !== '' ? cr.offline_info : cr.schedule_info) || '')}</textarea>
      <button type="button" onclick="saveCourseBasics()" class="mt-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">저장</button>
    </div>`
  wireHubCourseTitleAiBlur()
  wireCoursePricingInputs()
  hubWireCourseThumbnailUi()
  hubEnsureCourseThumbPasteListener()
  if (window.hubCourseDraft && window.hubCourseDraft.thumbnail_image_ai == null) window.hubCourseDraft.thumbnail_image_ai = 0
  hubSyncCourseThumbAiHint()
  const durationUnlimited = document.getElementById('hubCourseDurationUnlimited')
  const durationDays = document.getElementById('hubCourseDurationDays')
  if (durationUnlimited && durationDays) {
    durationDays.disabled = durationUnlimited.checked
    if (durationUnlimited.checked) durationDays.value = ''
    durationUnlimited.addEventListener('change', () => {
      durationDays.disabled = durationUnlimited.checked
      if (durationUnlimited.checked) durationDays.value = ''
      else if (!durationDays.value) durationDays.value = String(cr.duration_days || 90)
    })
  }
  renderLessonEditors(courseId)
  setupCourseTabs()
}

async function loadCourseMeetupPanel(courseId) {
  const mount = document.getElementById('courseMeetupListMount')
  if (!mount) return
  mount.innerHTML = '<p class="text-slate-500">불러오는 중…</p>'
  const res = await apiRequest('GET', '/api/admin/courses/' + courseId + '/offline-applications')
  if (!res.success || !Array.isArray(res.data)) {
    mount.innerHTML = '<p class="text-red-600 text-sm">목록을 불러오지 못했습니다.</p>'
    return
  }
  const rows = res.data
  if (!rows.length) {
    mount.innerHTML = '<p class="text-slate-500">아직 신청이 없습니다.</p>'
    return
  }
  mount.innerHTML =
    '<div class="overflow-x-auto border border-slate-200 rounded-lg max-h-[55vh] overflow-y-auto">' +
    '<table class="w-full text-sm text-left">' +
    '<thead class="bg-slate-50 text-slate-600 sticky top-0"><tr>' +
    '<th class="p-2">접수일시</th><th class="p-2">이름</th><th class="p-2">전화</th><th class="p-2">지역</th><th class="p-2 min-w-[12rem]">신청 동기</th><th class="p-2">회원ID</th>' +
    '</tr></thead><tbody>' +
    rows
      .map((r) => {
        const dt = escapeHtml(String(r.created_at || ''))
        const nm = escapeHtml(String(r.applicant_name || ''))
        const ph = escapeHtml(String(r.phone || ''))
        const rg = escapeHtml(String(r.region || '—'))
        const mot = escapeHtml(String(r.motivation || '—'))
        const uid = r.user_id != null ? escapeHtml(String(r.user_id)) : '—'
        return (
          '<tr class="border-t border-slate-100">' +
          `<td class="p-2 whitespace-nowrap text-xs text-slate-600">${dt}</td>` +
          `<td class="p-2 font-medium">${nm}</td>` +
          `<td class="p-2">${ph}</td>` +
          `<td class="p-2">${rg}</td>` +
          `<td class="p-2 text-xs text-slate-700">${mot}</td>` +
          `<td class="p-2 text-xs text-slate-500">${uid}</td>` +
          '</tr>'
        )
      })
      .join('') +
    '</tbody></table></div>'
}

function setupCourseTabs() {
  const t1 = document.getElementById('courseTabInfo')
  const t2 = document.getElementById('courseTabLessons')
  const t3 = document.getElementById('courseTabAdvanced')
  const t4 = document.getElementById('courseTabMeetup')
  const p1 = document.getElementById('courseTabPanelInfo')
  const p2 = document.getElementById('courseTabPanelLessons')
  const p3 = document.getElementById('courseTabPanelAdvanced')
  const p4 = document.getElementById('courseTabPanelMeetup')
  const isNew = currentCourseId == null
  if (t2) t2.classList.toggle('hidden', isNew)
  if (t3) t3.classList.toggle('hidden', isNew)
  if (t4) t4.classList.toggle('hidden', isNew)
  const activate = async (n) => {
    if (n !== 1 && hasUnsavedLessonDrafts()) {
      const ok = confirm('차시·영상 탭의 저장되지 않은 변경사항이 있습니다. 탭을 이동할까요?')
      if (!ok) return
    }
    // 서버 재조회 없음. DOM에 차시 행 수가 메모리와 같으면 다시 그리지 않아 탭 왕복 시 미저장 입력 유지
    if (n === 1 && currentCourseId) {
      const panel = document.getElementById('courseTabPanelLessons')
      const rowCount = panel ? panel.querySelectorAll('[data-lesson-id]').length : 0
      const expected = Array.isArray(courseModalLessons) ? courseModalLessons.length : 0
      if (rowCount !== expected || (expected > 0 && rowCount === 0)) {
        renderLessonEditors(currentCourseId)
      }
    }
    if (n === 2 && currentCourseId) {
      if (hasUnsavedLessonDrafts()) {
        const doSave = confirm('차시 전체 편집으로 이동하기 전에 현재 차시 변경을 먼저 저장할까요?')
        if (doSave) {
          const saved = await hubSaveAllLessonDrafts(currentCourseId)
          if (!saved) return
          await reloadCourseModalLessons(currentCourseId)
        }
      }
      refreshAdvancedLessonsFrame(currentCourseId)
    }
    if (n === 3 && currentCourseId) {
      await loadCourseMeetupPanel(currentCourseId)
    }
    ;[t1, t2, t3, t4].forEach((t, i) => {
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
    if (p4) p4.classList.toggle('hidden', n !== 3)
  }
  if (t1) t1.onclick = () => void activate(0)
  if (t2) t2.onclick = () => void activate(1)
  if (t3) t3.onclick = () => void activate(2)
  if (t4) t4.onclick = () => void activate(3)
  void activate(0)
}

function renderLessonEditors(courseId) {
  const lessons = document.getElementById('courseTabPanelLessons')
  if (!lessons) return
  const toolbar =
    '<div class="flex flex-wrap items-center justify-between gap-2 mb-3">' +
    '<p class="text-sm text-slate-600 max-w-xl">차시별 제목·영상 URL·학습 시간(분)을 입력하고, 필요 시 영상 파일을 올릴 수 있습니다. 강좌 <strong>저장</strong> 시 기본 정보와 차시가 함께 반영됩니다.</p>' +
    '<button type="button" onclick="hubAddLesson()" class="shrink-0 text-sm bg-slate-700 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800">+ 차시 추가</button></div>' +
    '<p class="text-xs text-slate-500 mb-2"><button type="button" class="text-indigo-600 hover:underline" onclick="hubSaveLessonsOnly()">차시 변경만 저장</button></p>'

  if (!courseModalLessons.length) {
    lessons.innerHTML =
      toolbar + '<p class="text-slate-500 text-sm">등록된 차시가 없습니다. 차시 추가로 시작하세요.</p>'
    return
  }
  lessons.innerHTML =
    toolbar +
    courseModalLessons
      .map((l) => {
        const dur = hubLessonDurationDisplay(l)
        return (
          '<div class="border border-slate-200 rounded-lg p-3 mb-2" data-lesson-id="' +
          l.id +
          '">' +
          '<div class="flex flex-wrap items-start justify-between gap-2 mb-2">' +
          '<span class="font-medium text-sm text-slate-800">' +
          l.lesson_number +
          '차시</span>' +
          '<button type="button" class="text-xs text-red-600 hover:underline" onclick="hubDeleteLesson(' +
          courseId +
          ', ' +
          l.id +
          ')">삭제</button></div>' +
          '<label class="block text-xs text-slate-500 mb-0.5">차시 제목</label>' +
          '<input type="text" id="lesson-title-' +
          l.id +
          '" class="w-full border rounded px-2 py-1 text-sm mb-2" value="' +
          escapeAttr(l.title || '') +
          '">' +
          '<label class="block text-xs text-slate-500 mb-0.5">영상 URL</label>' +
          '<input type="text" id="lesson-url-' +
          l.id +
          '" class="w-full border rounded px-2 py-1 text-sm mb-2" value="' +
          escapeAttr(l.video_url || '') +
          '" placeholder="YouTube 또는 외부 영상 URL">' +
          '<label class="block text-xs text-slate-500 mb-0.5">학습 시간 (분)</label>' +
          '<input type="number" min="0" step="1" id="lesson-dur-' +
          l.id +
          '" class="w-full max-w-[10rem] border rounded px-2 py-1 text-sm mb-2" value="' +
          dur +
          '">' +
          '<div class="flex flex-wrap items-center gap-2 mt-1">' +
          '<label class="text-xs text-slate-600 flex-1 min-w-[12rem]">영상 파일 업로드' +
          '<input type="file" accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,.mp4,.webm,.mov,.avi" class="block text-xs mt-1 w-full" onchange="hubUploadLessonVideo(' +
          courseId +
          ', ' +
          l.id +
          ', this)"></label>' +
          '<button type="button" class="text-xs text-indigo-600 hover:underline shrink-0" onclick="saveLessonVideo(' +
          courseId +
          ', ' +
          l.id +
          ')">이 차시만 저장</button></div></div>'
        )
      })
      .join('')
}

window.hubAddLesson = async function () {
  if (!currentCourseId) return
  const nums = courseModalLessons.map((l) => l.lesson_number)
  const next = nums.length ? Math.max(...nums) + 1 : 1
  const res = await apiRequest('POST', '/api/courses/' + currentCourseId + '/lessons', {
    lesson_number: next,
    title: '차시 ' + next,
    description: '',
    video_url: null,
    video_duration_minutes: 0,
    is_preview: 0,
  })
  if (res.success) {
    showToast('차시가 추가되었습니다.', 'success')
    await reloadCourseModalLessons(currentCourseId)
  } else showToast(res.error || '차시 추가 실패', 'error')
}

window.hubDeleteLesson = async function (courseId, lessonId) {
  if (!confirm('이 차시를 삭제할까요?')) return
  const res = await apiRequest('DELETE', '/api/courses/' + courseId + '/lessons/' + lessonId)
  if (res.success) {
    showToast('차시가 삭제되었습니다.', 'success')
    await reloadCourseModalLessons(courseId)
    loadCourses()
  } else showToast(res.error || '삭제 실패', 'error')
}

window.hubSaveLessonsOnly = async function () {
  if (!currentCourseId) return
  const ok = await hubSaveAllLessonDrafts(currentCourseId)
  if (ok) {
    showToast('차시 정보가 저장되었습니다.', 'success')
    await reloadCourseModalLessons(currentCourseId)
    loadCourses()
  }
}

window.hubUploadLessonVideo = async function (courseId, lessonId, input) {
  const file = input && input.files && input.files[0]
  if (!file) return
  const form = new FormData()
  form.append('file', file)
  form.append('lesson_id', String(lessonId))
  try {
    const response = await fetch('/api/upload/video', { method: 'POST', body: form, credentials: 'include' })
    const text = await response.text()
    let parsed = null
    if (text) {
      try {
        parsed = JSON.parse(text)
      } catch {
        /* ignore */
      }
    }
    if (response.ok && parsed && parsed.success) {
      showToast(parsed.message || '영상 메타데이터가 반영되었습니다.', 'success')
      const durEl = document.getElementById('lesson-dur-' + lessonId)
      if (durEl && parsed.data && parsed.data.duration != null) durEl.value = String(parsed.data.duration)
      await reloadCourseModalLessons(courseId)
    } else {
      const err = (parsed && (parsed.error || parsed.message)) || text || '업로드 실패'
      showToast(err, 'error')
    }
  } catch (e) {
    showToast('업로드 중 오류가 발생했습니다.', 'error')
  }
  input.value = ''
}

/** 강좌 저장 API용 — courses 테이블에 없는 레거시·차시 키 제거 */
function stripCoursePayloadDeadKeys(obj) {
  if (!obj || typeof obj !== 'object') return
  delete obj.is_free
  delete obj.is_free_preview
  delete obj.is_preview
}

window.saveLessonVideo = async function (courseId, lessonId) {
  const urlEl = document.getElementById('lesson-url-' + lessonId)
  const durEl = document.getElementById('lesson-dur-' + lessonId)
  const titleEl = document.getElementById('lesson-title-' + lessonId)
  const video_url = urlEl?.value?.trim() || ''
  const duration_minutes = Math.max(0, parseInt(String(durEl?.value ?? '0'), 10) || 0)
  const title = titleEl?.value?.trim()
  const payload = { video_url, duration_minutes }
  if (title) payload.title = title
  const res = await apiRequest('PUT', `/api/courses/${courseId}/lessons/${lessonId}`, payload)
  if (res.success) showToast('차시가 저장되었습니다.', 'success')
  else showToast(res.error || '저장 실패', 'error')
}

window.saveCourseBasics = async function () {
  const title = document.getElementById('hubCourseTitle')?.value
  const description = document.getElementById('hubCourseDesc')?.value
  const status = document.getElementById('hubCourseStatus')?.value
  const category_group = readHubCatalogLinesCsv()
  const thumb = window.hubCourseDraft?.thumbnail_url ?? null
  const instructor_id = document.getElementById('hubCourseInstructorId')?.value || null
  const certificate_id = document.getElementById('hubCourseCertificateId')?.value || null
  const linked_certificate_id = certificate_id
  const regular_price = Math.max(0, toIntOr(document.getElementById('hubCourseRegularPrice')?.value, 0))
  const difficulty = document.getElementById('hubCourseDifficulty')?.value || 'beginner'
  const saleRaw = document.getElementById('hubCourseSalePrice')?.value
  const sale_price = String(saleRaw ?? '').trim() === '' ? null : Math.max(0, toIntOr(saleRaw, 0))
  const validity_unlimited = document.getElementById('hubCourseDurationUnlimited')?.checked ? 1 : 0
  const duration_days = validity_unlimited ? null : Math.max(1, toIntOr(document.getElementById('hubCourseDurationDays')?.value, 90))
  const meetText = (document.getElementById('hubCourseScheduleInfo')?.value ?? '').trim()
  const price_remarks = (document.getElementById('hubCoursePriceRemarks')?.value ?? '').trim() || null

  if (currentCourseId == null) {
    const postBody = {
      title,
      description,
      status,
      thumbnail_url: thumb,
      thumbnail_image_ai: window.hubCourseDraft?.thumbnail_image_ai != null ? Number(window.hubCourseDraft.thumbnail_image_ai) : 0,
      regular_price,
      price: regular_price,
      sale_price,
      instructor_id,
      linked_certificate_id,
      certificate_id,
      difficulty,
      duration_days,
      validity_unlimited,
      category_group,
      offline_info: meetText || null,
      schedule_info: meetText || null,
      price_remarks,
    }
    stripCoursePayloadDeadKeys(postBody)
    const res = await apiRequest('POST', '/api/admin/courses', postBody)
    if (res.success && res.data && res.data.id) {
      showToast('강좌가 등록되었습니다. 차시·영상을 이어서 편집할 수 있습니다.', 'success')
      loadCourses()
      await openCourseModal(res.data.id)
    } else showToast(res.error || '등록 실패', 'error')
    return
  }

  const putBody = {
    title,
    description,
    status,
    thumbnail_url: thumb,
    thumbnail_image_ai: window.hubCourseDraft?.thumbnail_image_ai != null ? Number(window.hubCourseDraft.thumbnail_image_ai) : 0,
    regular_price,
    price: regular_price,
    sale_price,
    instructor_id,
    linked_certificate_id,
    certificate_id,
    difficulty,
    duration_days,
    validity_unlimited,
    category_group,
    offline_info: meetText || null,
    schedule_info: meetText || null,
    price_remarks,
  }
  stripCoursePayloadDeadKeys(putBody)
  const res = await apiRequest('PUT', '/api/admin/courses/' + currentCourseId, putBody)
  if (res.success) {
    const okLessons = await hubSaveAllLessonDrafts(currentCourseId)
    loadCourses()
    if (okLessons) {
      showToast('기본 정보와 차시가 저장되었습니다.', 'success')
      await reloadCourseModalLessons(currentCourseId)
      refreshAdvancedLessonsFrame(currentCourseId)
    } else {
      showToast('강좌 기본 정보는 저장되었습니다. 차시 저장을 확인해 주세요.', 'warning')
    }
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

function hubSqlDatetimeToLocalInput(s) {
  if (s == null || s === '') return ''
  return String(s).replace(' ', 'T').slice(0, 16)
}

function hubPopupDefaultDatetimeRange() {
  const pad = (n) => String(n).padStart(2, '0')
  const d = new Date()
  const end = new Date(d.getTime() + 7 * 86400000)
  const fmt = (x) =>
    `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`
  return { start: fmt(d), end: fmt(end) }
}

async function loadHubPopupOrganizations() {
  const sel = document.getElementById('hubPopupOrgId')
  if (!sel) return
  const res = await apiRequest('GET', '/api/admin/organizations')
  const rows = res.success && Array.isArray(res.data) ? res.data : []
  const cur = sel.value
  sel.innerHTML =
    '<option value="">기관 선택 (전체 B2B)</option>' +
    rows
      .map(
        (o) =>
          '<option value="' +
          escapeAttr(String(o.id)) +
          '">' +
          escapeHtml(String(o.name || o.id)) +
          '</option>',
      )
      .join('')
  if (cur) sel.value = cur
}

function hubPopupSyncOrgSelect() {
  const aud = document.getElementById('hubPopupTargetAudience')
  const org = document.getElementById('hubPopupOrgId')
  if (!aud || !org) return
  const b2b = aud.value === 'b2b'
  org.disabled = !b2b
  org.classList.toggle('text-slate-400', !b2b)
  org.classList.toggle('text-slate-900', b2b)
}

function hubPopupRefreshImagePreview() {
  const url = (document.getElementById('hubPopupImageUrl')?.value || '').trim()
  const img = document.getElementById('hubPopupImagePreview')
  const ph = document.getElementById('hubPopupImagePreviewPlaceholder')
  if (!img || !ph) return
  if (url) {
    img.src = url
    img.classList.remove('hidden')
    ph.classList.add('hidden')
  } else {
    img.removeAttribute('src')
    img.classList.add('hidden')
    ph.classList.remove('hidden')
  }
}

function closeHubPopupModal() {
  const modal = document.getElementById('hubPopupModal')
  if (!modal) return
  modal.classList.add('hidden')
  modal.classList.remove('flex')
}

window.hubOpenPopupEditor = async function (id) {
  const modal = document.getElementById('hubPopupModal')
  if (!modal) return
  await loadHubPopupOrganizations()
  hubPopupSyncOrgSelect()

  const hid = document.getElementById('hubPopupId')
  const title = document.getElementById('hubPopupTitle')
  const imgUrl = document.getElementById('hubPopupImageUrl')
  const linkUrl = document.getElementById('hubPopupLinkUrl')
  const aud = document.getElementById('hubPopupTargetAudience')
  const org = document.getElementById('hubPopupOrgId')
  const start = document.getElementById('hubPopupStart')
  const end = document.getElementById('hubPopupEnd')
  const active = document.getElementById('hubPopupActive')
  const file = document.getElementById('hubPopupImageFile')
  if (file) file.value = ''

  if (id) {
    const res = await apiRequest('GET', '/api/popups/' + id)
    if (!res.success || !res.data) {
      showToast(res.error || '팝업을 불러오지 못했습니다.', 'error')
      return
    }
    const p = res.data
    if (hid) hid.value = String(p.id)
    if (title) title.value = p.title || ''
    if (imgUrl) imgUrl.value = p.image_url || ''
    if (linkUrl) linkUrl.value = p.link_url || ''
    if (aud) aud.value = p.target_audience === 'b2b' ? 'b2b' : 'all'
    hubPopupSyncOrgSelect()
    if (org && p.org_id != null) org.value = String(p.org_id)
    if (start) start.value = hubSqlDatetimeToLocalInput(p.start_date)
    if (end) end.value = hubSqlDatetimeToLocalInput(p.end_date)
    if (active) active.checked = Number(p.is_active) === 1
    document.getElementById('hubPopupModalTitle').textContent = '팝업 수정'
  } else {
    if (hid) hid.value = ''
    if (title) title.value = ''
    if (imgUrl) imgUrl.value = ''
    if (linkUrl) linkUrl.value = ''
    if (aud) aud.value = 'all'
    hubPopupSyncOrgSelect()
    if (org) org.value = ''
    const dr = hubPopupDefaultDatetimeRange()
    if (start) start.value = dr.start
    if (end) end.value = dr.end
    if (active) active.checked = true
    document.getElementById('hubPopupModalTitle').textContent = '팝업 등록'
  }
  hubPopupRefreshImagePreview()
  modal.classList.remove('hidden')
  modal.classList.add('flex')
}

async function loadHubPopups() {
  const tbody = document.getElementById('hubPopupsTableBody')
  if (!tbody) return
  tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-slate-500">불러오는 중…</td></tr>'
  const res = await apiRequest('GET', '/api/popups')
  if (!res.success) {
    tbody.innerHTML =
      '<tr><td colspan="8" class="p-4 text-red-600">' +
      escapeHtml(res.error || '목록을 불러오지 못했습니다.') +
      '</td></tr>'
    return
  }
  const rows = Array.isArray(res.data) ? res.data : []
  const now = Date.now()
  tbody.innerHTML = rows.length
    ? rows
        .map((p) => {
          const aud =
            p.target_audience === 'b2b'
              ? p.organization_name
                ? 'B2B · ' + String(p.organization_name)
                : p.org_id
                  ? 'B2B · 기관 #' + p.org_id
                  : 'B2B · 전체'
              : '전체'
          const start = p.start_date ? formatDateTime(p.start_date) : '—'
          const end = p.end_date ? formatDateTime(p.end_date) : '—'
          const active = Number(p.is_active) === 1
          let live = '—'
          if (active && p.start_date && p.end_date) {
            const s = new Date(p.start_date).getTime()
            const e = new Date(p.end_date).getTime()
            if (!Number.isNaN(s) && !Number.isNaN(e) && now >= s && now <= e) live = '<span class="text-emerald-600 font-medium">노출 중</span>'
            else if (now < s) live = '<span class="text-amber-600">대기</span>'
            else live = '<span class="text-slate-400">기간 만료</span>'
          }
          const st = active ? '<span class="text-emerald-700">활성</span>' : '<span class="text-slate-500">비활성</span>'
          const id = String(p.id)
          const views = Number(p.view_count) || 0
          const clicks = Number(p.click_count) || 0
          return (
            '<tr class="border-t border-slate-100 hover:bg-slate-50">' +
            '<td class="p-3 tabular-nums">' +
            escapeHtml(id) +
            '</td>' +
            '<td class="p-3 font-medium text-slate-800">' +
            escapeHtml(p.title || '') +
            '</td>' +
            '<td class="p-3 text-slate-700">' +
            escapeHtml(aud) +
            '</td>' +
            '<td class="p-3 text-xs text-slate-600 whitespace-nowrap">' +
            escapeHtml(start) +
            ' ~<br>' +
            escapeHtml(end) +
            '</td>' +
            '<td class="p-3 text-xs">' +
            st +
            '<div class="text-[11px] text-slate-500 mt-0.5">' +
            live +
            '</div></td>' +
            '<td class="p-3 text-right tabular-nums text-slate-700">' +
            escapeHtml(String(views)) +
            '</td>' +
            '<td class="p-3 text-right tabular-nums text-slate-700">' +
            escapeHtml(String(clicks)) +
            '</td>' +
            '<td class="p-3 text-right whitespace-nowrap space-x-2">' +
            '<button type="button" class="text-indigo-600 hover:underline text-sm hub-popup-edit" data-popup-id="' +
            escapeAttr(id) +
            '">편집</button>' +
            '<button type="button" class="text-rose-600 hover:underline text-sm hub-popup-del" data-popup-id="' +
            escapeAttr(id) +
            '">삭제</button>' +
            '</td></tr>'
          )
        })
        .join('')
    : '<tr><td colspan="8" class="p-8 text-center text-slate-500">등록된 팝업이 없습니다.</td></tr>'
}

async function hubPopupFormSubmit(e) {
  e.preventDefault()
  const hid = document.getElementById('hubPopupId')
  const id = (hid && hid.value ? hid.value : '').trim()
  const audEl = document.getElementById('hubPopupTargetAudience')
  const orgEl = document.getElementById('hubPopupOrgId')
  const aud = audEl ? audEl.value : 'all'
  const orgRaw = orgEl && !orgEl.disabled ? orgEl.value : ''
  const orgId = aud === 'b2b' && orgRaw ? parseInt(orgRaw, 10) : null

  const payload = {
    title: (document.getElementById('hubPopupTitle')?.value || '').trim(),
    image_url: (document.getElementById('hubPopupImageUrl')?.value || '').trim() || null,
    link_url: (document.getElementById('hubPopupLinkUrl')?.value || '').trim() || null,
    link_text: null,
    content: null,
    target_audience: aud,
    org_id: orgId,
    start_date: document.getElementById('hubPopupStart')?.value || '',
    end_date: document.getElementById('hubPopupEnd')?.value || '',
    is_active: document.getElementById('hubPopupActive')?.checked ? 1 : 0,
    display_type: 'modal',
    priority: 0,
  }

  const res = id
    ? await apiRequest('PUT', '/api/popups/' + id, payload)
    : await apiRequest('POST', '/api/popups', payload)
  if (res.success) {
    showToast(res.message || '저장되었습니다.', 'success')
    closeHubPopupModal()
    await loadHubPopups()
  } else {
    showToast(res.error || '저장 실패', 'error')
  }
}

function initHubPopupsPanel() {
  document.getElementById('hubPopupBtnNew')?.addEventListener('click', () => {
    void hubOpenPopupEditor(null)
  })
  document.getElementById('hubPopupModalClose')?.addEventListener('click', closeHubPopupModal)
  document.getElementById('hubPopupCancel')?.addEventListener('click', closeHubPopupModal)
  document.getElementById('hubPopupModal')?.addEventListener('click', (ev) => {
    if (ev.target && ev.target.id === 'hubPopupModal') closeHubPopupModal()
  })
  document.getElementById('hubPopupForm')?.addEventListener('submit', hubPopupFormSubmit)
  document.getElementById('hubPopupTargetAudience')?.addEventListener('change', hubPopupSyncOrgSelect)
  document.getElementById('hubPopupImageUrl')?.addEventListener('input', hubPopupRefreshImagePreview)

  document.getElementById('hubPopupImageFile')?.addEventListener('change', async (ev) => {
    const input = ev.target
    const file = input && input.files && input.files[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    try {
      const response = await fetch('/api/upload/image', { method: 'POST', body: fd, credentials: 'include' })
      const text = await response.text()
      let parsed = null
      try {
        parsed = text ? JSON.parse(text) : null
      } catch {
        /* ignore */
      }
      if (response.ok && parsed && parsed.success && parsed.data && parsed.data.url) {
        const urlEl = document.getElementById('hubPopupImageUrl')
        if (urlEl) urlEl.value = parsed.data.url
        hubPopupRefreshImagePreview()
        showToast('이미지가 업로드되었습니다.', 'success')
      } else {
        showToast((parsed && (parsed.error || parsed.message)) || '업로드 실패', 'error')
      }
    } catch {
      showToast('업로드 중 오류가 발생했습니다.', 'error')
    }
    input.value = ''
  })

  document.getElementById('hubPopupsTableBody')?.addEventListener('click', (ev) => {
    const edit = ev.target.closest('.hub-popup-edit')
    const del = ev.target.closest('.hub-popup-del')
    if (edit) {
      const pid = edit.getAttribute('data-popup-id')
      if (pid) void hubOpenPopupEditor(pid)
      return
    }
    if (del) {
      const pid = del.getAttribute('data-popup-id')
      if (pid) void hubDeletePopup(pid)
    }
  })
}

async function hubDeletePopup(id) {
  if (!confirm('이 팝업을 삭제할까요?')) return
  const res = await apiRequest('DELETE', '/api/popups/' + id)
  if (res.success) {
    showToast(res.message || '삭제되었습니다.', 'success')
    await loadHubPopups()
  } else {
    showToast(res.error || '삭제 실패', 'error')
  }
}

async function loadHubNoticeOrganizations() {
  const sel = document.getElementById('hubNoticeTargetOrg')
  if (!sel) return
  const res = await apiRequest('GET', '/api/admin/organizations')
  const rows = res.success && Array.isArray(res.data) ? res.data : []
  const cur = sel.value
  sel.innerHTML =
    '<option value="">전체 회원</option>' +
    rows
      .map(
        (o) =>
          '<option value="' +
          escapeAttr(String(o.id)) +
          '">B2B · ' +
          escapeHtml(String(o.name || o.id)) +
          '</option>',
      )
      .join('')
  if (cur) sel.value = cur
}

function hubNoticeInsertAtCursor(text) {
  const ta = document.getElementById('hubNoticeContent')
  if (!ta) return
  const s = ta.selectionStart
  const e = ta.selectionEnd
  const v = ta.value
  ta.value = v.slice(0, s) + text + v.slice(e)
  const pos = s + text.length
  ta.selectionStart = ta.selectionEnd = pos
  ta.focus()
}

function hubNoticeApplyTool(cmd) {
  const ta = document.getElementById('hubNoticeContent')
  if (!ta) return
  const s = ta.selectionStart
  const e = ta.selectionEnd
  const v = ta.value
  const sel = v.slice(s, e)
  const apply = (open, close, placeholder) => {
    const inner = sel || placeholder
    const rep = open + inner + close
    ta.value = v.slice(0, s) + rep + v.slice(e)
    const endPos = s + rep.length
    ta.selectionStart = s
    ta.selectionEnd = endPos
    ta.focus()
  }
  if (cmd === 'bold') {
    apply('<strong>', '</strong>', '굵은 글씨')
    return
  }
  if (cmd === 'italic') {
    apply('<em>', '</em>', '기울임')
    return
  }
  if (cmd === 'br') {
    hubNoticeInsertAtCursor('<br>\n')
    return
  }
  if (cmd === 'link') {
    const url = window.prompt('링크 URL (https://…)', 'https://')
    if (!url) return
    const text = window.prompt('표시 텍스트', sel || '링크') || '링크'
    hubNoticeInsertAtCursor(
      '<a href="' + escapeAttr(url) + '" class="text-indigo-600 underline">' + escapeHtml(text) + '</a>',
    )
  }
}

function closeHubNoticeModal() {
  const modal = document.getElementById('hubNoticeModal')
  if (!modal) return
  modal.classList.add('hidden')
  modal.classList.remove('flex')
}

window.hubOpenNoticeEditor = async function (id) {
  const modal = document.getElementById('hubNoticeModal')
  if (!modal) return
  await loadHubNoticeOrganizations()
  const hid = document.getElementById('hubNoticeId')
  const title = document.getElementById('hubNoticeTitle')
  const content = document.getElementById('hubNoticeContent')
  const pinned = document.getElementById('hubNoticePinned')
  const published = document.getElementById('hubNoticePublished')
  const org = document.getElementById('hubNoticeTargetOrg')
  const imgFile = document.getElementById('hubNoticeImageFile')
  if (imgFile) imgFile.value = ''

  if (id) {
    const res = await apiRequest('GET', '/api/admin/notices/' + id)
    if (!res.success || !res.data) {
      showToast(res.error || '공지를 불러오지 못했습니다.', 'error')
      return
    }
    const n = res.data
    if (hid) hid.value = String(n.id)
    if (title) title.value = n.title || ''
    if (content) content.value = n.content || ''
    if (pinned) pinned.checked = Number(n.is_pinned) === 1
    if (published) published.checked = Number(n.is_published) === 1
    if (org) org.value = n.target_org_id != null ? String(n.target_org_id) : ''
    document.getElementById('hubNoticeModalTitle').textContent = '공지 수정'
  } else {
    if (hid) hid.value = ''
    if (title) title.value = ''
    if (content) content.value = ''
    if (pinned) pinned.checked = false
    if (published) published.checked = true
    if (org) org.value = ''
    document.getElementById('hubNoticeModalTitle').textContent = '공지 작성'
  }
  modal.classList.remove('hidden')
  modal.classList.add('flex')
}

async function loadHubNotices() {
  const tbody = document.getElementById('hubNoticesTableBody')
  if (!tbody) return
  tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-slate-500">불러오는 중…</td></tr>'
  const res = await apiRequest('GET', '/api/admin/notices')
  if (!res.success) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="p-4 text-red-600">' +
      escapeHtml(res.error || '목록을 불러오지 못했습니다.') +
      '</td></tr>'
    return
  }
  const rows = Array.isArray(res.data) ? res.data : []
  tbody.innerHTML = rows.length
    ? rows
        .map((n) => {
          const id = String(n.id)
          const pinned = Number(n.is_pinned) === 1
          const pub = Number(n.is_published) === 1
          const trCls = pinned ? ' bg-amber-50/95 ring-1 ring-inset ring-amber-200/90' : ' hover:bg-slate-50'
          const titleHtml = pinned
            ? '<span class="inline-flex items-center gap-2 flex-wrap"><span class="shrink-0 rounded-md bg-amber-200/90 text-amber-950 text-[11px] font-bold px-2 py-0.5">📌 필독</span><span class="font-medium text-slate-900">' +
              escapeHtml(n.title || '') +
              '</span></span>'
            : '<span class="font-medium text-slate-800">' + escapeHtml(n.title || '') + '</span>'
          const target =
            n.target_org_id != null
              ? escapeHtml(String(n.organization_name || '기관 #' + n.target_org_id))
              : '전체'
          const st = pub
            ? '<span class="text-emerald-700 font-medium">게시</span>'
            : '<span class="text-slate-500">숨김</span>'
          const pinCol = pinned ? '<span class="text-amber-800 font-semibold">Y</span>' : '—'
          return (
            '<tr class="border-t border-slate-100' +
            trCls +
            '">' +
            '<td class="p-3 tabular-nums text-slate-600">' +
            escapeHtml(id) +
            '</td>' +
            '<td class="p-3 text-sm">' +
            titleHtml +
            '<div class="text-[11px] text-slate-500 mt-0.5">' +
            escapeHtml(target) +
            '</div></td>' +
            '<td class="p-3 text-xs text-slate-600 whitespace-nowrap">' +
            escapeHtml(formatDateTime(n.created_at)) +
            '</td>' +
            '<td class="p-3 tabular-nums text-slate-700">' +
            escapeHtml(String(n.view_count ?? 0)) +
            '</td>' +
            '<td class="p-3 text-xs">' +
            st +
            '</td>' +
            '<td class="p-3 text-xs text-center">' +
            pinCol +
            '</td>' +
            '<td class="p-3 text-right whitespace-nowrap space-x-2">' +
            '<button type="button" class="text-indigo-600 hover:underline text-sm hub-notice-edit" data-notice-id="' +
            escapeAttr(id) +
            '">편집</button>' +
            '<button type="button" class="text-rose-600 hover:underline text-sm hub-notice-del" data-notice-id="' +
            escapeAttr(id) +
            '">삭제</button>' +
            '</td></tr>'
          )
        })
        .join('')
    : '<tr><td colspan="7" class="p-8 text-center text-slate-500">등록된 공지가 없습니다.</td></tr>'
}

function hubPostCategoryLabel(cat) {
  const c = String(cat || '').toLowerCase()
  if (c === 'review') return '후기'
  if (c === 'qna') return 'Q&amp;A'
  return escapeHtml(cat || '—')
}

async function loadHubPosts() {
  const tbody = document.getElementById('hubPostsTableBody')
  if (!tbody) return
  tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-slate-500">불러오는 중…</td></tr>'
  const res = await apiRequest('GET', '/api/admin/posts')
  if (!res.success) {
    tbody.innerHTML =
      '<tr><td colspan="8" class="p-4 text-red-600">' +
      escapeHtml(res.error || '게시글 목록을 불러오지 못했습니다.') +
      '</td></tr>'
    return
  }
  const rows = Array.isArray(res.data) ? res.data : []
  tbody.innerHTML = rows.length
    ? rows
        .map((p) => {
          const pub = Number(p.is_published) === 1
          const st = pub
            ? '<span class="text-emerald-700 font-medium">게시</span>'
            : '<span class="text-slate-500">숨김</span>'
          const id = String(p.id)
          const vc = Number(p.view_count) || 0
          return (
            '<tr class="border-t border-slate-100 hover:bg-slate-50">' +
            '<td class="p-3 tabular-nums text-slate-600">' +
            escapeHtml(id) +
            '</td>' +
            '<td class="p-3 text-sm font-medium text-slate-900">' +
            escapeHtml(p.title || '') +
            '</td>' +
            '<td class="p-3 text-sm text-slate-700">' +
            escapeHtml(p.author || '—') +
            '</td>' +
            '<td class="p-3 text-xs">' +
            hubPostCategoryLabel(p.category) +
            '</td>' +
            '<td class="p-3 text-xs text-slate-600 whitespace-nowrap">' +
            escapeHtml(formatDateTime(p.created_at)) +
            '</td>' +
            '<td class="p-3 text-xs text-right tabular-nums text-slate-700">' +
            escapeHtml(String(vc)) +
            '</td>' +
            '<td class="p-3 text-xs">' +
            st +
            '</td>' +
            '<td class="p-3 text-right whitespace-nowrap space-x-2">' +
            '<button type="button" class="text-indigo-600 hover:underline text-sm hub-post-edit" data-post-id="' +
            escapeAttr(id) +
            '">수정</button>' +
            '<button type="button" class="text-rose-600 hover:underline text-sm hub-post-del" data-post-id="' +
            escapeAttr(id) +
            '">삭제</button>' +
            '</td></tr>'
          )
        })
        .join('')
    : '<tr><td colspan="8" class="p-8 text-center text-slate-500">등록된 게시글이 없습니다. (<code class="text-xs bg-slate-100 px-1 rounded">posts</code> 마이그레이션 적용 여부를 확인하세요.)</td></tr>'
}

function closeHubPostModal() {
  const modal = document.getElementById('hubPostModal')
  if (!modal) return
  modal.classList.add('hidden')
  modal.classList.remove('flex')
}

async function hubOpenPostEditor(postId) {
  const modal = document.getElementById('hubPostModal')
  if (!modal) return
  document.getElementById('hubPostModalTitle').textContent = '게시글 편집'
  document.getElementById('hubPostId').value = postId ? String(postId) : ''
  document.getElementById('hubPostTitle').value = ''
  document.getElementById('hubPostAuthor').value = ''
  document.getElementById('hubPostContent').value = ''
  document.getElementById('hubPostCategory').value = 'qna'
  const pub = document.getElementById('hubPostPublished')
  if (pub) pub.checked = true

  if (postId) {
    const res = await apiRequest('GET', '/api/admin/posts/' + postId)
    if (!res.success || !res.data) {
      showToast(res.error || '불러오기 실패', 'error')
      return
    }
    const d = res.data
    document.getElementById('hubPostTitle').value = d.title || ''
    document.getElementById('hubPostAuthor').value = d.author || ''
    document.getElementById('hubPostContent').value = d.content || ''
    const cat = String(d.category || 'general').toLowerCase()
    document.getElementById('hubPostCategory').value =
      cat === 'qna' || cat === 'review' || cat === 'general' ? cat : 'general'
    if (pub) pub.checked = Number(d.is_published) === 1
  }

  modal.classList.remove('hidden')
  modal.classList.add('flex')
}

async function hubPostFormSubmit(e) {
  e.preventDefault()
  const id = (document.getElementById('hubPostId')?.value || '').trim()
  const payload = {
    title: (document.getElementById('hubPostTitle')?.value || '').trim(),
    content: document.getElementById('hubPostContent')?.value || '',
    author: (document.getElementById('hubPostAuthor')?.value || '').trim() || null,
    category: document.getElementById('hubPostCategory')?.value || 'general',
    is_published: document.getElementById('hubPostPublished')?.checked ? 1 : 0,
  }
  if (!payload.title) {
    showToast('제목을 입력해 주세요.', 'error')
    return
  }
  const res = await apiRequest('PUT', '/api/admin/posts/' + id, payload)
  if (res.success) {
    showToast(res.message || '저장되었습니다.', 'success')
    closeHubPostModal()
    await loadHubPosts()
  } else {
    showToast(res.error || '저장 실패', 'error')
  }
}

async function hubDeletePost(id) {
  if (!confirm('이 게시글을 영구 삭제할까요?')) return
  const res = await apiRequest('DELETE', '/api/admin/posts/' + id)
  if (res.success) {
    showToast(res.message || '삭제되었습니다.', 'success')
    await loadHubPosts()
  } else {
    showToast(res.error || '삭제 실패', 'error')
  }
}

function initHubPostsPanel() {
  document.getElementById('hubPostModalClose')?.addEventListener('click', closeHubPostModal)
  document.getElementById('hubPostCancel')?.addEventListener('click', closeHubPostModal)
  document.getElementById('hubPostModal')?.addEventListener('click', (ev) => {
    if (ev.target && ev.target.id === 'hubPostModal') closeHubPostModal()
  })
  document.getElementById('hubPostForm')?.addEventListener('submit', hubPostFormSubmit)

  document.getElementById('hubPostsTableBody')?.addEventListener('click', (ev) => {
    const ed = ev.target.closest('.hub-post-edit')
    const del = ev.target.closest('.hub-post-del')
    if (ed) {
      const pid = ed.getAttribute('data-post-id')
      if (pid) void hubOpenPostEditor(pid)
      return
    }
    if (del) {
      const pid = del.getAttribute('data-post-id')
      if (pid) void hubDeletePost(pid)
    }
  })
}

async function hubNoticeFormSubmit(e) {
  e.preventDefault()
  const hid = document.getElementById('hubNoticeId')
  const id = (hid && hid.value ? hid.value : '').trim()
  const orgEl = document.getElementById('hubNoticeTargetOrg')
  const orgRaw = orgEl && orgEl.value ? orgEl.value.trim() : ''
  const payload = {
    title: (document.getElementById('hubNoticeTitle')?.value || '').trim(),
    content: document.getElementById('hubNoticeContent')?.value || '',
    is_pinned: document.getElementById('hubNoticePinned')?.checked ? 1 : 0,
    is_published: document.getElementById('hubNoticePublished')?.checked ? 1 : 0,
    target_org_id: orgRaw ? parseInt(orgRaw, 10) : null,
  }
  const res = id
    ? await apiRequest('PUT', '/api/admin/notices/' + id, payload)
    : await apiRequest('POST', '/api/admin/notices', payload)
  if (res.success) {
    showToast(res.message || '저장되었습니다.', 'success')
    closeHubNoticeModal()
    await loadHubNotices()
  } else {
    showToast(res.error || '저장 실패', 'error')
  }
}

function initHubNoticesPanel() {
  document.getElementById('hubNoticeBtnNew')?.addEventListener('click', () => {
    void hubOpenNoticeEditor(null)
  })
  document.getElementById('hubNoticeModalClose')?.addEventListener('click', closeHubNoticeModal)
  document.getElementById('hubNoticeCancel')?.addEventListener('click', closeHubNoticeModal)
  document.getElementById('hubNoticeModal')?.addEventListener('click', (ev) => {
    if (ev.target && ev.target.id === 'hubNoticeModal') closeHubNoticeModal()
  })
  document.getElementById('hubNoticeForm')?.addEventListener('submit', hubNoticeFormSubmit)

  document.querySelectorAll('.hub-notice-tool').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.preventDefault()
      const cmd = btn.getAttribute('data-hub-notice-tool')
      if (cmd) hubNoticeApplyTool(cmd)
    })
  })

  document.getElementById('hubNoticeImageFile')?.addEventListener('change', async (ev) => {
    const input = ev.target
    const file = input && input.files && input.files[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    try {
      const response = await fetch('/api/upload/image', { method: 'POST', body: fd, credentials: 'include' })
      const text = await response.text()
      let parsed = null
      try {
        parsed = text ? JSON.parse(text) : null
      } catch {
        /* ignore */
      }
      if (response.ok && parsed && parsed.success && parsed.data && parsed.data.url) {
        const url = parsed.data.url
        hubNoticeInsertAtCursor(
          '\n<img src="' +
            escapeAttr(url) +
            '" alt="" class="max-w-full rounded-lg my-2 border border-slate-200" loading="lazy">\n',
        )
        showToast('이미지가 본문에 삽입되었습니다.', 'success')
      } else {
        showToast((parsed && (parsed.error || parsed.message)) || '업로드 실패', 'error')
      }
    } catch {
      showToast('업로드 중 오류가 발생했습니다.', 'error')
    }
    input.value = ''
  })

  document.getElementById('hubNoticesTableBody')?.addEventListener('click', (ev) => {
    const ed = ev.target.closest('.hub-notice-edit')
    const del = ev.target.closest('.hub-notice-del')
    if (ed) {
      const nid = ed.getAttribute('data-notice-id')
      if (nid) void hubOpenNoticeEditor(nid)
      return
    }
    if (del) {
      const nid = del.getAttribute('data-notice-id')
      if (nid) void hubDeleteNotice(nid)
    }
  })
}

async function hubDeleteNotice(id) {
  if (!confirm('이 공지를 삭제할까요?')) return
  const res = await apiRequest('DELETE', '/api/admin/notices/' + id)
  if (res.success) {
    showToast(res.message || '삭제되었습니다.', 'success')
    await loadHubNotices()
  } else {
    showToast(res.error || '삭제 실패', 'error')
  }
}

async function loadHubOfflineMeetups() {
  const tbody = document.getElementById('hubOfflineMeetupsBody')
  if (!tbody) return
  tbody.innerHTML =
    '<tr><td colspan="6" class="p-4 text-slate-500 text-center">불러오는 중…</td></tr>'
  const res = await apiRequest('GET', '/api/admin/offline-applications')
  const rows = res.success && Array.isArray(res.data) ? res.data : []
  tbody.innerHTML = rows.length
    ? rows
        .map(
          (r) => `
    <tr class="border-t border-slate-100">
      <td class="p-2 align-top">${escapeHtml(r.course_title || '')}<br><span class="text-xs text-slate-500">#${escapeHtml(String(r.course_id))}</span></td>
      <td class="p-2 align-top">${escapeHtml(r.name || '')}</td>
      <td class="p-2 align-top whitespace-nowrap">${escapeHtml(r.phone || '')}</td>
      <td class="p-2 align-top">${escapeHtml(r.region || '')}</td>
      <td class="p-2 align-top text-xs max-w-[min(28rem,40vw)] whitespace-pre-wrap">${escapeHtml(r.motivation || '')}</td>
      <td class="p-2 align-top text-xs text-slate-600 whitespace-nowrap">${formatDateTime(r.created_at)}</td>
    </tr>`,
        )
        .join('')
    : '<tr><td colspan="6" class="p-4 text-slate-500 text-center">등록된 오프라인 모임 신청이 없습니다.</td></tr>'
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
      <td class="p-2">${escapeHtml(hubAdminStatusKo(b.status || ''))}</td>
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
