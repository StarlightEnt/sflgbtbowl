import { requireAdminOrOfficerApi } from "@/lib/requireAdminApi";
import { sql } from "@/lib/db";

const MAX_TITLE_LEN = 120;

export async function PUT(req, { params }) {
  const { forbidden } = await requireAdminOrOfficerApi();
  if (forbidden) return forbidden;

  const { id } = await params;
  const announcementId = Number(id);
  if (!Number.isInteger(announcementId)) {
    return Response.json({ error: "Invalid announcement id" }, { status: 400 });
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

  const rows = await sql`
    UPDATE announcements
    SET title = ${trimmedTitle}, body = ${trimmedBody}, updated_at = now()
    WHERE id = ${announcementId}
    RETURNING id
  `;
  if (rows.length === 0) {
    return Response.json({ error: "Announcement not found" }, { status: 404 });
  }
  return Response.json({ ok: true });
}

// Hard delete — no revision history/audit trail needed for
// announcements, unlike bylaws_revisions.
export async function DELETE(req, { params }) {
  const { forbidden } = await requireAdminOrOfficerApi();
  if (forbidden) return forbidden;

  const { id } = await params;
  const announcementId = Number(id);
  if (!Number.isInteger(announcementId)) {
    return Response.json({ error: "Invalid announcement id" }, { status: 400 });
  }

  await sql`DELETE FROM announcements WHERE id = ${announcementId}`;
  return Response.json({ ok: true });
}
