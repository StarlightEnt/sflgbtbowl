import { requireAdminApi } from "@/lib/requireAdminApi";
import { createTournament, ValidationError } from "@/lib/tournaments/createTournament";
import { ALLOWED_IMAGE_TYPES } from "@/lib/tournaments/allowedImageType";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// This route, not the admin page, is the real security boundary —
// same rule as every other admin route in this repo.
export async function POST(req) {
  const { forbidden } = await requireAdminApi();
  if (forbidden) return forbidden;

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
    const { id, slug } = await createTournament({ input, imageFile });
    return Response.json({ ok: true, id, slug });
  } catch (err) {
    if (err instanceof ValidationError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    console.error("tournament create failed:", err);
    return Response.json({ error: "Save failed — nothing was written" }, { status: 500 });
  }
}
