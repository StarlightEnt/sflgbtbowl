// PATH: lib/finance/ingest.js
//
// Takes one snapshot of the treasurer's "Web Summary" sheet and brings
// the DB up to date. The ONLY writer of finance_rows numbers and of the
// "finance" team flag. Called by the dev script today and by the sync
// endpoint later.
//
// Safe-fail: a snapshot that looks wrong (empty, malformed, or far
// smaller than what is already stored) is rejected BEFORE anything is
// written, so a bad read of the sheet can never wipe data or clear
// flags. Last good data stays in place.
//
// Snapshot shape:
// {
//   asOf: "2026-10-03", weeksCompleted: 4,
//   final2Deadline: "2026-10-08", final2Threshold: 15,
//   teams:   [{ teamNumber, teamName, positionsInArrears, basis }],
//   bowlers: [{ teamNumber, name, weeks, paid, owed,
//               final2Applies, final2Marked, inArrears }]
// }

import { sql } from "../db.js";
import { setTeamFlag, clearTeamFlag } from "../teamFlags.js";
import { bestMatch } from "./matchNames.js";

export class SnapshotError extends Error {}

function num(v, field) {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new SnapshotError(`Bad number for ${field}: ${v}`);
  return n;
}

function validate(snapshot) {
  if (!snapshot || typeof snapshot !== "object") throw new SnapshotError("Snapshot is not an object");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(snapshot.asOf ?? "")) throw new SnapshotError("asOf must be YYYY-MM-DD");
  if (!Array.isArray(snapshot.bowlers) || snapshot.bowlers.length === 0) {
    throw new SnapshotError("Snapshot has no bowlers");
  }
  if (!Array.isArray(snapshot.teams)) throw new SnapshotError("Snapshot has no teams array");
  return snapshot.bowlers.map((b, i) => {
    const name = String(b.name ?? "").trim();
    if (!name) throw new SnapshotError(`Bowler ${i} has no name`);
    return {
      teamNumber: num(b.teamNumber, `bowlers[${i}].teamNumber`),
      name,
      weeks: num(b.weeks, `bowlers[${i}].weeks`),
      paid: num(b.paid, `bowlers[${i}].paid`),
      owed: num(b.owed, `bowlers[${i}].owed`),
      final2Applies: Boolean(b.final2Applies),
      final2Marked: num(b.final2Marked ?? 0, `bowlers[${i}].final2Marked`),
      inArrears: Boolean(b.inArrears),
    };
  });
}

