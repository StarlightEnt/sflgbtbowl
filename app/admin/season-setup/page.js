import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth-helpers";
import SeasonSetupForm from "@/components/Admin/SeasonSetupForm";

// This page-level check is a convenience, not the security boundary —
// the API routes it calls (app/api/admin/season-setup/*) gate
// themselves independently with the same isAdmin check.
export default async function SeasonSetupPage() {
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!email || !(await isAdmin(email))) {
    redirect("/signin");
  }

  return <SeasonSetupForm />;
}
