"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { cn } from "@/lib/utils/cn";

type Mode = "signin" | "signup" | "forgot";

export function AuthScreen() {
  const { signIn, signUp, sendReset } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reset = () => {
    setError(null);
    setMessage(null);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    reset();
    setBusy(true);
    try {
      const result =
        mode === "signin"
          ? await signIn(email, password)
          : mode === "signup"
            ? await signUp(email, password)
            : await sendReset(email);
      if (result.error) setError(result.error);
      else if (result.message) setMessage(result.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-paper px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-mono text-3xl font-bold tracking-tight text-ink">
            DAILY
          </h1>
          <p className="mt-2 font-serif text-base italic text-muted">
            Your days, goals and memories — in one calm place.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-line bg-surface p-6 shadow-sm"
        >
          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
              Email
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-brand-400"
            />
          </label>

          {mode !== "forgot" && (
            <label className="mb-3 block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                Password
              </span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              />
            </label>
          )}

          {error && (
            <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
              {error}
            </p>
          )}
          {message && (
            <p className="mb-3 rounded-lg bg-brand-100 px-3 py-2 text-xs text-brand-800">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className={cn(
              "w-full rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-60",
            )}
          >
            {busy
              ? "…"
              : mode === "signin"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : "Send reset link"}
          </button>

          <div className="mt-4 flex items-center justify-between text-xs text-muted">
            {mode === "signin" ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setMode("signup");
                  }}
                  className="hover:text-ink"
                >
                  Create account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setMode("forgot");
                  }}
                  className="hover:text-ink"
                >
                  Forgot password?
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  reset();
                  setMode("signin");
                }}
                className="hover:text-ink"
              >
                ← Back to sign in
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
