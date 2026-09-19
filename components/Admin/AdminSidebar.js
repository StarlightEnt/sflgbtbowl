"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { LGBT_WEDNESDAY_LEAGUE_SLUG } from "@/lib/leagueSlug";
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
  // The Weekly Standing Sheet / Schedule / By-Laws pages are still
  // LWC-only (getCurrentSeason() isn't league-aware yet — a separate,
  // larger task) — keep that whole block exactly as it was, just with
  // Season Setup's link repointed at LWC's own slug. Any league beyond
  // LWC only gets a Season Setup link for now, since that's genuinely
  // all it has today.
  const lwc = leagues.find((l) => l.slug === LGBT_WEDNESDAY_LEAGUE_SLUG);
  const otherLeagues = leagues.filter((l) => l.slug !== LGBT_WEDNESDAY_LEAGUE_SLUG);

  return (
    <aside className={styles.sidebar}>
      {isAdminUser ? (
        <>
          <div className={styles.label}>LGBT Wednesday Community</div>
          <NavLink
            href={`/admin/season-setup/${lwc?.slug ?? LGBT_WEDNESDAY_LEAGUE_SLUG}`}
          >
            Season Setup
          </NavLink>
          <NavLink href="/admin/weekly">Weekly Standing Sheet</NavLink>
          <NavLink href="/admin/schedule">Schedule</NavLink>
          <NavLink href="/admin/bylaws">By-Laws</NavLink>
          <NavLink href="/admin/tournaments">Tournaments</NavLink>

          {otherLeagues.map((league) => (
            <div key={league.id}>
              <div className={styles.dividerLine} />
              <div className={styles.label}>{league.name}</div>
              <NavLink href={`/admin/season-setup/${league.slug}`}>Season Setup</NavLink>
              <p className={styles.sidebarNote}>
                Weekly Standing Sheet, Schedule, and By-Laws for this league are coming soon.
              </p>
            </div>
          ))}

          <div className={styles.dividerLine} />
          <div className={styles.label}>Site-wide</div>
          <NavLink href="/admin/league-setup">League Setup</NavLink>
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
