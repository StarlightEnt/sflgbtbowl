import { sql } from "@/lib/db";
import AnnouncementsManager from "@/components/Admin/AnnouncementsManager";

// Reachable by isAdmin || isOfficer — already gated by app/admin/layout.js;
// this is the first admin-tree page an officer can actually reach.
export default async function AdminAnnouncementsPage() {
  const announcements = await sql`
    SELECT id, title, body, is_pinned, created_at, updated_at
    FROM announcements
    ORDER BY is_pinned DESC, created_at DESC
  `;

  return <AnnouncementsManager announcements={announcements} />;
}
