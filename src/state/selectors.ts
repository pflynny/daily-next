import type {
  Collection,
  CollectionItem,
  CollectionView,
  List,
  ListGroup,
  ListGroupView,
  ListItem,
  Memory,
  MemoryMedia,
  MemoryView,
} from "@/types";

export function byPosition<T extends { position: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.position - b.position);
}

export function buildListGroups(
  groups: ListGroup[],
  lists: List[],
  items: ListItem[],
): ListGroupView[] {
  const itemsByList = new Map<string, ListItem[]>();
  for (const item of items) {
    const arr = itemsByList.get(item.listId);
    if (arr) arr.push(item);
    else itemsByList.set(item.listId, [item]);
  }
  const listsByGroup = new Map<string, List[]>();
  for (const list of lists) {
    const arr = listsByGroup.get(list.groupId);
    if (arr) arr.push(list);
    else listsByGroup.set(list.groupId, [list]);
  }
  return byPosition(groups).map((group) => ({
    ...group,
    lists: byPosition(listsByGroup.get(group.id) ?? []).map((list) => ({
      ...list,
      items: byPosition(itemsByList.get(list.id) ?? []),
    })),
  }));
}

export function buildCollections(
  collections: Collection[],
  items: CollectionItem[],
  year?: number,
): CollectionView[] {
  const itemsByCollection = new Map<string, CollectionItem[]>();
  for (const item of items) {
    const arr = itemsByCollection.get(item.collectionId);
    if (arr) arr.push(item);
    else itemsByCollection.set(item.collectionId, [item]);
  }
  return byPosition(
    year === undefined
      ? collections
      : collections.filter((c) => c.year === year),
  ).map((collection) => ({
    ...collection,
    items: byPosition(itemsByCollection.get(collection.id) ?? []),
  }));
}

export function buildMemories(
  memories: Memory[],
  media: MemoryMedia[],
): MemoryView[] {
  const mediaByMemory = new Map<string, MemoryMedia[]>();
  for (const m of media) {
    const arr = mediaByMemory.get(m.memoryId);
    if (arr) arr.push(m);
    else mediaByMemory.set(m.memoryId, [m]);
  }
  return [...memories]
    .sort((a, b) =>
      a.occurredOn === b.occurredOn
        ? b.createdAt.localeCompare(a.createdAt)
        : b.occurredOn.localeCompare(a.occurredOn),
    )
    .map((memory) => ({
      ...memory,
      media: byPosition(mediaByMemory.get(memory.id) ?? []),
    }));
}

export function listYears(...sources: number[][]): number[] {
  const set = new Set<number>();
  for (const arr of sources) for (const y of arr) set.add(y);
  return Array.from(set).sort((a, b) => b - a);
}
