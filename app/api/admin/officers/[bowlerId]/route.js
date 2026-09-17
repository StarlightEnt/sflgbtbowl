import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth-helpers";
import { sql } from "@/lib/db";

// Removing officer status never touches the underlying bowlers row —
// only this table.
export async function DELETE(req, { params }) {
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!email || !(await isAdmin(email))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { bowlerId } = await params;
  const id = Number(bowlerId);
  if (!Number.isInteger(id)) {
    return Response.json({ error: "Invalid bowler id" }, { status: 400 });
  }

  await sql`DELETE FROM officers WHERE bowler_id = ${id}`;
  return Response.json({ ok: true });
}
