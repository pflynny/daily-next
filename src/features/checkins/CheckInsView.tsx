"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/shared/components/PageHeader";
import { Screen } from "@/shared/components/Screen";
import { cn } from "@/lib/utils/cn";
import { formatLongDate, todayKey } from "@/lib/utils/date";
import { MoonIcon, StarIcon, SunIcon } from "@/shared/ui/icons";
import { useCheckIns } from "./useCheckIns";
import { FeelingPicker } from "./FeelingPicker";
import { TONE_OF } from "./feelings";
import type { CheckIn, CheckInKind } from "@/types";

const PAGE_SIZE = 30;

export function CheckInsView() {
  const { history } = useCheckIns();
  const today = todayKey();
  const [filter, setFilter] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);

  // Feelings that actually appear in history, most frequent first.
  const usedFeelings = useMemo(() => {
    const counts = new Map<string, number>();
    for (const day of history) {
      for (const c of [day.morning, day.evening]) {
        for (const w of c?.feelings ?? []) {
          counts.set(w, (counts.get(w) ?? 0) + 1);
        }
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [history]);

  const pastDays = useMemo(
    () =>
      history
        .filter((day) => day.date !== today)
        .filter(
          (day) =>
            !filter ||
            day.morning?.feelings.includes(filter) ||
            day.evening?.feelings.includes(filter),
        ),
    [history, today, filter],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="CHECK-INS" />
      <Screen>
        <div className="mx-auto max-w-2xl space-y-4 p-4 pb-12">
          <TodayCard kind="morning" />
          <TodayCard kind="evening" />

          {history.some((d) => d.date !== today) && (
            <section>
              <div className="mb-2 mt-6 flex items-center justify-between gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500">
                  History
                </h2>
                {usedFeelings.length > 0 && (
                  <select
                    value={filter}
                    onChange={(e) => {
                      setFilter(e.target.value);
                      setLimit(PAGE_SIZE);
                    }}
                    className="rounded-lg border border-line bg-paper px-2 py-1 text-xs text-muted outline-none focus:border-brand-400"
                  >
                    <option value="">All feelings</option>
                    {usedFeelings.map(([word, count]) => (
                      <option key={word} value={word}>
                        {word} ({count})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-3">
                {pastDays.slice(0, limit).map((day) => (
                  <HistoryDay
                    key={day.date}
                    date={day.date}
                    morning={day.morning}
                    evening={day.evening}
                  />
                ))}
              </div>

              {pastDays.length > limit && (
                <button
                  onClick={() => setLimit((n) => n + PAGE_SIZE)}
                  className="mt-4 w-full rounded-lg border border-line py-2 text-xs font-semibold uppercase tracking-wide text-muted hover:text-ink"
                >
                  Show more
                </button>
              )}
              {pastDays.length === 0 && (
                <p className="py-6 text-center text-sm text-faint">
                  No days match that feeling yet.
                </p>
              )}
            </section>
          )}
        </div>
      </Screen>
    </div>
  );
}

/* ------------------------- Today's cards -------------------------- */

function TodayCard({ kind }: { kind: CheckInKind }) {
  const { forDate, save } = useCheckIns();
  const date = todayKey();
  const existing = forDate(date, kind);
  const feelings = existing?.feelings ?? [];
  const gratitude = existing?.gratitude ?? [];
  const isMorning = kind === "morning";

  function toggleFeeling(word: string) {
    const next = feelings.includes(word)
      ? feelings.filter((w) => w !== word)
      : [...feelings, word];
    save(date, kind, { feelings: next }, existing);
  }

  function commitGratitude(index: number, text: string) {
    const next = [gratitude[0] ?? "", gratitude[1] ?? "", gratitude[2] ?? ""];
    next[index] = text.trim();
    save(date, kind, { gratitude: next }, existing);
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        {isMorning ? (
          <SunIcon size={16} className="text-brand-500" />
        ) : (
          <MoonIcon size={16} className="text-brand-500" />
        )}
        <h2 className="text-sm font-semibold text-ink">
          {isMorning ? "Morning" : "Evening"}
        </h2>
        <span className="text-xs text-faint">
          {isMorning ? "How do you feel?" : "How was today?"}
        </span>
      </div>

      <FeelingPicker selected={feelings} onToggle={toggleFeeling} />

      {!isMorning && (
        <div className="mt-4">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            Three good things from today
          </div>
          <div className="space-y-1.5">
            {[0, 1, 2].map((i) => (
              <GratitudeInput
                key={`${date}-${i}`}
                value={gratitude[i] ?? ""}
                top={i === 0}
                placeholder={
                  i === 0 ? "The best thing…" : `Something else good…`
                }
                onCommit={(text) => commitGratitude(i, text)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function GratitudeInput({
  value,
  top,
  placeholder,
  onCommit,
}: {
  value: string;
  top: boolean;
  placeholder: string;
  onCommit: (text: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  return (
    <div className="flex items-center gap-2">
      <StarIcon
        size={13}
        className={cn("shrink-0", top ? "text-brand-500" : "text-line")}
      />
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft.trim() !== value) onCommit(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        placeholder={placeholder}
        className="w-full rounded-lg border border-line bg-paper px-3 py-1.5 text-sm outline-none placeholder:text-faint/70 focus:border-brand-400"
      />
    </div>
  );
}

/* --------------------------- History ------------------------------ */

function FeelingChips({ feelings }: { feelings: string[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {feelings.map((w) => (
        <span
          key={w}
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px]",
            TONE_OF.get(w) === "down"
              ? "bg-amber-700/10 text-amber-800"
              : TONE_OF.get(w) === "flat"
                ? "bg-ink/5 text-muted"
                : "bg-brand-500/10 text-brand-700",
          )}
        >
          {w}
        </span>
      ))}
    </span>
  );
}

function HistoryDay({
  date,
  morning,
  evening,
}: {
  date: string;
  morning?: CheckIn;
  evening?: CheckIn;
}) {
  const gratitude = (evening?.gratitude ?? []).filter(Boolean);
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
        {formatLongDate(date)}
      </div>
      <div className="space-y-1.5">
        {morning && morning.feelings.length > 0 && (
          <div className="flex items-start gap-2">
            <SunIcon size={13} className="mt-0.5 shrink-0 text-faint" />
            <FeelingChips feelings={morning.feelings} />
          </div>
        )}
        {evening && evening.feelings.length > 0 && (
          <div className="flex items-start gap-2">
            <MoonIcon size={13} className="mt-0.5 shrink-0 text-faint" />
            <FeelingChips feelings={evening.feelings} />
          </div>
        )}
        {gratitude.length > 0 && (
          <ul className="space-y-0.5 pt-1">
            {gratitude.map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <StarIcon
                  size={12}
                  className={cn(
                    "mt-1 shrink-0",
                    i === 0 ? "text-brand-500" : "text-line",
                  )}
                />
                <span className={i === 0 ? "text-ink" : "text-muted"}>{g}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
