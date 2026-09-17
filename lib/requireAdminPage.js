// PATH: lib/requireAdminPage.js
//
// app/admin/layout.js now admits isAdmin || isOfficer (officers need
// to reach Bowler Demographics/Announcements), so it's no longer a
// safe stand-in for "this page is admin-only." Every admin-only page
// under /admin (Season Setup, Weekly, Schedule, By-Laws, Tournaments,
// Officers, Admin Settings) calls this first to re-assert its own
// boundary — same "convenience check, not the real boundary" rule as
// always; the real boundary is still each mutating API route's own
// isAdmin check.

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth-helpers";

export async function requireAdminPage() {
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!email || !(await isAdmin(email))) {
    redirect("/admin/announcements");
  }
  return email;
}
