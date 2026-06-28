"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { AuthScreen } from "./AuthScreen";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Render only after mount so date/viewport-dependent UI never hydrates a
  // server snapshot — avoids hydration mismatches across every screen.
  if (!mounted || status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper">
        <div className="animate-pulse font-mono text-sm tracking-widest text-faint">
          DAILY
        </div>
      </div>
    );
  }

  if (status === "signedout") {
    return <AuthScreen />;
  }

  return <>{children}</>;
}
