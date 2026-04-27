/**
 * ═══ FOREST ZONE (GAS — canonical text for copy-paste) FROZEN ═══
 * live Apps Script 는 이 파일과 수동 동기. `/exec`·FOREST_GAS_WEBHOOK_URL 변경은 docs/FOREST-FROZEN.md 승인.
 *
 * JTT 숲 → 구글 시트 — appendForest2026Row_ = 정확히 41열 (A~AO)
 * A입력시간 B기관유형 C기관명 D사전·사후 E리포트링크(드라이브 PDF URL 우선, 없으면 웹 보고서 URL) F~AC Q1~12 AD~AG 4축 AH~AO 부가
 * doGet 보고서 조회: ForestReports 없어도 탭 '2026'·'2026초등' 메인 시트에서 E(URL)·AN(requestId)로 검색
 *
 * --- 운영 배포(41열·우측 컬럼 누락 시 필수) ---
 * 1) 이 파일 전체를 Apps Script 편집기(Code.gs 등)에 반영(기존 doPost/appendForest2026Row_ 덮어쓰기).
 * 2) [배포] → [새 배포] → 유형: 웹 앱 → 액세스: 모든 사용자 → 배포. 생성된 /exec URL 복사.
 * 3) Cloudflare Pages → mslms → Settings → Environment variables → FOREST_GAS_WEBHOOK_URL = 위 URL(Production/Preview).
 * 4) Worker 폴백(코드의 AKfyc…/exec)과 같으면 시크릿 생략 가능. 다르면 시크릿이 우선.
 * 5) POST 응답 JSON에 _gasBuild 가 있고 값이 41col-2026-04 이면 최신 41열 빌드가 실제로 구동 중.
 *
 * ■ Drive 자동 저장(선택): 프로젝트 속성에 FOREST_DRIVE_REPORT_FOLDER_ID 를 넣으면,
 *   POST 성공 시 같은 JSON으로 Google Doc + PDF 를 해당 폴더에 생성합니다.
 *   웹앱 배포는 [실행 사용자: 나] 권장. Drive/문서 권한이 필요하면 appsscript.json oauthScopes 에
 *   https://www.googleapis.com/auth/drive.file (또는 drive) 및 documents 추가 후 재인증.
 *   비활성화: FOREST_DRIVE_ARCHIVE_DISABLED = 1
 */

function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    var view = String(p.view || '');
    var id = String(p.id || p.requestId || '').trim();
    if (view === 'report' && id) {
      var snap = getReportSnapshotByRequestId_(id);
      if (!snap) {
        return jsonOut_({ success: false, error: 'not found', requestId: id });
      }
      return jsonOut_(snap);
    }
    return ContentService.createTextOutput(
      'JTT Forest: POST JSON → 시트 append, 또는 GET ?view=report&id=REQUEST_ID'
    ).setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return jsonOut_({ success: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    var raw = e.postData && e.postData.contents;
    if (!raw) {
      return jsonOut_({ success: false, error: 'no body' });
    }
    var data = JSON.parse(raw);
    /** 1) 드라이브 Doc+PDF 생성 후 pdfUrl 확보 — 2) E열(리포트 링크)에 pdfUrl 우선 기록(관리자가 시트에서 바로 PDF 열람) */
    var driveResult = { skipped: true };
    try {
      driveResult = tryCreateForestDriveArchive_(data);
    } catch (driveErr) {
      driveResult = { skipped: false, error: String(driveErr) };
    }
    if (driveResult && driveResult.pdfUrl && String(driveResult.pdfUrl).trim() !== '') {
      var pdfU = String(driveResult.pdfUrl).trim();
      data.report_url = pdfU;
      data.reportUrl = pdfU;
    } else {
      data = ensureForestPayloadReportUrl_(data);
    }
    var isEl = forestIsElementary_(data);
    var sheetName = isEl ? '2026초등' : '2026';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      return jsonOut_({ success: false, error: 'no sheet ' + sheetName });
    }
    sheet.appendRow(appendForest2026Row_(data));
    appendForestReportsIndex_(ss, data);
    return jsonOut_({
      success: true,
      sheet: sheetName,
      requestId: String(data.requestId || ''),
      drive: driveResult,
      // 41열 appendForest2026Row_ 배포 식별(구 GAS 는 이 필드 없음)
      _gasBuild: '41col-2026-04-26',
    });
  } catch (err) {
    return jsonOut_({ success: false, error: String(err) });
  }
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function appendForestReportsIndex_(ss, data) {
  var id = String((data && data.requestId) || '').trim();
  if (!id) return;
  var sh = getOrCreateForestReportsSheet_(ss);
  sh.appendRow(appendForest2026Row_(data));
}

