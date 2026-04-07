/**
 * JTT 숲 시트 웹앱 — doPost(append) + doGet(requestId → 보고서 JSON)
 * appendForest2026Row_: 정확히 41요소 A~AO — E=reportUrl, F~AC=Q1~12, AD~AG=4축, AN=requestId, AO=JSON
 * Apps Script: 이 파일 전체를 한 번에 붙여 넣으면 됩니다(별도 common 파일 불필요).
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
      'JTT Forest webhook: POST JSON 본문으로 시트 append, 또는 GET ?view=report&id=REQUEST_ID'
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
    var data = ensureForestPayloadReportUrl_(JSON.parse(raw));
    var isEl = forestIsElementary_(data);
    var sheetName = isEl ? '2026초등' : '2026';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      return jsonOut_({ success: false, error: 'no sheet ' + sheetName });
    }
    var rowContents = appendForest2026Row_(data);
    sheet.appendRow(rowContents);
    appendForestReportsIndex_(ss, data);
    return jsonOut_({ success: true, sheet: sheetName, requestId: String(data.requestId || '') });
  } catch (err) {
    return jsonOut_({ success: false, error: String(err) });
  }
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** ForestReports: 메인 시트와 동일한 41열 행(중복 JSON 열 없음) */
function appendForestReportsIndex_(ss, data) {
  var id = String((data && data.requestId) || '').trim();
  if (!id) return;
  var sh = getOrCreateForestReportsSheet_(ss);
  sh.appendRow(appendForest2026Row_(data));
}

/** 신규 시트 1행 — E열=리포트(총 41열) */
function forestReportsHeaderRow_() {
  var h = ['날짜', '기관명', '기관유형', '참가자/반', '리포트URL', 'SPRT', 'SUMT', 'AUTT', 'WINT'];
  var i;
  for (i = 1; i <= 12; i++) {
    h.push('Q' + i + '_triangle', 'Q' + i + '_square');
  }
  h.push(
    'phase',
    'age_group',
    'location',
    'facilitator',
    'participant_count',
    'requestId',
    'submitted_at_iso',
    'payloadJson_backup'
  );
  return h;
}

function getOrCreateForestReportsSheet_(ss) {
  var name = 'ForestReports';
  var s = ss.getSheetByName(name);
  if (s) return s;
  s = ss.insertSheet(name);
  s.appendRow(forestReportsHeaderRow_());
  return s;
}

/** 신규 41열: AN=인덱스39 requestId, AO=40 JSON, AM=38 시간 */
function getReportSnapshotByRequestId_(id) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('ForestReports');
  if (!sh) return null;
  var data = sh.getDataRange().getValues();
  var i;
  for (i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row || row.length === 0) continue;
    var payload = null;
    var savedAt = '';
    if (String(row[0] || '').trim() === id && row.length <= 4) {
      try {
        payload = JSON.parse(String(row[1] || '{}'));
      } catch (e) {
        continue;
      }
      savedAt = row[2] ? String(row[2]) : '';
      return { version: 1, requestId: id, savedAt: savedAt, sheetPayload: payload };
    }
    if (row.length >= 41 && String(row[39] || '').trim() === id) {
      try {
        payload = JSON.parse(String(row[40] || '{}'));
      } catch (e2) {
        continue;
      }
      savedAt = row[38] != null ? String(row[38]) : '';
      return { version: 1, requestId: id, savedAt: savedAt, sheetPayload: payload };
    }
    if (String(row[13] || '').trim() === id) {
      try {
        payload = JSON.parse(String(row[row.length - 1] || '{}'));
      } catch (e3) {
        continue;
      }
      savedAt = row[row.length - 2] != null ? String(row[row.length - 2]) : '';
      return { version: 1, requestId: id, savedAt: savedAt, sheetPayload: payload };
    }
  }
  return null;
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

/** scripts/gas-forest-2026-rowContents-sample.gs 의 normalizePayload_ 와 동일 */
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
  return {
    questions: questions,
    participantCount: Number(p.participant_count || p.participantCount || 0)
  };
}

/** E열(인덱스 4)에 반드시 리포트 URL — 빈 값이면 requestId 로 조합 */
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

/**
 * POST 본문 정규화 — E열(리포트 URL)이 비면 requestId 로 조합해 두 별칭 모두 설정.
 * (구버전 스크립트·수동 재전송에서 report_url 누락 시에도 appendForest2026Row_ 가 E를 채움)
 */
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

/** 사전/사후 한글 (시트 D열) */
function forestPhaseDisplay_(phase) {
  var p = String(phase || '').trim();
  if (p === 'post') return '사후';
  if (p === 'pre') return '사전';
  return p;
}

/**
 * A~AO 정확히 41개. 유아: Q9~Q12는 "" (문항 칸 고정), 초등: 실제 값.
 * [0]입력시간 [1]기관유형 [2]기관명 [3]사전·사후 [4]reportUrl [5..28]Q1~12 [29..32]4축 [33..40]부가
 * 인덱스로 명시해 E열 누락으로 문항이 한 칸 당겨지는 오류를 방지합니다.
 */
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
  /** E열(인덱스 4): 재확인 — 항상 문자열 리포트 URL (숫자·빈 슬롯 방지) */
  row[4] = String(resolveForestReportUrl_(d) || '');
  return row;
}
