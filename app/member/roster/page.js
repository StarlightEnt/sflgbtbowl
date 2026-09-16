import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isMember } from "@/lib/auth-helpers";
import { sql } from "@/lib/db";
import { getCurrentSeason } from "@/lib/currentSeason";
import MemberRoster from "@/components/Member/MemberRoster";
import styles from "@/components/Member/MemberRoster.module.scss";

// This page-level check is a convenience, not the security boundary —
// the API routes it calls (app/api/member/*) gate themselves
// independently with the same isMember check (and, for the bowler
// detail/edit route, real per-bowler scoping on top of that).
export default async function MemberRosterPage() {
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!email) {
    redirect("/signin");
  }

  const member = await isMember(email);
  if (!member) {
    return (
      <div className={styles.pageHead}>
        <h1 className="display">Member Area</h1>
        <p>
          We don&apos;t recognize this account yet — contact an officer to get your bowler
          record linked to your sign-in email.
        </p>
      </div>
    );
  }

  const season = await getCurrentSeason();
  if (!season) {
    return (
      <div className={styles.pageHead}>
        <h1 className="display">Member Area</h1>
        <p>No season is set up yet — check back soon.</p>
      </div>
    );
  }

  const teamRows = await sql`
    SELECT id, team_number, team_name FROM teams
    WHERE season_id = ${season.id} AND is_bye = false
    ORDER BY team_number
  `;
  const memberRows = await sql`
    SELECT lm.bowler_id, lm.team_id, lm.real_average, lm.is_captain, b.first_name, b.last_name
    FROM league_memberships lm
    JOIN bowlers b ON b.id = lm.bowler_id
    WHERE lm.season_id = ${season.id}
    ORDER BY b.first_name, b.last_name
  `;

  const membersByTeam = new Map();
  const subs = [];
  for (const m of memberRows) {
    const entry = {
      bowlerId: m.bowler_id,
      firstName: m.first_name,
      lastName: m.last_name,
      realAverage: Number(m.real_average),
      isCaptain: m.is_captain,
    };
    if (m.team_id) {
      if (!membersByTeam.has(m.team_id)) membersByTeam.set(m.team_id, []);
      membersByTeam.get(m.team_id).push(entry);
    } else {
      subs.push(entry);
    }
  }

  const teams = teamRows.map((t) => ({
    id: t.id,
    teamNumber: t.team_number,
    teamName: t.team_name,
    members: membersByTeam.get(t.id) ?? [],
  }));

  return <MemberRoster teams={teams} subs={subs} />;
}
