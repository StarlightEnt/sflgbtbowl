// Load a finance snapshot JSON file into the DB (dev/manual path; the
// scheduled sync will call the same ingestFinanceSnapshot function).
//
// node --use-system-ca --env-file=.env.local scripts/ingest-finance-snapshot.mjs <league-slug> <snapshot.json>
//
// The snapshot contains real names and money figures: keep it OUT of git.

import { readFileSync } from "node:fs";
import { sql } from "../lib/db.js";
import { getCurrentSeason } from "../lib/currentSeason.js";
import { ingestFinanceSnapshot } from "../lib/finance/ingest.js";

const [slug, file] = process.argv.slice(2);
if (!slug || !file) {
  const leagues = await sql`SELECT slug, name FROM leagues ORDER BY id`;
  console.log("Usage: ingest-finance-snapshot.mjs <league-slug> <snapshot.json>");
  console.log("League slugs:", leagues.map((l) => `${l.slug} (${l.name})`).join(", "));
  process.exit(1);
}

const season = await getCurrentSeason(slug);
if (!season) {
  console.error(`No season found for league slug "${slug}"`);
  process.exit(1);
}

const snapshot = JSON.parse(readFileSync(file, "utf8"));
const result = await ingestFinanceSnapshot(season.id, snapshot);
console.log("Ingested into season", season.id, season.name, result);
