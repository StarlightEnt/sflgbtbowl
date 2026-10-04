// Migration: Create finance_rows and finance_meta
// Run date: (not yet run)
// Status: NOT YET RUN
//
// finance_rows: one row per bowler line on the treasurer's summary
// (season, team number, sheet name). The sync overwrites the numbers each
// run but never touches bowler_id / link_status, so a name link approved
// once stays fixed. bowler_id is NULL until the sheet name has been
// matched to a roster bowler; unmatched rows show nothing to anyone and
// appear on the officer/admin finance page for linking.
//
// finance_meta: one row per season — when the data is "as of", when it
// was last synced, and the Final-2 rules that came with it.
//
// ADDITIVE ONLY: two new tables, no change to any existing table, so it
// is safe to run while production (shared DB) keeps serving old code.
//
// To run:
// node --use-system-ca --env-file=.env.local migrations/20261003-create-finance-tables.mjs

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS finance_rows (
    id               SERIAL PRIMARY KEY,
    season_id        INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    team_number      INTEGER NOT NULL,
    team_name        TEXT,
    sheet_name       TEXT NOT NULL,
    weeks            INTEGER NOT NULL DEFAULT 0,
    paid             NUMERIC(10,2) NOT NULL DEFAULT 0,
    owed             NUMERIC(10,2) NOT NULL DEFAULT 0,
    final2_applies   BOOLEAN NOT NULL DEFAULT false,
    final2_marked    INTEGER NOT NULL DEFAULT 0,
    in_arrears       BOOLEAN NOT NULL DEFAULT false,
    bowler_id        INTEGER REFERENCES bowlers(id) ON DELETE SET NULL,
    link_status      TEXT NOT NULL DEFAULT 'unmatched',
    linked_by_email  TEXT,
    linked_at        TIMESTAMPTZ,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (season_id, team_number, sheet_name)
  )
`;

await sql`
  CREATE INDEX IF NOT EXISTS idx_finance_rows_bowler
    ON finance_rows (bowler_id, season_id)
`;

await sql`
  CREATE TABLE IF NOT EXISTS finance_meta (
    season_id         INTEGER PRIMARY KEY REFERENCES seasons(id) ON DELETE CASCADE,
    as_of             DATE,
    synced_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    final2_deadline   DATE,
    final2_threshold  INTEGER,
    weeks_completed   INTEGER
  )
`;

for (const t of ['finance_rows', 'finance_meta']) {
  const columns = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = ${t}
    ORDER BY ordinal_position
  `;
  console.log(`${t} columns:`, columns.map((c) => c.column_name).join(', '));
}

console.log('Migration complete');
