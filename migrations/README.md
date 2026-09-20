# Database Migrations

Migration scripts for the sflgbtbowl database.

## Convention
- Filename: `YYYYMMDD-description.mjs`
- Always use `IF NOT EXISTS` / `IF EXISTS` to keep scripts idempotent
- Never delete migration files — they are a permanent audit trail
- Mark already-run migrations with `Status: ALREADY RUN` in the header comment

## Running a migration
```bash
node --use-system-ca --env-file=.env.local migrations/YYYYMMDD-description.mjs
```

## Migration History
| Date | File | Description |
|------|------|-------------|
| 2026-09-15 | 20260915-create-initial-schema.mjs | Create league domain tables (leagues, seasons, teams, bowlers, league_memberships, schedule, standing_sheets, team_standings, weekly_results, scheduling_requests, admin_emails) and NextAuth adapter tables (users, accounts, sessions, verification_token); seed admin_emails with allisushi@gmail.com |
| 2026-09-15 | 20260915-add-week-number-to-scheduling-requests.mjs | Add NOT NULL week_number to scheduling_requests — the week the pre-bowl/makeup request is for, distinct from target_date (when they'll actually bowl it) |
| 2026-09-15 | 20260915-add-nickname-to-bowlers.mjs | Add nullable nickname to bowlers — person-level identity field, same group as name/email/phone/USBC ID |
| 2026-09-15 | 20260915-add-nickname-display-flag-to-bowlers.mjs | Add NOT NULL nickname_use_in_display (default false) to bowlers — opt-in to showing "Nickname Lastname" instead of "Firstname Lastname" wherever a combined display name is shown |
| 2026-09-15 | 20260915-create-bylaws-revisions.mjs | Create bylaws_revisions — season-scoped, versioned By-Laws PDF uploads; DB-enforced (partial unique index) that at most one revision per season is current at a time |
| 2026-09-16 | 20260916-create-tournaments.mjs | Create tournaments — standalone (no FK), plain CRUD directory table for the public /tournaments page and /admin/tournaments; partial index on (end_date) WHERE is_active matches the public listing query shape |
| 2026-09-17 | 20260917-create-officers-and-announcements.mjs | Create officers (role tier between isMember/isAdmin, keyed on bowler_id, UNIQUE — no duplicate officer rows) and announcements (hard-delete, no revision history — posted_by_email always populated as the real audit trail even though posted_by_bowler_id is nullable) |
| 2026-09-17 | 20260917-add-unique-index-bowlers-email.mjs | Add unique index on bowlers.email — closes a real bug where a member could set their own card's email to another bowler's login email, with no DB-level check, and have "resolve my bowler row by email" lookups nondeterministically pick the wrong person |
| 2026-09-18 | 20260918-add-bowl-com-lss-id-to-leagues.mjs | Add nullable bowl_com_lss_id to leagues — backs the League History card's link to lss.bowl.com; backfills LGBT Wednesday Community to 1286 |
| 2026-09-20 | 20260920-create-venues.mjs | Create venues (name/slug/address/phone/website/blurb/logo/is_visible, blurb CHECK ≤150) and add leagues.venue_id; backfills one venues row per distinct leagues.venue text (name only) and links each league. Additive — does not drop leagues.venue |
| 2026-09-20 | 20260920-drop-leagues-venue-column.mjs | Drop the old free-text leagues.venue column. NOT YET RUN — run only after the venues code is deployed (production shares this DB and its deployed code still reads leagues.venue) |
| 2026-09-20 | 20260920-raise-venues-blurb-limit.mjs | Raise the venues.blurb_length CHECK from 150 to 250 characters (constraint altered in place; the original create-venues migration is left as shipped) |
