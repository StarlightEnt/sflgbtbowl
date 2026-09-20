// PATH: lib/venues/format.js
//
// Display helpers shared by the public /venues page, the popup, and the
// league pages that link to a venue. Pure functions, no DB access.

// "street, city, state zip" from whichever parts exist — same
// search-query approach the Tournaments detail page uses for its Google
// Maps link, no embedded map and no separate override field.
export function venueAddress(venue) {
  const cityState = [venue.city, [venue.state, venue.zip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  return [venue.street, cityState].filter(Boolean).join(", ");
}

export function venueMapsUrl(venue) {
  const address = venueAddress(venue);
  if (!address) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

// "City, ST" (either part optional).
export function venueCityState(venue) {
  return [venue.city, venue.state].filter(Boolean).join(", ");
}

// The bare domain shown on the card — "classicbowling.com", not the
// full URL. Falls back to the raw value if it can't be parsed.
export function bareDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// tel: href — digits and a leading + only, so punctuation in the
// admin-typed number never leaks into the link.
export function telHref(phone) {
  const cleaned = String(phone).replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : null;
}