function getOrCreateForestReportsSheet_(ss) {
  var name = 'ForestReports';
  var s = ss.getSheetByName(name);
  if (s) return s;
  s = ss.insertSheet(name);
  s.appendRow(forestReportsHeaderRow_());
  return s;
}

function forestReportsHeaderRow_() {
  var h = ['입력시간', '기관유형', '기관명', '사전/사후', 'reportUrl'];
  var i;
  for (i = 1; i <= 12; i++) {
    h.push('Q' + i + '_triangle', 'Q' + i + '_square');
  }
  h.push('봄(SPRT)', '여름(SUMT)', '가을(AUTT)', '겨울(WINT)', '반이름', '유아/초등', '진행장소', '지도자', '참가인원', '시간(클라이언트)', '요청ID', '원본JSON');
  return h;
}

function axisScoresFromPayload_(data) {
  var d = data || {};
  var s = d.scores && typeof d.scores === 'object' ? d.scores : {};
  return {
    SPRT:
      Number(
        s.SPRT !== undefined
          ? s.SPRT
          : d.score_spring !== undefined
            ? d.score_spring
            : d.scoreN
      ) || 0,
    SUMT:
      Number(
        s.SUMT !== undefined
          ? s.SUMT
          : d.score_summer !== undefined
            ? d.score_summer
            : d.scoreD
      ) || 0,
    AUTT:
      Number(
        s.AUTT !== undefined
          ? s.AUTT
          : d.score_fall !== undefined
            ? d.score_fall
            : d.scoreK
      ) || 0,
    WINT:
      Number(
        s.WINT !== undefined
          ? s.WINT
          : d.score_winter !== undefined
            ? d.score_winter
            : d.scoreM
      ) || 0
  };
}

function normalizePayload_(payload) {
  var p = payload || {};
  var ri = p.rawInputs && typeof p.rawInputs === 'object' ? p.rawInputs : {};
  var questions = {};
  var i;
  for (i = 1; i <= 12; i++) {
    var yKey = 'q' + i + 'y';
    var nKey = 'q' + i + 'n';
    var triKey = 'q' + i + '_triangle';
    var sqKey = 'q' + i + '_square';
    var yUnderscore = 'q' + i + '_y';
    var nUnderscore = 'q' + i + '_n';
    var sub = p.scores && typeof p.scores === 'object' ? p.scores : {};
    var yVal =
      ri[triKey] !== undefined && ri[triKey] !== null
        ? ri[triKey]
        : p[yKey] !== undefined && p[yKey] !== null
          ? p[yKey]
          : p[yUnderscore] !== undefined && p[yUnderscore] !== null
            ? p[yUnderscore]
            : sub[yKey] !== undefined && sub[yKey] !== null
              ? sub[yKey]
              : 0;
    var nVal =
      ri[sqKey] !== undefined && ri[sqKey] !== null
        ? ri[sqKey]
        : p[nKey] !== undefined && p[nKey] !== null
          ? p[nKey]
          : p[nUnderscore] !== undefined && p[nUnderscore] !== null
            ? p[nUnderscore]
            : sub[nKey] !== undefined && sub[nKey] !== null
              ? sub[nKey]
              : 0;
    questions[yKey] = Number(yVal) || 0;
    questions[nKey] = Number(nVal) || 0;
  }
  return { questions: questions };
}

