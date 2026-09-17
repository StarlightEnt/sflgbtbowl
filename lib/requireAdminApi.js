// PATH: lib/requireAdminApi.js
//
// The same 3-line admin-auth-check block (and, for Announcements, the
// isAdmin-or-isOfficer variant) was copy-pasted across every mutating
// admin API route in this repo. Centralizing it here means a future
// change to the gate (logging, rate-limiting, a new role) happens in
// one place instead of N call sites where one could be missed — and
// there's one spot to audit that every admin route enforces the check
// correctly. This route-level check remains the real security
// boundary, same as always — nothing here changes that, it's a
// dedupe, not a design change.

import { auth } from "./auth.js";
import { isAdmin, isOfficer } from "./auth-helpers.js";

const FORBIDDEN = () => Response.json({ error: "Forbidden" }, { status: 403 });

// Admin-only routes: Season Setup, Weekly, Schedule, By-Laws,
// Tournaments, Officers, Admin Settings.
export async function requireAdminApi() {
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!email || !(await isAdmin(email))) {
    return { email: null, forbidden: FORBIDDEN() };
  }
  return { email, forbidden: null };
}

// Admin-or-officer routes: Announcements only.
export async function requireAdminOrOfficerApi() {
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!email || (!(await isAdmin(email)) && !(await isOfficer(email)))) {
    return { email: null, forbidden: FORBIDDEN() };
  }
  return { email, forbidden: null };
}
