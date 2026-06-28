import type {
  Task,
  ListGroup,
  List,
  ListItem,
  Collection,
  CollectionItem,
  Goal,
  GoalEntry,
  Memory,
  MemoryMedia,
  LikedQuote,
  CollectionMediaType,
  GoalCadence,
  MemoryType,
} from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type StateKey =
  | "tasks"
  | "listGroups"
  | "lists"
  | "listItems"
  | "collections"
  | "collectionItems"
  | "goals"
  | "goalEntries"
  | "memories"
  | "memoryMedia"
  | "likedQuotes";

export interface EntityState {
  tasks: Task[];
  listGroups: ListGroup[];
  lists: List[];
  listItems: ListItem[];
  collections: Collection[];
  collectionItems: CollectionItem[];
  goals: Goal[];
  goalEntries: GoalEntry[];
  memories: Memory[];
  memoryMedia: MemoryMedia[];
  likedQuotes: LikedQuote[];
}

export const EMPTY_STATE: EntityState = {
  tasks: [],
  listGroups: [],
  lists: [],
  listItems: [],
  collections: [],
  collectionItems: [],
  goals: [],
  goalEntries: [],
  memories: [],
  memoryMedia: [],
  likedQuotes: [],
};

interface EntityConfig {
  table: string;
  /** Supabase column to order by when fetching. */
  orderBy: string;
  toRow(model: any): Record<string, unknown>;
  fromRow(row: any): any;
}

const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : fallback;
const num = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;
const bool = (v: unknown): boolean => v === true;

