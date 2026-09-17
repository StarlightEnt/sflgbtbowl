// PATH: lib/tournaments/validateTournamentInput.js
//
// Shared field validation/normalization for both create and update —
// pulled out so the two don't drift on what counts as a valid row.

import { sanitizeTournamentBody } from "./sanitizeBody.js";

export class ValidationError extends Error {}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateTournamentInput(input) {
  const name = (input.name ?? "").trim();
  if (!name) throw new ValidationError("Name is required");

  const startDate = input.startDate;
  const endDate = input.endDate;
  if (!DATE_RE.test(startDate ?? "")) throw new ValidationError("A valid start date is required");
  if (!DATE_RE.test(endDate ?? "")) throw new ValidationError("A valid end date is required");
  if (endDate < startDate) throw new ValidationError("End date can't be before start date");

  const organizersRaw = Array.isArray(input.organizers) ? input.organizers : [];
  const organizers = organizersRaw
    .map((o) => ({ name: (o?.name ?? "").trim(), email: (o?.email ?? "").trim() }))
    .filter((o) => o.name || o.email);
  for (const o of organizers) {
    if (!o.name) throw new ValidationError("Every organizer needs a name");
    if (!EMAIL_RE.test(o.email)) throw new ValidationError(`"${o.email}" isn't a valid email`);
  }

  return {
    name,
    startDate,
    endDate,
    costDisplay: (input.costDisplay ?? "").trim() || null,
    category: (input.category ?? "").trim() || null,
    venueName: (input.venueName ?? "").trim() || null,
    venueAddress: (input.venueAddress ?? "").trim() || null,
    venuePhone: (input.venuePhone ?? "").trim() || null,
    venueWebsite: (input.venueWebsite ?? "").trim() || null,
    organizers,
    websiteUrl: (input.websiteUrl ?? "").trim() || null,
    body: sanitizeTournamentBody(input.body ?? ""),
    isActive: input.isActive !== false,
  };
}
