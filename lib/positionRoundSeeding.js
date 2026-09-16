// PATH: lib/positionRoundSeeding.js
//
// Auto-suggests lane pairings for a position round / roll-off week,
// seeded from current standings — the algorithm already verified
// against real standings earlier in this project (see Task.md). Pure
// function: the caller supplies teams already ranked best-to-worst,
// BYE always last.
//
// Middle pair (7-8) gets the best matchup (rank 1 vs 2), radiating
// outward with progressively worse matchups, and the two outermost
// pairs get the worst of all: 1-2 is BYE vs the worst real team,
// 13-14 is the two next-worst real teams.

const LANE_ORDER = ["1-2", "3-4", "5-6", "7-8", "9-10", "11-12", "13-14"];

export function suggestPositionRoundPairings(rankedTeamNumbers) {
  if (rankedTeamNumbers.length !== 14) {
    throw new Error(`Expected 14 ranked teams (13 real + BYE), got ${rankedTeamNumbers.length}`);
  }
  // 1-indexed accessor to match the algorithm's own rank numbering.
  const rank = (n) => rankedTeamNumbers[n - 1];

  const pairings = {
    "7-8": [rank(1), rank(2)],
    "5-6": [rank(3), rank(4)],
    "9-10": [rank(5), rank(6)],
    "3-4": [rank(7), rank(8)],
    "11-12": [rank(9), rank(10)],
    "13-14": [rank(11), rank(12)],
    "1-2": [rank(14), rank(13)], // BYE (always rank 14) vs the worst real team
  };

  return LANE_ORDER.map((lanes) => ({
    lanes,
    teamANumber: pairings[lanes][0],
    teamBNumber: pairings[lanes][1],
  }));
}
