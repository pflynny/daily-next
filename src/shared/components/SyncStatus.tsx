"use client";

import { useAuth } from "@/features/auth/AuthProvider";
import { useAppData } from "@/state/AppDataProvider";
import { Button } from "@/shared/ui/Button";

export function SyncStatus({ compact = false }: { compact?: boolean }) {
  const { cloud } = useAuth();
  const { sync, status, retrySync } = useAppData();
  const error = sync.storageError ?? sync.error;
  const label = error ?? (sync.syncing ? "Syncing…" : sync.pending
    ? `${sync.pending} pending — saved on this device`
    : cloud ? sync.verified ? "All changes saved" : "Cloud data has not loaded yet" : "Saved on this device");
  if (!compact && !error && !sync.pending && status === "ready") return null;
  return (
    <div className={compact ? "flex flex-wrap items-center gap-2 text-xs" : "flex flex-wrap items-center justify-between gap-2 border-b border-line bg-sand px-4 py-2 text-xs"}>
      <span role="status" className={error ? "text-danger" : "text-muted"}>{label}</span>
      {(error || sync.pending > 0) && <Button disabled={sync.syncing} onClick={() => void retrySync()}>Retry sync</Button>}
    </div>
  );
}
