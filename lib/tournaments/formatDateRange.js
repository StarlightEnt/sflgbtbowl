// PATH: lib/tournaments/formatDateRange.js

// timeZone: "UTC" is load-bearing, not decorative — confirmed live:
// without it, Intl.DateTimeFormat renders in the server's local zone
// and a UTC-midnight Date (what the Neon driver returns for a DATE
// column) silently slips back a day west of Greenwich.
const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const fmtWithYear = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

// Dates come back from Postgres as Date objects already in UTC
// midnight — format in UTC so "2027-06-05" never slips to June 4th
// in a negative-offset timezone.
function asUTC(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function formatTournamentDateRange(startDate, endDate) {
  const start = asUTC(new Date(startDate));
  const end = asUTC(new Date(endDate));
  const sameDay = start.getTime() === end.getTime();
  if (sameDay) return fmtWithYear.format(start);

  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  if (sameYear) {
    return `${fmt.format(start)} – ${fmtWithYear.format(end)}`;
  }
  return `${fmtWithYear.format(start)} – ${fmtWithYear.format(end)}`;
}

export function truncateBodyPreview(html, maxLen = 150) {
  if (!html) return "";
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "…";
}
