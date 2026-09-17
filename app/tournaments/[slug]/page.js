import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { formatTournamentDateRange } from "@/lib/tournaments/formatDateRange";
import styles from "./page.module.scss";

// Deliberately still shows even if end_date has passed — only the
// list page filters by date, so a bookmarked link never 404s just
// because the event is over.
export default async function TournamentDetailPage({ params }) {
  const { slug } = await params;
  const rows = await sql`SELECT * FROM tournaments WHERE slug = ${slug}`;
  const t = rows[0];
  if (!t || !t.is_active) notFound();

  const mapsUrl = t.venue_address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.venue_address)}`
    : null;

  return (
    <>
      <div className={styles.banner}>
        <div className={styles.bannerInner}>
          <div className={styles.dateBadge}>{formatTournamentDateRange(t.start_date, t.end_date)}</div>
          <h1 className={`display ${styles.heading}`}>{t.name}</h1>
          {t.category && <div className={styles.category}>{t.category}</div>}
        </div>
      </div>

      <div className={styles.page}>
        <Link href="/tournaments" className={styles.backLink}>
          « All Tournaments
        </Link>

        {t.image_url && <img src={t.image_url} alt="" className={styles.featuredImage} />}

        {t.website_url && (
          <a href={t.website_url} target="_blank" rel="noopener noreferrer" className={`btn ${styles.websiteBtn}`}>
            Visit tournament website ↗
          </a>
        )}

        {t.body && (
          <div className={styles.body} dangerouslySetInnerHTML={{ __html: t.body }} />
        )}

        <div className={styles.cardGrid}>
          <div className={styles.card}>
            <h2>Details</h2>
            <dl className={styles.detailList}>
              <dt>Dates</dt>
              <dd>{formatTournamentDateRange(t.start_date, t.end_date)}</dd>
              {t.cost_display && (
                <>
                  <dt>Cost</dt>
                  <dd>{t.cost_display}</dd>
                </>
              )}
              {t.category && (
                <>
                  <dt>Category</dt>
                  <dd>{t.category}</dd>
                </>
              )}
            </dl>
          </div>

          {t.organizers?.length > 0 && (
            <div className={styles.card}>
              <h2>Organizers</h2>
              <ul className={styles.organizerList}>
                {t.organizers.map((o, i) => (
                  <li key={i}>
                    <span className={styles.organizerName}>{o.name}</span>
                    {o.email && (
                      <a href={`mailto:${o.email}`} className={styles.organizerEmail}>
                        {o.email}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(t.venue_name || t.venue_address || t.venue_phone || t.venue_website) && (
            <div className={styles.card}>
              <h2>Venue</h2>
              {t.venue_name && <div className={styles.venueName}>{t.venue_name}</div>}
              {t.venue_address && <div className={styles.venueLine}>{t.venue_address}</div>}
              {t.venue_phone && (
                <div className={styles.venueLine}>
                  <a href={`tel:${t.venue_phone}`}>{t.venue_phone}</a>
                </div>
              )}
              {t.venue_website && (
                <div className={styles.venueLine}>
                  <a href={t.venue_website} target="_blank" rel="noopener noreferrer">
                    Venue website ↗
                  </a>
                </div>
              )}
              {mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.mapsLink}>
                  View on Google Maps ↗
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
