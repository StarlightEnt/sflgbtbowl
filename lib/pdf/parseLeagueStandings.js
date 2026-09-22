// PATH: lib/pdf/parseLeagueStandings.js
//
// Shared, header-anchored parser for both LGBT Wednesday Community
// (LWC) and Gay Games (GG) League Standings PDFs. See
// Parser-Redesign-Standing-Sheets.md (claude.ai project docs) for the
// full design rationale — this file implements that design directly,
// verified against real LWC and GG fixture PDFs.
//
// Takes the raw PDF file buffer (not pre-flattened text), because the
// column data this parser needs (Won/Lost points, Real/True Average)
// is only unambiguously recoverable from each text item's own x/y
// position. pdf-parse's flattened string discards that entirely,
// mashing adjacent numbers together with no separator in any
// narrow-columned table — confirmed directly against both real
// fixtures, not assumed.

async function loadPdfjs() {
  return import("pdfjs-dist/legacy/build/pdf.mjs");
}

// One row = every text item within ROW_Y_TOLERANCE of the same y on one
// page, left-to-right. Exact y equality is NOT reliable: pdfjs can emit
// the halves of one visual line at y-values differing only by float
// noise (GG Wk02's Team 8 matchup: 382.99999999999994 vs 383; LWC Wk02's
// column headers differ by ~2e-4), which split the line into two rows
// and silently dropped the matchup. Rounding y instead would still split
// a line straddling a rounding boundary (GG rows sit on .x5 values like
// 286.05), so group by distance from the row's first y.
//
// Keep the tolerance well under 0.1: distinct items on the same visual
// line sit 0.11-0.35pt apart in real fixtures (e.g. a roster's team name
// vs. its "Lane N" label) and the parser relies on them staying separate.
const ROW_Y_TOLERANCE = 0.01;

async function extractRows(buffer) {
  const pdfjsLib = await loadPdfjs();
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const rows = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const pageItems = content.items
      // pdfjs sometimes emits an empty-string marker item immediately
      // before the real content on a row — harmless to drop.
      .filter((item) => item.str !== "")
      .map((item) => ({ x: item.transform[4], y: item.transform[5], str: item.str }))
      .sort((a, b) => b.y - a.y); // top to bottom
    const groups = [];
    for (const { x, y, str } of pageItems) {
      const last = groups[groups.length - 1];
      if (last && last.y - y <= ROW_Y_TOLERANCE) last.items.push({ x, str });
      else groups.push({ y, items: [{ x, str }] });
    }
    for (const { y, items: groupItems } of groups) {
      const items = groupItems.sort((a, b) => a.x - b.x);
      const text = items
        .map((i) => i.str)
        .join("")
        .replace(/\s+/g, " ")
        .trim();
      rows.push({ page: p, y, items, text });
    }
  }
  return rows;
}

// The "header-anchored" read: the item on this row whose x is nearest
// targetX, within tolerance points. Returns null if nothing on the
// row is close enough — used to mean "this column is blank on this
// row" (e.g. a bowler with zero games has no Average value printed at
// all, rather than a zero).
function nearestItem(row, targetX, tolerance = 20) {
  if (targetX == null) return null;
  let best = null;
  let bestDist = Infinity;
  for (const it of row.items) {
    const d = Math.abs(it.x - targetX);
    if (d < bestDist) {
      bestDist = d;
      best = it;
    }
  }
  return best && bestDist <= tolerance ? best : null;
}

// The x-position of the first item whose text is an exact match for
// `str`, scanning rows[startIdx..endIdx].
function findLabelX(rows, startIdx, endIdx, str) {
  for (let i = startIdx; i <= endIdx && i < rows.length; i++) {
    for (const it of rows[i].items) {
      if (it.str === str) return it.x;
    }
  }
  return null;
}

