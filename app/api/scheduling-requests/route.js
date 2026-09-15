import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { submitSchedulingRequest, ValidationError } from "@/lib/schedulingRequests";

// This route, not the dashboard page's captain-only form, is the real
// security boundary — team_id is re-derived from the DB (bowler +
// season + is_captain), never trusted from the request body.
export async function POST(req) {
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!email) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  const body = await req.json();
  const { seasonId, teamId, weekNumber, requestType, targetDate, reason } = body;
  if (!seasonId || !teamId || !weekNumber || !requestType || !targetDate) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const bowlerRows = await sql`SELECT id FROM bowlers WHERE email = ${email}`;
  if (bowlerRows.length === 0) {
    return Response.json({ error: "No bowler record found for this account" }, { status: 403 });
  }
  const captainBowlerId = bowlerRows[0].id;

  const membershipRows = await sql`
    SELECT lm.team_id, t.team_name
    FROM league_memberships lm
    JOIN teams t ON t.id = lm.team_id
    WHERE lm.bowler_id = ${captainBowlerId}
      AND lm.season_id = ${seasonId}
      AND lm.team_id = ${teamId}
      AND lm.is_captain = true
  `;
  if (membershipRows.length === 0) {
    return Response.json({ error: "You are not the captain of that team" }, { status: 403 });
  }

  try {
    await submitSchedulingRequest({
      seasonId,
      teamId,
      teamName: membershipRows[0].team_name,
      captainBowlerId,
      captainEmail: email,
      weekNumber,
      requestType,
      targetDate,
      reason,
    });
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof ValidationError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    console.error("scheduling request failed:", err);
    return Response.json({ error: "Request failed — please try again" }, { status: 500 });
  }
}
