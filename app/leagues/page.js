import Link from "next/link";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import styles from "./page.module.scss";

export default async function LeaguesHubPage() {
  const leagues = await sql`SELECT * FROM leagues ORDER BY id ASC`;

  // A signed-in member with no leagueContext cookie yet lands here from
  // the Member pill (see app/layout.tsx's memberHref fallback) — this
  // note is what tells them why, instead of the picker just appearing
  // silently. Cookie is set by proxy.js the moment they pick one.
  const cookieStore = await cookies();
  const hasContext = Boolean(cookieStore.get("leagueContext")?.value);

  const cards = await Promise.all(
    leagues.map(async (league) => {
      const seasonRows = await sql`
        SELECT * FROM seasons WHERE league_id = ${league.id} ORDER BY id DESC LIMIT 1
      `;
      const season = seasonRows[0] ?? null;

      let totalWeeks = null;
      let teamCount = 0;
      let byeCount = 0;
      if (season) {
        const [{ total_weeks }] = await sql`
          SELECT MAX(week_number) AS total_weeks FROM schedule WHERE season_id = ${season.id}
        `;
        totalWeeks = total_weeks;

        const teamRows = await sql`
          SELECT is_bye FROM teams WHERE season_id = ${season.id}
        `;
        teamCount = teamRows.filter((t) => !t.is_bye).length;
        byeCount = teamRows.filter((t) => t.is_bye).length;
      }

      return { league, season, totalWeeks, teamCount, byeCount };
    })
  );

  return (
    <div className={styles.pageWrap}>
      <h1 className={`display ${styles.heading}`}>Choose Your League</h1>
      <p className={styles.intro}>
        Standings, schedules, rosters and results for each of our leagues — pick one to see the
        current season.
      </p>
      {!hasContext && (
        <p className={styles.contextNote}>Select a league below to get started.</p>
      )}

      <div className={styles.grid}>
        {cards.map(({ league, season, totalWeeks, teamCount, byeCount }) => (
          <div key={league.id} className={styles.card}>
            <div className={styles.dayTag}>{league.day_of_week} League</div>
            <div className={`display ${styles.leagueName}`}>{league.name}</div>
            <div className={styles.venue}>
              {league.day_of_week} · {league.venue}
            </div>
            <div className={styles.meta}>
              {season ? (
                <>
                  {totalWeeks ? `${totalWeeks}-week season` : season.name}
                  {teamCount > 0 &&
                    ` · ${teamCount} team${teamCount === 1 ? "" : "s"}${byeCount > 0 ? " + BYE" : ""}`}
                </>
              ) : (
                "Season setup coming soon"
              )}
            </div>
            <div className={styles.viewLink}>
              <Link href={`/leagues/${league.slug}`} className="btn">
                View League →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
