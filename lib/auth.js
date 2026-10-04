import { cache } from "react";
import { after } from "next/server";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import NeonAdapter from "@auth/neon-adapter";
import { Pool } from "@neondatabase/serverless";
import { closePoolAfterResponse } from "./closePoolAfterResponse.js";

const nextAuth = NextAuth(() => {
  // Do NOT create the Pool outside this callback — Neon's serverless
  // driver needs a fresh connection per request in this environment,
  // not one shared across invocations.
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  // Release this request's connection once the response has finished.
  closePoolAfterResponse(pool, after);

  return {
    adapter: NeonAdapter(pool),
    providers: [
      Google,
      Resend({
        from: "officers@sflgbtbowl.com",
      }),
    ],
    pages: {
      signIn: "/signin",
    },
    // Vercel's preview/production URLs vary per-deployment, so the
    // Host header can't be pinned to one trusted value ahead of time.
    trustHost: true,
  };
});

export const { handlers, signIn, signOut } = nextAuth;

// Auth.js builds its config — a new Pool and a session lookup — on every
// auth() call, and one page view calls it several times (root layout,
// the page, ...). Wrapping it in React's cache() shares a single result
// per request across all of those server-side callers. Every caller uses
// plain auth() with no arguments, which is what makes this safe.
export const auth = cache(nextAuth.auth);
