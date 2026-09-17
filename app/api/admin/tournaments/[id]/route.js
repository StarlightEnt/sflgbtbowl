import { requireAdminApi } from "@/lib/requireAdminApi";
import { updateTournament, ValidationError, NotFoundError } from "@/lib/tournaments/updateTournament";
import { deleteTournament, NotFoundError as DeleteNotFoundError } from "@/lib/tournaments/deleteTournament";
import { ALLOWED_IMAGE_TYPES } from "@/lib/tournaments/allowedImageType";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function PUT(req, { params }) {
  const { forbidden } = await requireAdminApi();
  if (forbidden) return forbidden;

  const { id } = await params;
  const tournamentId = Number(id);
  if (!Number.isInteger(tournamentId)) {
    return Response.json({ error: "Invalid tournament id" }, { status: 400 });
  }

  const formData = await req.formData();
  const input = JSON.parse(formData.get("input") ?? "{}");
  const image = formData.get("image");

  let imageFile = null;
  if (image && typeof image !== "string") {
    if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
      return Response.json({ error: "Image must be a JPEG, PNG, GIF, or WebP file" }, { status: 400 });
    }
    if (image.size > MAX_IMAGE_BYTES) {
      return Response.json({ error: "Image must be 8MB or smaller" }, { status: 400 });
    }
    imageFile = { buffer: Buffer.from(await image.arrayBuffer()), name: image.name, type: image.type };
  }

  try {
    const { slug } = await updateTournament({ id: tournamentId, input, imageFile });
    return Response.json({ ok: true, slug });
  } catch (err) {
    if (err instanceof ValidationError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof NotFoundError) {
      return Response.json({ error: err.message }, { status: 404 });
    }
    console.error("tournament update failed:", err);
    return Response.json({ error: "Save failed" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { forbidden } = await requireAdminApi();
  if (forbidden) return forbidden;

  const { id } = await params;
  const tournamentId = Number(id);
  if (!Number.isInteger(tournamentId)) {
    return Response.json({ error: "Invalid tournament id" }, { status: 400 });
  }

  try {
    await deleteTournament(tournamentId);
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof DeleteNotFoundError) {
      return Response.json({ error: err.message }, { status: 404 });
    }
    console.error("tournament delete failed:", err);
    return Response.json({ error: "Delete failed" }, { status: 500 });
  }
}
