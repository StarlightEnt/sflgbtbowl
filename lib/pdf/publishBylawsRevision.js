// PATH: lib/pdf/publishBylawsRevision.js
//
// Publishes a new By-Laws revision for a season: uploads the PDF to
// Blob, demotes whatever was current, and inserts the new row as
// current — all in one transaction. No PDF parsing here (unlike the
// standing-sheet uploads) — this is a straight file upload, the
// content is whatever's in the PDF, not something we read.
//
// Older revisions are never deleted on upload, only demoted
// (is_current -> false) — they stay admin-downloadable via the
// history table until explicitly removed via the Danger Zone.

import { Pool } from "@neondatabase/serverless";
import { put, del } from "@vercel/blob";
import { sql } from "../db.js";

export class ValidationError extends Error {}
export class ConflictError extends Error {}

// "A" -> "B" -> ... -> "Z" -> "AA" -> "AB" ... same base-26 letter
// sequence spreadsheet columns use.
function nextRevisionLabel(label) {
  if (!label) return "A";
  const chars = label.split("");
  let i = chars.length - 1;
  while (i >= 0) {
    if (chars[i] === "Z") {
      chars[i] = "A";
      i--;
    } else {
      chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1);
      break;
    }
  }
  if (i < 0) chars.unshift("A");
  return chars.join("");
}

export async function publishBylawsRevision({
  seasonId,
  fileBuffer,
  fileName,
  uploadedBy,
  revisionLabel,
}) {
  if (!seasonId) {
    throw new ValidationError("A season is required");
  }

  let label = revisionLabel;
  if (!label) {
    const existing = await sql`
      SELECT revision_label FROM bylaws_revisions
      WHERE season_id = ${seasonId} ORDER BY uploaded_at ASC
    `;
    label = nextRevisionLabel(existing.at(-1)?.revision_label ?? null);
  }

  const blob = await put(`bylaws/season-${seasonId}-rev${label}-${fileName}`, fileBuffer, {
    access: "public",
    addRandomSuffix: true,
    contentType: "application/pdf",
  });

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE bylaws_revisions SET is_current = false WHERE season_id = $1 AND is_current = true`,
      [seasonId]
    );

    let insertRes;
    try {
      insertRes = await client.query(
        `INSERT INTO bylaws_revisions
           (season_id, revision_label, file_url, file_name, uploaded_by, is_current)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING id`,
        [seasonId, label, blob.url, fileName, uploadedBy]
      );
    } catch (err) {
      if (err.code === "23505") {
        throw new ConflictError(`Revision ${label} already exists for this season`);
      }
      throw err;
    }

    await client.query("COMMIT");
    return { bylawsRevisionId: insertRes.rows[0].id, revisionLabel: label, fileUrl: blob.url };
  } catch (err) {
    await client.query("ROLLBACK");
    await del(blob.url).catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}
