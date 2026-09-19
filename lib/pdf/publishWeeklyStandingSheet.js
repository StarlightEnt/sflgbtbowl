// PATH: lib/pdf/publishWeeklyStandingSheet.js
//
// Commits a reviewed weekly upload: the PDF to Blob, a new
// standing_sheets/team_standings/weekly_results snapshot, and the
// admin's resolved bowler decisions (real_average/is_captain updates
// for matched bowlers, inserts for new ones). Pulled out of the route
// the same way lib/pdf/saveSeasonSetup.js is — the route owns the
// isAdmin check, this just does the write.
//
// The route trusts the client-submitted parsed numbers rather than
// re-parsing the PDF here, same precedent as Season Setup's /save
// route trusting its already-parsed payload — the admin visually
// reviewed the scoreboard preview before publishing.

import { Pool } from "@neondatabase/serverless";
import { put, del } from "@vercel/blob";

export class ValidationError extends Error {}
export class ConflictError extends Error {}
export class InconsistentDataError extends Error {}

export async function publishWeeklyStandingSheet({
  seasonId,
  weekNumber,
  fileBuffer,
  fileName,
  uploadedBy,
  teamStandings,
  weeklyResults,
  matchedBowlers,
  newBowlers,
  // See Parser-Redesign-Standing-Sheets.md §6. Gay Games' PDF format
  // has no captain marker anywhere in the document, so its parsed
  // is_captain is always false — applying it unconditionally on every
  // weekly publish would silently erase an admin's manually-set GG
  // captains. When false, the matchedBowlers UPDATE below leaves
  // is_captain untouched instead of overwriting it.
  capturesCaptainData = false,
}) {
  if (!Number.isInteger(weekNumber) || weekNumber < 1) {
    throw new ValidationError("A valid week number is required");
  }
  if (!Array.isArray(teamStandings) || teamStandings.length === 0) {
    throw new ValidationError("No team standings to publish");
  }

  const blob = await put(`standing-sheets/wk${weekNumber}-${fileName}`, fileBuffer, {
    access: "public",
    addRandomSuffix: true,
    contentType: "application/pdf",
  });

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let sheetId;
    try {
      const sheetRes = await client.query(
        `INSERT INTO standing_sheets (season_id, week_number, file_url, uploaded_by)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [seasonId, weekNumber, blob.url, uploadedBy]
      );
      sheetId = sheetRes.rows[0].id;
    } catch (err) {
      if (err.code === "23505") {
        throw new ConflictError(
          `Week ${weekNumber} already has an uploaded standing sheet — delete it first via the Danger Zone before re-publishing.`
        );
      }
      throw err;
    }

    for (const row of teamStandings) {
      await client.query(
        `INSERT INTO team_standings
           (standing_sheet_id, season_id, week_number, team_id, points_won, points_lost, pct_won)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [sheetId, seasonId, weekNumber, row.teamId, row.pointsWon, row.pointsLost, row.pctWon]
      );
      await client.query(
        `UPDATE teams SET team_name = $1 WHERE id = $2`,
        [row.teamName, row.teamId]
      );
    }

    for (const row of weeklyResults) {
      await client.query(
        `INSERT INTO weekly_results
           (standing_sheet_id, season_id, week_number, lane_pair, team_a_id, team_a_points, team_b_id, team_b_points)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [sheetId, seasonId, weekNumber, row.lanePair, row.teamAId, row.teamAPoints, row.teamBId, row.teamBPoints]
      );
    }

    for (const row of matchedBowlers) {
      // Only include is_captain in the SET clause when this format's
      // parse actually captures captain data — otherwise this UPDATE
      // would reset every GG captain to false on every weekly publish,
      // since captains there are only ever set manually by an admin.
      const updateRes = capturesCaptainData
        ? await client.query(
            `UPDATE league_memberships
             SET team_id = $1, real_average = $2, is_captain = $3, is_substitute = $4
             WHERE bowler_id = $5 AND season_id = $6`,
            [row.teamId, row.realAverage, row.isCaptain, row.teamId === null, row.bowlerId, seasonId]
          )
        : await client.query(
            `UPDATE league_memberships
             SET team_id = $1, real_average = $2, is_substitute = $3
             WHERE bowler_id = $4 AND season_id = $5`,
            [row.teamId, row.realAverage, row.teamId === null, row.bowlerId, seasonId]
          );
      // A "matched" bowler with no existing membership row would
      // otherwise update zero rows and the publish would still report
      // success, silently dropping that bowler's week — surface it
      // instead of letting it pass quietly.
      if (updateRes.rowCount === 0) {
        throw new InconsistentDataError(
          `Bowler ${row.bowlerId} was matched to an existing roster spot, but has no league_membership row for this season — re-run Season Setup or check the roster before publishing.`
        );
      }
    }

    for (const row of newBowlers) {
      const bowlerRes = await client.query(
        `INSERT INTO bowlers (first_name, last_name) VALUES ($1, $2) RETURNING id`,
        [row.firstName, row.lastName]
      );
      await client.query(
        `INSERT INTO league_memberships
           (bowler_id, season_id, team_id, real_average, is_captain, is_substitute)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [bowlerRes.rows[0].id, seasonId, row.teamId, row.realAverage, row.isCaptain, row.teamId === null]
      );
    }

    await client.query("COMMIT");
    return { standingSheetId: sheetId, fileUrl: blob.url };
  } catch (err) {
    await client.query("ROLLBACK");
    await del(blob.url).catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}
