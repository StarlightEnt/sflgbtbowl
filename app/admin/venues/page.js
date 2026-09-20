import Link from "next/link";
import { sql } from "@/lib/db";
import { requireAdminPage } from "@/lib/requireAdminPage";
import VenuesList from "@/components/Admin/VenuesList";
import styles from "./page.module.scss";

// Admin-only — officers are admitted to /admin for Bowler
// Demographics/Announcements, but not this. Not league-scoped: a venue
// is site-wide setup, closer to Tournaments than to per-league config.
export default async function AdminVenuesPage() {
  await requireAdminPage();
  const venues = await sql`
    SELECT v.*,
           (SELECT string_agg(l.name, ', ' ORDER BY l.id) FROM leagues l WHERE l.venue_id = v.id) AS league_names
    FROM venues v
    ORDER BY lower(v.name) ASC
  `;

  return (
    <>
      <div className={styles.headRow}>
        <div>
          <h1 className={`display ${styles.heading}`}>Venue Setup</h1>
          <p className={styles.sub}>
            Every bowling center on file, including hidden ones. Only visible venues show on the
            public Venues page. A venue can&apos;t be deleted while a league uses it.
          </p>
        </div>
        <Link href="/admin/venues/new" className="btn">
          + New Venue
        </Link>
      </div>

      <div className={styles.card}>
        <VenuesList venues={venues} />
      </div>
    </>
  );
}
