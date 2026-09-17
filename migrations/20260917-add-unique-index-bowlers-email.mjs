// Migration: Add unique index on bowlers.email
// Run date: 2026-09-17
// Status: ALREADY RUN — do not run again without checking first
//
// Code-review finding: six different call sites (lib/auth-helpers.js,
// app/api/member/bowler/[id]/route.js's getViewerContext,
// scheduling-requests, message-officers, admin/announcements POST,
// the League Dashboard) each resolve "the bowler for this login
// email" via `SELECT id FROM bowlers WHERE email = ${email}` and take
// rows[0] — with no DB-level uniqueness, a member editing their own
// card could set email to another real bowler's login email (only
// format-checked, never collision-checked) and have those lookups
// nondeterministically resolve to the wrong person, misattributing
// edit rights, contact-info visibility, and message/request
// authorship. A plain unique index (not a NOT NULL constraint —
// bowlers routinely have no email until linked) closes this the same
// way usbc_id already is unique. Confirmed no existing duplicate
// emails in production before running this (a duplicate would make
// the index creation fail).
//
// To run:
// node --use-system-ca --env-file=.env.local migrations/20260917-add-unique-index-bowlers-email.mjs

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_bowlers_email_unique ON bowlers (email)
`;

const indexes = await sql`
  SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'bowlers'
`;
console.log('bowlers indexes:', indexes);

console.log('Migration complete');
