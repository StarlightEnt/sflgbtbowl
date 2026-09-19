import { requireAdminApi } from "@/lib/requireAdminApi";
import { getCurrentSeason } from "@/lib/currentSeason";
import { deleteWeeklyStandingSheet, NotFoundError } from "@/lib/pdf/deleteWeeklyStandingSheet";

// This route, not the Danger Zone's type-to-confirm UI, is the real
// security boundary — the confirm text is a UX safety net against
// misclicks, not an access control. Re-checked here anyway as a cheap
// second guard against a buggy/bypassed client.
export async function POST(req) {
  const { forbidden } = await requireAdminApi();
  if (forbidden) return forbidden;

  const { weekNumber, confirmText, leagueSlug } = await req.json();
  if (typeof leagueSlug !== "string" || !leagueSlug) {
    return Response.json({ error: "Missing leagueSlug" }, { status: 400 });
  }

  const season = await getCurrentSeason(leagueSlug);
  if (!season) {
    return Response.json({ error: "No season is set up yet" }, { status: 400 });
  }

  if (!Number.isInteger(weekNumber)) {
    return Response.json({ error: "A valid week number is required" }, { status: 400 });
  }
  if (confirmText !== `WEEK ${weekNumber}`) {
    return Response.json({ error: "Confirmation text didn't match" }, { status: 400 });
  }

  try {
    await deleteWeeklyStandingSheet({ seasonId: season.id, weekNumber });
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return Response.json({ error: err.message }, { status: 404 });
    }
    console.error("weekly delete failed:", err);
    return Response.json({ error: "Delete failed" }, { status: 500 });
  }
}
