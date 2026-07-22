"use client";

import { useEffect } from "react";

/**
 * iOS Safari ignores `user-scalable=no` in the browser (though the installed
 * PWA honours it), so accidental pinch zoom kept happening there. Safari does
 * let its proprietary gesture events be cancelled, which disables pinch zoom.
 * Other browsers never fire these events, so this is a no-op elsewhere.
 */
export function PinchZoomGuard() {
  useEffect(() => {
    const cancel = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", cancel, { passive: false });
    document.addEventListener("gesturechange", cancel, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", cancel);
      document.removeEventListener("gesturechange", cancel);
    };
  }, []);
  return null;
}
