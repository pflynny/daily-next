import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Server Supabase client bound to the request cookies, or null when unconfigured. */
export async function getServerClient(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — safe to ignore; middleware refreshes.
        }
      },
    },
  });
}

/** Verified tokens → user id, so a page full of media requests doesn't pay
 *  a Supabase Auth round-trip per image. Entries are only created after a
 *  successful server-side verification and expire with the token. */
const verifiedTokens = new Map<string, { userId: string; until: number }>();
const VERIFY_TTL_MS = 10 * 60 * 1000;

export async function getVerifiedUserId(): Promise<string | null> {
  const supabase = await getServerClient();
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return null;
  const hit = verifiedTokens.get(token);
  if (hit && hit.until > Date.now()) return hit.userId;
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  if (!user) return null;
  const tokenExpiry = session.expires_at ? session.expires_at * 1000 : Infinity;
  verifiedTokens.set(token, {
    userId: user.id,
    until: Math.min(tokenExpiry, Date.now() + VERIFY_TTL_MS),
  });
  if (verifiedTokens.size > 500) verifiedTokens.clear();
  return user.id;
}
