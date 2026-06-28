type ClassValue = string | number | false | null | undefined;

/** Tiny className joiner — keeps deps light, no clsx needed. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
