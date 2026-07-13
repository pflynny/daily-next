"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/shared/components/PageHeader";
import { Screen } from "@/shared/components/Screen";
import { cn } from "@/lib/utils/cn";
import { formatLongDate, todayKey } from "@/lib/utils/date";
import { CheckIcon, ChevronDown, MoonIcon, PencilIcon, StarIcon, SunIcon } from "@/shared/ui/icons";
import { YearPicker } from "@/shared/ui/YearPicker";
import { useCheckIns } from "./useCheckIns";
import { FeelingPicker } from "./FeelingPicker";
import { TONE_OF } from "./feelings";
import type { CheckIn, CheckInKind } from "@/types";

const PAGE_SIZE = 30;

export function CheckInsView() {
  const { history } = useCheckIns();
  const today = todayKey();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [filter, setFilter] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [editDate, setEditDate] = useState<string | null>(null);

  const yearHistory = useMemo(
    () => history.filter((day) => day.date.startsWith(`${year}-`)),
    [history, year],
  );

  // Feelings that appear in the selected year, most frequent first.
  const usedFeelings = useMemo(() => {
    const counts = new Map<string, number>();
    for (const day of yearHistory) {
      for (const c of [day.morning, day.evening]) {
        for (const w of c?.feelings ?? []) {
          counts.set(w, (counts.get(w) ?? 0) + 1);
        }
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [yearHistory]);

  const pastDays = useMemo(
    () =>
      yearHistory
        .filter((day) => day.date !== today)
        .filter(
          (day) =>
            !filter ||
            day.morning?.feelings.includes(filter) ||
            day.evening?.feelings.includes(filter),
        ),
    [yearHistory, today, filter],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="CHECK-INS">
        <YearPicker
          year={year}
          onChange={(y) => {
            setYear(y);
            setFilter("");
            setLimit(PAGE_SIZE);
          }}
        />
      </PageHeader>
      <Screen>
        <div className="mx-auto max-w-2xl space-y-4 p-4 pb-12">
          {year === currentYear && (
            <>
              <DayCard date={today} kind="morning" />
              <DayCard date={today} kind="evening" />
            </>
          )}

          <section>
            <div className="mb-2 mt-6 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500">
                History
              </h2>
              <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
                <input
                  type="date"
                  max={today}
                  value={editDate ?? ""}
                  onChange={(e) => {
                    if (e.target.value) setEditDate(e.target.value);
                  }}
                  aria-label="Add or edit a past day"
                  className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-2 py-1 text-xs text-muted outline-none focus:border-brand-400 sm:flex-none"
                />
                {usedFeelings.length > 0 && (
                  <select
                    value={filter}
                    onChange={(e) => {
                      setFilter(e.target.value);
                      setLimit(PAGE_SIZE);
                    }}
                    className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-2 py-1 text-xs text-muted outline-none focus:border-brand-400 sm:flex-none"
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
            </div>

            {editDate && editDate !== today && (
              <div className="mb-4 rounded-2xl border border-brand-300 bg-brand-50/40 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                    {formatLongDate(editDate)}
                  </span>
                  <button
                    onClick={() => setEditDate(null)}
                    className="rounded-lg border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted hover:text-ink"
                  >
                    Done
                  </button>
                </div>
                <div className="space-y-3">
                  <DayCard date={editDate} kind="morning" startExpanded />
                  <DayCard date={editDate} kind="evening" startExpanded />
                </div>
              </div>
            )}

            <div className="space-y-3">
              {pastDays.slice(0, limit).map((day) => (
                <HistoryDay
                  key={day.date}
                  date={day.date}
                  morning={day.morning}
                  evening={day.evening}
                  onEdit={() => setEditDate(day.date)}
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
                {filter
                  ? "No days match that feeling."
                  : `No check-ins in ${year} yet.`}
              </p>
            )}
          </section>
        </div>
      </Screen>
    </div>
  );
}

/* ------------------------- Check-in cards ------------------------- */

function DayCard({
  date,
  kind,
  startExpanded = false,
}: {
  date: string;
  kind: CheckInKind;
  startExpanded?: boolean;
}) {
  const { forDate, save } = useCheckIns();
  const existing = forDate(date, kind);
  const feelings = existing?.feelings ?? [];
  const gratitude = existing?.gratitude ?? [];
  const isMorning = kind === "morning";

  const done = feelings.length > 0 || gratitude.some((g) => g.trim());
  // null = follow the default (done → collapsed); set once the user
  // expands/collapses manually or starts editing, so the card doesn't
  // snap shut mid check-in.
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null);
  const expanded = userExpanded ?? (startExpanded || !done);

  function toggleFeeling(word: string) {
    if (userExpanded === null) setUserExpanded(true);
    const next = feelings.includes(word)
      ? feelings.filter((w) => w !== word)
      : [...feelings, word];
    save(date, kind, { feelings: next }, existing);
  }

  function commitGratitude(index: number, text: string) {
    if (userExpanded === null) setUserExpanded(true);
    const next = [gratitude[0] ?? "", gratitude[1] ?? "", gratitude[2] ?? ""];
    next[index] = text.trim();
    save(date, kind, { gratitude: next }, existing);
  }

  const topGratitude = gratitude.find((g) => g.trim());

  return (
    <section
      className={cn(
        "rounded-2xl border border-line bg-surface transition-opacity",
        expanded ? "p-4" : "p-3 opacity-70 hover:opacity-100",
      )}
    >
      <button
        onClick={() => setUserExpanded(!expanded)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 text-left"
      >
        {isMorning ? (
          <SunIcon size={16} className="shrink-0 text-brand-500" />
        ) : (
          <MoonIcon size={16} className="shrink-0 text-brand-500" />
        )}
        <h2 className="text-sm font-semibold text-ink">
          {isMorning ? "Morning" : "Evening"}
        </h2>
        {done ? (
          <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white">
            <CheckIcon size={10} />
          </span>
        ) : (
          <span className="text-xs text-faint">
            {isMorning ? "How do you feel?" : "How was today?"}
          </span>
        )}
        <ChevronDown
          size={14}
          className={cn(
            "ml-auto shrink-0 text-faint transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>

      {!expanded && done && (
        <div className="mt-2 flex flex-wrap items-center gap-1 pl-6">
          {feelings.map((w) => (
            <span
              key={w}
              className="rounded-full bg-ink/5 px-2 py-0.5 text-[11px] text-muted"
            >
              {w}
            </span>
          ))}
          {topGratitude && (
            <span className="flex items-center gap-1 text-xs text-muted">
              <StarIcon size={11} className="text-brand-500" /> {topGratitude}
            </span>
          )}
        </div>
      )}

      {expanded && (
        <div className="mt-3">
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
  onEdit,
}: {
  date: string;
  morning?: CheckIn;
  evening?: CheckIn;
  onEdit: () => void;
}) {
  const gratitude = (evening?.gratitude ?? []).filter(Boolean);
  return (
    <div className="group rounded-xl border border-line bg-surface p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
          {formatLongDate(date)}
        </span>
        <button
          onClick={onEdit}
          aria-label={`Edit ${formatLongDate(date)}`}
          className="hover-reveal rounded p-1 text-faint hover:text-ink"
        >
          <PencilIcon size={13} />
        </button>
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
