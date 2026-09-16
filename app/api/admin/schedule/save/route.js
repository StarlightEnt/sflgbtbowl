import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth-helpers";
import { sql } from "@/lib/db";

const LANE_ORDER = ["1-2", "3-4", "5-6", "7-8", "9-10", "11-12", "13-14"];

// This route, not the schedule page, is the real security boundary —
// every week stays editable per the original ask, but only an admin
// can actually save one.
export async function POST(req) {
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!email || !(await isAdmin(email))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { seasonId, weekNumber, lanePositions } = await req.json();
  if (!seasonId || !Number.isInteger(weekNumber) || !Array.isArray(lanePositions)) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (
    lanePositions.length !== LANE_ORDER.length ||
    !LANE_ORDER.every((lanes) => lanePositions.some((p) => p.lanes === lanes))
  ) {
    return Response.json({ error: "All 7 lane pairs are required" }, { status: 400 });
  }

  const teamNumbers = lanePositions.flatMap((p) => [p.teamANumber, p.teamBNumber]);
  if (teamNumbers.some((n) => !Number.isInteger(n))) {
    return Response.json({ error: "Every lane needs both teams assigned" }, { status: 400 });
  }
  if (new Set(teamNumbers).size !== teamNumbers.length) {
    return Response.json({ error: "Each team can only be assigned once" }, { status: 400 });
  }

  const teamRows = await sql`SELECT id, team_number FROM teams WHERE season_id = ${seasonId}`;
  const teamIdByNumber = new Map(teamRows.map((t) => [t.team_number, t.id]));
  if (teamNumbers.some((n) => !teamIdByNumber.has(n))) {
    return Response.json({ error: "Unrecognized team number for this season" }, { status: 400 });
  }

  const resolved = lanePositions.map((p) => ({
    lanes: p.lanes,
    team_a_id: teamIdByNumber.get(p.teamANumber),
    team_b_id: teamIdByNumber.get(p.teamBNumber),
  }));

  const result = await sql`
    UPDATE schedule
    SET lane_positions = ${JSON.stringify(resolved)}
    WHERE season_id = ${seasonId} AND week_number = ${weekNumber}
    RETURNING id
  `;
  if (result.length === 0) {
    return Response.json({ error: `Week ${weekNumber} not found for this season` }, { status: 404 });
  }

  return Response.json({ ok: true });
}
