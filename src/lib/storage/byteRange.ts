/** Single HTTP byte ranges. Unsupported/malformed ranges are ignored per HTTP semantics. */
export function resolveByteRange(header: string | null, size: number): { start: number; end: number } | "unsatisfiable" | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (!match[1] && !match[2])) return null;
  const left = match[1] ? Number(match[1]) : null;
  const right = match[2] ? Number(match[2]) : null;
  if ((left !== null && !Number.isSafeInteger(left)) || (right !== null && !Number.isSafeInteger(right))) return null;
  if (size === 0) return "unsatisfiable";
  if (left === null) return right === 0 ? "unsatisfiable" : { start: Math.max(0, size - right!), end: size - 1 };
  if (right !== null && right < left) return null;
  if (left >= size) return "unsatisfiable";
  return { start: left, end: Math.min(right ?? size - 1, size - 1) };
}
