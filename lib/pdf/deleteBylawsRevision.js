// PATH: lib/pdf/deleteBylawsRevision.js
//
// Danger Zone delete: removes one archived By-Laws revision's row and
// stored PDF. The current revision can never be deleted this way — if
// a mistake needs undoing, publish a corrected revision instead (same
// "delete, then re-upload" recovery philosophy as the weekly standing
// sheet's Danger Zone).

import { Pool } from "@neondatabase/serverless";
import { del } from "@vercel/blob";

export class NotFoundError extends Error {}
export class ValidationError extends Error {}

export async function deleteBylawsRevision({ seasonId, revisionLabel }) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  let fileUrl;

  try {
    await client.query("BEGIN");

    const res = await client.query(
      `SELECT id, file_url, is_current FROM bylaws_revisions
       WHERE season_id = $1 AND revision_label = $2`,
      [seasonId, revisionLabel]
    );
    if (res.rows.length === 0) {
      throw new NotFoundError(`No revision ${revisionLabel} found for this season`);
    }
    if (res.rows[0].is_current) {
      throw new ValidationError(
        "The current revision can't be deleted — publish a corrected revision instead"
      );
    }

    fileUrl = res.rows[0].file_url;
    await client.query(`DELETE FROM bylaws_revisions WHERE id = $1`, [res.rows[0].id]);

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
    console.error("Failed to delete blob after bylaws revision delete:", err);
  });
}
