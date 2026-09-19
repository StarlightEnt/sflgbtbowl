import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdmin, isOfficer } from "@/lib/auth-helpers";
import { sql } from "@/lib/db";
import AdminSidebar from "@/components/Admin/AdminSidebar";
import styles from "./layout.module.scss";

// This layout-level check is a convenience, not the security boundary
// — every /admin page and its API routes gate themselves independently.
// Admits isAdmin || isOfficer (officers only reach Bowler
// Demographics/Announcements — every admin-only page under here calls
// requireAdminPage() itself, see lib/requireAdminPage.js).
export default async function AdminLayout({ children }) {
  const session = await auth();
  const email = session?.user?.email ?? null;
  const admin = email ? await isAdmin(email) : false;
  const officer = admin ? false : email ? await isOfficer(email) : false;
  if (!admin && !officer) {
    redirect("/signin");
  }

  // Sidebar needs the full league list to build Season Setup's
  // per-league links — cheap, small table, no reason to make it its
  // own client-side fetch.
  const leagues = admin ? await sql`SELECT id, name, slug FROM leagues ORDER BY id ASC` : [];

  return (
    <div className={styles.shell}>
      <AdminSidebar isAdminUser={admin} isOfficerUser={officer} leagues={leagues} />
      <div className={styles.main}>{children}</div>
    </div>
  );
}
