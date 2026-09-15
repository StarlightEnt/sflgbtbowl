import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import NeonAdapter from "@auth/neon-adapter";
import { Pool } from "@neondatabase/serverless";

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  // Do NOT create the Pool outside this callback — Neon's serverless
  // driver needs a fresh connection per request in this environment,
  // not one shared across invocations.
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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
