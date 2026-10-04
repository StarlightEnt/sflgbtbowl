// PATH: lib/closePoolAfterResponse.js
//
// Auth.js builds its config (and so a fresh Neon Pool) on every auth()
// call. Left alone, each Pool's connection lingers until the driver's idle
// timeout. This schedules pool.end() for after the current response has
// finished, so the connection is released promptly without delaying the
// response or cutting off the session lookup that is still using it.
//
// `schedule` is Next's `after()` (passed in by lib/auth.js so this stays
// free of Next imports and unit-testable). Two things must never happen:
//   - an error from pool.end() reaching the request, and
//   - a call outside a request scope (a script, a build step) throwing —
//     there `after()` throws, and the pool simply idles out as it did
//     before this helper existed.

export function closePoolAfterResponse(pool, schedule) {
  try {
    schedule(async () => {
      try {
        await pool.end();
      } catch {
        // Already closed or failed to close — nothing useful to do.
      }
    });
  } catch {
    // Not inside a request scope: fall back to the driver's idle timeout.
  }
}
