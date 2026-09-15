import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth-helpers";
import { sql } from "@/lib/db";
import { getCurrentSeason } from "@/lib/currentSeason";
import WeeklyStandingSheetForm from "@/components/Admin/WeeklyStandingSheetForm";

// This page-level check is a convenience, not the security boundary —
// the API routes it calls (app/api/admin/weekly/*) gate themselves
// independently with the same isAdmin check.
export default async function WeeklyStandingSheetPage() {
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!email || !(await isAdmin(email))) {
    redirect("/signin");
  }

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
