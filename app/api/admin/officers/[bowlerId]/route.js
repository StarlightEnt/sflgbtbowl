import { requireAdminApi } from "@/lib/requireAdminApi";
import { sql } from "@/lib/db";

// Removing officer status never touches the underlying bowlers row —
// only this table.
export async function DELETE(req, { params }) {
  const { forbidden } = await requireAdminApi();
  if (forbidden) return forbidden;

  const { bowlerId } = await params;
  const id = Number(bowlerId);
  if (!Number.isInteger(id)) {
    return Response.json({ error: "Invalid bowler id" }, { status: 400 });
  }

  await sql`DELETE FROM officers WHERE bowler_id = ${id}`;
  return Response.json({ ok: true });
}
