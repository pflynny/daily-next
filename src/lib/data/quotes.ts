import quotesData from "./quotes.json";
import type { Quote } from "@/types";

const quotes: Quote[] = (quotesData as { quotes: Quote[] }).quotes;

/** Deterministic quote-of-the-day from a date key, so it's stable per day. */
export function getDailyQuote(dateKey: string): Quote | null {
  if (quotes.length === 0) return null;
  let hash = 0;
  for (let i = 0; i < dateKey.length; i += 1) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) % quotes.length;
  }
  return quotes[hash];
}

export function quoteKey(quote: Quote): string {
  return `${quote.text}__${quote.author}`;
}

export { quotes };
