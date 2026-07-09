"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type Status =
  | "loading"
  | "unsupported"
  | "not-configured"
  | "denied"
  | "off"
  | "on"
  | "busy";

export function RemindersSection() {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      if (!PUBLIC_KEY) return setStatus("not-configured");
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        return setStatus("unsupported");
      }
      if (Notification.permission === "denied") return setStatus("denied");
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setStatus(sub ? "on" : "off");
      } catch {
        setStatus("off");
      }
    }
    void check();
  }, []);

  async function enable() {
    setError(null);
    setStatus("busy");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY!) as BufferSource,
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("Could not save the subscription — are you signed in?");
      setStatus("on");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not enable reminders");
      setStatus("off");
    }
  }

  async function disable() {
    setError(null);
    setStatus("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("off");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not disable reminders");
      setStatus("on");
    }
  }

  return (
    <div>
      <p className="mb-3 text-sm text-muted">
        A morning (~7:30) and evening (~8pm) nudge to do your check-in — only
        sent if you haven’t already done it. On your phone, install the app to
        your home screen first.
      </p>

      {status === "loading" && <p className="text-sm text-faint">Checking…</p>}
      {status === "unsupported" && (
        <p className="text-sm text-faint">
          This browser doesn’t support push notifications.
        </p>
      )}
      {status === "not-configured" && (
        <p className="text-sm text-faint">Push isn’t configured on the server.</p>
      )}
      {status === "denied" && (
        <p className="text-sm text-faint">
          Notifications are blocked for this site — allow them in your browser
          settings, then come back.
        </p>
      )}

      {(status === "on" || status === "off" || status === "busy") && (
        <div className="flex items-center gap-3">
          <button
            onClick={status === "on" ? disable : enable}
            disabled={status === "busy"}
            className={cn(
              "rounded-lg px-3.5 py-2 text-xs font-semibold uppercase tracking-wide disabled:opacity-50",
              status === "on"
                ? "border border-line text-muted hover:text-ink"
                : "bg-brand-700 text-white hover:bg-brand-800",
            )}
          >
            {status === "busy"
              ? "Working…"
              : status === "on"
                ? "Disable on this device"
                : "Enable reminders"}
          </button>
          {status === "on" && (
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <span className="inline-block size-2 rounded-full bg-brand-500" />
              Reminders on
            </span>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
