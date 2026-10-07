// Regression test for lib/pdf/parseLeagueStandings.js: parsing each real
// fixture PDF must produce exactly the output captured in tests/golden/
// (generated from the parser as it stood before the pdfjs-options change).
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseLeagueStandingsPDF } from "../lib/pdf/parseLeagueStandings.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = ["LGBT_Wed_LeagueStandings-Wk01", "LeagueStandingSheet-Wk02aFinal"];

for (const name of fixtures) {
  test(`parses ${name} identically to the golden output`, async () => {
    const pdf = fs.readFileSync(path.join(root, "test-fixtures", `${name}.pdf`));
    const golden = JSON.parse(fs.readFileSync(path.join(root, "tests", "golden", `${name}.json`), "utf8"));
    const actual = JSON.parse(JSON.stringify(await parseLeagueStandingsPDF(pdf)));
    assert.deepEqual(actual, golden);
    assert.ok(actual.teams.length >= 13, "expected a full roster");
    assert.ok(actual.team_standings.length >= 13, "expected a full standings table");
  });
}

// GG Wk03: standings rows 7-10 print "# + Team Name" 1.2pt above the
// rest of the row, and team 2 (renamed "2 Men & a Lady") still appears
// under its old name "Striking Young Lads" in Review of Last Week.
const ggWk03 = () => fs.readFileSync(path.join(root, "test-fixtures", "GGWeeklyStandingSheet-Wk03.pdf"));
const record = (result) =>
  Object.fromEntries(result.team_standings.map((s) => [s.team_number, `${s.points_won}-${s.points_lost}`]));

test("GG Wk03: all 10 standings rows parse, including the split rows 7-10", async () => {
  const result = await parseLeagueStandingsPDF(ggWk03());
  assert.equal(result.team_standings.length, 10);
  assert.deepEqual(record(result), {
    1: "9-3", 8: "8-4", 6: "7-5", 7: "7-5", 5: "6-6",
    10: "6-6", 4: "5-7", 9: "5-7", 2: "4-8", 3: "3-9",
  });
  assert.equal(result.team_standings.find((s) => s.team_number === 2).team_name, "2 Men & a Lady");
});

test("GG Wk03: a renamed team's matchup resolves through its prior name", async () => {
  const result = await parseLeagueStandingsPDF(ggWk03(), {
    priorNames: new Map([[2, ["Striking Young Lads"]]]),
  });
  assert.equal(result.weekly_results.length, 5);
  assert.deepEqual(
    result.weekly_results.find((r) => r.lane_pair === "21-22"),
    { lane_pair: "21-22", team_a_number: 3, team_a_points: 1, team_b_number: 2, team_b_points: 3 }
  );
  assert.deepEqual(result.warnings, []);
});

test("GG Wk03: without prior names the matchup is dropped with a warning, not silently", async () => {
  const result = await parseLeagueStandingsPDF(ggWk03());
  assert.equal(result.weekly_results.length, 4);
  assert.ok(!result.weekly_results.some((r) => r.lane_pair === "21-22"));
  assert.equal(result.warnings.length, 1);
  assert.equal(result.warnings[0].section, "Review of Last Week");
  assert.equal(result.warnings[0].rawName, "Striking Young Lads");
  assert.match(result.warnings[0].rowText, /^21-22 /);
});

test("parsing many times in a row does not leak or throw", async () => {
  const pdf = fs.readFileSync(path.join(root, "test-fixtures", `${fixtures[0]}.pdf`));
  for (let i = 0; i < 20; i++) await parseLeagueStandingsPDF(pdf);
});

test("a non-PDF buffer is rejected (route turns this into a 400)", async () => {
  await assert.rejects(() => parseLeagueStandingsPDF(Buffer.from("not a pdf")));
});
