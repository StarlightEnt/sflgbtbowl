import { requireAdminPage } from "@/lib/requireAdminPage";
import { sql } from "@/lib/db";
import LeagueSetupForm from "@/components/Admin/LeagueSetupForm";

// Admin-only, same as Season Setup — creating/editing leagues is a
// rare, structural action, not something officers touch.
export default async function LeagueSetupPage() {
  await requireAdminPage();
  const leagues = await sql`SELECT * FROM leagues ORDER BY id ASC`;
  return <LeagueSetupForm initialLeagues={leagues} />;
}
