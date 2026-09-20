// Migration: Create venues and link leagues to them
// Run date: 2026-09-20
// Status: ALREADY RUN — do not run again without checking first
//
// Venues become a first-class, reusable record (public /venues page,
// popup detail, /admin/venues setup). This migration is ADDITIVE ONLY:
// it creates the venues table, adds leagues.venue_id, and backfills one
// venues row per distinct leagues.venue text value (name only — street,
// city, state, zip, phone, website, blurb and logo are filled in by hand
// afterward through /admin/venues).
//
// It deliberately does NOT drop leagues.venue. Production reads this same
// database, and the already-deployed code still selects leagues.venue —
// dropping it before the new code is live would break the hub, the league
// dashboard and League Setup. The drop is a separate migration,
// 20260920-drop-leagues-venue-column.mjs, to run only AFTER the venue
// changes are deployed.
//
// To run:
// node --use-system-ca --env-file=.env.local migrations/20260920-create-venues.mjs

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

function slugify(input) {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

await sql`
  CREATE TABLE IF NOT EXISTS venues (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    street      TEXT,
    city        TEXT,
    state       TEXT,
    zip         TEXT,
    phone       TEXT,
    website     TEXT,
    blurb       TEXT,
    logo_url    TEXT,
    is_visible  BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT blurb_length CHECK (char_length(blurb) <= 150)
  )
`;

await sql`ALTER TABLE leagues ADD COLUMN IF NOT EXISTS venue_id INTEGER REFERENCES venues(id)`;

const leagues = await sql`
  SELECT id, venue FROM leagues WHERE venue IS NOT NULL AND btrim(venue) <> '' ORDER BY id
`;

const venueIdByName = new Map();
for (const league of leagues) {
  const name = league.venue.trim();
  const key = name.toLowerCase();
  if (!venueIdByName.has(key)) {
    const existing = await sql`SELECT id FROM venues WHERE lower(name) = ${key}`;
    if (existing.length > 0) {
      venueIdByName.set(key, existing[0].id);
    } else {
      const root = slugify(name) || 'venue';
      let slug = root;
      for (let n = 2; (await sql`SELECT 1 FROM venues WHERE slug = ${slug}`).length > 0; n++) {
        slug = `${root}-${n}`;
      }
      const [row] = await sql`INSERT INTO venues (name, slug) VALUES (${name}, ${slug}) RETURNING id`;
      venueIdByName.set(key, row.id);
    }
  }
  await sql`UPDATE leagues SET venue_id = ${venueIdByName.get(key)} WHERE id = ${league.id}`;
}

const unlinked = await sql`
  SELECT id, venue FROM leagues WHERE venue IS NOT NULL AND btrim(venue) <> '' AND venue_id IS NULL
`;
if (unlinked.length > 0) {
  throw new Error(`Backfill incomplete — leagues without venue_id: ${JSON.stringify(unlinked)}`);
}

console.log(`Done — venues table created, ${venueIdByName.size} venue(s) backfilled, ${leagues.length} league(s) linked.`);
