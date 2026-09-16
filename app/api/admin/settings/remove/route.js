import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth-helpers";
import { sql } from "@/lib/db";

// This route, not the mockup's disabled button, is the real
// enforcement of "you can't remove yourself" — the UI disabling the
// button is a courtesy, never the security boundary. Checked here
// independent of whatever a client sends.
export async function POST(req) {
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!email || !(await isAdmin(email))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

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
