import { requireAdminOrOfficerApi } from "@/lib/requireAdminApi";
import { sql } from "@/lib/db";
import { updateAnnouncement, ValidationError, NotFoundError } from "@/lib/announcements/saveAnnouncement";

const MAX_TITLE_LEN = 120;

export async function PUT(req, { params }) {
  const { forbidden } = await requireAdminOrOfficerApi();
  if (forbidden) return forbidden;

  const { id } = await params;
  const announcementId = Number(id);
  if (!Number.isInteger(announcementId)) {
    return Response.json({ error: "Invalid announcement id" }, { status: 400 });
  }

  const { title, body, leagueIds } = await req.json();
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

  try {
    await updateAnnouncement({ id: announcementId, title: trimmedTitle, body: trimmedBody, leagueIds });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return Response.json({ error: "Announcement not found" }, { status: 404 });
    }
    if (err instanceof ValidationError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    throw err;
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
