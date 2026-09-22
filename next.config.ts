import type { NextConfig } from "next";

// pdfjs-dist imports its worker file dynamically at runtime, which the
// output file tracer can't see — without this, Vercel deploys the
// function without pdf.worker.mjs and every parse fails.
const pdfjsWorker = ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"];

const nextConfig: NextConfig = {
  // pdfjs-dist resolves its own worker file at runtime; bundling it breaks
  // that lookup, so load it as a plain Node module (lib/pdf/parseLeagueStandings.js).
  serverExternalPackages: ["pdfjs-dist"],
  outputFileTracingIncludes: {
    "/api/admin/weekly/parse": pdfjsWorker,
    "/api/admin/season-setup/parse-standings": pdfjsWorker,
  },
};

export default nextConfig;
