// PATH: lib/tournaments/allowedImageType.js
//
// A strict allowlist, not a "starts with image/" prefix check — the
// PDF upload routes hardcode contentType instead of trusting the
// client; this table serves images at a client-controlled URL via
// Vercel Blob, so an allowed value here is also what gets served back
// as that Blob's Content-Type. "starts with image/" let
// "image/svg+xml" through, and an SVG can carry an inline <script>
// that executes when the blob URL is opened directly — a real
// stored-XSS vector the allowlist below closes.

export const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
