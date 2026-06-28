"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  CalendarIcon,
  TargetIcon,
  ImagesIcon,
  StackIcon,
  SparkleIcon,
  SettingsIcon,
} from "@/shared/ui/icons";

const ITEMS = [
  { href: "/", label: "Daily", Icon: CalendarIcon },
  { href: "/goals", label: "Goals", Icon: TargetIcon },
  { href: "/memories", label: "Memories", Icon: ImagesIcon },
  { href: "/year", label: "Year", Icon: StackIcon },
  { href: "/wrapped", label: "Wrapped", Icon: SparkleIcon },
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-40 border-t border-line bg-paper/95 backdrop-blur pb-safe">
      <div className="mx-auto flex max-w-3xl items-stretch justify-between px-1">
        {ITEMS.map(({ href, label, Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex flex-1 flex-col items-center gap-1 py-2 transition-colors",
                active ? "text-brand-700" : "text-faint hover:text-ink",
              )}
            >
              <span
                className={cn(
                  "absolute top-0 h-0.5 w-7 rounded-full bg-brand-600 transition-opacity",
                  active ? "opacity-100" : "opacity-0",
                )}
              />
              <Icon size={21} />
              <span className="text-[10px] font-semibold uppercase tracking-wide">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
