// PATH: lib/tournaments/deleteTournament.js
//
// Simple confirm-dialog delete, not the stricter type-to-confirm
// Danger Zone pattern — no cascading data or audit-trail value at
// stake here (per task spec). Blob cleanup is best-effort and never
// blocks the row deletion.

import { del } from "@vercel/blob";
import { sql } from "../db.js";

export class NotFoundError extends Error {}

export async function deleteTournament(id) {
  const rows = await sql`
    DELETE FROM tournaments WHERE id = ${id} RETURNING image_url
  `;
  if (rows.length === 0) throw new NotFoundError("Tournament not found");

  const imageUrl = rows[0].image_url;
  if (imageUrl) {
    await del(imageUrl).catch((err) => {
      console.error("Failed to delete blob after tournament delete:", err);
    });
  }
}
