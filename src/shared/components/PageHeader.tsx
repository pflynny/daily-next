"use client";

import { SearchIcon } from "@/shared/ui/icons";
import { OPEN_SEARCH_EVENT } from "@/features/search/CommandPalette";

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
      <div className="min-w-0">
        <h1 className="font-mono text-lg font-bold tracking-tight text-ink">
          {title}
        </h1>
        {subtitle && <p className="truncate text-xs text-faint">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))}
          aria-label="Search"
          className="rounded-lg p-1.5 text-muted hover:bg-sand hover:text-ink"
        >
          <SearchIcon size={18} />
        </button>
        {children}
      </div>
    </header>
  );
}