function resolveForestReportUrl_(data) {
  var d = data || {};
  var u = d.report_url;
  if (u !== undefined && u !== null && String(u).trim() !== '') {
    return String(u).trim();
  }
  u = d.reportUrl;
  if (u !== undefined && u !== null && String(u).trim() !== '') {
    return String(u).trim();
  }
  var rid = String(d.requestId || '').trim();
  if (rid) {
    return 'https://mindstory.kr/forest.html?view=report&id=' + encodeURIComponent(rid);
  }
  return '';
}

function ensureForestPayloadReportUrl_(data) {
  var d = data || {};
  var rid = String(d.requestId || '').trim();
  var u = resolveForestReportUrl_(d);
  if (!u && rid) {
    u = 'https://mindstory.kr/forest.html?view=report&id=' + encodeURIComponent(rid);
  }
  d.report_url = u;
  d.reportUrl = u;
  return d;
}

function forestIsElementary_(data) {
  var d = data || {};
  if (d.isElementary === true) return true;
  if (d.isElementary === 'true' || d.isElementary === 1) return true;
  var ag = String(d.age_group || '').trim();
  if (ag === '초등' || ag === '초등부') return true;
  if (ag.length >= 2 && ag.indexOf('초등') === 0) return true;
  return false;
}

function formatForestSheetDateTimeFallback_(tz) {
  return Utilities.formatDate(new Date(), tz, 'yy.M.d HH:mm');
}

function forestPhaseDisplay_(phase) {
  var p = String(phase || '').trim();
  if (p === 'post') return '사후';
  if (p === 'pre') return '사전';
  return p;
}

/** A~AO 41열 — E=index4 리포트 URL 고정(인덱스 명시) */
function appendForest2026Row_(data) {
  var d = ensureForestPayloadReportUrl_(data || {});
  var norm = normalizePayload_(d);
  var q = norm.questions;
  var ax = axisScoresFromPayload_(d);
  var isEl = forestIsElementary_(d);
  var tz = Session.getScriptTimeZone() || 'Asia/Seoul';

  var inputTime =
    String(d.sheet_date_yy || '').trim() ||
    formatForestSheetDateTimeFallback_(tz);
  var instType = String(d.institution_type || '').trim();
  var instName = String(d.institution_name || '').trim();
  var phaseDisp = forestPhaseDisplay_(d.phase);
  var reportUrl = resolveForestReportUrl_(d);

  var row = new Array(41);
  var idx = 0;
  row[idx++] = inputTime;
  row[idx++] = instType;
  row[idx++] = instName;
  row[idx++] = phaseDisp;
  row[idx++] = reportUrl;

  /** F~AC: Q1~12 — q iy/in 순(△·□). 클라이언트 answers["1"]..["12"]·rawInputs.qN_triangle 와 동일 소스(normalizePayload_) */
  var i;
  for (i = 1; i <= 12; i++) {
    if (isEl) {
      row[idx++] = Number(q['q' + i + 'y']) || 0;
      row[idx++] = Number(q['q' + i + 'n']) || 0;
    } else if (i <= 8) {
      row[idx++] = Number(q['q' + i + 'y']) || 0;
      row[idx++] = Number(q['q' + i + 'n']) || 0;
    } else {
      row[idx++] = '';
      row[idx++] = '';
    }
  }

  row[idx++] = ax.SPRT;
  row[idx++] = ax.SUMT;
  row[idx++] = ax.AUTT;
  row[idx++] = ax.WINT;
  row[idx++] = String(d.class_name || '').trim();
  row[idx++] = String(d.age_group || '').trim() || (isEl ? '초등' : '유아');
  row[idx++] = String(d.location || '').trim();
  row[idx++] = String(d.facilitator || '').trim();
  row[idx++] = Number(d.participant_count || 0);
  row[idx++] = String(d.submitted_at_iso || '').trim() || new Date().toISOString();
  row[idx++] = String(d.requestId || '').trim();
  row[idx++] = JSON.stringify(d);

  if (idx !== 41) {
    throw new Error('appendForest2026Row_: expected idx 41, got ' + idx);
  }
  row[4] = String(resolveForestReportUrl_(d) || '');
  return row;
}

