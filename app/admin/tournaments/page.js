import Link from "next/link";
import { sql } from "@/lib/db";
import { requireAdminPage } from "@/lib/requireAdminPage";
import TournamentsList from "@/components/Admin/TournamentsList";
import styles from "./page.module.scss";

// Admin-only — officers are admitted to /admin for Bowler
// Demographics/Announcements, but not this.
export default async function AdminTournamentsPage() {
  await requireAdminPage();
  const tournaments = await sql`
    SELECT * FROM tournaments ORDER BY start_date ASC
  `;

  return (
    <>
      <div className={styles.headRow}>
        <div>
          <h1 className={`display ${styles.heading}`}>Tournaments</h1>
          <p className={styles.sub}>
            Every tournament entry, including past and inactive ones. Only Active entries with an
            upcoming end date show on the public site.
          </p>
        </div>
        <Link href="/admin/tournaments/new" className="btn">
          + New Tournament
        </Link>
      </div>

      <div className={styles.card}>
        <TournamentsList tournaments={tournaments} />
      </div>
    </>
  );
}
