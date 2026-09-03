import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const dynamic = "force-dynamic";

/**
 * Cron-triggered reminder sender (see vercel.json).
 * Sends a morning/evening nudge to every subscribed device whose user
 * hasn't done that check-in today. Vercel authenticates crons with
 * `Authorization: Bearer ${CRON_SECRET}`.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { kind } = await params;
  if (kind !== "morning" && kind !== "evening" && kind !== "weekly") {
    return NextResponse.json({ error: "bad_kind" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!url || !serviceKey || !vapidPublic || !vapidPrivate) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:pgflynn@gmail.com",
    vapidPublic,
    vapidPrivate,
  );

  const supabase = createClient(url, serviceKey);

  // Local date for the app's home timezone.
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.REMINDER_TZ ?? "Europe/London",
  }).format(new Date());

  const { data: subs, error: subsErr } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth");
  if (subsErr) {
    return NextResponse.json({ error: subsErr.message }, { status: 500 });
  }
  if (!subs?.length) return NextResponse.json({ sent: 0 });

  // Weekly review: one summary per user, sent to everyone (no skipping).
  if (kind === "weekly") {
    const d = new Date(`${today}T00:00:00`);
    const back = (d.getDay() + 6) % 7; // Monday start
    d.setDate(d.getDate() - back);
    const weekStart = d.toISOString().slice(0, 10);
    const [{ data: doneTasks }, { data: weekCheckIns }] = await Promise.all([
      supabase.from("tasks").select("user_id").eq("completed", true).gte("date", weekStart).lte("date", today),
      supabase.from("check_ins").select("user_id, date").gte("date", weekStart).lte("date", today),
    ]);
    const taskCount = new Map<string, number>();
    for (const r of doneTasks ?? []) taskCount.set(r.user_id, (taskCount.get(r.user_id) ?? 0) + 1);
    const days = new Map<string, Set<string>>();
    for (const r of weekCheckIns ?? []) days.set(r.user_id, (days.get(r.user_id) ?? new Set()).add(r.date));

    let sentWeekly = 0;
    const deadWeekly: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        const t = taskCount.get(s.user_id) ?? 0;
        const c = days.get(s.user_id)?.size ?? 0;
        const body = `${t} task${t === 1 ? "" : "s"} done · ${c} check-in day${c === 1 ? "" : "s"}. Tap for your week.`;
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ title: "Your week in review", body, url: "/week" }),
          );
          sentWeekly += 1;
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) deadWeekly.push(s.id);
        }
      }),
    );
    if (deadWeekly.length) await supabase.from("push_subscriptions").delete().in("id", deadWeekly);
    return NextResponse.json({ sent: sentWeekly, pruned: deadWeekly.length });
  }

  // Skip users who already checked in.
  const { data: doneRows } = await supabase
    .from("check_ins")
    .select("user_id")
    .eq("date", today)
    .eq("kind", kind);
  const doneUsers = new Set((doneRows ?? []).map((r) => r.user_id));

  const payload = JSON.stringify(
    kind === "morning"
      ? {
          title: "Morning check-in",
          body: "How are you feeling today?",
          url: "/check-ins?focus=morning",
        }
      : {
          title: "Evening check-in",
          body: "How was today? Three good things…",
          url: "/check-ins?focus=evening",
        },
  );

  let sent = 0;
  const dead: string[] = [];
  await Promise.all(
    subs
      .filter((s) => !doneUsers.has(s.user_id))
      .map(async (s) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dh, auth: s.auth },
            },
            payload,
          );
          sent += 1;
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) dead.push(s.id);
        }
      }),
  );

  if (dead.length) {
    await supabase.from("push_subscriptions").delete().in("id", dead);
  }

  return NextResponse.json({ sent, skipped: doneUsers.size, pruned: dead.length });
}
