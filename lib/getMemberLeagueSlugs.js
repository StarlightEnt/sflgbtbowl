// PATH: lib/getMemberLeagueSlugs.js
//
// Which leagues' *current* season this bowler is a member of — used
// only to pick the Member nav pill's smart href (one league -> go
// straight to that league's roster; two+ -> send them to /leagues to
// choose). "Current season" here matches getCurrentSeason()'s own
// definition (most recently created season per league), so this stays
// consistent with what /leagues/[slug]/roster itself will show.

import { sql } from "./db.js";

export async function getMemberLeagueSlugs(email) {
  if (!email) return [];
  const rows = await sql`
    SELECT DISTINCT l.slug
    FROM league_memberships lm
    JOIN seasons s ON s.id = lm.season_id
    JOIN leagues l ON l.id = s.league_id
    JOIN bowlers b ON b.id = lm.bowler_id
    WHERE b.email = ${email}
      AND s.id = (SELECT MAX(s2.id) FROM seasons s2 WHERE s2.league_id = l.id)
  `;
  return rows.map((r) => r.slug);
}
