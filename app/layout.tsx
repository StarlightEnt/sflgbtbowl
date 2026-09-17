import type { Metadata } from "next";
import "./globals.css";
import { auth } from "@/lib/auth";
import { isAdmin, isMember, isOfficer } from "@/lib/auth-helpers";
import Navigation from "@/components/layout/Navigation";
import StripeBar from "@/components/layout/StripeBar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "SF LGBT Bowlers — Wednesday Community Bowling",
  description:
    "A weekly LGBT bowling community in San Francisco. Come roll with us every Wednesday.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  const email = session?.user?.email ?? null;

  const admin = email ? await isAdmin(email) : false;
  // isMember() already treats admins as members too (a superset), so
  // this is true for every admin regardless of whether they also have
  // a linked bowler row — both pills can show at once.
  const member = email ? await isMember(email) : false;
  const officer = !admin && email ? await isOfficer(email) : false;

  return (
    <html lang="en">
      <body>
        <Navigation isAdminUser={admin} isMemberUser={member} isOfficerUser={officer} />
        {children}
        <StripeBar />
        <Footer />
      </body>
    </html>
  );
}
