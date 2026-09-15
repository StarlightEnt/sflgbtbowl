import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/layout/Navigation";
import StripeBar from "@/components/layout/StripeBar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "SF LGBT Bowlers — Wednesday Community Bowling",
  description:
    "A weekly LGBT bowling community in San Francisco. Come roll with us every Wednesday.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <Navigation authState="guest" />
        {children}
        <StripeBar />
        <Footer />
      </body>
    </html>
  );
}
