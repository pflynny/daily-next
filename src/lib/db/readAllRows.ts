import type { SupabaseClient } from "@supabase/supabase-js";

/** Keyset pagination works even when the server's row cap is below our page size. */
export async function readAllRows(
  client: SupabaseClient,
  table: string,
  owner?: { column: string; id: string },
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  let cursor: string | undefined;
  let expected: number | null = null;
  for (;;) {
    let query = client.from(table).select("*", cursor ? undefined : { count: "exact" })
      .order("id", { ascending: true }).limit(500);
    if (owner) query = query.eq(owner.column, owner.id);
    if (cursor) query = query.gt("id", cursor);
    const { data, error, count } = await query;
    if (error) throw new Error(`Could not load ${table}: ${error.message}`);
    if (!cursor) expected = count;
    if (!data?.length) break;
    const next = data[data.length - 1].id;
    if (typeof next !== "string" || next === cursor) {
      throw new Error(`Could not paginate ${table}. Please retry.`);
    }
    rows.push(...data);
    cursor = next;
  }
  if (expected === null || rows.length !== expected) {
    throw new Error(`${table} changed while loading. Please retry for a complete copy.`);
  }
  return rows;
}
