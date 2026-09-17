// PATH: lib/tournaments/slugify.js
//
// Plain ASCII slugify — good enough for tournament names, which are
// always plain event titles, not free-form Unicode text. No package
// pulled in for this; it's a five-line regex.

export function slugify(input) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Appends "-2", "-3", ... to a base slug until `isTaken` reports the
// candidate is free. `isTaken` is async so callers can check the DB.
export async function uniqueSlug(base, isTaken) {
  const root = base || "tournament";
  let candidate = root;
  let n = 2;
  while (await isTaken(candidate)) {
    candidate = `${root}-${n}`;
    n++;
  }
  return candidate;
}
