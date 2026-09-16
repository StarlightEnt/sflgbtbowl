"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import styles from "./AdminSidebar.module.scss";

function NavLink({ href, children }) {
  const pathname = usePathname();
  const active = pathname.startsWith(href);
  return (
    <Link href={href} className={`${styles.sidebarLink} ${active ? styles.active : ""}`}>
      {children}
    </Link>
  );
}

export default function AdminSidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.label}>LGBT Wednesday Community</div>
      <NavLink href="/admin/season-setup">Season Setup</NavLink>
      <NavLink href="/admin/weekly">Weekly Standing Sheet</NavLink>
      <NavLink href="/admin/schedule">Schedule</NavLink>
      <div className={styles.dividerLine} />
      <div className={styles.label}>Site-wide</div>
      <NavLink href="/admin/settings">Admin Settings</NavLink>
      <Link href="/leagues/lgbt-wednesday-community" className={styles.sidebarLink}>
        ← Back to dashboard
      </Link>
      <div className={styles.dividerLine} />
      <form action={logout}>
        <button type="submit" className={`${styles.sidebarLink} ${styles.logoutButton}`}>
          Log out
        </button>
      </form>
    </aside>
  );
}
