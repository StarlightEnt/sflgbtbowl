// Migration: Create officers and announcements
// Run date: 2026-09-17
// Status: ALREADY RUN — do not run again without checking first
//
// officers: a new role tier between isMember and isAdmin, granted via
// this table (not a separate email allowlist like admin_emails) —
// keyed on bowler_id so officer status always ties back to a real
// bowler identity, never a bare email. bowler_id is UNIQUE: a bowler
// is either an officer or not, no duplicate rows.
//
// announcements: brand-new feature, no revision history/soft-delete
// needed (unlike bylaws_revisions) — a real hard DELETE is fine here,
// this isn't a legal document trail. posted_by_bowler_id is nullable
// (an admin who isn't also a bowler can still post); posted_by_email
// is always populated and is the real audit trail if a display name
// is ever needed later.
//
// To run:
// node --use-system-ca --env-file=.env.local migrations/20260917-create-officers-and-announcements.mjs

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS officers (
    id SERIAL PRIMARY KEY,
    bowler_id INTEGER NOT NULL UNIQUE REFERENCES bowlers(id),
    added_by TEXT NOT NULL,
    added_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL CHECK (char_length(title) <= 120),
    body TEXT NOT NULL,
    posted_by_bowler_id INTEGER REFERENCES bowlers(id),
    posted_by_email TEXT NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

// Matches the public dashboard's real sort shape (pinned first, then
// newest) — same "index matches the query" instinct used for
// tournaments' partial index.
await sql`
  CREATE INDEX IF NOT EXISTS idx_announcements_listing
    ON announcements (is_pinned DESC, created_at DESC)
`;

const officersColumns = await sql`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_name = 'officers'
  ORDER BY ordinal_position
`;
console.log('officers columns:', officersColumns);

const announcementsColumns = await sql`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_name = 'announcements'
  ORDER BY ordinal_position
`;
console.log('announcements columns:', announcementsColumns);

console.log('Migration complete');
