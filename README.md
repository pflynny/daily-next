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

## Year films

In **Wrapped**, choose a year and select **Make my year film**. The suggested
draft samples memories across the months, favours milestones, and includes
saved quotes and picks of the year. Explicit Markdown blockquotes in collection
notes are also available in the scene picker.

- Preview, reorder, remove or add scenes; choose video starting points and scene durations.
- Choose landscape or portrait, 720p or 1080p. Films can be up to five minutes.
- Feelings and gratitude are excluded unless you turn them on.
- Optional music is selected from your device, faded in/out, and trimmed to the
  film length. Short music tracks finish early. Video clips are muted; short
  clips hold their final frame.
- Select **Create MP4**, then **Download your film**. Rendering happens in your
  browser using WebCodecs and Mediabunny. Keep the tab open; export can be cancelled.

Export is enabled only when the device supports the required H.264 encoder
(and AAC when music is selected). An up-to-date desktop Chrome or Edge is the
initial testing target. Unsupported source videos, including some HEVC files,
must be removed or replaced with compatible media; no transcoding service is
configured. Preview uses the browser's native media decoder.

Drafts are saved per account and year **on this device**, as media references
and editing choices. They do not sync between devices. Music must be reselected
after closing the editor. Downloads are never automatically uploaded or published.
Review personal content and long text in the preview before sharing.

The player and exporter share a timed canvas renderer. Private media requests
remain authenticated, including byte-range requests used for video seeking.
Run `npm test` for timeline-selection and byte-range regression tests alongside
the existing data tests.

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
