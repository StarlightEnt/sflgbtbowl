// PATH: lib/pdf/parseLeagueStandings.js
//
// Parses LGBT Wednesday Community's BLS-2026/AS League Standings PDF
// (pdf-parse'd text). Extends the row-scanning approach from
// bowling-poker-manager/lib/pdfParser.js's parseRosterPDF — same
// section-tracking state machine and bowler-line regex — rather than
// rewriting it, but this format needs different fields out of each row
// (real average + captain flag, not book-average cross-matching), plus
// two extra sections (Team Standings, Review of Last Week's Bowling)
// that the sibling parser doesn't need at all.
//
// Gay Games' PDF format is a different layout entirely and is explicitly
// out of scope — this only handles the BLS-2026/AS format used by LGBT
// Wednesday Community.

function isBowlerLine(line) {
  if (/\d{3}-\d{5}/.test(line)) return false;
  // NOTE: deliberately does not exclude "Lane N" here even though it's
  // never a bowler line — that line is consumed earlier as a team-header
  // continuation (see pendingTeamHeader below) before this check runs,
  // and excluding it here too would eat it before that logic sees it.
  if (
    /^(BLS-|--|Last Week|Div |Scratch|Handicap|Local|USBC|Upcoming|Name DOB|Real High|Name Average|RealHigh|NameAverage|NameID)/.test(
      line
    )
  )
    return false;
  return true;
}

// A trailing "-*" (optionally followed by a short officer-title
// abbreviation like "Pres"/"Sec"/"VP"/"Tr", mashed directly onto the "-*"
// with no separator) marks the team captain in this PDF format. Other
// title suffixes with no "*" (e.g. "-Tr", "-VP") are just other officer
// roles, not captains — strip them but don't set is_captain.
function extractCaptainAndCleanName(rawName) {
  const m = rawName.match(/^(.+?)-(\*)?[A-Za-z]*$/);
  if (!m) return { cleanName: rawName.trim(), isCaptain: false };
  return { cleanName: m[1].trim(), isCaptain: Boolean(m[2]) };
}

function splitFirstLast(cleanName) {
  const parts = cleanName.trim().split(/\s+/);
  const first_name = parts[0];
  const last_name = parts.length > 1 ? parts.slice(1).join(" ") : "";
  return { first_name, last_name };
}

// Parses one bowler's numeric tail (everything after the name, all
// digits/spaces/"a"-markers mashed together with no delimiters).
//
// Column order in the real PDF (recovered from spacing in the original,
// lost by pdf-parse's text extraction): Average, Games, Pins, HDCP,
// HighGame, HighSers, HDCPGame, HDCPSers, Game-1, Game-2, Game-3, Total,
// BookAvg. Because pdf-parse collapses all column spacing, only the
// *first* value (Average) is unambiguously recoverable by position for
// a bowler who has bowled real games this week.
//
// A bowler who has not yet bowled any real game this season shows up
// with an "aNNN" marker (average-substituted score) in place of each
// game score, or an all-zero row if they've never even been assigned a
// substitute average — in both cases their real-season average is
// genuinely 0 (there's no real-game data behind whatever book average
// carried over), so real_average is forced to 0 rather than trying to
// pick a number out of that row.
function parseRealAverage(tail) {
  if (/a\d+/.test(tail)) return 0;
  const m = tail.match(/^\d{1,3}/);
  if (!m) return 0;
  return parseInt(m[0], 10);
}

// Resolves an extracted team name to its team_number, falling back to a
// prefix match when the extracted name is truncated (narrower column in
// this section of the PDF) or had a trailing digit swallowed into the
// score tail by the row-splitting regex — see resolveTeamNumber usage in
// the "Review of Last Week's Bowling" loop for the real cases this covers.
function resolveTeamNumber(nameToNumber, rawName) {
  const name = rawName.trim();
  if (nameToNumber.has(name)) return nameToNumber.get(name);
  for (const [fullName, number] of nameToNumber) {
    if (fullName.startsWith(name)) return number;
  }
  return undefined;
}

