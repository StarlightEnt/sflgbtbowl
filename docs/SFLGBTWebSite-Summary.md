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
- The multi-league "Leagues" hub page (deferred until Gay Games becomes a
  real, loaded league rather than illustrative). The Tournaments directory
  itself is no longer deferred — **see §13.**
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

---

## 12. League By-Laws (versioned, season-scoped)

**Session date:** September 16, 2026

New feature, designed this session and handed to Claude Code as a focused
`TASK.md` (this project's standing one-feature-at-a-time convention — see §2).
**Confirmed shipped and live on `main`** — verified directly against the real
repo source (`raw.githubusercontent.com`), not assumed: `bylaws_revisions`
migration is in `migrations/README.md`'s history table, and
`lib/pdf/publishBylawsRevision.js`, `lib/pdf/deleteBylawsRevision.js`,
`app/admin/bylaws/page.js`, `app/api/admin/bylaws/upload/route.js`,
`app/api/admin/bylaws/delete/route.js`, `components/Admin/BylawsForm.js`,
and `components/Member/BylawsCard.js` all exist and match the design below.

**The problem:** the League's official By-Laws are a PDF approved by the board
(officers + captains). Ideally one upload at the start of a season is the only
one needed ("Revision A"), but mid-season votes can amend them, and the League
wants a real history — every past revision kept and admin-downloadable, never
silently overwritten, with only the newest version shown to members as current.

**Scoping decision:** revisions are scoped **per season** (`season_id`), the
same pattern already used for `standing_sheets` — not per league. Confirmed
explicitly with Alli rather than assumed, because it changes the schema
materially: per-season means revision lettering restarts at "A" each new
season; the alternative (per-league, carrying across season boundaries) was
considered and rejected.

**Schema — new table `bylaws_revisions`:**

| Column | Purpose |
|---|---|
| `season_id` | FK to `seasons`, `ON DELETE CASCADE` |
| `revision_label` | "A", "B", "C"... unique per season |
| `file_url` / `file_name` | Vercel Blob location, same store as standing sheets, under a `bylaws/` prefix |
| `uploaded_by` / `uploaded_at` | audit trail |
| `is_current` | which revision is the official one |

A **partial unique index** (`UNIQUE ... WHERE is_current`) enforces at the
database level that only one revision per season can ever be current —
the same "let the database catch what the UI shouldn't have to" instinct
already used elsewhere in this schema. Recorded in `migrations/README.md`'s
history table as `20260915-create-bylaws-revisions.mjs` — filed under the
2026-09-15 date already used for that day's other schema work rather than
the 09-16 design-session date, worth knowing if the filename/date pairing
is ever cross-referenced later.

**Upload/archive behavior — deliberately not a delete-and-replace:**
publishing a new revision demotes the previous current row to archived
(`is_current = false`) inside the same transaction that inserts the new one;
the old PDF is *never* deleted from Blob storage on a normal upload. Archived
revisions stay fully downloadable by admin, listed with a "View PDF" link,
same as current. Revision label auto-suggests the next letter (A→B→...→Z→AA)
but is admin-editable at upload time. **Confirmed detail beyond the original
spec:** if the insert transaction fails for any reason (including a genuine
label collision, caught and surfaced as `ConflictError`), the just-uploaded
Blob file is also cleaned up (`del(blob.url)`, best-effort) — so a failed
publish doesn't leave an orphaned PDF in storage with nothing pointing to it.

**Deletion is intentionally restricted:** the Danger Zone delete (same
type-to-confirm pattern as the Weekly Standing Sheet's, e.g. "type REVISION B
to confirm") can only remove an *archived* revision — the API route itself
rejects deleting the current one, not just the UI. The stated recovery path
for a bad upload is publishing a corrected revision, not deleting the current
one out from under the League.

**Where it lives, following existing conventions exactly:**
- `lib/pdf/publishBylawsRevision.js` / `deleteBylawsRevision.js` — same
  Pool + explicit transaction shape as `publishWeeklyStandingSheet.js` /
  `deleteWeeklyStandingSheet.js`.
- `app/api/admin/bylaws/upload/route.js` / `delete/route.js` — same
  `isAdmin(email)` boundary at the route (not the page), and season is
  resolved server-side via `getCurrentSeason()` rather than trusting a
  client-supplied `seasonId`, matching `weekly/publish` and `weekly/delete`.
- `app/admin/bylaws/page.js` + `components/Admin/BylawsForm.js` — a new
  sibling under `AdminSidebar`, positioned after Schedule; reuses
  `WeeklyStandingSheetForm`'s existing card/table/Danger-Zone styling rather
  than introducing new classes.
- `components/Member/BylawsCard.js` — the member-facing download card,
  positioned **directly under the Substitutes section and above
  Demographics/Message-the-Officers** in the Member area (§6.5) — Alli's
  explicit placement instruction. Shows the current revision's label and
  upload date with a Download PDF link; shows an empty state if no By-Laws
  have been posted yet for the season. Not tiered/gated beyond ordinary
  member login — every logged-in member sees the same current version.

**Source document confirmed:** Alli supplied the actual 2026-27 Winter season
By-Laws PDF as a real example (IGBO-affiliated, USBC-rule-book-adapted,
13 regular teams + BYE, 29-week schedule with two position rounds and a
closing sweeper). Noted in passing, not actioned: the by-laws document's own
"SCHEDULE" section duplicates dates/position-week info that also lives in the
site's separately-parsed Schedule PDF/`schedule` table — two independent
sources of truth for the same facts, worth knowing about but not something
this feature builds guardrails around.

---

## 13. Tournaments directory

**Session date:** September 16, 2026

New feature, handed to Claude Code as `TASK-tournaments.md` (this project's
standing one-feature-at-a-time convention). Replaces the "Tournaments (Coming
soon)" nav placeholder with a live `/tournaments` public directory and an
`/admin/tournaments` CRUD admin page. Modeled in look/feel/function after
IGBO's own tournaments pages (screenshots supplied to the developer, not
this session) — grouped list, banner detail page, plain admin form — restyled
to sflgbtbowl's deep-purple theme rather than copied pixel-for-pixel.

