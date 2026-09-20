// PATH: lib/venues/updateVenue.js
//
// Plain save-on-submit update. A replaced (or removed) logo's old Blob
// object is deleted only after the row update commits — no history is
// kept for venue logos, same pattern as tournament images.

import { put, del } from "@vercel/blob";
import { sql } from "../db.js";
import { slugify } from "../tournaments/slugify.js";
import { validateVenueInput, ValidationError } from "./validateVenueInput.js";

export { ValidationError };
export class NotFoundError extends Error {}

export async function updateVenue({ id, input, logoFile }) {
  const fields = validateVenueInput(input);

  const existingRows = await sql`SELECT * FROM venues WHERE id = ${id}`;
  const existing = existingRows[0];
  if (!existing) throw new NotFoundError("Venue not found");

  let logoUrl = existing.logo_url;
  let uploadedUrl = null;
  if (logoFile) {
    const blob = await put(`venues/${existing.slug || slugify(fields.name)}-${logoFile.name}`, logoFile.buffer, {
      access: "public",
      addRandomSuffix: true,
      contentType: logoFile.type,
    });
    uploadedUrl = blob.url;
    logoUrl = blob.url;
  } else if (fields.removeLogo) {
    logoUrl = null;
  }

  try {
    await sql`
      UPDATE venues SET
        name = ${fields.name},
        street = ${fields.street},
        city = ${fields.city},
        state = ${fields.state},
        zip = ${fields.zip},
        phone = ${fields.phone},
        website = ${fields.website},
        blurb = ${fields.blurb},
        logo_url = ${logoUrl},
        is_visible = ${fields.isVisible},
        updated_at = now()
      WHERE id = ${id}
    `;
  } catch (err) {
    if (uploadedUrl) await del(uploadedUrl).catch(() => {});
    throw err;
  }

  if (existing.logo_url && existing.logo_url !== logoUrl) {
    await del(existing.logo_url).catch((err) => {
      console.error("Failed to delete old venue logo blob:", err);
    });
  }

  return { id, slug: existing.slug };
}
