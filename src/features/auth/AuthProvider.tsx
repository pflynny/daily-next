"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { AuthUser } from "@/types";

type AuthStatus = "loading" | "authed" | "signedout" | "guest";

interface ActionResult {
  error?: string;
  message?: string;
}

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  configured: boolean;
  /** True when data should live in the cloud (configured + signed in). */
  cloud: boolean;
  signIn(email: string, password: string): Promise<ActionResult>;
  signUp(email: string, password: string): Promise<ActionResult>;
  signOut(): Promise<void>;
  sendReset(email: string): Promise<ActionResult>;
  updatePassword(password: string): Promise<ActionResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(user: { id: string; email?: string | null }): AuthUser {
  return { id: user.id, email: user.email ?? "" };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();
  const [status, setStatus] = useState<AuthStatus>(
    configured ? "loading" : "guest",
  );
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (!configured) return;
    const supabase = getBrowserClient();
    if (!supabase) return;

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session?.user) {
        setUser(toAuthUser(data.session.user));
        setStatus("authed");
      } else {
        setStatus("signedout");
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session?.user) {
        setUser(toAuthUser(session.user));
        setStatus("authed");
      } else {
        setUser(null);
        setStatus("signedout");
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [configured]);

  const signIn = useCallback<AuthContextValue["signIn"]>(async (email, password) => {
    const supabase = getBrowserClient();
    if (!supabase) return { error: "Supabase is not configured." };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  }, []);

  const signUp = useCallback<AuthContextValue["signUp"]>(async (email, password) => {
    const supabase = getBrowserClient();
    if (!supabase) return { error: "Supabase is not configured." };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) return { error: error.message };
    if (data.user && !data.session) {
      return { message: "Check your email to confirm your account." };
    }
    return {};
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getBrowserClient();
    if (supabase) await supabase.auth.signOut();
  }, []);

  const sendReset = useCallback<AuthContextValue["sendReset"]>(async (email) => {
    const supabase = getBrowserClient();
    if (!supabase) return { error: "Supabase is not configured." };
    const redirectTo = `${window.location.origin}/auth/callback?next=/auth/reset`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    return error
      ? { error: error.message }
      : { message: "Password reset link sent — check your email." };
  }, []);

  const updatePassword = useCallback<AuthContextValue["updatePassword"]>(
    async (password) => {
      const supabase = getBrowserClient();
      if (!supabase) return { error: "Supabase is not configured." };
      const { error } = await supabase.auth.updateUser({ password });
      return error ? { error: error.message } : {};
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      configured,
      cloud: configured && status === "authed",
      signIn,
      signUp,
      signOut,
      sendReset,
      updatePassword,
    }),
    [status, user, configured, signIn, signUp, signOut, sendReset, updatePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
