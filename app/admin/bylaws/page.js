import { sql } from "@/lib/db";
import { getCurrentSeason } from "@/lib/currentSeason";
import BylawsForm from "@/components/Admin/BylawsForm";

export default async function BylawsPage() {
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