// The x-position of the Nth (1-indexed) item whose text exactly
// matches `str` — Review of Last Week's Bowling repeats "Team Name"
// and "WON" once per side (A and B), so a single findLabelX can't
// distinguish them.
function findLabelXOccurrence(rows, startIdx, endIdx, str, occurrence) {
  let count = 0;
  for (let i = startIdx; i <= endIdx && i < rows.length; i++) {
    for (const it of rows[i].items) {
      if (it.str === str) {
        count++;
        if (count === occurrence) return it.x;
      }
    }
  }
  return null;
}

function findRowIndex(rows, fromIdx, predicate) {
  for (let i = fromIdx; i < rows.length; i++) {
    if (predicate(rows[i])) return i;
  }
  return -1;
}

// Always floor whatever numeric value is read from the Real/True
// Average column position (Parser-Redesign-Standing-Sheets.md §5) — a
// no-op for LWC's already-integer values, correctly truncates GG's
// genuine decimal ("150.00" -> 150). No item found at that position
// at all (no games bowled yet) -> 0.
function parseAverageValue(item) {
  if (!item) return 0;
  const n = parseFloat(item.str);
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

// A trailing "-*" (optionally followed by a short officer-title
// abbreviation like "Pres"/"Sec"/"VP"/"Tr", mashed directly onto the
// "-*" with no separator) marks the team captain in LWC's PDF format —
// its only such mechanism. Gay Games has no equivalent signal
// anywhere in its document (verified by searching the full roster
// section and the whole document for both this pattern and the
// literal word "captain" — neither appears); this regex simply never
// matches a GG name, which is exactly the desired behavior. Other
// title suffixes with no "*" (e.g. "-Tr", "-VP") are other officer
// roles, not captains — strip them but don't set is_captain.
const TITLE_ABBREVIATIONS = ["Pres", "Sec", "VP", "Tr"];
const captainSuffixRe = new RegExp(`^(.+?)-(\\*)?(?:${TITLE_ABBREVIATIONS.join("|")})?$`);

function extractCaptainAndCleanName(rawName) {
  const m = rawName.match(captainSuffixRe);
  if (!m) return { cleanName: rawName.trim(), isCaptain: false };
  return { cleanName: m[1].trim(), isCaptain: Boolean(m[2]) };
}

// Drops bare middle initials (a single letter, optionally with a
// trailing period — "D.", "A", etc.) before joining the rest into
// last_name. Gay Games' PDF prints full name + middle initial for
// many bowlers ("Allison D. Laureano", "Cathy A. Patterson", "Robert
// J. Werner", ...) while the bowlers table has no middle-name field
// and LWC's PDF never prints one. Left in, the initial gets glued onto
// last_name ("D. Laureano") and silently breaks identity matching
// against that same person's existing record from a league whose PDF
// doesn't print one ("Laureano") — both the exact match and the
// edit-distance fuzzy match in matchBowlerIdentity.js fail on the
// extra "d. " prefix, so Season Setup creates a duplicate "new
// bowler" instead of tying the roster spot to their real card.
// Two-letter-plus suffixes (Jr, Sr, II, III, ...) are untouched — that
// glued-on shape ("Cobbs II", "Hamilton Jr") is unchanged, existing
// behavior, not part of this fix.
function splitFirstLast(cleanName) {
  const parts = cleanName.trim().split(/\s+/);
  const first_name = parts[0];
  const rest = parts.slice(1).filter((token) => !/^[A-Za-z]\.?$/.test(token));
  const last_name = rest.length > 0 ? rest.join(" ") : "";
  return { first_name, last_name };
}

// Resolves an extracted team name to its team_number, falling back to
// a unique-prefix match when the extracted name is truncated by a
// narrower column in some section of the PDF (Parser-Redesign-Standing-Sheets.md
// §3). Two team names sharing a prefix makes the match ambiguous —
// returns undefined rather than guessing; callers treat that the same
// as a pure miss (skip the row).
function resolveTeamNumber(nameToNumber, rawName) {
  const name = rawName.trim();
  if (nameToNumber.has(name)) return nameToNumber.get(name);
  const prefixMatches = [];
  for (const [fullName, number] of nameToNumber) {
    if (fullName.startsWith(name)) prefixMatches.push(number);
  }
  if (prefixMatches.length === 1) return prefixMatches[0];
  return undefined;
}

// Page-continuation boilerplate repeated at the top/bottom of every
// page in both formats: the season/league name + date + "Week N of M"
// banner, the "BLS-... licensed to ..." footer line, and the
// date/time/"Page N of M" trailer beneath it. None of this is
// league-specific text, so it's checked structurally rather than
// against one league's configured name.
function isPageBannerRow(text) {
  if (/Week\s+\d+\s+of\s+\d+/.test(text)) return true;
  if (/^BLS-/.test(text)) return true;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}.*Page\s+\d+\s+of\s+\d+/.test(text)) return true;
  return false;
}

