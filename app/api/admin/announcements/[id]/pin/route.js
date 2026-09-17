import { requireAdminOrOfficerApi } from "@/lib/requireAdminApi";
import { sql } from "@/lib/db";

export async function PATCH(req, { params }) {
  const { forbidden } = await requireAdminOrOfficerApi();
  if (forbidden) return forbidden;

  const { id } = await params;
  const announcementId = Number(id);
  if (!Number.isInteger(announcementId)) {
    return Response.json({ error: "Invalid announcement id" }, { status: 400 });
  }

  const { pinned } = await req.json();
  const rows = await sql`
    UPDATE announcements SET is_pinned = ${Boolean(pinned)}
    WHERE id = ${announcementId}
    RETURNING id
  `;
  if (rows.length === 0) {
    return Response.json({ error: "Announcement not found" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
