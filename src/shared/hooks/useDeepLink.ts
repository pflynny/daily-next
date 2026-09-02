"use client";

import { useEffect } from "react";

/** Fired by in-app search after navigating, so an already-mounted view
 *  re-reads the query string (mount effects alone would miss it). */
export const NAVIGATE_EVENT = "daily:navigate";

/** Run `handler` with the current query string on mount and after each
 *  in-app search navigation. */
export function useDeepLink(handler: (params: URLSearchParams) => void) {
  useEffect(() => {
    const run = () => handler(new URLSearchParams(window.location.search));
    run();
    window.addEventListener(NAVIGATE_EVENT, run);
    return () => window.removeEventListener(NAVIGATE_EVENT, run);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
