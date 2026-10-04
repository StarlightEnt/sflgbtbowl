// PATH: lib/teamFlags.js
//
// The one place that reads or writes team_flags. Anything that wants to
// flag a team (the finance sync, an admin's manual button, future
// features) calls setTeamFlag / clearTeamFlag here. A flag is per
// (team, source), so one source clearing its flag never touches another's.
//
// Privacy: getFlaggedTeamIds returns ONLY team ids — safe for public
// pages. The private `reason` is returned only by getTeamFlagDetails,
// which must be called from officer/admin-gated code.

import { sql } from "./db.js";

export const FLAG_SOURCES = ["finance", "admin"];

function assertSource(source) {
  if (typeof source !== "string" || !/^[a-z][a-z0-9_-]{0,31}$/.test(source)) {
    throw new Error(`Invalid team flag source: ${source}`);
  }
}

export async function setTeamFlag({ teamId, source, reason = null, setByEmail = null }) {
  assertSource(source);
  await sql`
    INSERT INTO team_flags (team_id, source, reason, set_by_email)
    VALUES (${teamId}, ${source}, ${reason}, ${setByEmail})
    ON CONFLICT (team_id, source)
    DO UPDATE SET reason = EXCLUDED.reason,
                  set_by_email = EXCLUDED.set_by_email,
                  set_at = now()
  `;
}

export async function clearTeamFlag({ teamId, source }) {
  assertSource(source);
  await sql`DELETE FROM team_flags WHERE team_id = ${teamId} AND source = ${source}`;
}

// Public-safe: which teams in this season have any flag at all.
export async function getFlaggedTeamIds(seasonId) {
  const rows = await sql`
    SELECT DISTINCT tf.team_id
    FROM team_flags tf
    JOIN teams t ON t.id = tf.team_id
    WHERE t.season_id = ${seasonId}
  `;
  return new Set(rows.map((r) => r.team_id));
}

// Officer/admin only: every flag with its private reason.
export async function getTeamFlagDetails(seasonId) {
  return sql`
    SELECT tf.team_id, tf.source, tf.reason, tf.set_by_email, tf.set_at
    FROM team_flags tf
    JOIN teams t ON t.id = tf.team_id
    WHERE t.season_id = ${seasonId}
    ORDER BY tf.team_id, tf.source
  `;
}
