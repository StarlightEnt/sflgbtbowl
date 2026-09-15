// PATH: lib/pdf/nameMatch.js
//
// Small edit-distance/prefix check used to flag "possible match, same
// person?" cases when matching a new week's sheet against existing
// bowlers (see lib/pdf/matchWeeklyBowlers.js). Deliberately catches
// truncation-style nicknames ("Jon" is a prefix of "Jonathan") since
// those are indistinguishable from typos/OCR noise at this level, but
// NOT substitution-style nicknames ("Bob" for "Robert") — those aren't
// close by edit distance or prefix at all, and building a nickname
// dictionary is out of scope for this.

function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

export function namesAreClose(a, b) {
  const x = (a ?? "").trim().toLowerCase();
  const y = (b ?? "").trim().toLowerCase();
  if (!x || !y || x === y) return false;
  if (x.length < 2 || y.length < 2) return false;
  if (x.startsWith(y) || y.startsWith(x)) return true;
  return levenshteinDistance(x, y) <= 2;
}