// A Team Rosters / Temporary Substitutes header row (there are always
// two: a top row like "Real High High HDCP HDCP Book" or "High High
// HDCP HDCP True", and the main column-label row starting "Name ...").
// Neither is a real bowler's name, so both must be skipped explicitly.
// The main label row's "Name" and "Average" items can land on
// fractionally different y-values in the real LWC fixtures, splitting it
// into a "Name" row and a separate "Average Gms Pins ..." row — so
// "Average" has to be recognized as a header start too.
function isRosterHeaderRow(text) {
  return /^(Name|Real|High|Average)\b/.test(text);
}

// A roster row whose leftmost item is purely numeric has no name column
// at all — e.g. the BYE team's placeholder stat rows in the real LWC
// fixtures. Not a bowler; skipping it keeps BYE at zero bowlers.
function isNamelessRow(row) {
  return /^[\d.]+$/.test(row.items[0].str);
}

export async function parseLeagueStandingsPDF(buffer) {
  const rows = await extractRows(buffer);

  // --- Header: week number + date ---
  let week_number = null;
  let week_date = null;
  for (const row of rows) {
    const m = row.text.match(/(\d{1,2}\/\d{1,2}\/\d{4}).*?Week\s+(\d+)\s+of\s+(\d+)/);
    if (m) {
      week_date = m[1];
      week_number = parseInt(m[2], 10);
      break;
    }
  }

  // --- Team Rosters + Temporary Substitutes ---
  // Parsed first: Team Standings and Review of Last Week's Bowling
  // both resolve team identity by name against the roster's
  // team_number map (Parser-Redesign-Standing-Sheets.md §3).
  const rostersStart = findRowIndex(rows, 0, (r) => r.text === "Team Rosters");
  const subsStart =
    rostersStart === -1
      ? -1
      : findRowIndex(rows, rostersStart + 1, (r) => r.text.startsWith("Temporary Substitutes"));
  const subsEnd = subsStart === -1 ? -1 : findRowIndex(rows, subsStart + 1, (r) => /^BLS-/.test(r.text));

  if (rostersStart === -1 || subsStart === -1) {
    return {
      week_number,
      week_date,
      teams: [],
      subs: [],
      team_standings: [],
      weekly_results: [],
      capturesCaptainData: false,
    };
  }

  // Each section's "Average" header column shifts slightly between
  // Team Rosters and Temporary Substitutes even though the label text
  // is identical — read independently per section, never reused
  // (confirmed in both real fixtures).
  const subsHeaderEnd = subsEnd === -1 ? rows.length - 1 : subsEnd - 1;
  const rosterHeaderX = findLabelX(rows, rostersStart, subsStart - 1, "Average");
  const subsHeaderX = findLabelX(rows, subsStart, subsHeaderEnd, "Average");

  // Format signal: LWC's header literally says "Real" (Real Average);
  // GG's says "True" (True Average) and has no captain marker
  // anywhere in the document at all. Defaulting capturesCaptainData
  // to false when "Real" isn't found means an unrecognized future
  // format fails safe — it won't silently wipe out an admin's manual
  // captain flags on a weekly publish, which is the actual risk this
  // flag exists to prevent (Parser-Redesign-Standing-Sheets.md §6).
  const capturesCaptainData = rows
    .slice(rostersStart, subsStart)
    .some((r) => r.items.some((it) => it.str === "Real"));

  const teams = [];
  const subs = [];

  {
    let currentTeam = null;
    for (let i = rostersStart + 1; i < subsStart; i++) {
      const row = rows[i];
      if (!row.items.length) continue;
      if (isPageBannerRow(row.text)) continue;
      if (isRosterHeaderRow(row.text)) continue;

      // A "Lane N..." line (lane number, plus in GG's format
      // "HDCP=... Avg=..." team-level handicap info) precedes each
      // team's header line in both real fixtures — confirmed by direct
      // coordinate inspection, the reverse of this file's original
      // assumption. None of that data is needed for the site, so it's
      // simply skipped.
      if (/^Lane\s+\d+/.test(row.text)) continue;

      // LWC's format (only — not present in GG) inserts a "Last Week's
      // Top Scores" leaderboard section, with its own unrelated
      // Div-A/B/C tables, between the last team's roster and
      // "Temporary Substitutes". None of it belongs to any team, so
      // once it starts, drop out of "currently reading a team" until a
      // real team header line (or the Substitutes section) is seen
      // again — which, for this trailing section, never happens, so it
      // simply gets skipped for the rest of the Team Rosters range.
      if (row.text === "Last Week's Top Scores") {
        currentTeam = null;
        continue;
      }

      // Team header line: "N - Team Name". In both real fixtures this
      // is rendered as two text items on one row (the label plus a
      // trailing space item), so matching is done against the row's
      // joined text, not a single-item count.
      const teamHeaderMatch = row.text.match(/^(\d+)\s*-\s*(.+?)\s*$/);
      if (teamHeaderMatch) {
        currentTeam = { team_number: parseInt(teamHeaderMatch[1], 10), team_name: teamHeaderMatch[2].trim(), bowlers: [] };
        teams.push(currentTeam);
        continue;
      }

      if (!currentTeam) continue;

      if (isNamelessRow(row)) continue;

      const nameItem = row.items[0];
      if (/^VACANT/.test(nameItem.str)) {
        currentTeam.bowlers.push({ first_name: "VACANT", last_name: "", real_average: 0, is_captain: false });
        continue;
      }

      const { cleanName, isCaptain } = extractCaptainAndCleanName(nameItem.str);
      const { first_name, last_name } = splitFirstLast(cleanName);
      const avgItem = nearestItem(row, rosterHeaderX);
      currentTeam.bowlers.push({
        first_name,
        last_name,
        full_name: cleanName,
        real_average: parseAverageValue(avgItem),
        is_captain: isCaptain,
      });
    }
  }

  {
    const subsLoopEnd = subsEnd === -1 ? rows.length : subsEnd;
    for (let i = subsStart + 1; i < subsLoopEnd; i++) {
      const row = rows[i];
      if (!row.items.length) continue;
      if (isPageBannerRow(row.text)) continue;
      if (isRosterHeaderRow(row.text)) continue;
      if (isNamelessRow(row)) continue;

      const nameItem = row.items[0];
      // A sub has no team to captain — strip any "-*" suffix for a
      // clean name (same as any other stray title suffix) but never
      // set is_captain from it.
      const { cleanName } = extractCaptainAndCleanName(nameItem.str);
      const { first_name, last_name } = splitFirstLast(cleanName);
      const avgItem = nearestItem(row, subsHeaderX);
      subs.push({
        first_name,
        last_name,
        full_name: cleanName,
        real_average: parseAverageValue(avgItem),
        is_captain: false,
      });
    }
  }

  const nameToNumber = new Map(teams.map((t) => [t.team_name, t.team_number]));

  // --- Team Standings ---
  const standingsStart = findRowIndex(rows, 0, (r) => r.text === "Team Standings");
  const standingsEnd =
    standingsStart === -1 ? -1 : findRowIndex(rows, standingsStart + 1, (r) => r.text.startsWith("Review of Last Week"));
  const team_standings = [];
  if (standingsStart !== -1 && standingsEnd !== -1) {
    const wonX = findLabelX(rows, standingsStart, standingsEnd - 1, "Won");
    const lostX = findLabelX(rows, standingsStart, standingsEnd - 1, "Lost");
    const teamNameX = findLabelX(rows, standingsStart, standingsEnd - 1, "Team Name");
    for (let i = standingsStart + 1; i < standingsEnd; i++) {
      const row = rows[i];
      if (!row.items.length) continue;
      if (isPageBannerRow(row.text)) continue;
      // A real data row's leftmost item is the numeric "Place" column.
      if (!/^\d+$/.test(row.items[0].str)) continue;

      const nameItem = nearestItem(row, teamNameX, 40);
      const wonItem = nearestItem(row, wonX);
      const lostItem = nearestItem(row, lostX);
      if (!nameItem || !wonItem || !lostItem) continue;

      const team_number = resolveTeamNumber(nameToNumber, nameItem.str);
      if (team_number === undefined) continue;

      const points_won = parseInt(wonItem.str, 10) || 0;
      const points_lost = parseInt(lostItem.str, 10) || 0;
      const total = points_won + points_lost;
      const pct_won = total > 0 ? Math.round((points_won / total) * 1000) / 10 : 0;

      team_standings.push({ team_number, team_name: nameItem.str, points_won, points_lost, pct_won });
    }
  }

  // --- Review of Last Week's Bowling -> weekly_results ---
  const reviewStart = findRowIndex(rows, 0, (r) => r.text.startsWith("Review of Last Week"));
  const reviewEnd =
    reviewStart === -1
      ? -1
      : findRowIndex(rows, reviewStart + 1, (r) =>
          /^(Season High Scores|View Standings|Lane Assignments|Team Rosters)/.test(r.text)
        );
  const weekly_results = [];
  if (reviewStart !== -1 && reviewEnd !== -1) {
    const lanesX = findLabelX(rows, reviewStart, reviewEnd - 1, "Lanes");
    const teamAX = findLabelXOccurrence(rows, reviewStart, reviewEnd - 1, "Team Name", 1);
    const teamBX = findLabelXOccurrence(rows, reviewStart, reviewEnd - 1, "Team Name", 2);
    const wonAX = findLabelXOccurrence(rows, reviewStart, reviewEnd - 1, "WON", 1);
    const wonBX = findLabelXOccurrence(rows, reviewStart, reviewEnd - 1, "WON", 2);
    for (let i = reviewStart + 1; i < reviewEnd; i++) {
      const row = rows[i];
      if (!row.items.length) continue;
      if (isPageBannerRow(row.text)) continue;
      const laneItem = nearestItem(row, lanesX, 15);
      if (!laneItem || !/^\d+-\d+$/.test(laneItem.str)) continue;

      const teamAItem = nearestItem(row, teamAX, 40);
      const teamBItem = nearestItem(row, teamBX, 40);
      const wonAItem = nearestItem(row, wonAX);
      const wonBItem = nearestItem(row, wonBX);
      if (!teamAItem || !teamBItem || !wonAItem || !wonBItem) continue;

      const team_a_number = resolveTeamNumber(nameToNumber, teamAItem.str);
      const team_b_number = resolveTeamNumber(nameToNumber, teamBItem.str);
      if (team_a_number === undefined || team_b_number === undefined) continue;

      weekly_results.push({
        lane_pair: laneItem.str,
        team_a_number,
        team_a_points: parseInt(wonAItem.str, 10) || 0,
        team_b_number,
        team_b_points: parseInt(wonBItem.str, 10) || 0,
      });
    }
  }

  return {
    week_number,
    week_date,
    teams: teams.map((t) => ({ team_number: t.team_number, team_name: t.team_name, bowlers: t.bowlers })),
    subs,
    team_standings,
    weekly_results,
    capturesCaptainData,
  };
}