function parseBowlerLine(line) {
  const m = line.match(/^([A-Za-z][A-Za-z\s.'\-*]+?)(\d[\d\sa_]*)$/);
  if (!m) return null;
  const rawName = m[1].trim();
  return { rawName, tail: m[2] };
}

export function parseLeagueStandingsPDF(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // --- Header: week number + date ---
  let week_number = null;
  let week_date = null;
  for (const line of lines) {
    const m = line.match(/(\d{1,2}\/\d{1,2}\/\d{4}).*?Week\s+(\d+)\s+of\s+(\d+)/);
    if (m) {
      week_date = m[1];
      week_number = parseInt(m[2], 10);
      break;
    }
  }

  // --- Team Standings section ---
  // Digits at the start of each row are Place+Lane#+TeamNumber mashed
  // together with no separator, which is ambiguous to split on its own —
  // Place is redundant with row order and Lane# vs TeamNumber can't be
  // told apart by width alone. Team numbers are resolved unambiguously
  // afterward from the Team Rosters section's explicit "N - Name"
  // headers instead (matched by team name, which appears verbatim,
  // truncation and all, in both sections of this same document).
  const standingsRows = [];
  {
    let inStandings = false;
    for (const line of lines) {
      if (line === "Team Standings") {
        inStandings = true;
        continue;
      }
      if (inStandings && line.startsWith("Review of Last Week")) break;
      if (!inStandings) continue;
      if (/^(Points|Place)/.test(line)) continue;

      const m = line.match(/^\d+\s*([A-Za-z].*?)(\d.*)$/);
      if (!m) continue;
      const team_name = m[1].trim();
      const tail = m[2];

      // Points won/lost are single digits (this fixture is a single
      // week's sheet, so totals can't exceed the week's max points yet).
      // pct_won is computed from won/lost rather than trusting the
      // printed percentage text, which pdf-parse sometimes renders
      // without its decimal point (observed on the BYE row).
      const wl = tail.match(/^(\d)(\d)/);
      let points_won = 0;
      let points_lost = 0;
      let pct_won = 0;
      if (wl) {
        points_won = parseInt(wl[1], 10);
        points_lost = parseInt(wl[2], 10);
        const total = points_won + points_lost;
        pct_won = total > 0 ? Math.round((points_won / total) * 1000) / 10 : 0;
      }

      standingsRows.push({ team_name, points_won, points_lost, pct_won });
    }
  }

  // --- Team Rosters + Temporary Substitutes sections ---
  const teams = [];
  const subs = [];
  let currentTeam = null;
  let inRosters = false;
  let inSubs = false;
  let inBirthdays = false;
  let pendingTeamHeader = null;

  for (const line of lines) {
    if (line === "QUEER BOWLING" || /Page 4/.test(line)) break;

    if (line.startsWith("Upcoming") || line.startsWith("Local and")) {
      inBirthdays = true;
      continue;
    }
    if (inBirthdays && line.startsWith("Temporary Substitutes")) {
      inBirthdays = false;
      inSubs = true;
      inRosters = false;
      currentTeam = null;
      continue;
    }
    if (inBirthdays) continue;

    if (line === "Team Rosters") {
      inRosters = true;
      continue;
    }
    if (line.startsWith("Temporary Substitutes")) {
      inSubs = true;
      inRosters = false;
      currentTeam = null;
      continue;
    }
    if (line.startsWith("Last Week")) {
      inRosters = false;
      inSubs = false;
      continue;
    }

    if (!inRosters && !inSubs) continue;

    // Page-break boilerplate ("BLS-2026/AS ... licensed to ...", the
    // season/week banner repeated at the top of each page) — generalized
    // on BLS's own fixed strings rather than a specific league name so
    // it isn't tied to one league's configured name.
    if (/^LGBT\s+Wed/i.test(line)) continue;
    if (/Week\s+\d+\s+of\s+\d+\s*Page\s+\d+/.test(line)) continue;
    if (!isBowlerLine(line)) continue;

    if (inRosters) {
      const teamMatchA = line.match(/^(\d+)\s*-\s*(.+?)Lane\s+(\d+)$/);
      if (teamMatchA) {
        currentTeam = {
          team_number: parseInt(teamMatchA[1], 10),
          team_name: teamMatchA[2].trim(),
          lane: parseInt(teamMatchA[3], 10),
          bowlers: [],
        };
        teams.push(currentTeam);
        pendingTeamHeader = null;
        continue;
      }

      const teamMatchB = line.match(/^(\d+)\s*-\s*([A-Za-z].+)$/);
      if (teamMatchB && !/\d{3,}/.test(teamMatchB[2])) {
        pendingTeamHeader = { num: parseInt(teamMatchB[1], 10), name: teamMatchB[2].trim() };
        continue;
      }

      if (pendingTeamHeader) {
        const laneMatch = line.match(/^Lane\s+(\d+)$/);
        if (laneMatch) {
          currentTeam = {
            team_number: pendingTeamHeader.num,
            team_name: pendingTeamHeader.name,
            lane: parseInt(laneMatch[1], 10),
            bowlers: [],
          };
          teams.push(currentTeam);
          pendingTeamHeader = null;
          continue;
        }
        pendingTeamHeader = null;
      }

      if (!currentTeam) continue;

      if (/^VACANT/.test(line)) {
        currentTeam.bowlers.push({
          first_name: "VACANT",
          last_name: "",
          real_average: 0,
          is_captain: false,
        });
        continue;
      }

      const parsed = parseBowlerLine(line);
      if (!parsed || parsed.rawName.length < 2) continue;
      if (/^(Name|Real|Book|Last|Div|Scratch|Handicap)/.test(parsed.rawName)) continue;

      const { cleanName, isCaptain } = extractCaptainAndCleanName(parsed.rawName);
      const { first_name, last_name } = splitFirstLast(cleanName);
      currentTeam.bowlers.push({
        first_name,
        last_name,
        full_name: cleanName,
        real_average: parseRealAverage(parsed.tail),
        is_captain: isCaptain,
      });
      continue;
    }

    if (inSubs) {
      const parsed = parseBowlerLine(line);
      if (!parsed || parsed.rawName.length < 2) continue;
      if (/^(Name|Real|Book)/.test(parsed.rawName)) continue;

      // A sub has no team to captain, so a "-*" here can't mean the same
      // thing it does on a roster row — strip it for a clean name same
      // as any other title suffix, but never set is_captain from it.
      const { cleanName } = extractCaptainAndCleanName(parsed.rawName);
      const { first_name, last_name } = splitFirstLast(cleanName);
      subs.push({
        first_name,
        last_name,
        full_name: cleanName,
        real_average: parseRealAverage(parsed.tail),
        is_captain: false,
      });
    }
  }

  // Resolve each Team Standings row's team_number by matching its team
  // name against the roster teams just parsed (team_number is not
  // reliably recoverable from the standings row's own mashed digits).
  const nameToNumber = new Map(teams.map((t) => [t.team_name, t.team_number]));
  const team_standings = standingsRows
    .map((row) => {
      const team_number = resolveTeamNumber(nameToNumber, row.team_name);
      if (team_number === undefined) return null;
      return { team_number, ...row };
    })
    .filter(Boolean);

  // --- Review of Last Week's Bowling → weekly_results ---
  // Row shape: "<lanePair><TeamAName><hdcp1><hdcp2><hdcp3><total><won>
  // <---><TeamBName><hdcp1><hdcp2><hdcp3><total><won>". Only lane_pair,
  // team names (resolved to team_number via the same roster map), and
  // each side's points are needed — the per-game handicap breakdown
  // isn't part of the weekly_results schema.
  const weekly_results = [];
  {
    let inReview = false;
    for (const line of lines) {
      if (line.startsWith("Review of Last Week")) {
        inReview = true;
        continue;
      }
      if (inReview && (line.startsWith("View Standings") || line.startsWith("Lane Assignments"))) break;
      if (!inReview) continue;
      if (/^(Lanes|HDCP)/.test(line)) continue;

      const m = line.match(
        /^(\d+-\d+)([A-Za-z].*?)(\d.*?)<-+>([A-Za-z].*?)(\d.*)$/
      );
      if (!m) continue;
      const [, lane_pair, teamAName, tailA, teamBName, tailB] = m;

      // Each side's tail is "<hdcp1><hdcp2><hdcp3><total><points>" mashed
      // with no separators — only the final digit (points won this week,
      // a single digit for a whole-number week) is needed, so pull it
      // off the end rather than pattern-matching the whole blob.
      const team_a_number = resolveTeamNumber(nameToNumber, teamAName);
      const team_b_number = resolveTeamNumber(nameToNumber, teamBName);
      if (team_a_number === undefined || team_b_number === undefined) continue;

      weekly_results.push({
        lane_pair,
        team_a_number,
        team_a_points: parseInt(tailA.slice(-1), 10),
        team_b_number,
        team_b_points: parseInt(tailB.slice(-1), 10),
      });
    }
  }

  return {
    week_number,
    week_date,
    teams: teams.map((t) => ({
      team_number: t.team_number,
      team_name: t.team_name,
      bowlers: t.bowlers,
    })),
    subs,
    team_standings,
    weekly_results,
  };
}
