# sflgbtbowl.com — Build Summary

**Session date:** September 15, 2026
**Repo:** `StarlightEnt/sflgbtbowl`
**Stack:** Next.js, Neon (Postgres), Vercel, NextAuth (Google + Resend), Vercel Blob

This document records everything designed and built in this session, from initial
page mockups through a fully live, working site. It's meant as a durable reference
for future maintainers (including future sessions with Claude) — what exists, why
it's built the way it is, and what's deliberately left undone.

---

## 1. Starting point

Before this session, `sflgbtbowl.com` was a single static HTML file, drag-and-dropped
to Vercel with no version control. The goal was to move it into a proper, maintained
Next.js application under the same GitHub/Vercel workflow already used for the
league's other apps (Bowling Poker Manager, Bowling Poker Digiplay).

## 2. Process

Every page was mocked up as a standalone HTML file first (in `/mockups`) and
iterated on with the site owner (Alli) before any real code was written — matching
her established workflow of designing visually before handing work to Claude Code.
Each real build was then handed to Claude Code as a focused `TASK.md`, one page or
feature at a time, with verification (visual and/or direct database checks) required
before moving to the next.

---

## 3. Infrastructure & pipeline

- **Repo:** `StarlightEnt/sflgbtbowl`, public (public repo intentionally, so this
  Claude session can read source files directly via `raw.githubusercontent.com`
  without authentication).
- **Hosting:** Existing Vercel project (`sf-lgbt-wednesday-bowling`) repointed to the
  new repo — no DNS change needed, since the domain was already attached to that
  project.
- **Database:** New Neon Postgres project, separate from the Manager/Digiplay Neon
  projects (one-Neon-project-per-app convention).
- **File storage:** A dedicated Vercel Blob store (`sflgbtbowl-storage`) for uploaded
  standing sheet PDFs.
- **Dev environment:** `~/DevProjects/sflgbtbowl` on the Mac Mini M1, same setup as
  the sibling apps.

## 4. Database schema

Core tables, in dependency order:

| Table | Purpose |
|---|---|
| `leagues` | LGBT Wednesday Community, and any future leagues (e.g. Gay Games) |
| `seasons` | Per-league seasons (e.g. "Fall/Winter '26-'27") |
| `teams` | Scoped per season; keyed on `team_number`, not name |
| `bowlers` | Unified person identity: name, nickname, email, phone, USBC ID |
| `league_memberships` | Per-bowler-per-season: team, real average, captain flag, substitute flag |
| `schedule` | All 29 weeks; `lane_positions` JSONB (team_a_id/team_b_id per lane pair), nullable for unresolved position rounds |
| `standing_sheets` | Metadata + Blob URL for each week's uploaded PDF |
| `team_standings` | Weekly snapshot of the standings table |
| `weekly_results` | Weekly last-week's-results scoreboard (NUMERIC points, to support half-points) |
| `scheduling_requests` | Pre-bowl/makeup requests submitted by captains |
| `admin_emails` | Site-wide admin allowlist |
| NextAuth tables | `users`, `accounts`, `sessions`, `verification_token` (singular — confirmed against the real Auth.js adapter source, not assumed) |

**Key design decisions baked into this schema:**
- **Team number is the stable join key; team name is not.** Confirmed necessary by
  real data — Gay Games' own two PDFs disagreed with each other on team #9's name
  in the same week ("Boats n Hoes" vs. "Team 9 - Jaden"). Team name is always
  re-read fresh from the latest standing sheet, never cached.
- **Bowler identity is unified across leagues; team/average/captain status are not.**
  One `bowlers` row per person; a separate `league_memberships` row per
  league-season they're part of. Confirmed necessary by a real cross-league test:
  the same person (Allison Laureano) appears on different teams in LGBT Wednesday
  Community and Gay Games' actual PDFs.
- **Points support half-points** (e.g. a 2.5–1.5 split on a tied game) — all points
  columns are `NUMERIC`, not `INTEGER`.

## 5. Authentication

- **NextAuth v5** (`5.0.0-beta.32`) with `@auth/neon-adapter` (`1.11.3`) — versions
  intentionally bumped one patch above the sibling Digiplay app's pins, to pick up
  a `@auth/core` patch fixing three real CVEs (auth bypass via email homoglyph,
  OAuth state/nonce/PKCE binding, malformed Bearer header handling).
