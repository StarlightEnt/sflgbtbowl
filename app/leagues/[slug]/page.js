import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { formatPoints, formatRecord } from "@/lib/formatPoints";
import VenueLink from "@/components/Venues/VenueLink";
import PrebowlForm from "@/components/Dashboard/PrebowlForm";
import StandingSheetsDownload from "@/components/Dashboard/StandingSheetsDownload";
import styles from "./page.module.scss";

export default async function LeagueDashboardPage({ params }) {
  const { slug } = await params;

  const leagueRows = await sql`
    SELECT l.*, v.name AS venue_name, v.slug AS venue_slug, v.city AS venue_city,
           v.state AS venue_state, v.is_visible AS venue_is_visible
    FROM leagues l
    LEFT JOIN venues v ON v.id = l.venue_id
    WHERE l.slug = ${slug}
  `;
  const league = leagueRows[0];
  if (!league) notFound();

  const seasonRows = await sql`
    SELECT * FROM seasons WHERE league_id = ${league.id} ORDER BY id DESC LIMIT 1
  `;
  const season = seasonRows[0];

  if (!season) {
    return (
      <div className={styles.pageHead}>
        <h1 className={`display ${styles.heading}`}>{league.name}</h1>
        <p>Season setup for this league hasn&apos;t happened yet — check back soon.</p>
      </div>
    );
  }

  const teamRows = await sql`
    SELECT id, team_number, team_name, abbreviation, is_bye
    FROM teams WHERE season_id = ${season.id}
  `;
  const teamsById = new Map(teamRows.map((t) => [t.id, t]));

  const [{ last_week: lastCompletedWeek }] = await sql`
    SELECT MAX(week_number) AS last_week FROM weekly_results WHERE season_id = ${season.id}
  `;

  const thisWeekNumber = lastCompletedWeek ? lastCompletedWeek + 1 : 1;

  const [totalWeeksRows, thisWeekScheduleRows, lastWeekResults, teamStandings, standingSheets, scheduleWeeks] = await Promise.all([
    sql`SELECT MAX(week_number) AS total_weeks FROM schedule WHERE season_id = ${season.id}`,
    sql`
      SELECT * FROM schedule WHERE season_id = ${season.id} AND week_number = ${thisWeekNumber}
    `,
    lastCompletedWeek
      ? sql`
          SELECT * FROM weekly_results
          WHERE season_id = ${season.id} AND week_number = ${lastCompletedWeek}
          ORDER BY (split_part(lane_pair, '-', 1))::int
        `
      : Promise.resolve([]),
    lastCompletedWeek
      ? sql`
          SELECT * FROM team_standings
          WHERE season_id = ${season.id} AND week_number = ${lastCompletedWeek}
          ORDER BY pct_won DESC, points_won DESC
        `
      : Promise.resolve([]),
    sql`
      SELECT ss.*, sc.week_date
      FROM standing_sheets ss
      LEFT JOIN schedule sc ON sc.season_id = ss.season_id AND sc.week_number = ss.week_number
      WHERE ss.season_id = ${season.id}
      ORDER BY ss.week_number ASC
    `,
    sql`
      SELECT week_number, week_date FROM schedule
      WHERE season_id = ${season.id}
      ORDER BY week_number ASC
    `,
  ]);

  // Not season-scoped (announcements table has no FK) — same query
  // shape as GET /api/announcements, read directly here rather than
  // self-fetching that route, matching how every other section of
  // this server component reads its data.
  const announcements = await sql`
    SELECT id, title, body, is_pinned, created_at
    FROM announcements
    ORDER BY is_pinned DESC, created_at DESC
  `;

  const totalWeeks = totalWeeksRows[0]?.total_weeks ?? null;
  const thisWeekSchedule = thisWeekScheduleRows[0] ?? null;
  const standingsRows = teamStandings.filter((row) => !teamsById.get(row.team_id)?.is_bye);

  const session = await auth();
  const email = session?.user?.email ?? null;

  let prebowlAuthState = "signed-out";
  let captainTeam = null;
  if (email) {
    const bowlerRows = await sql`SELECT id FROM bowlers WHERE email = ${email}`;
    if (bowlerRows.length > 0) {
      const membershipRows = await sql`
        SELECT lm.team_id, t.team_name
        FROM league_memberships lm
        JOIN teams t ON t.id = lm.team_id
        WHERE lm.bowler_id = ${bowlerRows[0].id}
          AND lm.season_id = ${season.id}
          AND lm.is_captain = true
      `;
      if (membershipRows.length > 0) {
        prebowlAuthState = "captain";
        captainTeam = { id: membershipRows[0].team_id, name: membershipRows[0].team_name };
      } else {
        prebowlAuthState = "not-captain";
      }
    } else {
      prebowlAuthState = "not-captain";
    }
  }

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1 className={`display ${styles.heading}`}>{league.name}</h1>
          <p className={styles.seasonName}>{season.name} Season</p>
          <p className={styles.venue}>
            {league.day_of_week}
            {league.venue_name && " · "}
            <VenueLink league={league} />
          </p>
        </div>
        <div className={styles.weekBadge}>
          WEEK {thisWeekNumber}
          {totalWeeks ? ` OF ${totalWeeks}` : ""}
        </div>
      </div>

      {lastCompletedWeek && (
        <section className={styles.section}>
          <h2>
            Last week&apos;s results <span className={styles.wkTag}>WK {lastCompletedWeek}</span>
          </h2>
          <div className={styles.scoreboardWrap}>
            <div className={styles.scoreboardRow}>
              {lastWeekResults.map((row) => {
                const teamA = teamsById.get(row.team_a_id);
                const teamB = teamsById.get(row.team_b_id);
                const aWins = Number(row.team_a_points) > Number(row.team_b_points);
                const bWins = Number(row.team_b_points) > Number(row.team_a_points);
                return (
                  <div
                    key={row.id}
                    className={styles.scoreBox}
                    title={`${teamA?.team_name} vs ${teamB?.team_name} — Lanes ${row.lane_pair}`}
                  >
                    <div className={`${styles.row} ${aWins ? styles.win : ""}`}>
                      <span className={styles.code}>{teamA?.abbreviation}</span>
                      <span className={styles.pts}>{formatPoints(row.team_a_points)}</span>
                    </div>
                    <div className={`${styles.row} ${bWins ? styles.win : ""}`}>
                      <span className={styles.code}>{teamB?.abbreviation}</span>
                      <span className={styles.pts}>{formatPoints(row.team_b_points)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className={styles.section}>
        <div className={styles.twoCol}>
          <div className={styles.colStack}>
            <div className={styles.card}>
              <h2>
                This week&apos;s schedule <span className={styles.wkTag}>WK {thisWeekNumber}</span>
              </h2>
              {thisWeekSchedule ? (
                thisWeekSchedule.lane_positions?.map((pos) => {
                  const teamA = teamsById.get(pos.team_a_id);
                  const teamB = teamsById.get(pos.team_b_id);
                  return (
                    <div key={pos.lanes} className={styles.scheduleItem}>
                      <span className={styles.laneTag}>Lanes {pos.lanes}</span>
                      <span className={styles.matchup}>
                        {teamA?.team_name} vs {teamB?.team_name}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className={styles.emptyNote}>Schedule for this week isn&apos;t posted yet.</p>
              )}
            </div>

            <div className={styles.card}>
              <h2>Schedule a pre-bowl or makeup</h2>
              <p className={styles.prebowlIntro}>
                Only Team Captains will be able to request pre-bowl or makeup games for a week
                they can&apos;t make it. Please select your team from the drop down list below,
                choose pre-bowl or makeup from the two choices, and select the date you will have
                completed the pre-bowl or makeup.
              </p>
              <PrebowlForm
                authState={prebowlAuthState}
                team={captainTeam}
                seasonId={season.id}
                weeks={scheduleWeeks}
              />
            </div>
          </div>

          <div className={styles.colStack}>
            <div className={styles.card}>
              <h2>Team standings</h2>
              {standingsRows.length > 0 ? (
                <table className={styles.standings}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Team</th>
                      <th className={styles.num}>W&ndash;L</th>
                      <th className={styles.num}>%Won</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standingsRows.map((row, i) => {
                      const team = teamsById.get(row.team_id);
                      return (
                        <tr key={row.id}>
                          <td>{i + 1}</td>
                          <td>{team?.team_name}</td>
                          <td className={styles.num}>
                            {formatRecord(row.points_won, row.points_lost)}
                          </td>
                          <td className={styles.num}>{Number(row.pct_won).toFixed(1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className={styles.emptyNote}>
                  Standings will appear here once Week 1 results are in.
                </p>
              )}
            </div>

            <div className={styles.card}>
              <h2>Download standing sheets</h2>
              <p className={styles.cardSub}>
                Full stats — season high scores, bowler averages, and rosters — live in the
                original PDF for any week.
              </p>
              <StandingSheetsDownload sheets={standingSheets} />
            </div>

            {league.bowl_com_lss_id && (
              <div className={`${styles.card} ${styles.historyCard}`}>
                <h2>League History</h2>
                <p className={styles.cardSub}>
                  Looking for a past season? Full results for {league.name} live on bowl.com.
                </p>
                <div className={styles.historyRow}>
                  <span className={styles.historyLabel}>League Standing Sheet #</span>
                  <span className={`display ${styles.historyId}`}>{league.bowl_com_lss_id}</span>
                </div>
                <a
                  href={`https://lss.bowl.com/leagueStandingSheets/ViewSearchLeagueServlet?ssid=${league.bowl_com_lss_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                >
                  View on bowl.com ↗
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Announcements</h2>
        {announcements.length === 0 ? (
          <div className={styles.announceCard}>No announcements posted yet. Check back soon.</div>
        ) : (
          <div className={styles.announceList}>
            {announcements.map((a) => (
              <div key={a.id} className={styles.announceCard}>
                <div className={styles.announceTop}>
                  {a.is_pinned && <span className={styles.pinBadge}>📌 Pinned</span>}
                  <span className={styles.announceTitle}>{a.title}</span>
                  <span className={styles.announceDate}>
                    {new Date(a.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </span>
                </div>
                <p className={styles.announceBody}>{a.body}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
