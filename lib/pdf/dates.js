// PATH: lib/pdf/dates.js

// The Standings PDF's header date is a full "M/D/YYYY" string; the
// Schedule PDF only ever prints "MM/DD" with no year at all, since a
// season spans a year boundary (e.g. Sept 2026 through Apr 2027). This
// resolves each week's real date by starting from the known Week 1 date
// and rolling the year forward every time the month goes backwards
// compared to the previous week — which only happens at the turn of the
// calendar year, whatever month a season happens to start in.
export function resolveScheduleDates(weeks, week1DateISO) {
  const week1 = new Date(week1DateISO + "T00:00:00Z");
  let year = week1.getUTCFullYear();
  let prevMonth = week1.getUTCMonth() + 1;

  return weeks.map((week) => {
    const [mm, dd] = week.bowl_date_str.split("/").map(Number);
    if (mm < prevMonth) year += 1;
    prevMonth = mm;
    const iso = `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    return { ...week, week_date: iso };
  });
}

// "9/9/2026" -> "2026-09-09"
export function slashDateToISO(dateStr) {
  const [m, d, y] = dateStr.split("/").map(Number);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
