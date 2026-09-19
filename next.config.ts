import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist resolves its own worker file at runtime; bundling it breaks
  // that lookup, so load it as a plain Node module (lib/pdf/parseLeagueStandings.js).
  serverExternalPackages: ["pdfjs-dist"],
};

export default nextConfig;
