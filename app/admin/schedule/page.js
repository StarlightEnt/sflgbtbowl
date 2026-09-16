import { sql } from "@/lib/db";
import { getCurrentSeason } from "@/lib/currentSeason";
import ScheduleEditor from "@/components/Admin/ScheduleEditor";

// isAdmin is gated in app/admin/layout.js, shared by every admin page.
export default async function SchedulePage() {
  const season = await getCurrentSeason();
  if (!season) {
    return (
      <>
        <h1 className="display">Schedule</h1>
        <p>No season is set up yet — run Season Setup first.</p>
      </>
    );
  }

  const [teams, weeks, standingsRows] = await Promise.all([
    sql`SELECT id, team_number, team_name, abbreviation, is_bye FROM teams WHERE season_id = ${season.id}`,
    sql`
      SELECT week_number, week_date, starting_lane, is_position_round, is_roll_off, lane_positions
      FROM schedule WHERE season_id = ${season.id} ORDER BY week_number
    `,
    sql`
      SELECT ts.team_id, ts.pct_won, ts.points_won, ts.week_number, t.team_number, t.is_bye
      FROM team_standings ts
      JOIN teams t ON t.id = ts.team_id
      WHERE ts.season_id = ${season.id}
        AND ts.week_number = (SELECT MAX(week_number) FROM team_standings WHERE season_id = ${season.id})
    `,
  ]);

  // Rank best-to-worst by pct_won (points_won as tiebreak), BYE forced
  // last regardless of its own standings row — same rule the seeding
  // algorithm expects.
  let rankedTeamNumbers = null;
  let lastRankedWeek = null;
  if (standingsRows.length === teams.length && teams.length > 0) {
    const nonBye = standingsRows
      .filter((r) => !r.is_bye)
      .sort((a, b) => Number(b.pct_won) - Number(a.pct_won) || Number(b.points_won) - Number(a.points_won));
    const bye = standingsRows.find((r) => r.is_bye);
    if (bye) {
      rankedTeamNumbers = [...nonBye.map((r) => r.team_number), bye.team_number];
      lastRankedWeek = standingsRows[0].week_number;
    }
  }

  return (
    <ScheduleEditor
      seasonId={season.id}
      teams={teams}
      weeks={weeks}
      rankedTeamNumbers={rankedTeamNumbers}
      lastRankedWeek={lastRankedWeek}
    />
  );
}
