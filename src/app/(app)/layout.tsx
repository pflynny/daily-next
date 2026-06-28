import { AuthProvider } from "@/features/auth/AuthProvider";
import { AuthGate } from "@/features/auth/AuthGate";
import { AppDataProvider } from "@/state/AppDataProvider";
import { ToastProvider } from "@/shared/ui/ToastProvider";
import { AppShell } from "@/shared/components/AppShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGate>
        <AppDataProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </AppDataProvider>
      </AuthGate>
    </AuthProvider>
  );
}
