import { requireAdminApi } from "@/lib/requireAdminApi";
import { updateVenue, ValidationError, NotFoundError } from "@/lib/venues/updateVenue";
import {
  deleteVenue,
  NotFoundError as DeleteNotFoundError,
  InUseError,
} from "@/lib/venues/deleteVenue";
import { readLogoFile, LogoError } from "@/lib/venues/logoFile";

export async function PUT(req, { params }) {
  const { forbidden } = await requireAdminApi();
  if (forbidden) return forbidden;

  const { id } = await params;
  const venueId = Number(id);
  if (!Number.isInteger(venueId)) {
    return Response.json({ error: "Invalid venue id" }, { status: 400 });
  }

  const formData = await req.formData();
  let input;
  try {
    input = JSON.parse(formData.get("input") ?? "{}");
  } catch {
    return Response.json({ error: "Malformed request data" }, { status: 400 });
  }
  const logo = formData.get("logo");

  try {
    const logoFile = logo && typeof logo !== "string" ? await readLogoFile(logo) : null;
    const { slug } = await updateVenue({ id: venueId, input, logoFile });
    return Response.json({ ok: true, slug });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof LogoError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof NotFoundError) {
      return Response.json({ error: err.message }, { status: 404 });
    }
    console.error("venue update failed:", err);
    return Response.json({ error: "Save failed" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { forbidden } = await requireAdminApi();
  if (forbidden) return forbidden;

  const { id } = await params;
  const venueId = Number(id);
  if (!Number.isInteger(venueId)) {
    return Response.json({ error: "Invalid venue id" }, { status: 400 });
  }

  try {
    await deleteVenue(venueId);
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof InUseError) {
      return Response.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof DeleteNotFoundError) {
      return Response.json({ error: err.message }, { status: 404 });
    }
    console.error("venue delete failed:", err);
    return Response.json({ error: "Delete failed" }, { status: 500 });
  }
}
