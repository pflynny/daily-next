"use client";

import { cn } from "@/lib/utils/cn";
import { todayKey } from "@/lib/utils/date";
import { getDailyQuote } from "@/lib/data/quotes";
import { ChevronDown, ThumbIcon } from "@/shared/ui/icons";
import { useBtcPrice } from "./useBtcPrice";
import { useLikedQuotes } from "./useLikedQuotes";

export function QuotePanel({ onCollapse }: { onCollapse?: () => void }) {
  const quote = getDailyQuote(todayKey());
  const { isLiked, toggleLike } = useLikedQuotes();
  const { formatted, error } = useBtcPrice();
  const liked = quote ? isLiked(quote) : false;

  return (
    <div className="flex items-center gap-4 bg-brand-900 px-4 py-2.5 text-brand-50">
      {quote && (
        <div className="group flex min-w-0 flex-1 items-center gap-2">
          <p className="min-w-0 truncate font-serif text-sm italic text-brand-50/95">
            {quote.text}
            <span className="ml-2 not-italic text-brand-200">
              — {quote.author}
            </span>
          </p>
          <button
            onClick={() => toggleLike(quote)}
            aria-label={liked ? "Unlike quote" : "Like quote"}
            className={cn(
              "shrink-0 transition-opacity",
              liked
                ? "text-brand-300 opacity-100"
                : "text-brand-50/60 opacity-0 hover:text-brand-50 group-hover:opacity-100",
            )}
          >
            <ThumbIcon size={15} />
          </button>
        </div>
      )}

      <div className="flex shrink-0 items-center gap-1.5 text-sm">
        <span className="text-[10px] font-bold uppercase tracking-wide text-btc">
          BTC
        </span>
        <span className="tabular-nums text-brand-50/95">
          {error ? "—" : (formatted ?? "…")}
        </span>
      </div>

      {onCollapse && (
        <button
          onClick={onCollapse}
          aria-label="Hide quote panel"
          className="shrink-0 text-brand-50/60 hover:text-brand-50"
        >
          <ChevronDown size={16} />
        </button>
      )}
    </div>
  );
}
