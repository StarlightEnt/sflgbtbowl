import type { Metadata } from "next";
import "./globals.css";
import { auth } from "@/lib/auth";
import { isAdmin, isMember } from "@/lib/auth-helpers";
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
  const member = !admin && email ? await isMember(email) : false;
  const authState = admin ? "admin" : member ? "member" : "guest";

  return (
    <html lang="en">
      <body>
        <Navigation authState={authState} />
        {children}
        <StripeBar />
        <Footer />
      </body>
    </html>
  );
}