export const ENTITIES: Record<StateKey, EntityConfig> = {
  tasks: {
    table: "tasks",
    orderBy: "position",
    toRow: (t: Task) => ({
      id: t.id,
      date: t.date,
      text: t.text,
      completed: t.completed,
      is_label: t.isLabel,
      notes: t.notes,
      position: t.position,
    }),
    fromRow: (r): Task => ({
      id: str(r.id),
      date: str(r.date),
      text: str(r.text),
      completed: bool(r.completed),
      isLabel: bool(r.is_label),
      notes: str(r.notes),
      position: num(r.position),
    }),
  },
  listGroups: {
    table: "list_groups",
    orderBy: "position",
    toRow: (g: ListGroup) => ({
      id: g.id,
      title: g.title,
      position: g.position,
    }),
    fromRow: (r): ListGroup => ({
      id: str(r.id),
      title: str(r.title),
      position: num(r.position),
    }),
  },
  lists: {
    table: "lists",
    orderBy: "position",
    toRow: (l: List) => ({
      id: l.id,
      group_id: l.groupId,
      name: l.name,
      position: l.position,
    }),
    fromRow: (r): List => ({
      id: str(r.id),
      groupId: str(r.group_id),
      name: str(r.name),
      position: num(r.position),
    }),
  },
  listItems: {
    table: "list_items",
    orderBy: "position",
    toRow: (i: ListItem) => ({
      id: i.id,
      list_id: i.listId,
      text: i.text,
      completed: i.completed,
      notes: i.notes,
      position: i.position,
      created_at: i.createdAt,
    }),
    fromRow: (r): ListItem => ({
      id: str(r.id),
      listId: str(r.list_id),
      text: str(r.text),
      completed: bool(r.completed),
      notes: str(r.notes),
      position: num(r.position),
      createdAt: str(r.created_at),
    }),
  },
  collections: {
    table: "collections",
    orderBy: "position",
    toRow: (c: Collection) => ({
      id: c.id,
      year: c.year,
      name: c.name,
      position: c.position,
      banner_url: c.bannerUrl,
    }),
    fromRow: (r): Collection => ({
      id: str(r.id),
      year: num(r.year),
      name: str(r.name),
      position: num(r.position),
      bannerUrl: r.banner_url ?? null,
    }),
  },
  collectionItems: {
    table: "collection_items",
    orderBy: "position",
    toRow: (i: CollectionItem) => ({
      id: i.id,
      collection_id: i.collectionId,
      title: i.title,
      creator: i.creator,
      rating: i.rating,
      review: i.review,
      media_type: i.mediaType,
      cover_url: i.coverUrl,
      position: i.position,
      created_at: i.createdAt,
    }),
    fromRow: (r): CollectionItem => ({
      id: str(r.id),
      collectionId: str(r.collection_id),
      title: str(r.title),
      creator: str(r.creator),
      rating: r.rating === null || r.rating === undefined ? null : num(r.rating),
      review: str(r.review),
      mediaType: str(r.media_type, "other") as CollectionMediaType,
      coverUrl: r.cover_url ?? null,
      position: num(r.position),
      createdAt: str(r.created_at),
    }),
  },
  goals: {
    table: "goals",
    orderBy: "position",
    toRow: (g: Goal) => ({
      id: g.id,
      title: g.title,
      cadence: g.cadence,
      target: g.target,
      color: g.color,
      position: g.position,
      archived: g.archived,
      started_at: g.startedAt,
      created_at: g.createdAt,
    }),
    fromRow: (r): Goal => ({
      id: str(r.id),
      title: str(r.title),
      cadence: str(r.cadence, "day") as GoalCadence,
      target: num(r.target, 1),
      color: r.color ?? null,
      position: num(r.position),
      archived: bool(r.archived),
      startedAt: str(r.started_at),
      createdAt: str(r.created_at),
    }),
  },
  goalEntries: {
    table: "goal_entries",
    orderBy: "date",
    toRow: (e: GoalEntry) => ({
      id: e.id,
      goal_id: e.goalId,
      date: e.date,
      count: e.count,
    }),
    fromRow: (r): GoalEntry => ({
      id: str(r.id),
      goalId: str(r.goal_id),
      date: str(r.date),
      count: num(r.count, 1),
    }),
  },
  memories: {
    table: "memories",
    orderBy: "occurred_on",
    toRow: (m: Memory) => ({
      id: m.id,
      occurred_on: m.occurredOn,
      type: m.type,
      title: m.title,
      body: m.body,
      quote_author: m.quoteAuthor,
      link_url: m.linkUrl,
      position: m.position,
      created_at: m.createdAt,
    }),
    fromRow: (r): Memory => ({
      id: str(r.id),
      occurredOn: str(r.occurred_on),
      type: str(r.type, "note") as MemoryType,
      title: str(r.title),
      body: str(r.body),
      quoteAuthor: str(r.quote_author),
      linkUrl: str(r.link_url),
      position: num(r.position),
      createdAt: str(r.created_at),
    }),
  },
  memoryMedia: {
    table: "memory_media",
    orderBy: "position",
    toRow: (m: MemoryMedia) => ({
      id: m.id,
      memory_id: m.memoryId,
      kind: m.kind,
      url: m.url,
      key: m.key,
      width: m.width,
      height: m.height,
      mime: m.mime,
      size: m.size,
      position: m.position,
    }),
    fromRow: (r): MemoryMedia => ({
      id: str(r.id),
      memoryId: str(r.memory_id),
      kind: str(r.kind, "image") as "image" | "video",
      url: str(r.url),
      key: str(r.key),
      width: r.width ?? null,
      height: r.height ?? null,
      mime: str(r.mime),
      size: num(r.size),
      position: num(r.position),
    }),
  },
  likedQuotes: {
    table: "liked_quotes",
    orderBy: "created_at",
    toRow: (q: LikedQuote) => ({
      id: q.id,
      text: q.text,
      author: q.author,
      created_at: q.createdAt,
    }),
    fromRow: (r): LikedQuote => ({
      id: str(r.id),
      text: str(r.text),
      author: str(r.author),
      createdAt: str(r.created_at),
    }),
  },
};

export const STATE_KEYS = Object.keys(ENTITIES) as StateKey[];
