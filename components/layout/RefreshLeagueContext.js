"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

// Forces app/layout.tsx to re-run on every visit to a /leagues/{slug}...
// page. Needed because Next's App Router can keep a shared layout's
// already-rendered output across client-side <Link> navigations, so
// switching leagues from the hub updates the URL and page content but
// can leave the Member pill in app/layout.tsx pointing at whichever
// league's cookie was in place on the *previous* full page load — stale
// until a hard refresh. router.refresh() re-fetches and re-renders the
// server component tree for the current route, including layouts,
// without a full reload — that's what picks up the leagueContext cookie
// proxy.js just set and recomputes memberHref with the right value.
//
// Depends on `pathname` (not an empty deps array / mount-only effect) so
// this fires on every league-to-league switch even if Next reuses the
// same layout component instance across param changes — going from
// /leagues/gg to /leagues/lwc, or from a league's dashboard to its
// roster page, both change the pathname and both should re-sync.
export default function RefreshLeagueContext() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    router.refresh();
  }, [pathname, router]);

  return null;
}
