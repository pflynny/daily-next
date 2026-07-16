/** Feeling vocabulary for check-ins, grouped by tone for display and Wrapped. */

export type FeelingTone = "up" | "flat" | "down";

export interface Feeling {
  word: string;
  tone: FeelingTone;
}

const up = (word: string): Feeling => ({ word, tone: "up" });
const flat = (word: string): Feeling => ({ word, tone: "flat" });
const down = (word: string): Feeling => ({ word, tone: "down" });

export const FEELINGS: Feeling[] = [
  // Positive
  up("happy"),
  up("calm"),
  up("grateful"),
  up("content"),
  up("hopeful"),
  up("excited"),
  up("positive"),
  up("glad"),
  up("proud"),
  up("safe"),
  up("eager"),
  up("inspired"),
  up("strong"),
  up("confident"),
  up("relieved"),
  up("alive"),
  up("energetic"),
  up("determined"),
  up("peaceful"),
  up("loved"),
  up("motivated"),
  up("focused"),
  up("curious"),
  up("playful"),
  up("connected"),
  up("accomplished"),
  // Neutral
  flat("neutral"),
  flat("tired"),
  flat("bored"),
  flat("restless"),
  flat("surprised"),
  flat("shocked"),
  flat("unsure"),
  // Difficult
  down("stressed"),
  down("anxious"),
  down("sad"),
  down("overwhelmed"),
  down("frustrated"),
  down("low"),
  down("worried"),
  down("nervous"),
  down("tense"),
  down("insecure"),
  down("confused"),
  down("hurt"),
  down("angry"),
  down("irritated"),
  down("disappointed"),
  down("negative"),
  down("annoyed"),
  down("unhappy"),
  down("furious"),
  down("regretful"),
  down("lonely"),
  down("scared"),
  down("trapped"),
  down("guilty"),
  down("bitter"),
  down("exhausted"),
  down("drained"),
  down("embarrassed"),
  down("unwell"),
];

/** Shown before the “more” expander — the most commonly reached-for words. */
export const PRIMARY_FEELINGS = new Set([
  "happy",
  "calm",
  "grateful",
  "content",
  "hopeful",
  "excited",
  "energetic",
  "motivated",
  "proud",
  "tired",
  "neutral",
  "stressed",
  "anxious",
  "sad",
  "drained",
  "overwhelmed",
  "frustrated",
  "low",
  "worried",
]);

export const TONE_OF = new Map(FEELINGS.map((f) => [f.word, f.tone]));
