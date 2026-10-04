import { timingSafeEqual } from "node:crypto";
import { getCurrentSeason } from "@/lib/currentSeason";
import { ingestFinanceSnapshot, SnapshotError } from "@/lib/finance/ingest";

const MAX_BODY_BYTES = 500_000;

function secretMatches(header) {
  const expected = process.env.FINANCE_SYNC_SECRET;
  if (!expected || !header || !header.startsWith("Bearer ")) return false;
  const given = Buffer.from(header.slice("Bearer ".length));
  const want = Buffer.from(expected);
  return given.length === want.length && timingSafeEqual(given, want);
}

// Called by the Google Apps Script attached to the treasurer's sheet.
// Not a login route: it is guarded only by the shared secret, so with no
// FINANCE_SYNC_SECRET configured it refuses everything. The ingest step
// validates the snapshot BEFORE writing, so a bad read changes nothing.
export async function POST(req) {
  if (!process.env.FINANCE_SYNC_SECRET) {
    return Response.json({ error: "Sync is not configured" }, { status: 503 });
  }
  if (!secretMatches(req.headers.get("authorization"))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return Response.json({ error: "Snapshot too large" }, { status: 413 });
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Body is not valid JSON" }, { status: 400 });
  }

  const slug = typeof payload?.league === "string" ? payload.league : "";
  const season = slug ? await getCurrentSeason(slug) : null;
  if (!season) {
    return Response.json({ error: "Unknown league" }, { status: 400 });
  }

  try {
    const result = await ingestFinanceSnapshot(season.id, payload.snapshot);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof SnapshotError) {
      // Rejected before anything was written; last good data stays.
      return Response.json({ error: err.message }, { status: 422 });
    }
    console.error("finance sync failed", err);
    return Response.json({ error: "Sync failed" }, { status: 500 });
  }
}
