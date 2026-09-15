// PATH: lib/formatPoints.js
//
// Bowling points are awarded in half-point increments (a tied game
// splits 1 point down the middle), so team_a_points/team_b_points and
// team_standings.points_won/points_lost only ever land on a whole
// number or a ".5" — displayed as a fraction glyph rather than a
// decimal, matching how the standings sheets themselves print it.

export function formatPoints(value) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return String(value);

  const whole = Math.floor(num);
  const fraction = num - whole;

  if (fraction === 0) return String(whole);
  if (Math.abs(fraction - 0.5) < 1e-9) return `${whole}½`;
  return num.toFixed(1);
}

export function formatRecord(won, lost) {
  return `${formatPoints(won)}–${formatPoints(lost)}`;
}
