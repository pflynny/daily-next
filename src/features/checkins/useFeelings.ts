"use client";

import { useMemo } from "react";
import { useAppData } from "@/state/AppDataProvider";
import {
  FEELINGS,
  PRIMARY_FEELINGS,
  TONE_OF,
  type Feeling,
  type FeelingTone,
} from "./feelings";

/**
 * The effective check-in vocabulary: built-ins minus the words the user
 * removed, plus their own words. Custom words always show before the
 * "more" expander, and a custom entry shadows a built-in of the same word
 * (that's how renaming/re-toning a built-in works).
 */
export function useFeelings() {
  const { settings, setSettings } = useAppData();
  const custom = useMemo(
    () => settings.customFeelings ?? [],
    [settings.customFeelings],
  );
  const hidden = useMemo(
    () => settings.hiddenFeelings ?? [],
    [settings.hiddenFeelings],
  );

  const derived = useMemo(() => {
    const hiddenSet = new Set(hidden);
    const customWords = new Set(custom.map((c) => c.word));
    const base = FEELINGS.filter(
      (f) => !hiddenSet.has(f.word) && !customWords.has(f.word),
    );
    const byTone = (tone: FeelingTone): Feeling[] => [
      ...base.filter((f) => f.tone === tone),
      ...custom.filter((c) => c.tone === tone),
    ];
    const feelings = [...byTone("up"), ...byTone("flat"), ...byTone("down")];
    const primary = new Set([
      ...[...PRIMARY_FEELINGS].filter((w) => !hiddenSet.has(w)),
      ...custom.map((c) => c.word),
    ]);
    const toneOf = (word: string): FeelingTone | undefined =>
      custom.find((c) => c.word === word)?.tone ?? TONE_OF.get(word);
    return { feelings, primary, toneOf };
  }, [custom, hidden]);

  /** Normalised for storage/lookup: single-spaced lowercase. */
  const norm = (word: string) => word.trim().toLowerCase().replace(/\s+/g, " ");

  const exists = (word: string) =>
    derived.feelings.some((f) => f.word === norm(word));

  function addWord(word: string, tone: FeelingTone) {
    const w = norm(word);
    if (!w || exists(w)) return;
    setSettings({
      customFeelings: [...custom, { word: w, tone }],
      // re-adding a word that was previously removed un-hides it
      hiddenFeelings: hidden.filter((h) => h !== w),
    });
  }

  /** Remove from the picker: custom words are deleted, built-ins hidden. */
  function removeWord(word: string) {
    if (custom.some((c) => c.word === word)) {
      setSettings({ customFeelings: custom.filter((c) => c.word !== word) });
    }
    if (TONE_OF.has(word) && !hidden.includes(word)) {
      setSettings({ hiddenFeelings: [...hidden, word] });
    }
  }

  /** Rename a word (built-ins become hidden + a custom replacement). */
  function renameWord(word: string, next: string, tone: FeelingTone) {
    const w = norm(next);
    if (!w || w === word) return;
    if (exists(w)) return removeWord(word);
    const withoutOld = custom.filter((c) => c.word !== word);
    setSettings({
      customFeelings: [...withoutOld, { word: w, tone }],
      hiddenFeelings: TONE_OF.has(word)
        ? [...hidden.filter((h) => h !== w), word]
        : hidden,
    });
  }

  function restoreWord(word: string) {
    setSettings({ hiddenFeelings: hidden.filter((h) => h !== word) });
  }

  return { ...derived, hidden, custom, addWord, removeWord, renameWord, restoreWord };
}
