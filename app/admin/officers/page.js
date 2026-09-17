import { sql } from "@/lib/db";
import { requireAdminPage } from "@/lib/requireAdminPage";
import OfficersManager from "@/components/Admin/OfficersManager";

// Admin-only — only full admins manage the officer roster.
export default async function OfficersPage() {
  await requireAdminPage();

  const officers = await sql`
    SELECT o.bowler_id, o.added_by, o.added_at, b.first_name, b.last_name, b.email
    FROM officers o
    JOIN bowlers b ON b.id = o.bowler_id
    ORDER BY o.added_at ASC
  `;

  // Eligible = has a login email on file and isn't already an officer.
  const eligibleBowlers = await sql`
    SELECT b.id, b.first_name, b.last_name, b.email
    FROM bowlers b
    WHERE b.email IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM officers o WHERE o.bowler_id = b.id)
    ORDER BY b.first_name, b.last_name
  `;

  return <OfficersManager officers={officers} eligibleBowlers={eligibleBowlers} />;
}
