import type { ClipboardEvent } from "react";

export function splitLines(text: string): string[] {
  return text.split(/\r\n|[\n\r\u2028\u2029]/).map((line) => line.trim()).filter(Boolean);
}

/** Preserve the text around the selection, just like a normal paste. */
export function pasteLines(
  event: ClipboardEvent<HTMLInputElement>,
  onLines: (text: string) => void,
): void {
  const pasted = event.clipboardData.getData("text/plain");
  if (!/[\n\r\u2028\u2029]/.test(pasted)) return;
  event.preventDefault();
  if (!splitLines(pasted).length) return;

  const input = event.currentTarget;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  const text = input.value.slice(0, start) + pasted + input.value.slice(end);
  onLines(splitLines(text).join("\n"));
}
