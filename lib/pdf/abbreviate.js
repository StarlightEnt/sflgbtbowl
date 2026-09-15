// PATH: lib/pdf/abbreviate.js
//
// Suggests a short team abbreviation from a team name, for the admin to
// review and edit before saving — this is a starting point only, never
// persisted without going through the review step.

const STOPWORDS = new Set(["of", "the", "&", "and"]);

function splitWords(name) {
  const words = name
    .replace(/&/g, " & ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !STOPWORDS.has(w.toLowerCase()));

  if (words.length > 1) return words;

  // Single mashed-together word (e.g. "StrikeForce") — split on internal
  // capital letters so it's treated like a multi-word name too.
  const camelSplit = name.match(/[A-Z][a-z]*/g);
  return camelSplit && camelSplit.length > 1 ? camelSplit : [name];
}

export function suggestAbbreviation(teamName) {
  const trimmed = teamName.trim();
  if (/^[A-Z]{2,3}$/.test(trimmed)) return trimmed;

  const words = splitWords(trimmed);

  if (words.length === 1) {
    const w = words[0].replace(/[^A-Za-z]/g, "");
    return (w[0] ?? "").toUpperCase() + w.slice(1, 3).toLowerCase();
  }

  if (words.length >= 3) {
    const [first, second, third] = words;
    return (
      (first[0] ?? "").toUpperCase() +
      (second[0] ?? "").toLowerCase() +
      (third[0] ?? "").toUpperCase()
    );
  }

  // Two significant words: first letters of each, plus a second letter
  // from the last word to fill out to 3 characters.
  const [first, second] = words;
  return (
    (first[0] ?? "").toUpperCase() +
    (second[0] ?? "").toUpperCase() +
    (second[1] ?? "").toLowerCase()
  );
}
