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

test("parsing many times in a row does not leak or throw", async () => {
  const pdf = fs.readFileSync(path.join(root, "test-fixtures", `${fixtures[0]}.pdf`));
  for (let i = 0; i < 20; i++) await parseLeagueStandingsPDF(pdf);
});

test("a non-PDF buffer is rejected (route turns this into a 400)", async () => {
  await assert.rejects(() => parseLeagueStandingsPDF(Buffer.from("not a pdf")));
});
