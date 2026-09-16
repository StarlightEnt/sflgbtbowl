import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth-helpers";
import { sql } from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// This route, not the page, is the real security boundary — a hidden
// page is never enough on its own.
export async function POST(req) {
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!email || !(await isAdmin(email))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email: newEmail } = await req.json();
  const trimmed = (newEmail ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(trimmed)) {
    return Response.json({ error: "A valid email is required" }, { status: 400 });
  }

  await sql`INSERT INTO admin_emails (email) VALUES (${trimmed}) ON CONFLICT (email) DO NOTHING`;
  return Response.json({ ok: true });
}
