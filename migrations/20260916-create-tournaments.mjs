// Migration: Create tournaments
// Run date: 2026-09-16
// Status: ALREADY RUN — do not run again without checking first
//
// Single denormalized table, standalone — no FK to leagues/seasons.
// Public directory (/tournaments) shows only is_active rows with
// end_date >= today; the admin list (/admin/tournaments) sees
// everything, including past/inactive entries. No revision history
// here (unlike bylaws_revisions/standing_sheets) — this is a plain
// save-on-submit CRUD form, confirmed out of scope by the task.
//
// To run:
// node --use-system-ca --env-file=.env.local migrations/20260916-create-tournaments.mjs

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS tournaments (
    id SERIAL PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    cost_display TEXT,
    category TEXT,
    venue_name TEXT,
    venue_address TEXT,
    venue_phone TEXT,
    venue_website TEXT,
    organizers JSONB NOT NULL DEFAULT '[]',
    website_url TEXT,
    body TEXT,
    image_url TEXT,
    image_blob_pathname TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

// Public directory query filters on (is_active, end_date) together —
// same "let the index match the real query shape" instinct as the
// rest of this schema.
await sql`
  CREATE INDEX IF NOT EXISTS idx_tournaments_public_listing
    ON tournaments (end_date)
    WHERE is_active
`;

const columns = await sql`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_name = 'tournaments'
  ORDER BY ordinal_position
`;
console.log('tournaments columns:', columns);

const indexes = await sql`
  SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'tournaments'
`;
console.log('tournaments indexes:', indexes);

console.log('Migration complete');
