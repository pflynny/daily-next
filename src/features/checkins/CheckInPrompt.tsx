"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { todayKey } from "@/lib/utils/date";
import { MoonIcon, SunIcon, XIcon } from "@/shared/ui/icons";
import { useCheckIns } from "./useCheckIns";
import type { CheckInKind } from "@/types";

const MORNING_UNTIL = 12; // prompt before noon
const EVENING_FROM = 17; // prompt from 5pm

function dismissKey(date: string, kind: CheckInKind): string {
  return `checkin-prompt-dismissed:${date}:${kind}`;
}

/** Gentle, dismissible nudge to do today's check-in. Renders nothing when
 *  outside the prompt windows, already checked in, or dismissed today. */
export function CheckInPrompt() {
  const { forDate } = useCheckIns();
  const [kind, setKind] = useState<CheckInKind | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    const k: CheckInKind | null =
      hour < MORNING_UNTIL ? "morning" : hour >= EVENING_FROM ? "evening" : null;
    if (!k) return;
    if (window.localStorage.getItem(dismissKey(todayKey(), k))) return;
    setKind(k);
  }, []);

  if (!kind || forDate(todayKey(), kind)) return null;

  const isMorning = kind === "morning";

  return (
    <div className="flex items-center gap-2.5 border-b border-line bg-brand-50/60 px-4 py-2">
      {isMorning ? (
        <SunIcon size={15} className="shrink-0 text-brand-500" />
      ) : (
        <MoonIcon size={15} className="shrink-0 text-brand-500" />
      )}
      <Link
        href="/check-ins"
        className="min-w-0 flex-1 truncate text-xs text-muted hover:text-ink"
      >
        <span className="font-semibold text-ink">
          {isMorning ? "Morning check-in" : "Evening check-in"}
        </span>{" "}
        — {isMorning ? "how are you feeling?" : "how was today?"}
      </Link>
      <button
        onClick={() => {
          window.localStorage.setItem(dismissKey(todayKey(), kind), "1");
          setKind(null);
        }}
        aria-label="Dismiss check-in prompt"
        className="shrink-0 rounded p-1 text-faint hover:text-ink"
      >
        <XIcon size={14} />
      </button>
    </div>
  );
}
