import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { requireAdminPage } from "@/lib/requireAdminPage";
import AdminSettingsForm from "@/components/Admin/AdminSettingsForm";

// Admin-only — officers are admitted to /admin for Bowler
// Demographics/Announcements, but not this.
export default async function AdminSettingsPage() {
  await requireAdminPage();
  const session = await auth();
  const currentEmail = session?.user?.email ?? null;

  const admins = await sql`SELECT email, added_at FROM admin_emails ORDER BY added_at ASC`;

  return <AdminSettingsForm admins={admins} currentEmail={currentEmail} />;
}
