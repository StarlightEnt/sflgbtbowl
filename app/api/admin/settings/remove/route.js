import { requireAdminApi } from "@/lib/requireAdminApi";
import { sql } from "@/lib/db";

// This route, not the mockup's disabled button, is the real
// enforcement of "you can't remove yourself" — the UI disabling the
// button is a courtesy, never the security boundary. Checked here
// independent of whatever a client sends.
export async function POST(req) {
  const { email, forbidden } = await requireAdminApi();
  if (forbidden) return forbidden;

  const { email: targetEmail } = await req.json();
  const trimmed = (targetEmail ?? "").trim().toLowerCase();
  if (!trimmed) {
    return Response.json({ error: "An email is required" }, { status: 400 });
  }

  if (trimmed === email.trim().toLowerCase()) {
    return Response.json({ error: "You can't remove your own admin access" }, { status: 400 });
  }

  await sql`DELETE FROM admin_emails WHERE email = ${trimmed}`;
  return Response.json({ ok: true });
}
