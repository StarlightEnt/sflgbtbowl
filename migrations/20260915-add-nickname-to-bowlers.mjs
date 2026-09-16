// Migration: Add nickname to bowlers
// Run date: 2026-09-15
// Status: ALREADY RUN — do not run again without checking first
//
// Person-level field, same group as name/email/phone/USBC ID — not
// per-league, so it lives on bowlers, not league_memberships. Follow-up
// (not part of this migration/task): teach the Weekly Standing Sheet
// matcher to also check nickname, to catch substitution-style nickname
// mismatches ("Bob"/"Robert") that edit-distance alone can't.
//
// To run:
// node --use-system-ca --env-file=.env.local migrations/20260915-add-nickname-to-bowlers.mjs

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

await sql`
  ALTER TABLE bowlers
  ADD COLUMN IF NOT EXISTS nickname TEXT
`;

const columns = await sql`
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'bowlers'
  ORDER BY ordinal_position
`;
console.log('bowlers columns:', columns);

console.log('Migration complete');
