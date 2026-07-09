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
  if (kind !== "morning" && kind !== "evening") {
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
          url: "/check-ins",
        }
      : {
          title: "Evening check-in",
          body: "How was today? Three good things…",
          url: "/check-ins",
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
