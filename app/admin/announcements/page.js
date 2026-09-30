import { sql } from "@/lib/db";
import AnnouncementsManager from "@/components/Admin/AnnouncementsManager";

// Reachable by isAdmin || isOfficer — already gated by app/admin/layout.js;
// this is the first admin-tree page an officer can actually reach.
export default async function AdminAnnouncementsPage() {
  const [announcements, leagues] = await Promise.all([
    sql`
      SELECT a.id, a.title, a.body, a.is_pinned, a.created_at, a.updated_at,
        COALESCE((
          SELECT json_agg(json_build_object('id', l.id, 'name', l.name, 'slug', l.slug) ORDER BY l.name)
          FROM announcement_leagues al
          JOIN leagues l ON l.id = al.league_id
          WHERE al.announcement_id = a.id
        ), '[]'::json) AS leagues
      FROM announcements a
      ORDER BY a.is_pinned DESC, a.created_at DESC
    `,
    sql`SELECT id, name, slug FROM leagues ORDER BY name`,
  ]);

  return <AnnouncementsManager announcements={announcements} leagues={leagues} />;
}
