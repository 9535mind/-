/**
 * 샘플: 시트 헤더 순서와 맞춘 rowContents
 * — Apps Script 편집기의 Code.gs에 반영 후 [배포] > [새 배포] 또는 버전 올려 웹앱 재배포하세요.
 * — 이 파일은 레포에만 두고 GAS 프로젝트에 복사해 사용합니다.
 *
 * 헤더(1행) — A~AO 41열: A입력 B유형 C기관명 D사전·후 EreportUrl F~AC Q1~12 AD~AG 4축 AH~ 부가
 *
 * ⚠️ appendForest2026Row_ 의 열 순서를 바꾸면 시트에서 기관명/단계/점수 열이 한 칸씩 밀려 보입니다.
 *    웹앱 doPost 에서는 반드시 JSON.parse(e.postData.contents) 로 위 키 이름을 읽고, 이 함수 순서대로 appendRow 하세요.
 *
 * forest.html POST 본문(JSON) 키:
 * isElementary (boolean 또는 "true") / age_group 초등 — 초등이면 시트「2026초등」, 아니면「2026」
 * institution_type, institution_name, phase,
 * scores: { SPRT, SUMT, AUTT, WINT } (구버전 scoreN·scoreD·scoreK·scoreM 도 appendForest2026Row_ 에서 읽음)
 * rawInputs: { q1_triangle, q1_square, … } (유아 q8까지, 초등 q12까지; 구 q1y/q1n 호환)
 * class_name, age_group, location, facilitator
 * participant_count — O+X 슬롯 합(모집단 수)
 * requestId — forest.html 전송 시마다 고유 문자열(보고서 링크 ?view=report&id= 와 동일)
 *
 * 보고서 조회·ForestReports 인덱스·doGet 완성본: scripts/gas-forest-report-webapp.gs
 * ForestReports 시트는 본 함수와 동일한 열 분리 + 마지막 열에만 전체 JSON(백업)을 둡니다(B열 통째 JSON 폐지).
 */

/**
 * forest.html 과 호환: rawInputs.q1_triangle / q1_square 우선, 없으면 q1y/q1n(구형).
 * 내부 questions 는 여전히 q1y/q1n 키로 통일(시트 수식·기존 스크립트 호환).
 */
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

/** 봄·여름·가을·겨울 열: scores.* → score_spring 등 풀네임 → 구버전 scoreN·scoreD·scoreK·scoreM */
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

/** A~AO 41열 — gas-forest-report-webapp.gs 와 동일 (E=index4, 인덱스 명시) */
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

/*
  doPost 예시 (기존 프로젝트에 맞게 병합):
  — forestIsElementary_(data) → 시트「2026초등」 vs 「2026」(문자열 "true", age_group 초등 포함)

function doPost(e) {
  try {
    var raw = e.postData && e.postData.contents;
    if (!raw) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'no body' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var data = JSON.parse(raw);
    var isEl = forestIsElementary_(data);
    var sheetName = isEl ? '2026초등' : '2026';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'no sheet ' + sheetName }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var rowContents = appendForest2026Row_(data);
    sheet.appendRow(rowContents);
    return ContentService.createTextOutput(JSON.stringify({ success: true, sheet: sheetName }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
*/

/*
  선택: 관리자 보고서 링크(다른 기기) — doGet 으로 동일 스냅샷 JSON 반환 시 forest.html 이 fetch 로 복원.
  시트 수식 예: =HYPERLINK("https://mindstory.kr/forest.html?view=report&id="&A2,"보고서")  (A2 = requestId 열)
  응답은 { "version":1, "requestId":"...", "savedAt":"...", "sheetPayload":{...}, "inst":{...} } 형식이면 클라이언트 applyForestReportSnapshot 과 호환.

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (String(p.view || '') !== 'report' || !String(p.id || '').trim()) {
    return ContentService.createTextOutput('Forest sheet webhook — use POST for append, or GET ?view=report&id=REQUEST_ID')
      .setMimeType(ContentService.MimeType.TEXT);
  }
  var id = String(p.id).trim();
  var snap = getReportSnapshotByRequestId_(id); // 스프레드시트/캐시에서 조회해 구현
  if (!snap) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'not found' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify(snap))
    .setMimeType(ContentService.MimeType.JSON);
}
*/
