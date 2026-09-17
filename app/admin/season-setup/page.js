import { requireAdminPage } from "@/lib/requireAdminPage";
import SeasonSetupForm from "@/components/Admin/SeasonSetupForm";

// Admin-only — officers are admitted to /admin for Bowler
// Demographics/Announcements, but not this.
export default async function SeasonSetupPage() {
  await requireAdminPage();
  return <SeasonSetupForm />;
}
