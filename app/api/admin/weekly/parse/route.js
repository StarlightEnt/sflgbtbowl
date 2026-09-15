import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth-helpers";
import { sql } from "@/lib/db";
import { getCurrentSeason } from "@/lib/currentSeason";
import { parseLeagueStandingsPDF } from "@/lib/pdf/parseLeagueStandings";
import { matchWeeklyBowlers } from "@/lib/pdf/matchWeeklyBowlers";

// This route, not the page it's used from, is the real security
// boundary — a hidden page is never enough on its own. Writes nothing
// to the database — parse-only, so an admin can discard the upload
// with zero side effects (see Publish for the actual writes).
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
  if (!file || typeof file === "string") {
    return Response.json({ error: "Missing file" }, { status: 400 });
  }

  const pdfParse = (await import("pdf-parse")).default;
  const buffer = Buffer.from(await file.arrayBuffer());

  let text;
  try {
    const data = await pdfParse(buffer);
    text = data.text;
  } catch {
    return Response.json({ error: "Could not read PDF" }, { status: 400 });
  }

  const result = parseLeagueStandingsPDF(text);
  if (!result.week_number || result.teams.length === 0) {
    return Response.json(
      { error: "Could not find a Team Rosters section — is this a League Standings PDF?" },
      { status: 400 }
    );
  }

  const [teamRows, [{ total_weeks }], membershipRows] = await Promise.all([
    sql`SELECT id, team_number, team_name, abbreviation, is_bye FROM teams WHERE season_id = ${season.id}`,
    sql`SELECT MAX(week_number) AS total_weeks FROM schedule WHERE season_id = ${season.id}`,
    sql`
      SELECT lm.bowler_id, lm.team_id, b.first_name, b.last_name
      FROM league_memberships lm
      JOIN bowlers b ON b.id = lm.bowler_id
      WHERE lm.season_id = ${season.id}
    `,
  ]);

  const teamIdByNumber = new Map(teamRows.map((t) => [t.team_number, t.id]));
  const teamsById = new Map(teamRows.map((t) => [t.id, t]));
  const existingMemberships = membershipRows.map((r) => ({
    bowlerId: r.bowler_id,
    teamId: r.team_id,
    first_name: r.first_name,
    last_name: r.last_name,
  }));

  const diff = matchWeeklyBowlers({
    parsedTeams: result.teams,
    parsedSubs: result.subs,
    existingMemberships,
    teamIdByNumber,
  });

  const teamName = (teamId) => (teamId ? teamsById.get(teamId)?.team_name ?? null : null);
  const rosterChanges = diff.rosterChanges.map((c) => ({
    ...c,
    fromTeamName: teamName(c.fromTeamId) ?? "substitute",
    toTeamName: teamName(c.toTeamId) ?? "substitute",
  }));
  const possibleMatches = diff.possibleMatches.map((m) => ({
    ...m,
    teamName: teamName(m.teamId) ?? "substitute",
  }));

  const teamStandings = result.team_standings
    .map((row) => {
      const teamId = teamIdByNumber.get(row.team_number);
      if (!teamId) return null;
      const team = teamsById.get(teamId);
      return {
        teamId,
        teamNumber: row.team_number,
        teamName: team.team_name,
        abbreviation: team.abbreviation,
        pointsWon: row.points_won,
        pointsLost: row.points_lost,
        pctWon: row.pct_won,
      };
    })
    .filter(Boolean);

  const weeklyResults = result.weekly_results
    .map((row) => {
      const teamAId = teamIdByNumber.get(row.team_a_number);
      const teamBId = teamIdByNumber.get(row.team_b_number);
      if (!teamAId || !teamBId) return null;
      return {
        lanePair: row.lane_pair,
        teamAId,
        teamAAbbr: teamsById.get(teamAId).abbreviation,
        teamAPoints: row.team_a_points,
        teamBId,
        teamBAbbr: teamsById.get(teamBId).abbreviation,
        teamBPoints: row.team_b_points,
      };
    })
    .filter(Boolean);

  const bowlerAverages =
    diff.matchedNoChange.length + rosterChanges.length + possibleMatches.length + diff.newBowlers.length;

  return Response.json({
    weekNumber: result.week_number,
    weekDateRaw: result.week_date,
    totalWeeks: total_weeks,
    fileName: file.name,
    counts: {
      teamRecords: teamStandings.length,
      matchups: weeklyResults.length,
      bowlerAverages,
    },
    teamStandings,
    weeklyResults,
    matchedNoChange: diff.matchedNoChange,
    rosterChanges,
    possibleMatches,
    newBowlers: diff.newBowlers,
  });
}
