import { requireAdminPage } from "@/lib/requireAdminPage";
import { sql } from "@/lib/db";
import LeagueSetupForm from "@/components/Admin/LeagueSetupForm";

// Admin-only, same as Season Setup — creating/editing leagues is a
// rare, structural action, not something officers touch.
export default async function LeagueSetupPage() {
  await requireAdminPage();
  const leagues = await sql`
    SELECT l.*, v.name AS venue_name
    FROM leagues l
    LEFT JOIN venues v ON v.id = l.venue_id
    ORDER BY l.id ASC
  `;
  const venues = await sql`SELECT id, name FROM venues ORDER BY lower(name) ASC`;
  return <LeagueSetupForm initialLeagues={leagues} venues={venues} />;
}
