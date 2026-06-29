"use client";

import { BottomNav } from "./BottomNav";
import { CommandPalette } from "@/features/search/CommandPalette";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      <BottomNav />
      <CommandPalette />
    </div>
  );
}
