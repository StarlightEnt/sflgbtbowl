// PATH: lib/pdf/matchSeasonBowlers.js
//
// Diffs a freshly-parsed League Standings PDF's roster (teams + subs)
// against the ENTIRE bowler database — every season, every league —
// so a returning bowler keeps the same bowlers.id year after year
// instead of Season Setup creating a brand-new row for everyone every
// time it runs. Mirrors lib/pdf/matchWeeklyBowlers.js's shape
// (exact match / possible match / new bowler) and its underlying
// identity rule (see matchBowlerIdentity.js), but the search pool is
// global rather than scoped to one season's roster, and there's no
// "roster change" bucket — every entry here is simply being placed
// onto a team (or as a substitute) for a brand-new season, so there's
// no prior placement in this season to compare against.
//
// Pure function, no I/O — the caller supplies every bowler currently
// on file, and gets back three buckets the client resolves into a
// final save payload. team_number (not team_id) is used throughout
// since this season's teams don't exist in the database yet at parse
// time — they're created in the same transaction as the roster, in
// lib/pdf/saveSeasonSetup.js, which resolves team_number -> team_id
// once it has real rows to point at.
// existingBowlers: [{ id, first_name, last_name, nickname }]

import { classifyBowlerMatch } from "./matchBowlerIdentity.js";

export function matchSeasonBowlers({ parsedTeams, parsedSubs, existingBowlers }) {
  const entries = [];

  for (const team of parsedTeams) {
    for (const b of team.bowlers) {
      if (b.first_name === "VACANT") continue;
      entries.push({ ...b, teamNumber: team.team_number });
    }
  }
  for (const b of parsedSubs) {
    entries.push({ ...b, teamNumber: null });
  }

  const usedExisting = new Set();
  const matchedExact = [];
  const possibleMatches = [];
  const newBowlers = [];
  let tempId = 0;

  for (const entry of entries) {
    let exactMatch = null;
    let fuzzyMatch = null;

    for (const existing of existingBowlers) {
      if (usedExisting.has(existing.id)) continue;

      const verdict = classifyBowlerMatch(entry, existing);
      if (verdict === "exact") {
        exactMatch = existing;
        break;
      }
      if (verdict === "fuzzy" && !fuzzyMatch) {
        fuzzyMatch = existing;
      }
    }

    if (exactMatch) {
      usedExisting.add(exactMatch.id);
      matchedExact.push({
        bowlerId: exactMatch.id,
        teamNumber: entry.teamNumber,
        realAverage: entry.real_average,
        isCaptain: entry.is_captain,
      });
      continue;
    }

    if (fuzzyMatch) {
      usedExisting.add(fuzzyMatch.id);
      possibleMatches.push({
        tempId: `pm-${tempId++}`,
        firstName: entry.first_name,
        lastName: entry.last_name,
        teamNumber: entry.teamNumber,
        realAverage: entry.real_average,
        isCaptain: entry.is_captain,
        existingBowlerId: fuzzyMatch.id,
        existingFirstName: fuzzyMatch.first_name,
        existingLastName: fuzzyMatch.last_name,
        existingNickname: fuzzyMatch.nickname,
      });
      continue;
    }

    newBowlers.push({
      tempId: `nb-${tempId++}`,
      firstName: entry.first_name,
      lastName: entry.last_name,
      teamNumber: entry.teamNumber,
      realAverage: entry.real_average,
      isCaptain: entry.is_captain,
    });
  }

  return { matchedExact, possibleMatches, newBowlers };
}
