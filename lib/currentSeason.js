// PATH: lib/currentSeason.js
//
// The admin-only pages (Season Setup, Weekly Standing Sheet) are all
// scoped to one league, same as lib/pdf/saveSeasonSetup.js's hardcoded
// league name/slug — there's no league switcher in this admin area.
// "Current" season is just the most recently created one for it.

import { sql } from "./db.js";

const LEAGUE_SLUG = "lgbt-wednesday-community";

export async function getCurrentSeason() {
  const rows = await sql`
    SELECT s.*
    FROM seasons s
    JOIN leagues l ON l.id = s.league_id
    WHERE l.slug = ${LEAGUE_SLUG}
    ORDER BY s.id DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}
