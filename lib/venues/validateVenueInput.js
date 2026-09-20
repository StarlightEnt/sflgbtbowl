// PATH: lib/venues/validateVenueInput.js
//
// Shared field validation/normalization for venue create and update —
// one place so the two can't drift on what counts as a valid row.

export class ValidationError extends Error {}

export const BLURB_MAX = 250;

// Only http(s) links are ever stored: the website is rendered as an
// href on a public page, so a "javascript:" value must never get in.
// A bare "classicbowling.com" gets https:// prepended.
function normalizeWebsite(raw) {
  const value = (raw ?? "").trim();
  if (!value) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  let parsed;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw new ValidationError("Website doesn't look like a valid web address");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ValidationError("Website must be an http or https address");
  }
  return parsed.toString();
}

export function validateVenueInput(input) {
  const name = (input.name ?? "").trim();
  if (!name) throw new ValidationError("Venue name is required");

  const blurb = (input.blurb ?? "").trim();
  if (blurb.length > BLURB_MAX) {
    throw new ValidationError(`Blurb must be ${BLURB_MAX} characters or fewer`);
  }

  const state = (input.state ?? "").trim();

  return {
    name,
    street: (input.street ?? "").trim() || null,
    city: (input.city ?? "").trim() || null,
    state: state ? state.toUpperCase() : null,
    zip: (input.zip ?? "").trim() || null,
    phone: (input.phone ?? "").trim() || null,
    website: normalizeWebsite(input.website),
    blurb: blurb || null,
    isVisible: input.isVisible !== false,
    removeLogo: input.removeLogo === true,
  };
}