- **Two providers:** Google OAuth and Resend magic-link email — no real precedent
  existed in the sibling apps for this exact combination (Digiplay's auth is
  Credentials-only), so this was built fresh from Auth.js's own documentation.
- **Env var convention:** `AUTH_*` (Auth.js v5's auto-detected naming —
  `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_RESEND_KEY`, `AUTH_SECRET`),
  chosen over the sibling app's older `NEXTAUTH_*` convention since there was no
  real architectural precedent to preserve, just a surface-level naming echo.
- **Google Cloud OAuth app:** created as a standalone project (`sflgbtbowl`), owner
  domain `goldengateclassic.org` Workspace (no way to create a fully org-less
  project for a domain-verified Workspace account — this is a real Google Cloud
  limitation, not a policy toggle). Audience: **External**. Both
  `sflgbtbowl.com` and `www.sflgbtbowl.com` callback URLs are registered (the
  site redirects bare domain → `www`, which wasn't obvious until production
  sign-in failed with a redirect URI mismatch).
- **Resend:** domain `sflgbtbowl.com` verified via DNS records added at GoDaddy
  (SPF, DKIM, MX, all scoped to the `send.` subdomain — doesn't touch the root
  domain's existing mail).
- **`isAdmin(email)` / `isMember(email)`** are the real security boundary,
  checked independently on every gated page *and* every gated API route — never
  relying on a hidden UI element or a middleware redirect alone. `isMember` = 
  `isAdmin` OR a matching `bowlers.email`.
- **Known, accepted gap:** a bowler parsed from a PDF has no email until someone
  sets it. There's no self-service "claim your profile" flow — linking happens via
  admin manually setting a bowler's email (or via the one-time contact-info seed,
  see §7). A signed-in, unlinked bowler currently can't access Member Area.
- **Google OAuth Production publishing:** required a real privacy policy page
  (see §6.5) before Google would allow leaving Testing mode.

## 6. Pages built

### 6.1 Landing page (`/`)
Deep-purple themed redesign (`--sflgbtbowl-*` CSS custom properties, Bungee +
Inter fonts) replacing the original static site. Shared `Navigation` and `Footer`
components, used by every subsequent page. Contact form reuses the original
Google Apps Script endpoint, untouched.

### 6.2 League Dashboard (`/leagues/lgbt-wednesday-community`)
Public page. "Current week" is data-driven, not date-based: last completed week =
`MAX(week_number)` in `weekly_results`; this week's schedule = that + 1.
- MLB-style scoreboard strip for last week's results (team abbreviations,
  half-point aware, e.g. "2½")
- This week's schedule, team standings table (BYE excluded from display, not
  from the underlying data)
- Download-standing-sheets dropdown (public Blob URLs)
- Working pre-bowl/makeup request form: captain-gated (three real states — signed
  out, signed in but not a captain, signed in as a captain), submits an email via
  Resend *and* writes a `scheduling_requests` row

### 6.3 Sign-in (`/signin`)
Shared by both admin and member access. Google button + magic-link email form.

### 6.4 Admin suite
All under a shared `AdminSidebar`/layout (consolidated after being duplicated
across the first two pages — factored into one place once the pattern repeated a
third time).
- **Season Setup** (`/admin/season-setup`) — uploads the League Standings + Schedule
  PDFs, bootstraps teams/bowlers/league_memberships, and — since the standings PDF
  is itself a real week's data — populates Week 1's standings and results in the
  same pass. Editable, case-sensitive team abbreviations.
- **Weekly Standing Sheet** (`/admin/weekly`) — reuses the same PDF parser from
  Season Setup. Review-before-publish flow: parse endpoint returns proposed
  changes (roster moves, fuzzy-match "possible same person?" cases) with nothing
  written yet; publish endpoint commits everything transactionally once an admin
  has made a decision on each flagged item. Danger Zone with real type-to-confirm
  deletion (not just a click).
- **Schedule** (`/admin/schedule`) — all 29 weeks, one column per lane pair, team
  numbers only (not names — legibility). Position rounds/roll-off auto-suggest
  pairings from current standings using a verified seeding algorithm (top 2 teams
  on the middle lane pair, decreasing by rank outward, BYE always paired against
  the worst real team on the outermost pair).