function forestRowMatchesRequestId_(row, id) {
  if (!row || !id) return false;
  if (String(row[39] || '').trim() === id) return true;
  var cellE = String(row[4] || '');
  if (!cellE) return false;
  if (cellE.indexOf(id) !== -1) return true;
  var m = cellE.match(/[?&]id=([^&]+)/);
  if (m) {
    try {
      if (decodeURIComponent(String(m[1]).replace(/\+/g, ' ')) === id) return true;
    } catch (e) {
      if (String(m[1]) === id) return true;
    }
  }
  return false;
}

function findReportSnapshotInMainSheets_(ss, id) {
  var names = ['2026', '2026초등'];
  var ni;
  for (ni = 0; ni < names.length; ni++) {
    var sheet = ss.getSheetByName(names[ni]);
    if (!sheet) continue;
    var data = sheet.getDataRange().getValues();
    var i;
    for (i = 1; i < data.length; i++) {
      var row = data[i];
      if (!forestRowMatchesRequestId_(row, id)) continue;
      if (!row || row.length < 41) continue;
      try {
        var payload = JSON.parse(String(row[40] || '{}'));
        var savedAt = row[38] != null ? String(row[38]) : '';
        return { version: 1, requestId: id, savedAt: savedAt, sheetPayload: payload };
      } catch (e2) {
        continue;
      }
    }
  }
  return null;
}

function getReportSnapshotByRequestId_(id) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('ForestReports');
  if (sh) {
    var data = sh.getDataRange().getValues();
    var i;
    for (i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row || row.length === 0) continue;
      if (String(row[0] || '').trim() === id && row.length <= 4) {
        try {
          return {
            version: 1,
            requestId: id,
            savedAt: row[2] ? String(row[2]) : '',
            sheetPayload: JSON.parse(String(row[1] || '{}'))
          };
        } catch (e) {
          continue;
        }
      }
      if (row.length >= 41 && String(row[39] || '').trim() === id) {
        try {
          return {
            version: 1,
            requestId: id,
            savedAt: row[38] != null ? String(row[38]) : '',
            sheetPayload: JSON.parse(String(row[40] || '{}'))
          };
        } catch (e2) {
          continue;
        }
      }
    }
  }
  return findReportSnapshotInMainSheets_(ss, id);
}

