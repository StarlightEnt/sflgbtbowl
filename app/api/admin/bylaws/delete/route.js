import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth-helpers";
import { getCurrentSeason } from "@/lib/currentSeason";
import {
  deleteBylawsRevision,
  NotFoundError,
  ValidationError,
} from "@/lib/pdf/deleteBylawsRevision";

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

  const { revisionLabel, confirmText } = await req.json();
  if (!revisionLabel) {
    return Response.json({ error: "A revision label is required" }, { status: 400 });
  }
  if (confirmText !== `REVISION ${revisionLabel}`) {
    return Response.json({ error: "Confirmation text didn't match" }, { status: 400 });
  }

  try {
    await deleteBylawsRevision({ seasonId: season.id, revisionLabel });
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return Response.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof ValidationError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    console.error("bylaws delete failed:", err);
    return Response.json({ error: "Delete failed" }, { status: 500 });
  }
}
