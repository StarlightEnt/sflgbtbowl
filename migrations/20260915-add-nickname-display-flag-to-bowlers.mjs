// Migration: Add nickname_use_in_display flag to bowlers
// Run date: 2026-09-15
// Status: ALREADY RUN — do not run again without checking first
//
// Lets a bowler opt in to showing "Nickname Lastname" instead of
// "Firstname Lastname" wherever the site displays their full name
// (Member Roster, the bowler card). Defaults to false so nothing
// changes in the UI until someone explicitly checks the box. See
// lib/displayName.js for where this gets applied.
//
// To run:
// node --use-system-ca --env-file=.env.local migrations/20260915-add-nickname-display-flag-to-bowlers.mjs

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

await sql`
  ALTER TABLE bowlers
  ADD COLUMN IF NOT EXISTS nickname_use_in_display BOOLEAN NOT NULL DEFAULT false
`;

const columns = await sql`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_name = 'bowlers'
  ORDER BY ordinal_position
`;
console.log('bowlers columns:', columns);

console.log('Migration complete');
