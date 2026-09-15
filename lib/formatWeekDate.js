// PATH: lib/formatWeekDate.js
//
// Shared by any dropdown that lists schedule weeks (standing sheet
// downloads, the pre-bowl/makeup week picker) so they render the same
// "Week N — Mon D, YYYY" label.

export function formatWeekDate(date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
