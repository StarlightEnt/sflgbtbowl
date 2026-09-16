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
