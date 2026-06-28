"use client";

import { useAuth } from "./AuthProvider";
import { AuthScreen } from "./AuthScreen";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();

  if (status === "loading") {
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
