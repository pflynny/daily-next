import { AuthProvider } from "@/features/auth/AuthProvider";
import { AuthGate } from "@/features/auth/AuthGate";
import { AppDataProvider } from "@/state/AppDataProvider";
import { AppShell } from "@/shared/components/AppShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGate>
        <AppDataProvider>
          <AppShell>{children}</AppShell>
        </AppDataProvider>
      </AuthGate>
    </AuthProvider>
  );
}
