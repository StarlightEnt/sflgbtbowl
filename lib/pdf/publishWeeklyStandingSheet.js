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
      await client.query(
        `UPDATE league_memberships
         SET team_id = $1, real_average = $2, is_captain = $3, is_substitute = $4
         WHERE bowler_id = $5 AND season_id = $6`,
        [row.teamId, row.realAverage, row.isCaptain, row.teamId === null, row.bowlerId, seasonId]
      );
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
