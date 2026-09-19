import { redirect } from "next/navigation";

// The member roster is now league-scoped at /leagues/[slug]/roster —
// this bare route exists only for a stale bookmark or a typed URL.
// /leagues is the switcher: a signed-in member picks their league
// there and lands on the scoped roster from there, same as anyone
// else browsing leagues.
export default async function MemberRosterRedirectPage() {
  redirect("/leagues");
}
