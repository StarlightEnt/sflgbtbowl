import { redirect, notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { requireAdminPage } from "@/lib/requireAdminPage";

// Convenience only — every real link into Weekly Standing Sheet (the
// sidebar's per-league sections) already points at /admin/weekly/[slug]
// directly. This bare route exists for a stale bookmark or a typed
// URL; it just picks the first league on file rather than asking.
export default async function WeeklyIndexPage() {
  await requireAdminPage();

  const leagues = await sql`SELECT slug FROM leagues ORDER BY id ASC LIMIT 1`;
  if (leagues.length === 0) notFound();

  redirect(`/admin/weekly/${leagues[0].slug}`);
}
