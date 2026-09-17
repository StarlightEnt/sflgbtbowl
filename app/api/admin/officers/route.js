import { requireAdminApi } from "@/lib/requireAdminApi";
import { sql } from "@/lib/db";

// This route, not the admin page, is the real security boundary — a
// hidden page is never enough on its own. Officer management is
// admin-only, unlike Announcements below (which officers can also
// reach) — officers can never manage other officers.
export async function GET() {
  const { forbidden } = await requireAdminApi();
  if (forbidden) return forbidden;

  const officers = await sql`
    SELECT o.bowler_id, o.added_by, o.added_at, b.first_name, b.last_name, b.email
    FROM officers o
    JOIN bowlers b ON b.id = o.bowler_id
    ORDER BY o.added_at ASC
  `;
  return Response.json({ officers });
}

export async function POST(req) {
  const { email, forbidden } = await requireAdminApi();
  if (forbidden) return forbidden;

  const { bowlerId } = await req.json();
  const id = Number(bowlerId);
  if (!Number.isInteger(id)) {
    return Response.json({ error: "A bowler is required" }, { status: 400 });
  }

  const bowlerRows = await sql`SELECT id, email FROM bowlers WHERE id = ${id}`;
  const bowler = bowlerRows[0];
  if (!bowler) {
    return Response.json({ error: "Bowler not found" }, { status: 404 });
  }
  // An officer with no login email can never actually use the role —
  // reject with a clear error rather than silently creating a useless row.
  if (!bowler.email) {
    return Response.json(
      { error: "This bowler has no login email on file yet — add one before making them an officer" },
      { status: 400 }
    );
  }

  await sql`
    INSERT INTO officers (bowler_id, added_by) VALUES (${id}, ${email})
    ON CONFLICT (bowler_id) DO NOTHING
  `;
  return Response.json({ ok: true });
}
