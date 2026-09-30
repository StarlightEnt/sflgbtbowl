// PATH: lib/announcements/saveAnnouncement.js
//
// Create/update an announcement together with its league tags
// (announcement_leagues) in one transaction, shared by the POST and PUT
// admin routes. Title/body validation stays in the routes; league
// validation lives here so both routes reject the same inputs the same
// way — zero leagues is rejected server-side, not just by the form.

import { Pool } from "@neondatabase/serverless";

export class ValidationError extends Error {}
export class NotFoundError extends Error {}

function normalizeLeagueIds(leagueIds) {
  if (!Array.isArray(leagueIds) || leagueIds.length === 0) {
    throw new ValidationError("Select at least one league");
  }
  if (!leagueIds.every((id) => Number.isInteger(id))) {
    throw new ValidationError("Invalid league id");
  }
  return [...new Set(leagueIds)];
}

// Runs inside the caller's transaction so the existence check and the
// inserts see the same leagues.
async function replaceLeagueTags(client, announcementId, leagueIds) {
  const { rows } = await client.query(`SELECT id FROM leagues WHERE id = ANY($1::int[])`, [leagueIds]);
  if (rows.length !== leagueIds.length) {
    throw new ValidationError("Unknown league");
  }

  await client.query(`DELETE FROM announcement_leagues WHERE announcement_id = $1`, [announcementId]);
  await client.query(
    `INSERT INTO announcement_leagues (announcement_id, league_id)
     SELECT $1, unnest($2::int[])`,
    [announcementId, leagueIds]
  );
}

export async function createAnnouncement({ title, body, posterBowlerId, postedByEmail, leagueIds }) {
  const ids = normalizeLeagueIds(leagueIds);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const insertRes = await client.query(
      `INSERT INTO announcements (title, body, posted_by_bowler_id, posted_by_email)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [title, body, posterBowlerId, postedByEmail]
    );
    const id = insertRes.rows[0].id;

    await replaceLeagueTags(client, id, ids);

    await client.query("COMMIT");
    return id;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

export async function updateAnnouncement({ id, title, body, leagueIds }) {
  const ids = normalizeLeagueIds(leagueIds);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const updateRes = await client.query(
      `UPDATE announcements
       SET title = $1, body = $2, updated_at = now()
       WHERE id = $3
       RETURNING id`,
      [title, body, id]
    );
    if (updateRes.rowCount === 0) {
      throw new NotFoundError("Announcement not found");
    }

    await replaceLeagueTags(client, id, ids);

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}
