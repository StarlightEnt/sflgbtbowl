import RefreshLeagueContext from "@/components/layout/RefreshLeagueContext";

// Wraps both the league dashboard (./page.js) and the roster page
// (./roster/page.js) — both are "a /leagues/{slug} page" for the
// purposes of the leagueContext cookie, and both need the pill kept in
// sync. See RefreshLeagueContext.js for why this is needed at all.
export default function LeagueSlugLayout({ children }) {
  return (
    <>
      <RefreshLeagueContext />
      {children}
    </>
  );
}
