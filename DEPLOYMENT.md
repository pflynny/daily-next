# Going live

A step-by-step to take Daily from local to production. Roughly 30–45 min.
Recommended host: **Vercel** (best fit for Next 16). Supabase + Cloudflare R2
back it.

Legend: **[you]** = needs your account/dashboard · **[me]** = I can do/help.

---

## 1. Supabase project (auth + database)

1. **[you]** Create a new project at supabase.com → note the **Project URL**,
   **anon key**, and **service_role key** (Settings → API).
2. **[me/you]** Run the schema: paste `supabase/migrations/0001_init.sql` into
   the SQL Editor and run it (or `supabase db push` with the CLI).
3. **[you]** Auth → URL Configuration:
   - **Site URL**: your production URL (e.g. `https://daily.yourdomain.com`).
   - **Redirect URLs**: add `https://<prod-url>/**` and
     `http://localhost:3000/**` (covers `/auth/callback` and `/auth/confirm`).
4. **[you]** Auth → Providers → Email: keep **Email** enabled and turn
   **"Confirm email" OFF** (chosen). Sign-up then logs you straight in — no
   confirmation email, and **no SMTP setup needed**. The app handles both modes,
   so you can flip it on later if you ever want it.
   - Note: *password reset* still sends one email via Supabase's built-in
     mailer. That's fine at personal volume; only add custom SMTP (Auth → SMTP,
     e.g. Resend) if you start hitting its rate limit.

## 2. Cloudflare R2 (photos/videos)

1. **[you]** Create an R2 bucket (e.g. `daily-media`) and an **S3 API token**
   (Access Key ID + Secret).
2. **[you]** Enable public access: bucket → Settings → either the **r2.dev**
   public URL or a **custom domain**. Note the host.
3. **[you/me]** Set the bucket **CORS** so the browser can upload (PUT) and read:
   ```json
   [
     {
       "AllowedOrigins": ["https://<prod-url>", "http://localhost:3000"],
       "AllowedMethods": ["GET", "PUT"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
   (Without this, photo/video uploads fail.)

## 3. Deploy to Vercel

1. **[you/me]** Get the code to Vercel — either merge `rebuild` → `main` and
   push to a GitHub repo and import it, or deploy with the Vercel CLI/token.
2. **[you/me]** Set environment variables in Vercel (Project → Settings → Env):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`,
     `R2_ENDPOINT`, `NEXT_PUBLIC_R2_PUBLIC_HOST`
   - (The Supabase **service_role key is NOT needed in Vercel** — it's only for
     the local migration script.)
3. **[me]** Deploy. Note the production URL, then put it back into Supabase's
   Site URL / Redirect URLs (step 1.3) and R2 CORS (step 2.3).

## 4. Migrate your existing data

1. **[you]** Sign up in the live app (creates your account).
2. **[you]** In the OLD app: Settings → Export Full Backup (JSON).
3. **[me]** Run locally against the prod project:
   ```bash
   # .env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MIGRATE_USER_EMAIL
   npm run migrate -- backup.json --dry-run   # preview counts
   npm run migrate -- backup.json             # insert
   ```

## 5. Verify

- Sign in on phone + desktop; confirm tasks/goals/books/memories are there.
- Add a memory photo → confirms R2 upload + public read + CORS.
- Add to Home Screen on your phone (PWA), check it opens offline.

---

### What I need from you to drive this
The **Supabase URL + anon + service_role keys**, the **R2 credentials + public
host**, and (if deploying via CLI) a **Vercel token**. Share those and I'll wire
the env, deploy, set the redirect URLs/CORS, and run the migration.
