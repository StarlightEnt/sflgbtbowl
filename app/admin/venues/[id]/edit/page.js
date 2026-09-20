import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { requireAdminPage } from "@/lib/requireAdminPage";
import VenueForm from "@/components/Admin/VenueForm";
import styles from "../../page.module.scss";

// Admin-only — officers are admitted to /admin for Bowler
// Demographics/Announcements, but not this.
export default async function EditVenuePage({ params }) {
  await requireAdminPage();
  const { id } = await params;
  const venueId = Number(id);
  if (!Number.isInteger(venueId)) notFound();
  const rows = await sql`SELECT * FROM venues WHERE id = ${venueId}`;
  const venue = rows[0];
  if (!venue) notFound();

  return (
    <>
      <h1 className={`display ${styles.heading}`}>Edit Venue</h1>
      <p className={styles.sub}>{venue.name}</p>
      <VenueForm venue={venue} />
    </>
  );
}
