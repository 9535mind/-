/**
 * JTT 숲 → 구글 시트 — appendForest2026Row_ = 정확히 41열 (A~AO)
 * A입력시간 B기관유형 C기관명 D사전·사후 EreportUrl F~AC Q1~12 AD~AG 4축 AH~AO 부가
 * doGet 보고서 조회: ForestReports 없어도 탭 '2026'·'2026초등' 메인 시트에서 E(URL)·AN(requestId)로 검색
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
    var data = ensureForestPayloadReportUrl_(JSON.parse(raw));
    var isEl = forestIsElementary_(data);
    var sheetName = isEl ? '2026초등' : '2026';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      return jsonOut_({ success: false, error: 'no sheet ' + sheetName });
    }
    sheet.appendRow(appendForest2026Row_(data));
    appendForestReportsIndex_(ss, data);
    return jsonOut_({ success: true, sheet: sheetName, requestId: String(data.requestId || '') });
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
