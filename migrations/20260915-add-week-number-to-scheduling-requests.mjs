// Migration: Add week_number to scheduling_requests
// Run date: 2026-09-15
// Status: ALREADY RUN — do not run again without checking first
//
// A pre-bowl/makeup request is *for* a specific week's game (the one the
// captain's team can't make it to) — separate from target_date, which is
// when they'll actually bowl it. scheduling_requests had no way to record
// which week, so the request was ambiguous. Table had 0 rows at migration
// time, so week_number can be added NOT NULL with no backfill/default.
//
// To run:
// node --use-system-ca --env-file=.env.local migrations/20260915-add-week-number-to-scheduling-requests.mjs

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

await sql`
  ALTER TABLE scheduling_requests
  ADD COLUMN IF NOT EXISTS week_number INTEGER NOT NULL
`;

const columns = await sql`
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'scheduling_requests'
  ORDER BY ordinal_position
`;
console.log('scheduling_requests columns:', columns);

console.log('Migration complete');