**Schema — new standalone table `tournaments`:** no foreign keys, unlike
every other content table in this schema — not scoped to a season or league,
since tournaments aren't part of any one league's season. `organizers` is a
JSONB array of `{name, email}` (no separate table — explicitly out of scope
per the task). A partial index on `(end_date) WHERE is_active` matches the
public listing query's real shape, same "index matches the query" instinct
used elsewhere (e.g. `bylaws_revisions`' one-current partial unique index).

**Deliberately not a revision-history feature, unlike Weekly Standing Sheet /
By-Laws:** plain save-on-submit CRUD, confirmed out of scope by the task —
no draft/publish cycle, no past-tournament archive (expired entries just stop
appearing on the public list; nothing is auto-deleted), no embedded map (a
"View on Google Maps" search-query link built from the address string
instead), no separate venues/organizers/categories tables.

**Public pages:**
- `/tournaments` — `WHERE is_active AND end_date >= CURRENT_DATE`, grouped by
  month/year. List-preview text is derived from `body` at render time
  (strip tags, truncate ~150 chars) — not stored separately, per spec.
- `/tournaments/[slug]` — 404s on an unknown slug or `is_active = false`, but
  deliberately **still renders after `end_date` has passed** — only the list
  page date-filters, so a bookmarked link never 404s just because the event
  is over. Confirmed live: a past-dated test tournament loaded its detail
  page directly while absent from the list; an inactive one 404'd on both.

**Admin page (`/admin/tournaments`):** list (all tournaments, including
past/inactive) plus `/admin/tournaments/new` and `/admin/tournaments/[id]/edit`
using one shared `TournamentForm` component. Delete uses a plain `confirm()`
dialog, not the stricter type-to-confirm Danger Zone pattern used for standing
sheets/by-laws — no cascading data or audit-trail value at stake here, per
the task's explicit scoping.

**Rich text — substituted `react-quill-new` for the task's suggested
`react-quill`:** confirmed against the npm registry before installing —
`react-quill`'s peer dependencies cap at React 18, and this project runs
React 19.2.8. `react-quill-new` is a maintained fork with an identical API
and real React 19 support; installed with zero peer-dependency warnings.
Body HTML is sanitized server-side on write (`sanitize-html`, an explicit
tag/attribute allowlist, links forced to `target="_blank" rel="noopener
noreferrer"`) — confirmed live that a `<script>` tag survives round-trip as
stripped while bold/link markup passes through intact — so the public pages
render the stored HTML directly with no separate sanitize-on-read step.

**Images:** same Blob store as standing sheets/by-laws, new `tournaments/`
prefix. Unlike By-Laws' "never delete on upload," editing a tournament's
image deletes the old Blob object once the new one's upload succeeds — no
history requirement for tournament images. Confirmed live via a direct
Blob `head()` check: the old object was gone immediately after a replace,
and a deleted tournament's image was gone immediately after the row delete.

**Real bug caught during verification, not by the task spec:** the initial
date-range formatter didn't pin `Intl.DateTimeFormat`'s `timeZone` to UTC.
Postgres `DATE` columns come back from the Neon driver as JS `Date` objects
at UTC midnight; formatting them in the server's local zone (Pacific)
silently shifted every displayed date back by one day (a tournament starting
"2027-06-04" rendered as "Jun 3"). Caught by rendering a real test tournament
against the live dev server and reading the actual output, not by inspecting
the code — fixed by pinning `timeZone: "UTC"` on both formatters in
`lib/tournaments/formatDateRange.js`.

**Verification:** `eslint` clean (0 errors; pre-existing `<img>`-vs-
`next/image` warnings only, consistent with the rest of the codebase, which
uses no `next/image` anywhere). `next build` was skipped — `next dev` was
live at the time, and an earlier session already confirmed running `next
build` alongside a live dev server corrupts the `.next` cache (see §11's
correction) — verification instead ran directly against the live dev server
on `localhost:3000`. Created real tournaments via `createTournament()`
against the production database (2+ organizers, an image, rich body with
bold + a link, a past-dated entry, an inactive entry), confirmed every
scenario in the task's verification checklist by reading actual HTTP
responses and rendered HTML, then deleted all test rows and their Blob
images and confirmed the table was empty and the blobs gone afterward.

---

## 14. Officer role + Announcements

**Session date:** September 17, 2026

New role tier, designed this session and handed to Claude Code as a focused
`TASK.md` (this project's standing one-feature-at-a-time convention — see
§2). **Confirmed shipped and live on `main`** — verified directly against
the real repo source (`raw.githubusercontent.com` / a full tarball pull via
`codeload.github.com`), not assumed: every file/route named below was read
in full and matches the design described here.

**The problem:** the League needed a role below full admin that could
handle day-to-day member-facing work — keeping bowler contact info current
and posting news — without touching Season Setup, standings, Schedule,
By-Laws, or Tournaments. Officers sit between `isMember` and `isAdmin`:
existing bowlers (matched by login email) granted extra rights via a new
`officers` table, not a separate email allowlist like `admin_emails` — so
officer status always ties back to a real bowler identity, never a bare
email. Officers can view/edit any bowler's demographics (**full bypass on
contact info, the same tier admins already get in `canViewContactInfo`** —
an explicit design decision, not a partial "names only" view) and fully
manage Announcements (create/edit/pin/delete); they cannot manage other
officers, and cannot reach Season Setup, Weekly, Schedule, By-Laws,
Tournaments, or Admin Settings.

