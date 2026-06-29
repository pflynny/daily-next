"use client";

import { useRef, useState } from "react";
import { PageHeader } from "@/shared/components/PageHeader";
import { Screen } from "@/shared/components/Screen";
import { cn } from "@/lib/utils/cn";
import { TrashIcon, UploadIcon } from "@/shared/ui/icons";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAppData } from "@/state/AppDataProvider";
import { useLikedQuotes } from "@/features/panel/useLikedQuotes";
import { RoutinesManager } from "@/features/routines/RoutinesManager";
import { InstallButton } from "./InstallButton";
import { STATE_KEYS, type StateKey } from "@/lib/db/entities";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-brand-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-1.5">
      <span className="text-sm text-ink">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-10 rounded-full transition-colors",
          checked ? "bg-brand-600" : "bg-line",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </button>
    </label>
  );
}

export function SettingsView() {
  const auth = useAuth();
  const data = useAppData();
  const { likedQuotes, remove } = useLikedQuotes();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  function exportBackup() {
    const state: Record<string, unknown> = {};
    for (const key of STATE_KEYS) state[key] = data[key];
    const backup = {
      app: "daily",
      version: 1,
      exportedAt: new Date().toISOString(),
      state,
      settings: data.settings,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importBackup(file: File) {
    try {
      const parsed = JSON.parse(await file.text());
      const state = parsed.state ?? {};
      let count = 0;
      for (const key of STATE_KEYS) {
        const rows = state[key];
        if (Array.isArray(rows) && rows.length) {
          data.put(key as StateKey, rows);
          count += rows.length;
        }
      }
      if (parsed.settings) data.setSettings(parsed.settings);
      setImportMsg(`Imported ${count} items.`);
    } catch {
      setImportMsg("That file could not be read.");
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="SETTINGS" />
      <Screen>
        <div className="mx-auto max-w-xl space-y-4 p-4">
          {/* Account */}
          <Section title="Account">
            {auth.configured ? (
              <>
                <p className="mb-3 text-sm text-muted">
                  {auth.user?.email ?? "Signed in"}
                </p>
                <button
                  onClick={auth.signOut}
                  className="rounded-lg border border-line px-3.5 py-2 text-xs font-semibold uppercase tracking-wide text-muted hover:text-ink"
                >
                  Sign out
                </button>
              </>
            ) : (
              <p className="text-sm text-muted">
                Running in local mode — data is saved to this browser. Connect
                Supabase to sync across devices.
              </p>
            )}
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span
                className={cn(
                  "inline-block size-2 rounded-full",
                  auth.cloud ? "bg-brand-500" : "bg-faint",
                )}
              />
              <span className="text-muted">
                {auth.cloud ? "Cloud sync on" : "Local only"}
              </span>
            </div>
          </Section>

          {/* Preferences */}
          <Section title="Preferences">
            <Toggle
              label="Week starts on Monday"
              checked={data.settings.weekStartsOn === 1}
              onChange={(v) =>
                data.setSettings({ weekStartsOn: v ? 1 : 0 })
              }
            />
            <Toggle
              label="Show lists panel on Daily"
              checked={data.settings.showLists}
              onChange={(v) => data.setSettings({ showLists: v })}
            />
            <Toggle
              label="Show quote & price panel"
              checked={data.settings.showPanel}
              onChange={(v) => data.setSettings({ showPanel: v })}
            />
          </Section>

          {/* Data */}
          <Section title="Data">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportBackup}
                className="rounded-lg border border-line px-3.5 py-2 text-xs font-semibold uppercase tracking-wide text-muted hover:text-ink"
              >
                Export backup
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-xs font-semibold uppercase tracking-wide text-muted hover:text-ink"
              >
                <UploadIcon size={14} /> Import backup
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) importBackup(e.target.files[0]);
                  e.target.value = "";
                }}
              />
            </div>
            {importMsg && (
              <p className="mt-2 text-xs text-brand-700">{importMsg}</p>
            )}
          </Section>

          {/* Routines */}
          <Section title="Routines">
            <p className="mb-3 text-sm text-muted">
              Recurring tasks that auto-fill your day on the chosen weekdays.
            </p>
            <RoutinesManager />
          </Section>

          {/* App */}
          <Section title="App">
            <InstallButton />
          </Section>

          {/* Integrations */}
          <Section title="Integrations">
            <ul className="space-y-3">
              {[
                {
                  name: "Strava",
                  desc: "Auto-count workouts towards your weekly goals.",
                },
                {
                  name: "Garmin",
                  desc: "Pull daily steps and activity.",
                },
              ].map((i) => (
                <li key={i.name} className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-ink">{i.name}</div>
                    <div className="text-xs text-muted">{i.desc}</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-sand px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-faint">
                    Coming soon
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          {/* Liked quotes */}
          <Section title={`Liked quotes (${likedQuotes.length})`}>
            {likedQuotes.length === 0 ? (
              <p className="text-sm text-muted">
                Like quotes from the Daily panel to keep them here.
              </p>
            ) : (
              <ul className="space-y-2">
                {likedQuotes.map((q) => (
                  <li
                    key={q.id}
                    className="group flex items-start justify-between gap-3 border-b border-line/60 pb-2"
                  >
                    <div>
                      <p className="font-serif text-sm italic text-ink">
                        {q.text}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">{q.author}</p>
                    </div>
                    <button
                      onClick={() => remove(q.id)}
                      aria-label="Remove quote"
                      className="shrink-0 text-faint opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                    >
                      <TrashIcon size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <p className="pb-6 text-center text-xs text-faint">Daily · v1</p>
        </div>
      </Screen>
    </div>
  );
}
