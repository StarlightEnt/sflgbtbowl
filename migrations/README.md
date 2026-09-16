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