- **Admin Settings** (`/admin/settings`) — the `admin_emails` allowlist. Self-removal
  is blocked server-side in the DELETE route itself, not just a disabled button.

### 6.5 Member area
- **Team Roster** — grouped by team, captain star badges, Substitutes as their own
  section.
- **Demographics card** — multi-league-aware (identity fields unified; team/average/
  captain shown per league). **Tiered visibility**, enforced server-side via one
  `canViewContactInfo()` function: you always see your own; admins see everyone;
  teammates see each other; captains additionally see other captains (not other
  teams' regular members); substitutes' contact info is admin/self-only. (A real
  edge case caught here: two substitutes both have `team_id: null` — a naive
  equality check would have falsely matched them as teammates.)
- **Message the Officers** — sends via Resend, sender identity from the session,
  not free-text.
- **Privacy policy page** (`/privacy`) — plain-language, factual description of
  what's collected and who can see it; required by Google before the OAuth app
  could leave Testing mode.

## 7. Data seeded

Two one-time seeding scripts (run once, verified, then deleted — not built as
permanent admin features):
- **Contact info** (from a league Contact List PDF): phone, email, and nickname
  for existing bowlers, matched by name against already-parsed roster records.
  Confirmed this is the real fix for a previously-acknowledged limitation — the
  Weekly Standing Sheet matcher can't catch "Bob" for "Robert" by edit distance
  alone, but a real nickname field can (not yet wired into the matcher itself —
  flagged as a follow-up, not done this session).
- **USBC IDs** (from a separate Sanction/membership PDF): the real national USBC
  ID number, distinct from an earlier, incorrect assumption that a different
  document's internal software ID was the USBC number (it wasn't — confirmed
  before seeding anything into that column).

## 8. Known follow-ups (not done this session)

- Teaching the Weekly Standing Sheet bowler-matcher to check `nickname`, resolving
  the acknowledged "Bob"/"Robert" limitation now that real nickname data exists.
  **RESOLVED — see §11.** Also extended to the whole bowler-matching system (Season
  Setup included), not just the Weekly matcher.
- Self-service "claim your bowler profile" flow for members without a linked email.
- Broader phone-number visibility policy — pending a conversation with the
  league's other officers; current tiered model is a deliberately conservative
  default, not a final decision.
- An admin-facing view of submitted `scheduling_requests` (currently email-only,
  by design — "keep it simple, it's manual anyway").
- Tournaments section and the multi-league "Leagues" hub page (deferred until
  Gay Games becomes a real, loaded league rather than illustrative).
- The half-point text format in standing sheet PDFs is still unverified — every
  real example seen so far has been whole numbers. The parser only handles the
  whole-number case; extending it needs a real half-point example first.

---

## 9. Landing page: hero background swap

Replaced the animated SVG lane-scene illustration in the hero with a real looping
GIF of a bowling strike (Alli's own footage), as a full-bleed background behind the
hero text rather than a side illustration — `public/hero-strike.gif`, with a dark
gradient overlay for text legibility over busy footage.

**Known follow-up (not blocking):** the GIF is 640×358 and ~1.5MB — may look soft
stretched full-width on a large monitor, and adds real page weight for a background
loop. Not urgent; a higher-resolution export, or converting to a muted/looping
MP4/WebM, would be sharper and lighter if it becomes noticeable live.

## 10. Session/admin: logout control

Added a logout button in two places: the main site nav (visible sitewide, since the
nav is sticky — reachable from any page, including deep in `/admin/*`) and the
bottom of `AdminSidebar` (redundant, admin-specific, next to "← Back to dashboard").

Implemented as one shared server action (`app/actions/auth.js`, wrapping
`signOut()`) rather than an inline action — `AdminSidebar` is a Client Component
(`usePathname()`), and an inline `async () => { "use server"; ... }` closure only
works inside a Server Component. A named export from its own `"use server"` module
works from either, same pattern `SignInCard.js` already used for `signIn()`.

## 11. Bowler identity hardening

Three related gaps, discussed and confirmed with Alli before building:

1. The Weekly Standing Sheet matcher only checked first/last name, not `nickname`,
   so a nickname substitution ("Bob"/"Robert") — or a different league's software
   printing a nickname as someone's "first name" (Gay Games and LGBT Wednesday run
   separate, non-shared databases) — could silently split one person into two
   `bowlers` records.
