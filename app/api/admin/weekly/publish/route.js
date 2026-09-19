import { requireAdminApi } from "@/lib/requireAdminApi";
import { getCurrentSeason } from "@/lib/currentSeason";
import {
  publishWeeklyStandingSheet,
  ValidationError,
  ConflictError,
  InconsistentDataError,
} from "@/lib/pdf/publishWeeklyStandingSheet";

// This route, not the review page, is the real security boundary — a
// hidden page is never enough on its own. Trusts the client's parsed
// numbers (the admin reviewed them on-screen before publishing), same
// precedent as Season Setup's /save route.
export async function POST(req) {
  const { email, forbidden } = await requireAdminApi();
  if (forbidden) return forbidden;

  const formData = await req.formData();
  const leagueSlug = formData.get("leagueSlug");
  if (typeof leagueSlug !== "string" || !leagueSlug) {
    return Response.json({ error: "Missing leagueSlug" }, { status: 400 });
  }

  const season = await getCurrentSeason(leagueSlug);
  if (!season) {
    return Response.json({ error: "No season is set up yet" }, { status: 400 });
  }

  const file = formData.get("file");
  const dataField = formData.get("data");
  if (!file || typeof file === "string" || typeof dataField !== "string") {
    return Response.json({ error: "Missing file or data" }, { status: 400 });
  }

  let payload;
  try {
    payload = JSON.parse(dataField);
  } catch {
    return Response.json({ error: "Malformed request data" }, { status: 400 });
  }

  const { weekNumber, teamStandings, weeklyResults, matchedBowlers, newBowlers } = payload;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const { standingSheetId } = await publishWeeklyStandingSheet({
      seasonId: season.id,
      weekNumber,
      fileBuffer: buffer,
      fileName: file.name,
      uploadedBy: email,
      teamStandings: teamStandings ?? [],
      weeklyResults: weeklyResults ?? [],
      matchedBowlers: matchedBowlers ?? [],
      newBowlers: newBowlers ?? [],
    });
    return Response.json({ ok: true, standingSheetId });
  } catch (err) {
    if (err instanceof ValidationError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ConflictError) {
      return Response.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof InconsistentDataError) {
      return Response.json({ error: err.message }, { status: 409 });
    }
    console.error("weekly publish failed:", err);
    return Response.json({ error: "Publish failed — nothing was written" }, { status: 500 });
  }
}
