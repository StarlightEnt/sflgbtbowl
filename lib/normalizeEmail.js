// PATH: lib/normalizeEmail.js
//
// The one definition of "the stored form of an email": trimmed and
// lowercased. Email addresses are matched case-insensitively everywhere
// (a sign-in via Google or a magic link may differ in case from what an
// officer typed on a bowler's card), so every write goes through this and
// every lookup compares lower(email) = lower($1).
//
// Returns null for empty/blank/non-string input, matching how the bowler
// card stores "no email".

export function normalizeEmail(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed === "" ? null : trimmed;
}
