// Migration: Add bowl.com League Standing Sheet ID to leagues
// Run date: 2026-09-18
// Status: ALREADY RUN — do not run again without checking first
//
// Backs the League History card (Multi-League-Season-Architecture.md §2, §6):
// a permanent pointer to a league's official external record on
// lss.bowl.com, looked up by its League Standing Sheet ID — a real,
// permanent ID printed on that league's own official standing sheets.
// Confirmed against the real source PDFs: 1286 for LGBT Wednesday
// Community, 26 for Gay Games.
//
// Captured once at League Setup time going forward (§5 of the same doc);
// this migration only adds the column and backfills the one league that
// exists in the database today.
//
// To run:
// node --use-system-ca --env-file=.env.local migrations/20260918-add-bowl-com-lss-id-to-leagues.mjs

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

await sql`
  ALTER TABLE leagues ADD COLUMN IF NOT EXISTS bowl_com_lss_id INTEGER
`;

await sql`
  UPDATE leagues SET bowl_com_lss_id = 1286 WHERE slug = 'lgbt-wednesday-community'
`;

console.log('Done — bowl_com_lss_id column added, LGBT Wednesday Community backfilled to 1286.');
