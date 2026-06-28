# Daily

A calm, personal app for your **days, goals, memories, year and a year-in-review**.
A ground-up rebuild of the original `daily` app.

- **Daily** — 5 days across on desktop, one swipeable day on mobile. Add / reorder
  (drag, touch-friendly) / complete / note tasks. Incomplete tasks carry to today.
- **Goals** — daily habits (GitHub-style year grid) **and** weekly/monthly targets
  ("3 workouts a week") you tick off, with progress + history.
- **Memories** — a timeline grouped by year. Capture notes, quotes, photos, videos
  or links. Filter by type.
- **Year** — per-year collections (Books / Movies / TV …) with title, creator,
  rating and review, plus an optional cover photo per list.
- **Wrapped** — an editorial year-in-review pulled from everything above.
- **Settings** — sync status, preferences, backup export/import, liked quotes.

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4
- Supabase (auth + Postgres, row-level security) — canonical data store
- Cloudflare R2 (S3-compatible) — photo/video storage via presigned uploads
- dnd-kit — drag-and-drop

If Supabase isn't configured, the app runs in **local/guest mode** (data in
`localStorage`), which is handy for development.

## Getting started

```bash
npm install
cp .env.example .env   # fill in the values below
npm run dev            # http://localhost:3000
```

### 1. Supabase

1. Create a new Supabase project.
2. Run `supabase/migrations/0001_init.sql` in the SQL editor (or `supabase db push`).
3. Put the project URL + anon key in `.env`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only, used by the migration script)

### 2. Cloudflare R2 (media)

1. Create an R2 bucket and an S3 API token (access key + secret).
2. Enable public access (an `r2.dev` URL or a custom domain).
3. Fill `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`,
   `R2_ENDPOINT`, and `NEXT_PUBLIC_R2_PUBLIC_HOST` in `.env`.

Uploads fall back to inline data URLs when R2 isn't configured, so the timeline
still works locally.

## Migrating data from the old app

1. Sign up in this app so your account exists.
2. In the **old** app: Settings → Export Full Backup (a JSON file).
3. Set `MIGRATE_USER_EMAIL` (or `MIGRATE_USER_ID`) in `.env`.
4. Preview, then run:

```bash
npm run migrate -- path/to/backup.json --dry-run   # counts only
npm run migrate -- path/to/backup.json             # insert
```

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm run migrate    # data migration (see above)
```
