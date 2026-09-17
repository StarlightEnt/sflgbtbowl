import { sql } from "@/lib/db";
import { getCurrentSeason } from "@/lib/currentSeason";
import { requireAdminPage } from "@/lib/requireAdminPage";
import BylawsForm from "@/components/Admin/BylawsForm";

// Admin-only — officers are admitted to /admin for Bowler
// Demographics/Announcements, but not this.
export default async function BylawsPage() {
  await requireAdminPage();
  const season = await getCurrentSeason();
  const revisions = season
    ? await sql`
        SELECT revision_label, file_url, file_name, uploaded_at, is_current
        FROM bylaws_revisions
        WHERE season_id = ${season.id}
        ORDER BY uploaded_at ASC
      `
    : [];

  return <BylawsForm seasonId={season?.id ?? null} revisions={revisions} />;
}
