/**
 * Migrate a full-backup export from the original Daily app into the new
 * Supabase schema.
 *
 * Usage:
 *   1. Sign up in the NEW app so your auth user exists.
 *   2. In the OLD app: Settings → Export Full Backup (a JSON file).
 *   3. Set env (e.g. in .env): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *      and MIGRATE_USER_EMAIL (or MIGRATE_USER_ID).
 *   4. npm run migrate -- path/to/backup.json          (insert)
 *      npm run migrate -- path/to/backup.json --dry-run (preview counts)
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const filePath = process.argv[2];
const dryRun = process.argv.includes("--dry-run");

if (!filePath) {
  console.error("Usage: npm run migrate -- <backup.json> [--dry-run]");
  process.exit(1);
}
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.",
  );
  process.exit(1);
}

const isYearTitle = (t: string) => /^\d{4}$/.test(String(t ?? "").trim());

function parseTitleAuthor(text: string): { title: string; creator: string } {
  const m = text.match(/^(.*?)\s+[–—-]\s+(.+)$/);
  if (m) return { title: m[1].trim(), creator: m[2].trim() };
  return { title: text.trim(), creator: "" };
}

function mediaTypeFor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("book")) return "book";
  if (n.includes("movie") || n.includes("film")) return "movie";
  if (n.includes("tv") || n.includes("show")) return "tv";
  if (n.includes("music") || n.includes("album") || n.includes("song"))
    return "music";
  return "other";
}

async function resolveUserId(admin: SupabaseClient): Promise<string> {
  if (process.env.MIGRATE_USER_ID) return process.env.MIGRATE_USER_ID;
  const email = process.env.MIGRATE_USER_EMAIL;
  if (!email)
    throw new Error("Set MIGRATE_USER_ID or MIGRATE_USER_EMAIL in env.");
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const user = data.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (!user) throw new Error(`No user found for ${email} in the new project.`);
  return user.id;
}

interface Bucket {
  tasks: Record<string, unknown>[];
  list_groups: Record<string, unknown>[];
  lists: Record<string, unknown>[];
  list_items: Record<string, unknown>[];
  collections: Record<string, unknown>[];
  collection_items: Record<string, unknown>[];
  goals: Record<string, unknown>[];
  goal_entries: Record<string, unknown>[];
  memories: Record<string, unknown>[];
  liked_quotes: Record<string, unknown>[];
}

function transform(appData: any, userId: string): Bucket {
  const b: Bucket = {
    tasks: [],
    list_groups: [],
    lists: [],
    list_items: [],
    collections: [],
    collection_items: [],
    goals: [],
    goal_entries: [],
    memories: [],
    liked_quotes: [],
  };

  // tasks
  for (const [date, dayTasks] of Object.entries(appData.tasks ?? {})) {
    (dayTasks as any[]).forEach((t, i) => {
      b.tasks.push({
        id: randomUUID(),
        user_id: userId,
        date,
        text: String(t.text ?? ""),
        completed: Boolean(t.completed),
        is_label: Boolean(t.isLabel),
        notes: String(t.notes ?? ""),
        position: i,
      });
    });
  }

  // custom lists → either brain-dump groups or year collections
  for (const tab of (appData.customLists ?? []) as any[]) {
    if (isYearTitle(tab.title)) {
      const year = Number(tab.title);
      (tab.lists ?? []).forEach((list: any, li: number) => {
        const isMemoryList = /memor/i.test(list.name ?? "");
        if (isMemoryList) {
          (list.items ?? []).forEach((item: any) => {
            b.memories.push({
              id: randomUUID(),
              user_id: userId,
              occurred_on: `${year}-01-01`,
              type: "note",
              title: "",
              body: String(item.text ?? ""),
              quote_author: "",
              link_url: "",
              position: 0,
              created_at: item.createdAt ?? new Date().toISOString(),
            });
          });
          return;
        }
        const collectionId = randomUUID();
        b.collections.push({
          id: collectionId,
          user_id: userId,
          year,
          name: String(list.name ?? ""),
          position: li,
          banner_url: null,
        });
        (list.items ?? []).forEach((item: any, ii: number) => {
          const { title, creator } = parseTitleAuthor(String(item.text ?? ""));
          b.collection_items.push({
            id: randomUUID(),
            user_id: userId,
            collection_id: collectionId,
            title,
            creator,
            rating:
              typeof item.reviewScore === "number" ? item.reviewScore : null,
            review: String(item.notes ?? ""),
            media_type: mediaTypeFor(String(list.name ?? "")),
            cover_url: null,
            position: ii,
            created_at: item.createdAt ?? new Date().toISOString(),
          });
        });
      });
    } else {
      const groupId = randomUUID();
      b.list_groups.push({
        id: groupId,
        user_id: userId,
        title: String(tab.title ?? ""),
        position: b.list_groups.length,
      });
      (tab.lists ?? []).forEach((list: any, li: number) => {
        const listId = randomUUID();
        b.lists.push({
          id: listId,
          user_id: userId,
          group_id: groupId,
          name: String(list.name ?? ""),
          position: li,
        });
        (list.items ?? []).forEach((item: any, ii: number) => {
          b.list_items.push({
            id: randomUUID(),
            user_id: userId,
            list_id: listId,
            text: String(item.text ?? ""),
            completed: Boolean(item.completed),
            notes: String(item.notes ?? ""),
            position: ii,
            created_at: item.createdAt ?? new Date().toISOString(),
          });
        });
      });
    }
  }

  // goals (daily habits) + entries
  for (const goal of (appData.goals ?? []) as any[]) {
    const goalId = randomUUID();
    b.goals.push({
      id: goalId,
      user_id: userId,
      title: String(goal.title ?? ""),
      cadence: "day",
      target: 1,
      color: null,
      position: Number(goal.position ?? 0),
      archived: false,
      started_at: goal.startedAt ?? new Date().toISOString(),
      created_at: goal.startedAt ?? new Date().toISOString(),
    });
    for (const [date, done] of Object.entries(goal.completionData ?? {})) {
      if (done) {
        b.goal_entries.push({
          id: randomUUID(),
          user_id: userId,
          goal_id: goalId,
          date,
          count: 1,
        });
      }
    }
  }

  // liked quotes
  for (const q of (appData.likedQuotes ?? []) as any[]) {
    if (!q.text) continue;
    b.liked_quotes.push({
      id: randomUUID(),
      user_id: userId,
      text: String(q.text),
      author: String(q.author ?? ""),
      created_at: new Date().toISOString(),
    });
  }

  return b;
}

async function insertAll(admin: SupabaseClient, bucket: Bucket) {
  // Parents before children to satisfy FKs.
  const order: (keyof Bucket)[] = [
    "tasks",
    "list_groups",
    "lists",
    "list_items",
    "collections",
    "collection_items",
    "goals",
    "goal_entries",
    "memories",
    "liked_quotes",
  ];
  for (const table of order) {
    const rows = bucket[table];
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await admin.from(table).insert(chunk);
      if (error) {
        console.error(`Failed inserting into ${table}:`, error.message);
        process.exit(1);
      }
    }
    console.log(`  ${table}: ${rows.length}`);
  }
}

async function main() {
  const admin = createClient(SUPABASE_URL!, SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const userId = await resolveUserId(admin);
  const backup = JSON.parse(readFileSync(filePath, "utf8"));
  const appData = backup.appData ?? backup;
  const bucket = transform(appData, userId);

  console.log(`Target user: ${userId}`);
  console.log(dryRun ? "Dry run — counts only:" : "Inserting:");
  if (dryRun) {
    for (const [k, v] of Object.entries(bucket)) {
      console.log(`  ${k}: ${(v as unknown[]).length}`);
    }
    return;
  }
  await insertAll(admin, bucket);
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
