// PATH: lib/pdf/matchBowlerIdentity.js
//
// Shared identity-match classifier used by both lib/pdf/matchWeeklyBowlers.js
// (matching within the current season's roster) and
// lib/pdf/matchSeasonBowlers.js (matching against the bowler database
// globally, across every season and league, at Season Setup time).
//
// A parsed PDF only ever gives a first name + last name — no stable
// ID — and different leagues run their own scoring software with no
// shared database, so what one league's software prints as someone's
// "first name" can be what we've recorded as their nickname, or vice
// versa (e.g. "John Francis Unson" printed as "JF Unson" by one
// league's software). So the "first name" side of a match checks BOTH
// first_name and nickname on the existing record — either counts.
//
// Per the matching rule: a bowler's demographics essentially never
// change, and on the rare occasion something does, only one field is
// ever different at a time. So a real match requires BOTH name fields
// to relate somehow (exact or fuzzy) — if either field is completely
// unrelated to the existing record, this is treated as (probably) a
// different person rather than an update, and the caller falls back
// to "new bowler" rather than silently merging two different people's
// history.

import { namesAreClose } from "./nameMatch.js";

function sameName(a, b) {
  return (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
}

function firstIdentityMatch(parsedFirst, existing) {
  const nickname = existing.nickname || null;
  if (sameName(parsedFirst, existing.first_name) || (nickname && sameName(parsedFirst, nickname))) {
    return "exact";
  }
  if (
    namesAreClose(parsedFirst, existing.first_name) ||
    (nickname && namesAreClose(parsedFirst, nickname))
  ) {
    return "fuzzy";
  }
  return null;
}

function lastIdentityMatch(parsedLast, existing) {
  if (sameName(parsedLast, existing.last_name)) return "exact";
  if (namesAreClose(parsedLast, existing.last_name)) return "fuzzy";
  return null;
}

// Whitespace- and case-insensitive — deliberately ignores exactly
// where a space falls, since that's the one thing an inconsistent
// split can't be trusted to get right.
function normalizeFullName(s) {
  return (s ?? "").replace(/\s+/g, "").toLowerCase();
}

function fullNameIdentityMatch(parsed, existing) {
  const parsedFull = parsed.full_name;
  if (!parsedFull) return null;
  const existingFull = `${existing.first_name ?? ""} ${existing.last_name ?? ""}`;
  return normalizeFullName(parsedFull) === normalizeFullName(existingFull) ? "exact" : null;
}

// Returns "exact" | "fuzzy" | null for whether a parsed
// { first_name, last_name } identifies the same person as `existing`
// ({ first_name, last_name, nickname }).
export function classifyBowlerMatch(parsed, existing) {
  if (fullNameIdentityMatch(parsed, existing) === "exact") return "exact";

  const first = firstIdentityMatch(parsed.first_name, existing);
  const last = lastIdentityMatch(parsed.last_name, existing);
  if (!first || !last) return null;
  return first === "exact" && last === "exact" ? "exact" : "fuzzy";
}
