/**
 * Export a full app backup from Supabase to JSON — same shape as
 * Settings → Export backup, so it can be re-imported through the app.
 *
 * Usage:
 *   npm run export-backup                     → ~/Downloads/daily-backup-YYYY-MM-DD.json
 *   npm run export-backup -- path/to/out.json
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env,
 * and MIGRATE_USER_EMAIL if the project has more than one user.
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { ENTITIES, STATE_KEYS } from "../src/lib/db/entities";
import { readAllRows } from "../src/lib/db/readAllRows";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const outPath =
  process.argv[2] ??
  join(homedir(), "Downloads", `daily-backup-${new Date().toISOString().slice(0, 10)}.json`);

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  const profiles = await readAllRows(supabase, "profiles");

  const wantEmail = process.env.MIGRATE_USER_EMAIL;
  const profile =
    profiles.length === 1
      ? profiles[0]
      : profiles.find((p) => p.email === wantEmail);
  if (!profile) {
    console.error(
      `Could not pick a user (${profiles.length} profiles). Set MIGRATE_USER_EMAIL.`,
    );
    process.exit(1);
  }

  const state: Record<string, unknown[]> = {};
  for (const key of STATE_KEYS) {
    const { table, fromRow } = ENTITIES[key];
    const rows = await readAllRows(supabase, table, { column: "user_id", id: String(profile.id) });
    state[key] = rows.map(fromRow);
    console.log(`${key}: ${state[key].length}`);
  }

  const backup = {
    app: "daily",
    version: 1,
    exportedAt: new Date().toISOString(),
    state,
    settings: profile.settings ?? {},
  };

  writeFileSync(outPath, JSON.stringify(backup, null, 2));
  console.log(`\nWrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
