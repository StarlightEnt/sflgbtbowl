import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth-helpers";
import AdminSidebar from "@/components/Admin/AdminSidebar";
import styles from "./layout.module.scss";

// This layout-level check is a convenience, not the security boundary
// — every /admin page and its API routes gate themselves independently
// with the same isAdmin check, same rule as always.
export default async function AdminLayout({ children }) {
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!email || !(await isAdmin(email))) {
    redirect("/signin");
  }

  return (
    <div className={styles.shell}>
      <AdminSidebar />
      <div className={styles.main}>{children}</div>
    </div>
  );
}
