"use client";

import { useEffect } from "react";
import { clearPrivateMediaCaches } from "@/lib/db/browserStorage";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      void clearPrivateMediaCaches().catch(console.error);
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" })
        .then((registration) => registration.update()).catch(console.error);
    }
  }, []);
  return null;
}
