import test from "node:test";
import assert from "node:assert/strict";
import type { ClipboardEvent } from "react";
import { pasteLines, splitLines } from "../src/lib/utils/pasteLines";

function paste(
  plain: string,
  value = "",
  start = 0,
  end = start,
  html = "",
) {
  let prevented = false;
  let result: string | undefined;
  const event = {
    clipboardData: { getData: (type: string) => type === "text/plain" ? plain : html },
    currentTarget: { value, selectionStart: start, selectionEnd: end },
    preventDefault: () => { prevented = true; },
  } as unknown as ClipboardEvent<HTMLInputElement>;
  pasteLines(event, (text) => { result = text; });
  return { prevented, result };
}

test("pasted line endings are normalized and blank lines are ignored", () => {
  assert.deepEqual(splitLines(" first\r\n\r\nsecond\rthird\nfourth\u2028fifth\u2029sixth "),
    ["first", "second", "third", "fourth", "fifth", "sixth"]);
});

test("single-line pastes retain normal browser behavior", () => {
  assert.deepEqual(paste("one task"), { prevented: false, result: undefined });
});

test("multiline pastes replace only the selected text", () => {
  assert.deepEqual(paste("one\ntwo", "before old after", 7, 10), {
    prevented: true, result: "before one\ntwo after",
  });
});

test("blank-only pastes do not submit or replace the current draft", () => {
  assert.deepEqual(paste("\n \r\n", "keep this", 0, 9), {
    prevented: true, result: undefined,
  });
});

test("plain text with real line breaks takes precedence over HTML", () => {
  // No document is needed: usable plain text should never enter the HTML parser.
  assert.deepEqual(paste("first\nsecond", "", 0, 0, "<div>other text</div>"), {
    prevented: true, result: "first\nsecond",
  });
});

test("large pastes retain every line in order, including repeated tasks", () => {
  const lines = Array.from({ length: 1000 }, (_, index) => `Task ${index % 10}`);
  assert.equal(paste(lines.join("\r\n")).result, lines.join("\n"));
});
