// Migration: Create announcement_leagues
// Run date: 2026-09-30
// Status: ALREADY RUN — do not run again without checking first
//
// announcements had no link to leagues, so every announcement showed on
// every league's dashboard. announcement_leagues is a plain join table:
// an announcement shows on a league's dashboard only if it's tagged for
// that league here ("both leagues" = tagged for every league). Both FKs
// cascade — deleting an announcement (hard delete) or a league removes
// its tag rows with it.
//
// Backfill: every existing announcement x every existing league, so live
// behavior is unchanged the moment this runs (each existing announcement
// keeps showing everywhere). ON CONFLICT DO NOTHING keeps it safe to
// re-run. A league added later does NOT inherit old announcements — only
// this one-time backfill tags across the board.
//
// Must run BEFORE the per-league announcements code is deployed — the
// League Dashboard's query joins this table.
//
// To run:
// node --use-system-ca --env-file=.env.local migrations/20260930-create-announcement-leagues.mjs

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS announcement_leagues (
    announcement_id INTEGER NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    league_id       INTEGER NOT NULL REFERENCES leagues(id)       ON DELETE CASCADE,
    PRIMARY KEY (announcement_id, league_id)
  )
`;

// Matches the public dashboard's lookup (announcements for one league);
// the primary key already covers lookups by announcement_id.
await sql`
  CREATE INDEX IF NOT EXISTS idx_announcement_leagues_league
    ON announcement_leagues (league_id)
`;

const backfilled = await sql`
  INSERT INTO announcement_leagues (announcement_id, league_id)
  SELECT a.id, l.id FROM announcements a CROSS JOIN leagues l
  ON CONFLICT DO NOTHING
  RETURNING announcement_id
`;
console.log(`Backfilled ${backfilled.length} announcement_leagues rows`);

const [counts] = await sql`
  SELECT
    (SELECT COUNT(*) FROM announcements)::int AS announcements,
    (SELECT COUNT(*) FROM leagues)::int AS leagues,
    (SELECT COUNT(*) FROM announcement_leagues)::int AS announcement_leagues
`;
console.log('counts:', counts);

const columns = await sql`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_name = 'announcement_leagues'
  ORDER BY ordinal_position
`;
console.log('announcement_leagues columns:', columns);

console.log('Migration complete');
