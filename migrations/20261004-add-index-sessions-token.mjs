// Migration: Add unique index on sessions."sessionToken"
// Run date: not yet run
// Status: NOT YET RUN
//
// Code-review finding: the app uses database-backed Auth.js sessions, so
// every auth() call (root layout, pages, API routes) looks the session up
// with `WHERE "sessionToken" = $1`. The official Auth.js pg adapter schema
// (see 20260915-create-initial-schema.mjs) creates no index on that
// column, so each lookup is a sequential scan of a table that only grows
// (Auth.js never purges expired sessions). A session token is unique by
// construction, so a unique index is both correct and the cheapest fix.
//
// Safe to re-run (IF NOT EXISTS). Refuses to run — and changes nothing —
// if duplicate tokens somehow exist, since the unique index would fail.
//
// To run:
// node --use-system-ca --env-file=.env.local migrations/20261004-add-index-sessions-token.mjs

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

const dupes = await sql`
  SELECT "sessionToken", COUNT(*)::int AS n
  FROM sessions
  GROUP BY "sessionToken"
  HAVING COUNT(*) > 1
`;
if (dupes.length > 0) {
  console.error(`Found ${dupes.length} duplicated sessionToken value(s); aborting with no changes.`);
  process.exit(1);
}

await sql`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_session_token ON sessions ("sessionToken")
`;

const indexes = await sql`
  SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'sessions'
`;
console.log('sessions indexes:', indexes);

console.log('Migration complete');
