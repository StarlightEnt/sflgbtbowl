// PATH: lib/venues/logoFile.js
//
// Server-side logo checks, shared by the create and update routes —
// the client-side check in VenueForm is only for immediate feedback and
// is never trusted.
//
// SVG is allowed here (the venues spec asks for it), unlike tournament
// images (lib/tournaments/allowedImageType.js), which deliberately
// exclude it: an SVG can carry an inline <script> that runs when its
// Blob URL is opened directly. So an SVG upload is rejected if it
// contains anything executable or externally-loading — script, event
// handlers, javascript:/data: URLs, foreignObject, embedded HTML
// elements, entity declarations, or an XML stylesheet/import. Logos are
// only ever rendered through <img>, where scripts never run, so this is
// defense in depth for the direct-URL case.

export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
export const ALLOWED_LOGO_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/webp",
]);

const UNSAFE_SVG_PATTERNS = [
  /<\s*script/i,
  /<\s*foreignObject/i,
  /<\s*(iframe|embed|object|link|meta|style|audio|video|animate|set)\b/i,
  /\bon[a-z]+\s*=/i,
  /javascript\s*:/i,
  /data\s*:\s*(text\/html|application)/i,
  /<!\s*ENTITY/i,
  /<\?xml-stylesheet/i,
  /@import/i,
];

export class LogoError extends Error {}

// `file` is a File from formData; returns { buffer, name, type }.
export async function readLogoFile(file) {
  if (!ALLOWED_LOGO_TYPES.has(file.type)) {
    throw new LogoError("Logo must be a PNG, JPG, SVG, or WebP file");
  }
  if (file.size > MAX_LOGO_BYTES) {
    throw new LogoError("Logo must be 2MB or smaller");
  }
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === "image/svg+xml") {
    const text = buffer.toString("utf8");
    if (!/<\s*svg[\s>]/i.test(text)) {
      throw new LogoError("That file doesn't look like a valid SVG");
    }
    if (UNSAFE_SVG_PATTERNS.some((re) => re.test(text))) {
      throw new LogoError(
        "That SVG contains scripts, styles, or external content and can't be used — export a plain SVG"
      );
    }
  }

  return { buffer, name: file.name, type: file.type };
}
