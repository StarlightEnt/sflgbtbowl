"use server";

import { signOut } from "@/lib/auth";

// Shared server action so both a Server Component (Navigation) and a
// Client Component (AdminSidebar) can trigger sign-out via a plain
// <form action={logout}> — same pattern SignInCard.js already uses
// for signIn(), just the mirror image.
export async function logout() {
  await signOut({ redirectTo: "/" });
}
