// PATH: lib/pdf/deleteWeeklyStandingSheet.js
//
// Danger Zone delete: removes a week's standing_sheets/team_standings/
// weekly_results rows and the stored PDF. Deliberately does not touch
// real_average on league_memberships — there's no stored history to
// revert to (see Task.md point 4); the expected recovery path is
// delete, then re-upload a corrected sheet.

import { Pool } from "@neondatabase/serverless";
import { del } from "@vercel/blob";

export class NotFoundError extends Error {}

export async function deleteWeeklyStandingSheet({ seasonId, weekNumber }) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  let fileUrl;

  try {
    await client.query("BEGIN");

    const sheetRes = await client.query(
      `SELECT id, file_url FROM standing_sheets WHERE season_id = $1 AND week_number = $2`,
      [seasonId, weekNumber]
    );
    if (sheetRes.rows.length === 0) {
      throw new NotFoundError(`No standing sheet found for week ${weekNumber}`);
    }
    const sheetId = sheetRes.rows[0].id;
    fileUrl = sheetRes.rows[0].file_url;

    await client.query(`DELETE FROM weekly_results WHERE standing_sheet_id = $1`, [sheetId]);
    await client.query(`DELETE FROM team_standings WHERE standing_sheet_id = $1`, [sheetId]);
    await client.query(`DELETE FROM standing_sheets WHERE id = $1`, [sheetId]);

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }

  // Best-effort — the DB state is already consistent and final at this
  // point, an orphaned blob isn't worth failing the whole delete over.
  await del(fileUrl).catch((err) => {
    console.error("Failed to delete blob after standing sheet delete:", err);
  });
}
