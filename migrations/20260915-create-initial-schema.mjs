// Migration: Create initial schema (league domain tables + NextAuth adapter tables)
// Run date: 2026-09-15
// Status: ALREADY RUN — do not run again without checking first
//
// To run on a fresh database:
// node --use-system-ca --env-file=.env.local migrations/20260915-create-initial-schema.mjs
//
// NextAuth tables (verification_token, accounts, sessions, users) match the
// official @auth/pg-adapter / @auth/neon-adapter schema exactly — see
// https://authjs.dev/reference/adapter/pg. Column casing on "userId",
// "providerAccountId", "sessionToken", and "emailVerified" must stay quoted;
// the adapter's queries reference them case-sensitively.

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// --- League domain tables ---

await sql`
  CREATE TABLE IF NOT EXISTS leagues (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    day_of_week TEXT,
    venue TEXT
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS seasons (
    id SERIAL PRIMARY KEY,
    league_id INTEGER NOT NULL REFERENCES leagues(id),
    name TEXT NOT NULL,
    start_date DATE
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    season_id INTEGER NOT NULL REFERENCES seasons(id),
    team_number INTEGER NOT NULL,
    team_name TEXT NOT NULL,
    abbreviation TEXT,
    is_bye BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (season_id, team_number)
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS bowlers (
    id SERIAL PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    usbc_id TEXT UNIQUE
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS league_memberships (
    id SERIAL PRIMARY KEY,
    bowler_id INTEGER NOT NULL REFERENCES bowlers(id),
    season_id INTEGER NOT NULL REFERENCES seasons(id),
    team_id INTEGER REFERENCES teams(id),
    real_average NUMERIC(5,1) NOT NULL DEFAULT 0,
    is_captain BOOLEAN NOT NULL DEFAULT false,
    is_substitute BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (bowler_id, season_id)
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS schedule (
    id SERIAL PRIMARY KEY,
    season_id INTEGER NOT NULL REFERENCES seasons(id),
    week_number INTEGER NOT NULL,
    week_date DATE NOT NULL,
    starting_lane INTEGER,
    is_position_round BOOLEAN NOT NULL DEFAULT false,
    is_roll_off BOOLEAN NOT NULL DEFAULT false,
    lane_positions JSONB,
    UNIQUE (season_id, week_number)
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS standing_sheets (
    id SERIAL PRIMARY KEY,
    season_id INTEGER NOT NULL REFERENCES seasons(id),
    week_number INTEGER NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes TEXT,
    UNIQUE (season_id, week_number)
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS team_standings (
    id SERIAL PRIMARY KEY,
    standing_sheet_id INTEGER NOT NULL REFERENCES standing_sheets(id),
    season_id INTEGER NOT NULL REFERENCES seasons(id),
    week_number INTEGER NOT NULL,
    team_id INTEGER NOT NULL REFERENCES teams(id),
    points_won NUMERIC(5,1) NOT NULL,
    points_lost NUMERIC(5,1) NOT NULL,
    pct_won NUMERIC(5,1) NOT NULL
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS weekly_results (
    id SERIAL PRIMARY KEY,
    standing_sheet_id INTEGER NOT NULL REFERENCES standing_sheets(id),
    season_id INTEGER NOT NULL REFERENCES seasons(id),
    week_number INTEGER NOT NULL,
    lane_pair TEXT NOT NULL,
    team_a_id INTEGER NOT NULL REFERENCES teams(id),
    team_a_points NUMERIC(5,1) NOT NULL,
    team_b_id INTEGER NOT NULL REFERENCES teams(id),
    team_b_points NUMERIC(5,1) NOT NULL
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS scheduling_requests (
    id SERIAL PRIMARY KEY,
    season_id INTEGER NOT NULL REFERENCES seasons(id),
    team_id INTEGER NOT NULL REFERENCES teams(id),
    captain_bowler_id INTEGER NOT NULL REFERENCES bowlers(id),
    request_type TEXT NOT NULL CHECK (request_type IN ('prebowl', 'makeup')),
    target_date DATE NOT NULL,
    reason TEXT CHECK (char_length(reason) <= 128),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS admin_emails (
    email TEXT PRIMARY KEY,
    added_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

// --- NextAuth / Auth.js adapter tables (official pg adapter schema) ---

await sql`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL,
    name VARCHAR(255),
    email VARCHAR(255),
    "emailVerified" TIMESTAMPTZ,
    image TEXT,
    PRIMARY KEY (id)
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL,
    "userId" INTEGER NOT NULL,
    type VARCHAR(255) NOT NULL,
    provider VARCHAR(255) NOT NULL,
    "providerAccountId" VARCHAR(255) NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at BIGINT,
    id_token TEXT,
    scope TEXT,
    session_state TEXT,
    token_type TEXT,
    PRIMARY KEY (id)
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL,
    "userId" INTEGER NOT NULL,
    expires TIMESTAMPTZ NOT NULL,
    "sessionToken" VARCHAR(255) NOT NULL,
    PRIMARY KEY (id)
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS verification_token (
    identifier TEXT NOT NULL,
    expires TIMESTAMPTZ NOT NULL,
    token TEXT NOT NULL,
    PRIMARY KEY (identifier, token)
  )
`;

// --- Seed data ---

await sql`
  INSERT INTO admin_emails (email)
  VALUES ('allisushi@gmail.com')
  ON CONFLICT (email) DO NOTHING
`;

// --- Verify ---

const tables = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name
`;
console.log('Tables now in schema:', tables.map((t) => t.table_name));

const adminEmails = await sql`SELECT * FROM admin_emails`;
console.log('admin_emails:', adminEmails);

console.log('Migration complete');
