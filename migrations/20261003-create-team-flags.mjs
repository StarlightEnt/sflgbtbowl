// Migration: Create team_flags
// Run date: (not yet run)
// Status: NOT YET RUN
//
// General "see an officer" flag per team. One row per (team, source) so
// the finance sync, an admin's manual flag, and future sources never
// overwrite each other: the finance sync can clear ITS flag without
// touching a manual one. `reason` is a private note for officers/admins
// only — public pages read just the existence of a flag, never the reason.
//
// ADDITIVE ONLY: creates one new table and one index. Touches no existing
// table, so it is safe to run while production (which shares this DB)
// keeps serving the old code. Production code does not know this table
// exists until the feature is deployed.
//
// To run:
// node --use-system-ca --env-file=.env.local migrations/20261003-create-team-flags.mjs

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS team_flags (
    id           SERIAL PRIMARY KEY,
    team_id      INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    source       TEXT NOT NULL,
    reason       TEXT,
    set_by_email TEXT,
    set_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (team_id, source)
  )
`;

const columns = await sql`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_name = 'team_flags'
  ORDER BY ordinal_position
`;
console.log('team_flags columns:', columns);

const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM team_flags`;
console.log('team_flags rows:', count);

console.log('Migration complete');
