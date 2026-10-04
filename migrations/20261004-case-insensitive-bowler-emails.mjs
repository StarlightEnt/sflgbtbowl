// Migration: Make bowlers.email case-insensitive
// Run date: not yet run
// Status: NOT YET RUN
//
// Code-review finding: bowler emails were stored exactly as typed and
// matched with `email = $1`, while admin_emails is lowercased on write.
// A bowler saved as "Jane@Gmail.com" could never match the lowercase
// address a sign-in produces, so they would not be recognized as a member.
// The unique index (idx_bowlers_email_unique) was also case-sensitive, so
// "a@x.com" and "A@x.com" counted as two different people.
//
// What this does, in order (each step is safe to re-run):
//   1. Pre-check: refuse to run, with no changes, if two bowlers would
//      collide once lowercased/trimmed.
//   2. Create the case-insensitive unique index on lower(email). This is a
//      second guard: it fails outright if a collision slipped past step 1.
//   3. Backfill: store every email trimmed and lowercased.
//   4. Drop the old case-sensitive index (redundant once 2 and 3 are done).
//
// The application code (lookups use lower(email) = lower($1); writes
// lowercase) works both before and after this migration, so the order of
// deploy vs. run does not matter. Production shares this database, so
// running it from the dev machine is the production run.
//
// To run:
// node --use-system-ca --env-file=.env.local migrations/20261004-case-insensitive-bowler-emails.mjs

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

const dupes = await sql`
  SELECT lower(btrim(email)) AS email, COUNT(*)::int AS n
  FROM bowlers
  WHERE email IS NOT NULL
  GROUP BY lower(btrim(email))
  HAVING COUNT(*) > 1
`;
if (dupes.length > 0) {
  console.error('Emails that would collide once lowercased (aborting with no changes):', dupes);
  process.exit(1);
}

await sql`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_bowlers_email_lower_unique ON bowlers (lower(email))
`;

const updated = await sql`
  UPDATE bowlers
  SET email = lower(btrim(email))
  WHERE email IS NOT NULL AND email <> lower(btrim(email))
  RETURNING id
`;
console.log(`Normalized ${updated.length} bowler email(s)`);

await sql`DROP INDEX IF EXISTS idx_bowlers_email_unique`;

const indexes = await sql`
  SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'bowlers'
`;
console.log('bowlers indexes:', indexes);

console.log('Migration complete');