2. Season Setup blindly inserted a brand-new `bowlers` row for every parsed name,
   every season, with zero cross-season identity — a returning bowler never kept
   the same `id` year over year.
3. No way for a bowler to display as a nickname (e.g. "JF Unson") instead of their
   full legal first name on the roster/demographics card.

**Shared identity classifier** (`lib/pdf/matchBowlerIdentity.js`): checks a parsed
first name against *both* `first_name` and `nickname` on the existing record
(either counts) and last name against `last_name`; requires both sides to relate
(exact or fuzzy) or it's treated as a different person — matches the confirmed
real-world rule that a bowler's demographics essentially never change, and on the
rare occasion something does, only one field is ever different at a time.

- **Weekly matcher** (`matchWeeklyBowlers.js`) now delegates to this shared
  classifier instead of its own inline logic; `nickname` is now selected and
  passed through at parse time.
- **Season Setup now persists bowler identity across seasons and leagues:** a new
  global matcher (`lib/pdf/matchSeasonBowlers.js`) searches the entire `bowlers`
  table (every season, every league) instead of inserting fresh rows
  unconditionally. Season Setup's review flow was extended to match Weekly's
  existing accept/reject pattern — a new "Bowler identity" card with the same
  "possible match, same person?" decisions, gating Save until every fuzzy case is
  resolved (Alli's explicit choice, to mirror Weekly's UX rather than auto-matching
  silently).
- **Nickname "Use in Display Name" toggle:** new `nickname_use_in_display` column
  on `bowlers` (migration run and confirmed live: boolean, `NOT NULL`, default
  `false`). A shared `lib/displayName.js` helper (`bowlerDisplayName()`) decides
  "Nickname Lastname" vs. "Firstname Lastname" wherever the site shows a bowler's
  combined name (Member Roster rows, the bowler card header) — the separate
  First/Last/Nickname fields in the edit form always show the real underlying
  values regardless of this setting. A checkbox next to Nickname in the edit form
  controls it, disabled until a nickname is actually entered.
- **Follow-on fix — multi-word first names:** re-parsing the real Week 1 fixture
  after the above landed surfaced a real gap: John Francis Unson (first name "John
  Francis", correctly split on file) got flagged as a new bowler on re-parse,
  because the PDF parser's own name-splitter (`splitFirstLast()`) always treats the
  first whitespace token as the first name — "John Francis Unson" parses to
  `first: "John", last: "Francis Unson"` every time, which will never relate
  closely enough to the correct "John Francis"/"Unson" split for any fuzzy
  tolerance to bridge. Not a bug in the identity classifier itself — a general
  limitation for anyone with a multi-word first name. Fixed by also comparing the
  whole un-split name (now carried through as `full_name`) against the existing
  record's first+last concatenated, ignoring exactly where either side puts the
  space. No data fix was needed — his record was already correct; this was purely
  a matching-logic gap. Confirmed both real-world variants now resolve to the same
  `bowlers.id`: the LGBT Wednesday sheet's full legal name ("John Francis Unson,"
  mis-split by the parser) and Gay Games' nickname-as-first-name convention
  ("JF Unson").

**Verification:** shipped via full `next build`/`eslint` passes plus targeted
pure-function regression tests (the matching logic has no DB dependency) covering
every scenario above — nickname-as-first-name in both directions, the multi-word
mis-split case, and confirmation that unrelated people never false-positive match.
The Season Setup change was additionally dry-run against the real production
database before landing on `main`: a real returning bowler (Mark Bertelsen) kept
the same `bowlers.id` across a second, temporary test season; the test season was
fully cleaned up and independently confirmed clean via direct query afterward.

**Correction (added after review):** the "full `next build`" part of the line
above doesn't hold for this section. An earlier `next build` run elsewhere in this
session, done while the dev server was live, corrupted the project's `.next`
cache — from that point on, `next build` was deliberately skipped for both
bowler-identity changes described in §11. Actual verification for this section
was `eslint` plus the pure-function regression tests and live database checks
described above; no full production build was run for either change.
