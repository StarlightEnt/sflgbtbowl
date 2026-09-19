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

export default function AdminSidebar({ isAdminUser = false, isOfficerUser = false, leagues = [] }) {
  // Every league gets the same link set now — Weekly/Schedule/By-Laws
  // are league-context-aware (getCurrentSeason(leagueSlug)), so there's
  // no more "LWC gets everything, everyone else gets a stub" split.
  return (
    <aside className={styles.sidebar}>
      {isAdminUser ? (
        <>
          {leagues.map((league) => (
            <div key={league.id}>
              <div className={styles.label}>{league.name}</div>
              <NavLink href={`/admin/season-setup/${league.slug}`}>Season Setup</NavLink>
              <NavLink href={`/admin/weekly/${league.slug}`}>Weekly Standing Sheet</NavLink>
              <NavLink href={`/admin/schedule/${league.slug}`}>Schedule</NavLink>
              <NavLink href={`/admin/bylaws/${league.slug}`}>By-Laws</NavLink>
              <NavLink href={`/leagues/${league.slug}/roster`}>Bowler Demographics</NavLink>
              <div className={styles.dividerLine} />
            </div>
          ))}

          <div className={styles.label}>Site-wide</div>
          <NavLink href="/admin/league-setup">League Setup</NavLink>
          <NavLink href="/admin/tournaments">Tournaments</NavLink>
          <NavLink href="/admin/announcements">Announcements</NavLink>
          <NavLink href="/admin/officers">Officers</NavLink>
          <NavLink href="/admin/settings">Admin Settings</NavLink>
        </>
      ) : isOfficerUser ? (
        <>
          {leagues.map((league) => (
            <div key={league.id}>
              <div className={styles.label}>{league.name}</div>
              <NavLink href={`/leagues/${league.slug}/roster`}>Bowler Demographics</NavLink>
            </div>
          ))}
          <div className={styles.dividerLine} />
          <div className={styles.label}>Site-wide</div>
          <NavLink href="/admin/announcements">Announcements</NavLink>
        </>
      ) : null}
      <Link href="/leagues" className={styles.sidebarLink}>
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
