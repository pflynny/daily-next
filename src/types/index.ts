/* ------------------------------------------------------------------ */
/* Domain model — Daily                                                */
/* ------------------------------------------------------------------ */

export type AppTab = "daily" | "goals" | "year" | "wrapped" | "memories";

/* ----------------------------- Tasks ------------------------------ */
export interface Task {
  id: string;
  /** Local date key, YYYY-MM-DD */
  date: string;
  text: string;
  completed: boolean;
  isLabel: boolean;
  notes: string;
  position: number;
}

/* --------------------------- Routines ----------------------------- */
/** A recurring task that auto-populates the daily list on matching days. */
export interface Routine {
  id: string;
  text: string;
  /** Weekdays it runs on: 0=Sun … 6=Sat. */
  days: number[];
  active: boolean;
  position: number;
  /** Local date key of the last day instances were generated. */
  lastGenerated: string | null;
  createdAt: string;
}

/* ----------------------------- Lists ------------------------------ */
export interface ListItem {
  id: string;
  listId: string;
  text: string;
  completed: boolean;
  notes: string;
  position: number;
  createdAt: string;
}

export interface List {
  id: string;
  groupId: string;
  name: string;
  position: number;
}

export interface ListGroup {
  id: string;
  title: string;
  position: number;
}

/** Composed view-models (built by selectors from the flat state). */
export interface ListView extends List {
  items: ListItem[];
}
export interface ListGroupView extends ListGroup {
  lists: ListView[];
}

/* -------------------------- Collections --------------------------- */
export type CollectionMediaType = "book" | "movie" | "tv" | "music" | "other";

export interface CollectionItem {
  id: string;
  collectionId: string;
  title: string;
  /** Author / director / artist */
  creator: string;
  rating: number | null; // 1..10
  review: string;
  mediaType: CollectionMediaType;
  coverUrl: string | null; // reserved for future cover-art APIs
  position: number;
  createdAt: string;
}

export interface Collection {
  id: string;
  year: number;
  name: string;
  position: number;
  /** Optional banner image shown at the top of the list. */
  bannerUrl: string | null;
}

export interface CollectionView extends Collection {
  items: CollectionItem[];
}

/* ----------------------------- Goals ------------------------------ */
/**
 * A goal is a cadence + target. Ticks are stored as dated entries.
 *  - daily habit:   cadence "day",  target 1   -> GitHub-style grid
 *  - 3x per week:   cadence "week", target 3   -> weekly progress
 *  - Nx per month:  cadence "month",target N   -> monthly progress
 */
export type GoalCadence = "day" | "week" | "month";

export interface Goal {
  id: string;
  title: string;
  cadence: GoalCadence;
  target: number;
  color: string | null;
  position: number;
  archived: boolean;
  startedAt: string;
  createdAt: string;
}

export interface GoalEntry {
  id: string;
  goalId: string;
  /** Local date key, YYYY-MM-DD */
  date: string;
  count: number;
}

/* --------------------------- Memories ----------------------------- */
export type MemoryType = "note" | "quote" | "photo" | "video" | "link";

export interface MemoryMedia {
  id: string;
  memoryId: string;
  kind: "image" | "video";
  url: string;
  key: string; // storage object key
  width: number | null;
  height: number | null;
  mime: string;
  size: number;
  position: number;
}

export interface Memory {
  id: string;
  /** Local date key, YYYY-MM-DD */
  occurredOn: string;
  type: MemoryType;
  title: string;
  body: string;
  quoteAuthor: string;
  linkUrl: string;
  position: number;
  createdAt: string;
}

export interface MemoryView extends Memory {
  media: MemoryMedia[];
}

/* ---------------------------- Quotes ------------------------------ */
export interface Quote {
  text: string;
  author: string;
}

export interface LikedQuote extends Quote {
  id: string;
  createdAt: string;
}

/* -------------------------- Check-ins ----------------------------- */
export type CheckInKind = "morning" | "evening";

export interface CheckIn {
  id: string;
  /** Local date key, YYYY-MM-DD */
  date: string;
  kind: CheckInKind;
  feelings: string[];
  /** Up to three good things; the first is the day's top thing. */
  gratitude: string[];
  note: string;
  createdAt: string;
}

/* -------------------------- Profile ------------------------------- */
export interface AppSettings {
  showLists: boolean;
  showPanel: boolean;
  weekStartsOn: 0 | 1;
}

export const DEFAULT_SETTINGS: AppSettings = {
  showLists: true,
  showPanel: true,
  weekStartsOn: 1,
};

export interface Profile {
  id: string;
  email: string;
  settings: AppSettings;
}

export interface AuthUser {
  id: string;
  email: string;
}
