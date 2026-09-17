import Link from "next/link";
import { sql } from "@/lib/db";
import { formatTournamentDateRange, truncateBodyPreview } from "@/lib/tournaments/formatDateRange";
import styles from "./page.module.scss";

const MONTH_YEAR = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

function groupByMonth(tournaments) {
  const groups = [];
  let current = null;
  for (const t of tournaments) {
    const key = MONTH_YEAR.format(new Date(t.start_date));
    if (!current || current.key !== key) {
      current = { key, rows: [] };
      groups.push(current);
    }
    current.rows.push(t);
  }
  return groups;
}

export default async function TournamentsPage() {
  const tournaments = await sql`
    SELECT * FROM tournaments
    WHERE is_active AND end_date >= CURRENT_DATE
    ORDER BY start_date ASC
  `;
  const groups = groupByMonth(tournaments);

  return (
    <div className={styles.pageHead}>
      <h1 className={`display ${styles.heading}`}>Tournaments</h1>
      <p className={styles.sub}>Upcoming tournaments from around the community.</p>

      {groups.length === 0 ? (
        <p className={styles.emptyNote}>No upcoming tournaments posted.</p>
      ) : (
        groups.map((group) => (
          <section key={group.key} className={styles.monthGroup}>
            <h2>{group.key}</h2>
            {group.rows.map((t) => (
              <div key={t.id} className={styles.row}>
                {t.image_url && (
                  <img src={t.image_url} alt="" className={styles.thumb} />
                )}
                <div className={styles.rowMain}>
                  <div className={styles.rowTop}>
                    <span className={styles.rowDate}>
                      {formatTournamentDateRange(t.start_date, t.end_date)}
                    </span>
                    {t.cost_display && <span className={styles.rowCost}>{t.cost_display}</span>}
                  </div>
                  <Link href={`/tournaments/${t.slug}`} className={styles.rowName}>
                    {t.name}
                  </Link>
                  {(t.venue_name || t.venue_address) && (
                    <div className={styles.rowVenue}>
                      {[t.venue_name, t.venue_address].filter(Boolean).join(" — ")}
                    </div>
                  )}
                  {t.body && <p className={styles.rowPreview}>{truncateBodyPreview(t.body)}</p>}
                  {t.website_url && (
                    <a
                      href={t.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.rowWebsite}
                    >
                      Website ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </section>
        ))
      )}
    </div>
  );
}
