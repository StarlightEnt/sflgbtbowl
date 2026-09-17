import { sql } from "@/lib/db";

// Public, no auth — announcements show on the public League Dashboard.
// No pagination needed at this scale.
export async function GET() {
  const announcements = await sql`
    SELECT id, title, body, is_pinned, created_at, updated_at
    FROM announcements
    ORDER BY is_pinned DESC, created_at DESC
  `;
  return Response.json({ announcements });
}
