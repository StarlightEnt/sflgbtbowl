import { sql } from "@/lib/db";

// Public, no auth — announcements show on the public League Dashboard.
// No pagination needed at this scale. Optional ?league=<slug> filters to
// announcements tagged for that league (announcement_leagues); with no
// param, every announcement is returned. Each row carries its tagged
// leagues (slug + name), aggregated in the same query.
export async function GET(req) {
  const league = new URL(req.url).searchParams.get("league");

  const announcements = await sql`
    SELECT a.id, a.title, a.body, a.is_pinned, a.created_at, a.updated_at,
      COALESCE((
        SELECT json_agg(json_build_object('slug', l.slug, 'name', l.name) ORDER BY l.name)
        FROM announcement_leagues al
        JOIN leagues l ON l.id = al.league_id
        WHERE al.announcement_id = a.id
      ), '[]'::json) AS leagues
    FROM announcements a
    WHERE ${league}::text IS NULL OR EXISTS (
      SELECT 1
      FROM announcement_leagues al
      JOIN leagues l ON l.id = al.league_id
      WHERE al.announcement_id = a.id AND l.slug = ${league}
    )
    ORDER BY a.is_pinned DESC, a.created_at DESC
  `;
  return Response.json({ announcements });
}