export async function ingestFinanceSnapshot(seasonId, snapshot) {
  const bowlers = validate(snapshot);

  // Reject a snapshot that is suspiciously small compared with what we hold.
  const [{ n: existing }] = await sql`
    SELECT COUNT(*)::int AS n FROM finance_rows WHERE season_id = ${seasonId}
  `;
  if (existing >= 10 && bowlers.length < existing * 0.5) {
    throw new SnapshotError(
      `Snapshot has ${bowlers.length} bowlers but ${existing} are stored; refusing to overwrite`,
    );
  }

  const teamRows = await sql`
    SELECT id, team_number, team_name FROM teams WHERE season_id = ${seasonId} AND NOT is_bye
  `;
  const teamIdByName = new Map(teamRows.map((t) => [(t.team_name ?? "").trim().toLowerCase(), t.id]));
  const teamIdByNumber = new Map(teamRows.map((t) => [t.team_number, t.id]));
  const sheetTeamName = new Map(snapshot.teams.map((t) => [Number(t.teamNumber), t.teamName]));
  const resolveTeamId = (teamNumber) =>
    teamIdByName.get((sheetTeamName.get(teamNumber) ?? "").trim().toLowerCase()) ??
    teamIdByNumber.get(teamNumber) ??
    null;

  // 1. Upsert numbers. bowler_id / link_status are deliberately NOT in
  //    the update list: an existing link is never changed by the sync.
  const seen = [];
  for (const b of bowlers) {
    await sql`
      INSERT INTO finance_rows
        (season_id, team_number, team_name, sheet_name, weeks, paid, owed,
         final2_applies, final2_marked, in_arrears, updated_at)
      VALUES
        (${seasonId}, ${b.teamNumber}, ${sheetTeamName.get(b.teamNumber) ?? null}, ${b.name},
         ${b.weeks}, ${b.paid}, ${b.owed}, ${b.final2Applies}, ${b.final2Marked}, ${b.inArrears}, now())
      ON CONFLICT (season_id, team_number, sheet_name) DO UPDATE SET
        team_name = EXCLUDED.team_name,
        weeks = EXCLUDED.weeks,
        paid = EXCLUDED.paid,
        owed = EXCLUDED.owed,
        final2_applies = EXCLUDED.final2_applies,
        final2_marked = EXCLUDED.final2_marked,
        in_arrears = EXCLUDED.in_arrears,
        updated_at = now()
    `;
    seen.push(`${b.teamNumber}|${b.name}`);
  }

  // Rows no longer on the sheet are removed (the snapshot passed the
  // size check above, so this is a real roster change, not a bad read).
  const stored = await sql`
    SELECT id, team_number, sheet_name FROM finance_rows WHERE season_id = ${seasonId}
  `;
  const seenSet = new Set(seen);
  const staleIds = stored.filter((r) => !seenSet.has(`${r.team_number}|${r.sheet_name}`)).map((r) => r.id);
  if (staleIds.length > 0) {
    await sql`DELETE FROM finance_rows WHERE id = ANY(${staleIds})`;
  }

  // 2. Link unlinked rows by fuzzy name, once. Confident unambiguous
  //    matches become 'auto' (shown, but flagged for an officer to
  //    confirm); everything else stays 'unmatched' and shows nothing.
  const candidates = await sql`
    SELECT b.id, b.first_name AS "firstName", b.last_name AS "lastName", b.nickname, lm.team_id AS "teamId"
    FROM league_memberships lm
    JOIN bowlers b ON b.id = lm.bowler_id
    WHERE lm.season_id = ${seasonId}
  `;
  // A bowler already linked to some other sheet row can't be claimed twice.
  const linkedNow = await sql`
    SELECT bowler_id FROM finance_rows WHERE season_id = ${seasonId} AND bowler_id IS NOT NULL
  `;
  const taken = new Set(linkedNow.map((r) => r.bowler_id));

  const unlinked = await sql`
    SELECT id, team_number, sheet_name FROM finance_rows
    WHERE season_id = ${seasonId} AND bowler_id IS NULL AND link_status = 'unmatched'
  `;
  let autoLinked = 0;
  for (const row of unlinked) {
    const pool = candidates.filter((c) => !taken.has(c.id));
    const match = bestMatch(row.sheet_name, pool, resolveTeamId(row.team_number));
    if (match) {
      taken.add(match.bowlerId);
      autoLinked += 1;
      await sql`
        UPDATE finance_rows
        SET bowler_id = ${match.bowlerId}, link_status = 'auto', linked_at = now()
        WHERE id = ${row.id}
      `;
    }
  }

  // 3. Finance team flag: on for any team whose positions are in
  //    arrears, off otherwise. Only the 'finance' source is touched.
  let flagged = 0;
  for (const t of snapshot.teams) {
    const teamId = resolveTeamId(Number(t.teamNumber));
    if (!teamId) continue;
    const inArrears = Number(t.positionsInArrears) > 0;
    if (inArrears) {
      const names = bowlers
        .filter((b) => b.teamNumber === Number(t.teamNumber) && b.inArrears)
        .map((b) => b.name);
      const reason =
        `Finance: ${t.positionsInArrears} position(s) unpaid for the last two weeks` +
        ` (${t.basis === "exact" ? "exact" : "estimate, needs review"}).` +
        (names.length ? ` Suggested: ${names.join(", ")}.` : "");
      await setTeamFlag({ teamId, source: "finance", reason, setByEmail: "finance-sync" });
      flagged += 1;
    } else {
      await clearTeamFlag({ teamId, source: "finance" });
    }
  }

  // 4. Record when this data is "as of".
  await sql`
    INSERT INTO finance_meta (season_id, as_of, synced_at, final2_deadline, final2_threshold, weeks_completed)
    VALUES (${seasonId}, ${snapshot.asOf}, now(), ${snapshot.final2Deadline ?? null},
            ${snapshot.final2Threshold ?? null}, ${snapshot.weeksCompleted ?? null})
    ON CONFLICT (season_id) DO UPDATE SET
      as_of = EXCLUDED.as_of, synced_at = now(),
      final2_deadline = EXCLUDED.final2_deadline,
      final2_threshold = EXCLUDED.final2_threshold,
      weeks_completed = EXCLUDED.weeks_completed
  `;

  const [{ unmatched }] = await sql`
    SELECT COUNT(*)::int AS unmatched FROM finance_rows
    WHERE season_id = ${seasonId} AND bowler_id IS NULL
  `;
  return { rows: bowlers.length, removed: staleIds.length, autoLinked, unmatched, teamsFlagged: flagged };
}
