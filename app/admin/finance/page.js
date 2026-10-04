import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdmin, isOfficer } from "@/lib/auth-helpers";
import { sql } from "@/lib/db";
import { getTeamFlagDetails } from "@/lib/teamFlags";
import FinanceManager from "@/components/Admin/FinanceManager";

// Officers and admins both see finances. The data checks here are the
// boundary for this page; the layout's check is only a convenience.
export default async function AdminFinancePage() {
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!email || !((await isAdmin(email)) || (await isOfficer(email)))) {
    redirect("/signin");
  }

  const seasons = await sql`
    SELECT s.id, s.name AS season_name, l.name AS league_name,
           to_char(fm.as_of, 'YYYY-MM-DD') AS as_of, fm.synced_at,
           to_char(fm.final2_deadline, 'YYYY-MM-DD') AS final2_deadline, fm.final2_threshold
    FROM finance_meta fm
    JOIN seasons s ON s.id = fm.season_id
    JOIN leagues l ON l.id = s.league_id
    ORDER BY s.id DESC
  `;

  const sections = [];
  for (const season of seasons) {
    const [rows, teams, roster, flags] = await Promise.all([
      sql`
        SELECT fr.id, fr.team_number, fr.team_name, fr.sheet_name, fr.weeks, fr.paid, fr.owed,
               fr.final2_applies, fr.final2_marked, fr.in_arrears, fr.bowler_id, fr.link_status,
               b.first_name, b.last_name
        FROM finance_rows fr
        LEFT JOIN bowlers b ON b.id = fr.bowler_id
        WHERE fr.season_id = ${season.id}
        ORDER BY fr.team_number, fr.id
      `,
      sql`SELECT id, team_number, team_name FROM teams WHERE season_id = ${season.id} AND NOT is_bye`,
      sql`
        SELECT b.id, b.first_name, b.last_name
        FROM league_memberships lm JOIN bowlers b ON b.id = lm.bowler_id
        WHERE lm.season_id = ${season.id}
        ORDER BY b.first_name, b.last_name
      `,
      getTeamFlagDetails(season.id),
    ]);

    // Resolve each sheet team to a site team: by name first, then number.
    const byName = new Map(teams.map((t) => [(t.team_name ?? "").trim().toLowerCase(), t.id]));
    const byNumber = new Map(teams.map((t) => [t.team_number, t.id]));
    const teamIdFor = (r) =>
      byName.get((r.team_name ?? "").trim().toLowerCase()) ?? byNumber.get(r.team_number) ?? null;

    sections.push({
      id: season.id,
      title: `${season.league_name} — ${season.season_name}`,
      asOf: season.as_of,
      syncedAt: season.synced_at,
      final2Deadline: season.final2_deadline,
      rows: rows.map((r) => ({
        id: r.id,
        teamNumber: r.team_number,
        teamName: r.team_name,
        teamId: teamIdFor(r),
        sheetName: r.sheet_name,
        siteName: r.bowler_id ? `${r.first_name} ${r.last_name}` : null,
        bowlerId: r.bowler_id,
        linkStatus: r.link_status,
        weeks: r.weeks,
        paid: Number(r.paid),
        owed: Number(r.owed),
        final2Applies: r.final2_applies,
        final2Marked: r.final2_marked,
        inArrears: r.in_arrears,
      })),
      roster: roster.map((b) => ({ id: b.id, name: `${b.first_name} ${b.last_name}` })),
      flags: flags.map((f) => ({
        teamId: f.team_id,
        source: f.source,
        reason: f.reason,
        setAt: f.set_at,
      })),
    });
  }

  return <FinanceManager sections={sections} />;
}
