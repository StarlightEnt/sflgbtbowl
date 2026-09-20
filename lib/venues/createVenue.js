// PATH: lib/venues/createVenue.js
//
// Plain save-on-submit create — no revision history (out of scope for
// this feature). Slug is generated from the name and de-duplicated
// against the real table; it is never shown in the form and is not
// changed by later renames, so deep links (/venues?venue=<slug>) and
// the league-page links stay stable.

import { put, del } from "@vercel/blob";
import { sql } from "../db.js";
import { slugify, uniqueSlug } from "../tournaments/slugify.js";
import { validateVenueInput, ValidationError } from "./validateVenueInput.js";

export { ValidationError };

export async function createVenue({ input, logoFile }) {
  const fields = validateVenueInput(input);

  const slug = await uniqueSlug(slugify(fields.name) || "venue", async (candidate) => {
    const rows = await sql`SELECT 1 FROM venues WHERE slug = ${candidate}`;
    return rows.length > 0;
  });

  let logoUrl = null;
  if (logoFile) {
    const blob = await put(`venues/${slug}-${logoFile.name}`, logoFile.buffer, {
      access: "public",
      addRandomSuffix: true,
      contentType: logoFile.type,
    });
    logoUrl = blob.url;
  }

  try {
    const rows = await sql`
      INSERT INTO venues
        (name, slug, street, city, state, zip, phone, website, blurb, logo_url, is_visible)
      VALUES
        (${fields.name}, ${slug}, ${fields.street}, ${fields.city}, ${fields.state}, ${fields.zip},
         ${fields.phone}, ${fields.website}, ${fields.blurb}, ${logoUrl}, ${fields.isVisible})
      RETURNING id, slug
    `;
    return rows[0];
  } catch (err) {
    if (logoUrl) await del(logoUrl).catch(() => {});
    throw err;
  }
}
