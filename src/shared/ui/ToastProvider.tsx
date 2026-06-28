"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface Toast {
  id: number;
  message: string;
  restore?: () => void;
}

interface ToastApi {
  /** Show a toast with an Undo action. */
  undo(message: string, restore: () => void): void;
  /** Show a plain transient message. */
  notify(message: string): void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback((t: Omit<Toast, "id">) => {
    if (timer.current) clearTimeout(timer.current);
    const id = Date.now();
    setToast({ id, ...t });
    timer.current = setTimeout(() => setToast(null), 6000);
  }, []);

  const api = useRef<ToastApi>({
    undo: (message, restore) => show({ message, restore }),
    notify: (message) => show({ message }),
  });

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <ToastContext.Provider value={api.current}>
      {children}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-brand-700 bg-brand-900 py-2 pl-4 pr-2 text-sm text-brand-50 shadow-lg animate-fade-rise">
            <span>{toast.message}</span>
            {toast.restore && (
              <button
                onClick={() => {
                  toast.restore?.();
                  dismiss();
                }}
                className="rounded-full bg-brand-50/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white hover:bg-brand-50/25"
              >
                Undo
              </button>
            )}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
