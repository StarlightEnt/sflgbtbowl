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
