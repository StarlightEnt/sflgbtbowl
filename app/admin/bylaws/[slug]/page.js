import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { getCurrentSeason } from "@/lib/currentSeason";
import { requireAdminPage } from "@/lib/requireAdminPage";
import BylawsForm from "@/components/Admin/BylawsForm";

// Admin-only — officers are admitted to /admin for Bowler
// Demographics/Announcements, but not this.
export default async function BylawsPage({ params }) {
  await requireAdminPage();
  const { slug } = await params;

  const leagueRows = await sql`SELECT * FROM leagues WHERE slug = ${slug}`;
  const league = leagueRows[0];
  if (!league) notFound();

  const season = await getCurrentSeason(slug);
  const revisions = season
    ? await sql`
        SELECT revision_label, file_url, file_name, uploaded_at, is_current
        FROM bylaws_revisions
        WHERE season_id = ${season.id}
        ORDER BY uploaded_at ASC
      `
    : [];

  return (
    <BylawsForm
      seasonId={season?.id ?? null}
      revisions={revisions}
      leagueSlug={slug}
      leagueName={league.name}
    />
  );
}
