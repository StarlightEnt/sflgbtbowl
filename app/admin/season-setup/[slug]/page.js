import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { requireAdminPage } from "@/lib/requireAdminPage";
import SeasonSetupForm from "@/components/Admin/SeasonSetupForm";

export default async function SeasonSetupPage({ params }) {
  await requireAdminPage();
  const { slug } = await params;

  const leagueRows = await sql`SELECT * FROM leagues WHERE slug = ${slug}`;
  const league = leagueRows[0];
  if (!league) notFound();

  return <SeasonSetupForm leagueId={league.id} leagueName={league.name} />;
}
