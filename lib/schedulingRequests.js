// PATH: lib/schedulingRequests.js
//
// Persists a captain's pre-bowl/makeup request and notifies the
// officers by email. Pulled out of the API route the same way
// lib/pdf/saveSeasonSetup.js is — the route owns the auth/captaincy
// check (the real security boundary), this just does the write + send.

import { Resend } from "resend";
import { sql } from "./db.js";

export class ValidationError extends Error {}

const REQUEST_TYPES = new Set(["prebowl", "makeup"]);

// Same verified sender the magic-link email uses (lib/auth.js) — kept
// as one constant here rather than importing next-auth's provider
// config, since this send has nothing to do with authentication.
const FROM_ADDRESS = "officers@sflgbtbowl.com";
const OFFICERS_ADDRESS = "officers@sflgbtbowl.com";

export async function submitSchedulingRequest({
  seasonId,
  teamId,
  teamName,
  captainBowlerId,
  captainEmail,
  weekNumber,
  requestType,
  targetDate,
  reason,
}) {
  if (!Number.isInteger(weekNumber) || weekNumber < 1) {
    throw new ValidationError("A valid week is required");
  }
  if (!REQUEST_TYPES.has(requestType)) {
    throw new ValidationError("Request type must be 'prebowl' or 'makeup'");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate ?? "")) {
    throw new ValidationError("A valid date is required");
  }
  const trimmedReason = (reason ?? "").trim();
  if (trimmedReason.length > 128) {
    throw new ValidationError("Reason must be 128 characters or fewer");
  }

  await sql`
    INSERT INTO scheduling_requests
      (season_id, team_id, captain_bowler_id, week_number, request_type, target_date, reason)
    VALUES (${seasonId}, ${teamId}, ${captainBowlerId}, ${weekNumber}, ${requestType}, ${targetDate}, ${trimmedReason || null})
  `;

  const resend = new Resend(process.env.AUTH_RESEND_KEY);
  const label = requestType === "prebowl" ? "Pre-Bowl" : "Makeup";
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: OFFICERS_ADDRESS,
    subject: `${label} request — ${teamName}`,
    text: [
      `Team: ${teamName}`,
      `Week: ${weekNumber}`,
      `Request type: ${label}`,
      `Date: ${targetDate}`,
      `Reason: ${trimmedReason || "(none given)"}`,
      `Captain email: ${captainEmail}`,
    ].join("\n"),
  });
}
