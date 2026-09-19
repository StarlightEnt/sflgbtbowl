import { requireAdminApi } from "@/lib/requireAdminApi";
import { saveSeasonSetup, ValidationError } from "@/lib/pdf/saveSeasonSetup";

// This route, not the Season Setup page it's used from, is the real
// security boundary — a hidden page is never enough on its own.
export async function POST(req) {
  const { email, forbidden } = await requireAdminApi();
  if (forbidden) return forbidden;

  const body = await req.json();
  const {
    leagueId,
    seasonName,
    standings,
    standingsFileUrl,
    schedule,
    abbreviations,
    matchedBowlers,
    newBowlers,
  } = body;

  if (!leagueId || !seasonName || !standings || !schedule || !abbreviations) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const { seasonId } = await saveSeasonSetup({
      leagueId,
      seasonName,
      standings,
      standingsFileUrl,
      schedule,
      abbreviations,
      matchedBowlers: matchedBowlers ?? [],
      newBowlers: newBowlers ?? [],
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
