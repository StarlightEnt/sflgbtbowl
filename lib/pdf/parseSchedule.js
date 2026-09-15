// PATH: lib/pdf/parseSchedule.js
//
// Parses LGBT Wednesday Community's BLS-2026/AS Lane Assignments/Schedule
// PDF (pdf-parse'd text). Extends the week-line-joining approach from
// bowling-poker-manager/lib/pdfParser.js's parseSchedulePDF, adding
// starting_lane/is_roll_off extraction that the sibling parser didn't
// need (it hardcoded starting_lane to 1 and had no roll-off concept).
//
// Gay Games' PDF format is a different layout entirely and is explicitly
// out of scope — this only handles the BLS-2026/AS format used by LGBT
// Wednesday Community.

export function parseSchedulePDF(text) {
  const rawLines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Join a Wk line with whatever continuation lines follow it: a
  // position-round/roll-off week has no lane pairs on its own line, just
  // "{" followed by "Position Round- Start Lane - N" (or "Roll-Off-
  // Start Lane - N") on the next one or two lines.
  const lines = [];
  for (const line of rawLines) {
    const isWkLine = /^Wk\d{2}/.test(line);
    const prevIsWk = lines.length > 0 && /^Wk\d{2}/.test(lines[lines.length - 1]);
    const isContinuation =
      !isWkLine &&
      prevIsWk &&
      (/^-\s*\d/.test(line) || line === "{" || /^(Position Round|Roll-Off)/i.test(line));
    if (isContinuation) {
      lines[lines.length - 1] += " " + line;
    } else {
      lines.push(line);
    }
  }

  // The lane-pair header ("1-23-45-67-89-1011-1213-14" once concatenated
  // by pdf-parse) lists the fixed physical lane pairs in the same
  // left-to-right order every week's team-number pairs are printed in —
  // but with no separators between consecutive pair labels, it can't be
  // split back apart reliably. Lane pairs are always sequential
  // (1-2, 3-4, ...) though, so they're generated instead from the
  // unambiguous "Lanes 1 - 14" total printed on the same page.
  const lanesMatch = text.match(/Lanes\s+(\d+)\s*-\s*(\d+)/);
  const lanePairs = [];
  if (lanesMatch) {
    const first = parseInt(lanesMatch[1], 10);
    const last = parseInt(lanesMatch[2], 10);
    for (let lane = first; lane < last; lane += 2) {
      lanePairs.push(`${lane}-${lane + 1}`);
    }
  }

  const weeks = [];

  for (const line of lines) {
    const wkMatch = line.match(/^Wk(\d{2})\s+(\d{2}\/\d{2})\s*(.*)$/);
    if (!wkMatch) continue;

    const week_number = parseInt(wkMatch[1], 10);
    const bowl_date_str = wkMatch[2];
    const rest = (wkMatch[3] || "").replace(/(\d)\s+-\s+(\d)/g, "$1-$2");

    const is_roll_off = /roll-off/i.test(rest);
    const is_position_round = !is_roll_off && (/position\s*round/i.test(rest) || rest.trim() === "{");

    let starting_lane = null;
    const laneMatch = rest.match(/Start Lane\s*-\s*(\d+)/i);
    if (laneMatch) starting_lane = parseInt(laneMatch[1], 10);

    // For a position round/roll-off week there are no fixed pairings —
    // lane_positions is assigned later, closer to the actual week.
    let lane_positions = null;
    if (!is_position_round && !is_roll_off) {
      const pairMatches = [...rest.matchAll(/(\d+)-\s*(\d+)/g)];
      lane_positions = pairMatches.map((m, i) => ({
        lanes: lanePairs[i] ?? null,
        team_a_number: parseInt(m[1], 10),
        team_b_number: parseInt(m[2], 10),
      }));
    }

    weeks.push({
      week_number,
      bowl_date_str,
      is_position_round,
      is_roll_off,
      starting_lane,
      lane_positions,
    });
  }

  return weeks;
}
