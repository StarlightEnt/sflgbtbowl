import { requireAdminPage } from "@/lib/requireAdminPage";
import VenueForm from "@/components/Admin/VenueForm";
import styles from "../page.module.scss";

// Admin-only — officers are admitted to /admin for Bowler
// Demographics/Announcements, but not this.
export default async function NewVenuePage() {
  await requireAdminPage();
  return (
    <>
      <h1 className={`display ${styles.heading}`}>New Venue</h1>
      <p className={styles.sub}>Save writes directly — no draft state, no separate publish step.</p>
      <VenueForm venue={null} />
    </>
  );
}
