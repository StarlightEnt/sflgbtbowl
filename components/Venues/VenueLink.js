import Link from "next/link";
import styles from "./VenueLink.module.scss";

// A league's venue line — "Name · City, ST" — linking to that venue's
// popup on /venues. Expects the venue_* columns from the
// leagues LEFT JOIN venues query. A venue an admin has hidden has no
// public popup to land on, so it renders as plain text instead of a
// link that would just open the bare grid.
export default function VenueLink({ league }) {
  if (!league.venue_name) return null;
  const cityState = [league.venue_city, league.venue_state].filter(Boolean).join(", ");
  const label = cityState ? `${league.venue_name} · ${cityState}` : league.venue_name;

  if (!league.venue_is_visible) return <>{label}</>;
  return (
    <Link href={`/venues?venue=${encodeURIComponent(league.venue_slug)}`} className={styles.link}>
      {label}
    </Link>
  );
}
