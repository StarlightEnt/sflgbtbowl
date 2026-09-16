// Migration: Create bylaws_revisions
// Run date: 2026-09-15
// Status: ALREADY RUN — do not run again without checking first
//
// Season-scoped (like standing_sheets), never Team Captain- or
// league-wide-shared — each season's By-Laws upload gets its own row.
// Older uploads are archived, never deleted on upload (is_current
// flips to false); admin can still download/delete them from the
// Danger Zone. Revision labeling restarts at "A" each new season since
// this is scoped per season_id.
//
// To run:
// node --use-system-ca --env-file=.env.local migrations/20260915-create-bylaws-revisions.mjs

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS bylaws_revisions (
    id SERIAL PRIMARY KEY,
    season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    revision_label TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    uploaded_by TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_current BOOLEAN NOT NULL DEFAULT true,
    UNIQUE (season_id, revision_label)
  )
`;

// DB-enforced: only one current revision per season, ever.
await sql`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_bylaws_revisions_one_current
    ON bylaws_revisions (season_id)
    WHERE is_current
`;

const columns = await sql`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_name = 'bylaws_revisions'
  ORDER BY ordinal_position
`;
console.log('bylaws_revisions columns:', columns);

const indexes = await sql`
  SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'bylaws_revisions'
`;
console.log('bylaws_revisions indexes:', indexes);

console.log('Migration complete');
