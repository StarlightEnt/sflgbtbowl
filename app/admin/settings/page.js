import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import AdminSettingsForm from "@/components/Admin/AdminSettingsForm";

// isAdmin is gated in app/admin/layout.js, shared by every admin page.
export default async function AdminSettingsPage() {
  const session = await auth();
  const currentEmail = session?.user?.email ?? null;

  const admins = await sql`SELECT email, added_at FROM admin_emails ORDER BY added_at ASC`;

  return <AdminSettingsForm admins={admins} currentEmail={currentEmail} />;
}
