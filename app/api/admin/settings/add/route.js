import { requireAdminApi } from "@/lib/requireAdminApi";
import { sql } from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// This route, not the page, is the real security boundary — a hidden
// page is never enough on its own.
export async function POST(req) {
  const { forbidden } = await requireAdminApi();
  if (forbidden) return forbidden;

  const { email: newEmail } = await req.json();
  const trimmed = (newEmail ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(trimmed)) {
    return Response.json({ error: "A valid email is required" }, { status: 400 });
  }

  await sql`INSERT INTO admin_emails (email) VALUES (${trimmed}) ON CONFLICT (email) DO NOTHING`;
  return Response.json({ ok: true });
}