**Schema — two new tables, migration `20260917-create-officers-and-announcements.mjs`:**

| Table | Column | Purpose |
|---|---|---|
| `officers` | `bowler_id` | `UNIQUE REFERENCES bowlers(id)` — a bowler is either an officer or not, no duplicate rows |
| | `added_by` / `added_at` | audit trail (admin email + timestamp) |
| `announcements` | `title` | `CHECK (char_length <= 120)` |
| | `body` | plain text, no rich-text/HTML |
| | `posted_by_bowler_id` | nullable — an admin who isn't also a bowler can still post |
| | `posted_by_email` | always populated — the real audit trail if a display name is ever needed later |
| | `is_pinned` | boolean, default false |
| | `created_at` / `updated_at` | timestamps |

`announcements` is a **hard-delete table, deliberately not versioned** like
`bylaws_revisions` — this isn't a legal document trail, so there's no
soft-delete/archive concept. A supporting index,
`idx_announcements_listing ON announcements (is_pinned DESC, created_at DESC)`,
matches the real query shape both the public feed and the admin/officer
manager use — same "index matches the query" instinct as `bylaws_revisions`'
partial unique index and `tournaments`' partial index on `end_date`.

**`isOfficer(email)`** (`lib/auth-helpers.js`) sits alongside `isAdmin`/
`isMember`: joins `officers` to `bowlers` on email, so role membership is
always derived fresh, never cached. `isAdmin` is treated as a superset
everywhere — every officer-gated check in the codebase is written
`isAdmin(email) || isOfficer(email)`, never both required, and an admin is
never also inserted into the `officers` table itself.

