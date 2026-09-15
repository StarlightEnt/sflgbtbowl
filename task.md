# TASK: Bootstrap sflgbtbowl.com as a Next.js app

## Context
Moving the SF LGBT Wednesday Community Bowling League site from a single
static HTML file (currently drag-and-dropped to Vercel, not in any repo)
into a proper Next.js app under the StarlightEnt GitHub org — same
pipeline as bowling-poker-manager and bowling-poker-digiplay.

## Goal for this task
Get a bare Next.js app live at sflgbtbowl.com, deployed via Vercel,
version-controlled in a new StarlightEnt repo. No new features yet —
just the pipeline, plus the existing landing page content ported over
unchanged.

## Pre-step (done manually by Alli, not CC)

Alli creates an empty repo at `StarlightEnt/sflgbtbowl` on github.com
(no README/files) and clones it to `~/DevProjects/sflgbtbowl` on the
Mac Mini. Claude Code should be launched from inside that directory —
everything below runs there.

## Steps (CC, from ~/DevProjects/sflgbtbowl)

1. Confirm you're in the cloned, empty `sflgbtbowl` repo (`git remote -v`
   should show `StarlightEnt/sflgbtbowl`) before scaffolding anything.

2. Scaffold a Next.js app (latest stable, App Router, TypeScript):
   ```
   npx create-next-app@latest . --typescript --tailwind --app --no-src-dir
   ```

3. Recreate the current live site as `app/page.tsx`. The existing HTML
   isn't in any repo — pull it from the live deployment
   (`curl https://sflgbtbowl.com` or view-source) or ask Alli for the
   original file if the markup doesn't come through cleanly. Keep the
   contact form pointed at the same existing Google Apps Script
   endpoint — don't touch that integration in this task.

4. Create a new Neon Postgres project for this app (separate project
   from Manager and Digiplay's Neon projects, matching the
   one-Neon-project-per-app pattern). Add `DATABASE_URL` to
   `.env.local` (gitignored) and to Vercel's environment variables —
   don't commit it.

5. Add `lib/db.js` using `@neondatabase/serverless`, with
   `{ fetchOptions: { cache: 'no-store' } }` set on the client (the
   Next.js persistent-cache gotcha already hit on the other apps).
   No schema yet — just confirm the connection works.

6. In Vercel: either repoint the existing `sf-lgbt-wednesday-bowling`
   project at this new repo, or spin up a new Vercel project and move
   the `sflgbtbowl.com` domain/DNS over to it. **Confirm with Alli
   before touching DNS** — don't do this step silently.

7. Confirm sflgbtbowl.com is live, serving the ported landing page
   from the new Next.js app, and that a `git push` to main triggers an
   auto-deploy.

## Explicitly out of scope for this task
- Standing sheets page, storage, or admin upload
- Scheduling / makeup-game request form or schema
- Any database tables beyond the bare Neon connection test

These land as their own TASK.md files once this pipeline is live and
verified. Standing sheet PDFs will go in Vercel Blob storage with a
permanent metadata/history table in Neon (season, file URL, upload
date, uploader) — not raw file bytes in Postgres.