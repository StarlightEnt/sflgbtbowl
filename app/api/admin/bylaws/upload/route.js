import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth-helpers";
import { getCurrentSeason } from "@/lib/currentSeason";
import {
  publishBylawsRevision,
  ValidationError,
  ConflictError,
} from "@/lib/pdf/publishBylawsRevision";

// This route, not the admin page, is the real security boundary — a
// hidden page is never enough on its own.
export async function POST(req) {
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!email || !(await isAdmin(email))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const season = await getCurrentSeason();
  if (!season) {
    return Response.json({ error: "No season is set up yet" }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const revisionLabel = formData.get("revisionLabel");
  if (!file || typeof file === "string") {
    return Response.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return Response.json({ error: "File must be a PDF" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const { bylawsRevisionId, revisionLabel: savedLabel } = await publishBylawsRevision({
      seasonId: season.id,
      fileBuffer: buffer,
      fileName: file.name,
      uploadedBy: email,
      revisionLabel: typeof revisionLabel === "string" && revisionLabel.trim() ? revisionLabel.trim() : null,
    });
    return Response.json({ ok: true, bylawsRevisionId, revisionLabel: savedLabel });
  } catch (err) {
    if (err instanceof ValidationError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ConflictError) {
      return Response.json({ error: err.message }, { status: 409 });
    }
    console.error("bylaws upload failed:", err);
    return Response.json({ error: "Upload failed — nothing was written" }, { status: 500 });
  }
}
