import type { SupabaseClient } from "@supabase/supabase-js";
import { ENTITIES, EMPTY_STATE, STATE_KEYS } from "./entities";
import { DEFAULT_SETTINGS } from "../../types";
import { readAllRows } from "./readAllRows";
import type { Mutation, Snapshot } from "./syncStore";

export function cloudAdapter(client: SupabaseClient, userId: string) {
  return {
    async load(): Promise<Pick<Snapshot, "state" | "settings">> {
      const state = { ...EMPTY_STATE };
      await Promise.all(STATE_KEYS.map(async (key) => {
        const { table, fromRow } = ENTITIES[key];
        const rows = await readAllRows(client, table, { column: "user_id", id: userId });
        Object.assign(state, { [key]: rows.map(fromRow) });
      }));
      const { data, error } = await client.from("profiles").select("settings").eq("id", userId).maybeSingle();
      if (error) throw new Error(`Could not load preferences: ${error.message}`);
      return { state, settings: { ...DEFAULT_SETTINGS, ...data?.settings } };
    },
    async save(mutation: Mutation) {
      if (mutation.kind === "settings") {
        // Merge the patch with cloud preferences instead of replacing unrelated
        // settings from another device using a stale full local object.
        const { data, error } = await client.from("profiles").select("settings").eq("id", userId).maybeSingle();
        if (error) throw new Error(error.message);
        const result = await client.from("profiles").upsert({ id: userId, settings: { ...data?.settings, ...mutation.patch } });
        if (result.error) throw new Error(`Preferences were not saved: ${result.error.message}`);
        return;
      }
      const { table, toRow } = ENTITIES[mutation.key];
      const items = mutation.kind === "put" ? mutation.items : mutation.ids;
      for (let offset = 0; offset < items.length; offset += 250) {
        const result = mutation.kind === "put"
          ? await client.from(table).upsert(mutation.items.slice(offset, offset + 250).map((item) => ({ ...toRow(item), user_id: userId })))
          : await client.from(table).delete().eq("user_id", userId).in("id", mutation.ids.slice(offset, offset + 250));
        if (result.error) throw new Error(`${table} changes were not saved: ${result.error.message}`);
      }
    },
  };
}
