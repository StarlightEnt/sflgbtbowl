import { NextResponse } from "next/server";

const LEAGUE_COOKIE_NAME = "leagueContext";
const LEAGUE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// Convenience redirect only — NOT the security boundary. Every
// /admin and /member route/page must call isAdmin()/isMember() from
// lib/auth-helpers.js itself, on every request. This proxy just saves
// a signed-out visitor a wasted click; it is never sufficient on its
// own, same principle as the Danger Zone: hiding a button in the UI
// is never enough.
//
// This deliberately checks for the session cookie directly rather than
// calling next-auth's `auth()` wrapper here: wrapping the database-backed
// `auth` export (required elsewhere for the Neon adapter's per-request
// Pool) breaks Next's Proxy function-detection in this Next/Auth.js
// version combination. A cheap cookie-presence check is all a UX
// convenience redirect needs anyway.
export function proxy(req) {
  const { pathname } = req.nextUrl;

  // Sets the "leagueContext" cookie whenever a request lands on any
  // /leagues/{slug}... page (the dashboard or the roster page) — what
  // makes a picked league "sticky" across navigation and through login,
  // and what drives the Member pill in app/layout.tsx. Has to happen
  // here rather than in the page: Next only allows cookies to be written
  // from a Server Action, Route Handler, or Proxy — not a Server
  // Component's render. Next 16 renamed "middleware" to "proxy" and
  // rejects having both files, so this lives in the existing proxy.
  //
  // A bad/unknown slug is harmless: the cookie is only ever used after
  // app/layout.tsx re-checks it against the signed-in bowler's actual
  // current-season memberships. Link prefetches are excluded by the
  // matcher below (Next strips the prefetch header from req.headers, so
  // it can't be checked in here) — otherwise every league card in view
  // on the hub would set the cookie without the visitor picking one.
  const leagueMatch = pathname.match(/^\/leagues\/([^/]+)/);
  if (leagueMatch) {
    const response = NextResponse.next();
    response.cookies.set(LEAGUE_COOKIE_NAME, leagueMatch[1], {
      maxAge: LEAGUE_COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
    });
    return response;
  }

  const isProtected =
    pathname.startsWith("/admin") || pathname.startsWith("/member");

  if (!isProtected) return;

  const hasSession =
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-authjs.session-token");

  if (!hasSession) {
    return NextResponse.redirect(new URL("/signin", req.nextUrl.origin));
  }
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/member/:path*",
    {
      source: "/leagues/:path*",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
