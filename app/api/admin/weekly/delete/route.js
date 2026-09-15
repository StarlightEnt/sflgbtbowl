import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth-helpers";
import { getCurrentSeason } from "@/lib/currentSeason";
import { deleteWeeklyStandingSheet, NotFoundError } from "@/lib/pdf/deleteWeeklyStandingSheet";

// This route, not the Danger Zone's type-to-confirm UI, is the real
// security boundary — the confirm text is a UX safety net against
// misclicks, not an access control. Re-checked here anyway as a cheap
// second guard against a buggy/bypassed client.
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

  const { weekNumber, confirmText } = await req.json();
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
