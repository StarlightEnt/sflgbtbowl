import { requireAdminOrOfficerApi } from "@/lib/requireAdminApi";
import { sql } from "@/lib/db";

// Link (or unlink) one treasurer-sheet row to a roster bowler. Officers
// and admins only; this route, not the page, is the real boundary.
//   { rowId, bowlerId }       -> link/confirm (status becomes 'approved')
//   { rowId, bowlerId: null } -> unlink (status becomes 'unmatched')
// The sync never changes these columns, so an approved link stays put.
export async function POST(req) {
  const { email, forbidden } = await requireAdminOrOfficerApi();
  if (forbidden) return forbidden;

  const { rowId, bowlerId } = await req.json();
  const rid = Number(rowId);
  if (!Number.isInteger(rid)) {
    return Response.json({ error: "Invalid row id" }, { status: 400 });
  }

  const rows = await sql`SELECT id, season_id FROM finance_rows WHERE id = ${rid}`;
  if (rows.length === 0) {
    return Response.json({ error: "Row not found" }, { status: 404 });
  }

  if (bowlerId === null) {
    await sql`
      UPDATE finance_rows
      SET bowler_id = NULL, link_status = 'unmatched', linked_by_email = ${email}, linked_at = now()
      WHERE id = ${rid}
    `;
    return Response.json({ ok: true });
  }

  const bid = Number(bowlerId);
  if (!Number.isInteger(bid)) {
    return Response.json({ error: "Invalid bowler id" }, { status: 400 });
  }
  const seasonId = rows[0].season_id;

  // The bowler must be on this season's roster.
  const onRoster = await sql`
    SELECT 1 FROM league_memberships WHERE bowler_id = ${bid} AND season_id = ${seasonId}
  `;
  if (onRoster.length === 0) {
    return Response.json({ error: "That bowler isn't on this season's roster" }, { status: 400 });
  }

  // One bowler, one sheet row.
  const taken = await sql`
    SELECT 1 FROM finance_rows
    WHERE season_id = ${seasonId} AND bowler_id = ${bid} AND id <> ${rid}
  `;
  if (taken.length > 0) {
    return Response.json({ error: "That bowler is already linked to another sheet row" }, { status: 400 });
  }

  await sql`
    UPDATE finance_rows
    SET bowler_id = ${bid}, link_status = 'approved', linked_by_email = ${email}, linked_at = now()
    WHERE id = ${rid}
  `;
  return Response.json({ ok: true });
}
