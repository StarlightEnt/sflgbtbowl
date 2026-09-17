import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { LGBT_WEDNESDAY_LEAGUE_SLUG } from "@/lib/leagueSlug";
import StripeBar from "./StripeBar";
import styles from "./Navigation.module.scss";

export default function Navigation({ isAdminUser = false, isMemberUser = false, isOfficerUser = false }) {
  return (
    <>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={`${styles.wordmark} display`}>
            SF LGBT BOWLERS
            <small>WEDNESDAY COMMUNITY BOWLING</small>
          </Link>
          <ul className={styles.navLinks}>
            <li>
              <Link href="/">Home</Link>
            </li>
            <li>
              <Link href={`/leagues/${LGBT_WEDNESDAY_LEAGUE_SLUG}`}>Leagues</Link>
            </li>
            <li>
              <Link href="/tournaments">Tournaments</Link>
            </li>
            {!isMemberUser && !isAdminUser && (
              <li>
                <Link href="/signin">Member Login</Link>
              </li>
            )}
            {isMemberUser && (
              <li>
                <Link href="/member/roster" className={styles.memberPill}>
                  Member
                </Link>
              </li>
            )}
            {isAdminUser && (
              <li>
                <Link href="/admin/season-setup" className={styles.adminPill}>
                  Admin
                </Link>
              </li>
            )}
            {isOfficerUser && !isAdminUser && (
              <li>
                <Link href="/admin/announcements" className={styles.adminPill}>
                  Officer
                </Link>
              </li>
            )}
            {(isMemberUser || isAdminUser) && (
              <li>
                <form action={logout}>
                  <button type="submit" className={styles.logoutLink}>
                    Log out
                  </button>
                </form>
              </li>
            )}
          </ul>
        </div>
      </nav>
      <StripeBar />
    </>
  );
}