/** 파일명에 쓸 수 없는 문자 제거 */
function forestSanitizeFileName_(name) {
  return String(name || '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 시트 append 와 동일 payload 로 Google Doc + PDF 를 관리자 폴더에 저장.
 * Script Properties: FOREST_DRIVE_REPORT_FOLDER_ID = Drive 폴더 ID (필수로 쓰려면 설정)
 */
function tryCreateForestDriveArchive_(data) {
  var props = PropertiesService.getScriptProperties();
  if (String(props.getProperty('FOREST_DRIVE_ARCHIVE_DISABLED') || '').trim() === '1') {
    return { skipped: true, reason: 'FOREST_DRIVE_ARCHIVE_DISABLED' };
  }
  var folderId = String(props.getProperty('FOREST_DRIVE_REPORT_FOLDER_ID') || '').trim();
  if (!folderId) {
    return { skipped: true, reason: 'no FOREST_DRIVE_REPORT_FOLDER_ID' };
  }
  var folder;
  try {
    folder = DriveApp.getFolderById(folderId);
  } catch (e0) {
    return { skipped: true, reason: 'folder access: ' + String(e0) };
  }

  var d = ensureForestPayloadReportUrl_(data || {});
  var norm = normalizePayload_(d);
  var q = norm.questions;
  var ax = axisScoresFromPayload_(d);
  var isEl = forestIsElementary_(d);
  var rid = String(d.requestId || '').trim();
  var instName = String(d.institution_name || '').trim() || '기관';
  var baseTitle = forestSanitizeFileName_('포레스트_기질결과_' + rid + '_' + instName);
  if (baseTitle.length > 200) {
    baseTitle = baseTitle.substring(0, 196) + '...';
  }

  var doc = DocumentApp.create(baseTitle);
  var body = doc.getBody();
  body.appendParagraph('포레스트 기질검사 결과 보고서').setHeading(DocumentApp.ParagraphHeading.TITLE);

  body.appendParagraph('■ 기관·관찰 정보').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('기관유형: ' + String(d.institution_type || ''));
  body.appendParagraph('기관명: ' + instName);
  body.appendParagraph('사전/사후: ' + forestPhaseDisplay_(d.phase));
  body.appendParagraph('반 이름: ' + String(d.class_name || ''));
  body.appendParagraph('연령: ' + String(d.age_group || ''));
  body.appendParagraph('진행 장소: ' + String(d.location || ''));
  body.appendParagraph('진행자: ' + String(d.facilitator || ''));
  body.appendParagraph('참가 인원(Q1 기준): ' + String(d.participant_count || ''));
  body.appendParagraph('제출 시각(ISO): ' + String(d.submitted_at_iso || ''));

  body.appendParagraph('■ 온라인 보고서 링크').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  var reportUrl = resolveForestReportUrl_(d);
  var pLink = body.appendParagraph('');
  pLink.appendText('열기: ');
  var tUrl = pLink.appendText(reportUrl);
  tUrl.setLinkUrl(reportUrl);

  body.appendParagraph('■ 문항별 △·□ 인원').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  var maxQ = isEl ? 12 : 8;
  var tableRows = [['문항', '△ 인원', '□ 인원']];
  var qi;
  for (qi = 1; qi <= maxQ; qi++) {
    tableRows.push([
      'Q' + qi,
      String(Number(q['q' + qi + 'y']) || 0),
      String(Number(q['q' + qi + 'n']) || 0)
    ]);
  }
  body.appendTable(tableRows);

  body.appendParagraph('■ 네 축 원시 합').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph(
    'SPRT(봄): ' +
      ax.SPRT +
      ' | SUMT(여름): ' +
      ax.SUMT +
      ' | AUTT(가을): ' +
      ax.AUTT +
      ' | WINT(겨울): ' +
      ax.WINT
  );

  if (d.answers && typeof d.answers === 'object') {
    body.appendParagraph('■ answers (문항별 값)').setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendParagraph(JSON.stringify(d.answers));
  }

  body.appendParagraph('■ 원본 JSON').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  var rawJson = JSON.stringify(d);
  if (rawJson.length > 48000) {
    rawJson = rawJson.substring(0, 48000) + '\n…(truncated)';
  }
  body.appendParagraph(rawJson);

  var docFile = DriveApp.getFileById(doc.getId());
  folder.addFile(docFile);
  var parents = docFile.getParents();
  while (parents.hasNext()) {
    var par = parents.next();
    if (par.getId() !== folder.getId()) {
      par.removeFile(docFile);
    }
  }

  var pdfBlob = docFile.getAs(MimeType.PDF);
  var pdfFile = folder.createFile(pdfBlob);
  pdfFile.setName(baseTitle + '.pdf');

  return {
    skipped: false,
    docUrl: docFile.getUrl(),
    pdfUrl: pdfFile.getUrl(),
    docId: docFile.getId(),
    pdfId: pdfFile.getId()
  };
}
