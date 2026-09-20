// Migration: Drop the old free-text leagues.venue column
// Run date: 2026-09-20
// Status: ALREADY RUN — do not run again without checking first
//
// Follow-up to 20260920-create-venues.mjs. Once every reader/writer of
// leagues.venue has been replaced by leagues.venue_id + a join to venues
// (hub, league dashboard, League Setup), the old column is a second
// source of truth for the same fact and gets dropped.
//
// Production shares this database and, until the new code is deployed,
// still selects leagues.venue — running this earlier breaks the live
// site. The script also refuses to run if any league still has venue
// text with no venue_id (nothing would be lost by the drop).
//
// To run:
// node --use-system-ca --env-file=.env.local migrations/20260920-drop-leagues-venue-column.mjs

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

const unlinked = await sql`
  SELECT id, name, venue FROM leagues WHERE venue IS NOT NULL AND btrim(venue) <> '' AND venue_id IS NULL
`;
if (unlinked.length > 0) {
  throw new Error(`Refusing to drop leagues.venue — leagues with venue text but no venue_id: ${JSON.stringify(unlinked)}`);
}

await sql`ALTER TABLE leagues DROP COLUMN IF EXISTS venue`;

console.log('Done — leagues.venue dropped.');
