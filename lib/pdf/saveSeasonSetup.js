// PATH: lib/pdf/saveSeasonSetup.js
//
// Persists a parsed League Standings + Schedule PDF pair as a new
// season. Pulled out of the API route so it can be exercised directly
// (e.g. against the real fixtures) without needing an authenticated
// HTTP request — the route itself still owns the isAdmin check, which
// is the actual security boundary, not this function.

import { Pool } from "@neondatabase/serverless";
import { resolveScheduleDates, slashDateToISO } from "./dates.js";
import { LGBT_WEDNESDAY_LEAGUE_SLUG } from "../leagueSlug.js";

export class ValidationError extends Error {}

export async function saveSeasonSetup({
  seasonName,
  standings,
  standingsFileUrl,
  schedule,
  abbreviations,
  matchedBowlers,
  newBowlers,
  uploadedBy,
}) {
  // Abbreviations are case-preserved for display but case-insensitive
  // for uniqueness — reject duplicates before writing anything.
  const seen = new Set();
  for (const team of standings.teams) {
    const abbr = (abbreviations[team.team_number] ?? "").trim();
    if (!abbr) {
      throw new ValidationError(
        `Team ${team.team_number} (${team.team_name}) is missing an abbreviation`
      );
    }
    const key = abbr.toLowerCase();
    if (seen.has(key)) throw new ValidationError(`Duplicate abbreviation: "${abbr}"`);
    seen.add(key);
  }

  // The Standings PDF's own header date is the real Week 1 date (with a
  // year, unlike the Schedule PDF's "MM/DD"-only week rows), so it's
  // also used as the season's start date.
  const seasonStartISO = slashDateToISO(standings.week_date);
  const scheduleWithDates = resolveScheduleDates(schedule, seasonStartISO);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const leagueRes = await client.query(
      `INSERT INTO leagues (name, slug, day_of_week, venue)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      ["LGBT Wednesday Community", LGBT_WEDNESDAY_LEAGUE_SLUG, "Wednesday", "Classic Bowling Center"]
    );
    const leagueId = leagueRes.rows[0].id;

    const seasonRes = await client.query(
      `INSERT INTO seasons (league_id, name, start_date) VALUES ($1, $2, $3) RETURNING id`,
      [leagueId, seasonName, seasonStartISO]
    );
    const seasonId = seasonRes.rows[0].id;

    const teamIdByNumber = new Map();
    for (const team of standings.teams) {
      const isBye = team.bowlers.length === 0;
      const abbr = abbreviations[team.team_number].trim();
      const res = await client.query(
        `INSERT INTO teams (season_id, team_number, team_name, abbreviation, is_bye)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [seasonId, team.team_number, team.team_name, abbr, isBye]
      );
      teamIdByNumber.set(team.team_number, res.rows[0].id);
    }

    // Bowler identity is resolved before this function ever runs — see
    // lib/pdf/matchSeasonBowlers.js and the admin's review step in
    // SeasonSetupForm.js. `matchedBowlers` are returning bowlers
    // (exact or admin-confirmed match) getting a new season's
    // membership; `newBowlers` are people with no reasonable match in
    // the database at all, so a fresh bowlers row is created for them.
    // Neither list includes "VACANT" placeholder roster spots — those
    // were already filtered out by the matcher.
    for (const row of matchedBowlers) {
      const teamId = row.teamNumber === null ? null : teamIdByNumber.get(row.teamNumber);
      await client.query(
        `INSERT INTO league_memberships
           (bowler_id, season_id, team_id, real_average, is_captain, is_substitute)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [row.bowlerId, seasonId, teamId, row.realAverage, row.isCaptain, teamId === null]
      );
    }

    for (const row of newBowlers) {
      const teamId = row.teamNumber === null ? null : teamIdByNumber.get(row.teamNumber);
      const bowlerRes = await client.query(
        `INSERT INTO bowlers (first_name, last_name) VALUES ($1, $2) RETURNING id`,
        [row.firstName, row.lastName]
      );
      await client.query(
        `INSERT INTO league_memberships
           (bowler_id, season_id, team_id, real_average, is_captain, is_substitute)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [bowlerRes.rows[0].id, seasonId, teamId, row.realAverage, row.isCaptain, teamId === null]
      );
    }

    const sheetRes = await client.query(
      `INSERT INTO standing_sheets (season_id, week_number, file_url, uploaded_by)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [seasonId, standings.week_number, standingsFileUrl, uploadedBy]
    );
    const sheetId = sheetRes.rows[0].id;

    for (const row of standings.team_standings) {
      const teamId = teamIdByNumber.get(row.team_number);
      if (!teamId) continue;
      await client.query(
        `INSERT INTO team_standings
           (standing_sheet_id, season_id, week_number, team_id, points_won, points_lost, pct_won)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [sheetId, seasonId, standings.week_number, teamId, row.points_won, row.points_lost, row.pct_won]
      );
    }

    for (const row of standings.weekly_results) {
      const teamAId = teamIdByNumber.get(row.team_a_number);
      const teamBId = teamIdByNumber.get(row.team_b_number);
      if (!teamAId || !teamBId) continue;
      await client.query(
        `INSERT INTO weekly_results
           (standing_sheet_id, season_id, week_number, lane_pair, team_a_id, team_a_points, team_b_id, team_b_points)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [sheetId, seasonId, standings.week_number, row.lane_pair, teamAId, row.team_a_points, teamBId, row.team_b_points]
      );
    }

    for (const week of scheduleWithDates) {
      const lanePositions = week.lane_positions
        ? JSON.stringify(
            week.lane_positions.map((p) => ({
              lanes: p.lanes,
              team_a_id: teamIdByNumber.get(p.team_a_number) ?? null,
              team_b_id: teamIdByNumber.get(p.team_b_number) ?? null,
            }))
          )
        : null;

      await client.query(
        `INSERT INTO schedule
           (season_id, week_number, week_date, starting_lane, is_position_round, is_roll_off, lane_positions)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          seasonId,
          week.week_number,
          week.week_date,
          week.starting_lane,
          week.is_position_round,
          week.is_roll_off,
          lanePositions,
        ]
      );
    }

    await client.query("COMMIT");
    return { seasonId };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}
