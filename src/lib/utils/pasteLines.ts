import type { ClipboardEvent } from "react";

export function splitLines(text: string): string[] {
  return text.split(/\r\n|[\n\r\u2028\u2029]/).map((line) => line.trim()).filter(Boolean);
}

/** Gmail and other rich editors may put the line breaks only in HTML. */
function htmlLines(html: string, document: Document): string {
  // Template content stays inert: pasted scripts and remote images never run/load.
  const template = document.createElement("template");
  template.innerHTML = html;
  const blocks = new Set([
    "DIV", "P", "LI", "UL", "OL", "BLOCKQUOTE", "PRE", "TR",
    "H1", "H2", "H3", "H4", "H5", "H6", "SECTION", "ARTICLE",
  ]);

  function read(node: Node, preserveWhitespace = false): string {
    if (node.nodeType === 3) {
      const text = node.textContent ?? "";
      return preserveWhitespace ? text : text.replace(/[\t\n\r ]+/g, " ");
    }
    if (node.nodeType !== 1 && node.nodeType !== 11) return "";
    const element = node as HTMLElement;
    const tag = element.tagName;
    if (["SCRIPT", "STYLE", "TEMPLATE", "HEAD"].includes(tag)) return "";
    if (tag === "BR") return "\n";
    if (element.hidden || element.style?.display === "none") return "";
    const preserve = preserveWhitespace || tag === "PRE" ||
      /^pre/.test(element.style?.whiteSpace ?? "");
    const text = Array.from(node.childNodes, (child) => read(child, preserve)).join("");
    if (blocks.has(tag)) return `\n${text}\n`;
    if (tag === "TD" || tag === "TH") return `${text} `;
    return text;
  }

  return splitLines(read(template.content)).join("\n");
}

/** Preserve the text around the selection, just like a normal paste. */
export function pasteLines(
  event: ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  onLines: (text: string) => void,
): void {
  let pasted = event.clipboardData.getData("text/plain");
  if (splitLines(pasted).length < 2) {
    const html = event.clipboardData.getData("text/html");
    if (html) {
      const formatted = htmlLines(html, event.currentTarget.ownerDocument);
      if (splitLines(formatted).length > 1) pasted = formatted;
    }
  }
  if (!/[\n\r\u2028\u2029]/.test(pasted)) return;
  event.preventDefault();
  if (!splitLines(pasted).length) return;

  const input = event.currentTarget;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  const text = input.value.slice(0, start) + pasted + input.value.slice(end);
  onLines(splitLines(text).join("\n"));
}
