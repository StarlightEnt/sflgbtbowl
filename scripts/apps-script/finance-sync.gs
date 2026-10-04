/**
 * Finance sync: reads the "Web Summary" tab of this spreadsheet and posts
 * it to the website. Paste into Extensions > Apps Script (bound to the
 * treasurer's sheet). Contains no secrets: the URL, key, league and alert
 * email live in Project Settings > Script properties.
 *
 *   SYNC_URL      https://sflgbtbowl.com/api/finance/sync
 *   SYNC_SECRET   same value as FINANCE_SYNC_SECRET on the website
 *   LEAGUE_SLUG   lgbt-wednesday-community
 *   ALERT_EMAIL   who to email when a sync fails
 *
 * Run installTrigger() once to start the every-10-minutes timer.
 * Run syncNow() to test by hand.
 *
 * Safe-fail: if the sheet shows an error value or has no bowlers, nothing
 * is sent and the website keeps its last good data.
 */

var SHEET_NAME = 'Web Summary';
var FIRST_ROW = 13;
var LAST_ROW = 124;
var HEARTBEAT_MINUTES = 60; // re-send unchanged data at least this often

function props_() {
  return PropertiesService.getScriptProperties();
}

function isoDay_(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  }
  var s = String(v).trim();
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
}

function buildSnapshot_() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Sheet "' + SHEET_NAME + '" not found');

  var settings = sheet.getRange('B2:B7').getValues(); // as-of, W, N, threshold, deadline, positions
  var grid = sheet.getRange(FIRST_ROW, 1, LAST_ROW - FIRST_ROW + 1, 30).getValues(); // A..AD

  // Any spreadsheet error value anywhere we read means do not send.
  var all = settings.concat(grid);
  for (var r = 0; r < all.length; r++) {
    for (var c = 0; c < all[r].length; c++) {
      if (typeof all[r][c] === 'string' && /^#(REF|N\/A|VALUE|DIV|NAME|NUM|NULL|ERROR)/.test(all[r][c])) {
        throw new Error('Spreadsheet error value "' + all[r][c] + '" at row ' + (r + FIRST_ROW) + ', col ' + (c + 1));
      }
    }
  }

  var asOf = isoDay_(settings[0][0]);
  if (!asOf) throw new Error('As-of date (B2) is not a date');

  var bowlers = [];
  var teams = [];
  for (var i = 0; i < grid.length; i++) {
    var row = grid[i];
    // Bowler table: A team#, C name, E weeks, F paid, G owed, H final-2 marked, I final-2 applies, Q in arrears
    if (String(row[2]).trim() !== '') {
      bowlers.push({
        teamNumber: Number(row[0]),
        name: String(row[2]).trim(),
        weeks: Number(row[4]) || 0,
        paid: Number(row[5]) || 0,
        owed: Number(row[6]) || 0,
        final2Marked: Number(row[7]) || 0,
        final2Applies: row[8] === true,
        inArrears: row[16] === true
      });
    }
    // Team table: S team#, T name, AA positions in arrears, AB basis
    if (i < 16 && String(row[19]).trim() !== '') {
      teams.push({
        teamNumber: Number(row[18]),
        teamName: String(row[19]).trim(),
        positionsInArrears: Number(row[26]) || 0,
        basis: String(row[27])
      });
    }
  }
  if (bowlers.length === 0) throw new Error('No bowlers found on the summary tab');

  return {
    asOf: asOf,
    weeksCompleted: Number(settings[1][0]) || 0,
    final2Threshold: Number(settings[3][0]) || 15,
    final2Deadline: isoDay_(settings[4][0]),
    teams: teams,
    bowlers: bowlers
  };
}

function alert_(message) {
  var p = props_();
  var last = Number(p.getProperty('LAST_ALERT_MS') || 0);
  if (Date.now() - last < 6 * 3600 * 1000) return; // at most one email per 6 hours
  var to = p.getProperty('ALERT_EMAIL');
  if (to) {
    MailApp.sendEmail(to, 'Finance sync problem (sflgbtbowl)',
      message + '\n\nThe website is still showing the last good data.');
    p.setProperty('LAST_ALERT_MS', String(Date.now()));
  }
}

function syncNow() {
  var p = props_();
  try {
    var snapshot = buildSnapshot_();
    var body = JSON.stringify({ league: p.getProperty('LEAGUE_SLUG'), snapshot: snapshot });

    // Skip unchanged data except for an hourly heartbeat.
    var digest = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, body));
    var lastDigest = p.getProperty('LAST_DIGEST');
    var lastOk = Number(p.getProperty('LAST_OK_MS') || 0);
    if (digest === lastDigest && Date.now() - lastOk < HEARTBEAT_MINUTES * 60 * 1000) return;

    var res = UrlFetchApp.fetch(p.getProperty('SYNC_URL'), {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + p.getProperty('SYNC_SECRET') },
      payload: body,
      muteHttpExceptions: true
    });
    var code = res.getResponseCode();
    if (code !== 200) {
      throw new Error('Website answered ' + code + ': ' + res.getContentText().slice(0, 300));
    }
    p.setProperty('LAST_DIGEST', digest);
    p.setProperty('LAST_OK_MS', String(Date.now()));
    Logger.log('Synced: ' + res.getContentText());
  } catch (e) {
    Logger.log('Sync failed: ' + e.message);
    alert_('Finance sync failed: ' + e.message);
    throw e;
  }
}

function installTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'syncNow') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('syncNow').timeBased().everyMinutes(10).create();
}
