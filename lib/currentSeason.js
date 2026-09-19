// PATH: lib/currentSeason.js
//
// "Current" season for a given league is just its most recently created
// one. Parameterized by leagueSlug — every call site must resolve which
// league it means and pass it explicitly (no silent default to one
// league), now that Weekly Standing Sheet, By-Laws, Schedule, and the
// member roster all route by /leagues/[slug] or /admin/.../[slug] same
// as Season Setup already does.

import { sql } from "./db.js";

export async function getCurrentSeason(leagueSlug) {
  const rows = await sql`
    SELECT s.*
    FROM seasons s
    JOIN leagues l ON l.id = s.league_id
    WHERE l.slug = ${leagueSlug}
    ORDER BY s.id DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}
