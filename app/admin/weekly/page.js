import { sql } from "@/lib/db";
import { getCurrentSeason } from "@/lib/currentSeason";
import { requireAdminPage } from "@/lib/requireAdminPage";
import WeeklyStandingSheetForm from "@/components/Admin/WeeklyStandingSheetForm";

// Admin-only — officers are admitted to /admin for Bowler
// Demographics/Announcements, but not this.
export default async function WeeklyStandingSheetPage() {
  await requireAdminPage();
  const season = await getCurrentSeason();
  const history = season
    ? await sql`
        SELECT ss.*, sc.week_date
        FROM standing_sheets ss
        LEFT JOIN schedule sc ON sc.season_id = ss.season_id AND sc.week_number = ss.week_number
        WHERE ss.season_id = ${season.id}
        ORDER BY ss.week_number DESC
      `
    : [];

  return <WeeklyStandingSheetForm seasonId={season?.id ?? null} history={history} />;
}
