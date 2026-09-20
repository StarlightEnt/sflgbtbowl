// Migration: Raise venues.blurb limit from 150 to 250 characters
// Run date: 2026-09-20
// Status: ALREADY RUN — do not run again without checking first
//
// Follow-up to 20260920-create-venues.mjs, which created the blurb_length
// CHECK at 150. Alters the constraint in place instead of editing that
// original migration. The app-side limit (lib/venues/validateVenueInput.js
// and components/Admin/VenueForm.js) moves to 250 in the same change.
//
// Widening a CHECK never invalidates existing rows, so this is safe to run
// against the shared dev/production database before the code is deployed.
//
// To run:
// node --use-system-ca --env-file=.env.local migrations/20260920-raise-venues-blurb-limit.mjs

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

await sql`
  ALTER TABLE venues
    DROP CONSTRAINT blurb_length,
    ADD CONSTRAINT blurb_length CHECK (char_length(blurb) <= 250)
`;

console.log('Done — venues.blurb_length CHECK is now <= 250.');
