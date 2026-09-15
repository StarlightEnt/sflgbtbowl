import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth-helpers";
import { saveSeasonSetup, ValidationError } from "@/lib/pdf/saveSeasonSetup";

// This route, not the Season Setup page it's used from, is the real
// security boundary — a hidden page is never enough on its own.
export async function POST(req) {
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!email || !(await isAdmin(email))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { seasonName, standings, standingsFileUrl, schedule, abbreviations } = body;

  if (!seasonName || !standings || !schedule || !abbreviations) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const { seasonId } = await saveSeasonSetup({
      seasonName,
      standings,
      standingsFileUrl,
      schedule,
      abbreviations,
      uploadedBy: email,
    });
    return Response.json({ ok: true, seasonId });
  } catch (err) {
    if (err instanceof ValidationError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    console.error("season-setup save failed:", err);
    return Response.json({ error: "Save failed — nothing was written" }, { status: 500 });
  }
}
