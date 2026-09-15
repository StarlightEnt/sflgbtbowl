// PATH: lib/pdf/matchWeeklyBowlers.js
//
// Diffs a newly-parsed week's roster (teams + subs) against the
// bowlers already on file for this season, per the matching rules in
// Task.md's "Bowler matching against existing data":
//
//   - name matches exactly (first + last) -> same person, no confirmation
//   - name matches exactly, but placement (team, or substitute) changed
//     -> "roster change", needs an accept/keep decision
//   - name doesn't reasonably match anyone -> new bowler, straightforward
//     insert
//   - name is close-but-not-identical to exactly one existing bowler ->
//     "possible match", needs a yes/no decision
//
// Pure function, no I/O — the caller (the parse route) supplies the
// season's existing memberships and team_number->team_id map, and gets
// back four buckets the client resolves into a final publish payload.
// existingMemberships: [{ bowlerId, teamId, first_name, last_name }]
// teamIdByNumber: Map<team_number, team_id>

import { namesAreClose } from "./nameMatch.js";

function sameName(a, b) {
  return (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
}

export function matchWeeklyBowlers({ parsedTeams, parsedSubs, existingMemberships, teamIdByNumber }) {
  const thisWeekEntries = [];

  for (const team of parsedTeams) {
    const teamId = teamIdByNumber.get(team.team_number) ?? null;
    for (const b of team.bowlers) {
      if (b.first_name === "VACANT") continue;
      thisWeekEntries.push({ ...b, teamId });
    }
  }
  for (const b of parsedSubs) {
    thisWeekEntries.push({ ...b, teamId: null });
  }

  const usedExisting = new Set();
  const matchedNoChange = [];
  const rosterChanges = [];
  const possibleMatches = [];
  const newBowlers = [];
  let tempId = 0;

  for (const entry of thisWeekEntries) {
    let exactMatch = null;
    let fuzzyMatch = null;

    for (const existing of existingMemberships) {
      if (usedExisting.has(existing.bowlerId)) continue;

      const lastExact = sameName(entry.last_name, existing.last_name);
      const firstExact = sameName(entry.first_name, existing.first_name);
      if (lastExact && firstExact) {
        exactMatch = existing;
        break;
      }
      if (!fuzzyMatch) {
        const lastClose = lastExact || namesAreClose(entry.last_name, existing.last_name);
        const firstClose = firstExact || namesAreClose(entry.first_name, existing.first_name);
        if (lastClose && firstClose) fuzzyMatch = existing;
      }
    }

    if (exactMatch) {
      usedExisting.add(exactMatch.bowlerId);
      const placementChanged = exactMatch.teamId !== entry.teamId;
      if (placementChanged) {
        rosterChanges.push({
          bowlerId: exactMatch.bowlerId,
          firstName: exactMatch.first_name,
          lastName: exactMatch.last_name,
          fromTeamId: exactMatch.teamId,
          toTeamId: entry.teamId,
          realAverage: entry.real_average,
          isCaptain: entry.is_captain,
        });
      } else {
        matchedNoChange.push({
          bowlerId: exactMatch.bowlerId,
          teamId: exactMatch.teamId,
          realAverage: entry.real_average,
          isCaptain: entry.is_captain,
        });
      }
      continue;
    }

    if (fuzzyMatch) {
      usedExisting.add(fuzzyMatch.bowlerId);
      possibleMatches.push({
        tempId: `pm-${tempId++}`,
        firstName: entry.first_name,
        lastName: entry.last_name,
        teamId: entry.teamId,
        realAverage: entry.real_average,
        isCaptain: entry.is_captain,
        existingBowlerId: fuzzyMatch.bowlerId,
        existingFirstName: fuzzyMatch.first_name,
        existingLastName: fuzzyMatch.last_name,
      });
      continue;
    }

    newBowlers.push({
      tempId: `nb-${tempId++}`,
      firstName: entry.first_name,
      lastName: entry.last_name,
      teamId: entry.teamId,
      realAverage: entry.real_average,
      isCaptain: entry.is_captain,
    });
  }

  return { matchedNoChange, rosterChanges, possibleMatches, newBowlers };
}
