import SeasonSetupForm from "@/components/Admin/SeasonSetupForm";

// isAdmin is gated in app/admin/layout.js, shared by every admin page.
export default function SeasonSetupPage() {
  return <SeasonSetupForm />;
}
