import { requireAdminPage } from "@/lib/requireAdminPage";
import TournamentForm from "@/components/Admin/TournamentForm";
import styles from "../page.module.scss";

// Admin-only — officers are admitted to /admin for Bowler
// Demographics/Announcements, but not this.
export default async function NewTournamentPage() {
  await requireAdminPage();
  return (
    <>
      <h1 className={`display ${styles.heading}`}>New Tournament</h1>
      <p className={styles.sub}>Save writes directly — no draft state, no separate publish step.</p>
      <TournamentForm tournament={null} />
    </>
  );
}
