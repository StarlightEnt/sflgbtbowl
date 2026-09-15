import { NextResponse } from "next/server";

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
  matcher: ["/admin/:path*", "/member/:path*"],
};
