import { sql } from "@/lib/db";
import VenuesGrid from "@/components/Venues/VenuesGrid";
import styles from "./page.module.scss";

export const metadata = {
  title: "Venues — SF LGBT Bowlers",
};

// Public — only venues an admin has left visible. /venues?venue=<slug>
// opens straight to that venue's popup (a deep link from the league
// pages); an unknown or hidden slug just loads the plain grid.
export default async function VenuesPage({ searchParams }) {
  const { venue } = await searchParams;
  const initialSlug = typeof venue === "string" ? venue : null;

  const venues = await sql`
    SELECT id, name, slug, street, city, state, zip, phone, website, blurb, logo_url
    FROM venues
    WHERE is_visible = true
    ORDER BY lower(name) ASC
  `;

  return (
    <div className={styles.pageWrap}>
      <h1 className={`display ${styles.heading}`}>Venues</h1>
      <p className={styles.intro}>
        The bowling centers our leagues call home — tap a name for the address, phone and website.
      </p>
      {venues.length === 0 ? (
        <p className={styles.empty}>No venues to show yet — check back soon.</p>
      ) : (
        <VenuesGrid venues={venues} initialSlug={initialSlug} />
      )}
    </div>
  );
}
