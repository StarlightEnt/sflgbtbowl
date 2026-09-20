import { requireAdminApi } from "@/lib/requireAdminApi";
import { sql } from "@/lib/db";

// Lists every league on file, for the League Setup admin page and for
// anywhere else in /admin that needs to build a league picker (Season
// Setup's dropdown, the sidebar's per-league sections).
export async function GET() {
  const { forbidden } = await requireAdminApi();
  if (forbidden) return forbidden;

  const leagues = await sql`
    SELECT l.*, v.name AS venue_name
    FROM leagues l
    LEFT JOIN venues v ON v.id = l.venue_id
    ORDER BY l.id ASC
  `;
  return Response.json({ leagues });
}
