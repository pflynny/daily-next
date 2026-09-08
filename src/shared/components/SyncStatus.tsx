"use client";

import { useAppData } from "@/state/AppDataProvider";
import { Button } from "@/shared/ui/Button";

export function SyncStatus({ compact = false }: { compact?: boolean }) {
  const { sync, retrySync } = useAppData();
  const error = sync.storageError ?? sync.error;
  if (!error) return null;
  return (
    <div className={compact ? "flex flex-wrap items-center gap-2 text-xs" : "fixed inset-x-0 top-2 z-50 mx-auto flex w-fit max-w-[calc(100vw-1rem)] flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-sand/95 px-3 py-2 text-xs shadow-sm backdrop-blur"}>
      <span role="alert" className="text-danger">{error}</span>
      <Button disabled={sync.syncing} onClick={() => void retrySync()}>Retry sync</Button>
    </div>
  );
}
