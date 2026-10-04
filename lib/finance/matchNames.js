// PATH: lib/finance/matchNames.js
//
// Fuzzy-match a treasurer-sheet name ("Michael Cross") to a roster
// bowler ("Mike Cross"). Used once per sheet name: the result is stored
// in finance_rows.bowler_id and never recomputed, so a bad guess can be
// corrected by an officer/admin and then stays put.
//
// Pure functions, no DB access, so they are easy to test.

const NICKNAME_GROUPS = [
  ["michael", "mike", "mick", "mickey"],
  ["robert", "rob", "robbie", "bob", "bobby", "robby"],
  ["david", "dave", "davey"],
  ["william", "bill", "billy", "will", "willy"],
  ["james", "jim", "jimmy", "jamie"],
  ["joseph", "joe", "joey"],
  ["john", "johnny", "jon"],
  ["richard", "rick", "ric", "ricky", "dick"],
  ["charles", "charlie", "chuck"],
  ["steven", "stephen", "steve"],
  ["thomas", "tom", "tommy"],
  ["daniel", "dan", "danny"],
  ["matthew", "matt"],
  ["jeremy", "jeremey"],
  ["patrick", "pat", "paddy"],
  ["kenneth", "ken", "kenny"],
  ["edward", "ed", "eddie", "ted"],
  ["anthony", "tony"],
  ["ronald", "ron", "ronnie"],
  ["douglas", "doug"],
  ["timothy", "tim"],
  ["gregory", "greg"],
  ["jeffrey", "jeff", "geoff"],
  ["joshua", "josh"],
  ["benjamin", "ben"],
  ["andrew", "andy", "drew"],
  ["alexander", "alex"],
  ["nicholas", "nick"],
  ["samuel", "sam"],
  ["christopher", "chris"],
  ["brian", "bryan"],
  ["allison", "alli", "allie", "alison"],
  ["peter", "pete"],
  ["donald", "don", "donnie"],
  ["lawrence", "larry"],
  ["raymond", "ray"],
  ["frederick", "fred", "freddie"],
];

const CANON = new Map();
for (const group of NICKNAME_GROUPS) {
  for (const n of group) CANON.set(n, group[0]);
}

const SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv"]);

function clean(s) {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s'-]/g, " ")
    .replace(/['-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// "John Francis Unson" -> { first: "john", last: "unson" }; trailing
// suffixes (Jr, II) are dropped, middle names ignored.
export function splitName(full) {
  const parts = clean(full)
    .split(" ")
    .filter(Boolean)
    .filter((p, i) => !(i > 0 && SUFFIXES.has(p)));
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts[parts.length - 1] };
}

function canonFirst(first) {
  return CANON.get(first) ?? first;
}

function editDistance(a, b) {
  if (a === b) return 0;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

// Score one sheet name against one roster bowler, 0..1.
// >= 0.9 is a confident match; below that is not auto-linked.
export function scoreNames(sheetName, bowler) {
  const s = splitName(sheetName);
  const b = splitName(`${bowler.firstName} ${bowler.lastName}`);
  const nick = bowler.nickname ? clean(bowler.nickname).split(" ")[0] : null;
  if (!s.first || !s.last || !b.first || !b.last) return 0;

  const lastExact = s.last === b.last;
  const lastClose = !lastExact && editDistance(s.last, b.last) <= 1 && s.last.length > 3;

  const firstCanonEqual = canonFirst(s.first) === canonFirst(b.first);
  const firstNickEqual = nick ? canonFirst(s.first) === canonFirst(nick) : false;
  const firstClose = !firstCanonEqual && editDistance(s.first, b.first) <= 1 && s.first.length > 3;
  const sameInitial = s.first[0] === b.first[0];

  if (lastExact && (s.first === b.first)) return 1;
  if (lastExact && (firstCanonEqual || firstNickEqual)) return 0.95;
  if (lastExact && firstClose) return 0.9;
  if (lastClose && (firstCanonEqual || firstNickEqual || s.first === b.first)) return 0.9;
  if (lastExact && sameInitial) return 0.6;
  return 0;
}

// candidates: [{ id, firstName, lastName, nickname, teamId }]
// preferredTeamId: sheet's team, resolved to a roster team id (or null).
// Returns { bowlerId, score } for a confident, unambiguous match, else null.
export function bestMatch(sheetName, candidates, preferredTeamId = null) {
  const scored = candidates
    .map((c) => {
      let score = scoreNames(sheetName, c);
      // Same team is a tie-breaker only, never enough on its own.
      if (score >= 0.9 && preferredTeamId != null && c.teamId === preferredTeamId) score += 0.05;
      return { id: c.id, score };
    })
    .filter((c) => c.score >= 0.9)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;
  if (scored.length > 1 && scored[0].score - scored[1].score < 0.04) return null; // ambiguous
  return { bowlerId: scored[0].id, score: scored[0].score };
}
