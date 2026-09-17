// PATH: lib/tournaments/updateTournament.js
//
// Plain save-on-submit update. Slug is admin-editable after create —
// re-validated for uniqueness (excluding this row) but not
// re-derived from the name. Image overwrite is intentionally simpler
// than the By-Laws "never delete on upload" pattern: if a new image
// replaces an existing one, the old Blob object is deleted after the
// new upload succeeds (no history requirement for tournament images).

import { put, del } from "@vercel/blob";
import { sql } from "../db.js";
import { slugify } from "./slugify.js";
import { validateTournamentInput, ValidationError } from "./validateTournamentInput.js";

export { ValidationError };
export class NotFoundError extends Error {}

export async function updateTournament({ id, input, imageFile }) {
  const fields = validateTournamentInput(input);

  const existingRows = await sql`SELECT * FROM tournaments WHERE id = ${id}`;
  const existing = existingRows[0];
  if (!existing) throw new NotFoundError("Tournament not found");

  const slug = slugify((input.slug ?? "").trim()) || existing.slug;
  if (slug !== existing.slug) {
    const collision = await sql`SELECT 1 FROM tournaments WHERE slug = ${slug} AND id != ${id}`;
    if (collision.length > 0) {
      throw new ValidationError(`Slug "${slug}" is already in use by another tournament`);
    }
  }

  let imageUrl = existing.image_url;
  let imageBlobPathname = existing.image_blob_pathname;
  let uploadedUrl = null;
  if (imageFile) {
    const blob = await put(`tournaments/${slug}-${imageFile.name}`, imageFile.buffer, {
      access: "public",
      addRandomSuffix: true,
      contentType: imageFile.type,
    });
    uploadedUrl = blob.url;
    imageUrl = blob.url;
    imageBlobPathname = blob.pathname;
  }

  try {
    await sql`
      UPDATE tournaments SET
        slug = ${slug},
        name = ${fields.name},
        start_date = ${fields.startDate},
        end_date = ${fields.endDate},
        cost_display = ${fields.costDisplay},
        category = ${fields.category},
        venue_name = ${fields.venueName},
        venue_address = ${fields.venueAddress},
        venue_phone = ${fields.venuePhone},
        venue_website = ${fields.venueWebsite},
        organizers = ${JSON.stringify(fields.organizers)},
        website_url = ${fields.websiteUrl},
        body = ${fields.body},
        image_url = ${imageUrl},
        image_blob_pathname = ${imageBlobPathname},
        is_active = ${fields.isActive},
        updated_at = now()
      WHERE id = ${id}
    `;
  } catch (err) {
    if (uploadedUrl) await del(uploadedUrl).catch(() => {});
    throw err;
  }

  // Old image replaced — clean it up only after the new row committed.
  if (uploadedUrl && existing.image_url && existing.image_url !== uploadedUrl) {
    await del(existing.image_url).catch(() => {});
  }

  return { id, slug };
}
