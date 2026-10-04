import { requireAdminOrOfficerApi } from "@/lib/requireAdminApi";
import { sql } from "@/lib/db";
import { setTeamFlag, clearTeamFlag } from "@/lib/teamFlags";

const MAX_REASON_LEN = 500;

// Manual flags only: this route sets/clears the "admin" source. The
// "finance" flag is owned by the finance sync and is never written from
// here, so an officer clearing a manual flag can't wipe a finance one.
// This route, not the page, is the real security boundary — officers
// and admins both may flag.
export async function POST(req) {
  const { email, forbidden } = await requireAdminOrOfficerApi();
  if (forbidden) return forbidden;

  const { teamId, reason } = await req.json();
  const id = Number(teamId);
  if (!Number.isInteger(id)) {
    return Response.json({ error: "Invalid team id" }, { status: 400 });
  }
  const trimmedReason = (reason ?? "").trim();
  if (trimmedReason.length > MAX_REASON_LEN) {
    return Response.json({ error: `Reason must be ${MAX_REASON_LEN} characters or fewer` }, { status: 400 });
  }
  const teams = await sql`SELECT id FROM teams WHERE id = ${id}`;
  if (teams.length === 0) {
    return Response.json({ error: "Team not found" }, { status: 404 });
  }

  await setTeamFlag({
    teamId: id,
    source: "admin",
    reason: trimmedReason || null,
    setByEmail: email,
  });
  return Response.json({ ok: true });
}

export async function DELETE(req) {
  const { forbidden } = await requireAdminOrOfficerApi();
  if (forbidden) return forbidden;

  const { teamId } = await req.json();
  const id = Number(teamId);
  if (!Number.isInteger(id)) {
    return Response.json({ error: "Invalid team id" }, { status: 400 });
  }
  await clearTeamFlag({ teamId: id, source: "admin" });
  return Response.json({ ok: true });
}
