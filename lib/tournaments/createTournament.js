// PATH: lib/tournaments/createTournament.js
//
// Plain save-on-submit create — no revision history/draft state
// (unlike bylaws/weekly standing sheets), confirmed out of scope by
// the task. Slug is auto-generated from name and de-duplicated
// against the real table; an admin-supplied slug is normalized the
// same way and still checked for collisions.

import { put, del } from "@vercel/blob";
import { sql } from "../db.js";
import { slugify, uniqueSlug } from "./slugify.js";
import { validateTournamentInput, ValidationError } from "./validateTournamentInput.js";

export { ValidationError };

export async function createTournament({ input, imageFile }) {
  const fields = validateTournamentInput(input);

  const baseSlug = slugify((input.slug ?? "").trim() || fields.name);
  const slug = await uniqueSlug(baseSlug, async (candidate) => {
    const rows = await sql`SELECT 1 FROM tournaments WHERE slug = ${candidate}`;
    return rows.length > 0;
  });

  let imageUrl = null;
  let imageBlobPathname = null;
  if (imageFile) {
    const blob = await put(`tournaments/${slug}-${imageFile.name}`, imageFile.buffer, {
      access: "public",
      addRandomSuffix: true,
      contentType: imageFile.type,
    });
    imageUrl = blob.url;
    imageBlobPathname = blob.pathname;
  }

  try {
    const rows = await sql`
      INSERT INTO tournaments
        (slug, name, start_date, end_date, cost_display, category,
         venue_name, venue_address, venue_phone, venue_website,
         organizers, website_url, body, image_url, image_blob_pathname, is_active)
      VALUES
        (${slug}, ${fields.name}, ${fields.startDate}, ${fields.endDate}, ${fields.costDisplay}, ${fields.category},
         ${fields.venueName}, ${fields.venueAddress}, ${fields.venuePhone}, ${fields.venueWebsite},
         ${JSON.stringify(fields.organizers)}, ${fields.websiteUrl}, ${fields.body}, ${imageUrl}, ${imageBlobPathname}, ${fields.isActive})
      RETURNING id, slug
    `;
    return rows[0];
  } catch (err) {
    if (imageUrl) await del(imageUrl).catch(() => {});
    throw err;
  }
}
