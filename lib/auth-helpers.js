import { sql } from "./db.js";

// These are the actual security boundary. Any admin or member
// route/API must call these itself, every time — never rely on
// middleware/proxy or a cached session flag as the real gate.

export async function isAdmin(email) {
  if (!email) return false;
  const rows = await sql`SELECT 1 FROM admin_emails WHERE email = ${email}`;
  return rows.length > 0;
}

export async function isMember(email) {
  if (!email) return false;
  if (await isAdmin(email)) return true;
  const rows = await sql`SELECT 1 FROM bowlers WHERE email = ${email}`;
  return rows.length > 0;
}

// Officers are existing bowlers granted extra rights via the officers
// table (not a separate email allowlist like admin_emails) — role
// membership is always derived fresh here, never cached. isAdmin is a
// superset everywhere this is checked: every officer-gated route/page
// allows isAdmin(email) || isOfficer(email), never requires both.
export async function isOfficer(email) {
  if (!email) return false;
  const rows = await sql`
    SELECT 1 FROM officers o
    JOIN bowlers b ON b.id = o.bowler_id
    WHERE b.email = ${email}
  `;
  return rows.length > 0;
}
