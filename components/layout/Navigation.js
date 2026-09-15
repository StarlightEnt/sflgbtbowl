import Link from "next/link";
import StripeBar from "./StripeBar";
import styles from "./Navigation.module.scss";

export default function Navigation({ authState = "guest" }) {
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
              <Link href="#">Leagues</Link>
            </li>
            <li>
              <span className={styles.disabled}>
                Tournaments
                <span className={styles.badgeSoon}>Coming soon</span>
              </span>
            </li>
            {authState === "guest" && (
              <li>
                <span className={styles.disabled}>
                  Member Login
                  <span className={styles.badgeSoon}>Coming soon</span>
                </span>
              </li>
            )}
            {authState === "member" && (
              <li>
                <span className={styles.memberPill}>Member</span>
              </li>
            )}
            {authState === "admin" && (
              <li>
                <span className={styles.adminPill}>Admin</span>
              </li>
            )}
          </ul>
        </div>
      </nav>
      <StripeBar />
    </>
  );
}
