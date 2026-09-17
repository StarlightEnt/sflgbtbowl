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

export default function AdminSidebar({ isAdminUser = false, isOfficerUser = false }) {
  return (
    <aside className={styles.sidebar}>
      {isAdminUser ? (
        <>
          <div className={styles.label}>LGBT Wednesday Community</div>
          <NavLink href="/admin/season-setup">Season Setup</NavLink>
          <NavLink href="/admin/weekly">Weekly Standing Sheet</NavLink>
          <NavLink href="/admin/schedule">Schedule</NavLink>
          <NavLink href="/admin/bylaws">By-Laws</NavLink>
          <NavLink href="/admin/tournaments">Tournaments</NavLink>
          <div className={styles.dividerLine} />
          <div className={styles.label}>Site-wide</div>
          <NavLink href="/member/roster">Bowler Demographics</NavLink>
          <NavLink href="/admin/announcements">Announcements</NavLink>
          <NavLink href="/admin/officers">Officers</NavLink>
          <NavLink href="/admin/settings">Admin Settings</NavLink>
        </>
      ) : isOfficerUser ? (
        <>
          <div className={styles.label}>Officer</div>
          <NavLink href="/member/roster">Bowler Demographics</NavLink>
          <NavLink href="/admin/announcements">Announcements</NavLink>
        </>
      ) : null}
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
