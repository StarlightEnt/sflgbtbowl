import type { Metadata } from "next";
import { Bungee, Inter } from "next/font/google";
import "./globals.css";

const bungee = Bungee({
  variable: "--font-bungee",
  weight: "400",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SF LGBT Wednesday Bowling — sflgbtbowl.com",
  description:
    "A weekly LGBT bowling community in San Francisco. Come roll with us every Wednesday.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bungee.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
