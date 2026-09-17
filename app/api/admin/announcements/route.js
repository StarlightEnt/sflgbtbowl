import { auth } from "@/lib/auth";
import { isAdmin, isOfficer } from "@/lib/auth-helpers";
import { sql } from "@/lib/db";

const MAX_TITLE_LEN = 120;

// This route, not the admin page, is the real security boundary —
// isAdmin || isOfficer, same rule the task spells out for every
// Announcements route.
export async function POST(req) {
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!email || (!(await isAdmin(email)) && !(await isOfficer(email)))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { title, body } = await req.json();
  const trimmedTitle = (title ?? "").trim();
  const trimmedBody = (body ?? "").trim();
  if (!trimmedTitle) {
    return Response.json({ error: "A title is required" }, { status: 400 });
  }
  if (trimmedTitle.length > MAX_TITLE_LEN) {
    return Response.json({ error: `Title must be ${MAX_TITLE_LEN} characters or fewer` }, { status: 400 });
  }
  if (!trimmedBody) {
    return Response.json({ error: "A body is required" }, { status: 400 });
  }

  const bowlerRows = await sql`SELECT id FROM bowlers WHERE email = ${email}`;
  const posterBowlerId = bowlerRows[0]?.id ?? null;

  const rows = await sql`
    INSERT INTO announcements (title, body, posted_by_bowler_id, posted_by_email)
    VALUES (${trimmedTitle}, ${trimmedBody}, ${posterBowlerId}, ${email})
    RETURNING id
  `;
  return Response.json({ ok: true, id: rows[0].id });
}
