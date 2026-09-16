import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth-helpers";
import { sql } from "@/lib/db";
import { parseLeagueStandingsPDF } from "@/lib/pdf/parseLeagueStandings";
import { matchSeasonBowlers } from "@/lib/pdf/matchSeasonBowlers";
import { put } from "@vercel/blob";

// This route, not the page it's used from, is the real security
// boundary — a hidden page is never enough on its own.
export async function POST(req) {
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!email || !(await isAdmin(email))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return Response.json({ error: "Missing file" }, { status: 400 });
  }

  const pdfParse = (await import("pdf-parse")).default;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let text;
  try {
    const data = await pdfParse(buffer);
    text = data.text;
  } catch {
    return Response.json({ error: "Could not read PDF" }, { status: 400 });
  }

  const result = parseLeagueStandingsPDF(text);
  if (!result.week_number || result.teams.length === 0) {
    return Response.json(
      { error: "Could not find a Team Rosters section — is this a League Standings PDF?" },
      { status: 400 }
    );
  }

  const blob = await put(`standing-sheets/wk${result.week_number}-${file.name}`, buffer, {
    access: "public",
    addRandomSuffix: true,
    contentType: "application/pdf",
  });

  const counts = {
    teams: result.teams.length,
    bowlers: result.teams.reduce((sum, t) => sum + t.bowlers.length, 0),
    subs: result.subs.length,
    captains:
      result.teams.reduce((sum, t) => sum + t.bowlers.filter((b) => b.is_captain).length, 0) +
      result.subs.filter((s) => s.is_captain).length,
  };

  // Matched globally against the whole bowler database (every season,
  // every league) — not scoped to any one season — so a returning
  // bowler keeps the same bowlers.id instead of getting a fresh row
  // every time a new season is set up. See matchSeasonBowlers.js.
  const existingBowlers = await sql`SELECT id, first_name, last_name, nickname FROM bowlers`;
  const diff = matchSeasonBowlers({
    parsedTeams: result.teams,
    parsedSubs: result.subs,
    existingBowlers,
  });

  return Response.json({
    result,
    counts,
    fileUrl: blob.url,
    fileName: file.name,
    matchedExact: diff.matchedExact,
    possibleMatches: diff.possibleMatches,
    newBowlers: diff.newBowlers,
  });
}
