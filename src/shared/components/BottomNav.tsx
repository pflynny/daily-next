"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { useAppData } from "@/state/AppDataProvider";
import { useIsDesktop } from "@/shared/hooks/useMediaQuery";
import {
  CalendarIcon,
  TargetIcon,
  ImagesIcon,
  MoreIcon,
  NoteIcon,
  SmileIcon,
  StackIcon,
  SparkleIcon,
  SettingsIcon,
} from "@/shared/ui/icons";

export const NAV_ITEMS = [
  { href: "/", label: "Daily", Icon: CalendarIcon },
  { href: "/check-ins", label: "Check-in", Icon: SmileIcon },
  { href: "/goals", label: "Goals", Icon: TargetIcon },
  { href: "/memories", label: "Memories", Icon: ImagesIcon },
  { href: "/year", label: "Year", Icon: StackIcon },
  { href: "/wrapped", label: "Wrapped", Icon: SparkleIcon },
  { href: "/notes", label: "Notes", Icon: NoteIcon },
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  const { href, label, Icon } = item;
  return (
    <Link
      href={href}
      onClick={onClick}
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
}

export function BottomNav() {
  const pathname = usePathname();
  const { settings } = useAppData();
  const isDesktop = useIsDesktop();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => setMoreOpen(false), [pathname]);

  const moreSet = new Set(settings.navMore);
  const collapse = !isDesktop && settings.navMore.length > 0;
  const barItems = collapse
    ? NAV_ITEMS.filter((i) => !moreSet.has(i.href))
    : [...NAV_ITEMS];
  const moreItems = collapse ? NAV_ITEMS.filter((i) => moreSet.has(i.href)) : [];
  const moreActive = moreItems.some((i) => isActive(pathname, i.href));

  return (
    <nav className="sticky bottom-0 z-40 border-t border-line bg-paper/95 backdrop-blur pb-safe">
      <div className="relative mx-auto flex max-w-3xl items-stretch justify-between px-1">
        {barItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
          />
        ))}

        {moreItems.length > 0 && (
          <>
            <button
              onClick={() => setMoreOpen((v) => !v)}
              aria-label="More tabs"
              aria-expanded={moreOpen}
              className={cn(
                "group relative flex flex-1 flex-col items-center gap-1 py-2 transition-colors",
                moreActive ? "text-brand-700" : "text-faint hover:text-ink",
              )}
            >
              <span
                className={cn(
                  "absolute top-0 h-0.5 w-7 rounded-full bg-brand-600 transition-opacity",
                  moreActive ? "opacity-100" : "opacity-0",
                )}
              />
              <MoreIcon size={21} className="rotate-90" />
              <span className="text-[10px] font-semibold uppercase tracking-wide">
                More
              </span>
            </button>

            {moreOpen && (
              <>
                <div
                  className="fixed inset-0"
                  onClick={() => setMoreOpen(false)}
                />
                <div className="absolute bottom-full right-2 mb-2 min-w-[150px] rounded-xl border border-line bg-surface py-1 shadow-lg">
                  {moreItems.map(({ href, label, Icon }) => {
                    const active = isActive(pathname, href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={cn(
                          "flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wide",
                          active
                            ? "text-brand-700"
                            : "text-muted hover:bg-sand hover:text-ink",
                        )}
                      >
                        <Icon size={17} /> {label}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </nav>
  );
}
