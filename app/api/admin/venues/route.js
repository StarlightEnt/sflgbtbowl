import { requireAdminApi } from "@/lib/requireAdminApi";
import { createVenue, ValidationError } from "@/lib/venues/createVenue";
import { readLogoFile, LogoError } from "@/lib/venues/logoFile";

// This route, not the admin page, is the real security boundary —
// same rule as every other admin route in this repo.
export async function POST(req) {
  const { forbidden } = await requireAdminApi();
  if (forbidden) return forbidden;

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
    const { id, slug } = await createVenue({ input, logoFile });
    return Response.json({ ok: true, id, slug });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof LogoError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    console.error("venue create failed:", err);
    return Response.json({ error: "Save failed — nothing was written" }, { status: 500 });
  }
}
