// PATH: lib/tournaments/sanitizeBody.js
//
// Sanitize on write, not on read (per task spec) — the public detail
// page and the list-preview truncation both render `body` directly,
// so it has to already be safe by the time it's stored.

import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "s",
  "h1", "h2", "h3",
  "a", "ul", "ol", "li", "blockquote",
];

export function sanitizeTournamentBody(html) {
  if (!html) return null;
  const clean = sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ["href", "target", "rel"] },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }),
    },
  }).trim();
  return clean || null;
}
