// PATH: lib/venues/deleteVenue.js
//
// Simple confirm-dialog delete (no Danger Zone — no cascading data or
// audit trail at stake), but blocked while any league still points at
// the venue. The list page disables the button for that case; this is
// the real enforcement. Blob cleanup is best-effort and never blocks
// the row deletion.

import { del } from "@vercel/blob";
import { sql } from "../db.js";

export class NotFoundError extends Error {}
export class InUseError extends Error {}

export async function deleteVenue(id) {
  const inUse = await sql`SELECT name FROM leagues WHERE venue_id = ${id}`;
  if (inUse.length > 0) {
    throw new InUseError(
      `This venue is used by ${inUse.map((l) => l.name).join(", ")} — change that league's venue in League Setup first`
    );
  }

  let rows;
  try {
    rows = await sql`DELETE FROM venues WHERE id = ${id} RETURNING logo_url`;
  } catch (err) {
    // A league grabbed the venue between the check above and the delete.
    if (err.code === "23503") {
      throw new InUseError("This venue is used by a league — change that league's venue first");
    }
    throw err;
  }
  if (rows.length === 0) throw new NotFoundError("Venue not found");

  if (rows[0].logo_url) {
    await del(rows[0].logo_url).catch((err) => {
      console.error("Failed to delete blob after venue delete:", err);
    });
  }
}