**`canViewContactInfo`** (`lib/canViewContactInfo.js`) gained an `isOfficer`
parameter that short-circuits to `true` immediately after the `isAdmin`
check, with an explicit code comment marking it a deliberate expansion of
the existing tiered-visibility rule (§6.5), not an accidental widening. The
one call site (`app/api/member/bowler/[id]/route.js`) now passes
`isOfficer` alongside `isAdmin`, and the same route's edit check
(`PUT`) and `editable` flag (`GET`) were extended the same way — officers
get full edit rights on any bowler's card, exactly like admins.

**A real architectural gap Claude Code found and fixed, not spelled out in
the task text:** loosening `app/admin/layout.js`'s gate from admin-only to
`isAdmin || isOfficer` (so officers can reach Bowler Demographics/
Announcements) meant every *other* existing page under `/admin` — Season
Setup, Weekly, Schedule, By-Laws, Tournaments (list, new, and edit — three
separate page files), and Admin Settings — had been silently relying on
that layout check as its **only** access control; none had a page-level
`isAdmin` check of its own. Fixed with a new shared helper,
`lib/requireAdminPage.js` (redirects to `/admin/announcements` if the
viewer isn't a full admin), called at the top of all **nine** of those page
files (Season Setup, Weekly, Schedule, By-Laws, the three Tournaments pages,
Officers, and Admin Settings). The mutating API routes underneath every one
of those pages were already independently `isAdmin`-gated and needed no
change — this was purely a page-level convenience-check gap, never a real
data-access hole.

**Officers management (`/admin/officers`, admin-only):** `OfficersPage`
loads current officers (joined to `bowlers` for name/email) and a list of
*eligible* bowlers — `email IS NOT NULL AND NOT EXISTS (... already an
officer)` — and hands both to `components/Admin/OfficersManager.js`, a
client component with a dropdown of eligible bowlers ("Firstname Lastname
(email)") and a "Make officer" button, plus a per-row "Remove" button
(`window.confirm("Remove {name} as an officer?")`, no typed-confirmation
Danger Zone treatment — removing officer status isn't destructive to data).
Backed by `GET`/`POST /api/admin/officers` and
`DELETE /api/admin/officers/[bowlerId]`, all independently `isAdmin`-gated
(officer management is the one thing officers can never do to each other).
`POST` re-validates the target bowler has a login email server-side and
returns a specific error — *"This bowler has no login email on file
yet — add one before making them an officer"* — rather than trusting the
page's own filtered dropdown. `DELETE` only removes the `officers` row,
confirmed never touching the underlying `bowlers` record.

**Bowler Demographics has no new page.** The feature only changed API
permissions and the shared `canViewContactInfo` rule, not UI — the existing
`/member/roster` page already has the full bowler grid + edit modal, and
officers already pass `isMember` (they're bowlers with a linked email,
required for officer creation in the first place) so they already reach it.
The sidebar's "Bowler Demographics" link (both admin and officer views)
just points there instead of duplicating that UI under `/admin`.

**Announcements — public feed + admin/officer CRUD:**
- `GET /api/announcements` — public, no auth, `ORDER BY is_pinned DESC,
  created_at DESC`, no pagination at this scale.
- `POST /api/admin/announcements`, `PUT`/`DELETE /api/admin/announcements/[id]`,
  `PATCH /api/admin/announcements/[id]/pin` — every one of these
  independently checks `isAdmin(email) || isOfficer(email)` inline, not a
  shared middleware, matching this codebase's "every route gates itself"
  convention. Title is capped at 120 characters server-side (matching the
  DB `CHECK`) with a specific error message on overflow; both title and
  body are required and trimmed.
- `/admin/announcements` (reachable by both admin and officer) +
  `components/Admin/AnnouncementsManager.js`: inline create/edit form
  (Title input, Body textarea, no rich text), a list of existing
  announcements with a visual 📌 badge on pinned ones, and per-row
  Pin/Unpin, Edit, and Delete (`window.confirm` using the announcement's
  title) actions.
- **Public display is read directly from the DB** on the League Dashboard
  (`app/leagues/[slug]/page.js` — a dynamic route keyed on `leagues.slug`,
  not a hardcoded per-league page as §6.2's URL might suggest) rather than
  self-fetching `GET /api/announcements` — the code comment there says why
  explicitly: matches how every other section of that server component
  (standings, schedule, standing sheets) already reads its own data,
  avoiding a needless network round-trip to itself. Same sort order
  (pinned first, then newest) and the same 📌 badge as the admin view.
- **Known scope note, not a bug:** `announcements` has no foreign key to
  `leagues` or `seasons` — it's genuinely site-wide, the same feed shows on
  every league's dashboard. Fine today with only one real league live; worth
  revisiting if/when Gay Games (§8) becomes a second real, loaded league and
  per-league announcements turn out to matter.

**Verification — every item from the task's checklist confirmed live**
against the dev server, not just read from the code: created a real
`officers`-eligible test bowler (rejected for officer status with no email
on file, confirmed 400), added/removed officer status via the real API with
a real admin session; confirmed as the officer session that contact info
and edit rights extend to another bowler's card and that the edit persists;
full announcement create/edit/pin/delete cycle, confirmed live on the
public dashboard (pinned-first) and via `GET /api/announcements`; confirmed
officers get 403 on officer-management routes and a 307 redirect (not a
raw 403 page) on every admin-only `/admin/*` page while `/admin/announcements`
still renders; confirmed a plain non-officer member is 403'd on every one of
those and sees no contact info; confirmed officer removal is immediate
(re-checked access right after) and never touches the underlying `bowlers`
row. All test fixtures (bowlers, sessions, users, officers, announcements)
deleted afterward and confirmed clean.

**`next build` + `eslint`:** both run clean this time (unlike §11's
bowler-identity work) — `next dev` was stopped first, `.next` removed, a
full `next build` ran clean (all new routes compiled, TypeScript passed),
then `next dev` was restarted so the local environment was left as found.

---

## 15. Full-codebase code review & fixes

**Session date:** September 17, 2026
**Commit:** `33ed04e` — "Fix security/data-integrity findings from full-codebase review"

A full, non-diff code review across `app/`, `components/`, `lib/`, and `migrations/`
— not scoped to recent changes, the whole codebase as it stood — looking for both
correctness bugs and reuse/simplification/efficiency cleanups. Ten findings came
back, each independently verified against the actual source before being reported.
All ten were fixed: three treated as priority (real security/data-integrity
issues), the rest batched as one cleanup pass.

### Priority fixes

**Bowler email collision — no DB-level uniqueness.** Six separate call sites
(`lib/auth-helpers.js`, this route's own `getViewerContext`,
`scheduling-requests`, `message-officers`, the Announcements POST route, the
League Dashboard) each resolved "the bowler for this login email" via
`SELECT id FROM bowlers WHERE email = ${email}` and took `rows[0]` —
with no uniqueness constraint on `bowlers.email`, a member editing their own
card (self-edit is allowed, email is only format-checked) could set their email
to another real bowler's login email and have those lookups nondeterministically
resolve to the wrong person, misattributing edit rights, contact-info visibility,
and message/request authorship. Fixed with a new migration
(`migrations/20260917-add-unique-index-bowlers-email.mjs`) adding a unique index
on `bowlers.email`, confirmed against production first for existing duplicates
(none found). `app/api/member/bowler/[id]/route.js`'s PUT handler now
distinguishes the new constraint from the existing `usbc_id` one via
`err.constraint` and returns a clean, field-specific 400 instead of a generic
500. Verified live: the exact collision now returns
`{"error":"That email is already in use by another bowler"}` at 400, not a crash.

**Tournament image upload trusted the client-declared MIME type.**
`lib/tournaments/createTournament.js`/`updateTournament.js` passed
`imageFile.type` straight through as the Vercel Blob object's served
Content-Type; the API routes only checked `image.type.startsWith("image/")`,
which lets `image/svg+xml` through — a real stored-XSS vector, since an SVG can
carry an inline `<script>` that executes when the blob URL is opened directly.
The PDF upload routes had already avoided this by hardcoding their
`contentType`. Fixed with a new shared allowlist
(`lib/tournaments/allowedImageType.js`: JPEG/PNG/GIF/WebP only), applied in both
`app/api/admin/tournaments/route.js` and `[id]/route.js`, plus a tightened
client `<input accept>` for a consistent UX signal. Verified live: a real SVG
with an inline `<script>`, declared as `image/svg+xml`, is rejected with a
clean 400; a real PNG still uploads successfully.

**Silent write failure in the Weekly Standing Sheet publish path.**
`lib/pdf/publishWeeklyStandingSheet.js`'s per-row `UPDATE league_memberships`
for matched bowlers never checked `rowCount` — a bowler classified "matched" at
parse time but with no existing `league_memberships` row by publish time
(membership deleted, or a parse/publish classification mismatch) would
silently update zero rows while the whole publish still reported `{ ok: true }`,
dropping that bowler's week with no error. Fixed by checking `rowCount === 0`
and throwing a new `InconsistentDataError` inside the transaction, rolling back
the entire publish (not just that row) and surfacing a specific, actionable
message via the route (`app/api/admin/weekly/publish/route.js`, mapped to a
409). Verified live against the real database: simulated the exact scenario (a
real bowler with no membership row for the season) and confirmed the publish
throws with the correct message, leaving zero orphaned
`standing_sheets`/`team_standings` rows behind — a real rollback, not just a
caught error.

### Batch fixes (correctness + simplification)

- **Hyphenated-surname truncation in the PDF parser.**
  `lib/pdf/parseLeagueStandings.js`'s `extractCaptainAndCleanName` used
  `/^(.+?)-(\*)?[A-Za-z]*$/` to strip a trailing "-\*" captain marker
  (optionally followed by an officer-title abbreviation like "Pres"/"Sec"/
  "VP"/"Tr") — but `[A-Za-z]*` matches a real hyphenated surname's second half
  just as well as a title abbreviation, so "John Garcia-Lopez" (no marker at
  all) silently lost "Lopez". Fixed by restricting the suffix to an explicit,
  extensible list of known title abbreviations (`TITLE_ABBREVIATIONS`) instead
  of an arbitrary letter run — an unmatched suffix now stays attached to the
  name (visible, correctable) rather than silently deleting a real name
  segment. Verified against real and edge-case names: plain hyphenated
  surnames, starred captains with and without a title, and a hyphenated
  surname *and* a captain marker together.
- **Ambiguous team-name prefix matching.** The same file's `resolveTeamNumber`
  fell back to a `startsWith` prefix scan when an exact team-name match failed
  (needed because some PDF sections truncate team names), returning the
  *first* match in insertion order — silently corrupting one team's data if
  two team names in the same season share a prefix (e.g. "Pity Party" /
  "Pity Party II"). Fixed to return `undefined` (the existing "skip this row"
  convention already used for a pure miss) when more than one team matches
  the prefix, rather than guessing.
- **Uncaught throw in the Schedule editor.**
  `components/Admin/ScheduleEditor.js`'s `handleEdit` only checked
  `rankedTeamNumbers` for truthiness before calling
  `suggestPositionRoundPairings`, which is hardcoded to a 14-lane structure
  (13 real teams + BYE) and throws synchronously for any other length — with
  no try/catch around the call. Nothing enforces exactly 14 teams at Season
  Setup, so a season with a different team count would throw an uncaught
  error out of the `onClick` handler when an admin tried to edit a Position
  Round/Roll-Off week. Fixed with a `hasValidRankedTeams` guard (truthy *and*
  length === 14) used both for the auto-suggest call and the UI's "nothing to
  auto-suggest from" messaging, which now distinguishes "no completed weeks
  yet" from "wrong team count" for the admin.
- **Timezone-unpinned date formatting in Announcements.** Both
  `components/Admin/AnnouncementsManager.js` and the League Dashboard
  (`app/leagues/[slug]/page.js`) formatted `announcements.created_at` (a
  `TIMESTAMPTZ`) via `toLocaleDateString` with no `timeZone` pinned,
  reintroducing the same class of day-shift display bug already found and
  fixed in the Tournaments feature's date formatter (§13). Worse in the admin
  manager specifically, since it's a `"use client"` component: an unpinned
  timezone means the server's first render (in whatever zone that process
  runs in) and the client's hydration render (in the viewer's local zone) can
  disagree, risking a React hydration-mismatch warning on top of the wrong
  displayed date. Fixed by pinning `timeZone: "UTC"` in both places, matching
  the site's existing convention (`lib/formatWeekDate.js`,
  `lib/tournaments/formatDateRange.js`).
- **Duplicated league-slug literal.** `"lgbt-wednesday-community"` was
  hardcoded in four separate places (`lib/currentSeason.js`,
  `lib/pdf/saveSeasonSetup.js`, `components/layout/Navigation.js`,
  `components/Admin/AdminSidebar.js`) with no single source of truth — a real
  risk given `saveSeasonSetup.js`'s own upsert already anticipates a league
  *name* change (`ON CONFLICT (slug) DO UPDATE SET name`). A slug change
  would have had to be applied in four places by hand, or two hardcoded nav
  links would silently point at a dead slug while `getCurrentSeason()`'s
  query silently stopped matching. Consolidated into a single new
  `lib/leagueSlug.js` (`LGBT_WEDNESDAY_LEAGUE_SLUG`), imported everywhere it
  was previously duplicated.
- **Missing input validation on the tournaments `[id]` route.**
  `app/api/admin/tournaments/[id]/route.js`'s PUT/DELETE passed `Number(id)`
  straight through with no `Number.isInteger` check, unlike the Officers and
  Announcements `[id]` routes, which both validate and return a clean 400. A
  non-numeric id (e.g. `/api/admin/tournaments/abc`) produced `NaN`, which
  reached the SQL layer and surfaced as an unhelpful 500 instead of the same
  clean 400 the rest of the admin API returns for the identical mistake.
  Fixed to match the existing convention.
- **21 copy-pasted admin-auth-check blocks.** The same 3-line
  `session → email → isAdmin(email) ? 403` block (and, for Announcements, a
  4-line `isAdmin || isOfficer` variant, duplicated three different ways
  across three files, including one with its own tiny local helper function)
  was pasted verbatim across every mutating admin API route in the repo — 18
  files, 21 occurrences total. Consolidated into a new
  `lib/requireAdminApi.js` exporting `requireAdminApi()` (admin-only) and
  `requireAdminOrOfficerApi()` (Announcements' admin-or-officer variant),
  each returning `{ email, forbidden }` — callers do
  `const { email, forbidden } = await requireAdminApi(); if (forbidden) return forbidden;`.
  Applied to all 18 files. This is a pure dedupe, not a design change — the
  route itself is still the real security boundary, same as always; there's
  just one place now to audit and change that boundary's behavior instead of
  18.

**Verification:** every fix was verified live against the local dev server
and, for the database-level changes, the real production database — not just
read from the code. Specifically: ran the new unique-index migration against
production after confirming no existing duplicate emails; attempted the exact
email-collision scenario end-to-end via a real authenticated session and
confirmed the clean error; uploaded a real malicious SVG (with an inline
`<script>`) through the actual tournament image upload endpoint and confirmed
rejection, then confirmed a real PNG still uploads; simulated the exact
"matched bowler with no membership row" scenario against the real database
and confirmed both the thrown error and a full rollback with zero orphaned
rows; unit-verified the parser regex fixes against a set of real and
adversarial names/team-name pairs; smoke-tested every refactored admin route
both unauthenticated (still 403/307) and authenticated as the real admin
(announcement creation, self-removal guard), confirming `email` still flows
correctly through the new shared helper everywhere it's needed downstream
(`posted_by_email`, `uploadedBy`, `added_by`, the self-removal check). All
test data (bowlers, sessions, users, announcements, tournaments) created for
verification was deleted afterward and confirmed clean.

**`next build` + `eslint`:** both ran clean (0 errors) after every fix —
`next dev` was stopped before building and restarted after, per this
project's established rule (§11) that running both together corrupts the
`.next` cache. Pushed to `main` and confirmed the production deploy went
`Ready` and served the expected responses (public pages 200, admin routes
redirecting unauthenticated visitors) before considering this done.

---
